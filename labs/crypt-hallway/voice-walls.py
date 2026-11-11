"""The crushing room film (?hall=walls): Ep3 ("Evolution of a Crushing Walls Trap") re-written and
re-voiced for the realism lab, with a cold-open hook voiced from frame 0.

  python voice-walls.py

Voices every line once (cached per line in out/audio-tmp-crushing-room/, same Gemini voice as the
episodes via scripts/boulder-audio.py's tts_gemini_line, key from the repo's .env), lays them end to
end with their pauses and writes:
  out/audio-tmp-crushing-room/narration.wav
  src/walls/data/cues.json   {durationFrames, lines: {id: {startFrame, endFrame, words}}}
`end` and `cta` are the series lines already voiced for Ep1 (out/audio-tmp-dungeon-trap-v2).
Change a line's text -> delete its .wav/.json in the cache folder and re-run.
"""

import importlib.util
import json
import re
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
TMP = ROOT / "out" / "audio-tmp-crushing-room"
TMP.mkdir(parents=True, exist_ok=True)
LEAD_IN = 0.08  # the hook starts talking on the first frame

# id, text, pause after (s). The hook plays over a flash-forward of the finale.
LINES = [
    ("hook", "This room just swallowed an entire party.", 0.25),
    ("hook2", "And it all started with one gold coin.", 0.35),
    ("l1a", "The moment a greedy goblin grabs it, two five-ton walls slam shut, and turn him into a pancake.", 0.9),
    ("l2a", "But a show-off rogue grabs the coin, runs up the walls, and escapes through the ceiling vent.", 0.5),
    ("l2b", "So you swap the stone for greased steel plates, and hide a spring-loaded boot in the vent.", 0.3),
    ("l2c", "The next rogue slips all the way up, and the boot punts him straight back down.", 0.9),
    ("l3a", "Then a paladin wedges his jousting lance between the walls, and just stands there, smugly.", 0.5),
    ("l3b", "So you upgrade to hydraulic presses, and electrify the walls.", 0.3),
    ("l3c", "The moment his lance touches both sides, it fries him, and folds him into a neat little cube.", 0.9),
    ("l4a", "Next, a mage simply teleports out through the wall.", 0.5),
    ("l4b", "So you line the room with magic mirrors.", 0.3),
    ("l4c", "Now his spell bounces back and forth like a game of Pong, until there's nowhere left to bounce.", 0.9),
    ("l5a", "Finally, a paranoid party pokes the floor with a ten-foot pole, from the safety of the hallway.", 0.3),
    ("l5b", "So you put the whole room on rails. It lunges down the hall, swallows them whole, and fires them up the chute into your pet Mimic.", 0.7),
    ("end", None, 0.35),
    ("cta", None, 1.6),
]
FROM_EP1 = {"end", "cta"}  # series lines voiced once for Ep1, same voice

# The transcriber spells some words differently from the script: merge them back to the script token.
WORD_FIXES = {
    "l1a": [(["five", "ton"], "five-ton"), (["5-ton"], "five-ton")],
    "l2b": [(["spring", "loaded"], "spring-loaded")],
    "l5a": [(["ten", "foot"], "ten-foot"), (["10-foot"], "ten-foot"), (["10", "foot"], "ten-foot")],
}


def bare(w):
    return re.sub(r"[^\w'-]", "", w).lower()


def fix_words(line_id, words):
    out = [list(x) for x in words]
    for old, new in WORD_FIXES.get(line_id, []):
        n = len(old)
        for i in range(len(out) - n + 1):
            if [bare(x[0]) for x in out[i:i + n]] == [bare(o) for o in old]:
                out[i:i + n] = [[new, out[i][1], out[i + n - 1][2]]]
                break
    return out


def main():
    track = np.zeros(int(LEAD_IN * SR))
    lines = {}
    for line_id, text, pause in LINES:
        wav = TMP / f"{line_id}.wav"
        if line_id in FROM_EP1:
            for ext in ("wav", "json"):
                if not (TMP / f"{line_id}.{ext}").exists():
                    shutil.copy(ROOT / "out" / "audio-tmp-dungeon-trap-v2" / f"{line_id}.{ext}", TMP / f"{line_id}.{ext}")
            words = json.loads((TMP / f"{line_id}.json").read_text(encoding="utf-8"))
            text = " ".join(w[0] for w in words)
        else:
            words = ba.tts_gemini_line(text, wav)
        words = fix_words(line_id, words)
        x = ba.decode_samples(wav)
        a = max(0, int((words[0][1] - 0.04) * SR))
        b = min(len(x), int((words[-1][2] + 0.05) * SR))
        offset = len(track) / SR - a / SR
        track = np.concatenate([track, x[a:b], np.zeros(int(pause * SR))])
        labelled = ba.attach_punctuation(text, words) if line_id not in FROM_EP1 else [(w[0], w[1], w[2]) for w in words]
        wf = []
        for label, s, e in labelled:
            sf = round((offset + s) * FPS)
            wf.append({"word": label, "startFrame": sf, "endFrame": max(sf + 1, round((offset + e) * FPS))})
        for i in range(len(wf) - 1):
            wf[i]["endFrame"] = max(wf[i]["startFrame"] + 1, min(wf[i]["endFrame"], wf[i + 1]["startFrame"]))
        lines[line_id] = {"startFrame": wf[0]["startFrame"], "endFrame": wf[-1]["endFrame"], "words": wf}
        print(f"{line_id:6s} {lines[line_id]['startFrame']:5d}-{lines[line_id]['endFrame']:5d}  {' '.join(w['word'] for w in wf)}")
    out = TMP / "narration.wav"
    pcm = (np.clip(track, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", str(out)], input=pcm, check=True)
    frames = round(len(track) / SR * FPS)
    data = HERE / "src" / "walls" / "data"
    data.mkdir(parents=True, exist_ok=True)
    (data / "cues.json").write_text(json.dumps({"durationFrames": frames, "lines": lines}, indent=1), encoding="utf-8")
    print(f"{out}: {len(track) / SR:.2f} s = {frames} frames")


if __name__ == "__main__":
    main()
