"""Builds the audio stems for the LavaBridge episode using custom Gemini voice.

  python scripts/lava-bridge-audio.py            # everything
  python scripts/lava-bridge-audio.py narration  # only re-voice the narration
  python scripts/lava-bridge-audio.py sfx        # only rebuild the sound effects
  python scripts/lava-bridge-audio.py score      # only rebuild the score

Outputs:
  public/episodes/lava-bridge/narration_v2.mp3
  public/episodes/lava-bridge/score_v2.mp3
  public/episodes/lava-bridge/sfx/*.wav
  src/episodes/lava-bridge/data/wordTimestamps.json
  src/episodes/lava-bridge/data/narrationCues.json
"""

import base64
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
import wave
from pathlib import Path
from dotenv import load_dotenv
import numpy as np
from scipy import signal

load_dotenv()

SLUG = "lava-bridge"
VERSION = 6
VOICE_ID = "voice_ax8s6hqwv0of"

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "episodes" / SLUG
SFX_DIR = EP / "sfx"
DATA = ROOT / "src" / "episodes" / SLUG / "data"
TMP = ROOT / "out" / f"audio-tmp-{SLUG}"
TMP.mkdir(parents=True, exist_ok=True)


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


da = _load("dungeon_audio", "dungeon-audio.py")
ba = _load("boulder_audio", "boulder-audio.py")

SR = da.SR
FPS = 30
LEAD_IN = 0.66  # room for the title card

# id, text, pause after the line (seconds).
LINES = [
    ("cold", "Your dungeon was unbeatable, so the Guild sent a barbarian to punch straight through the floor.", 0.35),
    ("l1a", "Welcome to floor two: a lake of lava, and a stone bridge that crumbles the moment you step on it.", 0.3),
    ("l1b", "The barbarian stomps right on, and drops straight into the lava.", 1.0),
    ("l1c", "But a show-off rogue sprints across faster than it falls, backflips over the last gap, and dives into the gold.", 1.0),
    ("l2a", "So you make the bridge collapse from both ends at once. The next rogue is stranded in the middle, and sinks.", 1.0),
    ("l2b", "But a mage simply floats over the whole lake.", 0.4),
    ("l3a", "So you install lava geysers, and one launches him sky-high.", 1.0),
    ("l3b", "But a paladin surfs across on his shield, and rides every geyser like a wave.", 0.4),
    ("l4a", "So you add a current, and it carries him straight over a lava waterfall.", 1.0),
    ("l4b", "But the next mage brings his whole party, freezes the lake solid, and they all stroll across.", 0.4),
    ("l5a", "So the stone cracks, the walls open, and a wave of lava floods the entire chamber.", 1.0),
    ("l5b", "A bard peeks in, plays one sad note, and backs away.", 0.6),
    ("end", "Congratulations, your second floor is now unbeatable.", 0.35),
    ("cta", "Unless you can prove us wrong in the comments.", 1.6),
]

WORD_FIXES = {
    "l1c": [(["show", "off"], "show-off")],
    "l3a": [(["sky", "high"], "sky-high")],
}


def _bare(w):
    return re.sub(r"[^\w'-]", "", w).lower()


def fix_words(line_id, words):
    out = list(words)
    for old, new in WORD_FIXES.get(line_id, []):
        n = len(old)
        for i in range(len(out) - n + 1):
            if [_bare(x[0]) for x in out[i:i + n]] == [_bare(o) for o in old]:
                parts = new.split()
                s, e = out[i][1], out[i + n - 1][2]
                if len(parts) == n:
                    rep = [[p, out[i + k][1], out[i + k][2]] for k, p in enumerate(parts)]
                else:
                    step = (e - s) / len(parts)
                    rep = [[p, s + k * step, s + (k + 1) * step] for k, p in enumerate(parts)]
                out[i:i + n] = rep
                break
    return out


def tts_gemini_line(text, dst_wav):
    """Synthesizes text using Gemini API with custom voice, then gets word timestamps."""
    api_key = os.getenv("GEMINI_API_KEY")
    json_cache = dst_wav.with_suffix(".json")
    if dst_wav.exists() and dst_wav.stat().st_size > 1000 and json_cache.exists():
        return json.loads(json_cache.read_text())
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")

    if dst_wav.exists() and dst_wav.stat().st_size > 1000:
        audio_bytes = dst_wav.read_bytes()
    else:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"## Transcript:\n{text}\n"}
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "voice": VOICE_ID
                    }
                }
            }
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        for attempt in range(4):
            try:
                with urllib.request.urlopen(req) as resp:
                    res = json.loads(resp.read().decode())
                part = res["candidates"][0]["content"]["parts"][0]
                data_b64 = part["inlineData"]["data"]
                audio_bytes = base64.b64decode(data_b64)
                dst_wav.write_bytes(audio_bytes)
                break
            except Exception as e:
                if attempt == 3:
                    raise
                print(f"TTS retry {attempt + 1}: {e}")
                time.sleep(2)

    if json_cache.exists():
        return json.loads(json_cache.read_text())

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    words = []
    try:
        t_resp = client.models.generate_content(
            model="gemini-3.5-transcribe",
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type="audio/wav"),
            ],
            config=types.GenerateContentConfig(
                audio_transcription_config=types.AudioTranscriptionConfig(
                    word_timestamp=True
                )
            )
        )
        t_part = t_resp.candidates[0].content.parts[0]
        if hasattr(t_part, "audio_transcription") and t_part.audio_transcription and t_part.audio_transcription.words:
            for w in t_part.audio_transcription.words:
                s = float(w.start_offset.rstrip("s"))
                e = float(w.end_offset.rstrip("s"))
                words.append([w.word, s, e])
    except Exception as e:
        print(f"Warning: transcription fallback for line: {e}")

    if not words:
        tokens = text.split()
        total_sec = len(audio_bytes) / (24000 * 2)
        w_dur = total_sec / max(1, len(tokens))
        for i, token in enumerate(tokens):
            words.append([token, i * w_dur, (i + 1) * w_dur])

    json_cache.write_text(json.dumps(words))
    return words


def build_narration():
    track = np.zeros(int(LEAD_IN * SR))
    cues = {}
    segments = []

    print(f"Building narration for {len(LINES)} lines...")
    for line_id, text, pause in LINES:
        wav_file = TMP / f"{line_id}.wav"
        words = fix_words(line_id, tts_gemini_line(text, wav_file))
        x = ba.decode_samples(wav_file)

        first_word_s = words[0][1]
        last_word_e = words[-1][2]
        a = max(0, int((first_word_s - 0.04) * SR))
        b = min(len(x), int((last_word_e + 0.05) * SR))
        x = x[a:b]
        offset = len(track) / SR - a / SR
        track = np.concatenate([track, x, np.zeros(int(pause * SR))])

        wf = []
        for label, s, e in ba.attach_punctuation(text, words):
            sf = round((offset + s) * FPS)
            ef = max(sf + 1, round((offset + e) * FPS))
            wf.append({"word": label, "startFrame": sf, "endFrame": ef})
        for i in range(len(wf) - 1):
            wf[i]["endFrame"] = max(wf[i]["startFrame"] + 1, min(wf[i]["endFrame"], wf[i + 1]["startFrame"]))
        start = wf[0]["startFrame"]
        end = wf[-1]["endFrame"]
        cues[line_id] = {"startFrame": start, "endFrame": end, "words": wf}
        segments.append({"startFrame": start, "endFrame": end, "text": text, "words": wf})
        print(f"{line_id}: frames {start}-{end} (dur: {(end-start)/FPS:.2f}s) ({text[:42]}...)")

    total = len(track) / SR
    print(f"Narration length: {total:.2f}s = {round(total * FPS)} frames")

    raw = TMP / "narration_raw.wav"
    da.write_wav(raw, track, peak_db=-1.0)
    comp = TMP / "narration_comp.wav"
    da.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-i", str(raw),
            "-af", "highpass=f=70,acompressor=threshold=-24dB:ratio=2.5:attack=8:release=120:makeup=3dB",
            str(comp),
        ]
    )
    EP.mkdir(parents=True, exist_ok=True)
    out = EP / f"narration_v{VERSION}.mp3"
    da.loudnorm(comp, out, -16, tp=-1.5)
    print(f"{out.name} -> {da.measure_lufs(out):.1f} LUFS")

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "wordTimestamps.json").write_text(json.dumps(segments, indent=2))
    (DATA / "narrationCues.json").write_text(json.dumps({"durationFrames": round(total * FPS), "lines": cues}, indent=2))
    print(f"Saved cues to {DATA / 'narrationCues.json'}")


def build_score():
    # Series theme (public/music/series-theme.mp3), looped past the narration.
    cues = json.loads((DATA / "narrationCues.json").read_text())
    EP.mkdir(parents=True, exist_ok=True)
    da.series_score(EP / f"score_v{VERSION}.mp3", cues["durationFrames"] / FPS + 4, TMP)


# SFX Primitives & Builders
t_axis = da.t_axis
noise = da.noise
bp = da.bp
lp = da.lp
hp = da.hp
decay = da.decay
sweep_sine = da.sweep_sine
place = da.place
silence = da.silence
metal = da.metal
thud = da.thud
whoosh = da.whoosh


def pluck(dur, f0, tau=0.5, bright=0.5, seed=7):
    """Karplus-Strong plucked string (the bard's lute)."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    period = max(2, int(SR / f0))
    buf = rng.uniform(-1, 1, period) * 0.8
    out = np.zeros(n)
    k = 0.5 + 0.49 * bright
    for i in range(n):
        j = i % period
        out[i] = buf[j]
        buf[j] = (k * buf[j] + (1 - k) * buf[(j + 1) % period]) * 0.996
    return out * decay(dur, tau, attack=0.002)


def sfx_lava_bubble():
    """Thick molten blorps, a loopable bed."""
    out = lp(noise(2.0), 260) * 0.25
    for i in range(9):
        f = 70 + (i % 4) * 22
        place(out, sweep_sine(0.18, f, f * 2.4) * decay(0.18, 0.05) * 0.5, (i * 0.23 + (i % 3) * 0.05) % 1.8)
    return out


def sfx_lava_splash():
    """Body hits molten rock: heavy plop, then a hiss."""
    out = np.concatenate([thud(0.5, 85, 40, 0.1, 0.9), silence(0.8)])
    place(out, sweep_sine(0.3, 90, 260) * decay(0.3, 0.08) * 0.6, 0.0)
    place(out, da.sfx_sizzle() * 0.8, 0.08)
    return out


def sfx_crumble():
    """Stone slab cracks and drops away."""
    out = np.concatenate([ba.sfx_crack() * 0.7, silence(0.5)])
    place(out, thud(0.4, 120, 50, 0.08, 0.9) * 0.8, 0.02)
    for i in range(6):
        place(out, hp(noise(0.08), 900) * decay(0.08, 0.02) * 0.35, 0.06 + i * 0.05)
    return out


def sfx_grind():
    """Stone blocks grinding up into place."""
    dur = 1.0
    t = t_axis(dur)
    g = bp(noise(dur), 80, 420) * (0.7 + 0.3 * np.sin(2 * np.pi * 11 * t))
    return g * np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.2) * 0.8


def sfx_geyser():
    """Pressure hiss building into a roaring eruption."""
    dur = 1.4
    t = t_axis(dur)
    hiss = hp(noise(dur), 1800) * np.minimum(1, t / 0.15) * 0.35 * np.exp(-t / 0.9)
    roar = bp(noise(dur), 90, 900) * decay(dur, 0.5, attack=0.12) * 1.1
    out = hiss + roar
    place(out, thud(0.5, 70, 35, 0.15, 1.0) * 0.8, 0.12)
    return out


def sfx_lava_flow():
    """Low rushing roar for the current and the lavafall (loop it)."""
    dur = 2.0
    t = t_axis(dur)
    return bp(noise(dur), 60, 520) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.5 * t)) * 0.9


def sfx_freeze():
    """Frost sweeping across: ice crackles over a rising shimmer."""
    out = silence(1.4)
    place(out, da.sfx_ice() * 0.8, 0.0)
    place(out, da.crackle(1.2, 60, lo=2500) * 0.5, 0.05)
    place(out, sweep_sine(1.0, 900, 2400) * decay(1.0, 0.4) * 0.12, 0.0)
    return out


def sfx_coins():
    """A handful of coins splashing into a pile."""
    out = silence(0.9)
    for i in range(14):
        f = 2600 + (i * 373) % 1700
        place(out, metal(0.25, f, 0.05, (1.0, 2.4, 3.9), (1.0, 0.5, 0.2)) * 0.18, i * 0.045 + (i % 3) * 0.012)
    return out


def sfx_lute_sad():
    """Three descending plucks, the last one left ringing."""
    out = silence(2.4)
    for i, (f, t0) in enumerate([(392.0, 0.0), (349.2, 0.32), (293.7, 0.64)]):
        place(out, pluck(1.7 if i == 2 else 0.6, f, tau=0.9 if i == 2 else 0.25, seed=3 + i) * 0.7, t0)
    return out


def sfx_punch():
    """Fist through stone: crack, boom, debris rain."""
    out = np.concatenate([da.sfx_boom() * 0.8, silence(0.6)])
    place(out, ba.sfx_crack() * 0.7, 0.0)
    place(out, da.sfx_dust() * 0.6, 0.15)
    return out


def sfx_wave():
    """A wall of lava rushing in."""
    dur = 2.4
    t = t_axis(dur)
    rush = bp(noise(dur), 50, 700) * np.minimum(1, t / 0.8) * 1.2
    place(rush, da.sfx_rumble() * 0.6, 0.0)
    return rush * np.minimum(1, (dur - t) / 0.4)


EXTRA = {
    "lava_bubble": sfx_lava_bubble,
    "lava_splash": sfx_lava_splash,
    "crumble": sfx_crumble,
    "grind": sfx_grind,
    "geyser": sfx_geyser,
    "lava_flow": sfx_lava_flow,
    "freeze": sfx_freeze,
    "coins": sfx_coins,
    "lute_sad": sfx_lute_sad,
    "punch": sfx_punch,
    "wave": sfx_wave,
    "magic": lambda: da.place(ba.sfx_levitate() * 0.7, da.sfx_sparkle() * 0.8, 0.1),
}


SFX_BUILDERS = {**da.SFX_BUILDERS, **ba.EXTRA, **EXTRA}


def build_sfx():
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    for name, build in SFX_BUILDERS.items():
        da.write_wav(SFX_DIR / f"{name}.wav", build())
    print(f"{len(SFX_BUILDERS)} sfx written to {SFX_DIR}")
    # AI takes picked with scripts/gen-sfx.py replace their procedural versions.
    ai = sorted((SFX_DIR.parent / "sfx_ai").glob("*.wav"))
    for wav in ai:
        shutil.copyfile(wav, SFX_DIR / wav.name)
    if ai:
        print(f"{len(ai)} AI sfx laid over from {SFX_DIR.parent / 'sfx_ai'}")


if __name__ == "__main__":
    targets = sys.argv[1:] or ["narration", "score", "sfx"]
    if "sfx" in targets:
        build_sfx()
    if "narration" in targets:
        build_narration()
    if "score" in targets:
        build_score()
