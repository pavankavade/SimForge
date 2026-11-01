"""Builds the audio stems for Reflexes ("What if you could react 10x faster,
but your body couldn't?"). Reuses the Slow Flight pipeline
(scripts/slow-flight-audio.py) with its paths pointed at this slug: same Gemini
voice, word timestamps, mastering, procedural SFX helpers and music-box score.

  python scripts/reflexes-audio.py                  # everything
  python scripts/reflexes-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

The numbers (checked, see docs/ifkit/reflexes-10x-script.md): a simple
reaction takes about 0.25 s; with the in-head part 10x faster, nerves (about
90 m/s, 200 mph) and muscle switch-on (0.03-0.05 s) leave about 0.1 s. The
glass falls 75 cm in 0.39 s. Slow pain (C fibres, ~1.5 m/s) needs ~1.1 s from
the toe. A 40 mph ball covers 20 ft in 0.33 s; a sidestep needs ~0.35 s. The
ladder tips as an inverted pendulum (tau 0.45 s): 1 deg to 5 deg in 1.04 s,
14 deg at 1.5 s, the ground at 2.34 s.

Outputs:
  public/whatif/reflexes/narration_vN.mp3
  public/whatif/reflexes/score_vN.mp3
  public/whatif/reflexes/sfx/*.wav
  src/whatif/reflexes/data/wordTimestamps.json
  src/whatif/reflexes/data/narrationCues.json
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

SLUG = "reflexes"
VERSION = 3

LINES = [
    # The milk glass
    ("a1", "What if your brain worked ten times faster than everyone else's? Every thought. Every decision. Every reaction.", 0.4),
    ("a2", "There is just one catch. Your body does not.", 0.5),
    ("a3", "Breakfast. Your little sister Tess reaches for the cereal, and her elbow clips a full glass of milk.", 0.3),
    ("a4", "To everyone else, it is a blink. To you, the glass hangs at the edge of the table like it is thinking about it.", 0.4),
    ("a5", "You know exactly what to do. Catch it. The decision takes you almost no time at all.", 0.3),
    ("a6", "Then you tell your hand to move. And you wait.", 0.6),
    ("a7", "Your arm drifts across the table like it is swimming through honey. The glass tips. The milk pours out in a slow white ribbon.", 0.4),
    ("a8", "Four whole seconds, for you, of watching your own hand crawl.", 0.3),
    ("a9", "Your fingers close around the glass an inch above the floor.", 0.4),
    ("a10", "Tess did not even see you move. To her, you just snatched it out of the air.", 0.3),
    ("a11", "To you, it was the slowest catch of your life.", 1.0),
    # Why your body can't keep up
    ("b1", "Here is why. Reacting to anything takes the average person about a quarter of a second.", 0.3),
    ("b2", "Most of that happens inside your head. Your eyes send the picture, your brain works out what it is, and decides what to do.", 0.3),
    ("b3", "That part is now ten times faster.", 0.3),
    ("b4", "But then the order has to travel down your nerves, at about two hundred miles an hour. That is fast for a car. It is slow for a thought.", 0.4),
    ("b5", "And when it reaches the muscle, the muscle needs about a twentieth of a second just to switch on.", 0.4),
    ("b6", "None of that got faster. So your brain is ten times quicker, but you only react about two and a half times quicker.", 0.4),
    ("b7", "In a race, you would leave the blocks a tenth of a second after the gun. Right on the line. Any faster, and the judges call it a false start.", 0.5),
    ("b8", "And here is the strange part. Your thoughts run ten times faster, so the whole world looks ten times slower. Including you.", 0.9),
    # Life in slow motion
    ("c1", "Life in slow motion is not what the movies promised.", 0.3),
    ("c2", "Every time you blink, the world goes dark for a second and a half.", 0.4),
    ("c3", "Talking is torture. You finish a sentence in your head, and then you sit there while your mouth spells it out, one, slow, word, at a time.", 0.4),
    ("c4", "A six hour school day feels like sixty. One math class feels like a full day at work.", 0.4),
    ("c5", "And then you stub your toe on the bed frame.", 0.3),
    ("c6", "The first sharp sting arrives fast. But the deep, throbbing ache travels on slower nerves, at about walking speed.", 0.3),
    ("c7", "So you get to stand there, for eleven long seconds, knowing exactly what is coming.", 0.4),
    ("c8", "And then it arrives.", 1.0),
    ("c9", "Grandpa Teo thinks you have become very wise lately. You just have ten times longer to think before you speak.", 0.6),
    # Dodgeball: faster vs earlier
    ("d1", "Friday is the school dodgeball tournament. This, you think, is where it finally pays off.", 0.3),
    ("d2", "Marcus from the eighth grade throws the hardest ball in school. Forty miles an hour.", 0.3),
    ("d3", "From twenty feet away, it reaches you in a third of a second. For you, that is more than three seconds.", 0.3),
    ("d4", "Plenty of time. You see it leave his hand. You see the seams turning. You decide to step left.", 0.3),
    ("d5", "Your legs start the step.", 0.2),
    ("d6", "The ball is already halfway.", 0.2),
    ("d7", "Moving your whole body sideways takes about a third of a second. Your brain is ten times faster. Your legs are not.", 0.4),
    ("d8", "You watch it come the whole way. Every inch. Right into your stomach.", 1.0),
    ("d9", "On the bench, you replay it. Over and over. You cannot be faster than the ball. Nobody can.", 0.3),
    ("d10", "But Marcus is not that fast either. Before the ball leaves his hand, his arm has to wind back. That takes a quarter of a second.", 0.4),
    ("d11", "Everyone else watches the ball. You start watching his shoulder.", 0.4),
    ("d12", "Next round. His shoulder twists back, and you are already moving.", 0.3),
    ("d13", "The ball flies through the spot where your stomach used to be.", 0.4),
    ("d14", "You are not faster than anyone. You are earlier.", 1.0),
    ("d15", "Your team wins the tournament. Marcus asks if you can see the future. You tell him you just watch shoulders.", 0.6),
    # The ladder
    ("e1", "Sunday. Grandpa Teo is up on the stepladder, clearing leaves out of the gutter. Your job is to hold the ladder.", 0.3),
    ("e2", "Tess calls you from the porch. Lemonade. You let go, just for a moment.", 0.3),
    ("e3", "You are four steps away when Grandpa leans a little too far.", 0.4),
    ("e4", "The ladder rocks up onto two legs. One degree.", 0.3),
    ("e5", "Nobody else would notice it yet. To everyone else, one degree is nothing.", 0.3),
    ("e6", "To you, it is the start of a fall.", 0.4),
    ("e7", "And falls have a secret. They start slow.", 0.3),
    ("e8", "A tipping ladder barely moves at first. It takes a whole second to lean five degrees. Then it speeds up, and a little over a second later, it hits the ground.", 0.4),
    ("e9", "You cannot run any faster than you could yesterday. Four steps take you about a second and a half.", 0.3),
    ("e10", "A normal kid would notice the fall at five degrees, react, and start running. They would arrive a third of a second after Grandpa hit the grass.", 0.4),
    ("e11", "But you saw it at one degree.", 0.4),
    ("e12", "You are already running. Fourteen slow seconds, for you, of watching the ladder lean, and lean, and lean.", 0.4),
    ("e13", "Your hands hit the rail at fourteen degrees.", 0.3),
    ("e14", "At fourteen degrees, it is still just a heavy push.", 0.3),
    ("e15", "You shove. The legs thump back onto the grass. Grandpa grabs the gutter, and the gutter holds.", 0.4),
    ("e16", "Grandpa looks down at you. Then at Tess, who is still holding out the lemonade, and has no idea anything happened.", 1.0),
    # You're not fast. You're early.
    ("f1", "That night, Grandpa says you are the fastest kid he has ever seen.", 0.3),
    ("f2", "You are not. Your legs are exactly as slow as everyone's. But everyone else notices a fall when it is already a fall. You notice it while it is still a wobble.", 0.5),
    ("f3", "At breakfast, Tess's elbow clips the milk again.", 0.3),
    ("f4", "You sigh, and start the four second journey of your hand across the table.", 1.0),
    ("end", "Would you take the deal? A brain ten times faster, stuck in the same old body? Tell us in the comments, and subscribe for the next what if.", 1.6),
]

# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
NUMBER_WORDS = {
    "1": "one", "3": "three", "4": "four", "5": "five", "6": "six", "10": "ten", "11": "eleven",
    "14": "fourteen", "20": "twenty", "40": "forty", "60": "sixty", "200": "two hundred",
    "8th": "eighth", "10x": "ten times",
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
sf.SCORE_LUFS = -37.0  # same bed level as Teleport: the score sits well behind the voice

SR = sf.SR


# ---------------------------------------------------------------------------
# Episode sound effects (procedural, on the Slow Flight helpers)
# ---------------------------------------------------------------------------

def sfx_slowmo(dur=1.6):
    """Time stretching: a deep falling 'vwoomm' with a muffled tail."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 220 * np.exp(-t / 0.5) + 45
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.35 * np.sin(2 * ph)) * np.minimum(1, t / 0.05) * np.exp(-t / 0.7)
    rng = np.random.default_rng(3)
    air = sf._band(rng.normal(0, 1, n), 120, 900, 2) * np.exp(-t / 0.4) * 0.4
    return sf._norm(tone + air, 0.8)


def sfx_glass(dur=0.8):
    """Fingers closing on a glass: a bright clink with a ring."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) * a for f, d, a in ((2350, 0.25, 1), (3920, 0.15, 0.5), (5480, 0.08, 0.3)))
    rng = np.random.default_rng(9)
    tick = sf._band(rng.normal(0, 1, n), 3000, 9000, 2) * np.exp(-t / 0.006)
    return sf._norm(ring * 0.7 + tick, 0.7)


def sfx_pour(dur=2.4):
    """Milk glugging out in a ribbon: a bubbly, liquid burble."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(17)
    out = np.zeros(n)
    for _ in range(90):
        pos = rng.integers(0, n - 2400)
        L = 2400
        tt = np.arange(L) / SR
        f0 = rng.uniform(300, 900)
        out[pos:pos + L] += np.sin(2 * np.pi * f0 * (1 + 3 * tt) * tt) * np.exp(-tt / 0.02) * rng.uniform(0.2, 0.6)
    bed = sf._band(rng.normal(0, 1, n), 400, 2500, 2) * 0.25
    env = np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.4)
    return sf._norm((out + bed) * env, 0.6)


def sfx_whistle(dur=0.9):
    """A gym coach's whistle: a pea trill."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 2900 * (1 + 0.04 * np.sign(np.sin(2 * np.pi * 28 * t)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    rng = np.random.default_rng(21)
    breath = sf._band(rng.normal(0, 1, n), 2000, 6000, 2) * 0.2
    env = np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.08)
    return sf._norm((np.sin(ph) + breath) * env, 0.55)


def sfx_thwack(dur=0.6):
    """A rubber dodgeball: a hollow 'bonk'."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    body = np.sin(2 * np.pi * (260 - 120 * t) * t) * np.exp(-t / 0.06)
    rng = np.random.default_rng(31)
    slap = sf._band(rng.normal(0, 1, n), 800, 5000, 2) * np.exp(-t / 0.015)
    return sf._norm(body + slap * 0.8, 0.85)


def sfx_bounce(dur=0.5):
    """The same ball bouncing off the gym floor, lighter."""
    return sf._norm(sfx_thwack(dur) * np.exp(-np.linspace(0, dur, int(dur * SR)) / 0.08), 0.6)


def sfx_crowd(dur=3.0):
    """A gym crowd: a roomy murmur that swells into a cheer."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(44)
    murmur = sf._band(rng.normal(0, 1, n), 250, 2500, 2)
    swell = 0.4 + 0.6 * np.sin(np.pi * np.clip(t / dur, 0, 1))
    claps = sf.sfx_applause(dur)[:n] * 0.5
    return sf._norm(murmur * swell * 0.5 + claps, 0.7)


def sfx_ouch(dur=1.2):
    """The ache arriving: a low throb that pulses twice."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    throb = np.sin(2 * np.pi * 55 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.2 * t - np.pi / 2)) * np.exp(-t / 0.7)
    return sf._norm(throb, 0.8)


def sfx_ladder(dur=0.9):
    """Aluminium ladder feet thumping back onto grass, with a rattle."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    thump = np.sin(2 * np.pi * 85 * t) * np.exp(-t / 0.08)
    rattle = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.12) for f in (720, 1130, 1610)) * 0.2
    return sf._norm(thump + rattle, 0.85)


def sfx_tick(dur=0.25):
    """A soft clock tick for the felt-seconds counter."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    return sf._norm(np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.01), 0.5)


sf.EXTRA_SFX.update({
    "slowmo": sfx_slowmo,
    "glass": sfx_glass,
    "pour": sfx_pour,
    "whistle": sfx_whistle,
    "thwack": sfx_thwack,
    "bounce": sfx_bounce,
    "crowd": sfx_crowd,
    "ouch": sfx_ouch,
    "ladder": sfx_ladder,
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
