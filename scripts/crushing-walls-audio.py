"""Builds the audio stems for the CrushingWalls episode using custom Gemini voice.

  python scripts/crushing-walls-audio.py            # everything
  python scripts/crushing-walls-audio.py narration  # only re-voice the narration
  python scripts/crushing-walls-audio.py sfx        # only rebuild the sound effects
  python scripts/crushing-walls-audio.py score      # only rebuild the score

Outputs:
  public/episodes/crushing-walls/narration_v1.mp3
  public/episodes/crushing-walls/score_v1.mp3
  public/episodes/crushing-walls/sfx/*.wav
  src/episodes/crushing-walls/data/wordTimestamps.json
  src/episodes/crushing-walls/data/narrationCues.json
"""

import base64
import importlib.util
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from dotenv import load_dotenv
import numpy as np

load_dotenv()

SLUG = "crushing-walls"
VERSION = 2
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
    ("l1a", "If you wire two sliding stone walls to a loot pedestal, a greedy goblin will grab the shiny coin, and get pressed into a pancake.", 0.9),
    ("l2a", "However, a show-off rogue will immediately parkour up the stone crevices to escape through the ceiling vent.", 0.55),
    ("l2b", "So you replace the stone with grease-coated steel plates, and hide a spring-loaded boot inside the vent.", 0.3),
    ("l2c", "Even if he climbs the grease, the ceiling punts him right back to the floor.", 0.9),
    ("l3a", "But a stubborn paladin won't even try to climb. He just wedges a reinforced steel beam between the walls, and stands there smugly.", 0.6),
    ("l3b", "To fix this, you upgrade to twin five-hundred-ton hydraulic presses, and electrify the wall plates.", 0.3),
    ("l3c", "The moment his metal beam touches both sides, it completes the circuit—roasting him inside his own armor before folding him into a neat little cube.", 0.9),
    ("l4a", "However, a lazy mage will simply cast a teleport spell to blink right through the wall.", 0.55),
    ("l4b", "So you line the room with arcane deflection mirrors.", 0.3),
    ("l4c", "The moment he teleports, his spell bounces between the closing walls like a game of high-speed Pong, until there is nowhere left to bounce.", 0.9),
    ("l5a", "Finally, for paranoid parties that stand outside the doorway poking the floor with a ten-foot pole,", 0.3),
    ("l5b", "you mount the entire room on high-speed rails. The moment their stick touches a tile, the whole room lunges into the hallway, swallows them whole, and blasts them through the ceiling chute straight into your pet Mimic.", 0.6),
    ("end", "Congratulations, your dungeon is now unbeatable.", 1.6),
]

# The transcriber spells some words differently from the script. Each fix replaces a run of
# transcribed tokens with one script token spanning the same time, so subtitles and w() use
# the script's words.
WORD_FIXES = {
    "l3b": [(["500", "ton"], "five-hundred-ton")],
    "l5a": [(["10-ft"], "ten-foot")],
    "l5b": [(["high", "speed"], "high-speed"), (["ceiling,", "shoots"], "ceiling chute")],
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
        else:
            raise ValueError(f"{line_id}: word fix {old} not found")
    return out


def tight_trim(x, threshold_db=-36):
    """Accurately finds speech start and end, stripping dead silence."""
    win = int(0.015 * SR)
    rms = np.sqrt(np.convolve(x**2, np.ones(win) / win, mode="same"))
    thresh = 10 ** (threshold_db / 20)
    voiced = np.flatnonzero(rms > thresh)
    if len(voiced) == 0:
        return 0, len(x)
    # 20ms pre-pad and 35ms post-pad to preserve natural phoneme attacks and releases
    a = max(0, voiced[0] - int(0.02 * SR))
    b = min(len(x), voiced[-1] + int(0.035 * SR))
    return a, b


def tts_gemini_line(text, dst_wav):
    """Synthesizes text using Gemini API with custom voice, then gets word timestamps."""
    api_key = os.getenv("GEMINI_API_KEY")
    json_cache = dst_wav.with_suffix(".json")
    # Cached audio and timestamps: no API call (and no key) needed
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

    # Extract word-level timestamps using gemini-3.5-transcribe
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

    # Fallback to proportional spacing if transcribe didn't return words
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

    print(f"Building tightened narration for {len(LINES)} lines...")
    for line_id, text, pause in LINES:
        wav_file = TMP / f"{line_id}.wav"
        words = fix_words(line_id, tts_gemini_line(text, wav_file))
        x = ba.decode_samples(wav_file)

        # Precision speech boundaries from verified word timestamps:
        # strips any dead lead-in silence and trailing dead air / pops
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
    print(f"New tightened narration length: {total:.2f}s = {round(total * FPS)} frames")

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
    looped = TMP / "score_loop.wav"
    src = ROOT / "public" / "episodes" / "dungeon-trap" / "score.mp3"
    cues_file = DATA / "narrationCues.json"
    if cues_file.exists():
        cues_data = json.loads(cues_file.read_text())
        dur_sec = max(80, int(cues_data["durationFrames"] / FPS) + 8)
    else:
        dur_sec = 100

    da.run(
        [
            "ffmpeg", "-y", "-hide_banner",
            "-i", str(src), "-i", str(src), "-i", str(src),
            "-filter_complex", f"[0:a][1:a][2:a]concat=n=3:v=0:a=1,atrim=0:{dur_sec}",
            str(looped),
        ]
    )
    EP.mkdir(parents=True, exist_ok=True)
    out = EP / f"score_v{VERSION}.mp3"
    da.loudnorm(looped, out, -27, tp=-6)
    print(f"{out.name} -> {da.measure_lufs(out):.1f} LUFS")


# SFX
t_axis, noise, bp, lp, hp = da.t_axis, da.noise, da.bp, da.lp, da.hp
decay, place, silence, thud, metal, whoosh = da.decay, da.place, da.silence, da.thud, da.metal, da.whoosh


def sfx_boing():
    """Cartoon spring boing for the ceiling boot."""
    t = np.linspace(0, 0.45, int(0.45 * SR), endpoint=False)
    freq = 240 + 360 * (1 - np.exp(-t * 8)) + 30 * np.sin(2 * np.pi * 18 * t)
    phase = np.cumsum(freq) / SR * 2 * np.pi
    return np.sin(phase) * np.exp(-t * 6) * 0.4


def sfx_pong_beep():
    """8-bit retro arcade Pong paddle beep."""
    t = np.linspace(0, 0.08, int(0.08 * SR), endpoint=False)
    sq = np.sign(np.sin(2 * np.pi * 440 * t)) * 0.3
    return sq * np.exp(-t * 20)


def sfx_toaster_ding():
    """Toaster ding when goblin drops through slot."""
    t = np.linspace(0, 0.6, int(0.6 * SR), endpoint=False)
    tone = np.sin(2 * np.pi * 1800 * t) * 0.3 + np.sin(2 * np.pi * 3600 * t) * 0.15
    return tone * np.exp(-t * 7)


EXTRA = {
    "boing": sfx_boing,
    "pong_beep": sfx_pong_beep,
    "toaster_ding": sfx_toaster_ding,
}


def build_sfx():
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    for old in SFX_DIR.glob("*.wav"):
        old.unlink()
    builders = {**da.SFX_BUILDERS, **ba.EXTRA, **EXTRA}
    for name, build in builders.items():
        da.write_wav(SFX_DIR / f"{name}.wav", build())
    print(f"{len(builders)} sfx written to {SFX_DIR}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode in ("narration", "all"):
        build_narration()
    if mode in ("score", "all"):
        build_score()
    if mode in ("sfx", "all"):
        build_sfx()
