# Spy Horse lab

"How a Dead Horse Becomes a WW1 Spy Post" (OmnixxLabs shelter series), filmed in the crypt lab's
realistic look, like `labs/igloo`: three r187 WebGPURenderer + TSL, procedural mud, puddles,
sandbags and hide, SSGI bounce + AO, SSR on the wet hollows, TRAA, bloom, a cold war-photo grade.
It has its own `package.json`, so its three version never touches the Remotion episodes.
Script: `docs/shelter/spy-horse-script.md`.

- `src/anim.js`: the whole short as pure functions of the frame, every beat keyed to a spoken word
  (`w(line, word)`): time of day, props, the cast's tracks, camera shots (with the HUD's binocular,
  slit and sketch masks), SFX, bursts, HUD.
- `src/set.js`: no-man's land (terrain with shell craters, two trench lines with sandbag parapets,
  barbed-wire belts, shattered stumps, puddles), the procedural horse (real, the other carcasses and
  the hollow papier-mache copy with its neck slit), its wooden frame, the workshop, props.
- `src/materials.js`: mud, water, hessian, wood, hide, the copy (grey paper until `U.paint`), the sky
  (overcast day, dawn, moonlit night, far gun flashes).
- The cutaway (L5, L6b) clips only the copy and its frame at z = 0, so the observer shows lying
  inside the shell.
- The cast are the episode rig's WW1 soldiers (`tommy`, `tommyB`, `tommyC`, `artist`,
  `enemyOfficer` in `src/artifacts/characters/hero/kits.tsx`), with the rig's `crawl` and `prone`
  poses laid face down.

```bash
npm install
python ../../scripts/spy-horse-audio.py       # narration, cues (src/data), SFX, score
npm run dev                                    # http://localhost:5192/?cam=main&f=1200 shows one frame
node sheet.mjs ../../out/shelter/spy-horse/wip/s1 40,300,800,1500   # contact sheet of picked frames
Q="pos=1,2,6&look=0,0.5,0" PICK=900 node film.mjs ../../out/shelter/spy-horse/wip/dbg dbg   # debug lens
node film.mjs ../../out/shelter/spy-horse/final main                  # the film, mixed and mastered
```

`film.mjs` needs the dev server running and ffmpeg on PATH. The mastered film is
`final/main-final.mp4`; copy it to `out/shelter/spy-horse/spy-horse.mp4` and run
`npm run check:video -- spy-horse`.
