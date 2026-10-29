"""Builds the audio stems for Lighthouse with the series' custom Gemini voice
(same pipeline as cave-home / rolling-boulder: gemini-3.8-flash-tts, word
timestamps from gemini-3.5-transcribe, per-line cache in out/audio-tmp-<slug>/gemini).

  python scripts/lighthouse-audio.py                  # everything
  python scripts/lighthouse-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

Outputs:
  public/shelter/lighthouse/narration_vN.mp3
  public/shelter/lighthouse/score_vN.mp3
  public/shelter/lighthouse/sfx/*.wav
  src/shelter/lighthouse/data/wordTimestamps.json
  src/shelter/lighthouse/data/narrationCues.json
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

SLUG = "lighthouse"
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
ca = _load("cave_audio", "cave-home-audio.py")

SR = da.SR
FPS = 30
LEAD_IN = 0.45


# ---------------------------------------------------------------------------
# Script: "How a candle becomes a lighthouse", same So-you / But rhythm as the
# bunker. One line per beat group. Pauses are seconds after the line.
# ---------------------------------------------------------------------------

LINES = [
    ("l1a", "To keep ships off the rocks at night, a candle won't do. So you light a big fire on the beach.", 0.30),
    ("l1b", "But a fire on the sand can't be seen from far away, and a ship sails straight onto the rocks.", 1.00),
    ("l2a", "So you build a tall stone tower, and put the fire on top.", 0.30),
    ("l2b", "Now ships can see it for miles. But up there, the wind blows the flame right out.", 0.90),
    ("l3a", "So you seal the flame inside a room made of glass. This is the lantern room.", 0.90),
    ("l3b", "But a bare flame shines everywhere. Most of the light goes up into the sky, or down into the ground.", 0.90),
    ("l4a", "So you put curved mirrors behind it, to bounce that light back out to sea.", 0.30),
    ("l4b", "Then you swap the mirrors for a Fresnel lens. Rings of glass bend all the light into one bright beam.", 0.90),
    ("l5a", "But every lighthouse on the coast now looks the same, and captains can't tell which one they're seeing.", 0.90),
    ("l5b", "So you make the lens turn, with its own flash pattern. Two quick flashes every ten seconds.", 0.30),
    ("l5c", "Captains look it up on their charts, and know exactly where they are.", 0.90),
    ("l6a", "Then the fog rolls in, and no light can get through it.", 0.30),
    ("l6b", "So you add a horn that blasts every thirty seconds. This is a foghorn.", 1.00),
    ("end", "Congratulations. Your little candle is now a lighthouse.", 1.60),
]


# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
WORD_FIXES = {
    "l5b": [(["10"], "ten")],
    "l6b": [(["30"], "thirty"), (["fog", "horn"], "foghorn")],
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

def sfx_foghorn(dur=2.6):
    """Two-tone diaphone: a low reedy blast with a grunt at the end."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.where(t < dur - 0.45, 92.0, 70.0)
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = sum(np.sin(k * phase) / k ** 0.8 for k in range(1, 12))
    env = np.minimum(1, t / 0.12) * np.minimum(1, (dur - t) / 0.3)
    sos = scipy.signal.butter(2, 1400, btype="lowpass", fs=SR, output="sos")
    out = scipy.signal.sosfilt(sos, tone * env)
    return (out / np.max(np.abs(out) + 1e-6) * 0.9).astype(np.float32)


def sfx_waves(dur=6.0):
    """Surf bed: low-passed noise swelling like waves on a beach."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(3)
    sos = scipy.signal.butter(3, [120, 1800], btype="bandpass", fs=SR, output="sos")
    surf = scipy.signal.sosfilt(sos, rng.normal(0, 0.4, n))
    swell = 0.35 + 0.65 * np.sin(np.pi * ((t / 3.0) % 1)) ** 2
    return (surf * swell / np.max(np.abs(surf * swell) + 1e-6) * 0.7).astype(np.float32)


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


def sfx_splash(dur=1.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(23)
    sos = scipy.signal.butter(3, [300, 6000], btype="bandpass", fs=SR, output="sos")
    body = scipy.signal.sosfilt(sos, rng.normal(0, 1, n)) * np.minimum(1, t / 0.01) * np.exp(-t / 0.25)
    plop = np.sin(2 * np.pi * (180 + 300 * np.exp(-t / 0.04)) * t) * np.exp(-t / 0.08) * 0.6
    out = body + plop
    return (out / np.max(np.abs(out) + 1e-6) * 0.85).astype(np.float32)


def sfx_glass(dur=1.2):
    """Glass panes set into a frame: bright clinks with a ring."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k, (at, f) in enumerate([(0.0, 2400), (0.08, 3100), (0.17, 2750)]):
        i = int(at * SR)
        tt = t[: n - i]
        out[i:] += (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.7 * tt)) * np.exp(-tt / 0.18) * (1 - 0.2 * k)
    return (out / np.max(np.abs(out) + 1e-6) * 0.7).astype(np.float32)


def sfx_hum(dur=2.0):
    """Bright electric-ish swell for the beam forming."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 220 * t) + 0.5 * np.sin(2 * np.pi * 330 * t) + 0.3 * np.sin(2 * np.pi * 660 * t)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.5)
    out = tone * env
    return (out / np.max(np.abs(out) + 1e-6) * 0.6).astype(np.float32)


EXTRA_SFX = {
    "foghorn": sfx_foghorn,
    "waves": sfx_waves,
    "crunch": sfx_crunch,
    "splash": sfx_splash,
    "glass": sfx_glass,
    "hum": sfx_hum,
    "wind_gust": ca.sfx_wind_gust,
    "fire_extinguish": ca.sfx_fire_extinguish,
    "stone_wall": ca.sfx_stone_wall,
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
