import base64
import gzip
import io
import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from email.message import Message
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import run_avatar as app

JPEG = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff" + b"0" * 20).decode()
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
REMOTE = "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/a.png?Expires=1"
KEY = "test-key-never-returned"


def provider_payload(url=REMOTE, echo=False):
    content = [{"image": url}]
    if echo:
        content = [{"image": "data:image/jpeg;base64,AAAA"}, {"image": url}]
    return {"output": {"choices": [{"finish_reason": "stop", "message": {"role": "assistant", "content": content}}]}, "request_id": "req"}


class SelfieServerTests(unittest.TestCase):
    def test_prompt_model_and_result_host_are_bounded(self):
        self.assertEqual(app.validate_prompt("  蜡笔  "), "蜡笔")
        for value in ("", "   ", None, 3, "x" * 4001):
            with self.assertRaises(ValueError):
                app.validate_prompt(value)
        with patch.dict(os.environ, {"DASHSCOPE_IMAGE_MODEL": ""}):
            self.assertEqual(app.image_model(), "qwen-image-2.1-turbo")
        with patch.dict(os.environ, {"DASHSCOPE_IMAGE_MODEL": "qwen-image-3.0-pro"}):
            self.assertEqual(app.image_model(), "qwen-image-3.0-pro")
        with patch.dict(os.environ, {"DASHSCOPE_IMAGE_MODEL": "deepseek-flash"}):
            with self.assertRaises(ValueError):
                app.image_model()
        for url in (REMOTE, "https://dashscope-a717.oss-accelerate.aliyuncs.com/a.png?Expires=1",
                    "https://dashscope-66f3.oss-cn-beijing.aliyuncs.com/a.png"):
            self.assertTrue(app.allowed_result_url(url))
        for url in ("http://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/a.png",
                    "https://example.com/a.png", "https://user:pw@dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/a.png",
                    "https://dashscope.aliyuncs.com/a.png", "https://dashscope-a717.example.aliyuncs.com/a.png",
                    "https://evil-dashscope-a717.oss-cn-beijing.aliyuncs.com/a.png"):
            self.assertFalse(app.allowed_result_url(url))
        with patch.dict(os.environ, {"DASHSCOPE_API_URL": "http://evil.example/generate"}):
            with self.assertRaises(RuntimeError):
                app.image_endpoint()

    def test_generate_posts_prompt_verbatim_and_downloads_png(self):
        responses = [io.BytesIO(json.dumps(provider_payload()).encode()), io.BytesIO(PNG)]
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": KEY, "DASHSCOPE_IMAGE_MODEL": "", "DASHSCOPE_API_URL": ""}), \
             patch.object(app.urllib.request, "urlopen", side_effect=responses) as upstream:
            image = app.generate_selfie(JPEG, "蜡笔手账", "qwen-image-2.1-turbo")
        self.assertTrue(image.startswith("data:image/png;base64,"))
        self.assertNotIn(KEY, image)
        api, download = (call.args[0] for call in upstream.call_args_list)
        self.assertEqual(api.full_url, app.IMAGE_URL)
        self.assertEqual(api.get_header("Authorization"), "Bearer " + KEY)
        body = json.loads(api.data)
        self.assertEqual(body["model"], "qwen-image-2.1-turbo")
        self.assertEqual(body["parameters"], {"prompt_extend": False, "watermark": False, "n": 1})
        self.assertNotIn("size", body["parameters"])
        content = body["input"]["messages"][0]["content"]
        self.assertEqual(content[0]["image"], JPEG)
        self.assertEqual(content[1]["text"], "蜡笔手账")
        self.assertEqual(download.full_url, REMOTE)
        echoed = [io.BytesIO(json.dumps(provider_payload(echo=True)).encode()), io.BytesIO(PNG)]
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": KEY}), patch.object(app.urllib.request, "urlopen", side_effect=echoed) as upstream:
            app.generate_selfie(JPEG, "蜡笔")
        self.assertEqual(upstream.call_args_list[1].args[0].full_url, REMOTE)
        self.assertIsNone(download.get_header("Authorization"))
        self.assertIsNone(download.data)

    def test_rejects_unexpected_image_host_and_hides_key(self):
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": KEY}), \
             patch.object(app.urllib.request, "urlopen", return_value=io.BytesIO(json.dumps(provider_payload("https://evil.example/a.png")).encode())) as upstream:
            with self.assertRaises(RuntimeError) as error:
                app.generate_selfie(JPEG, "蜡笔")
        self.assertIn("拒绝下载", str(error.exception))
        self.assertEqual(upstream.call_count, 1)
        leaked = urllib.error.HTTPError(app.IMAGE_URL, 401, "denied", Message(), io.BytesIO(json.dumps({"message": "bad " + KEY}).encode()))
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": KEY}), patch.object(app.urllib.request, "urlopen", side_effect=leaked):
            with self.assertRaises(RuntimeError) as error:
                app.generate_selfie(JPEG, "蜡笔")
        self.assertNotIn(KEY, str(error.exception))

    def test_http_home_redirect_and_missing_key(self):
        server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = "http://127.0.0.1:%s" % server.server_address[1]
        try:
            class NoRedirect(urllib.request.HTTPRedirectHandler):
                def redirect_request(self, req, fp, code, msg, headers, newurl):
                    raise urllib.error.HTTPError(req.full_url, code, msg, headers, fp)
            opener = urllib.request.build_opener(NoRedirect)
            with self.assertRaises(urllib.error.HTTPError) as error:
                opener.open(base + "/")
            self.assertEqual(error.exception.code, 302)
            self.assertEqual(error.exception.headers.get("Location"), "/home/")
            with urllib.request.urlopen(base + "/home/") as response:
                page = response.read().decode("utf-8")
            self.assertIn("实时面捕", page)
            self.assertIn('href="/avatar/"', page)
            self.assertIn('href="/selfie/"', page)
            with urllib.request.urlopen(base + "/selfie/") as response:
                selfie = response.read().decode("utf-8")
            self.assertIn("library.js", selfie)
            self.assertIn("下载这张图", selfie)
            with urllib.request.urlopen(base + "/selfie/library.js") as response:
                self.assertEqual(response.headers.get_content_type(), "text/javascript")
                self.assertIn("蜡笔手账", response.read().decode("utf-8"))
            with patch.dict(os.environ, {"DASHSCOPE_API_KEY": ""}):
                request = urllib.request.Request(base + "/api/selfie", data=json.dumps({"image": JPEG, "prompt": "蜡笔"}).encode(), headers={"Content-Type": "application/json"})
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(request)
                self.assertEqual(error.exception.code, 503)
                self.assertIn("尚未配置千问", error.exception.read().decode())
            empty = urllib.request.Request(base + "/api/selfie", data=json.dumps({"image": JPEG, "prompt": "  "}).encode(), headers={"Content-Type": "application/json"})
            with patch.dict(os.environ, {"DASHSCOPE_API_KEY": KEY}):
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(empty)
                self.assertEqual(error.exception.code, 400)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(2)

    def test_style_file_roundtrip_rejects_builtin_and_keeps_previous(self):
        self.assertEqual(app.STYLES_PATH.name, "selfie-styles.json")
        self.assertEqual(app.STYLES_PATH.parent.name, "data")
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "selfie-styles.json"
            self.assertEqual(app.read_style_file(path), ([], True))
            saved = app.write_style_file(path, [{"id": "user-1", "name": " 夜市 ", "prompt": " 灯光 ", "extra": "不要留下"}])
            self.assertEqual(saved, [{"id": "user-1", "name": "夜市", "prompt": "灯光"}])
            self.assertEqual(app.read_style_file(path), (saved, False))
            self.assertEqual(set(json.loads(path.read_text(encoding="utf-8"))[0]), {"id", "name", "prompt"})
            too_many = [{"id": "n%d" % i, "name": "名", "prompt": "字"} for i in range(81)]
            for bad in (
                [{"id": "crayon-journal", "name": "冒充", "prompt": "不要覆盖"}],
                [{"id": "ghibli", "name": "冒充", "prompt": "不要覆盖"}],
                [{"id": "user-1", "name": "", "prompt": "有"}],
                [{"id": "user-1", "name": "好", "prompt": ""}],
                [{"id": "user-1", "name": "好", "prompt": "x" * 4001}],
                [{"id": "user-1", "name": "名" * 25, "prompt": "有"}],
                [{"id": "../x", "name": "好", "prompt": "有"}],
                [{"id": "a", "name": "好", "prompt": "有"}, {"id": "a", "name": "又", "prompt": "有"}],
                too_many,
                {"styles": saved},
            ):
                with self.assertRaises(ValueError):
                    app.write_style_file(path, bad)
            self.assertEqual(app.read_style_file(path)[0], saved)
            path.write_text("{", encoding="utf-8")
            with self.assertRaises(ValueError):
                app.read_style_file(path)

    def test_result_image_accepts_jpeg_gzip_png_and_rejects_junk(self):
        url = "https://dashscope-a717.oss-accelerate.aliyuncs.com/a.img"

        class Body:
            def __init__(self, data, headers=None):
                self.data = data
                self.headers = headers or {}
            def read(self, n=-1):
                return self.data if n is None or n < 0 else self.data[:n]
            def geturl(self):
                return url
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False

        jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 32
        with patch.object(app.urllib.request, "urlopen", return_value=Body(jpeg)):
            self.assertTrue(app.result_png(url).startswith("data:image/jpeg;base64,"))
        packed = gzip.compress(PNG)
        with patch.object(app.urllib.request, "urlopen", return_value=Body(packed, {"Content-Encoding": "gzip"})):
            self.assertTrue(app.result_png(url).startswith("data:image/png;base64,"))
        webp = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 16
        with patch.object(app.urllib.request, "urlopen", return_value=Body(webp)):
            self.assertTrue(app.result_png(url).startswith("data:image/webp;base64,"))
        with patch.object(app, "MAX_RESULT", 32), patch.object(app.urllib.request, "urlopen", return_value=Body(b"\x89PNG\r\n\x1a\n" + b"0" * 40)):
            with self.assertRaises(RuntimeError) as error:
                app.result_png(url)
            self.assertIn("太大", str(error.exception))
        with patch.object(app.urllib.request, "urlopen", return_value=Body(b"<html>no</html>")):
            with self.assertRaises(RuntimeError) as error:
                app.result_png(url)
            self.assertIn("不是可用的图片", str(error.exception))

    def test_http_styles_roundtrip(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "selfie-styles.json"
            with patch.object(app, "STYLES_PATH", path):
                server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                base = "http://127.0.0.1:%s" % server.server_address[1]
                try:
                    with urllib.request.urlopen(base + "/api/styles") as response:
                        fresh = json.loads(response.read().decode())
                    self.assertEqual(fresh, {"styles": [], "fresh": True})
                    stolen = urllib.request.Request(
                        base + "/api/styles",
                        data=json.dumps({"styles": [{"id": "crayon-journal", "name": "冒充", "prompt": "不要"}]}).encode(),
                        headers={"Content-Type": "application/json"})
                    with self.assertRaises(urllib.error.HTTPError) as error:
                        urllib.request.urlopen(stolen)
                    self.assertEqual(error.exception.code, 400)
                    self.assertFalse(path.is_file())
                    body = json.dumps({"styles": [{"id": "user-1", "name": "夜市", "prompt": "灯光"}]}).encode()
                    request = urllib.request.Request(base + "/api/styles", data=body, headers={"Content-Type": "application/json"})
                    with urllib.request.urlopen(request) as response:
                        self.assertEqual(json.loads(response.read().decode())["styles"][0]["name"], "夜市")
                    with urllib.request.urlopen(base + "/api/styles") as response:
                        stored = json.loads(response.read().decode())
                    self.assertEqual(stored["fresh"], False)
                    self.assertEqual(stored["styles"][0]["prompt"], "灯光")
                    empty = urllib.request.Request(base + "/api/styles", data=json.dumps({"styles": []}).encode(), headers={"Content-Type": "application/json"})
                    with urllib.request.urlopen(empty) as response:
                        self.assertEqual(json.loads(response.read().decode())["styles"], [])
                    with urllib.request.urlopen(base + "/api/styles") as response:
                        self.assertEqual(json.loads(response.read().decode()), {"styles": [], "fresh": False})
                finally:
                    server.shutdown()
                    server.server_close()
                    thread.join(2)


if __name__ == "__main__":
    unittest.main()
