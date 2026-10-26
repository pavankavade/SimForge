"""
Full Episode 3 Production Render & Mux Script
Renders all 3,110 frames sequentially from out/crushing_walls_ep3.blend using a dedicated, rock-solid
Blender headless process, displays live ETA, and muxes with out/cw_full_master_audio.wav into the final broadcast video.
"""

import os
import sys
import time
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLEND_FILE = ROOT / "out" / "crushing_walls_ep3.blend"
AUDIO_FILE = ROOT / "out" / "cw_full_master_audio.wav"
FRAMES_DIR = ROOT / "out" / "cw_full_frames"
OUTPUT_RAW = ROOT / "out" / "crushing_walls_final_raw.mp4"
OUTPUT_FINAL = ROOT / "out" / "crushing_walls_final.mp4"
ARTIFACT_DIR = Path(r"C:\Users\qwert\.gemini\antigravity\brain\bb9cac81-b6f6-4453-bf0b-827bd5dcbf92")
ARTIFACT_VIDEO = ARTIFACT_DIR / "crushing_walls_final.mp4"

BLENDER_EXE = r"D:\SteamLibrary\steamapps\common\Blender\blender.exe"

TOTAL_FRAMES = 3110

def run_render():
    os.makedirs(FRAMES_DIR, exist_ok=True)
    
    print(f"=== Step 1: Launching Headless Render Worker ===")
    print(f"Blend file: {BLEND_FILE}")
    print(f"Target frames: 0 to {TOTAL_FRAMES - 1} (Total: {TOTAL_FRAMES})")
    print(f"Output frames directory: {FRAMES_DIR}")
    
    cmd = [
        BLENDER_EXE, "-b", str(BLEND_FILE),
        "-s", "0", "-e", str(TOTAL_FRAMES - 1),
        "-o", f"//../out/cw_full_frames/f_",
        "-a"
    ]
    
    log_path = ROOT / "out" / "render_full.log"
    log_file = open(log_path, "w", encoding="utf-8")
    
    print("Starting Blender headless render process...")
    p = subprocess.Popen(cmd, stdout=log_file, stderr=subprocess.STDOUT)
    
    t0 = time.time()
    last_print = 0
    while True:
        poll = p.poll()
        elapsed = time.time() - t0
        
        if time.time() - last_print >= 20:
            files = list(FRAMES_DIR.glob("f_*.jpg"))
            count = len(files)
            fps = count / max(elapsed, 1.0)
            remaining_s = (TOTAL_FRAMES - count) / max(fps, 0.001) if count < TOTAL_FRAMES else 0
            print(f"[{elapsed/60:4.1f}m] Rendered {count}/{TOTAL_FRAMES} ({count/TOTAL_FRAMES*100:5.1f}%) | {fps:.2f} fps | Est. remaining: {remaining_s/60:4.1f} min", flush=True)
            last_print = time.time()
            
        if poll is not None:
            break
        time.sleep(3)
        
    log_file.close()
    
    if p.returncode != 0:
        print(f"Error: Blender exited with code {p.returncode}. See {log_path}")
        sys.exit(1)
        
    print(f"\nAll {TOTAL_FRAMES} frames rendered successfully in {(time.time() - t0)/60:.1f} minutes!")

def run_mux():
    print(f"\n=== Step 2: Muxing Video with Synchronized Audio ===")
    if not AUDIO_FILE.exists():
        print(f"Error: Missing audio file {AUDIO_FILE}")
        sys.exit(1)
        
    frames = list(FRAMES_DIR.glob("f_*.jpg"))
    print(f"Found {len(frames)} rendered frames in {FRAMES_DIR}")
    if len(frames) < TOTAL_FRAMES:
        print(f"Warning: Expected {TOTAL_FRAMES} frames, but found {len(frames)}.")
    
    # 1. FFmpeg raw encode
    mux_cmd = [
        "ffmpeg", "-y",
        "-framerate", "30",
        "-i", str(FRAMES_DIR / "f_%04d.jpg"),
        "-i", str(AUDIO_FILE),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-crf", "18",
        "-preset", "slow",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(OUTPUT_RAW)
    ]
    print("Running initial H.264 encode...")
    res = subprocess.run(mux_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"FFmpeg raw mux failed:\n{res.stderr}")
        sys.exit(1)
        
    # 2. Loudness normalization to -14 LUFS, TP -1.5 dBTP
    print(f"\n=== Step 3: Loudness Normalization (-14 LUFS) ===")
    norm_cmd = [
        "ffmpeg", "-y",
        "-i", str(OUTPUT_RAW),
        "-c:v", "copy",
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-ar", "48000",
        "-c:a", "aac",
        "-b:a", "192k",
        str(OUTPUT_FINAL)
    ]
    res_norm = subprocess.run(norm_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res_norm.returncode != 0:
        print(f"FFmpeg loudnorm failed:\n{res_norm.stderr}")
        sys.exit(1)
        
    print(f"Final broadcast video generated at: {OUTPUT_FINAL}")
    
    # 3. Copy to artifacts directory
    print(f"Copying to artifacts directory: {ARTIFACT_VIDEO}")
    shutil.copy2(OUTPUT_FINAL, ARTIFACT_VIDEO)
    print("All production steps complete!")

if __name__ == "__main__":
    run_render()
    run_mux()
