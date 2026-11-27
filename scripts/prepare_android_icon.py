#!/usr/bin/env python3
"""Generate Android legacy and adaptive launcher icon resources from the approved artwork."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "art" / "dragonpet-icon.png"
OUT = ROOT / "android-res"
LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
ADAPTIVE_FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
BACKGROUND = "#0E5855"


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    if source.width != source.height:
        raise ValueError(f"Launcher icon source must be square, got {source.size}")

    # Android 7 and older use the raster launcher resources directly.
    for density, size in LEGACY.items():
        square = source.resize((size, size), Image.Resampling.LANCZOS)
        save_png(square, OUT / f"mipmap-{density}" / "ic_launcher.png")

        # The round variant gets a clean antialiased circular mask.
        scale = 4
        large = source.resize((size * scale, size * scale), Image.Resampling.LANCZOS)
        mask = Image.new("L", (size * scale, size * scale), 0)
        ImageDraw.Draw(mask).ellipse((1, 1, size * scale - 2, size * scale - 2), fill=255)
        large.putalpha(mask)
        round_icon = large.resize((size, size), Image.Resampling.LANCZOS)
        save_png(round_icon, OUT / f"mipmap-{density}" / "ic_launcher_round.png")

    # Android 8+ adaptive icons use the full-color artwork as the foreground.
    # Its composition keeps the dragon's face central under launcher masking.
    for density, size in ADAPTIVE_FOREGROUND.items():
        foreground = source.resize((size, size), Image.Resampling.LANCZOS)
        save_png(foreground, OUT / f"mipmap-{density}" / "ic_launcher_foreground.png")

    adaptive_dir = OUT / "mipmap-anydpi-v26"
    adaptive_xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
'''
    for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
        path = adaptive_dir / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(adaptive_xml, encoding="utf-8")

    colors = f'''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">{BACKGROUND}</color>
</resources>
'''
    values = OUT / "values" / "ic_launcher_background.xml"
    values.parent.mkdir(parents=True, exist_ok=True)
    values.write_text(colors, encoding="utf-8")

    print(f"Generated Android launcher icons from {SOURCE} into {OUT}")


if __name__ == "__main__":
    main()
