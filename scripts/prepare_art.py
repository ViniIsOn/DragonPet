"""Prepare the original artwork for the game.

Input:  assets/art/dragon-v2-*.png, dragon-base-v2.png, island-base.png
Output: public/art/dragon-<emotion>.webp and island.webp (runtime assets)
        assets/source/dragon-base.webp and island.webp (high quality references)

Run with: .venv/bin/python scripts/prepare_art.py   (needs Pillow)
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "art"
OUT = ROOT / "public" / "art"
REF = ROOT / "assets" / "source"

OUT.mkdir(parents=True, exist_ok=True)
REF.mkdir(parents=True, exist_ok=True)


def remove_large_white_islands(image: Image.Image) -> None:
    """Clear white gaps enclosed by wings while keeping small eye glints."""
    pixels = np.asarray(image).copy()
    rgb = pixels[:, :, :3]
    white = (rgb > 235).all(axis=2) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 20)
    height, width = white.shape
    visited = np.zeros((height, width), dtype=bool)

    for y, x in zip(*np.nonzero(white)):
        if visited[y, x]:
            continue
        queue = deque([(int(y), int(x))])
        visited[y, x] = True
        region: list[tuple[int, int]] = []
        while queue:
            cy, cx = queue.popleft()
            region.append((cy, cx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < height and 0 <= nx < width and white[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
        if len(region) > 400:
            for cy, cx in region:
                pixels[cy, cx, 3] = 0

    image.putdata([tuple(pixel) for pixel in pixels.reshape(-1, 4)])


def prepare_dragon(path: Path, output_name: str) -> None:
    image = Image.open(path).convert("RGBA")
    image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)

    # The characters were generated on a seamless white background. Flood fill
    # removes only white connected to the canvas border, preserving the pale
    # gold belly plates and highlights inside the character.
    transparent = (255, 255, 255, 0)
    for point in (
        (0, 0),
        (image.width - 1, 0),
        (0, image.height - 1),
        (image.width - 1, image.height - 1),
    ):
        ImageDraw.floodfill(image, point, transparent, thresh=34)

    remove_large_white_islands(image)

    alpha = image.getchannel("A").filter(ImageFilter.GaussianBlur(0.5))
    image.putalpha(alpha)
    image.save(OUT / output_name, "WEBP", quality=90, method=6)
    print(f"{path.name} -> public/art/{output_name}")


def prepare_island(path: Path) -> None:
    image = Image.open(path).convert("RGB")
    runtime = image.copy()
    runtime.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
    runtime.save(OUT / "island.webp", "WEBP", quality=88, method=6)

    reference = image.copy()
    reference.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    reference.save(REF / "island.webp", "WEBP", quality=92, method=6)
    print(f"{path.name} -> public/art/island.webp")


def save_reference(path: Path) -> None:
    image = Image.open(path).convert("RGB")
    image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
    image.save(REF / "dragon-base.webp", "WEBP", quality=92, method=6)


if __name__ == "__main__":
    for dragon in sorted(SRC.glob("dragon-v2-*.png")):
        emotion = dragon.stem.removeprefix("dragon-v2-")
        prepare_dragon(dragon, f"dragon-{emotion}.webp")
    base = SRC / "dragon-base-v2.png"
    if base.exists():
        save_reference(base)
    island = SRC / "island-base.png"
    if island.exists():
        prepare_island(island)
