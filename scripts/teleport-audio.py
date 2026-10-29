"""Builds the audio stems for Teleport ("What if you could teleport, but kept
your momentum?"). Reuses the Slow Flight pipeline (scripts/slow-flight-audio.py)
with its paths pointed at this slug: same Gemini voice, word timestamps,
mastering, procedural SFX helpers and music-box score.

  python scripts/teleport-audio.py                  # everything
  python scripts/teleport-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

The numbers (checked): the ground moves at 1,037 mph x cos(latitude), so about
779 mph on the Connecticut shore (41.3 N). Landing speed is the difference of
the two ground velocities, |omega x chord|: at most a quarter mph per mile
jumped (omega = 0.2625 per hour). Ten miles north at 41 N lands at 1.7 mph;
42.3 N to 44.5 N (150 miles) lands at 27 mph. A chord parallel to the axis
(44.5 N 72.4 W to 44.4 S 72.4 W, Queulat, Patagonia: 5,550 miles) lands at 0.

Outputs:
  public/whatif/teleport/narration_vN.mp3
  public/whatif/teleport/score_vN.mp3
  public/whatif/teleport/sfx/*.wav
  src/whatif/teleport/data/wordTimestamps.json
  src/whatif/teleport/data/narrationCues.json
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

SLUG = "teleport"
VERSION = 2

LINES = [
    # Cold open
    ("a1", "What if you could teleport? Anywhere on Earth, in the blink of an eye.", 0.4),
    ("a2", "There is just one catch. You keep your momentum. Whatever speed you had when you left, you still have when you arrive.", 0.4),
    ("a3", "So when you teleport off a swing, you arrive on the porch still doing twelve miles an hour.", 0.2),
    ("a4", "Straight into Grandpa's hedge.", 1.0),
    # The spinning ground
    ("b1", "And it gets worse. Even standing still, you are not standing still.", 0.3),
    ("b2", "The Earth spins once a day. At the equator, the ground is moving at over a thousand miles an hour.", 0.3),
    ("b3", "Here, on the coast of Connecticut, it is about seven hundred and eighty. At the North Pole, it is zero.", 0.4),
    ("b4", "You never feel it, because everything around you is moving with you. The ground, the house, the hedge.", 0.4),
    ("b5", "Earth is also racing around the Sun at sixty seven thousand miles an hour. But every place on Earth does that together, so it cancels out.", 0.5),
    ("b6", "The spin does not. Jump somewhere far away, and the ground there is moving at a different speed, in a different direction.", 0.3),
    ("b7", "The rule is simple. For every mile you jump, you can land up to a quarter mile an hour too fast.", 1.0),
    # The problem
    ("c1", "Saturday, in July. Your little sister Tess turns nine today.", 0.3),
    ("c2", "She blows out her candles at four. And her birthday wish is a real snowball.", 0.4),
    ("c3", "It is ninety degrees outside, and it is already twenty past three.", 0.5),
    ("c4", "Easy, you think. The North Pole has snow all year.", 0.3),
    ("c5", "Grandpa Teo grabs your collar. He used to fly crop dusters, and he still thinks in maps.", 0.3),
    ("c6", "The ground at the pole does not move. Jump there in one go, and you hit the ice at seven hundred and eighty miles an hour.", 1.0),
    # The ladder
    ("d1", "Small jumps, though, are gentle.", 0.2),
    ("d2", "Ten miles north, and you land at under two miles an hour. Like stepping off an escalator.", 0.4),
    ("d3", "Grandpa climbs on your back with his map. Anything you are holding comes with you.", 0.4),
    ("d4", "Hop. A cornfield. Hop. A cow pasture. Hop. The end of a fishing dock.", 0.4),
    ("d5", "Then you do the math. The pole is about three hundred and forty hops away. At one hop every half minute, that is almost three hours there, and three hours back.", 0.5),
    ("d6", "The candles are in thirty five minutes.", 0.9),
    # The big hop
    ("e1", "So you try a bigger jump. A hundred and fifty miles, all at once.", 0.3),
    ("e2", "You land in a Vermont hayfield at twenty seven miles an hour.", 0.2),
    ("e3", "Hay bales go everywhere. So does Grandpa.", 1.0),
    # The axis
    ("f1", "Lying in the hay, Grandpa pulls the little globe off his keychain, and spins it.", 0.3),
    ("f2", "Every place on Earth circles the same axis, once a day.", 0.3),
    ("f3", "So if you jump parallel to that axis, straight through the planet, the ground where you land moves exactly like the ground you left.", 0.4),
    ("f4", "Same longitude. Same latitude. Just south of the equator, instead of north.", 0.4),
    ("f5", "And it is July. South of the equator, July is winter.", 0.9),
    # Patagonia
    ("g1", "You take his hand. Five and a half thousand miles, straight through the Earth.", 0.3),
    ("g2", "Landing speed, zero.", 0.4),
    ("g3", "You step onto snow in Patagonia, Chile, under a glacier hanging off the mountain.", 0.4),
    ("g4", "Same longitude, so the sun sits in the same spot in the sky. Just lower, and much colder.", 0.4),
    ("g5", "For once, Grandpa's flight jacket makes sense. You pack the biggest snowball you have ever made.", 0.9),
    # The run home
    ("h1", "The jump back is free too. One step, and you are in the hayfield again, holding a snowball in July.", 0.4),
    ("h2", "Twenty two hops from home. Eleven minutes to the candles.", 0.4),
    ("h3", "You hop south through the afternoon. Barns. Rivers. Backyards. The snowball drips down your sleeve.", 0.4),
    ("h4", "Two minutes. One. The last hop sets you down at the edge of the party, at walking pace.", 0.5),
    # Payoff
    ("k1", "Tess takes a deep breath over the candles.", 0.3),
    ("k2", "You hold out the snowball. It is a bit smaller than it was in Chile.", 0.4),
    ("k3", "She blows out the candles, grabs it, and hits you right in the face.", 1.0),
    # Hook
    ("m1", "That night, Grandpa spins the little globe again, and stops it on the equator.", 0.3),
    ("m2", "Jump from there to the North Pole, and you would arrive at a thousand miles an hour. Grandpa grins. That is not a crash. That is a launch.", 0.6),
    ("end", "Where would you jump? Tell us in the comments, and subscribe for the next what if.", 1.6),
]

# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
NUMBER_WORDS = {
    "1": "one", "2": "two", "4": "four", "9": "nine", "10": "ten", "11": "eleven", "12": "twelve",
    "22": "twenty two", "27": "twenty seven", "35": "thirty five", "150": "a hundred and fifty",
    "340": "three hundred and forty", "780": "seven hundred and eighty", "1,000": "a thousand", "1000": "a thousand",
    "67,000": "sixty seven thousand", "67000": "sixty seven thousand", "5,500": "five and a half thousand",
    "3:20": "twenty past three",
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
sf.SCORE_LUFS = -33.0

SR = sf.SR


# ---------------------------------------------------------------------------
# Episode sound effects (procedural, on the Slow Flight helpers)
# ---------------------------------------------------------------------------

def sfx_teleport(dur=0.9):
    """The jump: a bright upward 'vwip' with a shimmer tail."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 300 + 2600 * (t / dur) ** 0.5
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) * np.exp(-t / 0.18) + 0.4 * np.sin(2.01 * phase) * np.exp(-t / 0.1)
    rng = np.random.default_rng(5)
    shimmer = sf._band(rng.normal(0, 1, n), 4000, 11000, 2) * np.exp(-t / 0.35) * 0.35
    env = np.minimum(1, t / 0.01)
    return sf._norm((tone + shimmer) * env, 0.8)


def sfx_splash(dur=1.4):
    """A body into lake water: a low plunge and spray."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(12)
    plunge = np.sin(2 * np.pi * (120 - 60 * t) * t) * np.exp(-t / 0.12)
    spray = sf._band(rng.normal(0, 1, n), 900, 7000, 2) * np.exp(-t / 0.35)
    drops = np.zeros(n)
    for _ in range(40):
        pos = rng.integers(int(0.15 * SR), n - 800)
        L = 600
        tt = np.arange(L) / SR
        drops[pos:pos + L] += np.sin(2 * np.pi * rng.uniform(900, 2400) * tt) * np.exp(-tt / 0.01) * rng.uniform(0.1, 0.35)
    return sf._norm(plunge + spray + drops, 0.85)


def sfx_hay(dur=1.2):
    """Tumbling into hay bales: soft thumps and a crackly rustle."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(23)
    thumps = np.zeros(n)
    for k, at in enumerate((0.0, 0.18, 0.4)):
        pos = int(at * SR)
        tt = t[: n - pos]
        thumps[pos:] += np.sin(2 * np.pi * 70 * tt) * np.exp(-tt / 0.07) * (1 - k * 0.25)
    rustle = sf.sfx_rustle(dur)[:n] * 0.6
    return sf._norm(thumps + rustle, 0.85)


def sfx_crunch(dur=0.6):
    """A boot into fresh snow."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(41)
    out = np.zeros(n)
    for _ in range(70):
        pos = rng.integers(0, int(0.3 * SR))
        L = rng.integers(60, 300)
        out[pos:pos + L] += rng.normal(0, 1, L) * np.exp(-np.arange(L) / (L / 3))
    out = sf._band(out, 1200, 8000, 2) * np.exp(-t / 0.25)
    return sf._norm(out, 0.75)


def sfx_splat(dur=0.7):
    """A snowball in the face: a wet thud and a puff."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(52)
    thud = np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.05)
    puff = sf._band(rng.normal(0, 1, n), 600, 5000, 2) * np.exp(-t / 0.12)
    return sf._norm(thud + puff * 0.8, 0.85)


def sfx_cheer(dur=3.0):
    """A small backyard party cheering: claps plus a bright crowd 'yay'."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    claps = sf.sfx_applause(dur)[:n] * 0.6
    rng = np.random.default_rng(64)
    voices = np.zeros(n)
    for _ in range(6):
        f0 = rng.uniform(380, 620)
        f = f0 * (1 + 0.15 * np.sin(np.pi * np.clip(t / 0.9, 0, 1)))
        ph = 2 * np.pi * np.cumsum(f) / SR
        v = sum(np.sin(k * ph) * (0.55 ** k) for k in range(1, 6))
        voices += v * np.minimum(1, t / 0.08) * np.exp(-t / rng.uniform(0.6, 1.0))
    voices = sf._band(voices, 300, 4000, 2)
    return sf._norm(claps + voices * 0.5, 0.75)


def sfx_creak(dur=1.0):
    """Swing chains: a squeaky creak."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 900 + 300 * np.sin(2 * np.pi * 2.5 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    rng = np.random.default_rng(71)
    rough = 1 + 0.6 * sf._band(rng.normal(0, 1, n), 30, 200, 2)
    env = np.sin(np.pi * t / dur) ** 2
    return sf._norm(np.sin(ph) * rough * env * 0.6, 0.6)


sf.EXTRA_SFX.update({
    "teleport": sfx_teleport,
    "splash": sfx_splash,
    "hay": sfx_hay,
    "crunch": sfx_crunch,
    "splat": sfx_splat,
    "cheer": sfx_cheer,
    "creak": sfx_creak,
})

# ---------------------------------------------------------------------------
# `placeholder` mode: when the TTS quota is spent, lines that are not cached yet
# get silence of their estimated length and evenly spread word timings, marked
# so the next normal run deletes them and voices the real thing.
# ---------------------------------------------------------------------------
_voice = sf.tts_gemini_line


def _placeholder_line(text, dst_wav):
    cached = dst_wav.exists() and dst_wav.with_suffix(".json").exists()
    if cached or not PLACEHOLDER:
        return _voice(text, dst_wav)
    tokens = text.split()
    dur = 0.36 * len(tokens) + 0.3
    sf.da.write_wav(dst_wav, np.full(int(dur * SR), 1e-3), peak_db=-60.0)
    words = [[t, 0.1 + i * 0.36, 0.1 + (i + 1) * 0.36] for i, t in enumerate(tokens)]
    dst_wav.with_suffix(".json").write_text(json.dumps(words))
    dst_wav.with_suffix(".placeholder").write_text("estimated")
    print(f"  (placeholder: {dst_wav.stem} is silent, re-run when the TTS quota resets)")
    return words


PLACEHOLDER = "placeholder" in sys.argv
if not PLACEHOLDER:
    for marker in sf.VOICE_TMP.glob("*.placeholder"):
        for ext in (".wav", ".json", ".placeholder"):
            marker.with_suffix(ext).unlink(missing_ok=True)
sf.tts_gemini_line = _placeholder_line

if __name__ == "__main__":
    modes = (set(sys.argv[1:]) - {"placeholder"}) or {"narration", "sfx", "score"}
    if "narration" in modes:
        sf.build_narration()
    if "sfx" in modes:
        sf.build_sfx()
    if "score" in modes:
        sf.build_score()
    print(json.dumps({"slug": SLUG, "version": VERSION}))
