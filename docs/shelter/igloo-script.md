# How a Snow Pile Becomes an Igloo (draft script v1)

OmnixxLabs shelter short, about 70 s (16 lines), same shape as the tornado shelter: start with the
obvious thing *you* would do, watch it fail, and add one piece of real engineering per level, with
one "you might think… Don't" twist.

- **Slug:** `igloo`, series `shelter`.
- **Title:** How a Snow Pile Becomes an Igloo ❄️
- **Alt titles:** How an Igloo Stays Warm at Forty Below / Why Igloos Don't Melt From the Inside
- **End stamp:** `BLIZZARD STATUS` → `-40 PROOF`.
- **Art style:** the clean realistic look of the crypt lab (`labs/crypt-hallway`: three r187
  WebGPURenderer + TSL, procedural materials, SSGI bounce light + AO, TRAA, bloom), built as its own
  lab in `labs/igloo` and filmed frame by frame the same way. The family (dad, mom, kid) is the
  ink & vinyl cast, bridged in with `cast.jsx`.

## LINES

```python
LINES = [
    ("l1a", "When a blizzard hits, you pile up fresh snow and dig a cave inside it.", 0.30),
    ("l1b", "But fresh powder is mostly air. The roof sags, and caves in on you.", 0.90),
    ("l2a", "So you cut blocks from hard, wind-packed snow, and stack them in rings like bricks.", 0.30),
    ("l2b", "The walls go up fine. But flat rings can't close at the top, and the roof falls in.", 0.90),
    ("l3a", "So you lay the blocks in one rising spiral, each one leaning on the one before.", 0.30),
    ("l3b", "The spiral holds itself up, and one last key block locks the dome shut.", 1.00),
    ("l4a", "But the door is at floor level, and the wind blows straight across the floor.", 0.90),
    ("l4b", "So you dig the entrance as a tunnel, lower than the floor. Cold air sinks into it and stays there.", 0.30),
    ("l4c", "And you raise the sleeping platform, up where the warm air collects.", 0.90),
    ("l5a", "It's still cold. You might think a campfire would help. Don't. It melts the roof and fills the dome with smoke.", 0.90),
    ("l5b", "Instead you light one small oil lamp. It melts the inside of the walls, and they freeze into a glaze of ice.", 0.30),
    ("l5c", "The glaze seals out the wind, and a small hole at the top lets fresh air in.", 0.90),
    ("l6a", "Outside, it's forty below. Inside, with just your body heat and the lamp, it stays above freezing.", 1.00),
    ("l6b", "Add caribou furs to sleep on, and one more block to seal the tunnel.", 0.30),
    ("end", "Congratulations. You have built an igloo.", 1.60),
]
```

Words to key beats on: `blizzard`, `pile`, `dig`, `sags`, `caves`, `cut`, `stack`, `rings`,
`close`, `falls`, `spiral`, `leaning`, `key`, `shut`, `door`, `wind`, `tunnel`, `sinks`, `raise`,
`warm`, `campfire`, `melts`, `smoke`, `lamp`, `glaze`, `seals`, `hole`, `forty`, `freezing`,
`furs`, `seal`, `Congratulations`.

## Facts (checked)

- Fresh powder is roughly 90% air: a great insulator, but too loose to hold a roof up.
- Igloo blocks are cut with a snow knife from wind-packed snow (a single storm's drift), which
  holds its shape.
- The blocks go up as one rising spiral (a helix). Each block leans inward and rests on the
  previous one, so the dome needs no scaffolding; a key block closes the top.
- The entrance is a tunnel dug lower than the floor: cold air is heavier, sinks into it and stays
  there (a cold trap). The sleeping platform is raised, where the warm air collects.
- An open fire melts the roof and fills the dome with smoke. Inuit used a small seal-oil lamp
  (qulliq). It glazes the inner wall: the surface melts and refreezes into ice, which seals out the
  wind and makes the dome stronger. A small hole at the top vents stale air.
- Outside can be −40 °C (also −40 °F). Body heat and a lamp keep the inside around or above
  freezing; reports range from about −7 °C to +16 °C.

## Shots (one snowfield set; the igloo is a cutaway with the camera-side quarter removed)

| Line | Picture |
| --- | --- |
| l1a | Wide: a flat snowfield at blue hour, low sun on the horizon, the blizzard rolling in as a white wall. Dad shovels a heap of powder; the family burrow in. |
| l1b | Cutaway of the snow cave: the roof bows, cracks, and collapses on them in a puff. They pop up out of the heap, covered in snow, dazed. |
| l2a | Close on a snow knife cutting a block out of a hard drift; blocks stack in neat level rings. |
| l2b | The rings rise straight, then the top courses lean in, slip, and the whole crown slumps into the middle. |
| l3a | Top-down then side: blocks laid as one rising spiral, each leaning on the last; an overlay arrow traces the spiral. |
| l3b | The key block drops into the hole at the top and locks with a thunk. The family cheers. |
| l4a | Cutaway: a floor-level doorway; snow and wind streak straight across the floor; the family shivers. |
| l4b | The tunnel digs down below the floor; a blue "cold air" haze pours down into it and pools there. |
| l4c | A snow platform rises at the back; an orange "warm air" haze collects at the top. The family climbs up. |
| l5a | Dad builds a campfire; a red ✕ flash; the roof drips, sags, and smoke fills the dome (gag). |
| l5b | Rewind; mom lights a small oil lamp; the inner walls go glossy as a glaze of ice spreads. |
| l5c | Wind streaks outside bounce off; a vent hole pops open at the top, a wisp of air goes out. |
| l6a | Split: outside thermometer −40, storm howling; inside a warm glow, the family relaxed. |
| l6b | Furs drop onto the platform; a final block slides in to seal the tunnel. |
| end | Pull back over the glowing igloo in the blizzard at night. Stamp: BLIZZARD STATUS / −40 PROOF. |
