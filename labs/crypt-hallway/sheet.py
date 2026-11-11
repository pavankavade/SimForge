"""Contact sheet of film stills: python sheet.py <dir-of-jpgs> <out.png> [cols]
Each tile is labelled with its frame number (the file name)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

src, out = Path(sys.argv[1]), Path(sys.argv[2])
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
files = sorted(src.glob("*.jpg"))
tw, th = 360, 640
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), (16, 16, 16))
font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 30)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((tw, th))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 92, 40], fill=(0, 0, 0))
    d.text((8, 4), str(int(f.stem)), fill=(255, 216, 77), font=font)
    sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
sheet.save(out)
print(out, len(files), "stills")
