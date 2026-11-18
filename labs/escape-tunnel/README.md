# Escape Tunnel lab

"How a Prison Bed Becomes an Escape Tunnel" (OmnixxLabs shelter series), on the same pipeline as
`labs/spy-horse`: three r187 WebGPURenderer + TSL, SSGI bounce + AO, SSR, TRAA, bloom, filmed frame
by frame. Script and shot list: `docs/shelter/escape-tunnel-script.md`.

**State: all six lines and the ending built and filmed** (56 s, `out/shelter/escape-tunnel/escape-tunnel.mp4`). Every beat is keyed
to the voiced narration; it has been reviewed in stills, not yet watched for pacing.

- `src/anim.js`: the whole short as pure functions of the frame, every beat keyed to a spoken word
  (`w(line, word)`): how far each hole is dug, props, the cast's tracks, camera shots, SFX, bursts,
  HUD (badges, captions). No title card and no end stamp: the hook is spoken from
  frame 0, and the closing question loops back into it.
- `src/set.js`: the camp as one side-on cutaway at z = 0 (hut, bunks, stove, yard, double fence,
  guard tower, trees; under it the shaft, the gallery and the exit shaft, each plugged by a block
  of sand that `update()` shrinks as the digging goes on).
- `src/main.js`, `fx.js`, `soldier.js`, `cast.jsx`, `materials.js`: copied from the spy-horse lab
  (`soldier.js` adds the `prisoner`, `prisonerB`, `penguin` and `guard` looks).

Known rough spots: the night grade turns the lit sand in the exit shaft lavender, the searchlight
beam is a plain cone, the crouched dig pose reads a little like sitting, and the yard and the
background huts are still simple shapes.

```bash
npm install
python ../../scripts/escape-tunnel-audio.py   # narration, cues (src/data), SFX, score
npm run dev                                    # http://localhost:5193/?cam=main&f=700 shows one frame
node sheet.mjs ../../out/shelter/escape-tunnel/wip/s1 60,380,670,900,1240,1500   # contact sheet
Q="pos=3,-3,24&look=3,-3,0" PICK=900 node film.mjs ../../out/shelter/escape-tunnel/wip/dbg dbg   # debug lens
node film.mjs ../../out/shelter/escape-tunnel/final main                 # the film, mixed and mastered
```

`film.mjs` needs the dev server running and ffmpeg on PATH. The mastered film is
`final/main-final.mp4`; copy it to `out/shelter/escape-tunnel/escape-tunnel.mp4` and run
`npm run check:video -- escape-tunnel`.
