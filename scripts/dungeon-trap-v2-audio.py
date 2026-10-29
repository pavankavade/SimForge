"""Builds the audio stems for the DungeonTrapV2 episode: Ep1 remade from the
long-form campaign's Act I (the Entrance), as a 9:16 short.

  python scripts/dungeon-trap-v2-audio.py            # everything
  python scripts/dungeon-trap-v2-audio.py narration  # only re-voice the narration
  python scripts/dungeon-trap-v2-audio.py sfx        # only rebuild the sound effects

Outputs:
  public/episodes/dungeon-trap-v2/narration_vN.mp3  Gemini series voice, line by line,
      laid end to end (never overlapping), compressed, about -16 LUFS
  public/episodes/dungeon-trap-v2/score_vN.mp3      series score, about -34 LUFS
  public/episodes/dungeon-trap-v2/sfx/*.wav         procedural sound effects
  src/episodes/dungeon-trap-v2/data/wordTimestamps.json  subtitle segments
  src/episodes/dungeon-trap-v2/data/narrationCues.json   per-line word frames that
      timeline.ts uses (via w()/lineStart()) to lock the action to the voice

After re-voicing ANY line: bump VERSION, update config.ts audio/music src to
the new _vN files, re-run, then re-check every beat with
`node scripts/review.mjs DungeonTrapV2 --beats`.

Requires ffmpeg on PATH plus numpy and scipy.
"""

import importlib.util
import json
import re
import shutil
import sys
from pathlib import Path

import numpy as np

SLUG = "dungeon-trap-v2"
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
# + extra SFX, Ep4 Gemini TTS. Import, never copy.
da = _load("dungeon_audio", "dungeon-audio.py")
ba = _load("boulder_audio", "boulder-audio.py")
dt = _load("dart_trap_audio", "dart-trap-audio.py")  # Gemini series voice (loads .env)

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
    # Act I of the long-form campaign (docs/dungeon-campaign-script.md, e1a-e5a), re-cut as a short.
    ("l1a", "It starts small. A simple spike pit at the front door, and the Guild's first recruit, a low-level goblin, walks right in.", 0.9),
    ("l1b", "The Guild sends a Rogue next. She spots the gap, and leaps right over it.", 0.5),
    ("l2a", "So you cover the pit with a hinged false floor, and hang a glowing chest just out of reach. She jumps for it, and lands on the hidden pressure plate.", 0.9),
    ("l2b", "Word gets back. Their Mage arrives and freezes the trapdoor solid.", 0.4),
    ("l3a", "So you run copper pipes along the walls, fed by a pressurized oil tank, and the ice becomes a frying pan.", 0.9),
    ("l3b", "Then comes the Paladin, pushing through the flames behind a tower shield.", 0.4),
    ("l4a", "So you hang a gear-driven pendulum blade, timed to sweep the exact spot where a shield-bearer has to stand.", 0.9),
    ("l5a", "The last party refuses to take a single step. So you put a counterweight catapult under the whole entrance, and the moment they huddle to plan, the floor throws them down the chute, straight into your pet Mimic.", 1.1),
    ("end", "Congratulations, your dungeon is now unbeatable.", 0.35),
    ("cta", "Unless you can prove us wrong in the comments.", 1.6),
]

# The lines are voiced already: the campaign (Act I) and the other shorts cached them in the
# series voice. Seed this episode's cache from theirs so nothing is re-synthesised.
SEED = {
    **{f"l{k[1:]}": ("dungeon-campaign", k) for k in ["e1a", "e1b", "e2a", "e2b", "e3a", "e3b", "e4a", "e5a"]},
    "end": ("dart-trap", "end"),
    "cta": ("mimic-vault", "cta"),
}

# Transcriber spellings -> script spellings (multi-word tokens are re-split evenly).
WORD_FIXES = {
    "l1a": [(["low", "level"], "low-level")],
    "l4a": [(["gear", "driven"], "gear-driven"), (["shield", "bearer"], "shield-bearer")],
}


def seed_cache():
    for line_id, (slug, src_id) in SEED.items():
        for ext in (".wav", ".json"):
            src = ROOT / "out" / f"audio-tmp-{slug}" / f"{src_id}{ext}"
            dst = TMP / f"{line_id}{ext}"
            if src.exists() and not dst.exists():
                shutil.copyfile(src, dst)


def fix_words(line_id, text, words):
    dt.WORD_FIXES = WORD_FIXES
    words = dt.fix_words(line_id, words)
    # Once the counts agree, the script is the truth for every label; only timings come from audio.
    tokens = text.split()
    if len(words) == len(tokens):
        words = [[re.sub(r"[^\w'-]", "", tok), s, e] for tok, (_, s, e) in zip(tokens, words)]
    else:
        print(f"  ! {line_id}: {len(words)} words vs {len(tokens)} in the script; labels left as transcribed")
    return words


# Narration ---------------------------------------------------------------


def build_narration():
    seed_cache()
    track = np.zeros(int(LEAD_IN * SR))
    cues = {}
    segments = []
    for line_id, text, pause in LINES:
        wav_file = TMP / f"{line_id}.wav"
        words = fix_words(line_id, text, dt.tts_gemini_line(text, wav_file))
        x = ba.decode_samples(wav_file)
        # Tight trim to the spoken words, so pauses measure from actual speech.
        a = max(0, int((words[0][1] - 0.04) * SR))
        b = min(len(x), int((words[-1][2] + 0.05) * SR))
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
    # Series theme (public/music/series-theme.mp3), looped past the narration
    # and normalised so it sits under the voice at config volume 1. Mix here,
    # not with config volumes.
    cues = json.loads((DATA / "narrationCues.json").read_text())
    da.series_score(EP / f"score_v{VERSION}.mp3", cues["durationFrames"] / FPS + 4, TMP)


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


# The stamp's crack-and-crumble comes from the Season 2 shorts.
mv = _load("mimic_vault_audio", "mimic-vault-audio.py")

EXTRA = {
    "crumble": mv.sfx_crumble,
}


def build_sfx():
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    for old in SFX_DIR.glob("*.wav"):
        old.unlink()
    builders = {**da.SFX_BUILDERS, **ba.EXTRA, **EXTRA}
    for name, build in builders.items():
        da.write_wav(SFX_DIR / f"{name}.wav", build())
    # Ep1's picked AI takes (spikes, trapdoor, pendulum, ...) replace the procedural ones,
    # so the short sounds exactly like Act I of the campaign.
    ai = sorted((ROOT / "public" / "episodes" / "dungeon-trap" / "sfx_ai").glob("*.wav"))
    for wav in ai:
        shutil.copyfile(wav, SFX_DIR / wav.name)
    print(f"{len(builders)} sfx written to {SFX_DIR} ({len(ai)} replaced by Ep1 AI takes)")


if __name__ == "__main__":
    TMP.mkdir(parents=True, exist_ok=True)
    EP.mkdir(parents=True, exist_ok=True)
    da.TMP = TMP
    targets = sys.argv[1:] or ["narration", "score", "sfx"]
    if "sfx" in targets:
        build_sfx()
    # Narration first: the score is cut to the narration's length.
    if "narration" in targets:
        build_narration()
    if "score" in targets:
        build_score()
