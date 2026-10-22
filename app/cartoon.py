import io
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WEIGHT = ROOT / "weights" / "AnimeGANv3_large_Ghibli_c1_e299.onnx"
SIZE = 640

_session = None


def load_model():
    global _session
    if _session is not None:
        return _session
    if not WEIGHT.is_file() or WEIGHT.stat().st_size < 1_000_000:
        raise FileNotFoundError(f"找不到卡通权重：{WEIGHT}")
    options = ort.SessionOptions()
    options.intra_op_num_threads = 8
    options.inter_op_num_threads = 1
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    ort.preload_dlls(directory="")
    _session = ort.InferenceSession(
        str(WEIGHT),
        sess_options=options,
        providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
    )
    return _session


def crisp(pixels: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(pixels, cv2.COLOR_RGB2LAB)
    lightness = lab[:, :, 0].astype(np.float32)
    blur = cv2.GaussianBlur(lightness, (0, 0), 1.25)
    lab[:, :, 0] = np.clip(lightness + 1.35 * (lightness - blur), 0, 255)
    return cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2RGB)


def quiet_input(image: np.ndarray) -> np.ndarray:
    return cv2.bilateralFilter(image, 5, 16, 6)


def head_mask(height: int, width: int) -> np.ndarray:
    rows, cols = np.ogrid[:height, :width]
    center_y, center_x = height * 0.46, width * 0.50
    radius_y, radius_x = height * 0.44, width * 0.42
    ellipse = ((cols - center_x) / radius_x) ** 2 + ((rows - center_y) / radius_y) ** 2
    mask = np.clip(1.12 - ellipse, 0, 1).astype(np.float32)
    return cv2.GaussianBlur(mask, (0, 0), 10)


def settle(pixels: np.ndarray) -> np.ndarray:
    sharp = crisp(pixels)
    flat = cv2.bilateralFilter(pixels, 9, 42, 14)
    mask = head_mask(pixels.shape[0], pixels.shape[1])[..., None]
    mixed = sharp.astype(np.float32) * mask + flat.astype(np.float32) * (1.0 - mask)
    return np.clip(mixed, 0, 255).astype(np.uint8)


def cartoonize_jpeg(data: bytes) -> bytes:
    session = load_model()
    image = Image.open(io.BytesIO(data)).convert("RGB")
    image = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    array = quiet_input(np.asarray(image))
    blob = (array.astype(np.float32) / 127.5 - 1.0)[None]
    output = session.run(None, {session.get_inputs()[0].name: blob})[0]
    pixels = np.clip((output[0] + 1.0) * 127.5, 0, 255).astype(np.uint8)
    pixels = settle(pixels)
    result = Image.fromarray(pixels, mode="RGB")
    buffer = io.BytesIO()
    result.save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()
