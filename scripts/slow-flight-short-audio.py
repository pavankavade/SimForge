"""Builds the audio stems for SlowFlightShort, the 9:16 one-minute teaser that
recuts the Slow Flight long-form and funnels viewers to it. Reuses the
long-form pipeline (scripts/slow-flight-audio.py) with its paths pointed at
this slug: same Gemini voice, number spelling, mastering and music-box score.

  python scripts/slow-flight-short-audio.py            # narration + score
  python scripts/slow-flight-short-audio.py narration  # or just one

Sound effects are the long-form ones (public/whatif/slow-flight/sfx).

Outputs:
  public/whatif/slow-flight-short/narration_vN.mp3
  public/whatif/slow-flight-short/score_vN.mp3
  src/whatif/slow-flight-short/data/wordTimestamps.json
  src/whatif/slow-flight-short/data/narrationCues.json
"""

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("slow_flight_audio", ROOT / "scripts" / "slow-flight-audio.py")
sf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sf)

SLUG = "slow-flight-short"
VERSION = 1

# Fast and punchy: short pauses, every line keyed to one clip of the long-form.
LINES = [
    ("s1", "What if you could fly, but only as fast as you can walk?", 0.3),
    ("s2", "Three miles an hour. Even the cat beats you.", 0.4),
    ("s3", "But your speed is airspeed, plus the wind. One gust, and you're doing twenty.", 0.3),
    ("s4", "Fly into it, and you go nowhere.", 0.4),
    ("s5", "So when your bus dies thirty eight miles from your sister's show,", 0.15),
    ("s6", "you put Grandpa on your back, and ride the wind.", 0.35),
    ("s7", "A tailwind across the plains.", 0.2),
    ("s8", "A headwind, while a cow watches you hover.", 0.25),
    ("s9", "A thermal, spiraling up to nine thousand freezing feet.", 0.25),
    ("s10", "Ridge lift, along the mountains.", 0.35),
    ("s11", "Then the wind stops. Forty one minutes left. Nine miles to go.", 0.4),
    ("s12", "At sunset, the wind flips, and pours downhill.", 0.25),
    ("s13", "Twenty two miles an hour, racing the clock, over the rooftops.", 0.3),
    ("s14", "Do they make it before the curtain?", 0.8),
    ("s15", "Watch the full flight. It's linked right below.", 1.2),
]

# Point the long-form pipeline at this slug (its functions read these module globals).
sf.SLUG = SLUG
sf.VERSION = VERSION
sf.LINES = LINES
sf.LEAD_IN = 0.3
sf.EP = ROOT / "public" / "whatif" / SLUG
sf.DATA = ROOT / "src" / "whatif" / SLUG / "data"
sf.TMP = ROOT / "out" / f"audio-tmp-{SLUG}"
sf.VOICE_TMP = sf.TMP / "gemini"
for d in (sf.EP, sf.DATA, sf.VOICE_TMP):
    d.mkdir(parents=True, exist_ok=True)

# Shorts play on phone speakers: the bed sits a little higher than the long-form's.
sf.SCORE_STYLE = "musicbox"
sf.SCORE_LUFS = -31.0

if __name__ == "__main__":
    modes = set(sys.argv[1:]) or {"narration", "score"}
    if "narration" in modes:
        sf.build_narration()
    if "score" in modes:
        sf.build_score()
    print(json.dumps({"slug": SLUG, "version": VERSION}))
