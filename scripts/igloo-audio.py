"""Builds the audio stems for the Igloo lab film with the series' custom Gemini voice
(same pipeline as cave-home / rolling-boulder: gemini-3.8-flash-tts, word
timestamps from gemini-3.5-transcribe, per-line cache in out/audio-tmp-<slug>/gemini).

  python scripts/igloo-audio.py                  # everything
  python scripts/igloo-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

Outputs:
  public/shelter/igloo/narration_vN.mp3
  public/shelter/igloo/score_vN.mp3
  public/shelter/igloo/sfx/*.wav
  labs/igloo/src/data/wordTimestamps.json
  labs/igloo/src/data/narrationCues.json
"""

import base64
import importlib.util
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
import scipy.signal
from dotenv import load_dotenv

load_dotenv()

SLUG = "igloo"
VERSION = 1
VOICE_ID = "voice_ax8s6hqwv0of"

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "shelter" / SLUG
SFX_DIR = EP / "sfx"
DATA = ROOT / "labs" / "igloo" / "src" / "data"  # the lab imports its cues from here
TMP = ROOT / "out" / f"audio-tmp-{SLUG}"

EP.mkdir(parents=True, exist_ok=True)
SFX_DIR.mkdir(parents=True, exist_ok=True)
DATA.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)
VOICE_TMP = TMP / "gemini"
VOICE_TMP.mkdir(parents=True, exist_ok=True)


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


da = _load("dungeon_audio", "dungeon-audio.py")
ba = _load("boulder_audio", "boulder-audio.py")

SR = da.SR
FPS = 30
LEAD_IN = 0.45


# ---------------------------------------------------------------------------
# Script: "How a snow pile becomes an igloo" (docs/shelter/igloo-script.md), the shelter
# series' So-you / But rhythm. One line per beat group. Pauses are seconds after the line.
# ---------------------------------------------------------------------------

LINES = [
    ("l1a", "When a blizzard hits, you pile up fresh snow and dig a cave inside it.", 0.30),
    ("l1b", "But fresh powder is mostly air. The roof sags, and caves in on you.", 0.90),
    ("l2a", "So you cut blocks from hard, wind-packed snow, and stack them in rings like bricks.", 0.30),
    ("l2b", "The walls go up fine. But flat rings can't close at the top, and the roof falls in.", 0.90),
    ("l3a", "So you lay the blocks in one rising spiral, each one leaning on the one before.", 0.30),
    ("l3b", "The spiral holds itself up, and one last key block locks the dome shut.", 1.00),
    ("l4a", "But the door is at floor level, and the wind blows straight across the floor.", 0.90),
    ("l4b", "So you dig the entrance as a tunnel, lower than the floor. Cold air sinks into it and stays there.", 0.30),
    ("l4c", "And you raise the sleeping platform, up where the warm air collects.", 0.90),
    ("l5a", "It's still cold. You might think a campfire would help. Don't. It melts the roof and fills the dome with smoke.", 0.90),
    ("l5b", "Instead you light one small oil lamp. It melts the inside of the walls, and they freeze into a glaze of ice.", 0.30),
    ("l5c", "The glaze seals out the wind, and a small hole at the top lets fresh air in.", 0.90),
    ("l6a", "Outside, it's forty below. Inside, with just your body heat and the lamp, it stays above freezing.", 1.00),
    ("l6b", "Add caribou furs to sleep on, and one more block to seal the tunnel.", 0.30),
    ("end", "Congratulations. You have built an igloo.", 1.60),
]

# Transcriber slips to undo after voicing (filled in once the lines are voiced).
WORD_FIXES = {
    "l6a": [(["40"], "forty")],
}


def speech_onset(x, threshold=0.02):
    """Seconds to the first audible sample (20 ms RMS): the transcriber can miss a short first word."""
    win = int(0.02 * SR)
    for i in range(0, max(0, len(x) - win), win // 2):
        if np.sqrt(np.mean(x[i:i + win] ** 2)) > threshold:
            return i / SR
    return 0.0


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
                step = (e - s) / len(parts)
                out[i:i + n] = [[p, s + k * step, s + (k + 1) * step] for k, p in enumerate(parts)]
                break
        else:
            raise ValueError(f"{line_id}: word fix {old} not found")
    return out


def tts_gemini_line(text, dst_wav):
    """Voices one line with the custom Gemini voice, then word timestamps (both cached)."""
    api_key = os.getenv("GEMINI_API_KEY")
    json_cache = dst_wav.with_suffix(".json")
    if dst_wav.exists() and dst_wav.stat().st_size > 1000 and json_cache.exists():
        return json.loads(json_cache.read_text())
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set and this line is not cached yet.")

    if dst_wav.exists() and dst_wav.stat().st_size > 1000:
        audio_bytes = dst_wav.read_bytes()
    else:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": f"## Transcript:\n{text}\n"}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"voice": VOICE_ID}},
            },
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req) as resp:
                    res = json.loads(resp.read().decode())
                audio_bytes = base64.b64decode(res["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
                dst_wav.write_bytes(audio_bytes)
                break
            except Exception as e:
                if attempt == 3:
                    raise
                print(f"TTS retry {attempt + 1}: {e}")
                time.sleep(2)

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    words = []
    try:
        t_resp = client.models.generate_content(
            model="gemini-3.5-transcribe",
            contents=[types.Part.from_bytes(data=audio_bytes, mime_type="audio/wav")],
            config=types.GenerateContentConfig(audio_transcription_config=types.AudioTranscriptionConfig(word_timestamp=True)),
        )
        t_part = t_resp.candidates[0].content.parts[0]
        if getattr(t_part, "audio_transcription", None) and t_part.audio_transcription.words:
            for w in t_part.audio_transcription.words:
                words.append([w.word, float(w.start_offset.rstrip("s")), float(w.end_offset.rstrip("s"))])
    except Exception as e:
        print(f"Warning: transcription fallback for line: {e}")

    if not words:
        tokens = text.split()
        total_sec = len(audio_bytes) / (24000 * 2)
        w_dur = total_sec / max(1, len(tokens))
        words = [[t, i * w_dur, (i + 1) * w_dur] for i, t in enumerate(tokens)]

    json_cache.write_text(json.dumps(words))
    return words


def build_narration():
    track = np.zeros(int(LEAD_IN * SR))
    cues = {}
    segments = []

    print(f"Voicing {len(LINES)} lines with the Gemini voice {VOICE_ID}...")
    for line_id, text, pause in LINES:
        wav_file = VOICE_TMP / f"{line_id}.wav"
        words = fix_words(line_id, tts_gemini_line(text, wav_file))
        x = ba.decode_samples(wav_file)

        first_word_s = min(words[0][1], speech_onset(x))
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
        print(f"{line_id}: frames {start}-{end} ({(end - start) / FPS:.2f}s)  {text[:46]}...")

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
    da.run([
        "ffmpeg", "-y", "-hide_banner", "-i", str(raw),
        "-af", "highpass=f=70,acompressor=threshold=-24dB:ratio=2.5:attack=8:release=120:makeup=3dB",
        str(comp),
    ])
    out_mp3 = EP / f"narration_v{VERSION}.mp3"
    da.loudnorm(comp, out_mp3, -16.0)
    print(f"Narration written: {out_mp3} ({meta['durationSeconds']}s, {meta['durationFrames']} frames)")


# ---------------------------------------------------------------------------
# Extra sound effects
# ---------------------------------------------------------------------------

def _noise(n, seed, lo, hi, order=2):
    rng = np.random.default_rng(seed)
    sos = scipy.signal.butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos")
    return scipy.signal.sosfilt(sos, rng.normal(0, 1, n))


def _norm(x, peak=0.9):
    return (x / np.max(np.abs(x) + 1e-6) * peak).astype(np.float32)


def sfx_wind(dur=6.0):
    """Blizzard wind: band-passed noise with slow gusts and a thin whistle on top (loopable-ish)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = _noise(n, 5, 150, 1800)
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.33 * t) * np.sin(2 * np.pi * 0.17 * t + 1)
    whistle = _noise(n, 6, 900, 1300) * 2.5 * np.clip(gust - 0.5, 0, 1)
    out = (body + whistle) * gust * np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5)
    return _norm(out, 0.8)


def sfx_shovel(dur=0.5):
    """A shovel biting into powder and tossing it: a soft crunch and a hiss."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    crunch = _noise(n, 31, 600, 6000) * np.exp(-t / 0.06)
    hiss = _noise(n, 32, 2000, 9000) * np.exp(-((t - 0.25) / 0.08) ** 2) * 0.6
    return _norm(crunch + hiss, 0.8)


def sfx_crunch(dur=0.35):
    """A footstep / block set down on hard snow: a short squeaky crunch."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(41)
    grains = np.zeros(n)
    for _ in range(60):
        pos = int(rng.uniform(0, 0.12) * SR)
        ln = int(rng.uniform(0.001, 0.006) * SR)
        grains[pos:pos + ln] += rng.normal(0, 1, ln) * rng.uniform(0.3, 1)
    sos = scipy.signal.butter(2, [800, 7000], btype="bandpass", fs=SR, output="sos")
    thump = np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.04) * 0.5
    return _norm(scipy.signal.sosfilt(sos, grains) + thump, 0.85)


def sfx_saw(dur=0.8):
    """A snow knife sawing a block out of a drift: two rasping strokes."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    stroke = np.clip(np.sin(2 * np.pi * 2.5 * t), 0, 1) ** 0.5
    rasp = _noise(n, 51, 1500, 8000) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 90 * t)))
    return _norm(rasp * stroke * np.minimum(1, (dur - t) / 0.05), 0.7)


def sfx_whump(dur=1.6):
    """A snow roof collapsing: a deep soft thud and a long powdery rush."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * (60 - 25 * t) * t) * np.exp(-t / 0.22)
    rush = _noise(n, 61, 300, 5000) * np.exp(-t / 0.45) * np.minimum(1, t / 0.03)
    return _norm(thud * 1.3 + rush * 0.7, 0.9)


def sfx_fire(dur=4.0):
    """A small campfire: a low roar with crackles (loopable-ish)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(71)
    roar = _noise(n, 72, 80, 900) * 0.4
    crackle = np.zeros(n)
    for _ in range(int(dur * 14)):
        pos = int(rng.uniform(0, dur - 0.02) * SR)
        ln = int(rng.uniform(0.002, 0.01) * SR)
        crackle[pos:pos + ln] += rng.normal(0, 1, ln) * rng.uniform(0.3, 1)
    sos = scipy.signal.butter(2, [1500, 8000], btype="bandpass", fs=SR, output="sos")
    out = roar + scipy.signal.sosfilt(sos, crackle) * 1.4
    return _norm(out * np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.3), 0.75)


def sfx_drip(dur=0.4):
    """One meltwater drip: a plink with a falling pitch."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 1400 * np.exp(-t / 0.05) + 700
    return _norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.06), 0.6)


def sfx_ignite(dur=0.9):
    """A match strike and a small flame catching: a scratch, then a soft whoomp."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    scratch = _noise(n, 81, 2500, 9000) * np.exp(-t / 0.05)
    whoomp = _noise(n, 82, 100, 700) * np.exp(-((t - 0.25) / 0.12) ** 2)
    return _norm(scratch * 0.8 + whoomp, 0.7)


def sfx_freeze(dur=1.2):
    """Ice glazing over: a rising crystalline shimmer with tiny cracks."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(91)
    shimmer = sum(np.sin(2 * np.pi * (2400 + 900 * k + 600 * t) * t + k) for k in range(4)) * 0.15
    ticks = np.zeros(n)
    for _ in range(25):
        pos = int(rng.uniform(0, dur - 0.01) * SR)
        ticks[pos:pos + 40] += rng.normal(0, 1, 40)
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.3)
    return _norm((shimmer + ticks * 0.3) * env, 0.6)


EXTRA_SFX = {
    "wind": sfx_wind,
    "shovel": sfx_shovel,
    "crunch": sfx_crunch,
    "saw": sfx_saw,
    "whump": sfx_whump,
    "fire": sfx_fire,
    "drip": sfx_drip,
    "ignite": sfx_ignite,
    "freeze": sfx_freeze,
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
    """The series theme, looped with crossfades under the voice (about -34 LUFS)."""
    cues = json.loads((DATA / "narrationCues.json").read_text())
    seconds = cues["durationFrames"] / FPS + 1
    da.series_score(EP / f"score_v{VERSION}.mp3", seconds, TMP)


if __name__ == "__main__":
    modes = set(sys.argv[1:]) or {"narration", "sfx", "score"}
    if "narration" in modes:
        build_narration()
    if "sfx" in modes:
        build_sfx()
    if "score" in modes:
        build_score()
    print("All audio stems ready.")
