# AGENTS.md

Guidance for agents building episodes in this repo (Remotion + React Three Fiber,
1080x1920 @ 30 fps vertical shorts). **Read all of this before you add or rework an episode.**
It is written so that any model can reach the quality of the reference episodes by following it
step by step. When a rule here and your instinct disagree, follow the rule.

## 0. TL;DR workflow

```pwsh
$env:GEMINI_API_KEY = "<your-key>"                            # required for Gemini TTS voicing (see §9)
npm run new:episode -- <slug> "<Trap Name>" --theme dungeon   # scaffold (see §2)
# 1. write the 5-level script in scripts/<slug>-audio.py (LINES)
python scripts/<slug>-audio.py narration                      # voice it -> exact word cues
# 2. timeline.ts: geometry + BEATS (all w("line","word") ± n) + kinematics
# 3. Scene.tsx: set + trap props + one xxxActor(frame) per character + bursts
# 4. config.ts: camera waypoints/tracks, SFX, shakes; TrapHUD.tsx: stage names
npm run lint                                                  # must pass
npm run review -- <CompositionId> --beats --around            # LOOK at every sheet, fix, repeat
npm run render:<slug>
npm run check:video -- <slug>                                 # contact sheet + loudness
```

Work one level at a time: script → beats → scene → camera → SFX → review. Do not build all five
levels blind and review at the end.

## 1. Quality bar

**Episode 1 (`src/episodes/dungeon-trap`, `DungeonTrap`) and Episode 2
(`src/episodes/rolling-boulder`, `RollingBoulder`) are the reference.** Every new episode must match
them in story, timing, camera work, audio and finish.

- `templates/episode/` is a small, clean, working one-level example built on the shared kit
  (`src/kit`). It is what the scaffolder copies. Read it first: it shows every pattern in ~300 lines.
- Ep2 is the full five-level example on the same kit. Read its `timeline.ts`, `Scene.tsx` and
  `config.ts` before designing your levels. Its `config.ts` still has a few literal frame numbers in
  camera tracks from before the kit existed. Do not copy that; follow the template and §4.

A "first pass" that only puts geometry on screen is not done. The user rejected an earlier Ep2 for:

- generic blocks;
- a camera that missed the action;
- narration and action that drifted apart;
- characters walking through objects;
- victims that reappeared after they died.

## 2. Scaffolding a new episode

```pwsh
npm run new:episode -- <slug> "<Trap Name>" [--theme dungeon] [--no-audio]
```

This creates and wires everything:

| Path | What |
| --- | --- |
| `src/episodes/<slug>/timeline.ts` | geometry, `BEATS`, kinematics (pure functions of frame) |
| `src/episodes/<slug>/Scene.tsx` | set, trap props, actors, bursts |
| `src/episodes/<slug>/config.ts` | camera, SFX, shakes, audio, subtitles, overlays |
| `src/episodes/<slug>/TrapHUD.tsx` | title card, stage badges, end stamp |
| `src/episodes/<slug>/data/` | `narrationCues.json` + `wordTimestamps.json` (generated) |
| `scripts/<slug>-audio.py` | narration / score / SFX pipeline; **the script (`LINES`) lives here** |
| `public/episodes/<slug>/` | `narration_v1.mp3`, `score_v1.mp3`, `sfx/*.wav` (generated) |
| `package.json` | `render:<slug>`, `still:<slug>` |
| `src/episodes/registry.ts` | registration |

The composition id is the PascalCase slug (`ceiling-crusher` → `CeilingCrusher`). The scaffolder
runs the audio script. Voicing fresh lines requires `$env:GEMINI_API_KEY` (see §9). If no key is set or
TTS is offline, it still builds the score and SFX, writes a silent narration placeholder and
**estimated** cues so the episode renders immediately. Re-run the audio script before the final
review. While you rewrite `LINES` without voicing, `npm run cues:estimate -- <slug>` refreshes the
estimated cues.

The template ships with level 1 (ceiling crusher: goblin pancaked, rogue waits it out) and the
`end` stamp line. Replace or extend it. Keep the patterns.

## 3. Story rules ("Evolution of a …" format)

- **Five levels.** Each level follows the same pattern:
  1. **install** the trap, on screen, while the narration names it;
  2. a **victim** is caught;
  3. a **counter** class beats it.
  The next level is the designer's answer to that counter. The finale escalates and ends on the
  stamp ("Congratulations, your <theme> is now unbeatable.").
- The cast is goblin (clumsy victim), rogue (agile, patient), mage (magic counters), paladin
  (armour, shield, brute force). Pick the counter whose class ability actually explains the win.
- **The picture matches the narration word for word.** If the line says "slips backward into its
  path", show the slip, the backward slide, and the boulder hitting him. Never show something the
  narration does not say, or the opposite of it.
- **No resurrections.** A character who dies stays dead for the rest of the episode. That can be:
  - a corpse (`lying(...)` with `expression: "dead"`);
  - a pancake (`squash: 0.16`);
  - a `<Splat>` riding the hazard face;
  - a `<Skeleton>` or debris.
  A recurring class is a new person, and they enter on camera.
- **Entries only after exits.** Newcomers walk in through the exit only after the previous hazard
  has left the frame (Ep2: `enterAfter(id)`). Nobody walks through a boulder, a wall, a door or a
  corpse. Hop over corpses with `arc()`.
- Each death needs a readable silhouette on screen for at least about 15 frames before the camera
  moves on.
- **Comedy comes from timing and posing:**
  - victims `cower` with `expression: "scared"` the moment before impact;
  - counters gloat to camera after the win (`FACE_CAMERA`, `cast`/`cheer`/`point`, `expression: "smug"`);
  - add fist pumps and double-takes.
  Everything must read at phone size.

### Writing `LINES` (in `scripts/<slug>-audio.py`)

- Use one line per beat group. Ids are `l<level><a|b|c>`: `l1a` installs and catches the victim,
  `l1b` is the counter, and so on. The last line has the id `end`.
- Name the words you will key beats to plainly and once per line ("flattened", "leaps", "shield").
  Write numbers as words.
- Pauses are seconds after the line:
  - about 0.3 when the next line continues the action;
  - about 0.9–1.1 after a death or punchline;
  - 1.6 after `end`.
  Lines never overlap.
- An episode is usually 60–90 s (11–16 lines).
- After **any** change to `LINES`:
  1. bump `VERSION`;
  2. update `config.ts` `audio.src`/`music.src` to the new `_vN` files;
  3. re-run `python scripts/<slug>-audio.py narration score`;
  4. re-review every beat.

## 4. Timing: derive every beat from the voice

- `timeline.ts` gets `w(lineId, word, nth=0)`, `wEnd(...)`, `lineStart(lineId)`, `lineEnd` and
  `DURATION` from `createCues(cues)`. `w()` ignores case and punctuation. It **throws** if the word
  is not in the line, so a typo fails loudly. `DURATION = cues.durationFrames + 10`.
- Every beat in `BEATS` is `w(...) ± offset`. **Never type a literal frame for a story beat,
  camera waypoint, SFX cue or shake.** If you re-voice a line, everything must move with it.
- Solve kinematics backwards from beats:
  - a walker that must be under the trap on "underneath" starts at `beat - distance / speed`;
  - a boulder must reach the victim's x on the impact word (Ep2 `solveT1`).
- Geometry constants (x positions, heights, radii, `Z`) live in `timeline.ts` only. `Scene.tsx`
  and `config.ts` import them, so the camera, SFX and props always agree.
- Expose `defineEpisode({ config, Scene, beats: BEATS })` (the template does). `review.mjs --beats`
  then renders every beat automatically.
- Useful patterns from the template:
  - `SLAMS = [BEATS.crush - 4, ...]`: props have known lead times; solve them from the beat.
  - `ROGUE_ON_CAMERA`: the first frame a newcomer is clear of the exit glow. Cut to them then.
  - `Math.max(SLAMS[1] - 6, ROGUE_ENTER[1] + 2)`: when two beats can collide after re-voicing,
    clamp them so the order of events is preserved.

## 5. The shared kit (`src/kit`, import from `"../../kit"`)

| Module | Use |
| --- | --- |
| `cues` | `createCues(json)` → `w`, `wEnd`, `lineStart`, `lineEnd`, `DURATION` |
| `motion` | `lerp`, `progress(frame, [a,b])`, `easeInOut`, `easeOutCubic`, `easeOutBack`, `arc(t,h)`, `bezier`, `bezier3`, `wobble`, `bump`, `walkX` |
| `actors` | `Actor`, `ActorView`, `lying()`, `Splat`, `lieHeight`, `CHAR_SCALE`, `FACE_RIGHT/LEFT/CAMERA`, `HIP` |
| `fx` | `dust`, `sparks`, `slimeSplash`, `jellySplash`, `flamePuff`, `magic` (each returns a keyed `<Burst>`) |
| `camera` | `shot(x, y, d, {rise, lead, z})`, `followTrack`, `walkTrack`, `holdTrack`, `chainTracks`, `frameSize`, `distForWidth`, `distForHeight` |
| `sfx` | `sfxFor(slug)(name, frame, volume, extra)`, `loopCue` |
| `TrapHUD` | `createTrapHUD({ title, stages, end })` |

Do not copy these helpers into an episode. If something is missing and reusable, add it to the kit.

### Actors

Give each character one function in `Scene.tsx`:

```ts
const rogueActor = (frame: number): Actor | null => {
  if (frame < ROGUE_ENTER[0]) return null;                 // not entered yet
  if (frame < ROGUE_ENTER[1]) return { pose: "walk", position: [rogueX(frame), 0, Z], yaw: FACE_RIGHT, speed: 2.2 };
  ...
};
<ActorView classType="rogue" actor={rogueActor(frame)} frame={frame} />
```

- `position` is the feet. Feet must be on the floor (`y = 0`) unless the actor is jumping or
  flying.
- `speed` scales the animation:
  - about 1 for walking;
  - 1.5–2.5 for jogging, matched to the ground speed so feet do not skate;
  - about 0.7 for a heavy stomp.
- The walking pace is about 0.09 units/frame, jogging about 0.14 and sprinting about 0.2.
- `tilt` + `pivot` handle tumbles. Use `lying()` for bodies on the floor: it puts the back exactly
  on the floor.
- `squash` flattens about the floor (0.16 means pancaked). `scale` multiplies the class size.

## 6. Characters: the "ink & vinyl" style (`src/artifacts/characters/hero`)

The cast is chunky chibi toys:

- rounded shapes with smooth normals;
- soft-plastic PBR (`vinyl`) with a warm fresnel rim, so bodies pop off dark walls;
- a constant-width ink outline (inverted hull);
- big heads (`headR` 0.25 of a 1.64 body);
- expressive 2D-on-3D faces.

Never use plain `meshStandardMaterial` boxes for people. Never fork the rig.

### Using the cast

- `AdventurerUnit` props: `classType`, `pose`, `animFrame`, `weapon`, `expression`.
  Episodes use it through `ActorView`.
- Classes and scale (`CLASS_SCALE`): goblin 0.82, rogue 1, mage 1, paladin 1.06.
  The episode cast scale is `CHAR_SCALE` = 1.12.
- **Poses:**
  - `idle`, `walk`, `run`, `jump`, `fall`, `launch`, `float`;
  - `cast`, `shield`, `shieldWalk`, `windup`, `smash`;
  - `sprawl`, `slip`, `cower`, `cheer`, `point`;
  - `matrix` (bullet-time dodge: knees bent, torso arched far back; projectiles pass over it at y ≥ ~1.3).
- **Expressions:** `neutral`, `happy`, `smug`, `focus`, `angry`, `yell`, `scared`, `shock`, `pain`,
  `dazed`, `dead`. Each pose has a default face. Override it for story beats:
  - `scared` just before impact;
  - `dead` on every corpse;
  - `smug` on gloats.
- **Weapons:** `sword`, `warhammer`, `club`, `dagger`, `daggers`, `staff`, `none`. The defaults are:
  - goblin: club;
  - rogue: daggers;
  - mage: staff;
  - paladin: sword + shield (a warhammer drops the shield).
- Rig numbers are in `RIG` (`hipY` 0.62, `shoulderY` 1.04, `headY` 1.39, `height` 1.64, `lieY` 0.2).
  Multiply them by `CHAR_SCALE * CLASS_SCALE[class]` for world heights, and derive contact points
  from them instead of guessing.

### Extending the cast

- **New part:** use `<Part geo={G.xxx(...)} mat={vinyl(color, finish)} />`.
  - Geometry always comes from `G`, which caches it: `sphere`, `capsule`, `box` (rounded; winding
    already fixed), `cyl`, `cone`, `torus`, `disc`, `lathe`, `latheArc`, `bentCone`.
  - Size parts in real units; use `scale` only for shaping.
- **Finishes:** `skin`, `cloth`, `leather`, `hair`, `wood`, `bone`, `gloss`, `metal`, `gold`.
  - Use `gloss` (yellow) for small gold trim; `gold` and `metal` read as black at a distance.
  - Never put `metal` on a large back-facing panel (cape, shield back). Use cloth or wood.
- **Ink:**
  - Default width `INK_WIDTH`. Use `ink={INK_THIN}` for small details and `ink={false}` for tiny
    dark bits and decals.
  - Open shells (hoods, helmets) need `inkGeo` set to a closed proxy shape. Otherwise the hull
    shows through the opening.
  - If a flat panel renders solid black, its triangles are wound inward: build it with `G.box`,
    never raw `RoundedBoxGeometry`.
- `glow(color)` is for gems, orbs and magic (it blooms). `flat(color)` is for pupils, mouths and
  brows.
- **New pose:** add the name to `POSES` and a case to `solvePose` in `poses.ts`, using the joint
  conventions documented in `RigPose`. Add a default face in `POSE_EXPRESSION` in
  `AdventurerUnit.tsx`.
- **New expression:** add an entry to `EXPRESSIONS` in `Face.tsx`.
- **New class:** add a `ClassKit` in `kits.tsx` (Torso, Head, optional Back, Shoulder and Cuff
  slots, plus face layout and limb materials) and a `CLASS_SCALE` entry.
- **Then check it in the Character Lab**:
  ```pwsh
  npm run lab
  ```
  It writes `out/review/CharacterLab/sheet-*.png`. The pages are turnarounds, expressions,
  every pose per class, lying contact, skeletons, the episode-scale lineup and close-ups. Look at
  every page. Fix any of these before using the change in an episode:
  - floating feet;
  - black panels;
  - clipping weapons;
  - faces through hoods.

## 7. Sets and props

- **Set:** start from `<DioramaHall>` (`src/artifacts/sets`). It is the cutaway hall used across the
  series: back wall, pillars, bannered arch, torches, beams, tiled floor and a daylight exit.
  Its props:
  - `exit` ("left", "right" or "none");
  - `floorGaps` (pits, trapdoors);
  - `archX`, `pillarXs`, `torchXs`, `bannerColor`, `ceilingY`.
  Put the trap under the arch (`archX`) so the set frames it.
- **Existing props** you can reuse or study:
  - `src/artifacts/dungeon`: `SpikePit`, `HingedTrapdoor`, `PressurePlate`, `IceBridge`,
    `AlchemicalFlamers`, `PendulumBlade`, `TrebuchetFloor`, `MimicChest`, `BaitChest`;
  - `src/artifacts/boulder`: `RollingBoulder`, `Tripwire`/`ReleaseGate`, `SlimePuddle`,
    `Electromagnet`, `CeilingCrushers` (with `moreSlams` and `restDrop`), `HalfPipe`, `BlastDoor`,
    `GelatinousCube`, `Skeleton`.
- **New props** go in `src/artifacts/<theme>/` and are exported from its `index.ts`. Make each one a
  pure function of `useCurrentFrame()` plus beat props (`installFrame`, `triggerFrame`, …).
- **Prop rules:**
  - Props look like their names: a "hall-wide boulder" spans the hall, an "electromagnet" glows and
    arcs, and a "blast door" has hazard stripes.
  - Use procedural textures from `src/engine/textures.ts` (`makeMetal`, `makeMasonry`,
    `makeFlagstone`, `makeWood`) through `useSurface`.
  - Add warm `GlowSprite`s, `DustMotes` and hazard stripes on dangerous parts.
  - Do not use external models or textures.
  - Installs animate in: they drop, unfold or slide in with an overshoot (`easeOutBack`). Never pop.
- Every contact gets a burst keyed to the same beat as its SFX:
  - feet landing → `dust`;
  - metal on metal → `sparks`;
  - goo → `slimeSplash`;
  - spells → `magic`.
  Contacts must actually touch: feet on the floor, splats on the hazard face, crushers meeting
  their victims. Check this in stills.

## 8. Camera and framing

- The frame is 9:16 portrait at `fov: 40`. At distance `d` it shows about `0.41·d` wide and
  `0.73·d` tall. `shot(x, y, d)` looks side-on at point (x, y) on the action plane.
- **Screen zones** (from the top of the frame):
  - **Top ~30% until frame ~82:** the title card. During the install the trap must sit in the
    middle of the frame, below it.
  - **Top ~20% afterwards:** stage badges. Hazards hanging above a victim must stay below this.
  - **About 19–24% from the bottom:** the subtitle line (`bottomOffset: 370`). Put the floor
    (y = 0) at about 25% from the bottom or higher, so feet and bodies sit above the text.
  - **Width:** keep the subject inside the middle ~80%.
- **Waypoints** (`wp(BEATS.x ± n, shot(...))`) are for establishing and reaction shots. Hold them
  25–90 frames, and prefer slow push-ins.
- **Tracks** are for anything fast. Later tracks override earlier ones; `blend: 1` is a hard cut.
  - `followTrack({ start, end, target: f => [x(f), y, Z], clampX })` follows walkers, flights and
    projectiles.
  - `holdTrack(start, end, pose)` cuts to a fixed shot (a tight two-shot for a slam).
  - Ep2's `boulderCam` follows rolling hazards.
- **Show every install:** cut or pan to the trap while the narration names it. Then frame the victim
  with the hazard visible, and frame the counter where the counter happens.
- **Entries:** start the follow track when the newcomer is already clear of the doorway
  (`ROGUE_ON_CAMERA`), with `clampX` set short of the exit. Never frame the empty bright doorway,
  and never pan across empty space.
- Do not start a hold or cut until every subject in it has arrived, or they will be cut by the frame
  edge.
- **The finale:** pull back wide enough to hold the trap and the final survivor, centred between
  them.
- **Shakes and rumbles:**
  - shakes go on impacts, `{ at, strength: 0.1–0.36, spread: 5–10 }`;
  - rumbles go on sustained rolls and quakes, `strength: 0.02–0.05`.

## 9. Audio

The audio script (copied from `templates/audio.py`) imports the Ep1 and Ep2 toolkits
(`dungeon-audio.py` as `da`, `boulder-audio.py` as `ba`). Never copy them.

- **Narration:**
  - **TTS Engine & Voice:** Synthesized using the Gemini TTS endpoint with the custom series voice:
    - Model: `gemini-3.8-flash-tts` (`generateContent` with `responseModalities: ["AUDIO"]`);
    - Voice ID: `VOICE_ID = "voice_ax8s6hqwv0of"` configured in `speechConfig.voiceConfig.voice`;
    - Generated 24 kHz audio is trimmed of lead/tail silence (`tight_trim`) so pauses measure from actual speech.
  - **Word Timestamps:** Transcribed via `gemini-3.5-transcribe` with `AudioTranscriptionConfig(word_timestamp=True)` using the Google GenAI SDK (`google-genai`). `attach_punctuation` maps the words to frame numbers and writes `data/narrationCues.json` and `data/wordTimestamps.json`. Falls back to proportional spacing if transcription is unavailable.
  - **API Key & Environment Variable:**
    - Key is read from `GEMINI_API_KEY` (`os.getenv("GEMINI_API_KEY")`).
    - Set in pwsh:
      ```pwsh
      $env:GEMINI_API_KEY = "your_gemini_api_key"
      ```
    - Set in bash/zsh:
      ```bash
      export GEMINI_API_KEY="your_gemini_api_key"
      ```
    - **Caching:** The pipeline caches audio (`.wav`) and word timestamps (`.json`) per line in `out/audio-tmp-<slug>/`. If valid cache files exist, the audio script runs **without** requiring `GEMINI_API_KEY` or making network calls.
    - If unvoiced lines need synthesis and `GEMINI_API_KEY` is missing, the script halts with a clear `ValueError`.
  - **Legacy / Offline Fallback:**
    - Offline fallback uses `edge-tts` with voice `en-US-AndrewMultilingualNeural` at +6% rate (Ep1 & Ep2 default).
    - `npm run cues:estimate -- <slug>` generates estimated word cues without running TTS while rewriting `LINES`.
  - **Mastering:**
    - Lines laid end to end with their pauses, never overlapping;
    - Compressed and normalised to about **-16 LUFS**;
    - A 0.25–0.66 s lead-in before the first word for the title card.
- **Score:** the series theme, looped and normalised to about **-27 LUFS**. In the config, set
  `audio.volume` and `music.volume` to **1**. Do the mix in the pipeline, not with config volumes.
- **SFX:** procedural `.wav` files. The built-in list is in the audio script's comment block
  (`stamp`, `pop`, `chain`, `clank`, `gears`, `whoosh`, `slam`, `squash`, `hydraulic`, `thud`,
  `sparkle`, `boom`, `roll`, `squelch`, `zap`, …). Add episode sounds to `EXTRA` using the `da`
  primitives.
  - Use `const sfx = sfxFor("<slug>")`, then `sfx("slam", BEATS.crush, 0.55)`.
  - Every cue keys to a `BEATS` value or kinematics constant, never a literal frame.
  - Trim loops with `durationInFrames` and `fadeOutFrames` (or use `loopCue`). A cue only repeats
    its clip when it sets `loop: true` (`loopCue` does); otherwise it stops when the file ends.
  - Every visible impact gets a sound; most also get a shake.
  - Title `stamp` at frame 6, a `pop` per stage badge, and `stamp` plus `boom` on the end stamp.
- **AI SFX (optional):** `scripts/gen-sfx.py` generates takes locally with Stable Audio 3 Small SFX
  (needs a CUDA GPU; Ep4 used an RTX 3060 12 GB).
  - One-time setup: clone `Stability-AI/stable-audio-3` next to the repo, create its venv with
    `uv venv --python 3.10`, install `torch==2.7.1 torchaudio==2.7.1` from the cu126 index, then
    `uv sync --inexact --no-install-package torch --no-install-package torchaudio`. Accept the
    model licence on Hugging Face and run `hf auth login`.
  - Prompts live in `scripts/sfx-prompts/<slug>.json`. Generate with the stable-audio-3 venv python
    (`HF_HUB_CACHE=D:/hf-cache/hub` keeps the model off a full C: drive), audition
    `out/sfx-gen/<slug>/index.html`, then `python scripts/gen-sfx.py <slug> --pick name=take ...`.
  - Picks go to `public/episodes/<slug>/sfx_ai/` and `<slug>.picks.json` (seeds recorded); the
    episode audio script lays `sfx_ai/` over its procedural sfx, so re-running it keeps them.
  - The model returns pure static for fractional durations (1.2/1.6/1.8 s); the script always asks
    for whole seconds and flags any take whose spectral flatness looks like noise.
  - New clips change the mix: re-render and re-run `check:video` after picking.
- **Subtitles** are 4–5-word chunks, with the active word in `#ffd84d`.

## 10. HUD (`TrapHUD.tsx`)

- Create it with `createTrapHUD({ title, stages, end })`. There is one stage per level, each with a
  short name (**26 characters or fewer** so it stays on one line) and a distinct colour.
- Each stage sets `at: STAGE_STARTS[i]`, where `STAGE_STARTS[i] = lineStart("l<i>a")`. The first is
  clamped to at least 84, after the title card.
- The end is `{ label: "<THEME> STATUS", stamp: "UNBEATABLE", at: BEATS.stamp }`.

## 11. Verification (required, every level)

1. **Lint:** `npm run lint` (`eslint src && tsc`, with `noUnusedLocals`) must pass.
   - Do not use `Array.prototype.flatMap`/`flat` or `Object.values`/`entries` in `src`; the TS lib
     target does not include them.
   - Use `([] as T[]).concat(...)` and `Object.keys(o).map(k => o[k])` instead.
2. **Review stills:** `npm run review -- <CompositionId> [--beats] [--around] [frames | a:b:step] [--every N]`.
   - It bundles once and renders stills in parallel into labelled contact sheets at
     `out/review/<Id>/sheet-N.png`.
   - **Open and look at every sheet.**
   - `--beats --around` renders each beat at −6, 0 and +12.
   - Add ranges such as `300:420:6` around every track start and end, and every entry.
   - Heavy scenes can crash the GPU (WebGL `VALIDATE_STATUS false`, then `reading 'trim'`) at the
     default 4 parallel stills; pass `--concurrency 2`.
   - Back-to-back camera tracks blend out before the next blends in, which leaves a few frames
     of waypoint drift between cuts; wrap the track list in `chainTracks([...])`.
   - The bundler cache is disabled because it lagged one edit behind. If you call
     `npx remotion still` yourself, delete the old PNG first (it skips existing files) and pass
     `--bundle-cache=false`.
3. **Per-beat checklist.** For each level, confirm all of these in the stills:
   - [ ] The install is on screen while its name is spoken, and it animates in.
   - [ ] The victim approach is framed with the hazard visible.
   - [ ] The impact lands on the spoken word. The contact really touches, with a burst, an SFX and a
         shake.
   - [ ] The corpse is readable for at least 15 frames and stays dead for the rest of the episode.
   - [ ] The newcomer enters on camera, only after the hazard has left. There is no empty doorway
         shot, and nobody walks through anything.
   - [ ] The counter action matches the words, and the gloat reads at phone size.
   - [ ] No subject is cut by the frame edge or hidden under the HUD or subtitles.
   - [ ] No lights blow out armour, and nothing clips.
   - [ ] Stage titles fit on one line.
4. **Render:** `npm run render:<slug>`, then `npm run check:video -- <slug>`.
   - This writes `out/review/<slug>-video-sheet-N.png` (every 40th frame, numbered) and checks the
     integrated loudness (−14 ±1 LUFS, true peak ≤ −1 dBTP).
   - The sheet must read as a coherent story with no dead frames.
5. Commit only when the user asks.

## 12. Conventions

- Shell: Windows pwsh. Write temporary Python or JS scripts to files. Avoid `python -c` with
  f-strings, and do not chain commands with `echo` separators.
- **Determinism:**
  - every helper is a pure `(frame) => state` function;
  - noise comes from `random(seed)` (remotion), never `Math.random`;
  - no `Date`, CSS transitions or React state for animation.
- **Code style:**
  - `timeline.ts` exports constants, `BEATS` and kinematics;
  - `Scene.tsx` has small `xxxActor(frame): Actor | null` functions plus JSX;
  - `config.ts` holds data only.
  - Match the comment density of the template.
- Generated assets (audio, cue JSON) must be reproducible from the audio script. Bump `_vN` when
  re-voicing, so cached audio is never stale.
- Legacy code: `SoldierUnit`, the siege and starter episodes, and `src/toon/` are separate
  pipelines. Do not use them for new episodes.
