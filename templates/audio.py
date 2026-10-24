"""Builds the audio stems for the __COMPOSITION_ID__ episode.

  python scripts/__SLUG__-audio.py            # everything
  python scripts/__SLUG__-audio.py narration  # only re-voice the narration
  python scripts/__SLUG__-audio.py sfx        # only rebuild the sound effects

Outputs:
  public/episodes/__SLUG__/narration_vN.mp3  voiced line by line with edge-tts,
      laid end to end (never overlapping), compressed, about -16 LUFS
  public/episodes/__SLUG__/score_vN.mp3      series score, about -27 LUFS
  public/episodes/__SLUG__/sfx/*.wav         procedural sound effects
  src/episodes/__SLUG__/data/wordTimestamps.json  subtitle segments
  src/episodes/__SLUG__/data/narrationCues.json   per-line word frames that
      timeline.ts uses (via w()/lineStart()) to lock the action to the voice

After re-voicing ANY line: bump VERSION, update config.ts audio/music src to
the new _vN files, re-run, then re-check every beat with
`node scripts/review.mjs __COMPOSITION_ID__ --beats`.

Requires ffmpeg on PATH plus numpy, scipy and edge-tts.
"""

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np

SLUG = "__SLUG__"
VERSION = 1

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "episodes" / SLUG
SFX_DIR = EP / "sfx"
DATA = ROOT / "src" / "episodes" / SLUG / "data"
TMP = ROOT / "out" / f"audio-tmp-{SLUG}"


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# Shared toolkits: Ep1 synthesis primitives + base SFX, Ep2 narration helpers
# + extra SFX. Import, never copy.
da = _load("dungeon_audio", "dungeon-audio.py")
ba = _load("boulder_audio", "boulder-audio.py")

SR = da.SR
FPS = 30
LEAD_IN = 0.66  # seconds of silence before the first word (title card)

# id, text, pause after the line (seconds).
#
# Rules:
#  - One line = one beat group. Ids are l<level><a|b|c>; timeline.ts refers to
#    them with w("l1a", "word").
#  - Every level: (a) INSTALL the trap, naming it; (b) a VICTIM is caught;
#    (c) a COUNTER class beats it. The next level is the designer's answer.
#  - Pauses leave room for the action that the line sets up (0.3 when the next
#    line continues the same action, ~0.9-1.1 after a punchline/death, 1.6 at
#    the very end for the stamp). Lines never overlap.
#  - Name the words you will key beats to plainly ("flattened", "leap") so
#    w() can find them. Avoid digits ("3") - write "three".
LINES = [
    ("l1a", "If you hang a simple crusher from the ceiling, a clumsy goblin will wander right underneath it, and get flattened.", 0.9),
    ("l1b", "However, a patient Rogue just waits for it to lift, and strolls straight through.", 1.0),
    # Levels 2-5 go here: the designer's answer, the next victim, the next counter.
    ("end", "Congratulations, your __THEME__ is now unbeatable.", 1.6),
]


# Narration ---------------------------------------------------------------


def build_narration():
    track = np.zeros(int(LEAD_IN * SR))
    cues = {}
    segments = []
    for line_id, text, pause in LINES:
        mp3 = TMP / f"{line_id}.mp3"
        words = ba.tts_with_retry(text, mp3)
        x = ba.decode_samples(mp3)
        a, b = ba.trim_silence(x)
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
    out = EP / f"narration_v{VERSION}.mp3"
    da.loudnorm(comp, out, -16, tp=-1.5)
    print(out.name, da.measure_lufs(out), "LUFS")

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "wordTimestamps.json").write_text(json.dumps(segments, indent=2))
    (DATA / "narrationCues.json").write_text(json.dumps({"durationFrames": round(total * FPS), "lines": cues}, indent=2))


def build_score():
    # Series theme (Ep1 score), looped to cover the episode and normalised so it
    # sits under the voice at config volume 1. Mix here, not with config volumes.
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
    print(out.name, da.measure_lufs(out), "LUFS")


# SFX -----------------------------------------------------------------------
#
# Available out of the box (sfx("<name>", frame, volume) in config.ts):
#   Ep1: whoosh whoosh_big thud spike click trap_open trap_close chain sparkle
#        ice sizzle clank clang ignite fire_loop ratchet twang launch rumble
#        growl chomp chew burp helmet stamp boom pop dust
#   Ep2: roll squash snap gate squelch slip crack zap skewer levitate hydraulic
#        gears slam ramp jelly bubble ding sparkle
# Add episode-specific sounds below, built from the da primitives
# (t_axis, noise, bp, lp, hp, decay, place, silence, thud, metal, whoosh,
# crackle, creak, sweep_sine). Keep them short, punchy and not ear-piercing.

t_axis, noise, bp, lp, hp = da.t_axis, da.noise, da.bp, da.lp, da.hp
decay, place, silence, thud, metal, whoosh = da.decay, da.place, da.silence, da.thud, da.metal, da.whoosh


def sfx_example_clunk():
    """Template example: heavy iron mechanism locking into place."""
    out = thud(0.5, 120, 50, 0.06, 0.7)
    place(out, metal(0.35, 420, 0.1) * 0.35, 0.0)
    return out


EXTRA = {
    "clunk": sfx_example_clunk,
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
    TMP.mkdir(parents=True, exist_ok=True)
    EP.mkdir(parents=True, exist_ok=True)
    da.TMP = TMP
    targets = sys.argv[1:] or ["narration", "score", "sfx"]
    if "sfx" in targets:
        build_sfx()
    if "score" in targets:
        build_score()
    if "narration" in targets:
        build_narration()
