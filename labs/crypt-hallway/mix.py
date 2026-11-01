"""Mix the film test's sound: Ep1's voiced narration (cut after the last line we show), the series
score (Ep1's mix of it), and the beat-keyed SFX list that src/anim.js exports.

  python mix.py <audio.json> <out.wav>

audio.json comes from film.mjs: {"frames", "fps", "narrationEnd", "sfx": [{"name", "at", "vol"}]}.
Levels match the episodes: the narration and score files are already mastered by the Ep1 audio
script (about -16 / -34 LUFS) and SFX volumes are the episode config's; film.mjs then runs the
repo's two-pass master (scripts/master-audio.mjs) on the muxed video.
Needs ffmpeg on PATH and numpy.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
EP = ROOT / "public" / "episodes" / "dungeon-trap-v2"
SR = 48000


def load(path):
    """Decode any audio file to mono float32 at SR."""
    raw = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def fade_out(x, start, length):
    if start >= len(x):
        return x
    n = min(length, len(x) - start)
    x[start:start + n] *= np.linspace(1, 0, n, dtype=np.float32)
    x[start + n:] = 0
    return x


def main(spec_path, out_path):
    spec = json.loads(Path(spec_path).read_text())
    fps = spec["fps"]
    total = int(spec["frames"] / fps * SR)
    mix = np.zeros(total, dtype=np.float32)

    def lay(clip, at_sample, vol):
        if at_sample >= total:
            return
        clip = clip[: total - at_sample]
        mix[at_sample:at_sample + len(clip)] += clip * vol

    # narration: frame 0 of the episode is sample 0 here; stop before the next level's line
    nar = load(EP / "narration_v1.mp3")
    nar = fade_out(nar, int(spec["narrationEnd"] / fps * SR), int(0.15 * SR))
    lay(nar, 0, 1.0)

    # score under everything, faded out over the last 1.5 s
    score = load(EP / "score_v1.mp3")[:total]
    lay(fade_out(score, total - int(1.5 * SR), int(1.5 * SR)), 0, 1.0)

    cache = {}
    for cue in spec["sfx"]:
        name = cue["name"]
        if name not in cache:
            cache[name] = load(EP / "sfx" / f"{name}.wav")
        clip = cache[name]
        if cue.get("dur"):  # a looped bed (fire) trimmed to its window, with a short fade out
            n = int(cue["dur"] / fps * SR)
            clip = np.tile(clip, n // len(clip) + 1)[:n].copy()
            fade = min(n, int(0.15 * SR))
            clip[n - fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
        lay(clip, int(cue["at"] / fps * SR), cue["vol"])

    peak = np.abs(mix).max()
    if peak > 0.99:
        mix *= 0.99 / peak
    pcm = (mix * 32767).astype("<i2").tobytes()
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", str(out_path)],
        input=pcm, check=True,
    )
    print(f"mix: {len(spec['sfx'])} sfx, {total / SR:.1f} s -> {out_path}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
