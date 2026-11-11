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

## Hallway 2: the boulder hall (`?hall=boulder`)

Ep2 ("Evolution of a Boulder Trap", `src/episodes/rolling-boulder`) re-staged in a corridor with a
release ledge and a daylight doorway (`src/boulder/`). Everything there is authored in Ep2's own
frame (x along the hall, z across it) under one root group (`hall.js toLab`), so the episode's
beats, boulder paths and party choreography port almost as they are (`timeline.js`, keyed to
`rolling-boulder/data/narrationCues.json`); `anim.js` adds the cast, props, camera, SFX and bursts.

```bash
npm run dev                                                    # then:
#   ?hall=boulder              the film in real time (space pause, ←/→ seek, &f=N start)
#   ?hall=boulder&cam=threeq   film mode for film.mjs
#   ?hall=boulder&play=1       the game (&class=rogue|mage|paladin skips the picker)
Q="hall=boulder" node film.mjs ../../out/misc/boulder-hallway threeq    # voice + SFX + score, -14 LUFS
Q="hall=boulder" PICK=240,941 node film.mjs <dir> threeq               # stills only
python sheet.py <dir>/threeq sheet.png 6                               # contact sheet of stills
node test-game.mjs --node      # class x trap win/die matrix, in node
node test-game.mjs             # the same in headless Chrome on the dev server, plus real key events
```

The game's rules are `src/boulder/sim.js` (no DOM, no three); `game.js` adds input, camera, sound
and HUD. Five traps, one hall-filling ball each, released when you trip them, so standing still or
running back never works: rogue E vault / Q tuck-roll, mage E levitate / Q blink, paladin E warhammer /
hold Q shield wedge, each with a short timing window, and each trap rules some moves out (slime,
crushers, spikes, magnet). `src/boulder/playtest.js` checks all of it.
