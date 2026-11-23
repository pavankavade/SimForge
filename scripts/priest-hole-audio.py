"""Builds the audio stems for Priest Hole ("How a staircase becomes a priest hole"), an OmnixxLabs
shelter short. Reuses the Slow Flight pipeline (scripts/slow-flight-audio.py) with its paths
pointed at this slug: same Gemini voice, word timestamps, mastering and procedural SFX helpers.
The score is the series theme.

  python scripts/priest-hole-audio.py                  # everything
  python scripts/priest-hole-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.
Script, facts and sources: docs/shelter/priest-hole-script.md.

Outputs:
  public/shelter/priest-hole/narration_vN.mp3
  public/shelter/priest-hole/score_vN.mp3
  public/shelter/priest-hole/sfx/*.wav
  src/shelter/priest-hole/data/wordTimestamps.json
  src/shelter/priest-hole/data/narrationCues.json
"""

import importlib.util
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("slow_flight_audio", ROOT / "scripts" / "slow-flight-audio.py")
sf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sf)

SLUG = "priest-hole"
VERSION = 4

LINES = [
    ("l1a", "Priest hunters are pounding on your door, and you have thirty seconds to vanish.", 0.3),
    ("l1b", "So you squeeze in under your staircase. But a loose step rattles under the first boot.", 0.7),
    ("l2a", "So you hang that step on a hidden hinge, and bolt it from below.", 0.3),
    ("l2b", "But the hunters tap every panel, listening for a hollow sound.", 0.7),
    ("l3a", "So you wall yourself in with brick. Now every knock just thuds.", 0.3),
    ("l3b", "Then they measure the house with a rope. Sixty feet outside. Fifty-five inside.", 0.7),
    ("l4a", "So you climb into the one space nobody measures: the old toilet shaft inside the wall.", 0.3),
    ("l4b", "But they don't leave. They camp in your kitchen for a week, waiting for you to starve.", 0.7),
    ("l4c", "So a friend upstairs pours soup down a hollow reed through the floor. It tastes like reed. But it's hot.", 0.7),
    ("l5a", "Then they start tearing the panels off the walls.", 0.3),
    ("l5b", "So you give them something to find: an empty hide, with your real door hidden at the back. A double hide.", 0.3),
    ("l5c", "They find it, cheer, find nothing but cobwebs, thump the wall, and march off with your candlestick.", 0.8),
    ("l6a", "And that crooked step everyone trips on? Not a mistake. Nobody suspects a badly built staircase.", 0.7),
    ("l6b", "Only the cat knows. Give her a cushion, light a candle, and stay very quiet.", 0.8),
    ("end", "Congratulations. You have built a priest hole.", 1.6),
]

# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
NUMBER_WORDS = {"30": "thirty", "60": "sixty", "55": "fifty-five", "55.": "fifty-five."}

# Point the Slow Flight pipeline at this slug (its functions read these module globals).
sf.SLUG = SLUG
sf.VERSION = VERSION
sf.LINES = LINES
sf.NUMBER_WORDS = NUMBER_WORDS
sf.LEAD_IN = 0.45
sf.EP = ROOT / "public" / "shelter" / SLUG
sf.SFX_DIR = sf.EP / "sfx"
sf.DATA = ROOT / "src" / "shelter" / SLUG / "data"
sf.TMP = ROOT / "out" / f"audio-tmp-{SLUG}"
VOICE_RAW = sf.TMP / "gemini"
# The series voice reads this script slowly (~95 s); a gentle tempo (pitch kept) brings it to ~86 s.
TEMPO = 1.1
sf.VOICE_TMP = sf.TMP / f"gemini-x{TEMPO}"
for d in (sf.EP, sf.SFX_DIR, sf.DATA, VOICE_RAW, sf.VOICE_TMP):
    d.mkdir(parents=True, exist_ok=True)

_voice_line = sf.tts_gemini_line


def _voice_line_fast(text, dst_wav):
    """Voices (or reads from the cache) the line at normal speed, then a sped-up copy at `dst_wav`."""
    words = _voice_line(text, VOICE_RAW / dst_wav.name)
    sf.da.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(VOICE_RAW / dst_wav.name), "-af", f"atempo={TEMPO}", str(dst_wav)])
    return [[w, s / TEMPO, e / TEMPO] for w, s, e in words]


sf.tts_gemini_line = _voice_line_fast

SR = sf.SR


def _env(t, dur, a, r):
    return np.minimum(1, t / a) * np.minimum(1, np.maximum(0, dur - t) / r)


# ---------------------------------------------------------------------------
# Episode sound effects (procedural, on the Slow Flight helpers)
# ---------------------------------------------------------------------------

def _knock(dur, f0, decay, hollow, seed):
    """One knuckle on wood: a click plus a body tone; `hollow` adds the ringing cavity behind it."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    click = sf._band(rng.normal(0, 1, n), 1500, 6000, 2) * np.exp(-t / 0.004)
    body = np.sin(2 * np.pi * f0 * t) * np.exp(-t / decay)
    cavity = (np.sin(2 * np.pi * f0 * 0.62 * t) + 0.5 * np.sin(2 * np.pi * f0 * 1.71 * t)) * np.exp(-t / (decay * 3.5)) * hollow
    return click * 0.5 + body + cavity


def sfx_knock_hollow(dur=1.2):
    """Three knocks on a panel with a cavity behind it: woody and ringing."""
    out = np.zeros(int(dur * SR))
    for k, at in enumerate((0.0, 0.2, 0.4)):
        s = _knock(0.6, 230, 0.05, 0.9, 11 + k)
        i = int(at * SR)
        out[i:i + len(s)] += s[: len(out) - i]
    return sf._norm(out, 0.8)


def sfx_knock_solid(dur=1.0):
    """Three knocks on solid brick behind plaster: short, dead thuds."""
    out = np.zeros(int(dur * SR))
    for k, at in enumerate((0.0, 0.2, 0.4)):
        s = _knock(0.3, 120, 0.018, 0.0, 21 + k)
        i = int(at * SR)
        out[i:i + len(s)] += s[: len(out) - i]
    return sf._norm(out, 0.8)


def sfx_pound(dur=1.6):
    """Fists hammering an oak door: four heavy blows with the frame rattling."""
    out = np.zeros(int(dur * SR))
    rng = np.random.default_rng(31)
    for k, at in enumerate((0.0, 0.28, 0.56, 0.84)):
        n = int(0.5 * SR)
        t = np.arange(n) / SR
        boom = np.sin(2 * np.pi * (85 - 30 * t) * t) * np.exp(-t / 0.09)
        rattle = sf._band(rng.normal(0, 1, n), 600, 3000, 2) * np.exp(-t / 0.05) * 0.4
        i = int(at * SR)
        out[i:i + n] += (boom + rattle)[: len(out) - i]
    return sf._norm(out, 0.9)


def sfx_door_burst(dur=1.4):
    """The door kicked in: splintering wood, a slam against the wall."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(41)
    crack = sf._band(rng.normal(0, 1, n), 700, 6000, 2) * np.exp(-t / 0.12)
    slam = np.sin(2 * np.pi * (70 - 20 * t) * t) * np.exp(-t / 0.15)
    hit = np.zeros(n)
    i = int(0.32 * SR)
    m = n - i
    tt = np.arange(m) / SR
    hit[i:] = np.sin(2 * np.pi * 95 * tt) * np.exp(-tt / 0.1) * 0.8 + sf._band(rng.normal(0, 1, m), 300, 2500, 2) * np.exp(-tt / 0.06) * 0.4
    return sf._norm(crack * 0.7 + slam + hit, 0.9)


def sfx_creak(dur=0.9):
    """A loose wooden step: a squeaky creak with a rattle."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(51)
    f = 380 + 160 * np.sin(2 * np.pi * 1.3 * t) + 40 * rng.normal(0, 1, n).cumsum() / np.sqrt(n)
    phase = 2 * np.pi * np.cumsum(f) / SR
    saw = (phase / np.pi) % 2 - 1
    grain = (np.sin(2 * np.pi * 28 * t) > 0.2).astype(float)
    creak = sf._band(saw * grain, 300, 3000, 2) * _env(t, dur, 0.05, 0.3)
    rattle = np.zeros(n)
    for at in (0.05, 0.13, 0.22, 0.3):
        s = _knock(0.15, 300, 0.012, 0, int(at * 100))
        k = int(at * SR)
        rattle[k:k + len(s)] += s[: n - k]
    return sf._norm(creak * 0.7 + rattle * 0.6, 0.8)


def sfx_bolt(dur=0.6):
    """An iron bolt shot home: a scrape and a clack."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(61)
    scrape = sf._band(rng.normal(0, 1, n), 1500, 7000, 2) * _env(t, 0.22, 0.02, 0.05) * (t < 0.22)
    clack = np.zeros(n)
    i = int(0.22 * SR)
    tt = np.arange(n - i) / SR
    clack[i:] = (np.sin(2 * np.pi * 1450 * tt) + 0.6 * np.sin(2 * np.pi * 2900 * tt)) * np.exp(-tt / 0.03)
    return sf._norm(scrape * 0.5 + clack, 0.8)


def sfx_brick(dur=0.5):
    """One brick laid: a gritty scrape of mortar and a stony tap."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(71)
    grit = sf._band(rng.normal(0, 1, n), 2000, 8000, 2) * np.exp(-t / 0.08) * 0.5
    tap = np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.02) + sf._band(rng.normal(0, 1, n), 400, 2500, 2) * np.exp(-t / 0.03)
    return sf._norm(grit + tap, 0.75)


def sfx_rope(dur=1.4):
    """A rope pulled taut and slid along stone."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(81)
    rub = sf._band(rng.normal(0, 1, n), 800, 5000, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t) ** 2)
    return sf._norm(rub * _env(t, dur, 0.1, 0.4), 0.5)


def sfx_pour(dur=2.2):
    """Soup poured down a reed: a thin trickle with gurgles."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(91)
    trickle = sf._band(rng.normal(0, 1, n), 1200, 5000, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t) * np.sin(2 * np.pi * 2.3 * t))
    gurgle = np.zeros(n)
    for k in range(9):
        at = rng.uniform(0.1, dur - 0.2)
        tt = t - at
        m = tt >= 0
        gurgle[m] += np.sin(2 * np.pi * (300 + 600 * tt[m] + 60 * k) * tt[m]) * np.exp(-tt[m] / 0.04)
    return sf._norm((trickle * 0.5 + gurgle * 0.5) * _env(t, dur, 0.2, 0.4), 0.6)


def sfx_rip(dur=0.9):
    """A board prised off: nails squealing out, then the crack of it coming free."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(101)
    squeal = np.sin(2 * np.pi * (900 + 500 * t) * t) * _env(t, 0.45, 0.05, 0.1) * (t < 0.45) * 0.3
    crack = np.zeros(n)
    i = int(0.42 * SR)
    tt = np.arange(n - i) / SR
    crack[i:] = sf._band(rng.normal(0, 1, n - i), 500, 6000, 2) * np.exp(-tt / 0.07)
    return sf._norm(squeal + crack, 0.85)


def sfx_clatter(dur=1.0):
    """A board falling flat on a stone floor."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(111)
    out = np.zeros(n)
    for at, g in ((0.0, 1.0), (0.09, 0.5), (0.16, 0.25)):
        k = int(at * SR)
        tt = np.arange(n - k) / SR
        out[k:] += (np.sin(2 * np.pi * 160 * tt) * np.exp(-tt / 0.05) + sf._band(rng.normal(0, 1, n - k), 400, 4000, 2) * np.exp(-tt / 0.04)) * g
    return sf._norm(out, 0.85)


def sfx_cheer(dur=1.6):
    """Three rough men's voices shouting "ha!": formant-shaped buzz."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k, (f0, at) in enumerate(((118, 0.0), (132, 0.06), (104, 0.11))):
        tt = t - at
        m = tt >= 0
        f = f0 * (1 + 0.25 * np.exp(-tt[m] / 0.2))
        phase = 2 * np.pi * np.cumsum(f) / SR
        buzz = sum(np.sin(h * phase) / h for h in range(1, 14))
        env = np.minimum(1, tt[m] / 0.03) * np.exp(-tt[m] / 0.45)
        out[m] += buzz * env
    return sf._norm(sf._band(out, 250, 2600, 2), 0.7)


def sfx_room(dur=8.0):
    """An old house at night: low room tone, a faint wind at the shutters."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(121)
    tone = sf._band(rng.normal(0, 1, n), 40, 300, 2) * 0.6
    wind = sf._band(rng.normal(0, 1, n), 300, 1400, 2) * (0.3 + 0.2 * np.sin(2 * np.pi * 0.21 * t))
    return sf._norm((tone + wind) * _env(t, dur, 0.8, 0.8), 0.4)


def sfx_meow(dur=0.9):
    """A small, sleepy meow."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 520 + 260 * np.sin(np.pi * np.clip(t / 0.7, 0, 1)) - 120 * t
    phase = 2 * np.pi * np.cumsum(f) / SR
    voice = sum(np.sin(h * phase) * (0.7 ** h) for h in range(1, 8))
    form = sf._band(voice, 500, 3500, 2)
    return sf._norm(form * _env(t, 0.75, 0.06, 0.25) * (t < 0.75), 0.6)


mv = sf._load("mimic_vault_audio", "mimic-vault-audio.py")

EXTRA_SFX = {
    "knock_hollow": sfx_knock_hollow,
    "knock_solid": sfx_knock_solid,
    "pound": sfx_pound,
    "door_burst": sfx_door_burst,
    "creak": sfx_creak,
    "bolt": sfx_bolt,
    "brick": sfx_brick,
    "rope": sfx_rope,
    "pour": sfx_pour,
    "rip": sfx_rip,
    "clatter": sfx_clatter,
    "cheer": sfx_cheer,
    "room": sfx_room,
    "meow": sfx_meow,
    "crumble": mv.sfx_crumble,
}


def build_sfx():
    print(f"Building sound effects in {sf.SFX_DIR}...")
    builders = {**sf.da.SFX_BUILDERS, **sf.ba.EXTRA, **EXTRA_SFX}
    for name, fn in builders.items():
        if name.startswith("__") or name == "sfx_ai":
            continue
        sf.da.write_wav(sf.SFX_DIR / f"{name}.wav", fn())
    print(f"Generated {len(builders)} sound effects.")


def build_score():
    """The series theme, looped with crossfades under the voice (about -34 LUFS)."""
    import json

    cues = json.loads((sf.DATA / "narrationCues.json").read_text())
    seconds = cues["durationFrames"] / sf.FPS + 1
    sf.da.series_score(sf.EP / f"score_v{VERSION}.mp3", seconds, sf.TMP)


if __name__ == "__main__":
    modes = set(sys.argv[1:]) or {"narration", "sfx", "score"}
    if "narration" in modes:
        sf.build_narration()
    if "sfx" in modes:
        build_sfx()
    if "score" in modes:
        build_score()
    print("All audio stems ready.")
