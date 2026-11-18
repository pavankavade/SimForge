"""Builds the audio stems for Slime ("How a slime would actually work"), the
second fantasy-biology short. Reuses the Mimic pipeline (scripts/mimic-audio.py,
itself on scripts/slow-flight-audio.py) with its paths pointed at this slug:
same Gemini voice, word timestamps, mastering, SFX helpers and ambient score.

  python scripts/slime-audio.py                  # everything
  python scripts/slime-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

The science (checked 2026-11-13):
  - Slime mold (Physarum polycephalum): one giant cell with millions of nuclei
    and no nervous system. It moves by shuttle streaming: its cytoplasm is
    pumped back and forth, reversing about every 100 seconds, and the whole
    plasmodium migrates at a few centimeters an hour. A cut fragment seals
    itself and carries on as its own plasmodium.
  - Sea cucumber: "mutable collagenous tissue" (catch connective tissue). The
    proteins tensilin and softenin stiffen and soften the body wall within
    seconds.
  - Slugs lose water through their skin, live under a coat of mucus and come
    out in the dark and the damp.
  - An amoeba eats by flowing around its food and closing over it
    (phagocytosis).
  - The stomach is protected from its own acid by a bicarbonate-rich mucus
    layer, and its surface lining is replaced every 3 to 6 days.

Outputs:
  public/bio/slime/narration_vN.mp3
  public/bio/slime/score_vN.mp3
  public/bio/slime/sfx/*.wav
  src/bio/slime/data/wordTimestamps.json
  src/bio/slime/data/narrationCues.json
"""

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("mimic_audio", ROOT / "scripts" / "mimic-audio.py")
ma = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ma)
# The Slow Flight pipeline, with the Mimic episode's extra effects already registered.
sf = ma.sf

SLUG = "slime"
VERSION = 1

# One line per shot group. The "so you / but now" chain: every fix creates the
# next problem, every fix is anchored to a real animal.
LINES = [
    ("h", "A slime has no bones, no brain and no mouth. So a real one could never hop. It would just be a puddle.", 0.35),
    ("a1", "So you copy the slime mold. It is one giant cell with no brain, and it still crawls, by pumping its insides back and forth.", 0.3),
    ("a2", "But it is as thin as paint, and it crawls a few centimeters an hour.", 0.45),
    ("b1", "So you copy the sea cucumber. Its skin can switch from stiff to soft in seconds. Stiff, you stand up like jelly. Soft, you pour under a door.", 0.3),
    ("b2", "But you are mostly water, and on dry land it leaves through your skin. In the sun, you are a stain by lunch.", 0.45),
    ("c1", "So you wrap yourself in mucus, like a slug, and you never leave the dark and the damp.", 0.45),
    ("d1", "But you still have no mouth. So you eat like an amoeba. You flow over your dinner, and close around it.", 0.3),
    ("d2", "But acid that melts your dinner would melt you too. So you line your insides with mucus, like your own stomach, which rebuilds its lining every few days.", 0.45),
    ("e1", "And you never grow one heart or one brain. A slime mold has millions of nuclei, tiny cores, spread through its whole body.", 0.5),
    ("end", "So the weakest monster in the game is the only one you cannot kill with a sword. Cut it in half, and now you have two.", 1.0),
]

# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
NUMBER_WORDS = {"1": "one", "2": "two"}

# Point the pipeline at this slug (its functions read these module globals).
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

def sfx_boing(dur=0.45):
    """A slime hop: a short rubbery pitch bend up, with a wet edge."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 150 + 260 * (t / dur) ** 0.6 + 18 * np.sin(2 * np.pi * 22 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    rng = np.random.default_rng(73)
    wet = sf._band(rng.normal(0, 1, n), 500, 2200, 2) * np.exp(-t / 0.03) * 0.3
    env = np.minimum(1, t / 0.008) * np.exp(-t / 0.16)
    return sf._norm((np.sin(ph) + 0.35 * np.sin(2 * ph)) * env + wet, 0.7)


def sfx_splat(dur=0.7):
    """A wet body hitting stone and spreading: a slap, then a short spatter."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(79)
    slap = sf._band(rng.normal(0, 1, n), 250, 3200, 2) * np.exp(-t / 0.035)
    thump = np.sin(2 * np.pi * (110 - 70 * t) * t) * np.exp(-t / 0.07)
    spatter = sf._band(rng.normal(0, 1, n), 1200, 5200, 2) * (rng.random(n) > 0.985) * np.exp(-t / 0.2) * 3
    spatter = sf._band(spatter, 800, 5000, 2)
    return sf._norm(slap + thump * 0.8 + spatter * 0.5, 0.85)


def sfx_slice(dur=0.5):
    """A sword through jelly: a bright swish that ends in a wet cut."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(83)
    swish = sf._band(rng.normal(0, 1, n), 1800, 9000, 2) * np.exp(-((t - 0.09) / 0.05) ** 2)
    ring = np.sin(2 * np.pi * 3100 * t) * np.exp(-np.maximum(0, t - 0.1) / 0.12) * (t > 0.1) * 0.18
    wet = sf._band(rng.normal(0, 1, n), 300, 1800, 2) * np.exp(-np.maximum(0, t - 0.13) / 0.05) * (t > 0.13) * 0.7
    return sf._norm(swish + ring + wet, 0.85)


def sfx_drip(dur=0.5):
    """One drop falling into a puddle in a cave."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 900 + 1500 * np.exp(-t / 0.02)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    echo = np.zeros(n)
    k = int(0.13 * SR)
    echo[k:] = tone[:-k] * 0.3
    return sf._norm(tone + echo, 0.55)


def sfx_forest(dur=4.0):
    """Forest floor bed: soft air and a few distant birds."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(89)
    air = sf._band(rng.normal(0, 1, n), 200, 2400, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t)) * 0.5
    birds = np.zeros(n)
    for at, base in ((0.5, 3200), (1.9, 3900), (3.0, 2800)):
        i = int(at * SR)
        L = int(0.22 * SR)
        tt = np.arange(L) / SR
        birds[i:i + L] += np.sin(2 * np.pi * (base + 700 * np.sin(2 * np.pi * 9 * tt)) * tt) * np.sin(np.pi * tt / 0.22) ** 2 * 0.12
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.6)
    return sf._norm((air + birds) * env, 0.4)


def sfx_gulp(dur=0.6):
    """Something large closing over its dinner: a deep, wet swallow."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(97)
    f = 260 - 170 * (t / dur) ** 0.5
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-((t - 0.16) / 0.12) ** 2)
    wet = sf._band(rng.normal(0, 1, n), 300, 1600, 2) * np.exp(-((t - 0.1) / 0.08) ** 2) * 0.5
    plop = np.sin(2 * np.pi * 95 * t) * np.exp(-np.maximum(0, t - 0.3) / 0.06) * (t > 0.3) * 0.7
    return sf._norm(tone + wet + plop, 0.8)


sf.EXTRA_SFX.update({
    "boing": sfx_boing,
    "splat": sfx_splat,
    "slice": sfx_slice,
    "drip": sfx_drip,
    "forest": sfx_forest,
    "gulp": sfx_gulp,
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
        sf.build_score()
    print(json.dumps({"slug": SLUG, "version": VERSION}))
