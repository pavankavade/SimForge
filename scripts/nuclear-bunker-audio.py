"""Builds the audio stems for NuclearBunker using the edge-tts Andrew voice.

  python scripts/nuclear-bunker-audio.py            # everything
  python scripts/nuclear-bunker-audio.py narration  # only re-voice
  python scripts/nuclear-bunker-audio.py sfx        # only rebuild the sound effects
  python scripts/nuclear-bunker-audio.py score      # only rebuild the score

Outputs:
  public/shelter/nuclear-bunker/narration_v1.mp3
  public/shelter/nuclear-bunker/score_v1.mp3
  public/shelter/nuclear-bunker/sfx/*.wav
  src/shelter/nuclear-bunker/data/wordTimestamps.json
  src/shelter/nuclear-bunker/data/narrationCues.json
"""

import asyncio
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import scipy.signal
from dotenv import load_dotenv

load_dotenv()

SLUG = "nuclear-bunker"
VERSION = 1
VOICE = "en-US-AndrewMultilingualNeural"
RATE = "+6%"

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "shelter" / SLUG
SFX_DIR = EP / "sfx"
DATA = ROOT / "src" / "shelter" / SLUG / "data"
TMP = ROOT / "out" / f"audio-tmp-{SLUG}"

EP.mkdir(parents=True, exist_ok=True)
SFX_DIR.mkdir(parents=True, exist_ok=True)
DATA.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


da = _load("dungeon_audio", "dungeon-audio.py")
ba = _load("boulder_audio", "boulder-audio.py")

SR = da.SR
FPS = 30
LEAD_IN = 0.45


# ---------------------------------------------------------------------------
# Script: original wording over the reference's engineering beats.
# One line per beat group. Pauses are seconds after the line.
# ---------------------------------------------------------------------------

LINES = [
    ("l1a", "Dig a hole in your yard, and climb in when the bomb drops.", 0.30),
    ("l1b", "You have a bunker. But the blast wave caves the walls in on top of you.", 0.90),
    ("l2a", "So you drop in a steel pipe, and bury it under three feet of dirt.", 0.30),
    ("l2b", "The explosion still sucks dirt into the sky, and it rains back down radioactive. This is fallout.", 1.00),
    ("l3a", "Every three and a half inches of dirt cuts the radiation in half. Three feet stops almost all of it.", 0.30),
    ("l3b", "But radiation travels in straight lines, right down your doorway.", 0.90),
    ("l4a", "So you bend the tunnel once, and then again. The rays hit dirt instead of you.", 0.30),
    ("l4b", "But ten people turn the sealed air hot and stale in hours.", 0.90),
    ("l5a", "So you run an air pipe to the surface, with a dust filter and a hand cranked fan.", 0.30),
    ("l5b", "The next shockwave shoots straight down that pipe.", 0.90),
    ("l6a", "So you add a valve that slams shut in a few thousandths of a second. This is a blast valve.", 0.90),
    ("l6b", "But the blast hits your door like a truck, so you hang it to open outward. This is a blast door.", 0.90),
    ("l7a", "Rubble piles up against it, and now you are trapped.", 0.90),
    ("l7b", "So you dig a second tunnel, up to a hatch in the yard.", 0.30),
    ("l8a", "But you cannot see radiation. You never know when it is safe to come out.", 0.90),
    ("l8b", "You hang a counter by the ladder, that clicks every time a particle hits it. This is a Geiger counter.", 1.00),
    ("l9a", "Fallout is ten times weaker after seven hours, and a hundred times weaker after two days.", 0.30),
    ("l9b", "So you only need supplies for two weeks.", 0.90),
    ("l10a", "Add bunk beds, canned food, a crank radio, and a very long board game.", 0.30),
    ("end", "Congratulations. You have built a nuclear bunker.", 1.60),
]


# ---------------------------------------------------------------------------
# Narration
# ---------------------------------------------------------------------------

def tts_line(text, dst_mp3):
    import edge_tts

    async def run():
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(str(dst_mp3))

    asyncio.run(run())


def synth_wav(text, line_id):
    mp3 = TMP / f"{line_id}.mp3"
    wav = TMP / f"{line_id}.wav"
    if not wav.exists():
        tts_line(text, mp3)
        da.run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(mp3), "-ac", "1", "-ar", str(SR), str(wav),
        ])
    return wav


def _norm(word):
    return re.sub(r"[^a-z0-9']", "", word.lower())


def transcribe_words(wav_path, line_id, text):
    cache = TMP / f"{line_id}.words.json"
    if cache.exists():
        return json.loads(cache.read_text())

    from faster_whisper import WhisperModel

    global _WHISPER
    if "_WHISPER" not in globals():
        _WHISPER = WhisperModel("base.en", device="cpu", compute_type="int8")
    segments, _info = _WHISPER.transcribe(
        str(wav_path), beam_size=5, word_timestamps=True,
        vad_filter=True, condition_on_previous_text=False,
    )
    words = []
    for seg in segments:
        if not seg.words:
            continue
        for w in seg.words:
            token = w.word.strip()
            if token:
                words.append([token, float(w.start), float(w.end)])

    # Align the recognised tokens with the written script so the caption text
    # always matches the narration exactly.
    tokens = text.split()
    if words and len(words) == len(tokens):
        for i, token in enumerate(tokens):
            words[i][0] = token
    elif words:
        # Replace recognised text with script tokens by nearest ratio position.
        aligned = []
        for i, token in enumerate(tokens):
            src = words[min(len(words) - 1, round(i * (len(words) - 1) / max(1, len(tokens) - 1)))]
            aligned.append([token, src[1], src[2]])
        words = aligned
    if not words:
        total = 1.0
        w_dur = total / max(1, len(tokens))
        words = [[t, i * w_dur, (i + 1) * w_dur] for i, t in enumerate(tokens)]

    cache.write_text(json.dumps(words))
    return words


def build_narration():
    track = np.zeros(int(LEAD_IN * SR))
    cues = {}
    segments = []

    print(f"Voicing {len(LINES)} lines with {VOICE}...")
    for line_id, text, pause in LINES:
        wav_file = synth_wav(text, line_id)
        words = transcribe_words(wav_file, line_id, text)
        x = ba.decode_samples(wav_file)

        first_word_s = words[0][1]
        last_word_e = words[-1][2]
        a = max(0, int((first_word_s - 0.04) * SR))
        b = min(len(x), int((last_word_e + 0.05) * SR))
        x = x[a:b]
        offset = len(track) / SR - a / SR
        track = np.concatenate([track, x, np.zeros(int(pause * SR))])

        wf = []
        for label, s, e in ba.attach_punctuation(text, words):
            sf = round((offset + s) * FPS)
            ef = max(sf + 1, round((offset + e) * FPS))
            wf.append({"word": label, "startFrame": sf, "endFrame": ef})
        for i in range(len(wf) - 1):
            wf[i]["endFrame"] = max(wf[i]["startFrame"] + 1, min(wf[i]["endFrame"], wf[i + 1]["startFrame"]))
        start = wf[0]["startFrame"]
        end = wf[-1]["endFrame"]
        cues[line_id] = {"startFrame": start, "endFrame": end, "words": wf}
        segments.append({"startFrame": start, "endFrame": end, "text": text, "words": wf})
        print(f"{line_id}: frames {start}-{end} ({(end - start) / FPS:.2f}s)  {text[:46]}...")

    total_frames = int(np.ceil(len(track) / SR * FPS))
    meta = {
        "slug": SLUG,
        "version": VERSION,
        "sampleRate": SR,
        "fps": FPS,
        "totalSamples": len(track),
        "durationSeconds": round(len(track) / SR, 3),
        "durationFrames": total_frames,
        "lines": cues,
    }

    (DATA / "narrationCues.json").write_text(json.dumps(meta, indent=2))
    (DATA / "wordTimestamps.json").write_text(json.dumps(segments, indent=2))

    raw = TMP / "narration_raw.wav"
    da.write_wav(raw, track, peak_db=-1.0)
    comp = TMP / "narration_comp.wav"
    da.run([
        "ffmpeg", "-y", "-hide_banner", "-i", str(raw),
        "-af", "highpass=f=70,acompressor=threshold=-24dB:ratio=2.5:attack=8:release=120:makeup=3dB",
        str(comp),
    ])
    out_mp3 = EP / f"narration_v{VERSION}.mp3"
    da.loudnorm(comp, out_mp3, -16.0)
    print(f"Narration written: {out_mp3} ({meta['durationSeconds']}s, {meta['durationFrames']} frames)")


# ---------------------------------------------------------------------------
# Extra sound effects
# ---------------------------------------------------------------------------

def sfx_geiger(dur=2.0):
    n = int(dur * SR)
    rng = np.random.default_rng(7)
    out = np.zeros(n)
    pos = int(0.05 * SR)
    while pos < n - int(0.06 * SR):
        click_len = int(rng.uniform(0.004, 0.010) * SR)
        t = np.linspace(0, click_len / SR, click_len)
        click = rng.normal(0, 0.9, click_len) * np.exp(-t / 0.0012)
        out[pos:pos + click_len] += click * rng.uniform(0.35, 1.0)
        pos += int(rng.uniform(0.03, 0.12) * SR)
    return (out / np.max(np.abs(out) + 1e-6) * 0.8).astype(np.float32)


def sfx_air_hiss(dur=1.6):
    n = int(dur * SR)
    rng = np.random.default_rng(21)
    noise = rng.normal(0, 0.3, n)
    sos = scipy.signal.butter(4, [1200, 7000], btype="bandpass", fs=SR, output="sos")
    hiss = scipy.signal.sosfilt(sos, noise)
    env = np.linspace(0.2, 1.0, n) * (1 - np.linspace(0, 1, n) ** 2)
    return (hiss * env / np.max(np.abs(hiss * env) + 1e-6) * 0.75).astype(np.float32)


def sfx_dirt_collapse(dur=1.8):
    n = int(dur * SR)
    rng = np.random.default_rng(33)
    out = rng.normal(0, 0.05, n)
    for _ in range(14):
        pos = rng.integers(0, n - int(0.3 * SR))
        hit_dur = rng.uniform(0.12, 0.35)
        t = np.linspace(0, hit_dur, int(hit_dur * SR))
        thud = np.sin(2 * np.pi * rng.uniform(55, 130) * t) * np.exp(-t / 0.06)
        out[pos:pos + len(thud)] += thud * rng.uniform(0.4, 0.9)
    return (out / np.max(np.abs(out) + 1e-6) * 0.85).astype(np.float32)


def sfx_valve_slam(dur=1.2):
    n = int(dur * SR)
    out = np.zeros(n)
    t = np.linspace(0, 0.35, int(0.35 * SR))
    clank = (np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.05)
             + np.sin(2 * np.pi * 380 * t) * np.exp(-t / 0.03) * 0.6
             + np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.02) * 0.3)
    out[:len(clank)] += clank
    rng = np.random.default_rng(11)
    hiss = rng.normal(0, 0.12, n) * np.exp(-np.linspace(0, 6, n))
    sos = scipy.signal.butter(4, [800, 6000], btype="bandpass", fs=SR, output="sos")
    out += scipy.signal.sosfilt(sos, hiss)
    return (out / np.max(np.abs(out) + 1e-6) * 0.9).astype(np.float32)


def sfx_radio_static(dur=1.5):
    n = int(dur * SR)
    rng = np.random.default_rng(5)
    noise = rng.normal(0, 0.25, n)
    sos = scipy.signal.butter(3, [400, 3200], btype="bandpass", fs=SR, output="sos")
    static = scipy.signal.sosfilt(sos, noise)
    env = 0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * np.linspace(0, dur, n))
    return (static * env / np.max(np.abs(static * env) + 1e-6) * 0.55).astype(np.float32)


def sfx_hatch(dur=0.9):
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    creak = np.sin(2 * np.pi * (280 + 90 * np.sin(2 * np.pi * 5 * t)) * t) * (1 - t / dur) * 0.35
    out = np.zeros(n)
    out += creak
    idx = int(0.55 * SR)
    ct = np.linspace(0, 0.25, int(0.25 * SR))
    clunk = np.sin(2 * np.pi * 90 * ct) * np.exp(-ct / 0.04) * 1.2
    out[idx:idx + len(clunk)] += clunk
    return (out / np.max(np.abs(out) + 1e-6) * 0.85).astype(np.float32)


EXTRA_SFX = {
    "geiger": sfx_geiger,
    "air_hiss": sfx_air_hiss,
    "dirt_collapse": sfx_dirt_collapse,
    "valve_slam": sfx_valve_slam,
    "radio_static": sfx_radio_static,
    "hatch": sfx_hatch,
}


def build_sfx():
    print(f"Building sound effects in {SFX_DIR}...")
    builders = {**da.SFX_BUILDERS, **ba.EXTRA, **EXTRA_SFX}
    for name, fn in builders.items():
        out_wav = SFX_DIR / f"{name}.wav"
        data = fn()
        da.write_wav(out_wav, data)
    print(f"Generated {len(builders)} sound effects.")


def build_score():
    """Series background score loop normalized to -27 LUFS."""
    looped = TMP / "score_loop.wav"
    src = ROOT / "public" / "episodes" / "dungeon-trap" / "score.mp3"
    cues_file = DATA / "narrationCues.json"
    if cues_file.exists():
        cues_data = json.loads(cues_file.read_text())
        dur_sec = max(80, int(cues_data["durationFrames"] / FPS) + 8)
    else:
        dur_sec = 110

    da.run([
        "ffmpeg", "-y", "-hide_banner",
        "-i", str(src), "-i", str(src), "-i", str(src),
        "-filter_complex", f"[0:a][1:a][2:a]concat=n=3:v=0:a=1,atrim=0:{dur_sec}",
        str(looped),
    ])
    out_mp3 = EP / f"score_v{VERSION}.mp3"
    da.loudnorm(looped, out_mp3, -27, tp=-6)
    print(f"{out_mp3.name} -> {da.measure_lufs(out_mp3):.1f} LUFS")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode in ("all", "narration"):
        build_narration()
    if mode in ("all", "sfx"):
        build_sfx()
    if mode in ("all", "score"):
        build_score()
    print("All audio stems ready.")
