"""
Mixes narration, score, and sound effects for CrushingWalls into a synchronized master audio file.
Supports rendering audio for specific frame ranges (e.g. Level 1: frames 0 to 305) or the full episode.
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

FPS = 30
SR = 44100
SPF = SR / FPS # 1470 samples per frame

def load_audio(path, target_sr=SR):
    """Loads audio file via ffmpeg pipe to ensure perfect float32 numpy stereo array."""
    cmd = [
        "ffmpeg", "-y", "-i", str(path),
        "-f", "f32le", "-acodec", "pcm_f32le",
        "-ar", str(target_sr), "-ac", "2", "-"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    raw, _ = proc.communicate()
    arr = np.frombuffer(raw, dtype=np.float32).copy()
    return arr.reshape(-1, 2)

def mix_audio_track(start_frame=0, end_frame=305, output_wav="out/cw_level1_audio.wav"):
    os.makedirs(os.path.dirname(output_wav), exist_ok=True)
    total_frames = end_frame - start_frame + 1
    total_samples = int(total_frames * SPF)
    
    master = np.zeros((total_samples, 2), dtype=np.float32)
    
    # 1. Load Narration
    print(f"Loading narration: {NARRATION_FILE}")
    narration = load_audio(NARRATION_FILE)
    n_start_sample = int(start_frame * SPF)
    n_end_sample = min(len(narration), int((end_frame + 1) * SPF))
    if n_start_sample < len(narration):
        n_slice = narration[n_start_sample:n_end_sample]
        master[:len(n_slice)] += n_slice * 1.0 # Narration full volume
        
    # 2. Load Score
    print(f"Loading score: {SCORE_FILE}")
    score = load_audio(SCORE_FILE)
    s_start_sample = int(start_frame * SPF)
    s_end_sample = min(len(score), int((end_frame + 1) * SPF))
    if s_start_sample < len(score):
        s_slice = score[s_start_sample:s_end_sample]
        master[:len(s_slice)] += s_slice * 0.85 # Score bed
        
    # 3. SFX Cues for Level 1
    # Frame offsets from timeline.ts
    sfx_cues = [
        ("stamp.wav", 6, 0.45, None),
        ("pop.wav", 84, 0.25, None),
        ("rumble.wav", 51, 0.35, 44), # duration 44 frames
        ("slam.wav", 89, 0.40, None),
        ("ramp.wav", 105, 0.35, None),
        ("zap.wav", 117, 0.20, None),
        ("ding.wav", 171, 0.35, None),
        ("sparkle.wav", 198, 0.30, None),
        ("gears.wav", 228, 0.35, 27), # duration 27 frames
        ("slam.wav", 255, 0.65, None),
        ("squash.wav", 255, 0.55, None),
        ("hydraulic.wav", 275, 0.30, None),
    ]
    
    for sfx_name, frame, vol, max_frames in sfx_cues:
        if frame < start_frame or frame > end_frame:
            continue
        sfx_path = SFX_DIR / sfx_name
        if not sfx_path.exists():
            print(f"Warning: SFX {sfx_name} not found!")
            continue
        sfx_data = load_audio(sfx_path)
        
        if max_frames:
            max_s = int(max_frames * SPF)
            if len(sfx_data) > max_s:
                sfx_data = sfx_data[:max_s]
                # apply fade out
                fade_len = int(min(len(sfx_data) // 4, 6 * SPF))
                if fade_len > 0:
                    fade_curve = np.linspace(1.0, 0.0, fade_len)[:, None]
                    sfx_data[-fade_len:] *= fade_curve
                    
        offset = int((frame - start_frame) * SPF)
        avail = total_samples - offset
        if avail > 0:
            to_add = sfx_data[:avail] * vol
            master[offset:offset+len(to_add)] += to_add
            
    # Soft limiter / normalization
    peak = np.max(np.abs(master))
    print(f"Peak amplitude before limit: {peak:.2f}")
    if peak > 0.95:
        master = master * (0.95 / peak)
        
    sf.write(output_wav, master, SR, subtype='PCM_16')
    print(f"Wrote master audio mix to: {output_wav}")

if __name__ == "__main__":
    mix_audio_track(0, 305, "out/cw_level1_audio.wav")
