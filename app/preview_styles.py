import io
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont

from app.model import Generator

ROOT = Path(__file__).resolve().parents[1]
WEIGHTS = ROOT / "weights"
OUT = ROOT / "web" / "preview"
SOURCE = WEIGHTS / "preview_input.jpg"


def load_generator(path: Path):
    model = Generator().eval()
    state = torch.load(path, map_location="cpu", weights_only=True)
    if isinstance(state, dict) and "state_dict" in state:
        state = state["state_dict"]
    model.load_state_dict(state)
    return model


def paint(model, image: Image.Image, size: int) -> Image.Image:
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    array = np.asarray(resized, dtype=np.float32)
    tensor = torch.from_numpy(array).permute(2, 0, 1).unsqueeze(0)
    tensor = tensor / 255.0 * 2 - 1
    with torch.inference_mode():
        output = model(tensor)[0]
    output = (output * 0.5 + 0.5).clamp(0, 1)
    pixels = (output.permute(1, 2, 0) * 255).byte().numpy()
    return Image.fromarray(pixels, mode="RGB")


def flat_cartoon(image: Image.Image, size: int = 512) -> Image.Image:
    base = image.resize((size, size), Image.Resampling.LANCZOS)
    small = base.resize((160, 160), Image.Resampling.BILINEAR)
    smooth = np.asarray(small.resize((size, size), Image.Resampling.BILINEAR), dtype=np.int16)
    step = 36
    poster = (smooth // step) * step + step // 2
    gray = np.asarray(base.convert("L").resize((160, 160), Image.Resampling.BILINEAR).resize((size, size), Image.Resampling.BILINEAR), dtype=np.float32)
    gx = np.zeros_like(gray)
    gy = np.zeros_like(gray)
    gx[:, 1:-1] = gray[:, 2:] - gray[:, :-2]
    gy[1:-1, :] = gray[2:, :] - gray[:-2, :]
    edge = np.hypot(gx, gy) > 28
    poster[edge] = 25
    return Image.fromarray(np.clip(poster, 0, 255).astype(np.uint8), mode="RGB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    source.save(OUT / "00_original.jpg", quality=90)
    jobs = []
    v2 = load_generator(WEIGHTS / "face_paint_512_v2.pt")
    jobs.append(("01_v2_512", paint(v2, source, 512)))
    jobs.append(("02_v2_256", paint(v2, source, 256).resize((512, 512), Image.Resampling.NEAREST)))
    for name in ("face_paint_512_v1", "paprika", "celeba_distill"):
        path = WEIGHTS / f"{name}.pt"
        if path.is_file() and path.stat().st_size > 1_000_000:
            model = load_generator(path)
            jobs.append((name, paint(model, source, 512)))
    jobs.append(("flat_ink", flat_cartoon(source)))
    for name, image in jobs:
        image.save(OUT / f"{name}.jpg", quality=90)
        print("wrote", name, image.size)


if __name__ == "__main__":
    main()
