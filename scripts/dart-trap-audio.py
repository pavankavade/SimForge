"""Builds the audio stems for the DartTrap episode using custom Gemini voice.

  python scripts/dart-trap-audio.py            # everything
  python scripts/dart-trap-audio.py narration  # only re-voice the narration
  python scripts/dart-trap-audio.py sfx        # only rebuild the sound effects
  python scripts/dart-trap-audio.py score      # only rebuild the score

Outputs:
  public/episodes/dart-trap/narration_v1.mp3
  public/episodes/dart-trap/score_v1.mp3
  public/episodes/dart-trap/sfx/*.wav
  src/episodes/dart-trap/data/wordTimestamps.json
  src/episodes/dart-trap/data/narrationCues.json
"""

import base64
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
import wave
from pathlib import Path
from dotenv import load_dotenv
import numpy as np
from scipy import signal

load_dotenv()

SLUG = "dart-trap"
VERSION = 1
VOICE_ID = "voice_ax8s6hqwv0of"

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "episodes" / SLUG
SFX_DIR = EP / "sfx"
DATA = ROOT / "src" / "episodes" / SLUG / "data"
TMP = ROOT / "out" / f"audio-tmp-{SLUG}"
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
LEAD_IN = 0.66  # room for the title card

# id, text, pause after the line (seconds).
LINES = [
    ("l1a", "If you hide pressure plates wired to spring-loaded dart slits in the walls, a greedy goblin will step right on the trigger and get turned into a pin-cushion.", 0.95),
    ("l2a", "However, an agile rogue will easily Matrix-dodge the entire volley with backflips and swagger.", 0.55),
    ("l2b", "So you enchant the darts with heat-seeking bat wings.", 0.3),
    ("l2c", "Even if he leaps over the initial burst, the darts make a screeching U-turn and swarm him from behind.", 0.95),
    ("l3a", "But a heavily armored paladin just raises his tower shield, letting every dart bounce off like rain.", 0.6),
    ("l3b", "To fix this, you install a floor-mounted pneumatic ballista firing a massive armor-piercing harpoon.", 0.35),
    ("l3c", "The steel spike punches clean through his shield, and the motorized winch reels him straight into the wall.", 0.95),
    ("l4a", "However, a clever mage will simply cast a cyclone of swirling wind to deflect every incoming projectile.", 0.55),
    ("l4b", "So you upgrade to a supersonic arcane coilgun with magnetic lightning capacitors.", 0.3),
    ("l4c", "The hyper-speed slug punches right through his wind vortex, shattering his spell and blasting him out of his boots.", 0.95),
    ("l5a", "Finally, for paranoid parties that push an armored wooden barricade down the hallway to hide behind,", 0.3),
    ("l5b", "you line both walls with motorized rotary Gatling turrets. The moment their cart touches the floor, a thousand steel flechettes shred the barricade to splinters, and twin pneumatic rams launch the whole party straight into your pet Mimic.", 0.65),
    ("end", "Congratulations, your dungeon is now unbeatable.", 1.6),
]

WORD_FIXES = {
    "l1a": [(["spring", "loaded"], "spring-loaded"), (["pincushion"], "pin-cushion")],
    "l2a": [(["matrix", "dodge"], "Matrix-dodge")],
    "l2c": [(["u", "turn"], "U-turn")],
    "l3b": [(["floor", "mounted"], "floor-mounted"), (["armor", "piercing"], "armor-piercing")],
    "l4a": [(["maid"], "mage")],
    "l4b": [(["coil", "gun"], "coilgun")],
    "l4c": [(["hyper", "speed"], "hyper-speed")],
}


def _bare(w):
    return re.sub(r"[^\w'-]", "", w).lower()


def fix_words(line_id, words):
    out = list(words)
    for old, new in WORD_FIXES.get(line_id, []):
        n = len(old)
        for i in range(len(out) - n + 1):
            if [_bare(x[0]) for x in out[i:i + n]] == [_bare(o) for o in old]:
                parts = new.split()
                s, e = out[i][1], out[i + n - 1][2]
                if len(parts) == n:
                    rep = [[p, out[i + k][1], out[i + k][2]] for k, p in enumerate(parts)]
                else:
                    step = (e - s) / len(parts)
                    rep = [[p, s + k * step, s + (k + 1) * step] for k, p in enumerate(parts)]
                out[i:i + n] = rep
                break
    return out


def tts_gemini_line(text, dst_wav):
    """Synthesizes text using Gemini API with custom voice, then gets word timestamps."""
    api_key = os.getenv("GEMINI_API_KEY")
    json_cache = dst_wav.with_suffix(".json")
    if dst_wav.exists() and dst_wav.stat().st_size > 1000 and json_cache.exists():
        return json.loads(json_cache.read_text())
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")

    if dst_wav.exists() and dst_wav.stat().st_size > 1000:
        audio_bytes = dst_wav.read_bytes()
    else:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"## Transcript:\n{text}\n"}
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "voice": VOICE_ID
                    }
                }
            }
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        for attempt in range(4):
            try:
                with urllib.request.urlopen(req) as resp:
                    res = json.loads(resp.read().decode())
                part = res["candidates"][0]["content"]["parts"][0]
                data_b64 = part["inlineData"]["data"]
                audio_bytes = base64.b64decode(data_b64)
                dst_wav.write_bytes(audio_bytes)
                break
            except Exception as e:
                if attempt == 3:
                    raise
                print(f"TTS retry {attempt + 1}: {e}")
                time.sleep(2)

    if json_cache.exists():
        return json.loads(json_cache.read_text())

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    words = []
    try:
        t_resp = client.models.generate_content(
            model="gemini-3.5-transcribe",
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type="audio/wav"),
            ],
            config=types.GenerateContentConfig(
                audio_transcription_config=types.AudioTranscriptionConfig(
                    word_timestamp=True
                )
            )
        )
        t_part = t_resp.candidates[0].content.parts[0]
        if hasattr(t_part, "audio_transcription") and t_part.audio_transcription and t_part.audio_transcription.words:
            for w in t_part.audio_transcription.words:
                s = float(w.start_offset.rstrip("s"))
                e = float(w.end_offset.rstrip("s"))
                words.append([w.word, s, e])
    except Exception as e:
        print(f"Warning: transcription fallback for line: {e}")

    if not words:
        tokens = text.split()
        total_sec = len(audio_bytes) / (24000 * 2)
        w_dur = total_sec / max(1, len(tokens))
        for i, token in enumerate(tokens):
            words.append([token, i * w_dur, (i + 1) * w_dur])

    json_cache.write_text(json.dumps(words))
    return words


def build_narration():
    track = np.zeros(int(LEAD_IN * SR))
    cues = {}
    segments = []

    print(f"Building narration for {len(LINES)} lines...")
    for line_id, text, pause in LINES:
        wav_file = TMP / f"{line_id}.wav"
        words = fix_words(line_id, tts_gemini_line(text, wav_file))
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
        print(f"{line_id}: frames {start}-{end} (dur: {(end-start)/FPS:.2f}s) ({text[:42]}...)")

    total = len(track) / SR
    print(f"Narration length: {total:.2f}s = {round(total * FPS)} frames")

    raw = TMP / "narration_raw.wav"
    da.write_wav(raw, track, peak_db=-1.0)
    comp = TMP / "narration_comp.wav"
    da.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-i", str(raw),
            "-af", "highpass=f=70,acompressor=threshold=-24dB:ratio=2.5:attack=8:release=120:makeup=3dB",
            str(comp),
        ]
    )
    EP.mkdir(parents=True, exist_ok=True)
    out = EP / f"narration_v{VERSION}.mp3"
    da.loudnorm(comp, out, -16, tp=-1.5)
    print(f"{out.name} -> {da.measure_lufs(out):.1f} LUFS")

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "wordTimestamps.json").write_text(json.dumps(segments, indent=2))
    (DATA / "narrationCues.json").write_text(json.dumps({"durationFrames": round(total * FPS), "lines": cues}, indent=2))
    print(f"Saved cues to {DATA / 'narrationCues.json'}")


def build_score():
    looped = TMP / "score_loop.wav"
    src = ROOT / "public" / "episodes" / "dungeon-trap" / "score.mp3"
    cues_file = DATA / "narrationCues.json"
    if cues_file.exists():
        cues_data = json.loads(cues_file.read_text())
        dur_sec = max(80, int(cues_data["durationFrames"] / FPS) + 8)
    else:
        dur_sec = 100

    da.run(
        [
            "ffmpeg", "-y", "-hide_banner",
            "-i", str(src), "-i", str(src), "-i", str(src),
            "-filter_complex", f"[0:a][1:a][2:a]concat=n=3:v=0:a=1,atrim=0:{dur_sec}",
            str(looped),
        ]
    )
    EP.mkdir(parents=True, exist_ok=True)
    out = EP / f"score_v{VERSION}.mp3"
    da.loudnorm(looped, out, -27, tp=-6)
    print(f"{out.name} -> {da.measure_lufs(out):.1f} LUFS")


# SFX Primitives & Builders
t_axis = da.t_axis
noise = da.noise
bp = da.bp
lp = da.lp
hp = da.hp
decay = da.decay
sweep_sine = da.sweep_sine
place = da.place
silence = da.silence
metal = da.metal
thud = da.thud
whoosh = da.whoosh


def sfx_dart_fire():
    """Sharp compressed air hiss + quick mechanical spring release."""
    dur = 0.22
    t = t_axis(dur)
    snap = hp(noise(dur), 2200) * decay(dur, 0.03, attack=0.001) * 0.9
    whistle = np.sin(2 * np.pi * (1400 - 600 * (t / dur)) * t) * decay(dur, 0.05) * 0.35
    th = thud(0.15, 240, 90, 0.02, 0.4)
    return place(place(silence(dur), snap + whistle, 0.0), th, 0.0)


def sfx_dart_hit():
    """Sharp wooden / flesh thwack with small reverberant tick."""
    dur = 0.25
    body = thud(0.2, 180, 70, 0.03, 0.8)
    click = da.sfx_click() * 0.5
    tick = hp(noise(dur), 3000) * decay(dur, 0.015, attack=0.001) * 0.7
    return place(place(body, click, 0.0), tick, 0.0)


def sfx_tink():
    """Crisp high-pitched metal deflection ping."""
    dur = 0.4
    return metal(dur, 1800, 0.12, (1.0, 2.3, 4.1), (1.0, 0.4, 0.15)) * 0.6


def sfx_bank():
    """High-speed screeching aerodynamic turn."""
    dur = 0.6
    t = t_axis(dur)
    f = 800 + 1200 * np.sin(np.pi * t / dur) ** 2
    whistle = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 1.5 * 0.4
    air = bp(noise(dur), 1200, 3500) * np.sin(np.pi * t / dur) * 0.5
    return whistle + air


def sfx_ballista_cock():
    """Heavy mechanical ratchet winding."""
    out = silence(0.8)
    for i in range(6):
        place(out, da.sfx_clank() * 0.5, i * 0.12)
    return out


def sfx_ballista_fire():
    """Huge heavy wooden snap + deep bass shockwave."""
    dur = 0.8
    out = thud(0.6, 95, 32, 0.12, 1.2)
    snap = hp(da.sfx_twang(), 400) * 0.9
    air = whoosh(0.5, 120, 1400, 0.4) * 0.8
    place(out, snap, 0.0)
    place(out, air, 0.02)
    return out


def sfx_harpoon_hit():
    """Massive metal puncture + masonry impact."""
    dur = 1.0
    out = da.sfx_boom() * 0.75
    place(out, metal(0.8, 140, 0.35, (1.0, 2.1, 3.8), (1.0, 0.6, 0.3)) * 0.8, 0.0)
    place(out, da.sfx_spike() * 0.8, 0.0)
    return out


def sfx_winch():
    """High-speed motor gear whir."""
    dur = 1.2
    t = t_axis(dur)
    f = 350 + 200 * (t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3
    whine = bp(noise(dur), 1500, 3200) * 0.35
    return (tone + whine) * np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.1)


def sfx_wind():
    """Swirling gust of wind."""
    dur = 1.8
    t = t_axis(dur)
    mod = 0.6 + 0.4 * np.sin(2 * np.pi * 1.5 * t)
    w = bp(noise(dur), 250, 1400) * mod * np.sin(np.pi * t / dur) * 0.85
    return w


def sfx_coil_charge():
    """Rising electromagnetic whine with lightning sparks."""
    dur = 1.2
    t = t_axis(dur)
    freq = 150 + 1200 * (t / dur) ** 2
    sine = np.sin(2 * np.pi * np.cumsum(freq) / SR) * (t / dur) * 0.45
    hum = bp(noise(dur), 120, 300) * (t / dur) * 0.4
    spark = ba.sfx_zap() * 0.5
    out = place(sine + hum, spark, 0.8)
    return out


def sfx_coil_fire():
    """Supersonic crack + thunderous blast."""
    dur = 1.6
    t = t_axis(dur)
    crack = hp(noise(dur), 1500) * decay(dur, 0.02, attack=0.0005) * 1.4
    boom = da.sfx_boom() * 0.9
    zap = ba.sfx_zap() * 0.7
    out = place(silence(dur), crack, 0.0)
    place(out, boom, 0.01)
    place(out, zap, 0.02)
    return out


def sfx_gatling():
    """Rapid mechanical rotary burst."""
    dur = 1.5
    out = silence(dur)
    for i in range(12):
        t0 = i * 0.1
        place(out, sfx_dart_fire() * 0.6, t0)
        place(out, metal(0.12, 1200 + (i % 3) * 200, 0.03) * 0.3, t0)
    return out


def sfx_wood_splinter():
    """Violent crate destruction and flying wood."""
    dur = 0.7
    out = da.sfx_dust() * 0.7
    place(out, thud(0.4, 160, 60, 0.05, 0.8), 0.0)
    for i in range(5):
        place(out, hp(noise(0.15), 1800) * decay(0.15, 0.03) * 0.5, i * 0.06)
    return out


def sfx_ram_punch():
    """Pneumatic piston slam + heavy punching impact."""
    dur = 0.9
    out = thud(0.5, 110, 35, 0.12, 1.3)
    piston = ba.sfx_hydraulic() * 0.6
    place(out, piston, 0.0)
    return out


EXTRA = {
    "dart_fire": sfx_dart_fire,
    "dart_hit": sfx_dart_hit,
    "tink": sfx_tink,
    "bank": sfx_bank,
    "ballista_cock": sfx_ballista_cock,
    "ballista_fire": sfx_ballista_fire,
    "harpoon_hit": sfx_harpoon_hit,
    "winch": sfx_winch,
    "wind": sfx_wind,
    "coil_charge": sfx_coil_charge,
    "coil_fire": sfx_coil_fire,
    "gatling": sfx_gatling,
    "splinter": sfx_wood_splinter,
    "ram": sfx_ram_punch,
    "creak": lambda: da.creak(0.6, 95, 140),
    "magic": lambda: da.place(ba.sfx_levitate() * 0.7, da.sfx_sparkle() * 0.8, 0.1),
}

SFX_BUILDERS = {**da.SFX_BUILDERS, **ba.EXTRA, **EXTRA}


def build_sfx():
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    for name, build in SFX_BUILDERS.items():
        da.write_wav(SFX_DIR / f"{name}.wav", build())
    print(f"{len(SFX_BUILDERS)} sfx written to {SFX_DIR}")
    # AI takes picked with scripts/gen-sfx.py replace their procedural versions.
    ai = sorted((SFX_DIR.parent / "sfx_ai").glob("*.wav"))
    for wav in ai:
        shutil.copyfile(wav, SFX_DIR / wav.name)
    if ai:
        print(f"{len(ai)} AI sfx laid over from {SFX_DIR.parent / 'sfx_ai'}")


if __name__ == "__main__":
    targets = sys.argv[1:] or ["narration", "score", "sfx"]
    if "sfx" in targets:
        build_sfx()
    if "narration" in targets:
        build_narration()
    if "score" in targets:
        build_score()
