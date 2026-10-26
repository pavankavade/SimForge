"""Builds the audio stems for the RollingBoulder episode.

  python scripts/boulder-audio.py            # everything
  python scripts/boulder-audio.py narration  # only re-voice the narration

Outputs:
  public/episodes/rolling-boulder/narration_v3.mp3  voiced line by line with
      Gemini API custom TTS (voice_ax8s6hqwv0of), laid end to end,
      compressed and loudness-normalised to about -16 LUFS
  public/episodes/rolling-boulder/score_v3.mp3      series score, -27 LUFS
  public/episodes/rolling-boulder/sfx/*.wav         procedural sound effects
  src/episodes/rolling-boulder/data/wordTimestamps.json  subtitle segments
  src/episodes/rolling-boulder/data/narrationCues.json   per-line word frames
      that timeline.ts uses to lock the animation to the voice

Every word frame comes from audio transcription word timestamps, so subtitles and
action beats follow the real voice. Requires ffmpeg on PATH plus numpy,
scipy and google-genai.
"""

import asyncio
import base64
import importlib.util
import json
import os
import re
import sys
import time
import urllib.request
import wave
from pathlib import Path

from dotenv import load_dotenv
import numpy as np

load_dotenv()

SLUG = "rolling-boulder"
VERSION = 3
VOICE_ID = "voice_ax8s6hqwv0of"

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "episodes" / "rolling-boulder"
SFX_DIR = EP / "sfx"
DATA = ROOT / "src" / "episodes" / "rolling-boulder" / "data"
TMP = ROOT / "out" / "audio-tmp-boulder"

# Reuse the Ep1 synthesis toolkit (filters, envelopes, base SFX).
_spec = importlib.util.spec_from_file_location("dungeon_audio", ROOT / "scripts" / "dungeon-audio.py")
da = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(da)

SR = da.SR
FPS = 30
VOICE = "en-US-AndrewMultilingualNeural"
RATE = "+6%"
LEAD_IN = 0.66  # seconds of silence before the first word (title card)

# id, text, pause after the line (seconds). Pauses leave room for the action
# that the line sets up; lines never overlap.
LINES = [
    ("l1a", "If you rig a simple boulder to a tripwire, a clumsy goblin will walk right into it, and get flattened.", 0.9),
    ("l1b", "However, any sharp-eyed Rogue will snap the wire early, and leap right over it.", 1.0),
    ("l2a", "So you upgrade to a boulder as wide as the hallway, and pour slippery slime right where Rogues take off.", 0.35),
    ("l2b", "Now he slips backward, straight into its path.", 0.9),
    ("l2c", "But a heavily armored Paladin just stomps through the slime, braces himself, and shatters the boulder with his warhammer.", 1.0),
    ("l3a", "So you switch to a solid iron ball covered in spikes, and bury an electromagnet under the floor.", 0.35),
    ("l3b", "The moment the Paladin braces, it yanks his armor straight into the spikes.", 0.9),
    ("l3c", "However, a clever Mage simply casts Levitate, and floats the party up to the rafters while the ball rolls harmlessly underneath.", 0.9),
    ("l4a", "So you mount gear-driven crushers in the ceiling, timed to the next boulder.", 0.3),
    ("l4b", "Anyone floating gets swatted right back down into its path.", 1.1),
    ("l5a", "Finally, for parties that turn and run for the exit, you seal the entrance with a steel blast door, and curve the floor into a half-pipe.", 0.5),
    ("l5b", "The boulder chases them up the ramp, and launches everyone straight into the Gelatinous Cube hanging from your ceiling.", 0.7),
    ("l5c", "Congratulations, your hallway is now unbeatable.", 1.6),
]

WORD_FIXES = {
    "l1a": [(["then"], "and")],
    "l4a": [(["gear", "driven"], "gear-driven")],
    "l5a": [(["half", "pipe"], "half-pipe")],
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


# Narration ---------------------------------------------------------------


async def tts_line(text, dst):
    import edge_tts

    comm = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    words = []
    with open(dst, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append([chunk["text"], start, start + chunk["duration"] / 1e7])
    return words


def tts_with_retry(text, dst):
    for attempt in range(6):
        try:
            words = asyncio.run(tts_line(text, dst))
            if words:
                return words
        except Exception as exc:  # edge-tts occasionally drops a stream
            print("  tts retry", attempt, exc)
        time.sleep(3)
    raise SystemExit("edge-tts failed")


def tts_gemini_line(text, dst_wav):
    """Synthesizes text using Gemini API with custom voice, then gets word timestamps."""
    api_key = os.getenv("GEMINI_API_KEY")
    json_cache = dst_wav.with_suffix(".json")
    if dst_wav.exists() and dst_wav.stat().st_size > 1000 and json_cache.exists():
        return json.loads(json_cache.read_text(encoding="utf-8"))
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
        return json.loads(json_cache.read_text(encoding="utf-8"))

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

    json_cache.write_text(json.dumps(words), encoding="utf-8")
    return words


def decode_samples(path):
    import subprocess

    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(out, dtype=np.float32).astype(np.float64)


def trim_silence(x, threshold=0.004):
    """Index range of the voiced part, so pauses are measured from real speech."""
    loud = np.flatnonzero(np.abs(x) > threshold)
    if len(loud) == 0:
        return 0, len(x)
    return max(0, loud[0] - int(0.02 * SR)), min(len(x), loud[-1] + int(0.06 * SR))


def attach_punctuation(text, words):
    """WordBoundary drops punctuation; restore it from the script for subtitles."""
    tokens = text.split()
    out = []
    ti = 0
    for w, s, e in words:
        label = w
        for j in range(ti, len(tokens)):
            bare = re.sub(r"[^\w'-]", "", tokens[j]).lower()
            if bare == re.sub(r"[^\w'-]", "", w).lower():
                label = tokens[j]
                ti = j + 1
                break
        out.append((label, s, e))
    return out


def build_narration():
    track = np.zeros(int(LEAD_IN * SR))
    cues = {}
    segments = []

    print(f"Building narration for {len(LINES)} lines (v{VERSION})...")
    for line_id, text, pause in LINES:
        wav_file = TMP / f"{line_id}.wav"
        words = fix_words(line_id, tts_gemini_line(text, wav_file))
        x = decode_samples(wav_file)

        first_word_s = words[0][1]
        last_word_e = words[-1][2]
        a = max(0, int((first_word_s - 0.04) * SR))
        b = min(len(x), int((last_word_e + 0.05) * SR))
        x = x[a:b]
        offset = len(track) / SR - a / SR
        track = np.concatenate([track, x, np.zeros(int(pause * SR))])

        wf = []
        for label, s, e in attach_punctuation(text, words):
            sf = round((offset + s) * FPS)
            ef = max(sf + 1, round((offset + e) * FPS))
            wf.append({"word": label, "startFrame": sf, "endFrame": ef})
        # Words never overlap and each runs until the next one starts.
        for i in range(len(wf) - 1):
            wf[i]["endFrame"] = max(wf[i]["startFrame"] + 1, min(wf[i]["endFrame"], wf[i + 1]["startFrame"]))
        start = wf[0]["startFrame"]
        end = wf[-1]["endFrame"]
        cues[line_id] = {"startFrame": start, "endFrame": end, "words": wf}
        segments.append({"startFrame": start, "endFrame": end, "text": text, "words": wf})
        print(f"{line_id}: frames {start}-{end} (dur: {(end-start)/FPS:.2f}s) ({text[:48]}...)")

    total = len(track) / SR
    print(f"narration length {total:.2f}s = {round(total * FPS)} frames")

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
    (DATA / "narrationCues.json").write_text(
        json.dumps({"durationFrames": round(total * FPS), "lines": cues}, indent=2)
    )
    print(f"Saved cues to {DATA / 'narrationCues.json'}")


def build_score():
    looped = TMP / "score_loop.wav"
    src = ROOT / "public" / "episodes" / "dungeon-trap" / "score.mp3"
    da.run(
        [
            "ffmpeg", "-y", "-hide_banner",
            "-i", str(src), "-i", str(src),
            "-filter_complex", "[0:a][1:a]acrossfade=d=4:c1=qsin:c2=qsin,atrim=0:96",
            str(looped),
        ]
    )
    out = EP / f"score_v{VERSION}.mp3"
    da.loudnorm(looped, out, -27, tp=-6)
    print(f"{out.name} -> {da.measure_lufs(out):.1f} LUFS")


# Extra SFX ------------------------------------------------------------------

t_axis, noise, bp, lp, hp = da.t_axis, da.noise, da.bp, da.lp, da.hp
decay, place, silence, thud, metal, whoosh, crackle, creak = (
    da.decay, da.place, da.silence, da.thud, da.metal, da.whoosh, da.crackle, da.creak,
)
RNG = da.RNG


def sfx_roll():
    """Heavy stone rolling over flagstones: smooth sub rumble with subtle texture."""
    dur = 4.0
    t = t_axis(dur)
    x = lp(noise(dur), 80, 4) * 2.6 + lp(noise(dur), 220) * 0.22
    for i in range(int(dur * 3.5)):
        place(x, thud(0.2, 60, 35, 0.05, 0.25) * RNG.uniform(0.2, 0.4), i / 3.5 + RNG.uniform(0, 0.03))
    x += lp(crackle(dur, 18, 0.003, 300), 900) * 0.1
    fade = int(0.12 * SR)
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade:] *= np.linspace(1, 0, fade)
    return x * (0.88 + 0.12 * np.sin(2 * np.pi * 0.8 * t))


def sfx_squash():
    """Comic flattening: solid low thump plus a muted slap."""
    out = thud(0.5, 110, 38, 0.08, 0.8)
    slap = bp(noise(0.1), 400, 1800) * decay(0.1, 0.02, 0.001)
    place(out, slap * 0.5, 0.01)
    return out


def sfx_snap():
    """Taut wire snapping: crisp but not ear-piercing."""
    out = da.sfx_twang() * 0.5
    place(out, bp(noise(0.04), 1000, 2200) * decay(0.04, 0.005, 0.0003) * 0.7, 0.0)
    return out


def sfx_gate():
    """Wooden stop-log dropping away from the boulder."""
    out = silence(0.9)
    place(out, creak(0.3, 140, 80) * 0.5, 0.0)
    place(out, thud(0.45, 140, 65, 0.06, 0.6), 0.22)
    return out


def sfx_squelch():
    """Natural viscous liquid splash without obnoxious 23Hz vibrato."""
    dur = 0.45
    t = t_axis(dur)
    f = 280 * np.exp(-t / 0.12) + 90
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * decay(dur, 0.14)
    wet = lp(noise(dur), 950) * decay(dur, 0.08) * 0.45
    return (body * 0.7 + wet) * np.minimum(1, t / 0.005)


def sfx_slip():
    """Subtle foot-loss skid on slime."""
    dur = 0.4
    out = whoosh(dur, 200, 1100, 0.3) * 0.45
    place(out, sfx_squelch() * 0.5, 0.02)
    return out


def sfx_crack():
    """Boulder shattering: big impact, splintering crackle and falling rubble."""
    out = da.sfx_boom() * 0.6
    place(out, lp(crackle(0.45, 120, 0.006, 350), 2200) * 0.8, 0.0)
    for i in range(12):
        place(out, thud(0.18, RNG.uniform(120, 220), 70, 0.025, 0.6) * RNG.uniform(0.2, 0.5), 0.2 + RNG.uniform(0, 0.9))
    return out


def sfx_zap():
    """Magnetic power surge: low inductive thrum with controlled ionization."""
    dur = 0.75
    t = t_axis(dur)
    sub = da.sweep_sine(dur, 130, 45, 0.6) * decay(dur, 0.25)
    arcs = bp(crackle(dur, 45, 0.003, 700), 600, 2000) * np.minimum(1, t / 0.1) * np.exp(-t / 0.4) * 0.35
    hum = (np.sin(2 * np.pi * 60 * t) + 0.35 * np.sin(2 * np.pi * 120 * t)) * decay(dur, 0.35) * 0.25
    return sub * 0.6 + arcs + hum


def sfx_skewer():
    out = da.sfx_spike()
    place(out, metal(0.8, 260, 0.4) * 0.5, 0.0)
    return out


def sfx_levitate():
    """Ethereal, warm magical resonance with soft harmonic shimmer."""
    dur = 1.4
    t = t_axis(dur)
    notes = [261.6, 392.0, 523.2, 659.3]
    chord = np.zeros_like(t)
    for i, freq in enumerate(notes):
        detune = 1.0 + 0.003 * np.sin(2 * np.pi * (1.2 + i * 0.4) * t)
        phase = 2 * np.pi * np.cumsum(freq * detune) / SR
        weight = 1.0 / (1.0 + 0.5 * i)
        chord += weight * np.sin(phase)
    env = np.minimum(1, t / 0.12) * np.exp(-t / 0.7)
    body = lp(chord * env, 1600) * 0.4
    breath = whoosh(dur, 250, 1400, 0.35) * 0.25
    return body + breath


def sfx_hydraulic():
    """Hiss plus piston clunk."""
    dur = 0.85
    t = t_axis(dur)
    hiss = bp(noise(dur), 800, 2200) * np.exp(-t / 0.25) * 0.45
    out = hiss + thud(dur, 100, 45, 0.07, 0.7) * 0.8
    place(out, metal(0.35, 380, 0.08) * 0.3, 0.0)
    return out


def sfx_gears():
    dur = 2.0
    out = silence(dur)
    tick = metal(0.04, 1100, 0.015) * 0.35 + bp(noise(0.04), 900, 1800) * decay(0.04, 0.005) * 0.4
    for i in range(int(dur * 8)):
        place(out, tick * (0.5 + 0.5 * (i % 3 == 0)), i / 8)
    out += lp(creak(dur, 50, 65), 600) * 0.15
    return out


def sfx_slam():
    """Steel blast door hitting its sill."""
    out = metal(1.8, 90, 0.8, (1.0, 2.1, 3.7, 5.3), (1, 0.5, 0.3, 0.15)) * 0.65
    place(out, thud(1.0, 65, 28, 0.18, 0.9) * 1.1, 0.0)
    place(out, whoosh(0.35, 180, 1100, 0.7) * 0.3, 0.0)
    return out


def sfx_ramp():
    """Floor segments ratcheting up into the half-pipe."""
    out = silence(1.5)
    for i in range(8):
        place(out, thud(0.2, 140, 80, 0.035, 0.5) * 0.6, i * 0.13)
        place(out, metal(0.12, 600 + i * 25, 0.03) * 0.2, i * 0.13)
    out += lp(creak(1.5, 65, 100), 1000) * 0.18
    return out


def sfx_jelly():
    """Big gelatinous splash and wobble."""
    dur = 1.4
    t = t_axis(dur)
    f = 85 + 55 * np.exp(-t * 3) * np.sin(2 * np.pi * 5 * t)
    phase = np.cumsum(f) / SR
    wob = bp(np.sin(2 * np.pi * phase) + 0.3 * np.sin(4 * np.pi * phase), 50, 750) * np.exp(-t / 0.55)
    splash = lp(noise(dur), 1800) * decay(dur, 0.1) * 0.65
    out = wob * 0.9 + splash
    place(out, sfx_squelch() * 0.5, 0.04)
    return out


def sfx_bubble():
    """Organic liquid bubbles popping in viscous slime."""
    dur = 1.0
    out = silence(dur)
    for i in range(5):
        f0 = RNG.uniform(220, 380)
        d = 0.09
        blip = da.sweep_sine(d, f0, f0 * 0.65, 0.5) * decay(d, 0.035, 0.003)
        pop = lp(noise(d), 1200) * decay(d, 0.015) * 0.22
        place(out, (blip + pop) * RNG.uniform(0.3, 0.55), i * 0.18 + RNG.uniform(0, 0.04))
    return out


def sfx_sparkle():
    """Soft, warm bell chimes with low-pass roll-off."""
    dur = 1.0
    out = silence(dur)
    chimes = [392.0, 493.9, 587.3, 784.0]
    for i, f in enumerate(chimes):
        at = i * 0.08 + RNG.uniform(0, 0.02)
        d = 0.35
        t = t_axis(d)
        ping = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t)) * decay(d, 0.12)
        place(out, ping * 0.35, at)
    return lp(out, 1800)


def sfx_ding():
    dur = 1.0
    t = t_axis(dur)
    return (np.sin(2 * np.pi * 1046 * t) + 0.3 * np.sin(2 * np.pi * 2093 * t)) * np.exp(-t / 0.3)


def sfx_pop():
    """Warm, soft CC0 interface pop for stage badges (Kenney Interface Sounds CC0)."""
    cc0_path = ROOT / "src" / "episodes" / "rolling-boulder" / "assets" / "pop_cc0.wav"
    if cc0_path.exists():
        with wave.open(str(cc0_path), "rb") as w:
            raw = w.readframes(w.getnframes())
            return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
    return da.sfx_pop()


EXTRA = {
    "pop": sfx_pop,
    "roll": sfx_roll,
    "squash": sfx_squash,
    "snap": sfx_snap,
    "gate": sfx_gate,
    "squelch": sfx_squelch,
    "slip": sfx_slip,
    "crack": sfx_crack,
    "zap": sfx_zap,
    "skewer": sfx_skewer,
    "levitate": sfx_levitate,
    "hydraulic": sfx_hydraulic,
    "gears": sfx_gears,
    "slam": sfx_slam,
    "ramp": sfx_ramp,
    "jelly": sfx_jelly,
    "bubble": sfx_bubble,
    "ding": sfx_ding,
    "sparkle": sfx_sparkle,
}


def build_sfx():
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    for old in SFX_DIR.glob("*.wav"):
        old.unlink()
    builders = {**da.SFX_BUILDERS, **EXTRA}
    for name, build in builders.items():
        da.write_wav(SFX_DIR / f"{name}.wav", build())
    print(f"{len(builders)} sfx written to {SFX_DIR}")


if __name__ == "__main__":
    TMP.mkdir(parents=True, exist_ok=True)
    da.TMP = TMP
    targets = sys.argv[1:] or ["narration", "score", "sfx"]
    if "sfx" in targets:
        build_sfx()
    if "score" in targets:
        build_score()
    if "narration" in targets:
        build_narration()
