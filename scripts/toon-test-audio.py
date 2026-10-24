"""Builds the audio for the ToonTest 5-second style test.

  python scripts/toon-test-audio.py

Outputs:
  public/episodes/toon-test/narration_v1.mp3   narrator line + pirate yelp, -16 LUFS
  public/episodes/toon-test/sfx/*.wav          procedural sound effects
  src/episodes/toon-test/data/cues.json        word frames for captions and beats
"""

import asyncio
import importlib.util
import json
import re
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "episodes" / "toon-test"
SFX_DIR = EP / "sfx"
DATA = ROOT / "src" / "episodes" / "toon-test" / "data"
TMP = ROOT / "out" / "audio-tmp-toon-test"

_spec = importlib.util.spec_from_file_location("dungeon_audio", ROOT / "scripts" / "dungeon-audio.py")
da = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(da)

SR = da.SR
FPS = 30
LEAD_IN = 0.25

# id, voice, rate, pitch, text, pause after (s)
NARRATOR = ("en-US-AndrewMultilingualNeural", "+10%", "+0Hz")
LINES = [
    ("title", *NARRATOR, "Level one, the iron cannonball.", 0.12),
    ("heavy", *NARRATOR, "Heavy.", 0.08),
    ("simple", *NARRATOR, "Simple.", 0.08),
    ("brutal", *NARRATOR, "Brutal.", 0.3),
    ("yelp", "en-US-GuyNeural", "+25%", "+30Hz", "Ow!", 0.35),
]


async def tts_line(text, voice, rate, pitch, dst):
    import edge_tts

    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    words = []
    with open(dst, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append([chunk["text"], start, start + chunk["duration"] / 1e7])
    return words


def decode(path):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(out, dtype=np.float32).astype(np.float64)


def trim(x, threshold=0.004):
    loud = np.flatnonzero(np.abs(x) > threshold)
    if len(loud) == 0:
        return 0, len(x)
    return max(0, loud[0] - int(0.02 * SR)), min(len(x), loud[-1] + int(0.06 * SR))


def punctuate(text, words):
    tokens = text.split()
    out, ti = [], 0
    for w, s, e in words:
        label = w
        for j in range(ti, len(tokens)):
            if re.sub(r"[^\w'-]", "", tokens[j]).lower() == re.sub(r"[^\w'-]", "", w).lower():
                label, ti = tokens[j], j + 1
                break
        out.append((label, s, e))
    return out


def build_narration():
    TMP.mkdir(parents=True, exist_ok=True)
    EP.mkdir(parents=True, exist_ok=True)
    track = np.zeros(int(LEAD_IN * SR))
    lines = {}
    for line_id, voice, rate, pitch, text, pause in LINES:
        mp3 = TMP / f"{line_id}.mp3"
        words = asyncio.run(tts_line(text, voice, rate, pitch, mp3))
        x = decode(mp3)
        a, b = trim(x)
        offset = len(track) / SR - a / SR
        track = np.concatenate([track, x[a:b], np.zeros(int(pause * SR))])
        if not words:
            words = [[text.strip("!"), a / SR, b / SR]]
        lines[line_id] = [
            {"word": w, "start": round((s + offset) * FPS), "end": round((e + offset) * FPS)}
            for w, s, e in punctuate(text, words)
        ]
    raw = TMP / "narration_raw.wav"
    da.write_wav(raw, track, peak_db=-1.0)
    da.loudnorm(raw, EP / "narration_v1.mp3", -16)
    DATA.mkdir(parents=True, exist_ok=True)
    cues = {"durationFrames": round(len(track) / SR * FPS), "lines": lines}
    (DATA / "cues.json").write_text(json.dumps(cues, indent=2))
    print(json.dumps(cues, indent=1))


def sfx_lift():
    out = da.creak(0.5, 70, 110) * 0.5
    return da.place(out, da.thud(0.3, 60, 40, 0.08, 0.2) * 0.3, 0.0)


def sfx_drop():
    return da.whoosh(0.35, 300, 1800, 0.7)


def sfx_crunch():
    out = da.silence(1.0)
    da.place(out, da.thud(0.6, 110, 38, 0.16, 0.8), 0.0)
    da.place(out, da.crackle(0.45, 90, 0.006, 900) * 0.8, 0.0)
    da.place(out, da.hp(da.noise(0.08), 1200) * da.decay(0.08, 0.02) * 0.7, 0.0)
    return out


def sfx_pop():
    return da.sfx_pop()


def build_sfx():
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    for name, fn in {"lift": sfx_lift, "drop": sfx_drop, "crunch": sfx_crunch, "pop": sfx_pop}.items():
        da.write_wav(SFX_DIR / f"{name}.wav", fn())


if __name__ == "__main__":
    build_narration()
    build_sfx()
