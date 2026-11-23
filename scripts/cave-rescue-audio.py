"""Builds the audio stems for Cave Rescue ("18 days inside a mountain"), our retelling of the
2018 Tham Luang cave rescue in Thailand. Reuses the Slow Flight pipeline
(scripts/slow-flight-audio.py) with its paths pointed at this slug: same Gemini voice, word
timestamps, mastering and procedural SFX helpers. The score is the mine rescue's bed.

  python scripts/cave-rescue-audio.py                  # everything
  python scripts/cave-rescue-audio.py narration score  # any of narration, sfx, score

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

Facts (see docs/ifkit/cave-rescue-script.md): the Wild Boars, twelve boys aged 11-16 and their
assistant coach, went in after practice on 23 June 2018; monsoon rain flooded the cave behind
them; they sheltered on a muddy bank about 4 km in; no food, drinking water dripping from the
rock, the coach had them meditate to stay calm and save energy; pumps ran day and night and divers
fought zero-visibility water; British divers Stanton and Volanthen found all thirteen on 2 July
(day 10); the oxygen in the chamber fell; former Navy SEAL Saman Kunan died after laying air
tanks along the route; the boys were sedated (ketamine), given full-face masks, wrapped in
stretchers and towed out by divers, 4 + 4 + 4 and the coach over 8-10 July (day 18).
Elon Musk's team built a kid-sized submarine from rocket parts ("Wild Boar") and brought it to
the cave; the head of the operation, Narongsak Osottanakorn, called it not practical and it was
not used. British caver Vern Unsworth, who helped the rescue, called it a PR stunt on CNN; Musk
called him "pedo guy" on Twitter, deleted the tweets and apologised; in December 2019 a Los
Angeles jury found Musk not liable for defamation.

Outputs:
  public/whatif/cave-rescue/narration_vN.mp3
  public/whatif/cave-rescue/score_vN.mp3
  public/whatif/cave-rescue/sfx/*.wav
  src/whatif/cave-rescue/data/wordTimestamps.json
  src/whatif/cave-rescue/data/narrationCues.json
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

SLUG = "cave-rescue"
VERSION = 2

LINES = [
    # Trapped
    ("a1", "The rain came early, and the cave you walked into after practice is filling with water behind you.", 0.4),
    ("a2", "Twelve boys and your coach climb deeper, four kilometers into the mountain, to a muddy ledge above the flood.", 0.6),
    ("a3", "There is no food. You drink the water dripping off the rock, and your coach teaches you to sit still and breathe slowly.", 0.9),
    # Found
    ("b1", "Outside, pumps drain the cave day and night, while divers push in through water too muddy to see.", 0.5),
    ("b2", "Day ten. A light comes up out of the water. Two British divers, and one question. How many of you?", 0.3),
    ("b3", "Thirteen. All of you, alive.", 1.0),
    # The way out
    ("c1", "But the way out is hours of diving through flooded tunnels, some barely wider than a body, in total darkness.", 0.4),
    ("c2", "The air in your chamber is running thin. A volunteer diver dies on his way back from laying air tanks along the route.", 1.0),
    ("c3", "Elon Musk's engineers build a kid-sized submarine out of rocket parts and fly it to the cave. The rescue team says it's not practical, and it's never used.", 0.6),
    # Out
    ("d1", "So the doctors put you to sleep. A full-face mask, a stretcher wrapped around you, and a diver pulls you out like cargo.", 0.5),
    ("d2", "Four boys on the first day. Four on the second. And on the last, four more and the coach.", 1.0),
    # Afterwards
    ("e1", "Later, a British caver who helped the rescue calls the submarine a PR stunt. Musk calls him pedo guy on Twitter, then deletes it and apologizes. In twenty nineteen, a jury rules it wasn't defamation.", 1.0),
    ("end", "Eighteen days, four kilometers into a mountain, and every one of you came home.", 1.6),
]

# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
NUMBER_WORDS = {
    "12": "twelve", "4": "four", "10": "ten", "13": "thirteen", "18": "eighteen", "2019": "twenty nineteen",
    "4km": "four kilometers",
}

# Point the Slow Flight pipeline at this slug (its functions read these module globals).
sf.SLUG = SLUG
sf.VERSION = VERSION
sf.LINES = LINES
sf.NUMBER_WORDS = NUMBER_WORDS
sf.LEAD_IN = 0.35
sf.EP = ROOT / "public" / "whatif" / SLUG
sf.SFX_DIR = sf.EP / "sfx"
sf.DATA = ROOT / "src" / "whatif" / SLUG / "data"
sf.TMP = ROOT / "out" / f"audio-tmp-{SLUG}"
sf.VOICE_TMP = sf.TMP / "gemini"
for d in (sf.EP, sf.SFX_DIR, sf.DATA, sf.VOICE_TMP):
    d.mkdir(parents=True, exist_ok=True)

# Score: the licensed bed of the mine rescue (CC BY 4.0, credited in public/music/CREDITS.md and
# the upload description), trimmed to the narration, faded and sat low under the voice.
SCORE_TRACK = ROOT / "public" / "music" / "crypto-kevin-macleod.mp3"
SCORE_VERSION = 2
SCORE_LUFS = -34.0


def build_score():
    cues = json.loads((sf.DATA / "narrationCues.json").read_text())
    seconds = cues["durationFrames"] / sf.FPS + 1.0
    cut = sf.TMP / "score_cut.wav"
    sf.da.run([
        "ffmpeg", "-y", "-hide_banner", "-i", str(SCORE_TRACK),
        "-af", f"atrim=0:{seconds},afade=t=in:d=1.0,afade=t=out:st={max(0, seconds - 4)}:d=4",
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


def sfx_rain(dur=8.0):
    """Monsoon rain on jungle leaves: dense high hiss with heavier drops in it."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(71)
    hiss = sf._band(rng.normal(0, 1, n), 1800, 9000, 2) * 0.5
    body = sf._band(rng.normal(0, 1, n), 300, 1800, 2) * 0.35
    drops = sf._band(rng.normal(0, 1, n), 1200, 5000, 2) * (rng.random(n) > 0.9992) * 8
    drops = np.convolve(drops, np.exp(-np.arange(int(0.01 * SR)) / (0.002 * SR)), mode="same")
    return sf._norm((hiss + body + drops * 0.3) * _env(t, dur, 0.6, 0.6), 0.55)


def sfx_flood(dur=4.0):
    """Water rushing along the cave floor: a low churning roar with a splashy top."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(73)
    roar = sf._band(rng.normal(0, 1, n), 60, 500, 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.9 * t))
    churn = sf._band(rng.normal(0, 1, n), 600, 3500, 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 5.3 * t) ** 2) * 0.5
    return sf._norm((roar + churn) * _env(t, dur, 0.4, 1.0), 0.85)


def sfx_drip(dur=6.0):
    """The cave chamber: low room tone and slow drips echoing off the rock."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(79)
    air = sf._band(rng.normal(0, 1, n), 40, 260, 2) * 0.5
    drips = np.zeros(n)
    for k in (0.4, 1.7, 2.6, 3.9, 5.1):
        i = int(k * SR)
        L = int(0.5 * SR)
        tt = np.arange(L) / SR
        ping = np.sin(2 * np.pi * (900 + 1400 * np.exp(-tt / 0.01)) * tt) * np.exp(-tt / 0.03)
        echo = np.sin(2 * np.pi * 950 * tt) * np.exp(-tt / 0.18) * 0.18
        drips[i:i + L] += (ping + echo)[: n - i]
    return sf._norm((air + drips * 0.5) * _env(t, dur, 0.5, 0.5), 0.5)


def sfx_pump(dur=6.0):
    """A diesel water pump: a chugging engine and water gushing out of the hose."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(83)
    f = 24
    chug = (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * f * t))) * sf._band(rng.normal(0, 1, n), 60, 400, 2)
    hum = np.sin(2 * np.pi * 48 * t) * 0.3 + np.sin(2 * np.pi * 96 * t) * 0.15
    gush = sf._band(rng.normal(0, 1, n), 500, 4000, 2) * 0.3
    return sf._norm((chug * 0.8 + hum + gush) * _env(t, dur, 0.3, 0.5), 0.6)


def sfx_scuba(dur=3.0):
    """A diver breathing on a regulator: the inhale hiss, then exhaled bubbles."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(89)
    out = np.zeros(n)
    for k in np.arange(0.0, dur - 0.2, 1.5):
        i = int(k * SR)
        L = int(0.7 * SR)
        tt = np.arange(L) / SR
        inhale = sf._band(rng.normal(0, 1, L), 1500, 7000, 2) * np.sin(np.pi * tt / 0.7) * 0.5
        out[i:i + L] += inhale[: n - i]
        j = i + int(0.75 * SR)
        B = int(0.6 * SR)
        if j + B < n:
            bt = np.arange(B) / SR
            burbles = sf._band(rng.normal(0, 1, B), 150, 900, 2) * (rng.random(B) > 0.996) * 9
            burbles = np.convolve(burbles, np.sin(2 * np.pi * 420 * np.arange(int(0.02 * SR)) / SR), mode="same")
            out[j:j + B] += burbles * np.exp(-bt / 0.4) * 0.4
    return sf._norm(out * _env(t, dur, 0.05, 0.3), 0.6)


def sfx_surface(dur=1.4):
    """A diver's head breaking the surface: a splash and water running off."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(97)
    splash = sf._band(rng.normal(0, 1, n), 400, 6000, 2) * np.exp(-t / 0.12)
    run = sf._band(rng.normal(0, 1, n), 800, 5000, 2) * (rng.random(n) > 0.993) * 4 * np.exp(-t / 0.6)
    thump = np.sin(2 * np.pi * (90 - 40 * t) * t) * np.exp(-t / 0.08) * 0.6
    return sf._norm(splash + run * 0.4 + thump, 0.85)


def sfx_underwater(dur=8.0):
    """Underwater bed: a deep muffled pressure hum with slow drifting bubbles."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(101)
    hum = sf._band(rng.normal(0, 1, n), 30, 180, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * t))
    bub = sf._band(rng.normal(0, 1, n), 200, 1200, 2) * (rng.random(n) > 0.9985) * 6
    bub = np.convolve(bub, np.exp(-np.arange(int(0.03 * SR)) / (0.008 * SR)), mode="same")
    return sf._norm((hum + bub * 0.3) * _env(t, dur, 0.6, 0.8), 0.55)


def sfx_heart(dur=4.0):
    """A slow heartbeat (the sedated boy), soft and low."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    out = np.zeros(n)
    for k in np.arange(0.0, dur - 0.4, 1.05):
        for dt, a in ((0.0, 1.0), (0.22, 0.6)):
            i = int((k + dt) * SR)
            L = int(0.18 * SR)
            tt = np.arange(L) / SR
            out[i:i + L] += a * np.sin(2 * np.pi * (55 - 20 * tt / 0.18) * tt) * np.exp(-tt / 0.05)
    return sf._norm(out, 0.7)


def sfx_crowd(dur=3.6):
    """People cheering outside the cave mouth (noise-band voices with a swell)."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    rng = np.random.default_rng(103)
    voices = sum(
        sf._band(rng.normal(0, 1, n), lo, lo * 2.2, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * (0.8 + k * 0.37) * t + k))
        for k, lo in enumerate((300, 450, 700, 1000))
    )
    swell = np.minimum(1, t / 0.4) * (0.7 + 0.3 * np.exp(-t / 1.2))
    return sf._norm(voices * swell * _env(t, dur, 0.05, 0.9), 0.7)


sf.EXTRA_SFX.update({
    "rain": sfx_rain,
    "flood": sfx_flood,
    "drip": sfx_drip,
    "pump": sfx_pump,
    "scuba": sfx_scuba,
    "surface": sfx_surface,
    "underwater": sfx_underwater,
    "heart": sfx_heart,
    "crowd": sfx_crowd,
})


def build_sfx():
    """Procedural sfx, then any AI takes picked with scripts/gen-sfx.py laid over them."""
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
