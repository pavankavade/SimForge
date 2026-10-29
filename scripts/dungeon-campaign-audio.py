"""Builds the audio stems for the DungeonCampaign long-form video (16:9).

  python scripts/dungeon-campaign-audio.py            # everything
  python scripts/dungeon-campaign-audio.py narration  # only re-voice the narration
  python scripts/dungeon-campaign-audio.py score      # only rebuild the score
  python scripts/dungeon-campaign-audio.py sfx        # only rebuild the bridge sound effects

Outputs:
  public/episodes/dungeon-campaign/narration_vN.mp3  Gemini TTS (series voice), line by line,
      laid end to end, compressed, about -16 LUFS
  public/episodes/dungeon-campaign/score_vN.mp3      series score looped to length, about -27 LUFS
  public/episodes/dungeon-campaign/sfx/*.wav         bridge / campaign-only sound effects
  src/episodes/dungeon-campaign/data/wordTimestamps.json  subtitle segments
  src/episodes/dungeon-campaign/data/narrationCues.json   per-line word frames (global frames;
      each act slices its own lines with sliceCues)

The acts reuse their source episodes' sfx folders (sfxFor("rolling-boulder") etc.), so only the
bridge sounds are built here. The script text lives in docs/dungeon-campaign-script.md.

After re-voicing ANY line: bump VERSION, update the campaign config audio/music src to the new _vN
files, re-run, then re-review every act.
"""

import importlib.util
import json
import re
import shutil
import sys
from pathlib import Path

import numpy as np

SLUG = "dungeon-campaign"
VERSION = 3

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


# Shared toolkits: Ep1 primitives, Ep2 narration helpers, Ep4 Gemini TTS (loads .env).
da = _load("dungeon_audio", "dungeon-audio.py")
ba = _load("boulder_audio", "boulder-audio.py")
dt = _load("dart_trap_audio", "dart-trap-audio.py")

SR = da.SR
FPS = 30
LEAD_IN = 1.0

# id, text, pause after the line (seconds).
# Ids: c0 cold open, e Entrance, h Hallway, v Vault, g Gallery, b1-b3 bridges, f finale.
# The last line of each act pauses ~2.2 s for the pull-out; the last bridge line ~2.4 s for the
# push-in and the chapter card.
LINES = [
    # Cold open
    ("c0a", "Somewhere above you, the Adventurers' Guild just nailed a bounty to the wall. Your name is on it.", 0.5),
    ("c0b", "Four rooms stand between them and your throne. And every party they lose teaches the next one something.", 0.6),
    ("c0c", "So every time they learn, you build something worse.", 2.4),
    # Act I - The Entrance
    ("e1a", "It starts small. A simple spike pit at the front door, and the Guild's first recruit, a low-level goblin, walks right in.", 0.9),
    ("e1b", "The Guild sends a Rogue next. She spots the gap, and leaps right over it.", 0.5),
    ("e2a", "So you cover the pit with a hinged false floor, and hang a glowing chest just out of reach. She jumps for it, and lands on the hidden pressure plate.", 0.9),
    ("e2b", "Word gets back. Their Mage arrives and freezes the trapdoor solid.", 0.4),
    ("e3a", "So you run copper pipes along the walls, fed by a pressurized oil tank, and the ice becomes a frying pan.", 0.9),
    ("e3b", "Then comes the Paladin, pushing through the flames behind a tower shield.", 0.4),
    ("e4a", "So you hang a gear-driven pendulum blade, timed to sweep the exact spot where a shield-bearer has to stand.", 0.9),
    ("e5a", "The last party refuses to take a single step. So you put a counterweight catapult under the whole entrance, and the moment they huddle to plan, the floor throws them down the chute, straight into your pet Mimic.", 2.2),
    # Bridge 1
    ("b1a", "Down at the bottom, the Mimic burps. Up at the Guild, the reward doubles.", 0.4),
    ("b1b", "And the survivors' report has one word underlined. Hallway.", 2.4),
    # Act II - The Hallway
    ("h1a", "So the hallway gets a boulder on a tripwire. A goblin scout trips it, and gets flattened.", 0.9),
    ("h1b", "The Guild's next Rogue is sharper. She snaps the wire early, and leaps right over.", 0.5),
    ("h2a", "So you widen the boulder to fill the hall, and pour slime right where Rogues take off. She slips backward, straight into its path.", 0.9),
    ("h2b", "Their Paladin stomps through the slime, braces, and shatters the boulder with a warhammer.", 0.4),
    ("h3a", "So you roll out an iron ball covered in spikes, and bury an electromagnet under the floor. The moment he braces, it yanks his armor into the spikes.", 0.9),
    ("h3b", "Their Mage casts Levitate, and floats the party up to the rafters.", 0.3),
    ("h4a", "So you mount gear-driven crushers in the ceiling. Anyone floating gets swatted right back down.", 1.0),
    ("h5a", "The last party turns and runs. You seal the exit with a blast door, curve the floor into a half-pipe, and the boulder chases them up the ramp, and launches them into the chute.", 2.2),
    # Bridge 2
    ("b2a", "The Mimic is getting round. The Guild is getting desperate.", 0.4),
    ("b2b", "Their new plan: skip the hallways, go straight for the treasure.", 2.4),
    # Act III - The Vault
    ("v1a", "So you put the gold on a pedestal, wired to two sliding stone walls. A greedy goblin grabs the coin, and gets pressed into a pancake.", 0.9),
    ("v1b", "Their Rogue parkours up the stone and out the ceiling vent.", 0.4),
    ("v2a", "So the stone becomes grease-coated steel, and the vent gets a spring-loaded boot. Even if he climbs the grease, the ceiling punts him back down.", 0.9),
    ("v2b", "Their Paladin doesn't climb. He wedges a steel beam between the walls, and stands there smugly.", 0.4),
    ("v3a", "So you electrify the plates. The moment his beam touches both sides, it completes the circuit, and the presses fold him into a neat little cube.", 0.9),
    ("v3b", "Their Mage just teleports through the wall.", 0.3),
    ("v4a", "So you line the room with deflection mirrors, and his spell bounces between the walls like a game of Pong, until there is nowhere left to bounce.", 1.0),
    ("v5a", "The last party won't even enter. They poke the floor from the doorway with a ten-foot pole. So you put the whole room on rails, and it lunges into the hallway, swallows them whole, and blasts them up the chute.", 2.2),
    # Bridge 3
    ("b3a", "The Mimic can no longer close its lid.", 0.6),
    ("b3b", "The Guild sends its last full party, and this time, they're carrying shields, wind spells, and a barricade.", 2.4),
    # Act IV - The Gallery
    ("g1a", "So the gallery walls get dart slits and pressure plates. Their goblin porter steps on a trigger, and becomes a pin-cushion.", 0.9),
    ("g1b", "Their Rogue Matrix-dodges the whole volley, with swagger.", 0.4),
    ("g2a", "So you give the darts heat-seeking bat wings. They make a screeching U-turn, and swarm him from behind.", 0.9),
    ("g2b", "Their Paladin raises his tower shield, and every dart bounces off like rain.", 0.4),
    ("g3a", "So you wheel out a pneumatic ballista. The harpoon punches clean through his shield, and the winch reels him into the wall.", 0.9),
    ("g3b", "Their Mage spins up a cyclone to deflect every projectile.", 0.3),
    ("g4a", "So you build an arcane coilgun. The slug punches through his vortex, and blasts him out of his boots.", 1.0),
    ("g5a", "The last of them push a wooden barricade down the hall. Rotary turrets shred it to splinters, and twin rams launch the whole party down the chute.", 2.2),
    # Finale
    ("fa", "At the Guild, the bounty board is empty. No goblins. No Rogues. No Mages. No Paladins left to send.", 0.6),
    ("fb", "At the bottom of your dungeon, the Mimic has eaten so well it is outgrowing its chest.", 0.8),
    ("fc", "So you go back to the drawing board, and dig a second floor, with five new doors.", 1.0),
    ("fd", "Upstairs, the Guild has stopped sending parties. They have hired a barbarian.", 1.8),
]

# Transcriber spellings -> script spellings (multi-word tokens are re-split evenly).
WORD_FIXES = {
    "e1a": [(["low", "level"], "low-level")],
    "e4a": [(["gear", "driven"], "gear-driven"), (["shield", "bearer"], "shield-bearer")],
    "h4a": [(["gear", "driven"], "gear-driven")],
    "h5a": [(["half", "pipe"], "half-pipe")],
    "v2a": [(["grease", "coated"], "grease-coated"), (["spring", "loaded"], "spring-loaded")],
    "v5a": [(["10-foot"], "ten-foot"), (["ten", "foot"], "ten-foot")],
    "g1a": [(["pincushion"], "pin-cushion"), (["pin", "cushion"], "pin-cushion")],
    "g5a": [(["shredded"], "shred it")],
    "g1b": [(["matrix", "dodges"], "Matrix-dodges")],
    "g2a": [(["heat", "seeking"], "heat-seeking"), (["u", "turn"], "U-turn"), (["batwings"], "bat wings")],
    "g3b": [(["maid"], "Mage")],
    "g4a": [(["coil", "gun"], "coilgun")],
}


def fix_words(line_id, text, words):
    dt.WORD_FIXES = WORD_FIXES
    words = dt.fix_words(line_id, words)
    # Once the counts agree, the script is the truth for every label
    # ("the" -> "their", "shoot" -> "chute"); only the timings come from audio.
    tokens = text.split()
    if len(words) == len(tokens):
        words = [[re.sub(r"[^\w'-]", "", tok), s, e] for tok, (_, s, e) in zip(tokens, words)]
    else:
        print(f"  ! {line_id}: {len(words)} words vs {len(tokens)} in the script; labels left as transcribed")
    return words


def build_narration():
    track = np.zeros(int(LEAD_IN * SR))
    cues = {}
    segments = []

    print(f"Building narration for {len(LINES)} lines (v{VERSION})...")
    for line_id, text, pause in LINES:
        wav_file = TMP / f"{line_id}.wav"
        words = fix_words(line_id, text, dt.tts_gemini_line(text, wav_file))
        x = ba.decode_samples(wav_file)

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
        start, end = wf[0]["startFrame"], wf[-1]["endFrame"]
        cues[line_id] = {"startFrame": start, "endFrame": end, "words": wf}
        segments.append({"startFrame": start, "endFrame": end, "text": text, "words": wf})
        print(f"{line_id}: frames {start}-{end} ({(end - start) / FPS:.2f}s) {text[:42]}...")

    total = len(track) / SR
    print(f"Narration length: {total:.2f}s = {round(total * FPS)} frames")

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
    # The cleared series theme, looped with crossfades, well under the voice (see AGENTS.md section 9).
    cues = json.loads((DATA / "narrationCues.json").read_text())
    EP.mkdir(parents=True, exist_ok=True)
    da.series_score(EP / f"score_v{VERSION}.mp3", cues["durationFrames"] / FPS + 4, TMP)


# Bridge / campaign-only sounds. Acts use their source episodes' sfx folders.
def sfx_burp():
    """Big wet Mimic burp: a low wobbling growl with a gulpy onset."""
    dur = 0.9
    t = da.t_axis(dur)
    f = 70 + 25 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 2)
    growl = np.sin(2 * np.pi * np.cumsum(f) / SR) * da.decay(dur, 0.45, attack=0.03)
    rasp = da.bp(da.noise(dur), 120, 600) * da.decay(dur, 0.35, attack=0.03) * 0.6
    return (growl + rasp) * 0.9


def sfx_knock():
    """Three heavy knocks on a wooden door."""
    out = da.silence(1.1)
    for i in range(3):
        da.place(out, da.thud(0.3, 130, 55, 0.06, 1.0) + da.hp(da.noise(0.3), 900) * da.decay(0.3, 0.02) * 0.4, i * 0.32)
    return out


def sfx_nail():
    """A poster nailed to a board: two hammer taps."""
    out = da.silence(0.6)
    for i in range(2):
        da.place(out, da.metal(0.2, 900, 0.05) * 0.4 + da.thud(0.2, 220, 90, 0.03, 0.6), i * 0.22)
    return out


def sfx_roar():
    """Distant dragon rumble-roar behind a door."""
    dur = 2.2
    t = da.t_axis(dur)
    env = np.sin(np.pi * np.minimum(1, t / dur)) ** 1.5
    body = da.lp(da.noise(dur), 380) * env * 1.2
    tone = np.sin(2 * np.pi * np.cumsum(55 + 20 * t / dur) / SR) * env * 0.5
    return body + tone


EXTRA = {
    "burp": sfx_burp,
    "knock": sfx_knock,
    "nail": sfx_nail,
    "roar": sfx_roar,
}

SFX_BUILDERS = {
    "stamp": da.SFX_BUILDERS["stamp"],
    "pop": da.SFX_BUILDERS["pop"],
    "whoosh": da.SFX_BUILDERS["whoosh"],
    "thud": da.SFX_BUILDERS["thud"],
    **EXTRA,
}


def build_sfx():
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    for name, build in SFX_BUILDERS.items():
        da.write_wav(SFX_DIR / f"{name}.wav", build())
    print(f"{len(SFX_BUILDERS)} sfx written to {SFX_DIR}")
    ai = sorted((SFX_DIR.parent / "sfx_ai").glob("*.wav"))
    for wav in ai:
        shutil.copyfile(wav, SFX_DIR / wav.name)


if __name__ == "__main__":
    targets = sys.argv[1:] or ["narration", "score", "sfx"]
    if "sfx" in targets:
        build_sfx()
    if "narration" in targets:
        build_narration()
    if "score" in targets:
        build_score()
