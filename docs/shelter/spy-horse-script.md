# How a Dead Horse Becomes a WW1 Spy Post (draft script v1)

OmnixxLabs shelter short, about 70 s (15 lines), same shape as the igloo and spy tree: start with the
obvious thing *you* would do, watch it fail, and add one piece of real deception per level, with
one "you might think… Don't" twist.

- **Slug:** `spy-horse`, series `shelter`.
- **Title:** How a Dead Horse Becomes a WW1 Spy Post 🐴
- **Alt titles:** The Fake Horse That Spied on the Enemy / Why WW1 Soldiers Hid Inside Dead Horses
- **End stamp:** `SNIPER STATUS` → `FOOLED`.
- **Tone:** the horse is a toy-like prop, never gory. It reads as a lumpy grey-brown shape with
  stiff legs up, a cartoon X eye and flies. Gags come from the soldiers, not the carcass.
- **Cast:** one observer (ink & vinyl soldier, helmet), a night crew of three, an artist with a
  sketchbook and a clothes peg on his nose. Enemy only as rifle flashes, a scope glint and a far
  trench line.

## LINES (as voiced, v1; source of truth is `scripts/spy-horse-audio.py`)

```python
LINES = [
    ("l1a", "On the front line, you need eyes on the enemy trench. So you crawl into no man's land and lie flat in the mud.", 0.30),
    ("l1b", "But out there, anything that moves gets shot. One twitch, and the sniper has you.", 0.90),
    ("l2a", "So you dig a shell hole deeper, and pile sandbags around the edge.", 0.30),
    ("l2b", "But the enemy maps every crater. A fresh sandbag wall by morning means a shell by lunch.", 0.90),
    ("l3a", "The only thing nobody looks at twice is a dead horse. There are hundreds of them out there.", 0.30),
    ("l3b", "So an artist crawls out at night, holds his nose, and sketches one, every fold and every shadow.", 0.30),
    ("l3c", "Behind the lines, they build a hollow copy out of papier-mache, and paint it to match.", 0.90),
    ("l4a", "You might think you'd just put it down next to the real one. Don't. Two horses where there was one, and they shell both.", 0.90),
    ("l4b", "So you swap them. Under the noise of the guns, the crew drags the real horse away into a trench.", 0.30),
    ("l4c", "And they lay the copy in the exact same spot, legs in the air, before dawn.", 0.90),
    ("l5a", "Inside there's just room for one man, lying on his belly, with a rifle.", 0.30),
    ("l5b", "He watches through a slit in the neck, and a telephone wire runs back to your trench.", 0.90),
    ("l6a", "At sunrise, the enemy sees the same dead horse they've ignored for a week.", 0.30),
    ("l6b", "And from inside it, you call in every move they make.", 1.00),
    ("end", "Congratulations. You have built a spy horse.", 1.60),
]
```

Changed from the draft after checking sources: the copy is papier-mache (not a steel frame with
plaster), and the tunnel is gone (no good evidence for one). 93.8 s voiced.

## Facts (checked)

- Popular accounts and a 1918 photo caption describe a hollow papier-mache dead-horse sniper /
  observation post swapped for a real carcass in no-man's land at night (usually French), with a
  gun port and a telephone line back to the trench. How often it was really used is not known, and
  no example survives, so the short makes no claims about numbers or a specific battle.
- Papier-mache decoys (dummy heads to draw sniper fire) are documented by the Imperial War Museum.

## Shots (one no-man's-land set: mud, craters, wire, two trench lines, a few toy horse carcasses)

| Line | Picture |
| --- | --- |
| l1a | Wide over the cratered strip at grey dawn. The observer crawls out on his belly and lies flat, binoculars up. |
| l1b | He scratches his nose; crash-zoom to a scope glint in the far trench; ping, his helmet spins off and he scrambles back, dazed (no hit on the body). |
| l2a | A new observer deepens a crater with a spade; sandbags stack up around the rim. |
| l2b | Gag: sunrise, an enemy officer's binoculars ring the fresh sandbags in red; at lunch a shell blasts them; the observer pops up sooty. |
| l3a | Slow pan across the field: three or four toy horse carcasses, legs up, flies buzzing. The enemy scope slides right past them. |
| l3b | Night, blue moonlight. The artist crawls to one horse, clothes peg on his nose, and sketches; the sketch page fills in as an overlay. |
| l3c | Workshop: a steel frame welds together, plaster and canvas go on, painters match it to the sketch side by side. |
| l4a | Gag: the copy placed beside the real horse; red ✕; at sunrise the scope sees two, both get shelled. Rewind. |
| l4b | Night again; guns flash on the horizon; the crew ties a rope and drags the real horse into a trench, timed to a shell burst. |
| l4c | They set the copy down in the same spot, legs up, tamp the mud, crawl away as the sky lightens. |
| l5a | X-ray cutaway: the observer slides in on his belly with a rifle and a field telephone. |
| l5b | A slit opens in the neck; through-the-slit view of the enemy line; the telephone wire runs back to our trench. |
| l6a | Enemy officer with binoculars sees the same dead horse, shrugs, looks away. |
| l6b | Inside, the observer whispers into the phone; behind the enemy trench, our shells land on target. |
| end | Pull back over the quiet battlefield with the spy horse in the middle; a fly lands on it. Stamp: SNIPER STATUS / FOOLED. |
