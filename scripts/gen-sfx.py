"""
AI sound effects for an episode, generated locally with Stable Audio 3 Small SFX.

Two steps:

  1. GENERATE takes (needs the stable-audio-3 venv with CUDA torch, run once):
       D:\\git\\stable-audio-3\\.venv\\Scripts\\python.exe scripts/gen-sfx.py dart-trap
       ... --only dart_hit,boom --takes 4        (just some sounds, more takes)
     Prompts come from scripts/sfx-prompts/<slug>.json. Takes land in
     out/sfx-gen/<slug>/<name>_<k>.wav with an index.html to audition them.
     Seeds are fixed per sound (all takes come from one seeded batch), so a
     take can always be regenerated with the same --takes count.

  2. PICK the takes you like (any python with numpy + soundfile):
       python scripts/gen-sfx.py dart-trap --pick dart_hit=2 boom=1
     Copies each take to public/episodes/<slug>/sfx_ai/<name>.wav and records
     it in scripts/sfx-prompts/<slug>.picks.json. The episode audio script lays
     sfx_ai/ over its procedural sfx/, so re-running it keeps your picks.
     `--unpick name` goes back to the procedural sound.

Every take is cleaned the same way: mono, 48 kHz, leading silence trimmed,
short fade-out, peak-normalised to -3 dBFS (the mix itself stays in config).
"""

import argparse
import hashlib
import html
import json
import math
import shutil
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
OUT_SR = 48000
PEAK = 10 ** (-3 / 20)
MODEL = "small-sfx"


def prompts_for(slug):
    data = json.loads((ROOT / "scripts" / "sfx-prompts" / f"{slug}.json").read_text(encoding="utf-8"))
    style = data.pop("_style", "")
    return style, data


def seed_for(name, take):
    return int(hashlib.sha1(f"{name}:{take}".encode()).hexdigest()[:8], 16)


def flatness(x, sr):
    """Spectral flatness of the first second: ~1 is white noise, real sounds are well below 0.5."""
    x = np.asarray(x[:sr], dtype=np.float64)
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x)))) + 1e-12
    return float(np.exp(np.mean(np.log(spec))) / np.mean(spec))


def clean(x, sr, seconds, loop):
    """Mono float -> trimmed, faded, normalised 48 kHz mono."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 2:
        x = x.mean(axis=0) if x.shape[0] <= 2 else x.mean(axis=1)
    if sr != OUT_SR:
        n = int(round(len(x) * OUT_SR / sr))
        x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
    x = x - np.mean(x)
    if not loop:
        # Start on the main hit (first point above a quarter of the peak, 15 ms
        # pre-roll) so cues land on their beat instead of on a faint lead-in.
        win = int(0.005 * OUT_SR)
        env = np.convolve(np.abs(x), np.ones(win) / win, mode="same")
        start = int(np.argmax(env > env.max() * 0.25))
        x = x[max(0, start - int(0.015 * OUT_SR)):]
        # Gentle downward expander: hiss far below the event fades out.
        env = np.convolve(np.abs(x), np.ones(win * 4) / (win * 4), mode="same")
        x = x * np.clip(env / (env.max() * 0.03 + 1e-9), 0.0, 1.0) ** 1.5
    x = x[: int(seconds * OUT_SR)]
    fade = min(len(x), int((0.04 if loop else 0.12) * OUT_SR))
    if fade > 0:
        x[-fade:] *= np.linspace(1, 0, fade)
    peak = np.abs(x).max()
    if peak > 0:
        x = x * (PEAK / peak)
    return x.astype(np.float32)


def generate(slug, only, takes):
    import torch
    from stable_audio_3 import StableAudioModel

    if not torch.cuda.is_available():
        sys.exit("CUDA torch not found: run this with the stable-audio-3 venv python (see the docstring).")
    style, prompts = prompts_for(slug)
    names = [n for n in prompts if not only or n in only]
    out = ROOT / "out" / "sfx-gen" / slug
    out.mkdir(parents=True, exist_ok=True)

    print(f"Loading {MODEL}...")
    model = StableAudioModel.from_pretrained(MODEL)
    sr = model.model.sample_rate

    for name in names:
        spec = prompts[name]
        text = f"{spec['prompt']}, {style}" if style else spec["prompt"]
        # Ask for a little extra so trimming the attack never runs short. Always a
        # whole number of seconds: stable-audio-3 (0.1.0, without flash-attn)
        # returns pure static for fractional lengths like 1.2 / 1.6 / 1.8 s.
        gen_seconds = math.ceil(spec["seconds"] + 0.6)
        # All takes of one sound in a single batch; the seed fixes the whole batch.
        audio = model.generate(prompt=text, duration=gen_seconds, batch_size=takes, seed=seed_for(name, 0))
        audio = audio.detach().float().cpu().numpy()  # (takes, channels, samples)
        flags = []
        for k in range(1, takes + 1):
            take = audio[k - 1]
            flags.append(f"{flatness(take.mean(axis=0), sr):.2f}")
            sf.write(out / f"{name}_{k}.wav", clean(take, sr, spec["seconds"], spec.get("loop", False)), OUT_SR, subtype="PCM_16")
        noisy = [f for f in flags if float(f) > 0.6]
        print(f"  {name}: {takes} takes  (flatness {' '.join(flags)}{'  <- STATIC?' if noisy else ''})")
    write_index(slug, prompts, out, takes)
    print(f"\nAudition: {out / 'index.html'}")


def write_index(slug, prompts, out, takes):
    rows = []
    for name, spec in prompts.items():
        cells = "".join(
            f'<td>{k}<br><audio controls preload="none" src="{name}_{k}.wav"></audio></td>'
            for k in range(1, takes + 1)
            if (out / f"{name}_{k}.wav").exists()
        )
        if not cells:
            continue
        proc = f"../../../public/episodes/{slug}/sfx/{name}.wav"
        rows.append(
            f"<tr><th>{html.escape(name)}</th><td class=p>{html.escape(spec['prompt'])}</td>"
            f'<td>current<br><audio controls preload="none" src="{proc}"></audio></td>{cells}</tr>'
        )
    (out / "index.html").write_text(
        "<!doctype html><meta charset=utf-8><title>SFX takes</title>"
        "<style>body{font:14px system-ui;background:#16181d;color:#eee}td,th{padding:6px;vertical-align:top}"
        "th{text-align:left}.p{max-width:260px;color:#aab}audio{width:180px}</style>"
        f"<h2>{html.escape(slug)} SFX takes</h2><p>Pick with: python scripts/gen-sfx.py {slug} --pick name=take ...</p>"
        f"<table>{''.join(rows)}</table>",
        encoding="utf-8",
    )


def picks_path(slug):
    return ROOT / "scripts" / "sfx-prompts" / f"{slug}.picks.json"


def pick(slug, items, unpick):
    path = picks_path(slug)
    picks = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    ai_dir = ROOT / "public" / "episodes" / slug / "sfx_ai"
    sfx_dir = ROOT / "public" / "episodes" / slug / "sfx"
    ai_dir.mkdir(parents=True, exist_ok=True)
    for item in items:
        name, take = item.split("=")
        src = ROOT / "out" / "sfx-gen" / slug / f"{name}_{take}.wav"
        if not src.exists():
            sys.exit(f"No take {src}")
        shutil.copyfile(src, ai_dir / f"{name}.wav")
        shutil.copyfile(src, sfx_dir / f"{name}.wav")
        picks[name] = {"take": int(take), "batch_seed": seed_for(name, 0), "model": MODEL}
        print(f"  {name} <- take {take}")
    for name in unpick:
        picks.pop(name, None)
        (ai_dir / f"{name}.wav").unlink(missing_ok=True)
        print(f"  {name} -> procedural (re-run the episode audio script's sfx step to restore it)")
    path.write_text(json.dumps(picks, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--only", default="", help="comma-separated sound names")
    ap.add_argument("--takes", type=int, default=3)
    ap.add_argument("--pick", nargs="*", default=None, help="name=take ...")
    ap.add_argument("--unpick", nargs="*", default=[])
    args = ap.parse_args()
    if args.pick is not None or args.unpick:
        pick(args.slug, args.pick or [], args.unpick)
    else:
        generate(args.slug, {n for n in args.only.split(",") if n}, args.takes)
