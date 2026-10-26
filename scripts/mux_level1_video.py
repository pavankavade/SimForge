"""
Combines the rendered PNG frames from Blender with the synchronized audio track into an MP4.
Generates both out/crushing_walls_level1.mp4 and artifact file for preview.
"""

import subprocess
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRAMES_DIR = ROOT / "out" / "cw_frames"
AUDIO_FILE = ROOT / "out" / "cw_level1_audio.wav"

def get_unique_filename(base_path: Path) -> Path:
    if not base_path.exists():
        return base_path
    stem = base_path.stem
    suffix = base_path.suffix
    parent = base_path.parent
    import re
    m = re.match(r"^(.*?)_v(\d+)$", stem)
    if m:
        base_name = m.group(1)
        version = int(m.group(2)) + 1
    else:
        base_name = stem
        version = 2
    while True:
        candidate = parent / f"{base_name}_v{version}{suffix}"
        if not candidate.exists():
            return candidate
        version += 1

OUT_VIDEO = get_unique_filename(ROOT / "out" / "crushing_walls_level1.mp4")
ARTIFACT_DIR = Path(r"C:\Users\qwert\.gemini\antigravity\brain\bb9cac81-b6f6-4453-bf0b-827bd5dcbf92")
ARTIFACT_VIDEO = ARTIFACT_DIR / OUT_VIDEO.name

def mux():
    if not AUDIO_FILE.exists():
        print(f"Audio file missing: {AUDIO_FILE}")
        return
        
    cmd = [
        "ffmpeg", "-y",
        "-framerate", "30",
        "-i", str(FRAMES_DIR / "f_%04d.png"),
        "-i", str(AUDIO_FILE),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-crf", "18",
        "-preset", "slow",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(OUT_VIDEO)
    ]
    
    print("Running FFmpeg multiplexing...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print("FFmpeg error:", res.stderr)
        return
        
    print(f"Successfully generated: {OUT_VIDEO}")
    
    # Copy to artifact dir for direct preview
    if ARTIFACT_DIR.exists():
        shutil.copy2(OUT_VIDEO, ARTIFACT_VIDEO)
        print(f"Copied to artifact dir: {ARTIFACT_VIDEO}")
        
    # Also generate a contact sheet of key frames from video
    sheet_cmd = [
        "ffmpeg", "-y",
        "-i", str(OUT_VIDEO),
        "-vf", "select='not(mod(n\\,30))',scale=270:480,tile=5x2",
        "-vsync", "vfr",
        str(ARTIFACT_DIR / "cw_level1_contact_sheet.png")
    ]
    subprocess.run(sheet_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print("Generated contact sheet in artifact dir.")

if __name__ == "__main__":
    mux()
