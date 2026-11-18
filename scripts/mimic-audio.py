"""Builds the audio stems for Mimic ("How a mimic would actually work"), the
first fantasy-biology short. Reuses the Slow Flight pipeline
(scripts/slow-flight-audio.py) with its paths pointed at this slug: same Gemini
voice, word timestamps, mastering, procedural SFX helpers and ambient score.

  python scripts/mimic-audio.py                  # everything
  python scripts/mimic-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

The science (checked 2026-11-10):
  - Cephalopod skin: chromatophores (pigment sacs opened by muscles, under
    direct nerve control, so patterns change in well under a second) and
    papillae (muscles that raise 3D bumps).
  - Giant clam (Tridacna gigas): best-documented shell 230 kg dead / ~250 kg
    alive, about a century to grow. "Three grown men" = 3 x ~75 kg.
  - An octopus's only hard part is its beak; the body follows through any gap
    the beak fits.
  - Hermit crabs do not grow a shell; they move into empty snail shells.
  - Large crocodiles can go more than a year without a meal (PBS Nature).
  - The largest suckers of a giant Pacific octopus (~6.4 cm) are estimated to
    hold about 16 kg each (Parker).

Outputs:
  public/bio/mimic/narration_vN.mp3
  public/bio/mimic/score_vN.mp3
  public/bio/mimic/sfx/*.wav
  src/bio/mimic/data/wordTimestamps.json
  src/bio/mimic/data/narrationCues.json
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

SLUG = "mimic"
VERSION = 1

# One line per shot group. The "so you / but now" chain: every fix creates the
# next problem, every fix is anchored to a real animal.
LINES = [
    ("h", "No animal can grow wood and iron. So a real mimic could never turn into a treasure chest.", 0.35),
    ("a1", "So you copy the octopus. Its skin is packed with color sacs and tiny muscles, so in one second, you paint yourself like oak planks and rusty iron.", 0.3),
    ("a2", "But you are still a bag of water. One knock on the lid, and you wobble.", 0.45),
    ("b1", "So you grow a real shell, like a giant clam. A hinged box that already snaps shut.", 0.3),
    ("b2", "But it weighs as much as three grown men, and takes decades to build.", 0.45),
    ("c1", "So you stop building a chest, and you steal one. A hermit crab never grows its shell. It moves into an empty one.", 0.3),
    ("c2", "And you have no bones, so you pour in through a gap no wider than your beak.", 0.45),
    ("d1", "But now dinner walks past twice a year. A warm body would starve.", 0.3),
    ("d2", "So you run cold and never move, like a crocodile, which can go a year without a meal.", 0.45),
    ("e1", "But that leaves you one bite. So your tongue is lined with suckers, and each one can hold sixteen kilos.", 0.5),
    ("end", "So the mimic never turned into a treasure chest. It moved into one. And it has been waiting all year for you to lift the lid.", 1.0),
]

# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
NUMBER_WORDS = {"1": "one", "3": "three", "16": "sixteen", "2": "two"}

# Point the Slow Flight pipeline at this slug (its functions read these module globals).
sf.SLUG = SLUG
sf.VERSION = VERSION
sf.LINES = LINES
sf.NUMBER_WORDS = NUMBER_WORDS
sf.LEAD_IN = 0.3
sf.EP = ROOT / "public" / "bio" / SLUG
sf.SFX_DIR = sf.EP / "sfx"
sf.DATA = ROOT / "src" / "bio" / SLUG / "data"
sf.TMP = ROOT / "out" / f"audio-tmp-{SLUG}"
sf.VOICE_TMP = sf.TMP / "gemini"
for d in (sf.EP, sf.SFX_DIR, sf.DATA, sf.VOICE_TMP):
    d.mkdir(parents=True, exist_ok=True)

sf.SCORE_STYLE = "ambient"
sf.SCORE_LUFS = -34.0

SR = sf.SR


# ---------------------------------------------------------------------------
# Episode sound effects (procedural, on the Slow Flight helpers)
# ---------------------------------------------------------------------------

def sfx_knock(dur=0.7):
    """Knuckles on a chest lid: two short woody knocks."""
    n = int(dur * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(41)
    for at in (0.0, 0.2):
        i = int(at * SR)
        L = int(0.22 * SR)
        t = np.arange(L) / SR
        body = (np.sin(2 * np.pi * 210 * t) + 0.5 * np.sin(2 * np.pi * 470 * t)) * np.exp(-t / 0.035)
        tap = sf._band(rng.normal(0, 1, L), 900, 4000, 2) * np.exp(-t / 0.006)
        out[i:i + L] += body + tap * 0.5
    return sf._norm(out, 0.8)


def sfx_wobble(dur=1.1):
    """A water balloon jiggling: a low tone whose pitch wobbles and dies away."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 95 + 45 * np.sin(2 * np.pi * 7.5 * t) * np.exp(-t / 0.45)
    ph = 2 * np.pi * np.cumsum(f) / SR
    rng = np.random.default_rng(43)
    slosh = sf._band(rng.normal(0, 1, n), 300, 1400, 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 7.5 * t)) * 0.25
    env = np.minimum(1, t / 0.01) * np.exp(-t / 0.4)
    return sf._norm((np.sin(ph) + 0.4 * np.sin(2 * ph) + slosh) * env, 0.75)


def sfx_shell(dur=0.6):
    """A heavy shell clapping shut: a stony clack over a low thump."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(47)
    clack = sf._band(rng.normal(0, 1, n), 1200, 6000, 2) * np.exp(-t / 0.012)
    stone = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in ((640, 0.05), (1180, 0.035), (1730, 0.025))) * 0.3
    thump = np.sin(2 * np.pi * (85 - 30 * t) * t) * np.exp(-t / 0.09)
    return sf._norm(clack * 0.7 + stone + thump, 0.9)


def sfx_scuttle(dur=1.2):
    """Small hard legs ticking over sand."""
    n = int(dur * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(53)
    for at in np.arange(0.02, dur - 0.1, 0.055):
        i = int((at + rng.uniform(-0.01, 0.01)) * SR)
        L = int(0.03 * SR)
        t = np.arange(L) / SR
        out[i:i + L] += sf._band(rng.normal(0, 1, L), 2000, 7000, 2) * np.exp(-t / 0.004) * rng.uniform(0.5, 1)
    return sf._norm(out, 0.5)


def sfx_pour(dur=1.6):
    """A soft body squeezing through a gap: a wet, rising slurp."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(59)
    f = 180 + 520 * (t / dur) ** 2
    ph = 2 * np.pi * np.cumsum(f) / SR
    wet = sf._band(rng.normal(0, 1, n), 400, 2600, 2) * (0.55 + 0.45 * np.sin(2 * np.pi * 13 * t))
    env = np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.12)
    return sf._norm((wet * 0.7 + np.sin(ph) * 0.35) * env, 0.65)


def sfx_heartbeat(dur=1.0):
    """One slow lub-dub."""
    n = int(dur * SR)
    out = np.zeros(n)
    for at, g in ((0.0, 1.0), (0.24, 0.7)):
        i = int(at * SR)
        L = int(0.3 * SR)
        t = np.arange(L) / SR
        out[i:i + L] += np.sin(2 * np.pi * (62 - 60 * t) * t) * np.exp(-t / 0.06) * g
    return sf._norm(out, 0.85)


def sfx_lash(dur=0.5):
    """The tongue shooting out: a fast wet whip."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(61)
    f = 300 + 1900 * np.exp(-t / 0.07)
    air = sf._band(rng.normal(0, 1, n), 500, 5000, 2) * np.exp(-((t - 0.07) / 0.06) ** 2)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.08) * 0.3
    smack = sf._band(rng.normal(0, 1, n), 200, 1500, 2) * np.exp(-np.maximum(0, t - 0.16) / 0.03) * (t > 0.16) * 0.8
    return sf._norm(air + tone + smack, 0.85)


def sfx_water(dur=4.0):
    """Underwater bed: a soft low wash with slow movement."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(67)
    wash = sf._band(rng.normal(0, 1, n), 60, 420, 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.4 * t))
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.6)
    return sf._norm(wash * env, 0.45)


def sfx_swamp(dur=4.0):
    """Swamp bed: crickets over still air."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(71)
    chirp = np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 38 * t) > 0.2) * (np.sin(2 * np.pi * 1.7 * t) > 0.1)
    air = sf._band(rng.normal(0, 1, n), 100, 900, 2) * 0.5
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.6)
    return sf._norm((chirp * 0.25 + air) * env, 0.4)


def sfx_tick(dur=0.25):
    """A soft clock tick for the passing months."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    return sf._norm(np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.01), 0.5)


sf.EXTRA_SFX.update({
    "knock": sfx_knock,
    "wobble": sfx_wobble,
    "shell": sfx_shell,
    "scuttle": sfx_scuttle,
    "pour": sfx_pour,
    "heartbeat": sfx_heartbeat,
    "lash": sfx_lash,
    "water": sfx_water,
    "swamp": sfx_swamp,
    "tick": sfx_tick,
})

if __name__ == "__main__":
    modes = set(sys.argv[1:]) or {"narration", "sfx", "score"}
    if "narration" in modes:
        sf.build_narration()
    if "sfx" in modes:
        sf.build_sfx()
    if "score" in modes:
        sf.build_score()
    print(json.dumps({"slug": SLUG, "version": VERSION}))
