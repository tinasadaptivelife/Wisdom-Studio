#!/usr/bin/env python3
"""Make a simple Wisdom Studio app icon (a cream page with a terracotta border,
like the quote-card templates). Usage: make-icon.py <output folder>.
Writes AppIcon.icns there. Needs Pillow and macOS iconutil."""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

out = Path(sys.argv[1])
S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([40, 40, S - 40, S - 40], radius=210, fill="#F5F0E8", outline="#C2704F", width=36)
d.rounded_rectangle([250, 190, 774, 834], radius=26, fill="#FFFFFF", outline="#E9D6B8", width=6)
d.rounded_rectangle([320, 270, 704, 340], radius=18, fill="#8F4526")
for i, w in enumerate((384, 340, 384, 250)):
    y = 430 + i * 92
    d.rounded_rectangle([320, y, 320 + w, y + 40], radius=16, fill="#8A9A7E" if i == 2 else "#D9CBB4")

with tempfile.TemporaryDirectory() as tmp:
    iconset = Path(tmp) / "AppIcon.iconset"
    iconset.mkdir()
    for size in (16, 32, 128, 256, 512):
        img.resize((size, size), Image.LANCZOS).save(iconset / f"icon_{size}x{size}.png")
        img.resize((size * 2, size * 2), Image.LANCZOS).save(iconset / f"icon_{size}x{size}@2x.png")
    subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(out / "AppIcon.icns")], check=True)
