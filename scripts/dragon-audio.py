"""Builds the audio stems for Dragon ("How a dragon survives its own fire"),
the third fantasy-biology short. Reuses the Mimic/Slime pipeline
(scripts/mimic-audio.py, on scripts/slow-flight-audio.py) with its paths pointed
at this slug: same Gemini voice, word timestamps, mastering, SFX helpers and
ambient score.

  python scripts/dragon-audio.py                  # everything
  python scripts/dragon-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (in .env) for lines that are not cached yet.

The science:
  - Methanogenesis: anaerobic gut microbes ferment rotting plant cellulose into
    methane gas (CH4), identical to the rumen of ruminants (cows).
  - Combustion chemistry: pure methane cannot burn without oxygen (stoichiometric
    flammability limits in air are ~5% to 15%). Sealed inside an anaerobic muscular
    reservoir, pressurized gas is completely safe from internal combustion.
  - Ignition / Pyrophorics vs Flint: a pyrophoric chemical gland would ignite at the
    point of air contact inside the throat. Iron-capped teeth (Komodo dragons possess
    iron-enriched enamel coatings on the cutting edges and serrations of their teeth,
    Nature Ecol. & Evol. 2024) strike together like flint and steel right at the mouth rim.
  - Flame flashback & laminar flame speed: burning velocity of atmospheric methane
    is ~35-40 cm/s. If fuel flow velocity out of the nozzle exceeds flame propagation
    speed, the flame front cannot travel upstream into the throat, anchoring safely outside.

Outputs:
  public/bio/dragon/narration_vN.mp3
  public/bio/dragon/score_vN.mp3
  public/bio/dragon/sfx/*.wav
  src/bio/dragon/data/wordTimestamps.json
  src/bio/dragon/data/narrationCues.json
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
sf = ma.sf

SLUG = "dragon"
VERSION = 1

# One line per shot group. The "so you / but now" chain.
LINES = [
    ("h1", "If a dragon kept fire burning in its belly, it would roast its own organs in one second.", 0.35),
    ("h2", "So you never store fire. You store fuel.", 0.45),
    ("a1", "You gorge on piles of rotting plants, and let gut bacteria ferment them into methane, exactly like a cow.", 0.35),
    ("a2", "Except a cow only vents tiny lazy burps. Barely enough to flicker a candle.", 0.5),
    ("b1", "So you evolve a second stomach. A sealed bag of muscle that pumps the methane tight under pressure.", 0.35),
    ("b2", "Except now you are a living bomb. One tiny spark, and your belly detonates.", 0.5),
    ("c1", "Unless there is no oxygen. Fire cannot burn without air. Pure fuel sealed in a tank is completely inert, until it vents past your lips.", 0.45),
    ("d1", "So how do you light it? A chemical gland sounds easy, until it touches air at your throat and incinerates your own neck.", 0.4),
    ("d2", "So you armor your teeth with iron, just like a Komodo dragon. You snap your serrated jaws shut, striking flint and steel to throw sparks right at the exit.", 0.5),
    ("e1", "Except burning gas travels backwards. The flame will race down the fuel stream, straight into your gullet.", 0.35),
    ("e2", "So you clench that muscular tank hard. You blast the gas out faster than the flame can crawl back.", 0.45),
    ("end", "Just like a rocket engine or a kitchen stove, the fire stays locked in front of your face. Congratulations, you are now a walking flamethrower.", 1.2),
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
sf.SCORE_LUFS = -33.0

SR = sf.SR


# ---------------------------------------------------------------------------
# Episode sound effects (procedural, on the Slow Flight helpers)
# ---------------------------------------------------------------------------

def sfx_growl(dur=1.4):
    """Deep, guttural beast throat rumble with low sub-bass."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(101)
    f = 55 + 15 * np.sin(2 * np.pi * 3.5 * t) - 18 * (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    rasp = sf._band(rng.normal(0, 1, n), 120, 900, 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t)) * 0.4
    env = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.3)
    return sf._norm((sub + rasp) * env, 0.85)


def sfx_gurgle(dur=1.1):
    """Squelchy bubbling gut fermentation: wet pops and bubbling squelches."""
    n = int(dur * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(107)
    for at in np.arange(0.04, dur - 0.1, 0.11):
        i = int((at + rng.uniform(-0.02, 0.02)) * SR)
        L = int(0.08 * SR)
        t = np.arange(L) / SR
        f0 = rng.uniform(220, 520)
        pop = np.sin(2 * np.pi * (f0 + 800 * (t / 0.08)) * t) * np.exp(-t / 0.016)
        squelch = sf._band(rng.normal(0, 1, L), 400, 2200, 2) * np.exp(-t / 0.025) * 0.3
        out[i:i + L] += pop + squelch
    return sf._norm(out, 0.7)


def sfx_burp(dur=0.6):
    """A funny tiny burp / bubble pop."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 140 - 70 * (t / dur) ** 0.5 + 25 * np.sin(2 * np.pi * 28 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = (np.sin(ph) + 0.5 * np.sin(2 * ph)) * np.exp(-t / 0.12)
    rng = np.random.default_rng(113)
    fizz = sf._band(rng.normal(0, 1, n), 800, 3200, 2) * np.exp(-t / 0.04) * 0.35
    return sf._norm(body + fizz, 0.75)


def sfx_pressurize(dur=1.2):
    """Pneumatic valve hiss of gas pumping into a pressure tank under tension."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(127)
    hiss = sf._band(rng.normal(0, 1, n), 1200, 6500, 2) * (t / dur) ** 0.8
    hum = np.sin(2 * np.pi * (90 + 60 * t) * t) * 0.3 * np.minimum(1, t / 0.2)
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.1)
    return sf._norm((hiss + hum) * env, 0.8)


def sfx_iron_clack(dur=0.5):
    """Komodo dragon iron teeth snapping shut: sharp metallic bite clack."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(131)
    snap = sf._band(rng.normal(0, 1, n), 1800, 8500, 2) * np.exp(-t / 0.008)
    iron_ring = (
        np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.08) * 0.4
        + np.sin(2 * np.pi * 4800 * t) * np.exp(-t / 0.04) * 0.25
        + np.sin(2 * np.pi * 750 * t) * np.exp(-t / 0.06) * 0.35
    )
    thud = np.sin(2 * np.pi * 120 * t) * np.exp(-t / 0.04) * 0.5
    return sf._norm(snap * 0.8 + iron_ring + thud, 0.9)


def sfx_spark(dur=0.7):
    """Flint and steel spark shower: bright crisp crackle."""
    n = int(dur * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(137)
    for at in [0.0, 0.03, 0.065, 0.11, 0.18, 0.26]:
        i = int(at * SR)
        L = int(0.04 * SR)
        t = np.arange(L) / SR
        click = sf._band(rng.normal(0, 1, L), 3500, 11000, 2) * np.exp(-t / 0.004)
        out[i:i + L] += click * rng.uniform(0.6, 1.0)
    return sf._norm(out, 0.75)


def sfx_blast(dur=1.5):
    """High velocity gas stream whooshing out of the mouth nozzle."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(149)
    jet = sf._band(rng.normal(0, 1, n), 600, 4800, 2) * np.minimum(1, (t / 0.2) ** 0.5) * np.minimum(1, (dur - t) / 0.3)
    sub = np.sin(2 * np.pi * 70 * t) * 0.35 * np.exp(-((t - 0.4) / 0.4) ** 2)
    return sf._norm(jet + sub, 0.85)


def sfx_flamethrower(dur=2.6):
    """Roaring flamethrower: massive combusting fireball torrent."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(163)
    whoosh = sf._band(rng.normal(0, 1, n), 120, 2600, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * t))
    rumble = np.sin(2 * np.pi * 48 * t) * 0.45 * (0.7 + 0.3 * np.sin(2 * np.pi * 6 * t))
    crackle = sf._band(rng.normal(0, 1, n), 3000, 9500, 2) * (rng.random(n) > 0.985) * 2.5
    crackle = sf._band(crackle, 2000, 8000, 2)
    env = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.4)
    return sf._norm((whoosh + rumble + crackle * 0.4) * env, 0.95)


def sfx_cavern(dur=4.0):
    """Cavern ambient air: dark echoing dungeon air with distant mineral drip."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(179)
    air = sf._band(rng.normal(0, 1, n), 60, 800, 2) * 0.5
    drips = np.zeros(n)
    for at, base in ((0.8, 1400), (2.4, 1850)):
        i = int(at * SR)
        L = int(0.12 * SR)
        tt = np.arange(L) / SR
        drips[i:i + L] += np.sin(2 * np.pi * (base - 500 * tt) * tt) * np.exp(-tt / 0.02) * 0.2
    env = np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5)
    return sf._norm((air + drips) * env, 0.35)


sf.EXTRA_SFX.update({
    "growl": sfx_growl,
    "gurgle": sfx_gurgle,
    "burp": sfx_burp,
    "pressurize": sfx_pressurize,
    "iron_clack": sfx_iron_clack,
    "spark": sfx_spark,
    "blast": sfx_blast,
    "flamethrower": sfx_flamethrower,
    "cavern": sfx_cavern,
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
