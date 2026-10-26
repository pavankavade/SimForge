"""Builds the audio stems for the CaveHome shelter production using custom Gemini voice.

  python scripts/cave-home-audio.py            # everything
  python scripts/cave-home-audio.py narration  # only re-voice the narration
  python scripts/cave-home-audio.py sfx        # only rebuild the sound effects
  python scripts/cave-home-audio.py score      # only rebuild the score

Outputs:
  public/shelter/cave-home/narration_v1.mp3
  public/shelter/cave-home/score_v1.mp3
  public/shelter/cave-home/sfx/*.wav
  src/shelter/cave-home/data/wordTimestamps.json
  src/shelter/cave-home/data/narrationCues.json
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
import scipy.io.wavfile
import scipy.signal

load_dotenv()

SLUG = "cave-home"
VERSION = 1
VOICE_ID = "voice_ax8s6hqwv0of"

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "shelter" / SLUG
SFX_DIR = EP / "sfx"
DATA = ROOT / "src" / "shelter" / SLUG / "data"
TMP = ROOT / "out" / f"audio-tmp-{SLUG}"

EP.mkdir(parents=True, exist_ok=True)
SFX_DIR.mkdir(parents=True, exist_ok=True)
DATA.mkdir(parents=True, exist_ok=True)
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
LEAD_IN = 0.5  # seconds before first word

LINES = [
    ("l1a", "If you find a cave and hide inside it from the rain, you have a home,", 0.35),
    ("l1b", "but it is pitch black and freezing.", 0.75),
    ("l2a", "So, you build a fire in the middle of the cave,", 0.35),
    ("l2b", "but the smoke fills the whole cave in seconds.", 0.8),
    ("l3a", "So, you move the fire close to the entrance, where the smoke can drift out,", 0.4),
    ("l3b", "but now the cold wind blows straight in and the fire keeps going out.", 0.85),
    ("l4a", "So, you stack stones across the entrance into a wall with a small door.", 0.4),
    ("l4b", "This is a wind wall.", 0.7),
    ("l5a", "But now the smoke is trapped again and the cave fills up.", 0.5),
    ("l5b", "So, you leave a gap at the very top of the wall. This is a smoke vent.", 0.85),
    ("l6a", "But water drips from the ceiling right onto the floor where you sleep.", 0.5),
    ("l6b", "So, you dig a little channel in the floor that leads the water out of the cave. This is a drain.", 0.85),
    ("l7a", "But the floor is still cold, wet rock.", 0.4),
    ("l7b", "So, you build a bed of logs off the ground and cover it with dry grass.", 0.85),
    ("l8a", "But at night, animals come sniffing at the door.", 0.4),
    ("l8b", "So, you make a door of tied sticks that you can close from the inside.", 0.85),
    ("l9a", "And that gap at the top of the wall is not a mistake.", 0.5),
    ("l9b", "Smoke rises and flows out along the ceiling, while fresh air comes in along the floor.", 0.5),
    ("l9c", "Close it and the fire would fill the cave with smoke.", 0.85),
    ("l10a", "Add a torch on the wall, a painting of a mammoth,", 0.35),
    ("l10b", "and a bat who refuses to move out.", 0.9),
    ("end", "Congratulations, you have built a cave home.", 1.6),
]

WORD_FIXES = {
    "l4b": [(["war"], "wall")],
    "l10a": [(["i", "had"], "add")],
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


def tts_gemini_line(text, dst_wav):
    """Synthesizes text using Gemini API with custom voice, then gets word timestamps."""
    api_key = os.getenv("GEMINI_API_KEY")
    json_cache = dst_wav.with_suffix(".json")

    # Cached audio and timestamps: no API call needed
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

    print(f"Building narration with custom Gemini voice ({VOICE_ID}) for {len(LINES)} lines...")
    for line_id, text, pause in LINES:
        wav_file = TMP / f"{line_id}.wav"
        words = fix_words(line_id, tts_gemini_line(text, wav_file))
        x = ba.decode_samples(wav_file)

        # Precision speech boundaries from verified word timestamps
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

    total_frames = int(np.ceil(len(track) / SR * FPS))
    meta = {
        "slug": SLUG,
        "version": VERSION,
        "sampleRate": SR,
        "fps": FPS,
        "totalSamples": len(track),
        "durationSeconds": round(len(track) / SR, 3),
        "durationFrames": total_frames,
        "lines": cues,
    }

    (DATA / "narrationCues.json").write_text(json.dumps(meta, indent=2))
    (DATA / "wordTimestamps.json").write_text(json.dumps(segments, indent=2))

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
    out_mp3 = EP / f"narration_v{VERSION}.mp3"
    da.loudnorm(comp, out_mp3, -16.0)
    print(f"Narration written: {out_mp3} ({meta['durationSeconds']}s, {meta['durationFrames']} frames)")


def sfx_rain_loop(dur=10.0):
    """Ambient falling rain sound."""
    n = int(dur * SR)
    # Filtered noise
    rng = np.random.default_rng(42)
    noise = rng.normal(0, 0.2, n)
    sos = scipy.signal.butter(4, [800, 6000], btype="bandpass", fs=SR, output="sos")
    rain = scipy.signal.sosfilt(sos, noise)
    # Add gentle droplets
    drops = np.zeros(n)
    num_drops = int(dur * 40)
    drop_idx = rng.integers(0, n - 500, num_drops)
    for idx in drop_idx:
        t = np.linspace(0, 0.015, int(0.015 * SR))
        decay = np.exp(-t / 0.003)
        tone = np.sin(2 * np.pi * rng.uniform(2000, 5000) * t) * decay * 0.15
        drops[idx:idx + len(tone)] += tone
    sig = rain + drops
    return (sig / np.max(np.abs(sig) + 1e-6) * 0.7).astype(np.float32)


def sfx_water_drip():
    """Water droplet plink and resonant acoustic splash."""
    dur = 0.35
    t = np.linspace(0, dur, int(dur * SR))
    # Downward pitch swept sinusoidal plink
    freq = 2400 * np.exp(-t * 12) + 600
    decay = np.exp(-t / 0.04)
    plink = np.sin(2 * np.pi * freq * t) * decay
    # Bubble resonance
    bubble = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.02) * 0.4
    out = plink + bubble
    return (out / np.max(np.abs(out) + 1e-6) * 0.8).astype(np.float32)


def sfx_wind_gust(dur=2.5):
    """Gust of cold wind blowing into the cave."""
    n = int(dur * SR)
    rng = np.random.default_rng(123)
    noise = rng.normal(0, 0.3, n)
    # Swept bandpass
    sos1 = scipy.signal.butter(2, [250, 900], btype="bandpass", fs=SR, output="sos")
    w = scipy.signal.sosfilt(sos1, noise)
    # Swell envelope
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.8
    out = w * env
    return (out / np.max(np.abs(out) + 1e-6) * 0.85).astype(np.float32)


def sfx_fire_extinguish():
    """Hissing whoosh when wind snuffs the fire."""
    dur = 0.9
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(77)
    noise = rng.normal(0, 0.3, n)
    sos = scipy.signal.butter(4, [1500, 8000], btype="bandpass", fs=SR, output="sos")
    hiss = scipy.signal.sosfilt(sos, noise) * np.exp(-t / 0.18)
    whoosh = np.sin(2 * np.pi * 120 * (1 - t / dur) * t) * np.exp(-t / 0.25) * 0.5
    out = hiss + whoosh
    return (out / np.max(np.abs(out) + 1e-6) * 0.8).astype(np.float32)


def sfx_stone_wall():
    """Heavy masonry rocks tumbling and interlocking."""
    dur = 1.2
    n = int(dur * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(88)
    for _ in range(8):
        pos = rng.integers(0, int(0.9 * n))
        hit_dur = 0.18
        t = np.linspace(0, hit_dur, int(hit_dur * SR))
        freq = rng.uniform(80, 220)
        thud = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.03)
        crack = rng.normal(0, 0.2, len(t)) * np.exp(-t / 0.01)
        hit = (thud + crack) * rng.uniform(0.4, 0.9)
        out[pos:pos + len(hit)] += hit
    return (out / np.max(np.abs(out) + 1e-6) * 0.85).astype(np.float32)


def sfx_trench_dig():
    """Chiseling / scraping drainage trench in rock floor."""
    dur = 1.4
    n = int(dur * SR)
    rng = np.random.default_rng(99)
    noise = rng.normal(0, 0.2, n)
    sos = scipy.signal.butter(3, [600, 3500], btype="bandpass", fs=SR, output="sos")
    scrape = scipy.signal.sosfilt(sos, noise)
    env = 0.5 + 0.5 * np.sin(2 * np.pi * 6 * np.linspace(0, dur, n))
    out = scrape * env
    return (out / np.max(np.abs(out) + 1e-6) * 0.75).astype(np.float32)


def sfx_stick_door():
    """Rustic branch door creaking shut and latching."""
    dur = 0.8
    t = np.linspace(0, dur, int(dur * SR))
    # Wood creak
    creak_freq = 350 + 150 * np.sin(2 * np.pi * 8 * t)
    creak = np.sin(2 * np.pi * creak_freq * t) * (1 - t / dur) * 0.4
    # Solid latch clunk at end
    clunk_idx = int(0.55 * dur * SR)
    clunk_t = np.linspace(0, 0.2, int(0.2 * SR))
    clunk = (np.sin(2 * np.pi * 95 * clunk_t) * np.exp(-clunk_t / 0.03) +
             np.sin(2 * np.pi * 210 * clunk_t) * np.exp(-clunk_t / 0.02) * 0.6)
    out = np.zeros(len(t))
    out[:len(creak)] += creak
    out[clunk_idx:clunk_idx + len(clunk)] += clunk * 1.5
    return (out / np.max(np.abs(out) + 1e-6) * 0.85).astype(np.float32)


def sfx_bat_flutter():
    """Cute cartoon bat squeak and wing flutter."""
    dur = 0.6
    t = np.linspace(0, dur, int(dur * SR))
    # High frequency chirp
    chirp = np.sin(2 * np.pi * (3200 + 1200 * np.sin(2 * np.pi * 35 * t)) * t) * np.exp(-t / 0.12) * 0.5
    # Rapid wing flap impulses
    flaps = np.zeros(len(t))
    for f in range(5):
        idx = int((0.15 + f * 0.08) * SR)
        fl = np.sin(2 * np.pi * 90 * np.linspace(0, 0.04, int(0.04 * SR))) * 0.4
        flaps[idx:idx + len(fl)] += fl
    out = chirp + flaps
    return (out / np.max(np.abs(out) + 1e-6) * 0.75).astype(np.float32)


EXTRA_SFX = {
    "rain_loop": sfx_rain_loop,
    "water_drip": sfx_water_drip,
    "wind_gust": sfx_wind_gust,
    "fire_extinguish": sfx_fire_extinguish,
    "stone_wall": sfx_stone_wall,
    "trench_dig": sfx_trench_dig,
    "stick_door": sfx_stick_door,
    "bat_flutter": sfx_bat_flutter,
}


def build_sfx():
    print(f"Building sound effects in {SFX_DIR}...")
    builders = {**da.SFX_BUILDERS, **ba.EXTRA, **EXTRA_SFX}
    for name, fn in builders.items():
        out_wav = SFX_DIR / f"{name}.wav"
        data = fn()
        da.write_wav(out_wav, data)
    print(f"Generated {len(builders)} sound effects.")


def build_score():
    """Generates series background score loop normalized to -27 LUFS."""
    looped = TMP / "score_loop.wav"
    src = ROOT / "public" / "episodes" / "dungeon-trap" / "score.mp3"
    cues_file = DATA / "narrationCues.json"
    if cues_file.exists():
        cues_data = json.loads(cues_file.read_text())
        dur_sec = max(80, int(cues_data["durationFrames"] / FPS) + 8)
    else:
        dur_sec = 110

    da.run(
        [
            "ffmpeg", "-y", "-hide_banner",
            "-i", str(src), "-i", str(src), "-i", str(src),
            "-filter_complex", f"[0:a][1:a][2:a]concat=n=3:v=0:a=1,atrim=0:{dur_sec}",
            str(looped),
        ]
    )
    EP.mkdir(parents=True, exist_ok=True)
    out_mp3 = EP / f"score_v{VERSION}.mp3"
    da.loudnorm(looped, out_mp3, -27, tp=-6)
    print(f"{out_mp3.name} -> {da.measure_lufs(out_mp3):.1f} LUFS")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode in ("all", "narration"):
        build_narration()
    if mode in ("all", "sfx"):
        build_sfx()
    if mode in ("all", "score"):
        build_score()
    print("All audio stems ready.")
