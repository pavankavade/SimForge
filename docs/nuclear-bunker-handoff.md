# Nuclear Bunker short — handoff

An **original** ~119 s 1080×1920@30 explainer, "how a hole in your yard becomes a nuclear bunker".
Style reference: https://www.youtube.com/shorts/33dT0bfPwDE (local copy `scratch_ref2/ref.mp4`,
transcript `scratch_ref2/transcript.json`). The comparison against it is in
[nuclear-bunker-review.md](nuclear-bunker-review.md).

## Status (2026-10-26)

The episode is a **three.js / Remotion episode** like the dungeon-trap series. The Blender build
(`scripts/blender_nuclear_bunker.py`, `out/nuclear_bunker.blend`) is shelved. It was dropped for
three reasons: slow iteration, no character faces, and a second pipeline to maintain.

- Composition `NuclearBunker` (`src/shelter/nuclear-bunker/`, registered in `src/shelter/registry.ts`).
- `npm run render:nuclear-bunker`, then `npm run check:video -- nuclear-bunker`.
- Review: `npm run review -- NuclearBunker [--beats --around] [frames | a:b:step]`.

Decisions made with the user:
- **Cast:** a modern family in the ink & vinyl style instead of the fantasy classes:
  - civilian classes in `src/artifacts/characters/hero/kits.tsx`: `dad`, `mom`, `kid`, `grandma`,
    `neighborA`–`neighborF`;
  - plus a `Dog` prop.
- **Look:** hybrid. The original's camera language and explainers, with our stylised characters.
- **Camera:** front-on to the cut face near lawn height. Each shot pushes slowly in A→B; shots join
  with short whips. It tilts up to the sky for the bomb and the cloud, and pushes into the pipe mouth.
  The shot list is `SHOTS` in `config.ts`.
- **Captions:** the same chunked style as dungeon-trap (`bottomOffset` 370, active word `#ffd84d`).
- **Narration:** the Gemini TTS pipeline, the same as cave-home and rolling-boulder:
  - voice `voice_ax8s6hqwv0of`, model `gemini-3.8-flash-tts`, word timestamps from `gemini-3.5-transcribe`;
  - `GEMINI_API_KEY` is read from `.env`;
  - per-line cache in `out/audio-tmp-nuclear-bunker/gemini/`, which works offline once voiced;
  - v2 added three beats found missing in the review: the blast slamming the door "tighter into its
    frame", "stuck down there for years? Not even close", and "ninety-nine point nine percent";
  - `WORD_FIXES` maps the transcriber's digits ("3 ft", "10", "thousands") back to the spoken words.

## Scene structure

| File | What |
|---|---|
| `timeline.ts` | geometry, `BEATS` (all `w(line, word)`), kinematics, `faceOpenings(frame)` |
| `components/Yard.tsx` | lawn, house, fence, trees; the soil face built in **row slices** that skip every dug opening (pit, pipe mouth, shafts, tunnels) |
| `components/Pipe.tsx` | corrugated pipe that drops in, deck, lamps |
| `components/Shafts.tsx` | half-pipe shafts and tunnels set into the cut, straight shaft, dog-leg |
| `components/Blast.tsx` | horizon flash, mushroom cloud, dirt sucked up, fallout that lands and decays |
| `components/Explainer.tsx` | half-value layers (48 rays, 24→12→6→3→2→1), doorway rays, bend rays |
| `components/AirSystem.tsx` | air pipe, filter, cranked fan with airflow, shockwave balls, see-through blast valve, stopwatch |
| `components/Haze.tsx`, `Shed.tsx`, `Exit.tsx`, `Geiger.tsx`, `Furniture.tsx`, `Dog.tsx`, `Sky.tsx` | stale air; shed + blast door + truck gag + rubble; second tunnel + hatch; Geiger counter; supplies, bunk beds, cans, radio, board game; the dog; sky with night |
| `Scene.tsx` | Dad's actor, the crowd (drop in, sweat, cheer, settle), bursts |

The engine also gained `makeCorrugated` and `makeLawn` (`src/engine/textures.ts`), and `sfxFor(slug, root)`
for the `shelter/` folder.

## Next steps / polish ideas
- The voice is slower than the original (118.6 s vs 98 s). If it should be shorter: trim pauses, cut
  words, or speed up the mastered narration and scale the cue timestamps with it.
- Motion blur on whips (`@remotion/motion-blur` is not installed).
- Run the episode through `npm run review -- NuclearBunker --beats --around` once more after any change.
- Nothing committed yet. Never commit anything under `out/`.
