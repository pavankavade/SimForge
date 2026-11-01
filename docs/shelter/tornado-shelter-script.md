# How a Closet Becomes a Tornado Shelter (draft script v1)

OmnixxLabs shelter short, about 60–70 s (16 lines). It copies what made the Nuclear Bunker hit
(19K views when the other three shorts were around 1K): it starts in *your* home, the threat is a
real modern fear, every level adds one piece of real engineering, and there is one surprising
"you might think" twist.

- **Slug:** `tornado-shelter`, id `TornadoShelter`, series `shelter`.
- **Title:** How a Closet Becomes a Tornado Shelter 🌪️
- **Alt titles:** How Your Closet Survives an EF5 Tornado / How a Closet Becomes Tornado-Proof
- **End stamp:** `TORNADO STATUS` → `EF5-PROOF`.
- **Art style:** the new clean low-poly look (`src/lowpoly`, see the bottom of this doc), not the
  bunker's look.

## LINES

Same format as `scripts/nuclear-bunker-audio.py` (id, line, pause in seconds after the line).

```python
LINES = [
    ("l1a", "When the tornado siren goes off, you hide in your bedroom closet.", 0.30),
    ("l1b", "But the closet is on an outside wall. The wind tears the wall away, and you go with it.", 0.90),
    ("l2a", "So you pick a room in the middle of the house, on the lowest floor, with no windows.", 0.30),
    ("l2b", "The walls stay up. But a board flies through the drywall like a spear.", 0.90),
    ("l3a", "Most tornado injuries come from flying debris, not from the wind.", 0.30),
    ("l3b", "So you line the walls with two layers of plywood and a sheet of steel.", 0.30),
    ("l3c", "Engineers test it by firing a fifteen pound board at a hundred miles an hour. It bounces off.", 1.00),
    ("l4a", "Then the wind gets under the ceiling, and lifts the whole room off the floor.", 0.90),
    ("l4b", "You might think you should open a window to let the pressure out. Don't. That only lets the wind in to push from below.", 0.90),
    ("l4c", "So you bolt the walls into the concrete floor, with steel anchors all the way around.", 0.30),
    ("l5a", "Now the weakest part is the door. A normal door blows right in.", 0.90),
    ("l5b", "So you hang a steel door, with three hinges and three locks.", 0.30),
    ("l5c", "And the air vents get steel covers, so nothing can fly in through them.", 0.90),
    ("l6a", "The worst of the storm passes in under a minute. The house is gone. Your room is still standing.", 1.00),
    ("l6b", "Add a flashlight, bottled water, helmets for everyone, and a weather radio.", 0.30),
    ("end", "Congratulations. You have built a tornado shelter.", 1.60),
]
```

Words to key beats on (each one appears once in its line): `siren`, `closet`, `tears`, `middle`,
`spear`, `debris`, `plywood`, `steel`, `firing`, `bounces`, `lifts`, `window`, `below`, `bolt`,
`door`, `blows`, `hinges`, `covers`, `gone`, `standing`, `helmets`, `Congratulations`.

`WORD_FIXES` will need `fifteen` and `hundred` (the transcriber writes 15 and 100).

## Shots (one cutaway house set, camera side-on like the bunker)

| Line | Picture |
| --- | --- |
| l1a | Wide establishing shot: a low-poly house on a lawn with a dark green sky and a funnel on the horizon. The siren pole wails. Dad grabs the kid and ducks into the bedroom closet against the outside wall. |
| l1b | The funnel arrives. The roof peels off in panels, the outside wall hinges out and away, and the closet goes with it. Cut to the family tumbling into the hedge (cartoon, alive, dazed). |
| l2a | Rebuilt house, cutaway. A highlight sweeps the floor plan: the bathroom or pantry in the centre, ground floor, no windows. The family walks in. |
| l2b | Outer walls shudder but hold. A 2×4 punches through the drywall a foot from Dad's head. Hard cut, shake. Freeze on the board sticking through, shock faces. |
| l3a | An explainer overlay: a pie of tornado injuries, mostly debris. Boards, shingles and a trampoline whirl past outside. |
| l3b | The walls build up in layers that slide in: plywood, plywood, then a steel sheet with an `easeOutBack` overshoot. |
| l3c | The test-rig cutaway: an air cannon fires a 2×4 at the panel. Show the speed readout "100 MPH". It bounces off with sparks and a clank. |
| l4a | The storm returns. The room's ceiling bows, then the whole box lifts an inch off the slab. Dust jets out of the gap at the floor. |
| l4b | Split gag: Dad reaches for a window; a big red ✕. The wind pours in and pushes the house's roof up from below. |
| l4c | Anchor bolts drill into the slab around the room, *thunk thunk thunk*. The room slams back down and stays down. |
| l5a | Close on the plain wooden door, which bows, splinters and blows in. |
| l5b | A steel door with hazard stripes swings in. Three hinges, then three bolts shoot home one by one. |
| l5c | Small vents near the top get steel hood covers. A pebble pings off one. |
| l6a | The tornado passes: a full rumble, the screen darkens, debris streams past. The calm after: the house is gone, a bare slab with only the steel room standing. The door opens and the family peeks out. |
| l6b | Inside, the supplies pop onto a shelf one by one: flashlight, water, helmets (the kid's is a bike helmet), weather radio. |
| end | Pull back wide: the lone safe room on the slab under a clearing sky. Stamp. |

## Facts (check before voicing)

- FEMA P-361 / ICC 500 tornado safe rooms: designed for **250 mph** winds (EF5 range), and walls must
  stop a **15 lb 2×4 at 100 mph** (67 mph on roofs). Typical wood-frame build: plywood layers plus
  14-gauge steel sheet, anchored to the slab.
- FEMA and the NWS: most tornado injuries and deaths are caused by **flying debris**.
- NWS shelter advice: a small interior room on the **lowest floor, away from windows**.
- NWS myth: **opening windows to equalise pressure** does not help and wastes time.
- FEMA door guidance: tested door assemblies, multiple hinges and **three latching points**. "Three
  hinges and three locks" is a simplification; keep it, but check before voicing.
- "Under a minute" is true for most tornadoes passing a single house. Wide, slow tornadoes take
  longer, which is why the line says "the worst of the storm".
- Helmets: CDC/NWS suggest helmets (bike helmets are fine) for head injuries.

## Art direction: clean low-poly

The reference is the new three.js low-poly demo (a throne room with chunky bevelled blocks,
octagon floor tiles and soft sunlight). It is built in `src/lowpoly`:

- Flat-shaded, chunky geometry with **chamfered edges** (one bevel facet, so every edge catches a
  highlight). No textures, and no ink outlines on props.
- A muted, desaturated palette: blue-grey stone and plaster, warm tan trim, orange wood, one
  saturated accent per scene (here: hazard yellow on the steel room, red for danger).
- One big soft sun, very soft shadows, a cool sky fill and strong ambient occlusion in the corners.
  Neutral tone mapping, gentle contrast, no grain or vignette.
- The ink & vinyl characters stay as they are. Their outlines read as the "toy" in a clean
  diorama.
