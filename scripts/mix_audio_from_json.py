"""
Mixes Narration + Score + exact SFX cues from out/cw_full_sfx.json into out/cw_full_master_audio.wav
"""

import os
import json
import numpy as np
import soundfile as sf
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "episodes" / "crushing-walls"
SFX_DIR = EP / "sfx"
NARRATION_FILE = EP / "narration_v2.mp3"
SCORE_FILE = EP / "score_v2.mp3"
SFX_JSON = ROOT / "out" / "cw_full_sfx.json"

FPS = 30
SR = 44100
SPF = SR / FPS

def load_audio(path, target_sr=SR):
    cmd = [
        "ffmpeg", "-y", "-i", str(path),
        "-f", "f32le", "-acodec", "pcm_f32le",
        "-ar", str(target_sr), "-ac", "2", "-"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    raw, _ = proc.communicate()
    arr = np.frombuffer(raw, dtype=np.float32).copy()
    return arr.reshape(-1, 2)

def mix(total_frames=3110, output_wav="out/cw_full_master_audio.wav"):
    total_samples = int(total_frames * SPF)
    master = np.zeros((total_samples, 2), dtype=np.float32)
    
    # 1. Narration
    print(f"Loading Narration: {NARRATION_FILE}")
    narration = load_audio(NARRATION_FILE)
    n_len = min(len(narration), total_samples)
    master[:n_len] += narration[:n_len] * 1.0
    
    # 2. Score
    print(f"Loading Score: {SCORE_FILE}")
    score = load_audio(SCORE_FILE)
    s_len = min(len(score), total_samples)
    score_slice = score[:s_len].copy()
    
    fade_in_samples = int(20 * SPF)
    if fade_in_samples > 0 and len(score_slice) > fade_in_samples:
        score_slice[:fade_in_samples] *= np.linspace(0.0, 1.0, fade_in_samples)[:, None]
        
    fade_out_samples = int(40 * SPF)
    if fade_out_samples > 0 and len(score_slice) > fade_out_samples:
        score_slice[-fade_out_samples:] *= np.linspace(1.0, 0.0, fade_out_samples)[:, None]
        
    master[:s_len] += score_slice * 0.85
    
    # 3. SFX from JSON
    if not SFX_JSON.exists():
        raise FileNotFoundError(f"Missing {SFX_JSON}")
        
    with open(SFX_JSON, "r", encoding="utf-8") as f:
        sfx_list = json.load(f)
        
    print(f"Loading and mixing {len(sfx_list)} SFX cues...")
    for item in sfx_list:
        # item: { src: "episodes/crushing-walls/sfx/xxx.wav", frame: 123, volume: 0.5, durationInFrames: ..., fadeOutFrames: ... }
        src_path = ROOT / "public" / item["src"]
        frame = item["frame"]
        vol = item.get("volume", 0.5)
        durationInFrames = item.get("durationInFrames")
        fadeOutFrames = item.get("fadeOutFrames", 4)
        
        if not src_path.exists():
            print(f"Warning: SFX file not found: {src_path}")
            continue
            
        sfx_data = load_audio(src_path)
        if durationInFrames is not None:
            max_s = int(durationInFrames * SPF)
            if len(sfx_data) > max_s:
                sfx_data = sfx_data[:max_s]
                fade_s = int(min(len(sfx_data) // 4, fadeOutFrames * SPF))
                if fade_s > 0:
                    sfx_data[-fade_s:] *= np.linspace(1.0, 0.0, fade_s)[:, None]
                    
        offset = int(frame * SPF)
        avail = total_samples - offset
        if avail > 0:
            to_add = sfx_data[:avail] * vol
            master[offset:offset+len(to_add)] += to_add
            
    # Normalize peak
    peak = np.max(np.abs(master))
    print(f"Peak amplitude before normalization: {peak:.2f}")
    if peak > 0.95:
        master = master * (0.95 / peak)
        
    sf.write(output_wav, master, SR, subtype='PCM_16')
    print(f"Saved master audio track to {output_wav} ({len(master)/SR:.2f} s)")

if __name__ == "__main__":
    mix()
