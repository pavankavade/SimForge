# How a Prison Bed Becomes an Escape Tunnel (draft script v1)

OmnixxLabs shelter short, about 56 s (10 lines). It keeps the series' "you" voice but follows a
tighter shape than the igloo and spy horse, modelled on the retention of GroundNUp's "How a
Bookshelf Becomes a Hidden Room" (youtube.com/shorts/lS_y1YZgiTY):

- **The hook is the whole premise**, spoken from frame 0. No title card before the first word.
- **A strict But / So chain:** five problems, five fixes, about 8 s each. No "you might think… Don't".
- **The ending is the payoff and a question, not a stamp.** The light finds you beside the guard
  tower; the narrator asks "So. Do you run, or go back down?" while you pull the turf back over
  your head. Then it loops into "Dig a hole…". No "Congratulations" line, no end card.
- **Comment hook:** the closing question. Pin it as the first comment too.
- **No comic pop-words on screen** (BONK!, CRASH! and so on): tried and rejected. The gags are in the
  acting and the sound only.

- **Slug:** `escape-tunnel`, series `shelter`.
- **Title:** How a Prison Bed Becomes an Escape Tunnel
- **Alt titles:** How 600 Prisoners Hid a Tunnel Under a Stove / Why This Escape Tunnel Came Up Short
- **Tone:** an unnamed toy prison camp. The real escape ended in fifty executions, so no flags, no
  names, no dates, and the short ends before anyone is caught.
- **Art style:** the realistic lab look (`labs/escape-tunnel`, built like `labs/spy-horse`). The
  set is one long side-on cutaway: hut, yard, fence, tower and trees on top, the tunnel below.
  The 9:16 frame suits it, with the hut in the top third and thirty feet of sand under it.
- **Cast:** "you" (prisoner, cap), a second prisoner on the pump and the bunks, a line of
  "penguins" in greatcoats, one guard on the tower, one "ferret" searching the hut.

## LINES (source of truth is `scripts/escape-tunnel-audio.py`)

```python
LINES = [
    ("l1a", "Dig a hole under your prison bed, and you have an escape tunnel.", 0.25),
    ("l1b", "But the guards search every floor. So the hole starts under the hot stove, where nobody puts a hand.", 0.35),
    ("l2a", "But the sand you dig is bright yellow, and the yard is dark grey.", 0.25),
    ("l2b", "So you carry it out in bags inside your trousers, and shake it loose as you walk.", 0.35),
    ("l3a", "But sand caves in. So every bed in the hut gives up its boards to line the walls.", 0.35),
    ("l4a", "But thirty feet down, the air runs out. So a pump made from a kit bag pushes air through a pipe of milk tins.", 0.35),
    ("l5a", "But crawling the length of a football field takes all night. So you lay wooden rails, and ride a trolley on a rope.", 0.35),
    ("l6a", "Then one night you climb the last ladder, push up through the grass,", 0.25),
    ("l6b", "and you are just short of the trees, right beside the guard tower.", 0.80),
    ("end", "So. Do you run, or go back down?", 1.00),
]
```

Words to key beats on: `dig`, `bed`, `tunnel`, `guards`, `search`, `stove`, `hand`, `sand`,
`yellow`, `grey`, `carry`, `trousers`, `shake`, `walk`, `caves`, `bed`, `boards`, `walls`,
`thirty`, `air`, `pump`, `pipe`, `tins`, `crawling`, `night`, `rails`, `trolley`, `rope`,
`ladder`, `grass`, `short`, `trees`, `tower`.

## Facts (checked against Wikipedia "Stalag Luft III" and PBS NOVA "Great Escape")

- The entrance to the tunnel "Harry" was hidden under a stove in hut 104. (The stove was kept lit
  so nobody would want to move it; that detail is from popular accounts, so the line only says "hot".)
- The subsoil was bright yellow sand and the surface soil dark grey, so dumped sand showed at once.
- Prisoners carried sand out in pouches inside their trousers and let it trickle out as they
  walked. Greatcoats hid the bulges; the carriers were called "penguins".
- The sandy walls collapsed easily and were shored with wood, mostly bed boards. Of about twenty
  boards under each mattress, only about eight were left.
- The tunnels were about 9 m (30 ft) deep. Air was pumped by a bellows built from knapsacks/kit
  bags and bed parts, through ducting made of Klim powdered-milk tins.
- Harry was about 100 m long (sources give 102 m / 336 ft), with a rope-hauled trolley on wooden
  rails. "The length of a football field" is fair for both kinds of football.
- The exit came up nearly 30 ft short of its mark: past the fence, but short of the tree line and
  close to a guard tower.
- Not used: the microphones in the ground (the reason for the depth), the electric lighting, the
  forged papers, the numbers (76 out, 73 recaptured, 50 shot).

## Shots (one set, cut by a plane at z = 0)

| Line | Picture |
| --- | --- |
| l1a | Starts mid-action, no title: a prisoner pulls a floorboard under his bunk and digs. Tilt down the cutaway to show how far there is to go. Caption words only. |
| l1b | A ferret pokes the hut floor with a rod and finds the hole (red ring). Rewind-free cut: the stove slides aside on its tile slab, the shaft is under it; the ferret reaches for the stove, burns his fingers, leaves. |
| l2a | Cutaway of the shaft going down: grey crust on top, bright yellow below. A bucket of yellow sand tipped on the grey yard glows like a traffic cone; the tower guard's head turns. |
| l2b | Penguin walk: greatcoats, hands in pockets, a pull on a string, yellow trickles from both trouser legs and gets scuffed into the grey by the boots behind. |
| l3a | The gallery roof slumps on the digger (he pops out, dazed, sand on his cap). Then boards fly off every bunk in the hut and frame the tunnel one bay at a time; a prisoner lies down on three boards and sags through. |
| l4a | Long pull down the full thirty feet. The digger's lamp gutters and he wilts. At the shaft foot a second prisoner rows a kit-bag bellows; tins click together along the floor and a puff reaches the digger's face. |
| l5a | A night-to-dawn clock while he crawls, tiny in a long tunnel. Then rails click down, he lies on the trolley, the rope snaps tight and he shoots along it. |
| l6a | Night. The last ladder; a hand pushes up a square of turf. |
| l6b | His head comes up. Whip to the tree line, still a run away, then to the guard tower right above him, searchlight sweeping. Hold on his face. Cut to black on the beat and loop. |

## Status

Voiced (55.6 s, audio v2) and built in `labs/escape-tunnel`; the film is `out/shelter/escape-tunnel/escape-tunnel.mp4`.
The shots as built are described at the top of each line's section in `labs/escape-tunnel/src/anim.js`;
they differ from the table above in places (the head on the bunk, the x-ray trouser bags, the depth
counter, the all-night clock, the red dashes to the trees). Still to do: thumbnails and upload metadata.
