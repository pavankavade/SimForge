"""Builds the audio stems for Tornado Shelter with the series' custom Gemini voice
(same pipeline as cave-home / rolling-boulder: gemini-3.8-flash-tts, word
timestamps from gemini-3.5-transcribe, per-line cache in out/audio-tmp-<slug>/gemini).

  python scripts/tornado-shelter-audio.py                  # everything
  python scripts/tornado-shelter-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

Outputs:
  public/shelter/tornado-shelter/narration_vN.mp3
  public/shelter/tornado-shelter/score_vN.mp3
  public/shelter/tornado-shelter/sfx/*.wav
  src/shelter/tornado-shelter/data/wordTimestamps.json
  src/shelter/tornado-shelter/data/narrationCues.json
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

SLUG = "tornado-shelter"
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
# Script: "How a closet becomes a tornado shelter" (docs/shelter/tornado-shelter-script.md),
# the bunker's So-you / But rhythm. One line per beat group. Pauses are seconds after the line.
# ---------------------------------------------------------------------------

LINES = [
    ("l1a", "When the tornado siren goes off, you hide in your bedroom closet.", 0.30),
    ("l1b", "But the closet is on an outside wall. The wind tears the wall away, and you go with it.", 0.90),
    ("l2a", "So you pick a room in the middle of the house, on the lowest floor, with no windows.", 0.30),
    ("l2b", "The walls stay up. But a board flies through the drywall like a spear.", 0.90),
    ("l3a", "Most tornado injuries come from flying debris, not from the wind.", 0.30),
    ("l3b", "So you line the walls with two layers of plywood and a sheet of steel.", 0.30),
    ("l3c", "Engineers test it by firing a fifteen pound board at a hundred miles an hour. It bounces off.", 1.00),
    ("l4a", "Then the wind gets under the ceiling, and lifts the whole room off the floor.", 0.90),
    ("l4b", "You might think you should open a window to let the pressure out. Don't. That only lets the wind in to push from below.", 0.90),
    ("l4c", "So you bolt the walls into the concrete floor, with steel anchors all the way around.", 0.30),
    ("l5a", "Now the weakest part is the door. A normal door blows right in.", 0.90),
    ("l5b", "So you hang a steel door, with three hinges and three locks.", 0.30),
    ("l5c", "And the air vents get steel covers, so nothing can fly in through them.", 0.90),
    ("l6a", "The worst of the storm passes in under a minute. The house is gone. Your room is still standing.", 1.00),
    ("l6b", "Add a flashlight, bottled water, helmets for everyone, and a weather radio.", 0.30),
    ("end", "Congratulations. You have built a tornado shelter.", 1.60),
]


# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
WORD_FIXES = {
    "l3c": [(["tested"], "test it"), (["15"], "fifteen"), (["100"], "a hundred")],
    "l4c": [(["you", "bought"], "So you bolt")],
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

def sfx_crunch(dur=1.4):
    """Wooden hull on rock: a splintering crack over a deep thump."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(17)
    thump = np.sin(2 * np.pi * (70 - 30 * t) * t) * np.exp(-t / 0.18)
    crackle = np.zeros(n)
    for _ in range(40):
        pos = int(rng.uniform(0, 0.5) * SR)
        ln = int(rng.uniform(0.004, 0.02) * SR)
        crackle[pos:pos + ln] += rng.normal(0, 1, ln) * np.exp(-np.arange(ln) / (ln / 3)) * rng.uniform(0.3, 1)
    sos = scipy.signal.butter(2, [400, 5000], btype="bandpass", fs=SR, output="sos")
    out = thump * 1.2 + scipy.signal.sosfilt(sos, crackle) * 0.8
    return (out / np.max(np.abs(out) + 1e-6) * 0.9).astype(np.float32)


def sfx_siren(dur=4.0):
    """A civil-defence siren: a slow rise and fall with a little warble."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 420 + 380 * (0.5 - 0.5 * np.cos(2 * np.pi * t / dur * 1.0)) + 6 * np.sin(2 * np.pi * 5 * t)
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) + 0.35 * np.sin(2 * phase) + 0.15 * np.sin(3 * phase)
    out = tone * np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.6)
    return (out / np.max(np.abs(out) + 1e-6) * 0.7).astype(np.float32)


def sfx_wind(dur=6.0):
    """Storm wind: band-passed noise with slow gusts and a whistle on top (loopable-ish)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(5)
    noise = rng.normal(0, 1, n)
    sos = scipy.signal.butter(2, [150, 1800], btype="bandpass", fs=SR, output="sos")
    body = scipy.signal.sosfilt(sos, noise)
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.33 * t) * np.sin(2 * np.pi * 0.17 * t + 1)
    sos2 = scipy.signal.butter(2, [900, 1300], btype="bandpass", fs=SR, output="sos")
    whistle = scipy.signal.sosfilt(sos2, noise) * 2.5 * np.clip(gust - 0.5, 0, 1)
    out = (body + whistle) * gust * np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5)
    return (out / np.max(np.abs(out) + 1e-6) * 0.8).astype(np.float32)


def sfx_roar(dur=5.0):
    """The tornado itself: a freight-train rumble, deep noise with a slow throb."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(9)
    sos = scipy.signal.butter(3, [35, 420], btype="bandpass", fs=SR, output="sos")
    body = scipy.signal.sosfilt(sos, rng.normal(0, 1, n))
    throb = 0.7 + 0.3 * np.sin(2 * np.pi * 1.6 * t)
    out = body * throb * np.minimum(1, t / 0.8) * np.minimum(1, (dur - t) / 0.8)
    return (out / np.max(np.abs(out) + 1e-6) * 0.9).astype(np.float32)


def sfx_drill(dur=0.7):
    """An impact drill biting into concrete: a buzzy motor with hammer clicks."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(13)
    motor = np.sign(np.sin(2 * np.pi * 160 * t)) * 0.3
    hammer = (np.sin(2 * np.pi * 38 * t) > 0.7) * rng.normal(0, 1, n) * 0.8
    sos = scipy.signal.butter(2, [120, 4000], btype="bandpass", fs=SR, output="sos")
    out = scipy.signal.sosfilt(sos, motor + hammer) * np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.08)
    return (out / np.max(np.abs(out) + 1e-6) * 0.8).astype(np.float32)


def sfx_splinter(dur=0.9):
    """A board punching through drywall: a sharp crack and a papery crunch."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(29)
    crack = rng.normal(0, 1, n) * np.exp(-t / 0.03)
    crunch = np.zeros(n)
    for _ in range(30):
        pos = int(rng.uniform(0, 0.35) * SR)
        ln = int(rng.uniform(0.003, 0.015) * SR)
        crunch[pos:pos + ln] += rng.normal(0, 1, ln) * np.exp(-np.arange(ln) / (ln / 3)) * rng.uniform(0.2, 0.8)
    thud = np.sin(2 * np.pi * (90 - 40 * t) * t) * np.exp(-t / 0.12)
    sos = scipy.signal.butter(2, [300, 7000], btype="bandpass", fs=SR, output="sos")
    out = scipy.signal.sosfilt(sos, crack + crunch) + thud * 0.9
    return (out / np.max(np.abs(out) + 1e-6) * 0.9).astype(np.float32)


EXTRA_SFX = {
    "siren": sfx_siren,
    "wind": sfx_wind,
    "roar": sfx_roar,
    "drill": sfx_drill,
    "splinter": sfx_splinter,
    "crunch": sfx_crunch,
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
