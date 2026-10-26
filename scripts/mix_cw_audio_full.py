"""
Synchronized Master Audio Mixer for CrushingWalls Episode 3 (Full 5 Levels: frames 0 to 3109).
Mixes:
1. Narration (narration_v2.mp3)
2. Score (score_v2.mp3) with fade-in and fade-out
3. Procedural SFX library accurately placed on story beats and kinematics frames
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
    """Loads audio file via ffmpeg pipe to float32 stereo array."""
    cmd = [
        "ffmpeg", "-y", "-i", str(path),
        "-f", "f32le", "-acodec", "pcm_f32le",
        "-ar", str(target_sr), "-ac", "2", "-"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    raw, _ = proc.communicate()
    arr = np.frombuffer(raw, dtype=np.float32).copy()
    return arr.reshape(-1, 2)

# Load beat cues from narrationCues.json
CUES_FILE = ROOT / "src" / "episodes" / "crushing-walls" / "data" / "narrationCues.json"
with open(CUES_FILE, "r", encoding="utf-8") as f:
    cues_data = json.load(f)

def get_word_frame(line_id, word):
    word_clean = word.lower().strip(",.!?")
    for w in cues_data["lines"][line_id]["words"]:
        if w["word"].lower().strip(",.!?") == word_clean:
            return w["startFrame"]
    raise ValueError(f"Word {word} not found in line {line_id}")

def get_line_start(line_id):
    return cues_data["lines"][line_id]["startFrame"]

def build_sfx_list():
    w = get_word_frame
    ls = get_line_start
    
    # Derived beats
    wallsIn = w("l1a", "sliding")
    wallsInEnd = w("l1a", "walls") + 8
    pedestalUp = w("l1a", "loot")
    wiresGlow = w("l1a", "pedestal") + 6
    goblinGrab = w("l1a", "grab")
    coinUp = w("l1a", "coin")
    l1Close = w("l1a", "and")
    crush1 = w("l1a", "pancake")
    reopen1 = crush1 + 20
    
    rogue1Grab = w("l2a", "immediately")
    parkour = w("l2a", "parkour")
    escape = w("l2a", "escape")
    ventIn = w("l2a", "through")
    roof = w("l2a", "vent")
    rogue1OnCam = 345
    
    reopen2 = ls("l2b")
    platesIn = w("l2b", "greased")
    grease = w("l2b", "oil")
    chimney = w("l2b", "spring")
    bootDemo = w("l2b", "punts")
    hatch = w("l2b", "hatch")
    rogue2Grab = w("l3a", "grease")
    slam3 = w("l3a", "squashes")
    punt = w("l3a", "launched")
    land2 = punt + 12
    reopen3 = slam3 + 24
    
    paladinOnCam = reopen3 + 20
    creep3 = w("l3b", "paladin")
    wedge = w("l3b", "steel")
    stall = w("l3b", "stall")
    smug = stall + 20
    
    pressL = w("l3c", "hydraulic")
    pressR = pressL + 24
    hiss = w("l3c", "presses")
    electrify = w("l3c", "electrified")
    sparkL = electrify + 12
    sparkR = electrify + 24
    arc1 = w("l3c", "fries")
    roastEnd = arc1 + 45
    arc2 = arc1 + 20
    fold = w("l3c", "folds")
    foldEnd = fold + 32
    cube = w("l3c", "scrap")
    cubeReopen = cube + 20
    
    mage1Grab = w("l4a", "blink")
    close4End = mage1Grab + 28
    cast = mage1Grab - 10
    blink = mage1Grab + 8
    
    reopen4 = ls("l4b")
    mirrorPops = [w("l4b", "mirrors") + i * 8 for i in range(5)]
    mage2Grab = w("l4c", "teleport")
    teleport = mage2Grab + 6
    pop = w("l4c", "vaporizes")
    reopen5 = pop + 30
    
    partyOnCam = reopen5 + 22
    rails = w("l5a", "rails")
    wheels = rails + 16
    booster = w("l5a", "booster")
    trigger = w("l5b", "room")
    lunge = trigger + 8
    portcullis = lunge + 12
    blast = lunge + 18
    launch = w("l5b", "funnels")
    mimicOpen = launch + 8
    chomp = w("l5b", "mimic")
    burp = chomp + 30
    stamp = w("end", "unbeatable")
    
    stage_starts = [ls("l1a"), ls("l2b"), ls("l3c"), ls("l4b"), ls("l5a")]
    
    sfx = [
        # Title + stage badges
        ("stamp.wav", 6, 0.45, None),
    ]
    for st in stage_starts:
        sfx.append(("pop.wav", st, 0.25, None))
        
    # Level 1
    sfx.extend([
        ("rumble.wav", wallsIn, 0.35, wallsInEnd - wallsIn),
        ("slam.wav", wallsInEnd - 6, 0.35, None),
        ("ramp.wav", pedestalUp, 0.3, None),
        ("zap.wav", wiresGlow, 0.15, None),
        ("ding.wav", goblinGrab, 0.3, None),
        ("sparkle.wav", coinUp, 0.25, None),
        ("gears.wav", l1Close, 0.3, crush1 - l1Close),
        ("slam.wav", crush1, 0.65, None),
        ("squash.wav", crush1, 0.55, None),
        ("hydraulic.wav", reopen1, 0.25, None),
        # L1 counter
        ("whoosh.wav", rogue1OnCam, 0.2, None),
        ("ding.wav", rogue1Grab, 0.25, None),
        ("gears.wav", rogue1Grab + 2, 0.22, escape - rogue1Grab),
        ("whoosh.wav", ventIn, 0.3, None),
        ("slam.wav", roof + 6, 0.5, None),
        ("sparkle.wav", roof + 10, 0.25, None),
    ])
    
    # Level 2
    plateLands = [platesIn + i * 8 + 12 for i in range(3)]
    sfx.append(("hydraulic.wav", reopen2, 0.25, None))
    for pl in plateLands:
        sfx.append(("clank.wav", pl, 0.35, None))
    sfx.extend([
        ("squelch.wav", grease, 0.35, None),
        ("ratchet.wav", chimney, 0.3, None),
        ("boing.wav", bootDemo, 0.35, None),
        ("trap_close.wav", hatch, 0.3, None),
        ("ding.wav", rogue2Grab, 0.25, None),
        ("gears.wav", rogue2Grab + 2, 0.25, slam3 - rogue2Grab),
        ("boing.wav", punt, 0.45, None),
        ("launch.wav", punt, 0.3, None),
        ("thud.wav", land2, 0.4, None),
        ("slam.wav", slam3 + 6, 0.65, None),
        ("squash.wav", slam3 + 6, 0.55, None),
        ("hydraulic.wav", reopen3, 0.25, None),
        # L2 counter
        ("gears.wav", creep3, 0.22, stall - creep3),
        ("ratchet.wav", wedge, 0.3, None),
        ("clang.wav", stall, 0.5, None),
        ("sparkle.wav", smug, 0.25, None),
    ])
    
    # Level 3
    sfx.extend([
        ("clank.wav", pressL, 0.4, None),
        ("slam.wav", pressL + 10, 0.35, None),
        ("clank.wav", pressR, 0.4, None),
        ("slam.wav", pressR + 10, 0.35, None),
        ("hydraulic.wav", hiss, 0.45, None),
        ("zap.wav", electrify, 0.3, None),
        ("zap.wav", sparkL, 0.3, None),
        ("zap.wav", sparkR, 0.3, None),
        ("sizzle.wav", arc1, 0.35, roastEnd - arc1),
        ("zap.wav", arc2, 0.35, None),
        ("helmet.wav", fold, 0.4, None),
        ("crack.wav", fold + 8, 0.4, None),
        ("squash.wav", foldEnd, 0.5, None),
        ("hydraulic.wav", cubeReopen, 0.25, None),
        ("toaster_ding.wav", cube, 0.5, None),
        # L3 counter
        ("ding.wav", mage1Grab, 0.25, None),
        ("gears.wav", mage1Grab + 3, 0.25, close4End - mage1Grab),
        ("levitate.wav", cast, 0.3, None),
        ("sparkle.wav", blink, 0.3, None),
        ("whoosh.wav", blink, 0.3, None),
        ("slam.wav", close4End, 0.45, None),
    ])
    
    # Level 4
    sfx.append(("hydraulic.wav", reopen4, 0.25, None))
    for mp in mirrorPops:
        sfx.append(("pop.wav", mp, 0.25, None))
    sfx.extend([
        ("ice.wav", mirrorPops[0], 0.15, None),
        ("ding.wav", mage2Grab, 0.25, None),
        ("levitate.wav", mage2Grab + 4, 0.3, None),
        ("zap.wav", teleport, 0.3, None),
        ("pong_beep.wav", mage2Grab + 10, 0.25, None),
        ("pong_beep.wav", mage2Grab + 18, 0.25, None),
        ("pong_beep.wav", mage2Grab + 26, 0.25, None),
        ("pop.wav", pop, 0.5, None),
        ("slam.wav", pop + 2, 0.45, None),
        ("squash.wav", pop + 2, 0.5, None),
        ("hydraulic.wav", reopen5, 0.25, None),
    ])
    
    # Level 5
    sfx.extend([
        ("whoosh.wav", partyOnCam, 0.15, None),
        ("rumble.wav", rails, 0.35, 16),
        ("roll.wav", rails, 0.3, 16),
        ("clank.wav", wheels, 0.4, None),
        ("twang.wav", booster, 0.35, None),
        ("ratchet.wav", booster + 6, 0.3, None),
        ("growl.wav", rails + 8, 0.2, None),
        ("click.wav", trigger, 0.4, None),
        ("zap.wav", trigger, 0.2, None),
        ("whoosh_big.wav", lunge, 0.5, None),
        ("roll.wav", lunge, 0.35, 10),
        ("slam.wav", lunge + 8, 0.4, None),
        ("gate.wav", portcullis, 0.5, None),
        ("slam.wav", blast + 2, 0.55, None),
        ("squash.wav", blast + 2, 0.4, None),
        ("whoosh.wav", launch, 0.35, None),
        ("launch.wav", launch, 0.3, None),
        ("launch.wav", launch + 6, 0.3, None),
        ("launch.wav", launch + 12, 0.3, None),
        ("trap_open.wav", mimicOpen, 0.4, None),
        ("chomp.wav", chomp, 0.55, None),
        ("chew.wav", chomp + 10, 0.4, None),
        ("burp.wav", burp, 0.5, None),
        # Finale
        ("stamp.wav", stamp, 0.6, None),
        ("boom.wav", stamp, 0.35, None),
    ])
    
    return sfx

def mix_full_episode(total_frames=3110, output_wav="out/cw_full_master_audio.wav"):
    os.makedirs(os.path.dirname(output_wav), exist_ok=True)
    total_samples = int(total_frames * SPF)
    master = np.zeros((total_samples, 2), dtype=np.float32)
    
    # 1. Narration
    print(f"Loading Narration: {NARRATION_FILE}")
    narration = load_audio(NARRATION_FILE)
    n_len = min(len(narration), total_samples)
    master[:n_len] += narration[:n_len] * 1.0
    
    # 2. Score with 20 frame fade-in, 40 frame fade-out
    print(f"Loading Score: {SCORE_FILE}")
    score = load_audio(SCORE_FILE)
    s_len = min(len(score), total_samples)
    score_slice = score[:s_len].copy()
    
    fade_in_samples = int(20 * SPF)
    if fade_in_samples > 0 and len(score_slice) > fade_in_samples:
        fi = np.linspace(0.0, 1.0, fade_in_samples)[:, None]
        score_slice[:fade_in_samples] *= fi
        
    fade_out_samples = int(40 * SPF)
    if fade_out_samples > 0 and len(score_slice) > fade_out_samples:
        fo = np.linspace(1.0, 0.0, fade_out_samples)[:, None]
        score_slice[-fade_out_samples:] *= fo
        
    master[:s_len] += score_slice * 0.85
    
    # 3. SFX
    print("Mixing SFX Cues...")
    sfx_cues = build_sfx_list()
    for sfx_name, frame, vol, max_frames in sfx_cues:
        if frame < 0 or frame >= total_frames:
            continue
        sfx_path = SFX_DIR / sfx_name
        if not sfx_path.exists():
            print(f"Warning: SFX {sfx_name} missing!")
            continue
        sfx_data = load_audio(sfx_path)
        if max_frames:
            max_s = int(max_frames * SPF)
            if len(sfx_data) > max_s:
                sfx_data = sfx_data[:max_s]
                fade_len = int(min(len(sfx_data) // 4, 6 * SPF))
                if fade_len > 0:
                    fade_curve = np.linspace(1.0, 0.0, fade_len)[:, None]
                    sfx_data[-fade_len:] *= fade_curve
        
        offset = int(frame * SPF)
        avail = total_samples - offset
        if avail > 0:
            to_add = sfx_data[:avail] * vol
            master[offset:offset+len(to_add)] += to_add
            
    # Normalize with headroom
    peak = np.max(np.abs(master))
    print(f"Peak amplitude before normalization: {peak:.2f}")
    if peak > 0.95:
        master = master * (0.95 / peak)
        
    sf.write(output_wav, master, SR, subtype='PCM_16')
    print(f"Successfully generated master audio: {output_wav} ({len(master)/SR:.2f} s)")

if __name__ == "__main__":
    mix_full_episode()
