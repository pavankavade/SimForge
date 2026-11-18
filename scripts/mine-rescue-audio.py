"""Builds the audio stems for Mine Rescue ("69 days under a mountain"), our
retelling of the 2010 San Jose mine rescue in Chile. Reuses the Slow Flight
pipeline (scripts/slow-flight-audio.py) with its paths pointed at this slug:
same Gemini voice, word timestamps, mastering, procedural SFX helpers and score.

  python scripts/mine-rescue-audio.py                  # everything
  python scripts/mine-rescue-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

Facts (see docs/ifkit/mine-rescue-script.md): collapse 5 Aug 2010, shelter
~700 m down, ~48 h of emergency food, no ladders in the ventilation shaft,
rations of two spoons of tuna, a sip of milk and a bite of cracker every 48 h,
probe holes ~12 cm wide, breakthrough on day 17 with the red note, palomas,
three rival drills (Plan B through on day 65), Fenix capsule 53 cm wide, first
man up on day 69 in sunglasses, all 33 out in ~22 h, foreman Luis Urzua last.

Outputs:
  public/whatif/mine-rescue/narration_vN.mp3
  public/whatif/mine-rescue/score_vN.mp3
  public/whatif/mine-rescue/sfx/*.wav
  src/whatif/mine-rescue/data/wordTimestamps.json
  src/whatif/mine-rescue/data/narrationCues.json
"""

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("slow_flight_audio", ROOT / "scripts" / "slow-flight-audio.py")
sf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sf)

SLUG = "mine-rescue"
VERSION = 1

LINES = [
    # Trapped
    ("a1", "Seven hundred meters of rock just came down between you and the sky. Thirty-three of you made it to the shelter.", 0.4),
    ("a2", "There is food for two days, and nobody up top knows if anyone is alive.", 0.5),
    ("a3", "You try the ventilation shaft. The ladders were never put in.", 0.9),
    ("a4", "So your foreman splits the food. Every two days, each man gets two spoons of tuna, a sip of milk and a bite of cracker.", 0.9),
    # Found
    ("b1", "Up top, drills bore holes no wider than your fist. The old maps send them right past you. Again, and again.", 0.5),
    ("b2", "Day seventeen. Grinding in the wall, and a drill bit bursts through.", 0.3),
    ("b3", "You paint it red, tape on a note, and watch it ride back up. We are fine in the shelter, the thirty-three.", 1.0),
    # The big hole
    ("c1", "Now the hole is a lifeline. Food, water, letters and a camera slide down in narrow tubes.", 0.4),
    ("c2", "But a person needs a hole as wide as his shoulders, so three giant drills race to cut one.", 0.3),
    ("c3", "The rock chews through their bits. On day sixty-five, one of them finally breaks through.", 0.4),
    ("c4", "And you have to fit. The capsule is only fifty-three centimeters wide.", 0.5),
    # Out
    ("d1", "They call it the Phoenix. Wheels hug the walls, it carries its own oxygen, and if it jams, a hatch in the floor lets you climb back down.", 0.4),
    ("d2", "Day sixty-nine. The first man rises out of the ground in sunglasses, because after ten weeks in the dark, the sun could hurt his eyes.", 0.4),
    ("d3", "One by one, all thirty-three come up. Last of all, the foreman who split the tuna.", 1.0),
    ("end", "Sixty-nine days, seven hundred meters down, and every one of you came home.", 1.6),
]

# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
NUMBER_WORDS = {
    "700": "seven hundred", "33": "thirty-three", "2": "two", "17": "seventeen", "3": "three",
    "65": "sixty-five", "53": "fifty-three", "69": "sixty-nine", "10": "ten",
    "53cm": "fifty-three centimeters",
}

# Point the Slow Flight pipeline at this slug (its functions read these module globals).
sf.SLUG = SLUG
sf.VERSION = VERSION
sf.LINES = LINES
sf.NUMBER_WORDS = NUMBER_WORDS
sf.LEAD_IN = 0.5
sf.EP = ROOT / "public" / "whatif" / SLUG
sf.SFX_DIR = sf.EP / "sfx"
sf.DATA = ROOT / "src" / "whatif" / SLUG / "data"
sf.TMP = ROOT / "out" / f"audio-tmp-{SLUG}"
sf.VOICE_TMP = sf.TMP / "gemini"
for d in (sf.EP, sf.SFX_DIR, sf.DATA, sf.VOICE_TMP):
    d.mkdir(parents=True, exist_ok=True)

# Score: a licensed track (CC BY 4.0, credited in public/music/CREDITS.md and the upload
# description), trimmed to the narration, faded and sat low under the voice. Its slow dark pulse
# matches the reference's bed. Bump SCORE_VERSION when the score changes (config music.src).
SCORE_TRACK = ROOT / "public" / "music" / "crypto-kevin-macleod.mp3"
SCORE_VERSION = 3
SCORE_LUFS = -34.0


def build_score():
    cues = json.loads((sf.DATA / "narrationCues.json").read_text())
    seconds = cues["durationFrames"] / sf.FPS + 1.0
    cut = sf.TMP / "score_cut.wav"
    sf.da.run([
        "ffmpeg", "-y", "-hide_banner", "-i", str(SCORE_TRACK),
        "-af", f"atrim=0:{seconds},afade=t=in:d=1.5,afade=t=out:st={max(0, seconds - 4)}:d=4",
        str(cut),
    ])
    dst = sf.EP / f"score_v{SCORE_VERSION}.mp3"
    sf.da.loudnorm(cut, dst, SCORE_LUFS, tp=-6)
    print(f"{dst.name} <- {SCORE_TRACK.name} -> {sf.da.measure_lufs(dst):.1f} LUFS")

SR = sf.SR


# ---------------------------------------------------------------------------
# Episode sound effects (procedural, on the Slow Flight helpers)
# ---------------------------------------------------------------------------

def _env(t, dur, a, r):
    return np.minimum(1, t / a) * np.minimum(1, np.maximum(0, dur - t) / r)


def sfx_collapse(dur=3.2):
    """The mountain coming down: a deep roar, cracks and falling rubble."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(41)
    roar = sf._band(rng.normal(0, 1, n), 25, 220, 2) * (1.2 * np.exp(-t / 1.4) + 0.2)
    rubble = sf._band(rng.normal(0, 1, n), 400, 4000, 2) * (rng.random(n) > 0.9985) * 6
    rubble = np.convolve(rubble, np.exp(-np.arange(int(0.04 * SR)) / (0.008 * SR)), mode="same")
    crack = np.zeros(n)
    for k in (0.05, 0.4, 0.9):
        i = int(k * SR)
        L = int(0.25 * SR)
        tt = np.arange(L) / SR
        crack[i:i + L] += sf._band(rng.normal(0, 1, L), 80, 3000, 2) * np.exp(-tt / 0.06)
    return sf._norm((roar + rubble * 0.5 + crack) * _env(t, dur, 0.01, 0.8), 0.95)


def sfx_drill(dur=3.0):
    """A drill rig grinding into rock: a geared motor whine over grinding grit."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 95 + 6 * np.sin(2 * np.pi * 0.7 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    motor = np.sign(np.sin(ph)) * 0.25 + np.sin(3 * ph) * 0.3
    rng = np.random.default_rng(43)
    grit = sf._band(rng.normal(0, 1, n), 700, 5000, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * t))
    return sf._norm((sf._band(motor, 40, 2000, 2) + grit * 0.45) * _env(t, dur, 0.15, 0.4), 0.7)


def sfx_grind(dur=2.4):
    """The bit chewing through the shelter wall, heard from inside: muffled, getting louder."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(47)
    grind = sf._band(rng.normal(0, 1, n), 120, 1400, 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t) ** 2)
    rise = 0.25 + 0.75 * (t / dur) ** 1.5
    return sf._norm(grind * rise * _env(t, dur, 0.3, 0.1), 0.8)


def sfx_burst(dur=1.2):
    """The bit punching through: a crack, then rock chips rattling down."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(53)
    crack = sf._band(rng.normal(0, 1, n), 60, 4000, 2) * np.exp(-t / 0.05)
    thump = np.sin(2 * np.pi * (70 - 30 * t) * t) * np.exp(-t / 0.12)
    chips = sf._band(rng.normal(0, 1, n), 1500, 7000, 2) * (rng.random(n) > 0.997) * 5 * np.exp(-t / 0.5)
    return sf._norm(crack + thump + chips, 0.95)


def sfx_winch(dur=3.0):
    """A cable winch paying out: a steady electric hum with a ticking drum."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    hum = np.sin(2 * np.pi * 120 * t) * 0.4 + np.sin(2 * np.pi * 240 * t) * 0.2
    tick = np.zeros(n)
    for k in np.arange(0.0, dur - 0.05, 0.18):
        i = int(k * SR)
        L = int(0.03 * SR)
        tick[i:i + L] += np.sin(2 * np.pi * 1600 * np.arange(L) / SR) * np.exp(-np.arange(L) / (0.006 * SR))
    return sf._norm((hum + tick * 0.5) * _env(t, dur, 0.2, 0.4), 0.6)


def sfx_cheer(dur=3.6):
    """A crowd cheering at the pithead (noise-band voices with a swell)."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(59)
    voices = sum(
        sf._band(rng.normal(0, 1, n), lo, lo * 2.2, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * (0.8 + k * 0.37) * t + k))
        for k, lo in enumerate((300, 450, 700, 1000))
    )
    swell = np.minimum(1, t / 0.4) * (0.7 + 0.3 * np.exp(-t / 1.2))
    return sf._norm(voices * swell * _env(t, dur, 0.05, 0.9), 0.7)


def sfx_tube(dur=0.9):
    """A paloma tube knocking against the borehole as it arrives: hollow plastic clonks."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    out = np.zeros(n)
    for k, a in ((0.0, 1.0), (0.18, 0.6), (0.31, 0.35)):
        i = int(k * SR)
        tt = t[: n - i]
        out[i:] += a * (np.sin(2 * np.pi * 330 * tt) + 0.5 * np.sin(2 * np.pi * 780 * tt)) * np.exp(-tt / 0.04)
    return sf._norm(out, 0.7)


def sfx_cave(dur=8.0):
    """Shelter room tone: low air hum and the odd distant drip."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(61)
    air = sf._band(rng.normal(0, 1, n), 40, 300, 2) * 0.6
    drips = np.zeros(n)
    for k in (1.1, 3.4, 5.9, 7.2):
        i = int(k * SR)
        L = int(0.12 * SR)
        tt = np.arange(L) / SR
        drips[i:i + L] += np.sin(2 * np.pi * (1300 + 900 * tt / 0.12) * tt) * np.exp(-tt / 0.02)
    return sf._norm((air + drips * 0.35) * _env(t, dur, 0.5, 0.5), 0.45)


def sfx_hatch(dur=0.6):
    """The capsule's floor hatch dropping open: a latch clack and a metal swing."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    clack = sum(np.sin(2 * np.pi * f * t) for f in (900, 2100)) * np.exp(-t / 0.015)
    swing = sum(np.sin(2 * np.pi * f * t) for f in (310, 690)) * np.exp(-t / 0.12) * 0.5
    return sf._norm(clack + swing, 0.75)


sf.EXTRA_SFX.update({
    "collapse": sfx_collapse,
    "drill": sfx_drill,
    "grind": sfx_grind,
    "burst": sfx_burst,
    "winch": sfx_winch,
    "cheer": sfx_cheer,
    "tube": sfx_tube,
    "cave": sfx_cave,
    "hatch": sfx_hatch,
})

def build_sfx():
    """Procedural sfx, then the AI takes picked with scripts/gen-sfx.py laid over them."""
    sf.build_sfx()
    ai = sorted((sf.EP / "sfx_ai").glob("*.wav"))
    for f in ai:
        (sf.SFX_DIR / f.name).write_bytes(f.read_bytes())
    if ai:
        print(f"{len(ai)} AI sfx laid over from {sf.EP / 'sfx_ai'}")


if __name__ == "__main__":
    modes = set(sys.argv[1:]) or {"narration", "sfx", "score"}
    if "narration" in modes:
        sf.build_narration()
    if "sfx" in modes:
        build_sfx()
    if "score" in modes:
        build_score()
    print(json.dumps({"slug": SLUG, "version": VERSION}))
