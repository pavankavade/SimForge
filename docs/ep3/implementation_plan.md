# Episode 3 — "Evolution of a Crushing Walls" — Implementation Plan

Composition `CrushingWalls`, slug `crushing-walls`. 1080x1920 @ 30 fps, ~97 s (`DURATION` 2920).

> **Read this whole file once before touching code.** Then work phase by phase (P0 → P7).
> Every phase ends with a **verify loop**: run the command, open the images, tick the checklist,
> fix, and re-run until every box is ticked. Do not start the next phase with an unticked box.
>
> This plan **supersedes `docs/ep3/storyline_plan.md`**. Ignore that file. It uses literal frames,
> `<Series>`, pawn characters and top-down cameras, all of which break `AGENTS.md`.
> `AGENTS.md` is the law. This plan only fills in the episode-specific decisions.

---

## P0. Orientation and guardrails

### 0.1 Hard rules (breaking any of these = redo)

1. **Do not re-voice.** `narration_v1.mp3`, `narrationCues.json` and `wordTimestamps.json` are final.
   - Do NOT run `python scripts/crushing-walls-audio.py narration`.
   - Do NOT run `npm run cues:estimate`.
   - Do NOT run `npm run new:episode` (the scaffold already exists).
   - The only audio command you may run is `python scripts/crushing-walls-audio.py sfx`, and only
     after adding sounds to `EXTRA` (P7, optional).
2. **Never type a literal frame** for a beat, camera waypoint, SFX cue or shake. Always
   `w("line", "word") ± n`, or a constant derived from one. The frame numbers in this document are
   *nominal*, for your sanity checks only. Writing `159` in code instead of `w("l1a", "grab")` is a bug.
3. Geometry constants live **only** in `timeline.ts`. `Scene.tsx` and `config.ts` import them.
4. Use the kit (`src/kit`), the ink & vinyl cast (`ActorView`), and `DioramaHall`. No
   `meshStandardMaterial` people, no `SoldierUnit`, nothing from `src/toon/`.
5. Pure functions of `frame` only. Noise is `random(seed)` from remotion. No `Math.random`, `Date`,
   React state, or CSS transitions.
6. No `flatMap`, `flat`, `Object.values`, `Object.entries` in `src` (TS lib target). Use
   `([] as T[]).concat(...)` and `Object.keys(o).map((k) => o[k])`.
7. Do not commit.

### 0.2 Read first (in this order)

1. `AGENTS.md` (all of it).
2. `templates/episode/` (or the current scaffold in `src/episodes/crushing-walls/`): `timeline.ts`,
   `Scene.tsx`, `config.ts`, `TrapHUD.tsx`, `index.ts`.
3. `src/episodes/rolling-boulder/timeline.ts`, `Scene.tsx`, `config.ts` (Ep2, the five-level reference).
4. `src/kit/actors.tsx`, `src/kit/camera.ts`, `src/kit/motion.ts`, `src/kit/fx.tsx` (or `.ts`).
5. Props you will reuse or copy patterns from:
   `src/artifacts/boulder/Electromagnet.tsx` (lightning `Arc`), `CeilingCrushers.tsx` (piston look),
   `Skeleton.tsx`, `src/artifacts/dungeon/MimicChest.tsx`, `src/artifacts/sets/DioramaHall.tsx`.

### 0.3 The narration (exact cue frames)

The transcribed tokens differ from the script in places. Use the **token** column with `w()`.
`w()` ignores case and punctuation but keeps hyphens and apostrophes.

| Line | Text (abridged) | Key tokens → nominal start frame |
| --- | --- | --- |
| `l1a` 9–261 | If you wire two sliding stone walls to a loot pedestal, a greedy goblin will grab the shiny coin, and get pressed into a pancake. | wire 21, sliding 39, stone 63, walls 75, loot 93, pedestal 99, greedy 126, goblin 141, grab 159, shiny 177, coin 186, and 207, pressed 216, into 231, pancake 237 |
| `l2a` 270–462 | However, a show-off rogue will immediately parkour up the stone crevices to escape through the ceiling vent. | show-off 291, rogue 312, immediately 327, parkour 348, up 372, crevices 390, escape 420, through 429, ceiling 441, vent 453 |
| `l2b` 468–651 | So you replace the stone with grease-coated steel plates, and hide a spring-loaded boot inside the vent. | replace 483, stone 495, grease-coated 519, steel 546, plates 555, hide 579, spring-loaded 588, boot 609, inside 621, vent 639 |
| `l2c` 657–792 | Even if he climbs the grease, the ceiling punts him right back to the floor. | even 657, climbs 669, grease 690, ceiling 717, punts 738, him 747, right 756, back 765, floor 777 |
| `l3a` 801–1098 | But a stubborn paladin won't even try to climb. He just wedges a reinforced steel beam between the walls, and stands there smugly. | stubborn 810, paladin 825, climb 879, wedges 918, reinforced 945, steel 969, beam 981, between 999, walls 1014, stands 1044, smugly 1071 |
| `l3b` 1105–1285 | To fix this, you upgrade to twin 500-ton hydraulic presses, and electrify the wall plates. | upgrade 1132, twin 1147, **500** 1159, ton 1183, hydraulic 1192, presses 1210, electrify 1237, wall 1264, plates 1270 |
| `l3c` 1290–1584 | The moment his metal beam touches both sides, it completes the circuit, roasting him inside his own armor before folding him into a neat little cube. | moment 1293, metal 1317, beam 1329, touches 1344, both 1356, sides 1365, completes 1395, circuit 1416, roasting 1446, armor 1488, before 1500, folding 1509, neat 1539, little 1554, cube 1563 |
| `l4a` 1594–1747 | However, a lazy mage will simply cast a teleport spell to blink right through the wall. | lazy 1621, mage 1636, simply 1657, cast 1669, teleport 1681, spell 1702, blink 1711, through 1732, wall 1738 |
| `l4b` 1753–1870 | So you line the room with arcane deflection mirrors. | so 1753, line 1774, room 1792, arcane 1807, deflection 1831, mirrors 1852 |
| `l4c` 1876–2185 | The moment he teleports, his spell bounces between the closing walls like a game of high-speed Pong, until there is nowhere left to bounce. | moment 1882, teleports 1906, spell 1939, bounces 1960, closing 1993, walls 2008, **high-speed** 2041 (one token), pong 2068, nowhere 2119, bounce 2167 |
| `l5a` 2194–2362 | Finally, for paranoid parties that stand outside the doorway poking the floor with a ten-foot pole, | finally 2194, parties 2239, stand 2260, outside 2272, doorway 2287, poking 2302, floor 2317, **10-ft** 2332, pole 2347 |
| `l5b` 2368–2761 | you mount the entire room on high speed rails. The moment their stick touches a tile, the whole room lunges into the hallway, swallows them whole, and blasts them through the ceiling chute straight into your pet Mimic. | mount 2371, entire 2386, room 2407, **high** 2425, **speed** 2437 (two tokens), rails 2449, stick 2503, touches 2515, tile 2527, whole#0 2551, room#1 2563, lunges 2575, into#0 2593, hallway 2602, swallows 2620, whole#1 2644, blasts 2668, through 2692, ceiling 2698, **shoots** 2710 (not "chute"), straight 2719, into#1 2734, pet 2743, mimic 2749 |
| `end` 2771–2891 | Congratulations, your dungeon is now unbeatable. | congratulations 2771, dungeon 2828, unbeatable 2861 |

Repeated words need `nth`: `w("l5b", "whole", 1)`, `w("l5b", "into", 1)`, `w("l5b", "room", 1)`,
`w("l3c", "him", 1)` etc. `w()` throws on a typo, which is what you want.

To print every cue yourself:

```pwsh
node -e "const c=require('./src/episodes/crushing-walls/data/narrationCues.json');for(const k of Object.keys(c.lines))console.log(k, c.lines[k].words.map(x=>x.word+'@'+x.startFrame).join(' '))"
```

### 0.4 Line → level structure (differs from the AGENTS default!)

| Level | Install line | Victim line | Counter line |
| --- | --- | --- | --- |
| L1 Sliding stone walls | `l1a` (first half) | `l1a` (goblin) | `l2a` (rogue 1 escapes up the vent) |
| L2 Grease + spring boot | `l2b` | `l2c` (rogue 2 punted, pancaked) | `l3a` (paladin wedges a beam) |
| L3 Electric hydraulic press | `l3b` | `l3c` (paladin roasted, cubed) | `l4a` (mage 1 blinks out) |
| L4 Arcane mirror pong | `l4b` | `l4c` (mage 2 bounced, pancaked) | `l5a` (party pokes with a pole) |
| L5 Lunging rail room | `l5b` | `l5b` (party eaten by the mimic) | — (`end` stamp) |

So the stage badges pop on the **install** lines, not on `l<i>a`:

```ts
export const STAGE_STARTS = [
  Math.max(84, lineStart("l1a")),
  lineStart("l2b"),
  lineStart("l3b"),
  lineStart("l4b"),
  lineStart("l5b"),
] as const;
```

### 0.5 Cast and fates (no resurrections)

| Who | Class | Enters | Fate (persists to the end) |
| --- | --- | --- | --- |
| Goblin | goblin | L1, from the left exit | wafer → pancake, back right (lane in §G.4) |
| Rogue 1 | rogue | L2a, sprinting | escapes over the roof, leaves off the right of the frame; never returns |
| Rogue 2 | rogue | L2c, jogging (a new person) | punted, wafer → pancake, front right |
| Paladin 1 | paladin | L3a, carrying the beam | roasted, folded into `PaladinCube`, which pops forward to (0, Z+1.4) |
| Mage 1 | mage | L4a | blinks out through the right wall, walks off right; never returns |
| Mage 2 | mage | L4c, jogging | becomes a pong orb, pops, wafer → pancake, back left |
| Party | paladin 2, mage 3, rogue 3 | L5a | swallowed, squeezed, shot up the chimney into the mimic (null after) |

All x values in lanes are **room-relative** (see §G.1).

---

## G. Geometry (all in `timeline.ts`)

### G.1 The room and its offset

The whole trap is one "crush room" that sits under the middle of the hall. In L5 it lunges left
on rails, so **everything that belongs to the room** (walls, ceiling slab, chimney, pedestal,
tile, mirrors, presses, pancakes, the cube, the mimic) is rendered inside one group:

```ts
/** Room x offset. 0 until the L5 lunge, then LUNGE_DX. */
export const LUNGE_DX = -3.6;
export const roomDX = (frame: number) =>
  lerp(0, LUNGE_DX, easeOutBack(progress(frame, [BEATS.lunge, BEATS.lunge + 8])));
```

- Props: render inside `<CrushRoom frame={frame}>` = `<group position={[roomDX(frame), 0, 0]}>`.
- Actors are not inside the group. Any actor tied to the room (pancakes, the party after the
  lunge) uses `x = roomDX(frame) + localX`. Before L5 `roomDX` is 0, so this costs nothing.

### G.2 Constants

```ts
export const Z = -0.6;                // action plane
export const ENTRY_X = -10.2;          // daylight exit (left)
export const WALK = 0.09, JOG = 0.14, SPRINT = 0.2;

// Walls (room-relative). "inner" = distance from x=0 to a wall's inner face.
export const WALL_OPEN = 1.8;
export const WALL_T = 0.6;             // thickness: outer face = inner + WALL_T
export const WALL_OFF = 6.6;           // inner at install start (off-screen)
export const CLOSED_INNER = 0.06;      // fully shut (a 0.12 slot is left between faces)
export const WALL_BOTTOM = 0.14;       // walls float this high so they glide over pancakes
export const WALL_TOP = 3.15;
export const WALL_Z: [number, number] = [Z - 1.1, Z + 0.9];   // back meets the hall wall at z -1.7
export const DOOR_Z: [number, number] = [Z - 0.45, Z + 0.9];  // left-wall doorway (open to the front)
export const DOOR_H = 2.25;

// Ceiling slab, vent, chimney (installs in L2b)
export const SLAB_Y: [number, number] = [3.2, 3.45];   // spans x ±(WALL_OPEN + WALL_T + 0.2)
export const ROOF_Y = 3.45;
export const VENT_HALF = 0.45;                          // vent hole x ∈ [-0.45, 0.45]
export const CHIMNEY_TOP = 4.05;

// Bait
export const PEDESTAL = { x: 0, z: Z - 0.5, h: 1.0 };
export const COIN_Y = 1.12;
export const GRAB_X = -0.5;            // victims stop here, facing right, and reach for the coin

// L3
export const BEAM_L = 2.2;             // walls stall at inner = BEAM_L / 2 = 1.1
export const BEAM_Y = 2.45;            // above the doorway (DOOR_H 2.25), so the beam ends hit solid wall
export const PRESS = { x0: 2.5, x1: 3.5, y: 2.75, r: 0.4 };   // mirrored on both sides
export const CUBE = { size: 0.55, z: Z + 1.4 };

// L4
export const ORB_R = 0.45;
export const ORB_Y = 1.2;

// L5
export const TILE_X = -1.3;            // trigger tile (room-relative)
export const MIMIC = { x: 1.45, y: ROOF_Y, scale: 0.95 };     // on the roof, room-relative
export const PARTY = [                 // absolute, before the lunge
  { cls: "paladin", x: -3.2, z: Z },
  { cls: "mage", x: -4.05, z: Z + 0.3 },
  { cls: "rogue", x: -4.9, z: Z + 0.6 },
] as const;

// Pancake lanes: see §G.4

// Half-widths for the side squash (squashX), at episode scale
export const HALF = { goblin: 0.33, rogue: 0.36, mage: 0.38, paladin: 0.45 } as const;
```

### G.3 DioramaHall settings

```tsx
<DioramaHall exit="left" archX={null /* or omit the arch if the prop allows */} ceilingY={6.3}
  pillarXs={[-8.5, -5.6, 5.6, 8.5]} torchXs={[-7, -3.2, 3.2, 7]} bannerColor="#7a2a2a" />
```

Check the prop types in `src/artifacts/sets/DioramaHall.tsx` first. If `archX` cannot be null,
put it far off-screen (for example 30) or pass the documented "no arch" value. The arch columns are
at `archX ± 2.7` and would collide with the walls, so there must be **no arch over the room**.
Pillars and torches must not sit inside `x ∈ [-6.2, 3.2]` (the room's sweep, including the lunge).
Verify in the first review sheet and nudge them if they clip.

### G.4 Pancake lanes

Pancakes must not lie where a later character stands or walks (walkers go along z = Z to
`GRAB_X`; the L5 party ends up at room-relative x 0.4, -0.45, -1.3 at z Z, Z+0.3, Z+0.6). Use:

```ts
export const LANES = {
  goblin: [0.85, Z - 0.7],   // back right, beside the pedestal
  rogue2: [0.75, Z + 0.6],   // front right
  mage2: [-0.9, Z - 0.65],   // back left
} as const;
export const PANCAKE_SQUASH = 0.12;
```

A pancake's top must stay below `WALL_BOTTOM` (0.14) so later wall slams glide over it. Check this
in a still with the walls shut. If it pokes through, lower `PANCAKE_SQUASH` to 0.09.

---

## T. Core timeline machinery (write this in P2, before any level content)

### T.1 BEATS (complete list)

Write the whole object now, even for levels you have not built yet; `assertBeats()` (T.5) needs it.
Nominal frames are in brackets. They are **not** code.

```ts
export const BEATS = {
  // L1 install + victim (l1a)
  wallsIn: w("l1a", "sliding"),                 // [39]  walls slide in from off-screen
  wallsInEnd: w("l1a", "walls") + 8,            // [83]
  pedestalUp: w("l1a", "loot"),                 // [93]  pedestal rises from the floor
  wiresGlow: w("l1a", "pedestal") + 6,          // [105] floor wires pedestal→walls light up
  goblinGrab: w("l1a", "grab"),                 // [159]
  coinUp: w("l1a", "coin"),                     // [186] coin lifted overhead
  l1Close: w("l1a", "and"),                     // [207] walls start closing
  doubleTake: w("l1a", "pressed"),              // [216]
  crush1: w("l1a", "pancake"),                  // [237] walls meet
  reopen1: w("l1a", "pancake") + 20,            // [257] reopen window, 14 frames
  // L1 counter (l2a)
  rogue1Grab: w("l2a", "immediately"),          // [327]
  parkour: w("l2a", "parkour"),                 // [348]
  escape: w("l2a", "escape"),                   // [420] reaches the ceiling
  ventIn: w("l2a", "through"),                  // [429] squeezes into the vent
  roof: w("l2a", "vent"),                       // [453] pops out on the roof; walls slam under him
  // L2 install (l2b)
  reopen2: w("l2b", "replace") - 6,             // [477]
  platesIn: w("l2b", "replace"),                // [483] steel plates slide down over the stone
  platesInEnd: w("l2b", "steel") + 6,           // [552]
  grease: w("l2b", "grease-coated"),            // [519] grease drips down the plates
  chimney: w("l2b", "hide"),                    // [579] chimney rises on the roof
  bootDemo: w("l2b", "boot"),                   // [609] boot punches down out of the vent
  hatch: w("l2b", "vent"),                      // [639] boot retracts, hatch shuts
  // L2 victim (l2c)
  rogue2Grab: w("l2c", "even") - 4,             // [653]
  climb2: w("l2c", "climbs"),                   // [669]
  atVent2: w("l2c", "ceiling"),                 // [717]
  punt: w("l2c", "punts"),                      // [738]
  land2: w("l2c", "punts") + 10,                // [748]
  slam3: w("l2c", "floor"),                     // [777]
  reopen3: w("l2c", "floor") + 20,              // [797]
  // L2 counter (l3a)
  paladinArrive: w("l3a", "climb"),             // [879]
  creep3: w("l3a", "climb") + 6,                // [885]
  wedge: w("l3a", "wedges"),                    // [918] beam lifted overhead
  stall: w("l3a", "walls"),                     // [1014] walls hit the beam ends and stall
  smug: w("l3a", "smugly"),                     // [1071]
  // L3 install (l3b)
  pressL: w("l3b", "twin"),                     // [1147]
  pressR: w("l3b", "500"),                      // [1159]
  hiss: w("l3b", "hydraulic"),                  // [1192]
  electrify: w("l3b", "electrify"),             // [1237]
  // L3 victim (l3c)
  sparkL: w("l3c", "both"),                     // [1356]
  sparkR: w("l3c", "sides"),                    // [1365]
  arc1: w("l3c", "completes"),                  // [1395]
  arc2: w("l3c", "circuit"),                    // [1416]
  roast: w("l3c", "roasting"),                  // [1446] skeleton x-ray flicker starts
  roastEnd: w("l3c", "before"),                 // [1500]
  fold: w("l3c", "folding"),                    // [1509] walls fold him (18 frames)
  cubeReopen: w("l3c", "cube") - 12,            // [1551]
  cube: w("l3c", "cube"),                       // [1563] cube pops forward, toaster ding
  // L3 counter (l4a)
  mage1Grab: w("l4a", "simply"),                // [1657]
  cast: w("l4a", "cast"),                       // [1669]
  blink: w("l4a", "blink"),                     // [1711]
  close4End: w("l4a", "wall") - 6,              // [1732]
  // L4 install (l4b)
  reopen4: w("l4b", "so"),                      // [1753]
  mirror1: w("l4b", "line"),                    // [1774] first mirror (all five: MIRROR_POPS below)
  // L4 victim (l4c)
  mage2Grab: w("l4c", "moment"),                // [1882]
  teleport: w("l4c", "teleports"),              // [1906] mage becomes an orb
  pop: w("l4c", "bounce"),                      // [2167] orb pops, walls shut
  reopen5: w("l4c", "bounce") + 20,             // [2187]
  // L4 counter (l5a)
  partyArrive: w("l5a", "outside"),             // [2272]
  poke: w("l5a", "poking"),                     // [2302]
  // L5 install + victims (l5b)
  rails: w("l5b", "mount"),                     // [2371]
  wheels: w("l5b", "high"),                     // [2425]
  booster: w("l5b", "rails"),                   // [2449]
  stickIn: w("l5b", "stick"),                   // [2503]
  trigger: w("l5b", "touches"),                 // [2515]
  lunge: w("l5b", "lunges"),                    // [2575] 8 frames, easeOutBack
  portcullis: w("l5b", "swallows"),             // [2620]
  blast: w("l5b", "blasts"),                    // [2668] walls slam on the party
  launch: w("l5b", "them", 1),                  // [2686] party shot up the chimney (+3 per member)
  mimicOpen: w("l5b", "straight") - 4,          // [2715]
  arrive: w("l5b", "into", 1),                  // [2734] (+3 per member)
  chomp: w("l5b", "mimic"),                     // [2749]
  burp: w("end", "congratulations") + 20,       // [2791]
  stamp: w("end", "unbeatable"),                // [2861]
} as const;
```

Keep `BEATS` numbers only (`review --beats` renders each value). The five mirror pops live in
their own constant:

```ts
export const MIRROR_POPS = [w("l4b", "line"), w("l4b", "room"), w("l4b", "arcane"), w("l4b", "deflection"), w("l4b", "mirrors")];
```

### T.2 Wall schedule

One list drives both walls (they are mirror images). Each move goes from the previous target to
`to` over `[start, end]`.

```ts
type Move = { start: number; end: number; to: number; ease: (t: number) => number };
const easeInCubic = (t: number) => t * t * t;   // add to src/kit/motion.ts if missing
const linear = (t: number) => t;

export const WALL_MOVES: Move[] = [
  { start: BEATS.wallsIn, end: BEATS.wallsInEnd, to: WALL_OPEN, ease: easeOutBack },        // W0 install
  { start: BEATS.l1Close, end: BEATS.crush1, to: CLOSED_INNER, ease: easeInCubic },        // W1 goblin
  { start: BEATS.reopen1, end: BEATS.reopen1 + 14, to: WALL_OPEN, ease: easeInOut },       // W2
  { start: BEATS.rogue1Grab + 2, end: BEATS.escape, to: 0.9, ease: easeInOut },            // W3 rogue 1 climbs
  { start: BEATS.roof - 2, end: BEATS.roof + 6, to: CLOSED_INNER, ease: easeInCubic },     // W4 slams under his heels
  { start: BEATS.reopen2, end: BEATS.reopen2 + 14, to: WALL_OPEN, ease: easeInOut },       // W5
  { start: BEATS.rogue2Grab + 2, end: BEATS.slam3, to: 1.0, ease: easeInOut },             // W6 creep while he climbs
  { start: BEATS.slam3, end: BEATS.slam3 + 6, to: CLOSED_INNER, ease: easeInCubic },       // W7 rogue 2
  { start: BEATS.reopen3, end: BEATS.reopen3 + 14, to: WALL_OPEN, ease: easeInOut },       // W8
  { start: BEATS.creep3, end: BEATS.stall, to: BEAM_L / 2, ease: easeInOut },              // W9 stalls on the beam
  { start: BEATS.fold, end: BEATS.fold + 18, to: CLOSED_INNER, ease: easeInCubic },        // W10 paladin
  { start: BEATS.cubeReopen, end: BEATS.cube, to: WALL_OPEN, ease: easeInOut },            // W11
  { start: BEATS.mage1Grab + 3, end: BEATS.close4End, to: CLOSED_INNER, ease: easeInCubic }, // W12 mage 1 (escapes)
  { start: BEATS.reopen4, end: BEATS.reopen4 + 14, to: WALL_OPEN, ease: easeInOut },       // W13
  { start: BEATS.mage2Grab + 3, end: BEATS.pop, to: ORB_R, ease: linear },                 // W14 pong
  { start: BEATS.pop, end: BEATS.pop + 4, to: CLOSED_INNER, ease: easeInCubic },           // W15 pop
  { start: BEATS.reopen5, end: BEATS.reopen5 + 14, to: WALL_OPEN, ease: easeInOut },       // W16
  { start: BEATS.blast - 4, end: BEATS.blast + 2, to: CLOSED_INNER, ease: easeInCubic },   // W17 party
];

export const wallInner = (frame: number) => {
  let v = WALL_OFF;
  for (const m of WALL_MOVES) {
    if (frame < m.start) break;
    v = lerp(v, m.to, m.ease(progress(frame, [m.start, m.end])));
    if (frame < m.end) break;   // mid-move: v already blended from the previous target
  }
  return v;
};
```

Careful: inside a move, `v` must be the **previous** target, not the blended value of an earlier
move. The loop above is correct because a finished move leaves `v = m.to` (progress is 1 after
`end`). Sanity check after you write it: print `wallInner(f)` for f in 0..DURATION step 10 with a
throwaway node script (or a temporary `console.log` while running `npm run review` once) and
confirm it matches the table: 6.6 → 1.8 by 83, 0.06 at 237, 1.8 by 271, … 0.06 from 2670 on.

The walls' **visual** shudder (W9 stall, the arcs, the presses) is a small x offset added only in
the prop, never in `wallInner`:

```ts
export const wallShudder = (frame: number) =>
  [BEATS.stall, BEATS.sparkL, BEATS.sparkR, BEATS.hiss].reduce((s, at) => {
    const t = frame - at;
    return t < 0 ? s : s + 0.03 * Math.sin(t * 2.4) * Math.exp(-t / 8);
  }, 0);
```

### T.3 The death routine `pressed()`

Every wall victim goes through the same four phases: squeeze → wafer → wobble → pancake.

```ts
export type Pressed = { x: number; z: number; squash: number; squashX: number; tilt: number; dead: boolean };

/**
 * x0, z0: room-relative position when the walls catch them. crushEnd: walls shut.
 * reopenEnd: walls fully open again. Returns room-relative state (add roomDX in Scene).
 */
export const pressed = (
  frame: number,
  o: { x0: number; z0: number; half: number; crushEnd: number; reopenEnd: number; lane: readonly [number, number] },
): Pressed => {
  const sx = clamp(wallInner(Math.min(frame, o.crushEnd)) / o.half, 0.12, 1);
  const squeezedX = o.x0 * (sx - 0.12) / 0.88;          // walls push them to the centre
  const wob = progress(frame, [o.reopenEnd, o.reopenEnd + 8]);
  const fall = easeInOut(progress(frame, [o.reopenEnd + 8, o.reopenEnd + 14]));
  return {
    x: lerp(squeezedX, o.lane[0], fall),
    z: lerp(o.z0, o.lane[1], fall),
    squashX: lerp(sx, 1, fall),
    squash: lerp(1, PANCAKE_SQUASH, fall),
    tilt: wob > 0 && wob < 1 ? Math.sin(wob * Math.PI * 3) * 0.18 * (1 - wob) : 0,
    dead: frame >= o.crushEnd,
  };
};
```

In `Scene.tsx` a pressed victim is:

```ts
const p = pressed(frame, GOBLIN_PRESS);
return { pose: "cower", position: [roomDX(frame) + p.x, 0, p.z], yaw: FACE_CAMERA,
  squash: p.squash, squashX: p.squashX, tilt: p.tilt, expression: p.dead ? "dead" : "scared" };
```

Check `Actor` for the exact name of the tilt/rotation field (`tilt` + `pivot`) and use it.
If the kit has no `clamp(v, a, b)`, add one to `src/kit/motion.ts` (next to `clamp01`) and export
it; do not define private copies in the episode.

### T.4 Walk helpers (solve backwards from the arrival beat)

```ts
/** Frames [start, arrive] for a walker that must reach `toX` from `fromX` at `arrive`. */
export const walkWindow = (arrive: number, fromX: number, toX: number, speed: number): [number, number] =>
  [arrive - Math.round(Math.abs(toX - fromX) / speed), arrive];

/** First frame the walker crosses the left wall's doorway (outer face of the left wall). */
export const doorCross = (win: [number, number], fromX: number, toX: number) => {
  const doorX = -(WALL_OPEN + WALL_T);
  return Math.round(lerp(win[0], win[1], (doorX - fromX) / (toX - fromX)));
};

/** First frame a walker is clear of the exit glow: cut to them then. */
export const onCamera = (win: [number, number], fromX: number, toX: number) =>
  Math.round(lerp(win[0], win[1], 1.6 / Math.abs(toX - fromX)));
```

Walk windows (nominal):

| Who | Speed | From → to | Window | Doorway crossing | Must be ≥ |
| --- | --- | --- | --- | --- | --- |
| Goblin | `WALK` | `ENTRY_X` → `GRAB_X` | [47, 155] (arrive `goblinGrab - 4`) | ~137 | `wallsInEnd` 83 |
| Rogue 1 | `SPRINT` | `ENTRY_X` → `GRAB_X` | [274, 323] (arrive `rogue1Grab - 4`) | ~315 | W2 end 271 |
| Rogue 2 | 0.16 | `ENTRY_X` → `GRAB_X` | [592, 653] (arrive `rogue2Grab`) | ~643 | W5 end 491 |
| Paladin 1 | 0.08 | `ENTRY_X` → 0 | [751, 879] (arrive `paladinArrive`) | ~852 | W8 end 811 |
| Mage 1 | `WALK` | `ENTRY_X` → `GRAB_X` | [1549, 1657] (arrive `mage1Grab`) | ~1639 | W11 end 1563 |
| Mage 2 | `JOG` | `ENTRY_X` → `GRAB_X` | [1813, 1882] (arrive `mage2Grab`) | ~1871 | W13 end 1767 |
| Party | `WALK` | each `PARTY[i].x - 7` → `PARTY[i].x` | arrive `partyArrive`, 78 frames | — (stay outside) | W16 end 2201 |

### T.5 `assertBeats()` — your safety net

Call it at the bottom of `timeline.ts` (module load). If any story order breaks, the review command
fails with a readable message instead of rendering nonsense.

```ts
const assertBeats = () => {
  const fail = (msg: string) => { throw new Error(`[crushing-walls] ${msg}`); };
  for (let i = 1; i < WALL_MOVES.length; i++)
    if (WALL_MOVES[i].start < WALL_MOVES[i - 1].end) fail(`wall move ${i} starts before move ${i - 1} ends`);
  const entries: [string, number, number][] = [
    ["goblin", doorCross(GOBLIN_WALK, ENTRY_X, GRAB_X), BEATS.wallsInEnd],
    ["rogue1", doorCross(ROGUE1_WALK, ENTRY_X, GRAB_X), BEATS.reopen1 + 14],
    ["rogue2", doorCross(ROGUE2_WALK, ENTRY_X, GRAB_X), BEATS.reopen2 + 14],
    ["paladin1", doorCross(PALADIN1_WALK, ENTRY_X, 0), BEATS.reopen3 + 14],
    ["mage1", doorCross(MAGE1_WALK, ENTRY_X, GRAB_X), BEATS.cube],
    ["mage2", doorCross(MAGE2_WALK, ENTRY_X, GRAB_X), BEATS.reopen4 + 14],
  ];
  for (const [who, cross, open] of entries) if (cross < open) fail(`${who} crosses the doorway at ${cross}, walls open at ${open}`);
  if (BEATS.goblinGrab < BEATS.pedestalUp + 14) fail("goblin grabs before the pedestal is up");
  if (BEATS.arrive + 2 * 3 > BEATS.chomp - 6) fail("party arrives after the mimic chomps");
  if (BEATS.partyArrive < BEATS.reopen5 + 14) fail("party arrives before the walls reopen");
  Object.keys(BEATS).forEach((k) => {
    const f = (BEATS as Record<string, number>)[k];
    if (f >= DURATION) fail(`beat ${k} = ${f} is past DURATION`);
  });
  MIRROR_POPS.forEach((f, i) => { if (i > 0 && f <= MIRROR_POPS[i - 1]) fail("mirror pops out of order"); });
};
assertBeats();
```

Add a check whenever you add an ordering assumption to a level (for example "the wafer is readable
for ≥ 15 frames": `reopenX - crushX >= 15`).

### T.6 Orb pong schedule (L4c, precomputed once at module load)

```ts
export const ORB_START = BEATS.teleport + 8;
const ORB_XS: number[] = [];
export const BOUNCES: number[] = [];
{
  let x = 0;
  let dir = 1;
  for (let f = ORB_START; f <= BEATS.pop; f++) {
    const v = lerp(0.12, 0.35, progress(f, [ORB_START, BEATS.pop]));
    const lim = Math.max(0, wallInner(f) - ORB_R);
    x += dir * v;
    if (Math.abs(x) >= lim) { x = dir * lim; dir = -dir; BOUNCES.push(f); }
    ORB_XS.push(x);
  }
}
export const orbX = (frame: number) => ORB_XS[clamp(Math.round(frame) - ORB_START, 0, ORB_XS.length - 1)];
/** Bounces at least 3 frames apart, for the beep SFX (the last ones buzz every frame). */
export const BEEPS = BOUNCES.filter((f, i) => i === 0 || f - BOUNCES[i - 1] >= 3);
```

This is deterministic (no randomness, same result every render). `BEEPS` keeps the audio from
stacking 30 beeps in the final second. Use `BOUNCES` for the visual mirror flashes.

---

## P1. Kit additions (do these first, then lint)

### 1.1 `squashX` on `Actor` (`src/kit/actors.tsx`)

The walls squeeze people **sideways**. Add an optional field and change the outer group scale:

```ts
// in interface Actor
/** World-x squash (0.15 = squeezed between walls). Default 1. Bulges a little in z. */
squashX?: number;

// in ActorView
const squash = actor.squash ?? 1;
const squashX = actor.squashX ?? 1;
const spread = 1 + (1 - squash) * 0.6;
<group position={[x, 0, z]} scale={[spread * squashX, squash, spread * (1 + (1 - squashX) * 0.5)]}>
```

With `squashX` omitted the result is identical to before, so Ep1 and Ep2 do not change.

### 1.2 `orbitShot` (`src/kit/camera.ts`)

Installs on a wall's inner face need a three-quarter view. Add next to `shot`:

```ts
/**
 * Like `shot`, but orbits the camera around (x, y) by `yaw` radians.
 * yaw < 0 swings the camera to the left, showing the RIGHT wall's inner face; yaw > 0 the left.
 */
export const orbitShot = (x: number, y: number, dist: number, yaw: number, { z = -0.6, rise = 1.0 } = {}): CameraPose => ({
  position: [x + Math.sin(yaw) * dist, y + rise, z + Math.cos(yaw) * dist],
  lookAt: [x, y, z],
});
```

Export it from the kit index (`src/kit/index.ts`) the same way `shot` is exported.

### 1.3 `ElectricArc` (shared lightning)

`Electromagnet.tsx` has a private `Arc`. Generalise it into
`src/artifacts/crusher/ElectricArc.tsx`: props `a`, `b` (`[x,y,z]`), `seed`, `opacity`,
`frame`, `jitter` (default 0.12). It is a jagged polyline from a to b, with 7 points and the inner
points offset **perpendicular** to a→b by `(random(seed + frame + i) - 0.5) * 2 * jitter`. It uses
a bright core plus a wider faint glow line, and a `GlowSprite` at each end. Re-seed every 2 frames
(`Math.floor(frame / 2)`) so it flickers. Do not change `Electromagnet.tsx`.

### 1.4 Verify P1

```pwsh
npm run lint
```

- [ ] Lint passes with zero errors.
- [ ] `git diff src/kit` shows only the additions above.

---

## R. Props (`src/artifacts/crusher/`)

Create the folder with an `index.ts` that exports every prop, and add `export * from "./crusher";`
to `src/artifacts/index.ts`. General rules for every prop:

- A pure function of `useCurrentFrame()` plus beat props. The prop never imports the episode's
  `timeline.ts`; the Scene passes everything in (`innerX`, frames, positions).
- Textures come from `src/engine/textures.ts` (`makeMasonry`, `makeMetal`, `makeWood`,
  `makeFlagstone`) through `useSurface`. Copy how `CeilingCrushers.tsx` / `BlastDoor.tsx` do it.
- Installs animate in with `easeOutBack` (drop, unfold, slide). Nothing pops into existence.
- Hazard stripes and warm `GlowSprite`s on the dangerous parts.
- Every prop gets a quick isolated check in its level's review (P2–P6).

| Prop | Props (inputs) | Look and behaviour |
| --- | --- | --- |
| `CrushRoom` | `dx`, `children` | `<group position={[dx, 0, 0]}>{children}</group>`. Nothing else. |
| `SlidingWall` | `side: -1 \| 1`, `inner`, `shudder`, `platesFrom`, `platesTo`, `greaseAt`, `electrifyAt`, `doorway` (left wall only) | A block from x `side*inner` to `side*(inner+WALL_T)`, y `WALL_BOTTOM..WALL_TOP`, z `WALL_Z`. Stone masonry face. From `platesFrom→platesTo`: 3 riveted steel plates per wall slide **down** from above the wall top onto the inner face, staggered by 8 frames, each with `easeOutBack`. From `greaseAt`: glossy yellow-green grease drips grow down the plates over 20 frames (thin capsules, `gloss` finish). From `electrifyAt`: copper strips on the plate seams and a faint blue `GlowSprite` pulse. The left wall has the doorway: z `DOOR_Z`, height `DOOR_H`, cut out of the front (build the wall as 3 boxes: the back part, the lintel above the door, nothing in front of the doorway). Bright hazard stripes along the inner edge, shown from L2b on. Apply `shudder` as an extra x offset. |
| `RoomCeiling` | `installAt` (= 0, always there), `chimneyAt`, `bootDemoAt`, `hatchAt`, `blastAt` | The slab `SLAB_Y`, x `±(WALL_OPEN + WALL_T + 0.2)`, z `WALL_Z`, with the vent hole x ±`VENT_HALF`. Dark masonry. From `chimneyAt`: a square brick chimney rises out of the roof around the hole to `CHIMNEY_TOP` (easeOutBack, 14 frames) with a little cap. At `bootDemoAt`: a big brown leather boot on a coiled spring (`G.torus` coils, `metal` finish but small) shoots **down** out of the vent to y ≈ 2.2 in 3 frames, wobbles, retracts by `+18`. At `hatchAt`: two hatch flaps close under the vent. At `blastAt - 2`: the flaps snap open (the party goes up through them). |
| `LootPedestal` | `riseAt`, `wiresAt`, `coinVisible: (f) => boolean` | Stone column, h `PEDESTAL.h`, rises from under the floor at `riseAt` (12 frames, easeOutBack) with dust. A red velvet cushion on top. From `wiresAt`: two glowing orange wires run along the floor from the pedestal base to each wall's bottom edge (they stretch with the walls: pass `inner`). The coin is drawn **by the Scene**, not here (it moves with victims). |
| `Coin` | `position`, `spin` | Gold disc (`gloss`), r 0.13, with a star decal and a `GlowSprite`; spins about y. |
| `HydraulicPress` | `side`, `inner`, `dropAt`, `hissAt` | A huge cylinder body x `PRESS.x0..x1` (mirrored by side), y `PRESS.y`, r `PRESS.r`, painted yellow-black hazard stripes, with a mount bracket up to the hall. A shiny piston rod from the body to the wall's outer face, its length follows `inner` (`rodLen = PRESS.x0 - (inner + WALL_T)`, hidden if ≤ 0). Drops from above at `dropAt` (easeOutBack, 10 frames, dust + `clank`). At `hissAt`: two steam puffs (`dust` burst tinted white) from the body. Label decal "500 T". |
| `MirrorPanels` | `pops: number[]`, `inner`, `flashes: number[]` | Five hexagonal mirror panels: 2 on each wall's inner face (y 0.9 and 2.0) and 1 under the ceiling slab. Each pops in at `pops[i]` (scale from 0 with easeOutBack, 8 frames, `sparkle`). A pale violet glass (`glow` at low opacity plus a bright rim). The panels on the wall that the orb just hit flash brighter for 4 frames after each frame in `flashes`. They ride on the walls (use `inner`). |
| `ElectricArc` | see P1.3 | Lightning. |
| `RoomRails` | `railsAt`, `wheelsAt`, `boosterAt`, `lungeAt`, `portcullisAt`, `dx` | Two steel rails along the hall floor from x -9 to 6 at z `Z-0.9` and `Z+0.7` (y 0..0.04, on sleepers), sliding in from the right at `railsAt` (16 frames). **Rails are NOT inside `CrushRoom`** (they stay put); everything else here is. Wheels: 4 per wall at the wall bottom, pop out at `wheelsAt`, spin with `dx` (`angle = dx / r`). Booster: a big compressed coil spring on the hall floor right of the right wall with a hazard-striped plate, drops in at `boosterAt`; at `lungeAt` it extends (the plate follows the right wall's outer face). Portcullis: an iron grille stored above the left doorway that drops at `portcullisAt` (6 frames, `gate` SFX) and closes the doorway. |
| `TriggerTile` | `x`, `triggerAt` | A floor tile 0.5 × 0.5 with a subtle rune; glows red and sinks 0.02 at `triggerAt`, with a `click`. |
| `PaladinCube` | `appearAt`, `popAt`, `from`, `to` | A 0.55 rounded cube (`G.box`) in the paladin's colours: blue cloth sides, silver-trim edges (use `gloss`, not `metal`), a helmet visor slit and two dazed eyes on the front. It appears at the wafer position at `appearAt`, then at `popAt` it hops forward to `to` = (0, `CUBE.z`) on an `arc()` over 10 frames with a tiny bounce. Steam wisps rise from it for 60 frames. |
| `SpellOrb` | `position`, `opacity`, `scale`, `frame` | A glowing violet sphere, r `ORB_R`, with a small mage inside it (`ActorView` with `scale` 0.42, pose `float`, expression `shock`), sparkles orbiting it. |
| `Pole` | `hand: [x,y,z]`, `tip: [x,y,z]`, `length` 3.2 | A wooden pole (`wood` finish) from behind the hand through to the tip; the tip end is a little iron ferrule. |

The `MimicChest` (existing, in `src/artifacts/dungeon`) sits inside `CrushRoom` at
`[MIMIC.x, MIMIC.y, Z]`, `scale={MIMIC.scale}`, `rotationY` facing the camera slightly turned
left (≈ -0.3), `spawnFrame={BEATS.rails + 8}`, `openFrame={BEATS.mimicOpen}`,
`chompFrame={BEATS.chomp}`, `burpFrame={BEATS.burp}`. Read its source to see where its mouth is
(the party's flight must end there).

`Skeleton` (existing, `src/artifacts/boulder`) is used for the L3 x-ray flicker with
`scale={CHAR_SCALE * CLASS_SCALE.paladin}`.

---

## P2. Level 1 — Sliding stone walls (frames 0–300)

**Narration (`l1a`):** "If you wire two sliding stone walls to a loot pedestal, a greedy goblin
will grab the shiny coin, and get pressed into a pancake."

### 2.1 timeline.ts

1. Replace the template's crusher constants with §G.2 + §G.4, `BEATS` (§T.1), `WALL_MOVES` and
   `wallInner` (§T.2), `wallShudder`, `pressed` (§T.3), the walk helpers (§T.4) and
   `assertBeats` (§T.5; comment out entries for levels not built yet, and re-enable them as you go).
2. `STAGE_STARTS` from §0.4.
3. Goblin kinematics:
   ```ts
   export const GOBLIN_WALK = walkWindow(BEATS.goblinGrab - 4, ENTRY_X, GRAB_X, WALK);
   export const GOBLIN_HOP: [number, number] = [BEATS.coinUp + 4, BEATS.coinUp + 14];  // GRAB_X → 0
   export const GOBLIN_PRESS = { x0: 0, z0: Z, half: HALF.goblin, crushEnd: BEATS.crush1,
     reopenEnd: BEATS.reopen1 + 14, lane: LANES.goblin };
   ```

### 2.2 Scene.tsx

Replace the template body. Keep its structure (`useCurrentFrame`, set, props, actors, bursts).

- Set: `DioramaHall` (§G.3).
- `CrushRoom dx={roomDX(frame)}` containing two `SlidingWall`s (`inner={wallInner(frame)}`),
  `RoomCeiling` and `LootPedestal`. (Plates, grease etc. get their frames now too; they just
  happen later.)
- Coin: a `coinPos(frame)` function in Scene:
  - before `goblinGrab`: on the cushion `[0, PEDESTAL.h + 0.12, PEDESTAL.z]`, hidden before
    `pedestalUp + 8`;
  - `goblinGrab → coinUp`: in the goblin's right hand (≈ `[gx + 0.3, 0.8, Z + 0.15]`, check the
    still);
  - `coinUp → crush1`: overhead (≈ `[gx, 1.75, Z]`) while he cheers;
  - after `crush1`: hidden (squashed with him).
  - The coin **respawns** on the cushion with a `sparkle` at the end of each reopen window
    (`reopen1 + 14`, `reopen2 + 14`, `reopen3 + 14`, `cube`, `reopen4 + 14`) and is taken by
    the next grabber. Write it as a list of `[showFrom, takenAt, taker]` entries.
- `goblinActor(frame)`:
  | Frames | State |
  | --- | --- |
  | < `GOBLIN_WALK[0]` | `null` |
  | walk window | `walk`, `FACE_RIGHT`, speed 1, expression `happy` |
  | → `goblinGrab` | `idle`, leaning in (`point` pose toward the coin from `goblinGrab - 4`) |
  | `goblinGrab → coinUp` | `point` → holding coin, `happy` |
  | `GOBLIN_HOP` | hop from `GRAB_X` to 0 with `arc(t, 0.35)`, pose `jump` |
  | `→ doubleTake` | `cheer`, `FACE_CAMERA`, `happy` (fist pump: small `bump` on y) |
  | `doubleTake → doubleTake+6` | yaw snaps left, then right (look at each wall), expression `shock` |
  | `→ crush1` | `cower`, `scared`, and `pressed()` drives `squashX` |
  | after | `pressed()` wafer → pancake (expression `dead` forever) |
- Bursts: `dust` at the pedestal rise; `dust` at both wall faces at `crush1` (y 0.2 and 2.5,
  x ±0.1); `sparks` on the coin at grab (small, gold); wall install `dust` along each wall bottom
  at `wallsInEnd - 8` (when they overshoot).

### 2.3 config.ts (camera, SFX, shakes)

Camera waypoints/tracks (nominal frames in brackets):

| Key | Pose | Why |
| --- | --- | --- |
| `wp(0, shot(0, 2.0, 14.5, { rise: 1 }))` | wide hall | title card; the walls slide in below it |
| `wp(BEATS.pedestalUp - 4, shot(0, 1.5, 10))` [89] | push in | pedestal rises in the middle; wires glow |
| `wp(BEATS.goblinGrab - 30, shot(-0.8, 1.5, 9.5))` [129] | goblin approaching through the doorway | walls visible on both sides |
| `wp(BEATS.coinUp, shot(0, 1.35, 8.2))` [186] | coin lifted | |
| `wp(BEATS.doubleTake, shot(0, 1.25, 7.4))` [216] | slow push-in | double-take, walls closing |
| `wp(BEATS.crush1 + 2, shot(0, 1.15, 6.6))` [239] | impact | wafer readable |
| `wp(BEATS.reopen1 + 16, shot(0, 1.0, 6.4))` [273] | hold on the pancake | |

Check every pose against the framing rules (§C below).

SFX:

```ts
sfx("stamp", 6, 0.4),
...STAGE_STARTS.map((f) => sfx("pop", f, 0.2)),
sfx("rumble", BEATS.wallsIn, 0.35, { durationInFrames: BEATS.wallsInEnd - BEATS.wallsIn, fadeOutFrames: 6 }),
sfx("slam", BEATS.wallsInEnd - 6, 0.35),          // overshoot settles
sfx("ramp", BEATS.pedestalUp, 0.3),
sfx("zap", BEATS.wiresGlow, 0.15),
sfx("ding", BEATS.goblinGrab, 0.3),
sfx("sparkle", BEATS.coinUp, 0.25),
sfx("gears", BEATS.l1Close, 0.3, { durationInFrames: BEATS.crush1 - BEATS.l1Close, fadeOutFrames: 4 }),
sfx("slam", BEATS.crush1, 0.55),
sfx("squash", BEATS.crush1, 0.5),
sfx("hydraulic", BEATS.reopen1, 0.25),
```

Shakes / rumbles: `{ at: BEATS.crush1, strength: 0.26, spread: 7 }`;
rumble `{ start: BEATS.wallsIn, end: BEATS.wallsInEnd, strength: 0.03 }` and
`{ start: BEATS.l1Close, end: BEATS.crush1, strength: 0.02 }`.

### 2.4 TrapHUD.tsx

```ts
createTrapHUD({
  title: "EVOLUTION OF A CRUSHING WALLS" /* keep the template's title format */,
  stages: [
    { at: STAGE_STARTS[0], name: "SLIDING STONE WALLS", color: "#d9a066" },
    { at: STAGE_STARTS[1], name: "GREASE + SPRING BOOT", color: "#9bd35a" },
    { at: STAGE_STARTS[2], name: "ELECTRIC HYDRAULIC PRESS", color: "#5fd0ff" },
    { at: STAGE_STARTS[3], name: "ARCANE MIRROR PONG", color: "#c27bff" },
    { at: STAGE_STARTS[4], name: "LUNGING RAIL ROOM", color: "#ff6a4d" },
  ],
  end: { label: "DUNGEON STATUS", stamp: "UNBEATABLE", at: BEATS.stamp },
});
```

Match the field names to `createTrapHUD`'s actual type (read `src/kit/TrapHUD.tsx`).

### 2.5 Verify loop L1

```pwsh
npm run lint
npm run review -- CrushingWalls 0:300:6 --out out/review/CrushingWalls/L1
npm run review -- CrushingWalls 30:100:2 --out out/review/CrushingWalls/L1-install
npm run review -- CrushingWalls 200:300:2 --out out/review/CrushingWalls/L1-crush
```

Open **every** sheet. Tick:

- [ ] Frames 6–82: title card on top, the walls slide in **below it** and overshoot a little.
- [ ] The pedestal rises on "loot" (≈93), the wires glow by ≈105.
- [ ] The goblin is on screen before "greedy" (≈126), walks through the doorway gap (not through
      the wall), feet on the floor, no skating.
- [ ] Coin in his hand at "grab", overhead at "coin", he hops to the centre and cheers.
- [ ] Double-take at "pressed": he looks at each wall, face `shock`.
- [ ] Walls meet at exactly 237 with dust; the goblin is a thin vertical wafer between them.
- [ ] Wafer visible 237→257, wobbles, collapses to a pancake in the back-right lane by ≈285.
- [ ] Nothing is under the HUD badge band or the subtitles; floor ≥ 25% from the bottom.
- [ ] The walls' bottom does not hide the pancake's silhouette when the walls are open.

Common fixes: see §F.

---

## P3. Level 2 — rogue escapes, grease + spring boot, rogue 2 punted (frames 260–830)

**Narration:**
- `l2a` "However, a show-off rogue will immediately parkour up the stone crevices to escape through
  the ceiling vent."
- `l2b` "So you replace the stone with grease-coated steel plates, and hide a spring-loaded boot
  inside the vent."
- `l2c` "Even if he climbs the grease, the ceiling punts him right back to the floor."

### 3.1 timeline.ts

```ts
export const ROGUE1_WALK = walkWindow(BEATS.rogue1Grab - 4, ENTRY_X, GRAB_X, SPRINT);
export const ROGUE1_ON_CAMERA = onCamera(ROGUE1_WALK, ENTRY_X, GRAB_X);

/** Wall-jump path: 4 kicks between the closing walls, from the floor to under the vent. */
export const ROGUE1_KICKS = 4;
export const rogue1Climb = (frame: number): { x: number; y: number; side: number } => {
  const t = progress(frame, [BEATS.parkour, BEATS.escape]);
  const k = Math.min(ROGUE1_KICKS - 1, Math.floor(t * ROGUE1_KICKS));
  const local = t * ROGUE1_KICKS - k;                 // 0..1 within this kick
  const side = k % 2 === 0 ? 1 : -1;                  // first kick to the right wall
  const reach = Math.max(0.2, wallInner(frame) - 0.32);
  const fromX = k === 0 ? GRAB_X : -side * reach;
  const x = lerp(fromX, side * reach, easeInOut(local));
  const y0 = (k / ROGUE1_KICKS) * 2.4, y1 = ((k + 1) / ROGUE1_KICKS) * 2.4;
  return { x, y: lerp(y0, y1, local) + arc(local, 0.35), side };
};
```

- `parkour → escape`: kicks (pose `jump`, yaw toward the next wall, `focus`/`smug`). On each
  contact frame (`BEATS.parkour + (k+1)/4 * span`) a small `dust` puff on the wall face and a
  `thud` SFX.
- `escape → ventIn`: hangs under the vent (y ≈ 2.4, pose `float` or `jump` arms up), x → 0.
- `ventIn → roof`: rises through the hole to `ROOF_Y` (pose `jump`, easeOutCubic).
- `roof → roof + 45`: stands on the roof at x 0.6, `FACE_CAMERA`, `cheer` then `point` down at
  the walls slamming below him (W4 slams at `roof+6`), expression `smug`.
- `roof + 45 → roof + 105`: walks right along the roof to x 2.5, jumps down (`arc`) to the floor
  at x 3.4 (outside the right wall), then walks off right to x 9 → `null`. He never returns.

```ts
export const ROGUE2_WALK = walkWindow(BEATS.rogue2Grab, ENTRY_X, GRAB_X, 0.16);
export const ROGUE2_ON_CAMERA = onCamera(ROGUE2_WALK, ENTRY_X, GRAB_X);
export const ROGUE2_PRESS = { x0: 0.15, z0: Z, half: HALF.rogue, crushEnd: BEATS.slam3 + 6,
  reopenEnd: BEATS.reopen3 + 14, lane: LANES.rogue2 };
```

Rogue 2 climb (`climb2 → atVent2`): the same kick pattern as rogue 1 but with **two slips**: at
local kick 1 and 2 he slides down 0.5 (pose `slip`, expression `shock`, a `slip` SFX and a little
`slimeSplash` tinted grease-yellow), then recovers. He reaches y 2.4 under the vent at `atVent2`
(≈717), hangs there looking up (`jump`, `happy`) until `punt`.

Punt (`punt → land2`): the boot shoots down (RoomCeiling `bootDemoAt` logic reused: add a
`puntAt` prop, or pass an array of boot frames), he is launched **down** and to the side: from
(0, 2.4) to (0.15, 0) over 10 frames, pose `launch`, rotation tumbling (`tilt`), lands at
`land2` with `dust` + `thud`. Then `sprawl`, expression `dazed`, until `slam3`; he sits up
(`cower`, `scared`) at `slam3 - 6` as the walls rush in. W7 slams at `slam3 → slam3+6`; then
`pressed()`.

### 3.2 Scene.tsx additions

- `rogue1Actor`, `rogue2Actor` as above.
- `SlidingWall` gets `platesFrom={BEATS.platesIn}`, `platesTo={BEATS.platesInEnd}`,
  `greaseAt={BEATS.grease}`.
- `RoomCeiling` gets `chimneyAt={BEATS.chimney}`, `bootDemoAt={BEATS.bootDemo}`,
  `puntAt={BEATS.punt}`, `hatchAt={BEATS.hatch}`.
- Bursts: `dust` per kick contact, `dust` at the vent when rogue 1 pops out, `dust` at W4's slam
  (`roof + 6`), `sparks` when each plate lands (`platesIn + i*8 + 12`), grease drip
  `slimeSplash` (yellow) at `grease + 6`, `dust` on chimney rise, `dust` + `sparks` at `punt`,
  `dust` at `land2`, `dust` at `slam3 + 6`.

### 3.3 Camera

| Key | Pose | Why |
| --- | --- | --- |
| `followTrack({ start: ROGUE1_ON_CAMERA, end: BEATS.rogue1Grab, target: f => [rogueX(f), 0, Z], dist: 9.5, lead: 0.6, clampX: [-7.8, 0], blend: 1 })` | sprint in | entry on camera |
| `wp(BEATS.parkour - 4, shot(0, 1.85, 10.5))` [344] | whole room height | wall-jumps visible, both walls visible |
| `wp(BEATS.escape, shot(0, 2.3, 10.5))` [420] | tilt up | vent visible below the HUD band |
| `wp(BEATS.roof, shot(0.4, 3.6, 10))` [453] | roof gloat | the walls slam below him (visible) |
| `holdTrack(BEATS.platesIn - 2, BEATS.grease + 24, orbitShot(0, 1.6, 9, -0.5))` [481–543] | three-quarter, right wall inner face | plates slide down, grease drips |
| `wp(BEATS.chimney - 4, shot(0, 3.3, 9))` [575] | roof + chimney | |
| `wp(BEATS.bootDemo - 4, shot(0, 2.2, 9))` [605] | inside under the vent | boot punches down |
| `followTrack({ start: ROGUE2_ON_CAMERA, end: BEATS.rogue2Grab, ... dist: 9.5, clampX: [-7.8, 0], blend: 1 })` | rogue 2 jogs in | |
| `wp(BEATS.climb2, shot(0, 1.85, 10.5))` [669] | climb | |
| `wp(BEATS.punt + 6, shot(0, 1.4, 9))` [744] | landing | |
| `holdTrack(BEATS.slam3 - 4, BEATS.reopen3 + 20, shot(0, 1.15, 6.8))` [773–817] | slam two-shot | |

SFX: `whoosh` on the sprint start (`ROGUE1_ON_CAMERA`), `thud` per kick, `whoosh` at `ventIn`,
`slam` 0.5 at `roof + 6`, `sparkle` at `roof + 10` (gloat), `hydraulic` at `reopen2`,
`clank` per plate landing, `squelch` at `grease`, `ratchet` at `chimney`, `boing` at `bootDemo`
and at `punt`, `trap_close` at `hatch`, `slip` per rogue 2 slip, `launch` at `punt`, `thud` at
`land2`, `gears` for the W6 creep (duration until `slam3`), `slam` 0.55 + `squash` 0.5 at
`slam3 + 6`.

Shakes: `roof + 6` 0.18, `punt` 0.14, `land2` 0.12, `slam3 + 6` 0.28. Rumble during W6.

### 3.4 Verify loop L2

```pwsh
npm run lint
npm run review -- CrushingWalls 260:830:8 --out out/review/CrushingWalls/L2
npm run review -- CrushingWalls 330:470:3 --out out/review/CrushingWalls/L2-parkour
npm run review -- CrushingWalls 640:830:3 --out out/review/CrushingWalls/L2-punt
```

- [ ] Rogue 1 appears only after the walls are fully open again (frame ≥ 271) and walks through
      the doorway gap, never over the goblin pancake.
- [ ] Each kick touches a wall face (feet within ~0.05 of the face) with a dust puff.
- [ ] He goes **through** the vent hole (not through the slab) on "through"/"vent".
- [ ] The walls slam shut under him while he is visible on the roof; he gloats facing camera.
- [ ] He leaves the frame off the right and never appears again.
- [ ] Plates visibly slide down over the stone on "replace … steel", grease drips on "grease-coated".
- [ ] The chimney rises on "hide"; the boot punches down on "boot"; the hatch shuts on "vent".
- [ ] Rogue 2 is a fresh rogue, enters on camera, slips at least once on the grease.
- [ ] The boot hits him on "punts" (contact, sparks, boing), he lands dazed by ≈748.
- [ ] Walls slam on "floor" (777); wafer → pancake front-right; the goblin pancake is still there.
- [ ] The paladin is NOT visible yet in any frame before ≈ 830 unless he is in the hall walking.

---

## P4. Level 3 — paladin's beam, electric hydraulic press, cube (frames 800–1600)

**Narration:**
- `l3a` "But a stubborn paladin won't even try to climb. He just wedges a reinforced steel beam
  between the walls, and stands there smugly."
- `l3b` "To fix this, you upgrade to twin 500-ton hydraulic presses, and electrify the wall plates."
- `l3c` "The moment his metal beam touches both sides, it completes the circuit, roasting him inside
  his own armor before folding him into a neat little cube."

### 4.1 timeline.ts

```ts
export const PALADIN1_WALK = walkWindow(BEATS.paladinArrive, ENTRY_X, 0, 0.08);
export const PALADIN1_ON_CAMERA = onCamera(PALADIN1_WALK, ENTRY_X, 0);
/** Height of the beam while he holds it overhead; measure the windup hands in a still. */
export const BEAM_HOLD_Y = 2.15;
export const beamState = (frame: number) => { /* see below */ };
```

Beam states (the beam is one `G.box` 2.2 × 0.16 × 0.16, steel grey with yellow-black hazard ends;
use `cloth`/`wood` coloured grey or a light `metal` — it is small, `metal` is fine here):

| Frames | Beam |
| --- | --- |
| walk window | carried on his right shoulder, along x, at y ≈ 1.45, x = paladin x + 0.1 |
| `paladinArrive → wedge` | lowered to waist, he plants his feet (`idle`, `focus`) |
| `wedge → wedge + 14` | lifted overhead (pose `windup` or `cheer`), y → `BEAM_HOLD_Y` |
| `wedge + 14 → stall - 6` | held overhead while the walls creep in (W9); he looks left/right (`smug`) |
| `stall - 6 → stall` | a small hop (`arc(t, 0.25)`) pushes the beam up to `BEAM_Y` exactly as the walls arrive |
| `stall → fold` | wedged: ends touch the inner faces (`wallInner = 1.1`), walls shudder |
| `fold → fold + 18` | it **buckles**: two halves pivot at the wall ends, centre rises: half-length 1.1, angle `acos(min(1, inner / 1.1))`. Hide it once `inner < 0.2` (it is in the cube) |

Paladin 1 actor:

| Frames | State |
| --- | --- |
| walk window | `walk`, speed 0.9 (heavy), `FACE_RIGHT`, `focus` |
| `paladinArrive → stall` | as the beam table; arms overhead pose while holding |
| `stall → smug` | `idle` → `FACE_CAMERA` |
| `smug → sparkL` | `point` at the beam then thumbs up/`cheer`, expression `smug` (the gloat) |
| `sparkL → arc1` | expression `shock`, looks up at the sparks |
| `arc1 → roast` | `cower`, `pain`, arcs from the beam into his helmet |
| `roast → roastEnd` | **x-ray flicker**: every 3 frames alternate `ActorView` (expression `pain`) with `<Skeleton>` at the same position. `Math.floor((frame - roast) / 3) % 2` |
| `roastEnd → fold` | `cower`, `dazed`, smoking (dark `dust` wisps) |
| `fold → fold + 18` | `pressed()`-style squeeze (`squashX` from `wallInner`), **and** `squash` 1 → 0.35 (folded down) |
| ≥ `fold + 18` | `null`; the `PaladinCube` takes over at the same spot |

`PaladinCube`: `appearAt = fold + 18`, `popAt = cube`, from `[0, 0, Z]` to `[0, 0, CUBE.z]`.
It stays for the rest of the episode (it rides in `CrushRoom`).

Arcs (`ElectricArc`, inside `CrushRoom`):

- `electrify → +30`: test arcs crawl along each wall's plate seams (2 short arcs per wall).
- `sparkL`: a spark burst at the left beam end; `sparkR` at the right end.
- `arc1 → fold`: one arc from each beam end to the paladin's helmet (`[0, 1.85, Z]`), plus an arc
  along the beam. From `arc2` on add a second pair (thicker).
- Blue `GlowSprite` on the paladin pulsing during `roast → roastEnd`.

### 4.2 Install (l3b)

- `HydraulicPress side={-1} dropAt={BEATS.pressL}` and `side={1} dropAt={BEATS.pressR}`,
  `hissAt={BEATS.hiss}`, `inner={wallInner(frame)}`.
- `SlidingWall electrifyAt={BEATS.electrify}`.

### 4.3 Camera

| Key | Pose |
| --- | --- |
| `followTrack({ start: PALADIN1_ON_CAMERA, end: BEATS.paladinArrive, target: paladin x, dist: 10, clampX: [-7.8, 0], blend: 1 })` | heavy walk in with the beam |
| `wp(BEATS.wedge - 4, shot(0, 1.7, 10))` | lifting the beam; both walls visible |
| `wp(BEATS.stall, shot(0, 1.6, 9.2))` | the walls hit the beam ends |
| `wp(BEATS.smug, shot(0, 1.3, 7.5))` | smug gloat close-up (beam still in frame) |
| `holdTrack(BEATS.pressL - 4, BEATS.pressR + 14, orbitShot(-0.8, 2.2, 13, 0.35))` | left press drops, then the right |
| `wp(BEATS.hiss - 4, shot(0, 2.5, 20, { rise: 2 }))` | wide: both presses, whole room |
| `wp(BEATS.electrify, shot(0, 1.7, 11))` | plates crackle |
| `wp(BEATS.sparkL - 4, shot(0, 1.5, 8.5))` | beam ends + paladin |
| `holdTrack(BEATS.roast - 2, BEATS.roastEnd + 4, shot(0, 1.2, 6.8))` | the x-ray flicker big on screen |
| `wp(BEATS.fold, shot(0, 1.2, 7.5))` | fold |
| `wp(BEATS.cube, shot(0, 0.9, 6.2))` | cube pops forward, ding |

SFX: `ratchet` at `wedge`, `clang` at `stall` (0.5); `sparkle` at `smug`; `clank`
+ `slam` at each press drop; `hydraulic` 0.45 at `hiss`; `zap` at `electrify` and each `sparkL`,
`sparkR`; `sizzle` loop `arc1 → roastEnd` (use `durationInFrames`); `zap` at `arc2`; `helmet`
at `fold`; `crack` at `fold + 8`; `squash` at `fold + 18`; `toaster_ding` 0.5 at `cube`;
`hydraulic` at `cubeReopen`.

Shakes: `stall` 0.16, `pressL` 0.2, `pressR` 0.2, `sparkL` 0.08, `fold + 18` 0.3, `cube` 0.08.
Rumble: W9 creep 0.02; `hiss → hiss + 20` 0.03; `roast → roastEnd` 0.02.

### 4.4 Verify loop L3

```pwsh
npm run review -- CrushingWalls 800:1600:8 --out out/review/CrushingWalls/L3
npm run review -- CrushingWalls 1000:1080:2 --out out/review/CrushingWalls/L3-wedge
npm run review -- CrushingWalls 1440:1580:3 --out out/review/CrushingWalls/L3-roast
```

- [ ] The paladin enters after the walls reopened, carrying the beam; the beam goes through the
      doorway gap and never through a wall.
- [ ] The beam ends touch both inner faces at "walls" (1014) — no gap, no overlap > 0.03.
- [ ] The beam is above the doorway (y 2.45) so it presses on solid wall, not the opening.
- [ ] He gloats facing the camera on "smugly".
- [ ] Each press drops in on its word with overshoot; the piston rods connect body → wall.
- [ ] Arcs connect beam end → helmet, they flicker, and they read at phone size.
- [ ] Skeleton flicker alternates every 3 frames on "roasting … before".
- [ ] Beam buckles while the walls fold; no beam pokes out of a wall.
- [ ] A cube remains and pops forward with the ding on "cube"; it is still there in every later frame.

---

## P5. Level 4 — mage blinks out, mirror pong, mage 2 popped (frames 1580–2220)

**Narration:**
- `l4a` "However, a lazy mage will simply cast a teleport spell to blink right through the wall."
- `l4b` "So you line the room with arcane deflection mirrors."
- `l4c` "The moment he teleports, his spell bounces between the closing walls like a game of
  high-speed Pong, until there is nowhere left to bounce."

### 5.1 timeline.ts

```ts
export const MAGE1_WALK = walkWindow(BEATS.mage1Grab, ENTRY_X, GRAB_X, WALK);
export const MAGE1_ON_CAMERA = onCamera(MAGE1_WALK, ENTRY_X, GRAB_X);
export const MAGE1_OUT_X = 3.0;                      // outside the right wall, under the press
export const MAGE1_LEAVE: [number, number] = [BEATS.blink + 36, BEATS.blink + 36 + 70];
export const MAGE2_WALK = walkWindow(BEATS.mage2Grab, ENTRY_X, GRAB_X, JOG);
export const MAGE2_ON_CAMERA = onCamera(MAGE2_WALK, ENTRY_X, GRAB_X);
export const MAGE2_PRESS = { x0: 0, z0: Z, half: HALF.mage, crushEnd: BEATS.pop + 4,
  reopenEnd: BEATS.reopen5 + 14, lane: LANES.mage2 };
```

Plus the orb schedule (§T.6).

Mage 1 is lazy: he walks slowly (speed 0.8 animation), yawns (`idle`, `neutral`), grabs the coin
on "simply" (it vanishes into his robe). W12 closes the walls. `cast` → pose `cast`, `magic`
burst at his staff. On `blink`: he vanishes in a `magic` puff at `GRAB_X` and appears in a second
puff at `MAGE1_OUT_X` (outside the right wall). The walls meet behind him at `close4End`.
`blink → MAGE1_LEAVE[0]`: `FACE_CAMERA`, `smug`, `point` back at the wall. Then he strolls off
right (x → 9) and is `null` after. Check `MAGE1_OUT_X` is clear of the right wall's outer face at
`blink` (`wallInner(blink) + WALL_T < MAGE1_OUT_X - 0.4`).

Mage 2: jogs in (speed 2, `focus`), grabs on "moment", sees the walls move, casts at once:
`cast` from `mage2Grab + 4` to `teleport`. At `teleport` a `magic` burst; the mage actor becomes
`null` and the `SpellOrb` appears at `[orbX(f), ORB_Y, Z]` with the mini mage inside it (`shock`).
The orb bounces (§T.6) until `pop`. At `pop`: the orb bursts (`magic` + `sparkle`), the mage
reappears as a wafer at x 0 (`pressed()` with `MAGE2_PRESS`, `squashX` already at minimum since
the walls are at `ORB_R → CLOSED` by `pop + 4`), then wafer → pancake in the back-left lane.

### 5.2 Scene additions

- `MirrorPanels pops={MIRROR_POPS} flashes={BOUNCES} inner={wallInner(frame)}` inside
  `CrushRoom`.
- `SpellOrb` with a short violet trail: 4 fading copies at `orbX(f - k)` for k = 1..4.
- A `sparks` burst (violet tint if `sparks` accepts a colour; otherwise `magic`) at each of the
  last 6 bounces only (performance).

### 5.3 Camera

| Key | Pose |
| --- | --- |
| `followTrack({ start: MAGE1_ON_CAMERA, end: BEATS.mage1Grab, ... dist: 9.5, clampX: [-7.8, 0], blend: 1 })` | |
| `wp(BEATS.cast - 4, shot(0, 1.3, 8))` | casting |
| `wp(BEATS.blink + 2, shot(1.4, 1.35, 9))` | both the closing walls and mage 1 outside (x 3.0) in frame |
| `holdTrack(MIRROR_POPS[0] - 4, MIRROR_POPS[4] + 12, orbitShot(0, 1.5, 9, 0.45))` | left wall inner face; mirrors pop in (switch yaw to -0.45 halfway, at `MIRROR_POPS[2]`, so both walls are seen) |
| `followTrack(... MAGE2_ON_CAMERA → mage2Grab, dist 9.5, clampX [-7.8, 0], blend 1)` | |
| `wp(BEATS.teleport - 2, shot(0, 1.5, 9.5))` | orb forms |
| `wp(BEATS.pop - 30, shot(0, 1.4, 8.2))` | slow push-in during the frantic pong |
| `holdTrack(BEATS.pop - 2, BEATS.reopen5 + 22, shot(0, 1.15, 6.8))` | pop, wafer, pancake |

SFX: `hydraulic` at `reopen` windows (`cubeReopen`, `reopen4`, `reopen5`), `gears` during W12,
`levitate` at `cast`, `whoosh` at `blink` (`magic` sound: use `sparkle` + `whoosh`), `slam` at
`close4End`, `sparkle` at `MAGE1_LEAVE[0] - 20`, `pop` 0.25 per mirror pop, `ice` 0.15 on the
first mirror, `levitate` at `mage2Grab + 4`, `zap` at `teleport`, `pong_beep` 0.18 for every frame
in `BEEPS`, `gears` loop during W14, `pop` 0.5 + `squash` 0.5 + `slam` 0.45 at `pop`.

Shakes: `close4End` 0.18, `pop` 0.26. Rumble: W14 0.02, growing to 0.04 in the last 40 frames
(two rumble entries).

### 5.4 Verify loop L4

```pwsh
npm run review -- CrushingWalls 1580:2220:8 --out out/review/CrushingWalls/L4
npm run review -- CrushingWalls 1700:1760:2 --out out/review/CrushingWalls/L4-blink
npm run review -- CrushingWalls 2120:2210:2 --out out/review/CrushingWalls/L4-pop
```

- [ ] Mage 1 enters only after the cube popped and the walls are open; he does not step on the
      cube or any pancake.
- [ ] On "blink" he disappears inside and reappears outside the right wall, not inside the wall
      or the press.
- [ ] He leaves to the right and never returns.
- [ ] Five mirrors pop in, one per word ("line, room, arcane, deflection, mirrors").
- [ ] The orb never goes inside a wall: at every bounce its edge touches a mirror/wall face.
- [ ] The orb visibly speeds up; the beeps match the visible bounces.
- [ ] On "bounce" (2167) the orb pops as the walls meet; wafer, then pancake back-left.
- [ ] All earlier corpses (goblin, rogue 2, cube) are still in place.

---

## P6. Level 5 — the party, the lunging rail room, the mimic (frames 2190–2920)

**Narration:**
- `l5a` "Finally, for paranoid parties that stand outside the doorway poking the floor with a
  ten-foot pole,"
- `l5b` "you mount the entire room on high speed rails. The moment their stick touches a tile, the
  whole room lunges into the hallway, swallows them whole, and blasts them through the ceiling
  chute straight into your pet Mimic."
- `end` "Congratulations, your dungeon is now unbeatable."

### 6.1 timeline.ts

```ts
export const PARTY_WALK = PARTY.map((p) => walkWindow(BEATS.partyArrive, p.x - 7, p.x, WALK));
export const PARTY_ON_CAMERA = onCamera(PARTY_WALK[0], PARTY[0].x - 7, PARTY[0].x);
/** Pole taps on the floor in front of / in the doorway (absolute x of the tip). */
export const POLE_TAPS = [
  { at: BEATS.poke, x: -2.9 },
  { at: BEATS.poke + 12, x: -2.6 },
  { at: BEATS.poke + 24, x: -2.25 },
  { at: BEATS.poke + 36, x: -2.0 },
  { at: BEATS.trigger, x: TILE_X },   // the fatal tap, inside the room
];
/** Party members after the walls slam (room-relative): squeezed to x 0, then launched. */
export const partyFlight = (frame: number, i: number) => { /* see below */ };
```

Party behaviour:

| Frames | All three |
| --- | --- |
| walk windows | `walk`, `FACE_RIGHT`, in single file; the paladin first. Expressions `focus`/`scared` (paranoid: the mage and rogue glance around with yaw wiggles). |
| `partyArrive → poke` | stop outside the doorway; the paladin raises the pole |
| `poke → trigger` | the paladin pokes (`point` or `smash` pose, arm forward); the tip follows `POLE_TAPS`, lifting 0.25 between taps (`bump`). The mage and rogue lean in behind him. During the rails install (2371–2449) the taps pause (the pole hovers at -2.0). At `stickIn` the pole reaches into the room. |
| `trigger → lunge` | the tile glows red. All three freeze: expression `shock`, then a slow head turn to the camera (`FACE_CAMERA`, double-take at `trigger + 20`). |
| `lunge → lunge + 8` | the room lunges left by 3.6 (`roomDX`). They do not move: the left wall's doorway passes around them (they are inside the room now). |
| `portcullis` | the grille drops behind them. They `cower`, `scared`. |
| `blast - 4 → blast + 2` | W17 slams. Each member's room-relative x is pushed to 0 and `squashX` = `wallInner / HALF[cls]` (clamped 0.12). |
| `launch + 3i → +12` | launched straight up from (0, 0.5) to (0, `CHIMNEY_TOP` + 0.3) through the vent and chimney, pose `launch`, still a wafer, spinning (`yaw += 0.6/frame`). |
| `→ arrive + 3i` | a `bezier` from the chimney top up over to the mimic's open mouth (`[MIMIC.x, MIMIC.y + 0.55, Z]` room-relative — read `MimicChest` for the real mouth position), peak height `CHIMNEY_TOP + 1.2`. |
| ≥ `arrive + 3i` | `null` (eaten). The pole falls to the floor at `launch` and stays there. |

Note the z: during the flight bring each member from their own z to `Z` (the chimney is at z Z).

### 6.2 Install (l5b)

`RoomRails railsAt={BEATS.rails} wheelsAt={BEATS.wheels} boosterAt={BEATS.booster}
lungeAt={BEATS.lunge} portcullisAt={BEATS.portcullis} dx={roomDX(frame)}`, `TriggerTile
x={TILE_X} triggerAt={BEATS.trigger}`, `MimicChest` (see §R). The rails are outside `CrushRoom`;
the wheels, booster plate, portcullis, tile and mimic are inside it.

### 6.3 Camera

| Key | Pose |
| --- | --- |
| `followTrack({ start: PARTY_ON_CAMERA, end: BEATS.partyArrive, target: f => [paladinX(f) - 0.8, 0, Z], dist: 10, clampX: [-7.8, -2.4], blend: 1 })` | the party walks in |
| `wp(BEATS.poke - 4, shot(-2.6, 1.4, 9))` | poking outside the doorway; doorway + first taps in frame |
| `wp(BEATS.rails - 2, shot(-1, 1.8, 15, { rise: 2.5 }))` | wide: rails slide under the room, the mimic appears on the roof |
| `wp(BEATS.booster + 10, shot(-1, 1.8, 15, { rise: 2.5 }))` | hold |
| `wp(BEATS.stickIn - 4, shot(-1.8, 0.9, 6))` | close on the pole and tile |
| `wp(BEATS.trigger + 18, shot(-2.4, 1.3, 8))` | the party's double-take |
| `holdTrack(BEATS.lunge - 3, BEATS.portcullis + 20, shot(-3.6, 1.8, 14))` | the room slides into frame around them |
| `wp(BEATS.blast - 6, shot(-3.6, 1.4, 9))` | squeeze |
| `followTrack` or `wp(BEATS.launch + 4, shot(-2.9, 3.0, 12))` | flight up the chimney and over to the mimic |
| `wp(BEATS.chomp - 6, shot(-2.15, 4.0, 7.5))` | mimic close-up: chomp, chew |
| `wp(BEATS.burp + 10, shot(-3.0, 2.4, 13))` → `wp(DURATION, shot(-3.0, 2.6, 15.5))` | pull back for the stamp: room + mimic centred |

(`-2.15` = `LUNGE_DX + MIMIC.x`; write it as that expression in code.)

SFX: `whoosh` on the party entrance (soft, 0.15), `click` per pole tap (`POLE_TAPS`), `rumble` +
`roll` at `rails` (16 frames), `clank` at `wheels`, `twang` + `ratchet` at `booster`, `growl`
0.2 at the mimic spawn, `click` 0.4 + `zap` 0.2 at `trigger`, `whoosh_big` 0.5 + `slam` 0.4 at
`lunge` and `roll` during the slide, `gate` 0.5 at `portcullis`, `slam` 0.55 + `squash` 0.4 at
`blast + 2`, `launch` per member at `launch + 3i`, `whoosh` at `launch`, `trap_open` at
`mimicOpen`, `chomp` 0.55 at `chomp`, `chew` at `chomp + 10`, `burp` 0.5 at `burp`, `stamp` 0.6 +
`boom` 0.35 at `stamp`.

Shakes: `lunge + 8` 0.32, `portcullis` 0.12, `blast + 2` 0.3, `chomp` 0.16, `stamp` 0.22.
Rumbles: `rails → booster` 0.03, `lunge → lunge + 12` 0.05.

### 6.4 Verify loop L5

```pwsh
npm run review -- CrushingWalls 2190:2920:8 --out out/review/CrushingWalls/L5
npm run review -- CrushingWalls 2500:2640:2 --out out/review/CrushingWalls/L5-lunge
npm run review -- CrushingWalls 2660:2800:2 --out out/review/CrushingWalls/L5-mimic
```

- [ ] Three fresh adventurers walk in; nobody walks through the room or a corpse.
- [ ] The pole tip touches the floor at every tap (no hovering, no sinking).
- [ ] Rails, wheels and the booster appear on "mount", "high", "rails".
- [ ] The tile glows exactly on "touches".
- [ ] On "lunges" the whole room jumps left in 8 frames; all pancakes, the cube, the mimic and the
      pedestal move with it; the rails stay put.
- [ ] The party is inside the room after the lunge (between the walls), never inside a wall.
- [ ] Portcullis on "swallows"; walls slam on "blasts"; three wafers shoot up the chimney.
- [ ] Each wafer ends exactly in the mimic's mouth before "Mimic" (2749); chomp on "Mimic".
- [ ] Burp after "Congratulations"; the stamp lands on "unbeatable"; the final frame shows the room
      and the mimic, centred, nothing cut.

---

## C. Framing rules (use these numbers before you look at a still)

For `shot(x, y, d)` (fov 40, portrait): the frame is about `0.41·d` wide and `0.73·d` tall,
centred on `y`.

| Rule | Formula | Example |
| --- | --- | --- |
| Floor (y = 0) at least 25% from the bottom (above the subtitles) | `y ≤ 0.18·d` | d 7.4 → y ≤ 1.33 |
| Nothing important above the HUD badge band (top 20%), after frame 84 | top of the subject `≤ y + 0.219·d` | d 10.5, y 1.85 → ≤ 4.15 |
| Nothing important under the title card (top 30%), frames 0–82 | top of the subject `≤ y + 0.146·d` | d 14.5, y 2.0 → ≤ 4.1 (walls top 3.15 ✓) |
| Subject inside the middle 80% of the width | `\|subjectX - x\| ≤ 0.164·d` | d 9 → ±1.48 |
| Both inner wall faces visible (open walls at ±1.8) | `d ≥ 11` for them inside 80%, `d ≥ 8.8` for them just in frame | |

Character heights at episode scale (`1.64 · 1.12 · CLASS_SCALE`): goblin ≈ 1.51, rogue/mage
≈ 1.84, paladin ≈ 1.95.

Camera config rules:

- Waypoint frames must be **increasing**. All of them are `BEATS` expressions, so sort them by
  their nominal frames from this document. If two collide after an edit, `Math.max(...)` clamp.
- Hold waypoints 25–90 frames. Slow push-ins (d shrinking by 5–10%) between two waypoints.
- Tracks override waypoints. `blend: 1` = hard cut. Every entry `followTrack` uses
  `clampX: [-7.8, …]` so the bright exit is never framed.
- Do not cut to a `holdTrack` before everybody in it has arrived.

---

## F. Common failures and their fixes

| Symptom in a still | Cause | Fix |
| --- | --- | --- |
| `Missing narration cue l3b:five-hundred#0` at load | wrong token | use the token from §0.3 (`"500"`, `"10-ft"`, `"shoots"`, `"high-speed"` in l4c, `"high"` + `"speed"` in l5b) |
| `[crushing-walls] … crosses the doorway at …` | walker leaves too early | arrive later (`+ n` on the arrive beat) or walk faster; never move the wall reopen earlier than the wafer's 15 readable frames |
| A wall is solid black | inward winding | build every panel with `G.box`, never raw `RoundedBoxGeometry`; or flip `side` on the material |
| The walls do not appear at all / jump | `wallInner` loop blends from the wrong value | print `wallInner` every 10 frames (§T.2) and fix the loop |
| A victim floats or sinks | `position[1]` ≠ 0, or `squash` scaling about the wrong pivot | feet at y = 0; `squash`/`squashX` scale about the feet (the outer group) |
| The wafer is a pancake instead of a thin vertical sheet | used `squash` instead of `squashX` | wafer = `squashX` small, `squash` 1 |
| The pancake shows through the closed walls | pancake taller than `WALL_BOTTOM` | `PANCAKE_SQUASH` 0.09, or `WALL_BOTTOM` 0.18 |
| A newcomer walks through a pancake | lanes overlap the walk line | lanes from §G.4; if you moved `GRAB_X`, move lanes too |
| A corpse disappears in a later level | actor returns `null` after its death | the death branch must be the last `return` and must never be `null` (except the eaten party) |
| A character goes through the slab instead of the vent | x not at 0 while rising | lerp x to 0 **before** y passes `SLAB_Y[0]` |
| The beam floats in front of / behind the walls | wrong z or `inner` not used | beam at z = Z, ends at `±wallInner(frame)` |
| The orb goes into a wall | used the wall's centre instead of the inner face | `lim = wallInner(f) - ORB_R` |
| A prop pops in | no install animation | `easeOutBack` scale/position over 8–16 frames |
| The camera shows the empty doorway or empty floor | track started too early | start at `*_ON_CAMERA`; `clampX` |
| A subject is cut by the frame edge | hold started before arrival, or d too small | §C formulas; start holds after arrival |
| Armour blows out white | a light or glow too close to the paladin | lower `GlowSprite` opacity near him; never put `metal` on large panels |
| The stage name wraps to two lines | > 26 characters | use the names in §2.4 |
| Lint: "Property 'flatMap' does not exist" | TS lib target | `([] as T[]).concat(...)` |
| The review still shows the previous edit | stale bundle/PNG | `review.mjs` disables the cache; if you call `npx remotion still` yourself pass `--bundle-cache=false` and delete the old PNG |
| The wafer looks like a thin card that z-fights the walls | `CLOSED_INNER` too small | the slot is 0.12 wide; the wafer at `squashX` 0.12 is ≈ 0.08 wide; keep the minimum `squashX` ≥ 0.12 |

---

## P7. Polish, render, check

### 7.1 Full-episode review

```pwsh
npm run lint
npm run review -- CrushingWalls --beats --around --out out/review/CrushingWalls/beats
npm run review -- CrushingWalls --every 20 --out out/review/CrushingWalls/all
```

Look at every sheet. For every level re-tick its checklist (§2.5, §3.4, §4.4, §5.4, §6.4) **and**
this global list:

- [ ] Every install is on screen while its words are spoken.
- [ ] Every impact has a burst + SFX + shake on the same beat.
- [ ] Corpses at the end of the episode, inside the lunged room: goblin pancake, rogue 2 pancake,
      paladin cube, mage 2 pancake. Rogue 1 and mage 1 are gone (they escaped). The party is
      eaten.
- [ ] Nobody walks through a wall, the slab, a corpse or the cube.
- [ ] No frame is just an empty set (no "dead air").
- [ ] Stage badges pop on `l1a`, `l2b`, `l3b`, `l4b`, `l5b`, one line each.
- [ ] Faces read at phone size: zoom the sheet to 25% and check you can still see who is scared,
      smug or dead.

### 7.2 Optional extra SFX

If the walls feel quiet, add two sounds to `EXTRA` in `scripts/crushing-walls-audio.py`, built from
the `da` primitives already used there (look at how `boing`, `pong_beep` and `toaster_ding` are
made):

- `grind`: 2 s of low-passed noise (stone on stone) with a slow amplitude wobble; loopable.
- `buzz`: 1.5 s of an electric hum (a 120 Hz saw/square through a band-pass, plus crackle bursts).

Then run **only** `python scripts/crushing-walls-audio.py sfx` (never `narration`), and use them:
`grind` under every wall move longer than 20 frames (`loopCue` or `durationInFrames`), `buzz`
under `electrify → fold`.

### 7.3 Render and check

```pwsh
npm run render:crushing-walls
npm run check:video -- crushing-walls
```

- Open `out/review/crushing-walls-video-sheet-*.png` — the strip must read as a coherent story.
- Loudness must be −14 ±1 LUFS integrated and the true peak ≤ −1 dBTP. If it fails, lower the
  loudest SFX volumes (slams, booms) by 0.05–0.1 at a time. Do not change `audio.volume` or
  `music.volume` (both stay 1).
- Watch the rendered MP4 once end to end with sound. Note each problem with its frame number, fix,
  re-render.

### 7.4 Done when

- [ ] `npm run lint` passes.
- [ ] Every checklist in this file is ticked.
- [ ] `check:video` passes.
- [ ] No literal frame numbers in `timeline.ts` / `config.ts` except `0`, the title `stamp` at 6,
      and `DURATION`. Check: `rg "\b[0-9]{3,4}\b" src/episodes/crushing-walls/*.ts` and inspect
      every hit (geometry like `0.45` is fine; a beat like `1563` is not).
- [ ] Not committed (the user commits).

---

## Appendix A. `config.ts` skeleton

```ts
import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import { followTrack, holdTrack, orbitShot, shot, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import { BEATS, BEEPS, DURATION, GOBLIN_WALK, LUNGE_DX, MIMIC, ROGUE1_ON_CAMERA, /* … */ STAGE_STARTS, Z, rogue1X } from "./timeline";

const sfx = sfxFor("crushing-walls");
const wp = (frame: number, pose: ReturnType<typeof shot>) => ({ frame: Math.round(frame), ...pose });

const SFX: SfxCue[] = [
  sfx("stamp", 6, 0.4),
  ...STAGE_STARTS.map((f) => sfx("pop", f, 0.2)),
  // L1 … (§2.3)
  // L2 … (§3.3)
  // L3 … (§4.3)
  // L4 … (§5.3)
  ...BEEPS.map((f) => sfx("pong_beep", f, 0.18)),
  // L5 … (§6.3)
  sfx("stamp", BEATS.stamp, 0.6),
  sfx("boom", BEATS.stamp, 0.35),
];

export const config: EpisodeConfig = {
  id: "CrushingWalls",
  // keep title, size, fps, audio, music, subtitles, overlays exactly as the scaffold has them
  durationInFrames: DURATION,
  camera: {
    fov: 40, near: 0.2, far: 350,
    initialPosition: [0, 3.0, Z + 14.5],
    waypoints: [
      wp(0, shot(0, 2.0, 14.5, { rise: 1 })),
      wp(BEATS.pedestalUp - 4, shot(0, 1.5, 10)),
      // … every level, in frame order …
      wp(DURATION, shot(LUNGE_DX + 0.6, 2.6, 15.5)),
    ],
    tracks: [
      followTrack({ start: ROGUE1_ON_CAMERA, end: BEATS.rogue1Grab, target: (f) => [rogue1X(f), 0, Z],
        dist: 9.5, lead: 0.6, clampX: [-7.8, 0], blend: 1 }),
      holdTrack(BEATS.platesIn - 2, BEATS.grease + 24, orbitShot(0, 1.6, 9, -0.5)),
      // …
    ],
    shake: [ /* every impact, §2.3–§6.3 */ ],
    rumbles: [ /* wall installs, creeps, rails, lunge */ ],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  // audio / music / sfx / subtitles / overlays / OverlayComponent: unchanged from the scaffold, sfx: SFX
};
```

`holdTrack` takes a pose from `shot`/`orbitShot` (same `CameraPose` type). If `followTrack`'s
`target` needs a y other than 0, pass it in the target tuple.

## Appendix B. Order of work (one screen summary)

1. P0: read; print cues.
2. P1: `squashX`, `orbitShot`, `ElectricArc`; lint.
3. P2: timeline core (§T) + L1; review L1 until every box is ticked.
4. P3: L2; review L2 **and** re-run the L1 range (W-moves may have shifted).
5. P4: L3; review L3 + spot-check L1/L2.
6. P5: L4; review L4.
7. P6: L5; review L5.
8. P7: beats review, full review, optional SFX, render, check:video, watch.

Never move on with a failing `assertBeats`, a lint error, or an unticked box.
