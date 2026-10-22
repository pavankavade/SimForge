"""Builds the audio stems for the RollingBoulder episode.

  python scripts/boulder-audio.py            # everything
  python scripts/boulder-audio.py narration  # only re-voice the narration

Outputs:
  public/episodes/rolling-boulder/narration_v2.mp3  voiced line by line with
      edge-tts, laid end to end (never overlapping), compressed and
      loudness-normalised to about -16 LUFS
  public/episodes/rolling-boulder/score_v2.mp3      series score, -27 LUFS
  public/episodes/rolling-boulder/sfx/*.wav         procedural sound effects
  src/episodes/rolling-boulder/data/wordTimestamps.json  subtitle segments
  src/episodes/rolling-boulder/data/narrationCues.json   per-line word frames
      that timeline.ts uses to lock the animation to the voice

Every word frame comes from edge-tts WordBoundary events, so subtitles and
action beats follow the real voice. Requires ffmpeg on PATH plus numpy,
scipy and edge-tts.
"""

import asyncio
import importlib.util
import json
import re
import sys
import time
from pathlib import Path

import numpy as np

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
    for line_id, text, pause in LINES:
        mp3 = TMP / f"{line_id}.mp3"
        words = tts_with_retry(text, mp3)
        x = decode_samples(mp3)
        a, b = trim_silence(x)
        x = x[a:b]
        offset = len(track) / SR - a / SR
        track = np.concatenate([track, x, np.zeros(int(pause * SR))])

        labelled = attach_punctuation(text, words)
        wf = []
        for label, s, e in labelled:
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
        print(f"{line_id}: frames {start}-{end}  ({text[:48]}...)")

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
    da.loudnorm(comp, EP / "narration_v2.mp3", -16, tp=-1.5)
    print("narration_v2.mp3", da.measure_lufs(EP / "narration_v2.mp3"), "LUFS")

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "wordTimestamps.json").write_text(json.dumps(segments, indent=2))
    (DATA / "narrationCues.json").write_text(
        json.dumps({"durationFrames": round(total * FPS), "lines": cues}, indent=2)
    )


def build_score():
    # Same series theme as Ep1, re-normalised so it sits under the voice at
    # volume 1 (do not turn it down in config instead).
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
    da.loudnorm(looped, EP / "score_v2.mp3", -27, tp=-6)
    print("score_v2.mp3", da.measure_lufs(EP / "score_v2.mp3"), "LUFS")


# Extra SFX ------------------------------------------------------------------

t_axis, noise, bp, lp, hp = da.t_axis, da.noise, da.bp, da.lp, da.hp
decay, place, silence, thud, metal, whoosh, crackle, creak = (
    da.decay, da.place, da.silence, da.thud, da.metal, da.whoosh, da.crackle, da.creak,
)
RNG = da.RNG


def sfx_roll():
    """Heavy stone rolling over flagstones: sub rumble with per-turn thumps."""
    dur = 4.0
    t = t_axis(dur)
    x = lp(noise(dur), 90, 4) * 3.2 + lp(noise(dur), 320) * 0.35
    for i in range(int(dur * 4.2)):
        place(x, thud(0.22, 70, 40, 0.06, 0.4) * RNG.uniform(0.3, 0.6), i / 4.2 + RNG.uniform(0, 0.04))
    x += crackle(dur, 30, 0.006, 500) * 0.25
    fade = int(0.1 * SR)
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade:] *= np.linspace(1, 0, fade)
    return x * (0.85 + 0.15 * np.sin(2 * np.pi * 0.9 * t))


def sfx_squash():
    """Comic flattening: thump plus a wet slap."""
    out = thud(0.6, 120, 40, 0.09, 1.0)
    slap = hp(noise(0.12), 600) * decay(0.12, 0.02, 0.001)
    place(out, slap * 0.8, 0.01)
    place(out, lp(noise(0.25), 800) * decay(0.25, 0.05) * 0.5, 0.03)
    return out


def sfx_snap():
    """Taut wire snapping."""
    out = da.sfx_twang() * 0.7
    place(out, hp(noise(0.05), 2500) * decay(0.05, 0.006, 0.0003) * 1.2, 0.0)
    return out


def sfx_gate():
    """Wooden stop-log dropping away from the boulder."""
    out = silence(0.9)
    place(out, creak(0.3, 140, 80) * 0.6, 0.0)
    place(out, thud(0.5, 150, 70, 0.07, 0.7), 0.22)
    return out


def sfx_squelch():
    dur = 0.7
    t = t_axis(dur)
    f = 180 + 260 * np.sin(np.pi * t / dur)
    phase = np.cumsum(f) / SR
    body = bp(np.sin(2 * np.pi * phase) * (1 + 0.6 * np.sin(2 * np.pi * 23 * t)), 120, 1400)
    x = body * np.sin(np.pi * t / dur) ** 0.6 + lp(noise(dur), 1200) * decay(dur, 0.12) * 0.4
    return x


def sfx_slip():
    out = whoosh(0.5, 600, 3200, 0.35) * 0.8
    place(out, sfx_squelch() * 0.7, 0.0)
    return out


def sfx_crack():
    """Boulder shattering: big impact, splintering crackle and falling rubble."""
    out = da.sfx_boom() * 0.7
    place(out, crackle(0.5, 160, 0.008, 400) * 1.2, 0.0)
    for i in range(16):
        place(out, thud(0.2, RNG.uniform(140, 260), 80, 0.03, 0.8) * RNG.uniform(0.2, 0.6), 0.25 + RNG.uniform(0, 1.1))
    return out


def sfx_zap():
    """Electromagnet energising: rising mains hum plus arcing crackle."""
    dur = 1.6
    t = t_axis(dur)
    hum = sum(np.sin(2 * np.pi * f * t) / k for k, f in enumerate((60, 120, 180, 240), start=1))
    hum = hum * np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.2)
    arcs = crackle(dur, 90, 0.002, 2500) * np.minimum(1, t / 0.6)
    return hum * 0.6 + arcs * 0.7


def sfx_skewer():
    out = da.sfx_spike()
    place(out, metal(0.8, 260, 0.4) * 0.5, 0.0)
    return out


def sfx_levitate():
    dur = 1.6
    t = t_axis(dur)
    x = sum(np.sin(2 * np.pi * f * t * (1 + 0.5 * t / dur)) for f in (330, 495, 660, 990))
    x = x * np.minimum(1, t / 0.3) * np.exp(-t / 0.9) * 0.25
    return x + whoosh(dur, 300, 2400, 0.4) * 0.5


def sfx_hydraulic():
    """Hiss plus piston clunk."""
    dur = 1.0
    t = t_axis(dur)
    hiss = hp(noise(dur), 2500) * np.exp(-t / 0.3) * 0.6
    out = hiss + thud(dur, 110, 50, 0.08, 0.8) * 0.9
    place(out, metal(0.4, 420, 0.1) * 0.4, 0.0)
    return out


def sfx_gears():
    dur = 2.0
    out = silence(dur)
    tick = metal(0.05, 1300, 0.02) * 0.5 + hp(noise(0.05), 1500) * decay(0.05, 0.006) * 0.6
    for i in range(int(dur * 9)):
        place(out, tick * (0.5 + 0.5 * (i % 3 == 0)), i / 9)
    out += lp(creak(dur, 50, 65), 700) * 0.2
    return out


def sfx_slam():
    """Steel blast door hitting its sill."""
    out = metal(2.0, 95, 1.0, (1.0, 2.1, 3.7, 5.3), (1, 0.6, 0.35, 0.2)) * 0.7
    place(out, thud(1.2, 70, 30, 0.2, 1.0) * 1.3, 0.0)
    place(out, whoosh(0.4, 200, 1400, 0.8) * 0.4, 0.0)
    return out


def sfx_ramp():
    """Floor segments ratcheting up into the half-pipe."""
    out = silence(1.6)
    for i in range(8):
        place(out, thud(0.25, 160, 90, 0.04, 0.6) * 0.7, i * 0.13)
        place(out, metal(0.15, 700 + i * 30, 0.04) * 0.25, i * 0.13)
    out += lp(creak(1.6, 70, 110), 1200) * 0.25
    return out


def sfx_jelly():
    """Big gelatinous splash and wobble."""
    dur = 1.6
    t = t_axis(dur)
    f = 90 + 70 * np.exp(-t * 3) * np.sin(2 * np.pi * 6 * t)
    phase = np.cumsum(f) / SR
    wob = bp(np.sin(2 * np.pi * phase) + 0.4 * np.sin(4 * np.pi * phase), 60, 900) * np.exp(-t / 0.6)
    splash = lp(noise(dur), 2200) * decay(dur, 0.12) * 0.9
    out = wob * 1.2 + splash
    place(out, sfx_squelch() * 0.6, 0.05)
    return out


def sfx_bubble():
    out = silence(1.2)
    for i in range(7):
        f0 = RNG.uniform(500, 900)
        d = 0.08
        blip = np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f0 * 1.8, int(d * SR))) / SR) * decay(d, 0.03)
        place(out, blip * RNG.uniform(0.3, 0.7), i * 0.15 + RNG.uniform(0, 0.05))
    return out


def sfx_ding():
    dur = 1.2
    t = t_axis(dur)
    return (np.sin(2 * np.pi * 1320 * t) + 0.4 * np.sin(2 * np.pi * 2640 * t)) * np.exp(-t / 0.35)


EXTRA = {
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
