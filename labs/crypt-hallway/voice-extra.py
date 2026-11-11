"""The boulder hallway film's ending, past Ep2's own narration: Ep2 stops on "...now unbeatable."
The lab film adds the series' comment hook and a pointer to the game:

  end   (Ep2's l5c, unchanged)  "Congratulations, your hallway is now unbeatable."   pause 0.35
  cta   "Unless you can prove us wrong in the comments."                             pause 0.6
  play  "Check the link in the comments if you want to play this."                   pause 1.6

  python voice-extra.py

Writes out/audio-tmp-boulder-hallway/narration_ext.wav (Ep2's narration_v3 cut after l5c, then the
two lines) and src/boulder/data/extraCues.json (the new lines' word frames and the new length).
Same Gemini voice as Ep2 (scripts/boulder-audio.py's tts_gemini_line, key from the repo's .env).
`cta` is the series line already voiced for Ep1 (out/audio-tmp-dungeon-trap-v2/cta.*); `play` is
voiced once and cached. The Remotion episode's files are not touched.
"""

import importlib.util
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
load_dotenv(ROOT / ".env")
spec = importlib.util.spec_from_file_location("boulder_audio", ROOT / "scripts" / "boulder-audio.py")
ba = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ba)

FPS = 30
SR = ba.SR
TMP = ROOT / "out" / "audio-tmp-boulder-hallway"
TMP.mkdir(parents=True, exist_ok=True)
EP2 = ROOT / "public" / "episodes" / "rolling-boulder"
CUES = json.loads((ROOT / "src" / "episodes" / "rolling-boulder" / "data" / "narrationCues.json").read_text(encoding="utf-8"))
LINES = [
    ("cta", "Unless you can prove us wrong in the comments.", 0.6),
    ("play", "Check the link in the comments if you want to play this.", 1.6),
]
END_PAUSE = 0.35  # after "unbeatable": the hook reads as the same sentence


def main():
    # the series cta, voiced for Ep1 in the same voice
    for ext in ("wav", "json"):
        src = ROOT / "out" / "audio-tmp-dungeon-trap-v2" / f"cta.{ext}"
        if not (TMP / f"cta.{ext}").exists():
            shutil.copy(src, TMP / f"cta.{ext}")
    nar = ba.decode_samples(EP2 / "narration_v3.mp3")
    last = CUES["lines"]["l5c"]["words"][-1]
    cut = int((last["endFrame"] / FPS + 0.05) * SR)
    track = np.concatenate([nar[:cut], np.zeros(int(END_PAUSE * SR))])
    lines = {}
    for line_id, text, pause in LINES:
        wav = TMP / f"{line_id}.wav"
        words = ba.tts_gemini_line(text, wav)
        x = ba.decode_samples(wav)
        a = max(0, int((words[0][1] - 0.04) * SR))
        b = min(len(x), int((words[-1][2] + 0.05) * SR))
        offset = len(track) / SR - a / SR
        track = np.concatenate([track, x[a:b], np.zeros(int(pause * SR))])
        wf = []
        for label, s, e in ba.attach_punctuation(text, words):
            sf = round((offset + s) * FPS)
            wf.append({"word": label, "startFrame": sf, "endFrame": max(sf + 1, round((offset + e) * FPS))})
        for i in range(len(wf) - 1):
            wf[i]["endFrame"] = max(wf[i]["startFrame"] + 1, min(wf[i]["endFrame"], wf[i + 1]["startFrame"]))
        lines[line_id] = {"startFrame": wf[0]["startFrame"], "endFrame": wf[-1]["endFrame"], "words": wf}
        print(f"{line_id}: frames {lines[line_id]['startFrame']}-{lines[line_id]['endFrame']}  {' '.join(w['word'] for w in wf)}")
    out = TMP / "narration_ext.wav"
    pcm = (np.clip(track, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", str(out)], input=pcm, check=True)
    frames = round(len(track) / SR * FPS)
    (HERE / "src" / "boulder" / "data").mkdir(exist_ok=True)
    (HERE / "src" / "boulder" / "data" / "extraCues.json").write_text(json.dumps({"durationFrames": frames, "lines": lines}, indent=1), encoding="utf-8")
    print(f"{out}: {len(track) / SR:.2f} s = {frames} frames")


if __name__ == "__main__":
    main()
