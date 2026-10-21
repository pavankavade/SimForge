"""Builds the audio stems for the DungeonTrap episode.

  python scripts/dungeon-audio.py

Outputs (public/episodes/dungeon-trap/):
  narration_v2.mp3  original narration with the cut-off final line re-voiced,
                    loudness-normalised to about -16 LUFS
  score_v2.mp3      score looped to cover the longer edit, about -27 LUFS
  sfx/*.wav         procedurally synthesised sound effects

Requires ffmpeg on PATH plus numpy, scipy and edge-tts.
"""

import asyncio
import json
import re
import subprocess
import sys
import time
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "episodes" / "dungeon-trap"
SFX = EP / "sfx"
TMP = ROOT / "out" / "audio-tmp"

SR = 48000
RNG = np.random.default_rng(7)

# Narration ---------------------------------------------------------------

KEEP_UNTIL = 72.70  # end of "...straight into your pet Mimic."
TAIL_AT = 72.82
TAIL_TEXT = "Congratulations, your dungeon is now unbeatable."
TAIL_VOICE = "en-US-AndrewMultilingualNeural"
TAIL_RATE = "+10%"


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=True)


def measure_lufs(path, ss=None, t=None):
    cmd = ["ffmpeg", "-hide_banner", "-nostats"]
    if ss is not None:
        cmd += ["-ss", str(ss)]
    cmd += ["-i", str(path)]
    if t is not None:
        cmd += ["-t", str(t)]
    cmd += ["-af", "ebur128=framelog=quiet", "-f", "null", "-"]
    out = run(cmd).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1])


def loudnorm(src, dst, target, tp=-1.5, extra=None):
    """Two-pass linear loudnorm so the result lands on target precisely."""
    flt = f"loudnorm=I={target}:TP={tp}:LRA=11:print_format=json"
    out = run(["ffmpeg", "-hide_banner", "-i", str(src), "-af", flt, "-f", "null", "-"]).stderr
    start = out.rindex("{")
    m = json.loads(out[start : out.index("}", start) + 1])
    second = (
        f"loudnorm=I={target}:TP={tp}:LRA=11:linear=true"
        f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
        f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
        f":offset={m['target_offset']}"
    )
    run(
        ["ffmpeg", "-y", "-hide_banner", "-i", str(src), "-af", second, "-ar", str(SR)]
        + (extra or ["-b:a", "192k"])
        + [str(dst)]
    )


async def tts_tail(dst):
    import edge_tts

    comm = edge_tts.Communicate(TAIL_TEXT, TAIL_VOICE, rate=TAIL_RATE, boundary="WordBoundary")
    words = []
    with open(dst, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append((chunk["text"], start, start + chunk["duration"] / 1e7))
    return words


def build_narration():
    tail = TMP / "tail.mp3"
    for attempt in range(5):
        try:
            words = asyncio.run(tts_tail(tail))
            break
        except Exception as exc:  # edge-tts occasionally drops a stream
            print("tts retry", attempt, exc)
            time.sleep(3)
    else:
        raise SystemExit("edge-tts failed")

    for text, start, end in words:
        print(f"  {text:16s} frame {round((TAIL_AT + start) * 30)}-{round((TAIL_AT + end) * 30)}")

    # Match the re-voiced line to the loudness of the surrounding narration.
    gain = measure_lufs(EP / "narration.mp3", 60, KEEP_UNTIL - 60) - measure_lufs(tail)
    spliced = TMP / "narration_spliced.wav"
    delay = int(TAIL_AT * 1000)
    run(
        [
            "ffmpeg", "-y", "-hide_banner",
            "-i", str(EP / "narration.mp3"), "-i", str(tail),
            "-filter_complex",
            f"[0:a]aresample={SR},atrim=0:{KEEP_UNTIL},afade=t=out:st={KEEP_UNTIL - 0.06}:d=0.06[a];"
            f"[1:a]aresample={SR},volume={gain:.2f}dB,adelay={delay}|{delay}[b];"
            "[a][b]amix=inputs=2:normalize=0:duration=longest,apad=pad_dur=0.6",
            str(spliced),
        ]
    )
    # Gentle compression evens out the TTS phrasing before normalising.
    comp = TMP / "narration_comp.wav"
    run(
        [
            "ffmpeg", "-y", "-hide_banner", "-i", str(spliced),
            "-af", "highpass=f=70,acompressor=threshold=-24dB:ratio=2.5:attack=8:release=120:makeup=3dB",
            str(comp),
        ]
    )
    loudnorm(comp, EP / "narration_v2.mp3", -16, tp=-1.5)
    print("narration_v2.mp3", measure_lufs(EP / "narration_v2.mp3"), "LUFS")


def build_score():
    looped = TMP / "score_loop.wav"
    run(
        [
            "ffmpeg", "-y", "-hide_banner",
            "-i", str(EP / "score.mp3"), "-i", str(EP / "score.mp3"),
            "-filter_complex", "[0:a][1:a]acrossfade=d=4:c1=qsin:c2=qsin,atrim=0:84",
            str(looped),
        ]
    )
    loudnorm(looped, EP / "score_v2.mp3", -27, tp=-6)
    print("score_v2.mp3", measure_lufs(EP / "score_v2.mp3"), "LUFS")


# SFX synthesis --------------------------------------------------------------


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def noise(dur):
    return RNG.standard_normal(int(dur * SR))


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def decay(dur, tau, attack=0.002):
    t = t_axis(dur)
    env = np.exp(-t / tau)
    a = max(1, int(attack * SR))
    env[:a] *= np.linspace(0, 1, a)
    return env


def sweep_sine(dur, f0, f1, curve=1.0):
    t = t_axis(dur)
    freq = f0 + (f1 - f0) * (t / dur) ** curve
    return np.sin(2 * np.pi * np.cumsum(freq) / SR)


def place(base, clip, at):
    i = int(at * SR)
    end = min(len(base), i + len(clip))
    base[i:end] += clip[: end - i]
    return base


def silence(dur):
    return np.zeros(int(dur * SR))


def metal(dur, base, tau, partials=(1.0, 2.76, 5.4, 8.93), weights=(1, 0.6, 0.35, 0.2)):
    t = t_axis(dur)
    out = np.zeros_like(t)
    for p, w in zip(partials, weights):
        out += w * np.sin(2 * np.pi * base * p * t + RNG.uniform(0, 6)) * np.exp(-t / (tau / (0.6 + p * 0.25)))
    out += 0.4 * hp(noise(dur), 2500) * decay(dur, 0.01)
    return out


def thud(dur=0.5, f0=95, f1=42, tau=0.12, grit=0.5):
    body = sweep_sine(dur, f0, f1, 0.4) * decay(dur, tau, 0.001)
    hit = lp(noise(dur), 900) * decay(dur, 0.025) * grit
    return body + hit


def whoosh(dur=0.6, lo=250, hi=2600, peak=0.55):
    x = noise(dur)
    t = t_axis(dur)
    # Sweep a band-pass by filtering short overlapping blocks.
    out = np.zeros_like(x)
    block = 1024
    win = np.hanning(block * 2)
    for s in range(0, len(x) - block * 2, block):
        u = s / len(x)
        c = lo + (hi - lo) * np.sin(np.pi * u) ** 1.5
        seg = bp(x[s : s + block * 2], max(60, c * 0.6), min(SR / 2 - 100, c * 1.6))
        out[s : s + block * 2] += seg * win
    env = np.exp(-(((t / dur) - peak) ** 2) / 0.05)
    return out * env


def crackle(dur, rate, tau=0.004, lo=1500):
    out = silence(dur)
    n = int(rate * dur)
    click = hp(noise(0.03), lo) * decay(0.03, tau, 0.0005)
    for _ in range(n):
        place(out, click * RNG.uniform(0.2, 1.0), RNG.uniform(0, dur - 0.03))
    return out


def creak(dur=0.7, f0=95, f1=140):
    t = t_axis(dur)
    jitter = np.cumsum(RNG.standard_normal(len(t))) * 0.02
    freq = f0 + (f1 - f0) * (t / dur) + jitter
    phase = np.cumsum(freq) / SR
    saw = 2 * (phase % 1) - 1
    stick = (np.sin(2 * np.pi * 9 * t) > 0.2).astype(float) * 0.6 + 0.4
    x = bp(saw * stick, 300, 2400)
    env = np.sin(np.pi * t / dur) ** 0.6
    return x * env


def sfx_click():
    out = silence(0.25)
    tick = hp(noise(0.02), 1800) * decay(0.02, 0.003, 0.0003) + metal(0.02, 2100, 0.02) * 0.5
    place(out, tick, 0.0)
    place(out, tick * 0.6, 0.07)
    place(out, thud(0.15, 160, 90, 0.03, 0.2) * 0.5, 0.07)
    return out


def sfx_spike():
    out = thud(0.7, 110, 45, 0.1, 0.8)
    place(out, metal(0.6, 610, 0.18) * 0.35, 0.0)
    place(out, crackle(0.25, 40, 0.006, 900) * 0.5, 0.01)
    return out


def sfx_trap_open():
    out = silence(1.0)
    place(out, creak(0.45, 120, 70) * 0.7, 0.0)
    place(out, thud(0.5, 120, 60, 0.08, 0.6), 0.32)
    place(out, metal(0.4, 380, 0.08) * 0.25, 0.32)
    return out


def sfx_trap_close():
    out = silence(0.8)
    place(out, creak(0.3, 90, 150) * 0.5, 0.0)
    place(out, thud(0.5, 140, 70, 0.07, 0.8), 0.22)
    place(out, metal(0.5, 520, 0.1) * 0.3, 0.22)
    return out


def sfx_chain():
    out = silence(1.1)
    for i in range(22):
        at = RNG.uniform(0, 0.9) ** 1.3
        place(out, metal(0.15, RNG.uniform(1400, 2600), 0.03) * RNG.uniform(0.2, 0.7), at)
    return out


def sfx_sparkle():
    out = silence(1.4)
    for i in range(18):
        at = i * 0.06 + RNG.uniform(0, 0.03)
        f = RNG.uniform(2200, 5200)
        ping = np.sin(2 * np.pi * f * t_axis(0.35)) * decay(0.35, 0.09)
        place(out, ping * (1 - i / 22) * 0.5, at)
    return out


def sfx_ice():
    dur = 1.4
    t = t_axis(dur)
    shimmer = sum(
        np.sin(2 * np.pi * f * t * (1 + 0.25 * t / dur)) for f in (880, 1320, 1975, 2637)
    ) * np.exp(-t / 0.5) * 0.2
    out = shimmer + crackle(dur, 70, 0.005, 2200) * np.exp(-t / 0.7)
    place(out, whoosh(0.5, 900, 5000) * 0.4, 0.0)
    return out


def sfx_sizzle():
    dur = 1.6
    t = t_axis(dur)
    x = hp(noise(dur), 3000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * t))) * 0.35
    x += crackle(dur, 50, 0.003, 3000) * 0.6
    env = np.minimum(1, t / 0.05) * np.exp(-t / 0.7)
    return x * env


def sfx_clank():
    return metal(0.8, 340, 0.25) + thud(0.8, 160, 80, 0.05, 0.4) * 0.5


def sfx_clang():
    return metal(2.0, 210, 0.9, (1.0, 2.32, 4.25, 6.63, 9.4), (1, 0.7, 0.5, 0.3, 0.15)) + thud(
        2.0, 120, 60, 0.08, 0.5
    ) * 0.4


def sfx_ignite():
    dur = 1.0
    t = t_axis(dur)
    body = lp(noise(dur), 1400) * np.minimum(1, t / 0.04) * np.exp(-t / 0.35)
    out = body + thud(dur, 70, 40, 0.15, 0.3) * 0.6
    place(out, crackle(0.8, 40, 0.004, 1200) * 0.4, 0.05)
    return out


def sfx_fire_loop():
    dur = 5.0
    t = t_axis(dur)
    roar = lp(noise(dur), 700) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * t)) * 0.8
    roar += bp(noise(dur), 900, 2500) * 0.15
    out = roar + crackle(dur, 30, 0.004, 1200) * 0.5
    fade = int(0.08 * SR)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def sfx_ratchet():
    dur = 3.0
    out = silence(dur)
    tick = hp(noise(0.03), 1200) * decay(0.03, 0.004, 0.0003) + metal(0.03, 1600, 0.012) * 0.6
    n = int(dur * 11)
    for i in range(n):
        place(out, tick * (0.6 + 0.4 * (i % 2)), i / 11)
    out += lp(creak(dur, 60, 70), 900) * 0.15
    return out


def sfx_twang():
    dur = 1.2
    t = t_axis(dur)
    f = 260 * np.exp(-t * 0.6) + 120
    vib = 1 + 0.03 * np.sin(2 * np.pi * 14 * t)
    phase = 2 * np.pi * np.cumsum(f * vib) / SR
    x = (np.sin(phase) + 0.5 * np.sin(2 * phase) + 0.25 * np.sin(3.1 * phase)) * np.exp(-t / 0.35)
    return x


def sfx_launch():
    out = silence(1.6)
    place(out, thud(0.7, 80, 35, 0.15, 0.9) * 1.1, 0.0)
    place(out, creak(0.25, 80, 50) * 0.6, 0.0)
    place(out, sfx_twang() * 0.4, 0.02)
    place(out, whoosh(1.2, 200, 1800, 0.35) * 0.9, 0.05)
    return out


def sfx_rumble():
    dur = 2.4
    t = t_axis(dur)
    x = lp(noise(dur), 110, 4) * 3 + lp(noise(dur), 400) * 0.3
    x += crackle(dur, 25, 0.01, 300) * 0.3
    env = np.sin(np.pi * t / dur) ** 0.7
    return x * env


def sfx_growl():
    dur = 1.3
    t = t_axis(dur)
    f = 62 + 8 * np.sin(2 * np.pi * 1.3 * t)
    phase = np.cumsum(f) / SR
    saw = 2 * (phase % 1) - 1
    am = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 11 * t + np.sin(2 * np.pi * 3 * t)))
    x = bp(saw * am, 120, 1300) + bp(noise(dur), 200, 900) * 0.25 * am
    env = np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.3)
    return x * env


def sfx_chomp():
    out = thud(0.6, 130, 50, 0.07, 1.0)
    place(out, lp(crackle(0.3, 90, 0.006, 500), 4000) * 0.9, 0.0)
    place(out, metal(0.3, 300, 0.05) * 0.15, 0.0)
    return out


def sfx_chew():
    out = silence(1.3)
    for i in range(4):
        squish = lp(noise(0.18), 900) * np.sin(np.pi * t_axis(0.18) / 0.18) ** 2
        place(out, squish * 0.8, i * 0.3)
        place(out, crackle(0.15, 60, 0.004, 700) * 0.4, i * 0.3 + 0.03)
        place(out, thud(0.2, 120, 70, 0.04, 0.3) * 0.5, i * 0.3 + 0.12)
    return out


def sfx_burp():
    dur = 0.75
    t = t_axis(dur)
    f = 88 + 25 * np.sin(2 * np.pi * 2.2 * t) * np.exp(-t * 2) + 6 * RNG.standard_normal(len(t)).cumsum() / 400
    phase = np.cumsum(f) / SR
    saw = 2 * (phase % 1) - 1
    rough = 0.7 + 0.3 * np.sign(np.sin(2 * np.pi * 33 * t))
    x = bp(saw * rough, 180, 900) * 1.2 + bp(saw, 1200, 2200) * 0.3
    env = np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.2)
    return x * env


def sfx_helmet():
    out = silence(1.2)
    for i, (at, g) in enumerate([(0.0, 1.0), (0.32, 0.6), (0.52, 0.35), (0.64, 0.2)]):
        place(out, metal(0.5, 760 + i * 15, 0.12, (1.0, 1.72, 2.9, 4.1), (1, 0.7, 0.4, 0.2)) * g, at)
    return out


def sfx_stamp():
    out = thud(0.8, 90, 38, 0.12, 1.0) * 1.2
    place(out, lp(noise(0.08), 3000) * decay(0.08, 0.015) * 0.7, 0.0)
    return out


def sfx_boom():
    dur = 2.5
    t = t_axis(dur)
    sub = sweep_sine(dur, 70, 28, 0.3) * np.exp(-t / 0.6)
    body = lp(noise(dur), 300, 4) * 3 * np.exp(-t / 0.5)
    return sub + body + lp(noise(dur), 2000) * decay(dur, 0.05) * 0.5


def sfx_pop():
    """Short wooden 'install' knock for parts snapping into place."""
    out = thud(0.35, 210, 110, 0.04, 0.6)
    place(out, metal(0.2, 900, 0.03) * 0.15, 0.0)
    return out


def sfx_dust():
    dur = 1.0
    t = t_axis(dur)
    out = lp(noise(dur), 1500) * np.minimum(1, t / 0.02) * np.exp(-t / 0.25) * 0.8
    return place(out, crackle(0.6, 40, 0.004, 900) * 0.4, 0.0)


SFX_BUILDERS = {
    "whoosh": lambda: whoosh(0.55),
    "whoosh_big": lambda: whoosh(1.0, 150, 1600, 0.45),
    "thud": lambda: thud(),
    "spike": sfx_spike,
    "click": sfx_click,
    "trap_open": sfx_trap_open,
    "trap_close": sfx_trap_close,
    "chain": sfx_chain,
    "sparkle": sfx_sparkle,
    "ice": sfx_ice,
    "sizzle": sfx_sizzle,
    "clank": sfx_clank,
    "clang": sfx_clang,
    "ignite": sfx_ignite,
    "fire_loop": sfx_fire_loop,
    "ratchet": sfx_ratchet,
    "twang": sfx_twang,
    "launch": sfx_launch,
    "rumble": sfx_rumble,
    "growl": sfx_growl,
    "chomp": sfx_chomp,
    "chew": sfx_chew,
    "burp": sfx_burp,
    "helmet": sfx_helmet,
    "stamp": sfx_stamp,
    "boom": sfx_boom,
    "pop": sfx_pop,
    "dust": sfx_dust,
}


def write_wav(path, x, peak_db=-1.0):
    x = np.asarray(x, dtype=np.float64)
    x = x - np.mean(x)
    peak = np.max(np.abs(x)) or 1.0
    x = x / peak * 10 ** (peak_db / 20)
    tail = min(len(x), int(0.01 * SR))
    x[-tail:] *= np.linspace(1, 0, tail)
    data = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def build_sfx():
    SFX.mkdir(parents=True, exist_ok=True)
    for name, build in SFX_BUILDERS.items():
        write_wav(SFX / f"{name}.wav", build())
    print(f"{len(SFX_BUILDERS)} sfx written to {SFX}")


if __name__ == "__main__":
    TMP.mkdir(parents=True, exist_ok=True)
    targets = sys.argv[1:] or ["narration", "score", "sfx"]
    if "sfx" in targets:
        build_sfx()
    if "score" in targets:
        build_score()
    if "narration" in targets:
        build_narration()
