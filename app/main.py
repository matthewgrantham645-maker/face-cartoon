import asyncio
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from app.cartoon import cartoonize_jpeg, load_model
from app.portrait import PortraitNotReady, generate_portrait

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"

app = FastAPI()
cartoon_ready = False
cartoon_error = ""


@app.on_event("startup")
def startup():
    global cartoon_ready, cartoon_error
    try:
        load_model()
        cartoon_ready = True
    except Exception as exc:
        cartoon_ready = False
        cartoon_error = str(exc)


@app.get("/api/health")
def health():
    return {"cartoon": cartoon_ready, "detail": cartoon_error}


@app.post("/api/portrait")
async def portrait(request: Request):
    data = await request.body()
    if not data:
        return JSONResponse({"error": "没有收到这一帧。"}, status_code=400)
    try:
        jpeg = await asyncio.to_thread(generate_portrait, data)
    except PortraitNotReady as exc:
        return JSONResponse({"error": str(exc)}, status_code=503)
    except Exception as exc:
        return JSONResponse({"error": f"定妆照没有生成。{exc}"}, status_code=500)
    return Response(content=jpeg, media_type="image/jpeg")


@app.websocket("/ws/cartoon")
async def cartoon_socket(websocket: WebSocket):
    await websocket.accept()
    if not cartoon_ready:
        await websocket.send_json({"error": cartoon_error or "跟拍模型没有载入。"})
        await websocket.close()
        return
    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break
            data = message.get("bytes")
            if not data:
                continue
            try:
                jpeg = await asyncio.to_thread(cartoonize_jpeg, data)
            except Exception as exc:
                await websocket.send_json({"error": f"这一帧没有画出来。{exc}"})
                continue
            await websocket.send_bytes(jpeg)
    except WebSocketDisconnect:
        return


@app.get("/")
def index():
    return FileResponse(WEB / "index.html")


app.mount("/static", StaticFiles(directory=WEB), name="static")
