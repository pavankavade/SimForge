"""Builds the audio stems for Heal ("What if you healed 100x faster, but you
were always starving?"). Reuses the Slow Flight pipeline
(scripts/slow-flight-audio.py) with its paths pointed at this slug: same Gemini
voice, word timestamps, mastering, procedural SFX helpers and music-box score.

  python scripts/heal-audio.py                  # everything
  python scripts/heal-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

The numbers (see docs/ifkit/heal-100x-script.md): normal healing times divided
by 100 (paper cut 3 days -> ~40 min, scraped knee 2 weeks -> ~3 h, kid forearm
fracture 6 weeks -> ~10 h). A long-bone fracture raises resting energy use by
about 15-20% (secondary sources): ~250 kcal/day x 42 days ~ 10,000 kcal, so
~1,000 kcal/h over the night (marathon pace), ~1,160 W of heat, and ~1.3 kg of
fat (7,700 kcal/kg) drawn before the food is digested.

Outputs:
  public/whatif/heal/narration_vN.mp3
  public/whatif/heal/score_vN.mp3
  public/whatif/heal/sfx/*.wav
  src/whatif/heal/data/wordTimestamps.json
  src/whatif/heal/data/narrationCues.json
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

SLUG = "heal"
VERSION = 1

LINES = [
    # The paper cut
    ("a1", "What if your body healed one hundred times faster than everyone else's? Every cut. Every bruise. Every broken bone.", 0.4),
    ("a2", "There is just one catch. You are always, always hungry.", 0.5),
    ("a3", "Monday morning. You slice your thumb open on the cereal box.", 0.3),
    ("a4", "A paper cut normally takes about three days to close. For you, it takes forty minutes.", 0.3),
    ("a5", "You watch the edges creep together while you eat. And eat.", 0.3),
    ("a6", "Your first bowl of cereal is gone. Then your second. Then your third.", 0.3),
    ("a7", "Tess stops chewing and stares at you.", 0.4),
    ("a8", "By the time the school bus comes, the cut is gone. And you are hungry again.", 1.0),
    # Healing is building
    ("b1", "Here is why. Healing is not magic. It is building.", 0.3),
    ("b2", "New skin, new blood vessels, new bone. Your body builds all of it from what you eat. Protein for the bricks, calories for the work.", 0.4),
    ("b3", "Normally, that bill is spread over days or weeks. A little extra every meal. You never notice it.", 0.3),
    ("b4", "Heal one hundred times faster, and the whole bill arrives at once.", 0.4),
    ("b5", "And food is slow. A meal takes hours to digest. So while you wait, your body pays from its savings.", 0.3),
    ("b6", "First your fat. Then, if the healing is big enough, your muscle.", 0.9),
    # Always hungry
    ("c1", "So you learn the rules.", 0.3),
    ("c2", "A scraped knee normally takes two weeks. You heal it in about three hours, and it costs you a candy bar.", 0.4),
    ("c3", "A bruise from gym class is gone by lunch. So is your lunch. And your friend's.", 0.4),
    ("c4", "You carry snacks everywhere. Granola bars in every pocket. Peanut butter in your backpack.", 0.3),
    ("c5", "Grandpa Teo looks at the grocery bill and asks if you are feeding a horse.", 0.5),
    ("c6", "And every time you heal, you get warm. Building burns energy, and burning energy makes heat.", 0.3),
    ("c7", "After a bad fall off your bike, you sit in class glowing like a radiator, sweating through your shirt.", 1.0),
    # The broken arm
    ("d1", "Saturday, at the skate park, Marcus dares you to try the big ramp.", 0.3),
    ("d2", "You think, what is the worst that can happen? I heal.", 0.4),
    ("d3", "You drop in. You catch the lip. You land on your arm.", 0.3),
    ("d4", "Crack.", 1.0),
    ("d5", "A broken arm takes a kid about six weeks to heal. For you, that is about ten hours.", 0.3),
    ("d6", "Which sounds great, until Grandpa remembers something. A bone heals in whatever shape it is in.", 0.4),
    ("d7", "For a normal kid, there is time to wait for the doctor. For you, the bone starts knitting within hours.", 0.3),
    ("d8", "If nobody sets it straight soon, it will heal crooked.", 0.4),
    ("d9", "Grandpa drives faster than you have ever seen him drive.", 0.3),
    ("d10", "The doctor straightens your arm and puts on a cast. She says, see you in six weeks. You say, see you tomorrow.", 0.6),
    ("d11", "That night, your body starts the bill.", 0.3),
    ("d12", "Six weeks of healing costs about ten thousand extra calories. You are paying it in one night.", 0.3),
    ("d13", "That is about as hard as a marathon runner works. Except you are lying in bed.", 0.4),
    ("d14", "You burn up like a fever. You wake up at midnight starving. And at two. And at four.", 0.4),
    ("d15", "Grandpa cooks pancakes in his pajamas until the batter runs out.", 0.4),
    ("d16", "By morning, the bone is whole. And your jeans are loose. Your body ate more than a kilo of itself to finish the job.", 0.5),
    ("d17", "You do not try the big ramp again. Healing fast does not mean it is free.", 1.0),
    # The wagon
    ("e1", "Thanksgiving. The whole family is at Grandpa's house, on top of the steepest street in town.", 0.3),
    ("e2", "Tess is giving her stuffed rabbit a ride in the old red wagon.", 0.3),
    ("e3", "She lets go of the handle for one second.", 0.4),
    ("e4", "The wagon rolls. Then it rolls faster. Straight down the hill, toward the cars at the bottom.", 0.3),
    ("e5", "And Tess is running after it.", 0.4),
    ("e6", "You do the math faster than you ever have.", 0.3),
    ("e7", "If Tess gets hurt, she heals like everyone else. Weeks. Maybe months.", 0.3),
    ("e8", "If you get hurt, it costs you dinner.", 0.4),
    ("e9", "You sprint past her, grab the wagon, and dig your heels in. It drags you down the hill and slams you into the curb.", 0.3),
    ("e10", "Bruised ribs. Scraped everything. The wagon stops an inch from the road.", 0.4),
    ("e11", "Tess hugs her rabbit. Then she hugs you. You are already healing. And already starving.", 1.0),
    # Healing is a budget
    ("f1", "At dinner, nobody says a word when you take the whole turkey leg. Or the second one.", 0.3),
    ("f2", "Grandpa just slides the mashed potatoes across the table.", 0.4),
    ("f3", "Healing was never slow because your body is lazy. It is slow because your body is on a budget.", 0.4),
    ("f4", "Everyone else pays a little at a time, over weeks. You pay all at once, at dinner.", 0.4),
    ("f5", "And Tess? She gives you her slice of pie.", 1.0),
    ("end", "Would you take the deal? Heal anything overnight, but eat a week of food to do it? Tell us in the comments, and subscribe for the next what if.", 1.6),
]

# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
NUMBER_WORDS = {
    "1": "one", "2": "two", "3": "three", "4": "four", "6": "six", "10": "ten", "40": "forty",
    "100": "one hundred", "10,000": "ten thousand", "10000": "ten thousand", "100x": "one hundred times",
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

sf.SCORE_STYLE = "musicbox"
sf.SCORE_LUFS = -37.0  # same bed level as Teleport and Reflexes: the score sits well behind the voice

SR = sf.SR


# ---------------------------------------------------------------------------
# Episode sound effects (procedural, on the Slow Flight helpers)
# ---------------------------------------------------------------------------

def sfx_heal(dur=1.4):
    """Tissue knitting: a soft rising shimmer with a warm hum under it."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 520 + 380 * t / dur
    ph = 2 * np.pi * np.cumsum(f) / SR
    shimmer = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    hum = np.sin(2 * np.pi * 110 * t) * 0.4
    env = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.4)
    return sf._norm((shimmer * 0.6 + hum) * env, 0.55)


def sfx_stomach(dur=1.6):
    """A long, wobbly stomach rumble."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 70 + 30 * np.sin(2 * np.pi * 1.3 * t) + 25 * np.sin(2 * np.pi * 3.7 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    rng = np.random.default_rng(5)
    gurgle = sf._band(rng.normal(0, 1, n), 150, 700, 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * t)) * 0.4
    env = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.5)
    return sf._norm((np.sin(ph) * (1 + 0.6 * np.sin(ph * 0.5)) + gurgle) * env, 0.8)


def sfx_skate(dur=2.0):
    """Skateboard wheels on concrete: a gritty rolling roar."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(12)
    grit = sf._band(rng.normal(0, 1, n), 200, 3000, 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 11 * t))
    rumble = np.sin(2 * np.pi * 60 * t) * 0.3
    env = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.3)
    return sf._norm((grit + rumble) * env, 0.6)


def sfx_wagon(dur=2.4):
    """A metal wagon rolling over pavement joints: rattle and clunks."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(23)
    roll = sf._band(rng.normal(0, 1, n), 300, 2500, 2) * 0.5
    clunks = np.zeros(n)
    for k in np.arange(0.1, dur - 0.2, 0.28):
        i = int(k * SR)
        L = int(0.15 * SR)
        tt = np.arange(L) / SR
        clunks[i:i + L] += sum(np.sin(2 * np.pi * f * tt) for f in (180, 620, 1350)) * np.exp(-tt / 0.03)
    env = np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.3)
    return sf._norm((roll + clunks * 0.4) * env, 0.65)


def sfx_engine(dur=2.6):
    """Grandpa's old car revving away: a rising engine growl."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 45 + 70 * (1 - np.exp(-t / 0.8))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sign(np.sin(ph)) * 0.3 + np.sin(2 * ph) * 0.5
    rng = np.random.default_rng(29)
    tone = sf._band(tone + rng.normal(0, 0.2, n), 40, 1800, 2)
    env = np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.6)
    return sf._norm(tone * env, 0.7)


def sfx_cast(dur=0.5):
    """A plaster cast knocking on a table: a dull hollow knock."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    rng = np.random.default_rng(37)
    tap = sf._band(rng.normal(0, 1, n), 600, 3000, 2) * np.exp(-t / 0.01)
    return sf._norm(body + tap * 0.6, 0.7)


def sfx_curb(dur=0.8):
    """Body and wagon slamming into a curb: a heavy thud and a metal clang."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    thud = np.sin(2 * np.pi * (90 - 40 * t) * t) * np.exp(-t / 0.1)
    clang = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.15) for f in (540, 980, 1720)) * 0.25
    return sf._norm(thud + clang, 0.9)


def sfx_slowmo(dur=1.6):
    """Time stretching while Kit does the math: a deep falling 'vwoomm' with a muffled tail."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 220 * np.exp(-t / 0.5) + 45
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.35 * np.sin(2 * ph)) * np.minimum(1, t / 0.05) * np.exp(-t / 0.7)
    rng = np.random.default_rng(3)
    air = sf._band(rng.normal(0, 1, n), 120, 900, 2) * np.exp(-t / 0.4) * 0.4
    return sf._norm(tone + air, 0.8)


def sfx_tick(dur=0.25):
    """A soft clock tick for the healing counter."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    return sf._norm(np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.01), 0.5)


sf.EXTRA_SFX.update({
    "heal": sfx_heal,
    "stomach": sfx_stomach,
    "skate": sfx_skate,
    "wagon": sfx_wagon,
    "engine": sfx_engine,
    "cast": sfx_cast,
    "curb": sfx_curb,
    "slowmo": sfx_slowmo,
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
