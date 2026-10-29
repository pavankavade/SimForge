"""Builds the audio stems for SlowFlight ("What if you could fly, but only at
walking speed?") with the series' custom Gemini voice (same pipeline as
nuclear-bunker: gemini-3.8-flash-tts, word timestamps from gemini-3.5-transcribe,
per-line cache in out/audio-tmp-<slug>/gemini).

  python scripts/slow-flight-audio.py                  # everything
  python scripts/slow-flight-audio.py narration score  # any of narration, sfx, score
  python scripts/slow-flight-audio.py preview          # 40 s audition of every score style

Needs GEMINI_API_KEY (environment or .env) for lines that are not cached yet.

Outputs:
  public/whatif/slow-flight/narration_vN.mp3
  public/whatif/slow-flight/score_vN.mp3
  public/whatif/slow-flight/sfx/*.wav
  src/whatif/slow-flight/data/wordTimestamps.json
  src/whatif/slow-flight/data/narrationCues.json
"""

import base64
import importlib.util
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
import scipy.signal
from dotenv import load_dotenv

load_dotenv()

SLUG = "slow-flight"
VERSION = 2
VOICE_ID = "voice_ax8s6hqwv0of"

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "whatif" / SLUG
SFX_DIR = EP / "sfx"
DATA = ROOT / "src" / "whatif" / SLUG / "data"
TMP = ROOT / "out" / f"audio-tmp-{SLUG}"

for d in (EP, SFX_DIR, DATA, TMP):
    d.mkdir(parents=True, exist_ok=True)
VOICE_TMP = TMP / "gemini"
VOICE_TMP.mkdir(parents=True, exist_ok=True)


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


da = _load("dungeon_audio", "dungeon-audio.py")
ba = _load("boulder_audio", "boulder-audio.py")

SR = da.SR
FPS = 30
LEAD_IN = 0.5


# ---------------------------------------------------------------------------
# Script. One line per beat group; pauses are seconds after the line.
# ---------------------------------------------------------------------------

LINES = [
    # Cold open
    ("a1", "What if you could fly? Anywhere, any height, for as long as you like.", 0.4),
    ("a2", "There is just one catch. You can only fly as fast as you can walk.", 0.4),
    ("a3", "Three miles an hour. The neighbor's cat strolls along the fence, and beats you to the end of it.", 0.5),
    ("a4", "You try harder. You flap your arms. It does not help.", 1.0),
    # The rules
    ("b1", "But here is the thing. Your three miles an hour is measured through the air, not over the ground.", 0.3),
    ("b2", "Your real speed is your airspeed, plus the wind.", 0.4),
    ("b3", "One gust, and suddenly you are doing twenty.", 0.5),
    ("b4", "Fly into the wind, though, and you go nowhere at all.", 0.5),
    ("b5", "And whatever you can carry on foot, you can carry in the air. That means one passenger, on your back.", 1.0),
    # The problem
    ("c1", "Saturday afternoon. You and Grandpa Teo are on the bus to town, for your sister's school show.", 0.3),
    ("c2", "Tess is playing a singing sunflower, and Grandpa plays the piano for her. Without him, there is no show.", 0.5),
    ("c3", "Then the bus coughs, shudders, and dies, thirty eight miles from town.", 0.5),
    ("c4", "The show starts at seven. It is ten past three.", 0.3),
    ("c5", "At walking speed, thirty eight miles takes almost thirteen hours.", 0.6),
    ("c6", "Grandpa looks at you. Then at the sky. He used to fly crop dusters, and he still reads the wind like a newspaper.", 1.0),
    # The windsock and the plains
    ("d1", "He points his cane at a windsock on the farm next door.", 0.3),
    ("d2", "A windsock has five stripes, and each one fills at about three knots.", 0.3),
    ("d3", "All five are full. That is fifteen knots, about seventeen miles an hour, blowing straight toward town.", 0.5),
    ("d4", "So you put him on your back, and step into the wind.", 0.8),
    ("d5", "Your airspeed is still three. But the ground is now sliding past at twenty.", 0.4),
    ("d6", "The higher you go, the smoother the wind gets, because up here there is nothing to trip it.", 0.4),
    ("d7", "A crop duster drones past below. Grandpa salutes it.", 1.0),
    # Headwind wall
    ("e1", "Then the valley bends, and so does the wind.", 0.3),
    ("e2", "Now it is blowing in your face at exactly three miles an hour. Exactly as fast as you fly.", 0.4),
    ("e3", "You are flying flat out, and going nowhere. A cow watches you hover over her field for ten whole minutes.", 0.6),
    ("e4", "Then Grandpa points. A hawk is circling in one spot, with its wings perfectly still.", 0.6),
    # Thermal, and too high
    ("f1", "That is a thermal. The sun bakes the dark fields, the warm air rises in a column, and birds ride it up for free.", 0.3),
    ("f2", "You copy the hawk, and spiral up with it.", 0.4),
    ("f3", "Two thousand feet. Five thousand. Nine thousand.", 0.5),
    ("f4", "Up here the air is thin, and cold. It drops about three degrees for every thousand feet you climb.", 0.3),
    ("f5", "Frost creeps across your goggles. Grandpa opens his thermos, and the tea steams like a kettle.", 0.5),
    ("f6", "Far above, a jet rides the jet stream at a hundred and fifty miles an hour. That wind would get you to town in minutes. It would also freeze you solid.", 1.0),
    # Ridge lift
    ("g1", "Ahead, the mountains. And riding along the ridge, a paraglider.", 0.3),
    ("g2", "When wind hits a mountain, it has nowhere to go but up. Pilots call it ridge lift.", 0.3),
    ("g3", "You slide in beside her, and ride the rising air along the crest, like an escalator made of wind.", 1.0),
    # The stall
    ("h1", "Then the afternoon goes quiet. Clouds pile up over the peaks, and the wind just stops.", 0.4),
    ("h2", "Forty one minutes left. Nine miles to go. At your speed, that is three hours.", 0.6),
    ("h3", "You land on a rock at the top of the ridge. Your arms are shaking.", 0.5),
    ("h4", "Grandpa sits down next to you, and tells you about his last flight. He landed in a sunflower field, and never went up again.", 0.8),
    ("h5", "Then he licks his finger, holds it up, and says, wait for it.", 1.0),
    # The flip
    ("i1", "The sun touches the mountains. The rocks start to cool.", 0.3),
    ("i2", "And cold air is heavier than warm air.", 0.3),
    ("i3", "All day the wind blew up the slopes. Now it turns around, and pours downhill into the valley.", 0.3),
    ("i4", "A free tailwind, all the way to town.", 0.6),
    # The run
    ("j1", "You grab Grandpa, and jump.", 0.4),
    ("j2", "Three miles an hour, plus twenty two. You race down the valley, over the rooftops.", 0.4),
    ("j3", "Six fifty eight. Six fifty nine. You land on the school steps.", 0.4),
    # Payoff
    ("k1", "Grandpa slides onto the piano bench, just as the curtain opens.", 0.4),
    ("k2", "Tess sees him, and grins.", 0.4),
    ("k3", "And you watch from the back of the hall, hovering, too tired to land.", 1.0),
    # Hook
    ("m1", "Later, outside, the weather vane spins. Somewhere over the ocean, the jet stream is blowing at two hundred miles an hour.", 0.5),
    ("m2", "Thirty eight miles, at walking speed. Imagine what you could do with that.", 0.6),
    ("end", "Which wind would you ride? Tell us in the comments, and subscribe for part two.", 1.6),
]

# The transcriber writes numbers as digits; captions and beat keys want the spoken words.
NUMBER_WORDS = {
    "3": "three", "5": "five", "7": "seven", "9": "nine", "10": "ten", "13": "thirteen", "15": "fifteen",
    "17": "seventeen", "20": "twenty", "22": "twenty two", "38": "thirty eight", "41": "forty one",
    "150": "a hundred and fifty", "200": "two hundred", "2,000": "two thousand", "2000": "two thousand",
    "5,000": "five thousand", "5000": "five thousand", "9,000": "nine thousand", "9000": "nine thousand",
    "658": "six fifty eight", "6:58": "six fifty eight", "659": "six fifty nine", "6:59": "six fifty nine",
    "3:10": "ten past three",
}


def _bare(w):
    return re.sub(r"[^\w'-]", "", w).lower()


def spell_numbers(words):
    """Expands digit tokens back into the words the script uses (timing split evenly)."""
    out = []
    for word, s, e in words:
        key = re.sub(r"[^\w:]", "", word)
        if key in NUMBER_WORDS:
            parts = NUMBER_WORDS[key].split()
            step = (e - s) / len(parts)
            out.extend([[p, s + k * step, s + (k + 1) * step] for k, p in enumerate(parts)])
        else:
            out.append([word, s, e])
    return out


def align_to_script(text, words):
    """Keeps transcriber timings but forces the script's own words (same count) when they differ."""
    script = text.split()
    if len(script) == len(words):
        return [[script[i], words[i][1], words[i][2]] for i in range(len(words))]
    # Different token counts: spread the script words over the spoken span.
    s, e = words[0][1], words[-1][2]
    step = (e - s) / len(script)
    print(f"  (re-spacing {len(script)} script words over {len(words)} transcribed words)")
    return [[t, s + i * step, s + (i + 1) * step] for i, t in enumerate(script)]


def tts_gemini_line(text, dst_wav):
    """Voices one line with the custom Gemini voice, then word timestamps (both cached)."""
    api_key = os.getenv("GEMINI_API_KEY")
    json_cache = dst_wav.with_suffix(".json")
    if dst_wav.exists() and dst_wav.stat().st_size > 1000 and json_cache.exists():
        return json.loads(json_cache.read_text())
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set and this line is not cached yet.")

    if dst_wav.exists() and dst_wav.stat().st_size > 1000:
        audio_bytes = dst_wav.read_bytes()
    else:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": f"## Transcript:\n{text}\n"}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"voice": VOICE_ID}},
            },
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
        for attempt in range(10):
            try:
                with urllib.request.urlopen(req) as resp:
                    res = json.loads(resp.read().decode())
                audio_bytes = base64.b64decode(res["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
                dst_wav.write_bytes(audio_bytes)
                break
            except Exception as e:
                if attempt == 9:
                    raise
                # Rate limits (429) clear after a while: back off progressively.
                wait = 20 * (attempt + 1) if "429" in str(e) else 3
                print(f"TTS retry {attempt + 1} in {wait}s: {e}")
                time.sleep(wait)

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    words = []
    try:
        t_resp = client.models.generate_content(
            model="gemini-3.5-transcribe",
            contents=[types.Part.from_bytes(data=audio_bytes, mime_type="audio/wav")],
            config=types.GenerateContentConfig(audio_transcription_config=types.AudioTranscriptionConfig(word_timestamp=True)),
        )
        t_part = t_resp.candidates[0].content.parts[0]
        if getattr(t_part, "audio_transcription", None) and t_part.audio_transcription.words:
            for w in t_part.audio_transcription.words:
                words.append([w.word, float(w.start_offset.rstrip("s")), float(w.end_offset.rstrip("s"))])
    except Exception as e:
        print(f"Warning: transcription fallback for line: {e}")

    if not words:
        tokens = text.split()
        total_sec = len(audio_bytes) / (24000 * 2)
        w_dur = total_sec / max(1, len(tokens))
        words = [[t, i * w_dur, (i + 1) * w_dur] for i, t in enumerate(tokens)]

    json_cache.write_text(json.dumps(words))
    return words


def build_narration():
    track = np.zeros(int(LEAD_IN * SR))
    cues = {}
    segments = []

    print(f"Voicing {len(LINES)} lines with the Gemini voice {VOICE_ID}...")
    for line_id, text, pause in LINES:
        wav_file = VOICE_TMP / f"{line_id}.wav"
        words = align_to_script(text, spell_numbers(tts_gemini_line(text, wav_file)))
        x = ba.decode_samples(wav_file)

        a = max(0, int((words[0][1] - 0.04) * SR))
        b = min(len(x), int((words[-1][2] + 0.05) * SR))
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
        print(f"{line_id}: frames {start}-{end} ({(end - start) / FPS:.2f}s)  {text[:50]}")

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
# Sound effects (procedural)
# ---------------------------------------------------------------------------

def _norm(x, peak=0.85):
    return (x / (np.max(np.abs(x)) + 1e-6) * peak).astype(np.float32)


def _band(x, lo, hi, order=4):
    sos = scipy.signal.butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos")
    return scipy.signal.sosfilt(sos, x)


def sfx_wind_bed(dur=8.0):
    """Steady airflow with slow swells; loops cleanly (cross-faded ends)."""
    n = int(dur * SR)
    rng = np.random.default_rng(3)
    x = _band(rng.normal(0, 1, n), 180, 1600, 2)
    t = np.linspace(0, dur, n)
    env = 0.65 + 0.35 * np.sin(2 * np.pi * t / dur * 2) * np.sin(2 * np.pi * t / dur * 3 + 1)
    x = x * env
    f = int(0.4 * SR)
    x[:f] *= np.linspace(0, 1, f)
    x[-f:] *= np.linspace(1, 0, f)
    return _norm(x, 0.7)


def sfx_gust(dur=2.0):
    n = int(dur * SR)
    rng = np.random.default_rng(9)
    t = np.linspace(0, dur, n)
    noise = rng.normal(0, 1, n)
    # Sweep a band upward then let it fall away.
    out = np.zeros(n)
    hop = 2048
    for i in range(0, n, hop):
        seg = noise[i:i + hop * 2]
        c = 300 + 2200 * np.sin(np.pi * min(1.0, i / n)) ** 2
        out[i:i + len(seg)] += _band(seg, c * 0.6, c * 1.6, 2)[: len(out[i:i + len(seg)])] * np.hanning(len(seg))[: len(out[i:i + len(seg)])]
    env = np.sin(np.pi * t / dur) ** 1.5
    return _norm(out * env, 0.8)


def sfx_hawk(dur=1.6):
    """Red-tailed hawk style 'kee-eeer': a descending, rough, high cry."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f = 3200 - 1300 * (t / dur) ** 0.7
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) + 0.45 * np.sin(2 * phase + 0.4) + 0.2 * np.sin(3 * phase)
    rng = np.random.default_rng(14)
    rough = 1 + 0.35 * _band(rng.normal(0, 1, n), 60, 400, 2)
    env = np.minimum(1, t / 0.04) * np.exp(-t / 0.75)
    return _norm(tone * rough * env, 0.7)


def sfx_piano(dur=3.5):
    """Bright C major chord on a piano-ish additive voice."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    out = np.zeros(n)
    for midi, delay in ((48, 0.0), (60, 0.0), (64, 0.012), (67, 0.024), (72, 0.036)):
        f0 = 440 * 2 ** ((midi - 69) / 12)
        tt = np.clip(t - delay, 0, None)
        note = sum(np.sin(2 * np.pi * f0 * k * tt) * (0.6 ** (k - 1)) * np.exp(-tt * (1.2 + k * 0.6)) for k in range(1, 7))
        out += note * (tt > 0)
    hammer = np.exp(-t / 0.004) * np.random.default_rng(2).normal(0, 0.3, n)
    return _norm(out + hammer, 0.8)


def sfx_applause(dur=4.0):
    n = int(dur * SR)
    rng = np.random.default_rng(31)
    out = np.zeros(n)
    claps = int(dur * 140)
    for _ in range(claps):
        pos = rng.integers(0, n - 2000)
        L = rng.integers(300, 900)
        tt = np.arange(L) / SR
        out[pos:pos + L] += rng.normal(0, 1, L) * np.exp(-tt / 0.006) * rng.uniform(0.3, 1)
    out = _band(out, 500, 7000, 2)
    t = np.linspace(0, dur, n)
    env = np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 1.2)
    return _norm(out * env, 0.7)


def sfx_rustle(dur=1.4):
    """Dry tumbleweed rolling: crackly bursts on a soft hiss."""
    n = int(dur * SR)
    rng = np.random.default_rng(17)
    out = _band(rng.normal(0, 0.15, n), 1500, 7000, 2)
    for _ in range(90):
        pos = rng.integers(0, n - 600)
        L = rng.integers(80, 500)
        out[pos:pos + L] += rng.normal(0, 1, L) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(0.2, 0.9)
    out = _band(out, 800, 9000, 2)
    t = np.linspace(0, dur, n)
    return _norm(out * np.sin(np.pi * t / dur), 0.75)


def sfx_steam(dur=2.4):
    n = int(dur * SR)
    rng = np.random.default_rng(21)
    hiss = _band(rng.normal(0, 0.3, n), 1500, 8000)
    t = np.linspace(0, dur, n)
    env = np.minimum(1, t / 0.08) * (0.75 + 0.25 * np.sin(2 * np.pi * 3 * t)) * np.minimum(1, (dur - t) / 0.6)
    return _norm(hiss * env, 0.75)


def sfx_clunk(dur=1.0):
    """Engine giving up: a clank, a sputter, silence."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    out = np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.08) + 0.5 * np.sin(2 * np.pi * 410 * t) * np.exp(-t / 0.03)
    rng = np.random.default_rng(4)
    for k in range(5):
        pos = int((0.22 + k * 0.11) * SR)
        L = int(0.05 * SR)
        out[pos:pos + L] += _band(rng.normal(0, 1, L), 80, 900) * np.exp(-np.arange(L) / (0.012 * SR)) * (0.8 - k * 0.14)
    return _norm(out, 0.85)


def sfx_curtain(dur=1.6):
    n = int(dur * SR)
    rng = np.random.default_rng(8)
    x = _band(rng.normal(0, 1, n), 300, 3500, 2)
    t = np.linspace(0, dur, n)
    return _norm(x * np.sin(np.pi * t / dur) ** 2, 0.6)


EXTRA_SFX = {
    "wind_bed": sfx_wind_bed,
    "gust": sfx_gust,
    "hawk": sfx_hawk,
    "piano": sfx_piano,
    "applause": sfx_applause,
    "rustle": sfx_rustle,
    "steam": sfx_steam,
    "clunk": sfx_clunk,
    "curtain": sfx_curtain,
}


def build_sfx():
    print(f"Building sound effects in {SFX_DIR}...")
    builders = {**da.SFX_BUILDERS, **ba.EXTRA, **EXTRA_SFX}
    for name, fn in builders.items():
        da.write_wav(SFX_DIR / f"{name}.wav", fn())
    print(f"Generated {len(builders)} sound effects.")


# ---------------------------------------------------------------------------
# Score: original procedural loops in five styles (SCORE_STYLE picks the one
# the episode uses; `preview` renders a 40 s audition of each):
#   guitar   - plucked road-trip arpeggios, I-V-vi-IV in G, shaker (v2 score)
#   musicbox - celesta broken chords over a soft pad, gentle wonder
#   pizzicato- bouncy pizzicato bass and marimba, the curious-explainer feel
#   ambient  - slow airy pads with bell sparkles, floaty and calm
#   lofi     - mellow electric piano, brushed kit and vinyl crackle
# ---------------------------------------------------------------------------

SCORE_STYLE = "musicbox"
SCORE_LUFS = -33.0  # about 6 dB under the series default so the narration leads
PREVIEW_DIR = ROOT / "out" / "score-previews" / SLUG


def _hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def _pluck(f0, dur, bright=0.5, seed=0, decay=0.996):
    n = int(dur * SR)
    period = max(2, int(SR / f0))
    rng = np.random.default_rng(seed)
    buf = rng.uniform(-1, 1, period)
    buf = scipy.signal.lfilter([bright, 1 - bright], [1], buf)
    out = np.zeros(n)
    for i in range(n):
        j = i % period
        out[i] = buf[j]
        buf[j] = decay * 0.5 * (buf[j] + buf[(j + 1) % period])
    return out


def _bell(f0, dur, decay=1.2):
    """Celesta / music-box tine: slightly inharmonic partials, quick upper decay."""
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for ratio, amp, k in ((1, 1, 1), (2.01, 0.35, 2.2), (3.98, 0.18, 3.5), (5.4, 0.08, 5)):
        out += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t * k / decay)
    return out * np.minimum(1, t / 0.003)


def _marimba(f0, dur):
    t = np.arange(int(dur * SR)) / SR
    out = np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.35) + 0.3 * np.sin(2 * np.pi * f0 * 3.93 * t) * np.exp(-t / 0.06)
    return out * np.minimum(1, t / 0.002)


def _epiano(f0, dur):
    """Two-operator FM electric piano with a little tremolo."""
    t = np.arange(int(dur * SR)) / SR
    index = 1.6 * np.exp(-t / 0.25) + 0.2
    out = np.sin(2 * np.pi * f0 * t + index * np.sin(2 * np.pi * f0 * t)) * np.exp(-t / 1.4)
    return out * (1 + 0.12 * np.sin(2 * np.pi * 4.5 * t)) * np.minimum(1, t / 0.004)


def _pad(midis, dur, attack=1.2, release=1.5, cutoff=1800):
    """Detuned saw stack through a low-pass, slow swell in and out."""
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for m in midis:
        for det in (-0.08, 0.0, 0.07):
            out += scipy.signal.sawtooth(2 * np.pi * _hz(m + det) * t + det * 9)
    sos = scipy.signal.butter(2, cutoff, btype="lowpass", fs=SR, output="sos")
    out = scipy.signal.sosfilt(sos, out) / (len(midis) * 3)
    env = np.minimum(1, t / attack) * np.minimum(1, np.maximum(0, dur - t) / release)
    return out * env


def _kick(dur=0.35):
    t = np.arange(int(dur * SR)) / SR
    f = 50 + 70 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)


def _brush(dur=0.25, seed=0, lo=2500, hi=9000, tail=0.06):
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    return _band(rng.normal(0, 1, n), lo, hi, 2) * np.exp(-np.arange(n) / (tail * SR))


def _place(out, sig, at_sec, gain=1.0):
    s = int(at_sec * SR)
    if s >= len(out):
        return
    e = min(len(out), s + len(sig))
    out[s:e] += sig[: e - s] * gain


def _bars(dur_sec, bar_sec):
    return int(dur_sec / bar_sec) + 1


def score_guitar(dur_sec):
    beat = 60 / 100
    # G  D  Em  C  (MIDI roots) with triad shapes; each chord lasts one bar of 4 beats.
    chords = [(55, [0, 4, 7]), (50, [0, 4, 7]), (52, [0, 3, 7]), (48, [0, 4, 7])]
    out = np.zeros(int(dur_sec * SR))
    pattern = [0, 2, 1, 2, 0, 2, 1, 2]  # arpeggio over eighth notes (chord tone indices + octave)
    bar = 4 * beat
    seed = 0
    for b in range(_bars(dur_sec, bar)):
        root, shape = chords[b % 4]
        start = b * bar
        for k in (0, 2):  # bass on beats 1 and 3
            _place(out, _pluck(_hz(root - 12), 1.6, 0.3, seed := seed + 1), start + k * beat, 0.55)
        for i, idx in enumerate(pattern):
            midi = root + 12 + shape[idx] + (12 if i in (3, 7) else 0)
            _place(out, _pluck(_hz(midi), 1.2, 0.55, seed := seed + 1), start + i * beat / 2, 0.42 if i % 2 else 0.5)
        for i in range(8):  # shaker on the off-beats
            _place(out, _brush(0.06, 1000 + b * 8 + i, 5000, 11000, 0.015), start + i * beat / 2 + beat / 4, 0.12)
    return out, "lowpass=f=6500,aecho=0.8:0.6:60:0.25"


def score_musicbox(dur_sec):
    beat = 60 / 84
    # C  Am  F  G, a broken-chord sixteenth pattern on the tines over a pad.
    chords = [(60, [0, 4, 7]), (57, [0, 3, 7]), (53, [0, 4, 7]), (55, [0, 4, 7])]
    pattern = [0, 1, 2, 3, 2, 1, 0, 1]
    out = np.zeros(int(dur_sec * SR))
    bar = 4 * beat
    for b in range(_bars(dur_sec, bar)):
        root, shape = chords[b % 4]
        start = b * bar
        tones = [root + 12 + s for s in shape] + [root + 24]
        for i, idx in enumerate(pattern):
            _place(out, _bell(_hz(tones[idx]), 2.0), start + i * beat / 2, 0.5 if i % 4 == 0 else 0.34)
        if b % 2 == 1:  # a little answering phrase up high every other bar
            for i, m in enumerate((tones[2] + 12, tones[1] + 12, tones[0] + 12)):
                _place(out, _bell(_hz(m), 1.6), start + (2.5 + i * 0.5) * beat, 0.22)
        _place(out, _pad([root - 12, root - 5], bar + 1.0, 0.6, 0.9, 900), start, 0.5)
    return out, "lowpass=f=9000,aecho=0.8:0.7:90|170:0.3|0.18"


def score_pizzicato(dur_sec):
    beat = 60 / 116
    # C  Am  Dm  G with a walking pizzicato bass and off-beat marimba stabs.
    chords = [(48, [0, 4, 7]), (45, [0, 3, 7]), (50, [0, 3, 7]), (43, [0, 4, 7])]
    walk = [0, 7, 12, 7]
    out = np.zeros(int(dur_sec * SR))
    bar = 4 * beat
    seed = 500
    for b in range(_bars(dur_sec, bar)):
        root, shape = chords[b % 4]
        start = b * bar
        for k, step in enumerate(walk):
            _place(out, _pluck(_hz(root + step - 12), 0.5, 0.75, seed := seed + 1, 0.985), start + k * beat, 0.7)
        for k in range(4):  # marimba chord on every off-beat
            for s in shape:
                _place(out, _marimba(_hz(root + 24 + s), 0.6), start + (k + 0.5) * beat, 0.16)
        # A skipping marimba hook on bars 2 and 4.
        if b % 2 == 1:
            hook = [root + 31, root + 28, root + 26, root + 24]
            for i, m in enumerate(hook):
                _place(out, _marimba(_hz(m), 0.5), start + (0.25 + i * 0.25) * beat * 2, 0.24)
        for k in range(4):
            _place(out, _brush(0.05, 900 + b * 4 + k, 6000, 12000, 0.01), start + k * beat, 0.08)
    return out, "lowpass=f=8000,aecho=0.8:0.5:50:0.15"


def score_ambient(dur_sec):
    beat = 60 / 64
    # Dmaj7  Bm7  Gmaj7  A6, two bars each, with sparse bell sparkles.
    chords = [(50, [0, 4, 7, 11]), (47, [0, 3, 7, 10]), (43, [0, 4, 7, 11]), (45, [0, 4, 7, 9])]
    out = np.zeros(int(dur_sec * SR))
    span = 8 * beat
    rng = np.random.default_rng(64)
    for b in range(_bars(dur_sec, span)):
        root, shape = chords[b % 4]
        start = b * span
        _place(out, _pad([root + 12 + s for s in shape], span + 2.5, 2.2, 2.5, 1400), start, 0.9)
        _place(out, _pad([root - 12], span + 2.0, 1.5, 2.0, 400), start, 0.6)
        for _ in range(3):
            m = root + 24 + shape[rng.integers(0, len(shape))]
            _place(out, _bell(_hz(m), 3.0, 2.5), start + rng.uniform(0.5, span - 1), 0.18)
    return out, "lowpass=f=7000,aecho=0.8:0.8:180|330:0.35|0.25"


def score_lofi(dur_sec):
    beat = 60 / 80
    # Fmaj7  Em7  Dm7  Cmaj7 on a soft electric piano, swung brushes, kick, crackle.
    chords = [(53, [0, 4, 7, 11]), (52, [0, 3, 7, 10]), (50, [0, 3, 7, 10]), (48, [0, 4, 7, 11])]
    out = np.zeros(int(dur_sec * SR))
    bar = 4 * beat
    swing = beat * 0.58
    for b in range(_bars(dur_sec, bar)):
        root, shape = chords[b % 4]
        start = b * bar
        for k, at in ((0, 0.0), (1, 1.5 * beat + swing - beat / 2), (2, 2.5 * beat)):
            for j, s in enumerate(shape):
                _place(out, _epiano(_hz(root + 12 + s), 2.2), start + at + j * 0.012, 0.26 if k == 0 else 0.18)
        _place(out, _epiano(_hz(root - 12), 2.4), start, 0.4)
        for k in (0, 2.5):
            _place(out, _kick(), start + k * beat, 0.55)
        for k in (1, 3):
            _place(out, _brush(0.3, 700 + b * 2 + k, 1800, 7000, 0.08), start + k * beat, 0.22)
        for k in range(4):
            _place(out, _brush(0.05, 800 + b * 4 + k, 7000, 12000, 0.012), start + k * beat + swing, 0.07)
    rng = np.random.default_rng(78)
    crackle = np.zeros_like(out)
    pops = rng.integers(0, len(out), int(dur_sec * 9))
    crackle[pops] = rng.uniform(-1, 1, len(pops))
    out += _band(crackle, 1500, 9000, 2) * 0.25 + _band(rng.normal(0, 0.01, len(out)), 300, 4000, 2)
    return out, "lowpass=f=5200,aecho=0.8:0.6:70:0.2"


SCORES = {
    "guitar": score_guitar,
    "musicbox": score_musicbox,
    "pizzicato": score_pizzicato,
    "ambient": score_ambient,
    "lofi": score_lofi,
}


def render_score(style, dur_sec, out_mp3, lufs):
    out, chain = SCORES[style](dur_sec)
    fade = int(2.5 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)
    raw = TMP / f"score_{style}_raw.wav"
    da.write_wav(raw, out, peak_db=-3.0)
    warm = TMP / f"score_{style}_warm.wav"
    da.run(["ffmpeg", "-y", "-hide_banner", "-i", str(raw), "-af", chain, str(warm)])
    da.loudnorm(warm, out_mp3, lufs, tp=-8 if lufs < -24 else -2)
    print(f"{out_mp3.name} -> {da.measure_lufs(out_mp3):.1f} LUFS")


def build_score():
    cues_file = DATA / "narrationCues.json"
    dur_sec = 100
    if cues_file.exists():
        dur_sec = int(json.loads(cues_file.read_text())["durationFrames"] / FPS) + 6
    render_score(SCORE_STYLE, dur_sec, EP / f"score_v{VERSION}.mp3", SCORE_LUFS)


def build_previews():
    """40 s of each style twice: alone at -18 LUFS, and under the opening narration at the episode level."""
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    narration = EP / f"narration_v{VERSION}.mp3"
    for style in SCORES:
        solo = PREVIEW_DIR / f"{style}-solo.mp3"
        render_score(style, 40, solo, -18.0)
        bed = TMP / f"preview_{style}_bed.mp3"
        render_score(style, 40, bed, SCORE_LUFS)
        da.run([
            "ffmpeg", "-y", "-hide_banner", "-i", str(narration), "-i", str(bed),
            "-filter_complex", "[0:a]atrim=0:40[v];[v][1:a]amix=inputs=2:duration=shortest:normalize=0,loudnorm=I=-14:TP=-1.5",
            "-ar", "44100", "-b:a", "192k", str(PREVIEW_DIR / f"{style}-with-voice.mp3"),
        ])
    print(f"Previews in {PREVIEW_DIR}")


if __name__ == "__main__":
    modes = set(sys.argv[1:]) or {"narration", "sfx", "score"}
    if "narration" in modes:
        build_narration()
    if "sfx" in modes:
        build_sfx()
    if "score" in modes:
        build_score()
    if "preview" in modes:
        build_previews()
    print("All audio stems ready.")
