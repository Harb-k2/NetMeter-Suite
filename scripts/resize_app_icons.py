from pathlib import Path

from PIL import Image


ASSETS = Path(__file__).resolve().parents[1] / "assets" / "images"
TARGETS = [
    "icon.png",
    "splash-icon.png",
    "favicon.png",
    "android-icon-foreground.png",
]


def main() -> None:
    for name in TARGETS:
        path = ASSETS / name
        with Image.open(path) as source:
            image = source.convert("RGBA")
            image.thumbnail((512, 512), Image.Resampling.LANCZOS)
            image.save(path, format="PNG", optimize=True, compress_level=9)
            print(f"{name}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
