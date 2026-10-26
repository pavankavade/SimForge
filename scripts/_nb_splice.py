from pathlib import Path

p = Path(r"D:\git\SimForge\scripts\blender_nuclear_bunker.py")
src = p.read_text(encoding="utf-8")
block = Path(r"D:\git\SimForge\scripts\_nb_ground_block.py").read_text(encoding="utf-8")

start = src.index("def build_ground():")
end = src.index("def build_house(col, hx):")
out = src[:start] + block + src[end:]
p.write_text(out, encoding="utf-8")
print("spliced", len(src), "->", len(out))
