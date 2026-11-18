"""Builds the audio stems for the Spy Horse lab film with the series' custom Gemini voice
(same pipeline as cave-home / rolling-boulder: gemini-3.8-flash-tts, word
timestamps from gemini-3.5-transcribe, per-line cache in out/audio-tmp-<slug>/gemini).

  python scripts/spy-horse-audio.py                  # everything
  python scripts/spy-horse-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

Outputs:
  public/shelter/spy-horse/narration_vN.mp3
  public/shelter/spy-horse/score_vN.mp3
  public/shelter/spy-horse/sfx/*.wav
  labs/spy-horse/src/data/wordTimestamps.json
  labs/spy-horse/src/data/narrationCues.json
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

SLUG = "spy-horse"
VERSION = 1
VOICE_ID = "voice_ax8s6hqwv0of"

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "shelter" / SLUG
SFX_DIR = EP / "sfx"
DATA = ROOT / "labs" / "spy-horse" / "src" / "data"  # the lab imports its cues from here
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
# Script: "How a dead horse becomes a WW1 spy post" (docs/shelter/spy-horse-script.md), the
# shelter series' So-you / But rhythm. One line per beat group. Pauses are seconds after the line.
# ---------------------------------------------------------------------------

LINES = [
    ("l1a", "On the front line, you need eyes on the enemy trench. So you crawl into no man's land and lie flat in the mud.", 0.30),
    ("l1b", "But out there, anything that moves gets shot. One twitch, and the sniper has you.", 0.90),
    ("l2a", "So you dig a shell hole deeper, and pile sandbags around the edge.", 0.30),
    ("l2b", "But the enemy maps every crater. A fresh sandbag wall by morning means a shell by lunch.", 0.90),
    ("l3a", "The only thing nobody looks at twice is a dead horse. There are hundreds of them out there.", 0.30),
    ("l3b", "So an artist crawls out at night, holds his nose, and sketches one, every fold and every shadow.", 0.30),
    ("l3c", "Behind the lines, they build a hollow copy out of papier-mache, and paint it to match.", 0.90),
    ("l4a", "You might think you'd just put it down next to the real one. Don't. Two horses where there was one, and they shell both.", 0.90),
    ("l4b", "So you swap them. Under the noise of the guns, the crew drags the real horse away into a trench.", 0.30),
    ("l4c", "And they lay the copy in the exact same spot, legs in the air, before dawn.", 0.90),
    ("l5a", "Inside there's just room for one man, lying on his belly, with a rifle.", 0.30),
    ("l5b", "He watches through a slit in the neck, and a telephone wire runs back to your trench.", 0.90),
    ("l6a", "At sunrise, the enemy sees the same dead horse they've ignored for a week.", 0.30),
    ("l6b", "And from inside it, you call in every move they make.", 1.00),
    ("end", "Congratulations. You have built a spy horse.", 1.60),
]

# Transcriber slips to undo after voicing (filled in once the lines are voiced).
WORD_FIXES = {
    "l2a": [(["shallow"], "shell")],
    "l3c": [(["of", "papier", "mâché", "and", "painted"], "out of papier-mache, and paint")],
    "l4a": [(["you", "just"], "you'd just")],
    "l5a": [(["this"], "there's")],
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
    """A low wind over the mud, slow gusts (loopable-ish)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = _noise(n, 5, 120, 1100)
    gust = 0.6 + 0.4 * np.sin(2 * np.pi * 0.21 * t) * np.sin(2 * np.pi * 0.13 * t + 1)
    out = body * gust * np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5)
    return _norm(out, 0.7)


def sfx_crunch(dur=0.35):
    """A sandbag dropped / a body flopping into mud: a wet, dull thump."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (90 - 40 * t) * t) * np.exp(-t / 0.05)
    grit = _noise(n, 41, 300, 3000) * np.exp(-t / 0.04) * 0.5
    return _norm(thump + grit, 0.85)


def sfx_shovel(dur=0.5):
    """A spade biting into wet earth and tossing it."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    bite = _noise(n, 31, 200, 3500) * np.exp(-t / 0.05)
    toss = _noise(n, 32, 400, 4000) * np.exp(-((t - 0.28) / 0.07) ** 2) * 0.5
    return _norm(bite + toss, 0.8)


def sfx_rifle(dur=1.4):
    """A distant rifle shot: a sharp crack, then a rolling echo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    crack = _noise(n, 101, 800, 9000) * np.exp(-t / 0.012)
    body = _noise(n, 102, 80, 900) * np.exp(-t / 0.18) * 0.6
    echo = _noise(n, 103, 100, 1500) * np.exp(-((t - 0.35) / 0.25) ** 2) * 0.25
    return _norm(crack + body + echo, 0.9)


def sfx_ricochet(dur=0.7):
    """A bullet pinging off a helmet: a bright falling whine."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 3600 * np.exp(-t / 0.35) + 900
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    tick = _noise(n, 111, 2000, 9000) * np.exp(-t / 0.006)
    return _norm(tone * 0.7 + tick, 0.8)


def sfx_artillery(dur=2.4):
    """A shell landing close: a heavy boom with debris rain."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (55 - 20 * t) * t) * np.exp(-t / 0.35)
    blast = _noise(n, 121, 60, 2500) * np.exp(-t / 0.25) * np.minimum(1, t / 0.004)
    rain = _noise(n, 122, 1500, 7000) * np.exp(-((t - 0.7) / 0.45) ** 2) * 0.25
    return _norm(boom * 1.4 + blast + rain, 0.95)


def sfx_guns(dur=8.0):
    """A barrage far off: overlapping low thumps under a rumble (loopable-ish bed)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(131)
    out = _noise(n, 132, 30, 220) * 0.5
    for _ in range(int(dur * 2.2)):
        at = rng.uniform(0, dur - 0.8)
        k = t - at
        m = k > 0
        out[m] += np.sin(2 * np.pi * (45 + rng.uniform(-8, 8)) * k[m]) * np.exp(-k[m] / 0.4) * rng.uniform(0.4, 1)
    sos = scipy.signal.butter(2, 400, btype="lowpass", fs=SR, output="sos")
    out = scipy.signal.sosfilt(sos, out)
    return _norm(out * np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.6), 0.8)


def sfx_flies(dur=4.0):
    """Flies buzzing round the carcass (loopable-ish)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(3):
        f = 190 + 25 * k + 18 * np.sin(2 * np.pi * (0.7 + 0.3 * k) * t + k)
        buzz = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
        out += buzz * (0.5 + 0.5 * np.sin(2 * np.pi * (0.4 + 0.2 * k) * t + 2 * k)) ** 2
    sos = scipy.signal.butter(2, [200, 2400], btype="bandpass", fs=SR, output="sos")
    return _norm(scipy.signal.sosfilt(sos, out) * np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.3), 0.5)


def sfx_saw(dur=0.8):
    """A wood saw: two rasping strokes."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    stroke = np.clip(np.sin(2 * np.pi * 2.5 * t), 0, 1) ** 0.5
    rasp = _noise(n, 51, 900, 6000) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 70 * t)))
    return _norm(rasp * stroke * np.minimum(1, (dur - t) / 0.05), 0.7)


def sfx_pencil(dur=1.2):
    """A pencil scratching on paper, quick strokes."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    strokes = np.clip(np.sin(2 * np.pi * 4.3 * t) * np.sin(2 * np.pi * 1.1 * t + 0.5), 0, 1)
    return _norm(_noise(n, 141, 2500, 9000) * strokes * np.minimum(1, (dur - t) / 0.05), 0.5)


def sfx_drag(dur=1.6):
    """Something heavy dragged through mud on a rope."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    pulls = 0.4 + 0.6 * np.clip(np.sin(2 * np.pi * 1.3 * t), 0, 1)
    slush = _noise(n, 151, 100, 1800) * pulls
    return _norm(slush * np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.2), 0.75)


def sfx_glint(dur=0.6):
    """A scope glint: a thin rising shimmer."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    tone = sum(np.sin(2 * np.pi * (3200 + 700 * k) * t + k) for k in range(3)) * np.exp(-((t - 0.15) / 0.1) ** 2)
    return _norm(tone, 0.4)


def sfx_ring(dur=1.0):
    """A field telephone's short crank ring."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    bell = np.sin(2 * np.pi * 1250 * t) * (np.sin(2 * np.pi * 22 * t) > 0) * (t < 0.7)
    return _norm(bell * np.exp(-t / 0.6), 0.5)


EXTRA_SFX = {
    "wind": sfx_wind,
    "crunch": sfx_crunch,
    "shovel": sfx_shovel,
    "rifle": sfx_rifle,
    "ricochet": sfx_ricochet,
    "artillery": sfx_artillery,
    "guns": sfx_guns,
    "flies": sfx_flies,
    "saw": sfx_saw,
    "pencil": sfx_pencil,
    "drag": sfx_drag,
    "glint": sfx_glint,
    "ring": sfx_ring,
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
