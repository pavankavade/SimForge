# Crypt Hall lab

A standalone realism test on the latest three.js (r187: WebGPURenderer + TSL). It is **not** part of
the Remotion episodes and has its own `package.json`, so its three version never touches them.

Everything is procedural (no external models or textures):

- arcaded nave, galleries, barrel vault with ribs, a light well with an iron grate (`src/hall.js`)
- ashlar / flagstone / cloth / iron materials in TSL with bump, grime, puddles (`src/materials.js`)
- sun through the well + flickering torches; SSGI bounce + AO, raymarched godrays, SSR on the wet
  floor, TRAA, bloom, vignette and grain (`src/main.js`)

```bash
npm install
npm run dev            # http://localhost:5190 (slow dolly down the nave, space = pause)
```

URL params: `s` (distance down the hall; fixes the camera), `yaw`, `pitch`, `y`, `w`/`h` (fixed
render size), `sun`, `gi` (0 = off), `rays=0`, `ssr=0`, `exposure`,
`view=gi|ao|refl|ssr|rough|normal|diffuse` (debug buffers).

Play mode: `?play=1` (`&class=rogue|mage|paladin`) walks the finished dungeon in third person
(`src/game.js`). WASD, mouse look, shift run, space jump, E class ability (mage freezes the trapdoor,
paladin shields from fire), 1/2/3 switch class, R restart. The props, traps, bursts and cast are the
film's own modules: `buildProps`/`buildTraps` return `update(state)`, fed by `anim.js propsAt(f)` in
the film and by trap triggers in the game, so a visual fix lands in both.

Stills: with the dev server running, `node shoot.mjs <out-dir> "s=9&pitch=0.1" ...` drives headless
Chrome over CDP (the in-app browser pane throttles when hidden).
