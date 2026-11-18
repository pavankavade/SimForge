# Igloo lab

"How a Snow Pile Becomes an Igloo" (OmnixxLabs shelter series), filmed in the crypt lab's
realistic look: three r187 WebGPURenderer + TSL, procedural snow and ice, SSGI bounce + AO, SSR on
the glazed ice, TRAA, bloom. Like `labs/crypt-hallway` it has its own `package.json`, so its three
version never touches the Remotion episodes. Script: `docs/shelter/igloo-script.md`.

- `src/anim.js`: the whole short as pure functions of the frame, every beat keyed to a spoken word
  (`w(line, word)`): block choreography, props, the family's tracks, camera shots, SFX, bursts, HUD.
- `src/set.js`: terrain (a warped grid, dense near the igloo), the dome's block layouts (flat rings,
  the rising spiral, the key block), the snow cave, the tunnel and the platform.
- `src/materials.js`: snow, igloo blocks (inner face glazes to ice, lamplight glows through at
  night), the cut face, the sky (golden hour to night with an aurora).
- Interior shots are a cutaway: everything in a `ClippingGroup` is cut at z = 0; back faces paint
  the packed-snow cross-section and a cap wall closes the terrain's section.
- The family are the episode cast's `dadParka` / `momParka` / `kidParka` (cold-weather civilians),
  sitting with the rig's `sit` pose.

```bash
npm install
python ../../scripts/igloo-audio.py          # narration, cues (src/data), SFX, score
npm run dev                                   # http://localhost:5191/?cam=main&f=1200 shows one frame
node sheet.mjs ../../out/shelter/igloo/wip/s1 40,300,800,1500   # contact sheet of picked frames
node film.mjs ../../out/shelter/igloo/final main                 # the film, mixed and mastered
```

`film.mjs` needs the dev server running and ffmpeg on PATH. The mastered film is
`final/main-final.mp4`; copy it to `out/shelter/igloo/igloo.mp4` and run `npm run check:video -- igloo`.
