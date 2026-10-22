# AGENTS.md

Guidance for agents building episodes in this repo (Remotion + React Three Fiber,
1080x1920 @ 30 fps vertical shorts). Read this before you add or rework an episode.

## Quality bar

**Episode 1 (`src/episodes/dungeon-trap`, composition `DungeonTrap`) is the reference.**
Episode 2 (`src/episodes/rolling-boulder`, `RollingBoulder`) follows the same structure.
Every new episode should match them in story, timing, camera work, audio and finish.
Before you write anything, read Ep1's `timeline.ts`, `Scene.tsx` and `config.ts`.
Copy their structure rather than inventing a new one.

A "first pass" that only puts geometry on screen is not done. The user rejected an earlier Ep2
for these reasons:

- generic blocks;
- a camera that missed the action;
- narration and action that drifted apart;
- characters walking through objects;
- victims that reappeared after they died.

## Episode layout

```
src/episodes/<slug>/
  timeline.ts      # beats, geometry, motion math (pure functions of frame)
  Scene.tsx        # what is on screen: artifacts, actors, bursts
  config.ts        # camera waypoints/tracks, SFX cues, audio, subtitles, overlays
  TrapHUD.tsx      # title card, stage badges, end stamp (if the format uses them)
  data/            # wordTimestamps.json + narrationCues.json (generated)
src/artifacts/<theme>/   # reusable procedural props for the episode
public/episodes/<slug>/  # narration_vN.mp3, score_vN.mp3, sfx/*.wav (generated)
scripts/<slug>-audio.py  # audio pipeline (see below)
```

Register the composition in `src/episodes/registry.ts`. Add `render:<slug>` and `still:<slug>`
scripts to `package.json`, following the existing ones. The render script runs loudnorm to
-14 LUFS after the Remotion render.

## Story rules ("Evolution of a …" format)

- Five levels. Each level follows the same pattern:
  1. **install** the trap, on screen, while the narration names it;
  2. a **victim** is caught;
  3. a **counter** class beats it.
  The next level is the designer's answer to that counter. The finale escalates and ends on a stamp
  (for example "UNBEATABLE").
- The picture must match the narration word for word. If the line says "slips backward into its
  path", show the slip, the backward slide, and the boulder hitting him.
  Do not show something the narration does not say, or the opposite of it.
- **No resurrections.** A character who dies stays dead. That can be a splat on the boulder face,
  a skeleton, or debris. A recurring class is a new person, and they enter on camera.
- **Entries only after exits.** Newcomers walk in through the exit only after the previous hazard
  has left the frame (Ep2 uses `enterAfter(id)`). Nobody walks through a boulder, a wall or a door.
- Each victim's death needs a readable silhouette on screen for at least about 15 frames before
  the camera moves on.
- Comedy comes from timing and posing: a smug pose to camera after a counter, a fist pump,
  cowering. Keep it readable at phone size.

## Timing: derive every beat from the voice

- The narration is voiced **line by line**. `scripts/<slug>-audio.py` writes
  `data/narrationCues.json` with the word frames of each line from edge-tts `WordBoundary` events.
- `timeline.ts` exposes `w(lineId, word, nth)` and `lineStart(lineId)`. Every beat in `BEATS` is
  expressed as `w(...) ± offset`. Never hard-code a frame number for a story beat.
  If you re-voice a line, the action must move with it.
- Kinematics are solved backwards from beats. For example, Ep2's `solveT1` picks the boulder's
  ramp time so it reaches the victim's x exactly on the impact word.
- Keep geometry constants (x positions, radii, heights) in `timeline.ts`, so that `Scene.tsx` and
  `config.ts` (camera, SFX) use the same numbers.
- `DURATION = cues.durationFrames + 10`.

## Audio pipeline

Use `scripts/dungeon-audio.py` and `scripts/boulder-audio.py` as the templates. Reuse the Ep1
synthesis toolkit by importing it rather than copying it.

- **Narration:**
  - voice `en-US-AndrewMultilingualNeural` at about +6% rate;
  - one TTS call per line, with silence trimmed;
  - lines laid end to end with an explicit pause after each one, and **never overlapping**;
  - compressed and normalised to about **-16 LUFS**;
  - a lead-in of about 0.66 s for the title card.
- **Score:** procedural, normalised to about **-27 LUFS**, so it sits under the voice. In config,
  set both `audio.volume` and `music.volume` to **1**. Do the mix in the pipeline, not with
  config volumes.
- **SFX:** procedural `.wav` files in `public/episodes/<slug>/sfx/`.
  - Key every cue to a `BEATS` value or to a kinematics helper such as `footFrame(b)`.
    Do not use literal frames.
  - Trim long loops with `durationInFrames` and `fadeOutFrames`.
  - Every visible impact gets a sound, and most get a shake too.
- **Subtitles:** `data/wordTimestamps.json` holds punctuated word segments. The engine shows 4–5 word
  chunks with the active word in `#ffd84d`.

## Camera and framing

- The frame is a 9:16 portrait at `fov: 40`. At distance `d`, the visible width is about
  `0.41·d` and the visible height is about `0.73·d`. Keep the subject inside the middle ~80%
  of the width. Keep important action above the subtitle band, which sits about 370 px from
  the bottom.
- **Waypoints** are for the establishing shots and the reaction shots. **Tracks**
  (`camera.tracks`, `{start, end, blend, fn}`) are for anything that moves fast:
  - rolling objects (`boulderCam`);
  - sprinting entries (`walkTrack`);
  - flights (`flightCamera`).
  Tracks are applied in order, and later tracks override earlier ones. Use `blend: 1` for a hard cut.
- Show every install: cut or pan to the trap while the narration names it. Then show the victim
  and the counter, each framed where the action happens.
- Do not frame bright exits or empty space during a track. Clamp tracking cameras short of the
  level edges, and let the object leave the frame.
- Pace: hold reaction shots. Ep1 pans every 25–90 frames. Slow push-ins are better than constant motion.
- Shakes go on impacts, `{at, strength 0.1–0.36, spread 5–10}`. Rumbles go on sustained rolls and
  quakes, with strength 0.02–0.05.

## Visual style

- Use the diorama look: a cutaway set in front of a wall, with `ENVIRONMENT_PRESETS.dungeonVault`.
- Use procedural textures from `src/engine/textures.ts`.
- Add warm torch glows (`GlowSprite` in `src/artifacts/dungeon/Fx.tsx`), dust motes, and the Ep1
  grade and vignette.
  Use no external models or textures.
- Build characters with `AdventurerUnit` (goblin, rogue, mage, paladin). It has these poses:
  `idle`, `walk`, `jump`, `cast`, `shield`, `shieldWalk`, `fall`, `launch`, `sprawl`, `slip`,
  `float`, `windup`, `smash`, `cower`. Add new poses there; do not fork the rig.
- Use the `weapon` prop for variants, for example `weapon="warhammer"`.
- Every interaction gets a `Burst` (dust, sparks, slime, jelly). Contacts must actually touch:
  feet on the floor, splats on the boulder face, crushers meeting their victims.
  Check these in stills.
- Props should look like their names. A "hall-wide boulder" really spans the hall.
  An "electromagnet" glows and arcs. A "blast door" has hazard stripes.

## Verification workflow (required)

1. Run `npm run lint`, which runs `eslint src && tsc` with `noUnusedLocals`. It must pass.
2. Bundle once, then render many stills against the bundle. This takes about 1 s per frame
   in parallel.

   ```pwsh
   npx remotion bundle --out-dir <tmp>/bundle
   npx remotion still <tmp>/bundle <CompositionId> <tmp>/review/f-<N>.png --frame=<N> --scale=0.4
   ```

   Tile the stills into contact sheets, then look at them. Check every beat:
   - install;
   - approach;
   - impact;
   - the moment after impact;
   - entry;
   - the frames on both sides of every camera track's start and end.
3. Fix what you see and repeat. Common problems:
   - the subject is off-frame or cut by the frame edge;
   - the camera pans across empty space;
   - a stage title wraps or overflows;
   - lights blow out nearby armour;
   - objects clip into each other.
4. Run the full render with `npm run render:<slug>`. Make a contact sheet of the video, for example
   `ffmpeg -i out/<slug>.mp4 -vf "select='not(mod(n\,40))',scale=180:320,tile=10x6" -frames:v 1 sheet.png`.
   Check the integrated loudness with `ffmpeg -af ebur128`. The target is about -14 LUFS.
5. Commit only after the contact sheet reads as a coherent story with no dead frames.

## Conventions

- Shell: Windows pwsh. Write temporary Python or JS scripts to files. Avoid `python -c` with f-strings.
- Match the existing code style:
  - pure `(frame) => state` helpers in `timeline.ts`;
  - small `xxxActor(frame): Actor | null` functions in `Scene.tsx`;
  - no CSS transitions or `Date`, so renders stay deterministic.
- Leave generated assets (audio, JSON cues) reproducible from the audio script.
  Bump the `_vN` suffix when re-voicing, so cached audio is never stale.
