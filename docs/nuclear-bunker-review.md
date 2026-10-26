# Nuclear Bunker v1 vs the original — review

Compared `out/nuclear-bunker.mp4` (ours) with the original Short
(https://www.youtube.com/shorts/33dT0bfPwDE; local copy `scratch_ref2/ref.mp4`, transcript
`scratch_ref2/transcript.json`). The two narrations follow the same beats, so frames were paired on
47 shared spoken words.

Side-by-side sheets (original left, ours right): `out/review/nb_compare/pairs_1.png` … `pairs_6.png`.

## Verdict
Ours tells the same story, but the original **shows** almost every sentence as an action, while ours
mostly holds one mid-distance view of the diorama and lets props pop in. There are three root causes:

1. **Camera distance.** The original goes inside the pipe, looking down its length, and uses
   cutaway close-ups (valve pipe, ladder shaft, door). Ours stays outside at 3/4, so people, beds,
   supplies and the Geiger counter are tiny or hidden, and many shots look alike.
2. **Missing actions.** About ten beats in the original are physical events that we skip or only
   imply (list below).
3. **Two script beats are missing**, and one is weaker than the original.

What already holds up: the half-value-layer explainer, the corrugated pipe, the blast-door shot,
the captions, the audio mix and the cast (ours is original; the original uses gnomes).

## Camera language

Measured with scene-cut detection plus 2 fps strips of both videos.

| | Original | Ours v1 |
|---|---|---|
| Hard cuts | **6** in 98 s (2.8, 44.3, 49.2, 78.2, 84.7 s) | **15** |
| Transitions | ~12 fast **whip-moves** (~0.5 s, heavy motion blur) between framings | Hard cuts |
| Angle | Front-on to the cut face, camera near lawn height, pipe seen end-on so the floor recedes into depth | 3/4 from high above, looking down at a "diorama block" |
| Subject size | Fills the frame; pushes right into the pipe mouth (36–39 s, 85–93 s) | Mid-distance; people about 5 % of frame height |
| Moves inside a hold | Slow push-ins; **tilts up** to the sky for the bomb flash (2–4.5 s) and the cloud (13–15.5 s), then back down | Slow drift |
| Tracking | Follows the climber down the ladder (70–72 s) | None |
| Close-ups | Valve pipe (48–52.5), door at ground level (55–64), hatch from the lawn (67.5–70), Geiger on the ladder (71–74.5) | Valve only, from a distance |
| Time | Night falls for the decay beat (81–84 s) | Always day |

New camera rules for v2:
- front-on, near lawn height;
- whip transitions (8–12 frames) with EEVEE motion blur instead of cuts;
- at least half the film inside or right at the pipe mouth;
- a tilt up to the sky for the bomb and the cloud;
- close-ups for the valve, door, hatch and Geiger counter;
- a track down the ladder;
- night for the decay.

## Beat by beat

| # | Narration | Original shows | Ours shows | Gap |
|---|---|---|---|---|
| 1 | dig a hole in your yard | Dirt flies; an open pit is dug into the lawn from above | Hole already exists; Dad walks to it | **Missing dig** |
| 2 | when the bomb drops | Orange flash on the horizon behind the fence | Nothing | **Missing** |
| 3 | caves the walls in | Pit walls slump in, seen from the yard | Dad buried in the dirt cave (good gag) | OK |
| 4 | drop in a giant steel pipe | Pipe falls from the sky into the open pit | Pipe flies in sideways and slides into a hole in the cut face | Weak |
| 5 | bury it under three feet of dirt | Pit fills with dirt over the pipe | Nothing; the pipe is just there | **Missing burial** |
| 6 | explosion sucks dirt into the mushroom cloud | Huge dusty cloud with a debris column rising | Small grey puffs far away | Weak |
| 7 | rains back down radioactive / fallout | Glowing yellow specks rain and settle on the lawn | Few small dots, hard to see | Weak |
| 8 | every 3.5 in cuts radiation in half | Rays and layer lines in the dirt | Same idea, cleaner | OK |
| 9 | straight lines, right down your doorway | Rays fall down the shaft and **hit the character**, who glows | Rays fall near Dad, no reaction | Missing hit |
| 10 | bend the tunnel twice; rays hit dirt | Dog-leg tunnel built on screen; rays stop in the dirt at the kink | Zig-zag swaps in on a cut; rays fade | Weak |
| 11 | ten people … air hot and stale | Inside-the-pipe view; thick orange haze fills the tube | Crowd seen from outside; haze barely visible | **Weak** |
| 12 | air pipe, dust filter, hand-cranked fan | Close-up of the filter and fan; blue airflow clears the haze | Pipe pops in; filter and fan tiny | **Weak** |
| 13 | shockwave shoots down that pipe | White blast ball travels down the pipe | Thin yellow line | Weak |
| 14 | valve slams shut in thousandths of a second | Cutaway pipe close-up, the flap slams, a stopwatch ticks | Static valve close-up | **Missing action** |
| 15 | door like a truck → open outward → pushes tighter into frame | Big door, opens outward, blast pushes it shut | Door opens outward; "pushes tighter" line missing | Script gap |
| 16 | rubble piles up, you're trapped | Rubble lands on the door; character pushes and can't open it | Rubble lands; nobody tries the door | Missing reaction |
| 17 | second tunnel up to a hatch | Horizontal tunnel, then a ladder shaft up to a hatch that opens | Diagonal tube to a hatch | OK-ish |
| 18 | hang a counter … clicks / Geiger counter | Close-up: character on the ladder, counter with a ticking needle | Counter not readable in any shot | **Missing** |
| 19 | people think you'd stay for years — you don't | Night falls; glowing fallout fades over time | Line not in our script; daytime wide shot, nothing changes | **Script gap + missing time-lapse** |
| 20 | supplies for two weeks | Inside-the-pipe view, crates stack up | Crates hidden behind the crowd | **Missing** |
| 21 | bunk beds, canned food, crank radio, board game | Each item appears as it is named, then characters play the game | Items occluded; none readable | **Missing** |
| 22 | Congratulations | Pull back to a full section with everything inside | Same idea | OK |

## Fix plan (priority order)
1. **Inside-the-pipe camera** (`tube_axis` shot: camera at the open front of the tube looking
   along +Y). Use it for beats 11, 12, 20 and 21. Move the crowd to the sides when items are named, so
   crates, beds, cans, radio and board game each pop in readable on their word.
2. **Cutaway close-ups** for 12 (filter and fan with blue airflow arrows), 13–14 (blast ball down
   the pipe, flap slams, stopwatch) and 18 (Geiger counter at the ladder with a ticking needle).
3. **Missing actions:**
   - dig (dirt clods fly, the pit grows);
   - bomb flash on the horizon;
   - pipe falls from the sky into the open pit, then the pit fills;
   - bigger explosion with a rising dirt column and glowing fallout that settles;
   - rays hit Dad, who glows and cowers;
   - bend built on camera, with rays splashing into the dirt at the kink;
   - character pushes the rubble-blocked door;
   - night time-lapse for decay.
4. **Script (v2 voice):** add "the blast only slams it tighter into its frame" and "you'd think
   you'd be stuck down there for years. You're not." in our own words, and make "three feet stops
   almost all of it" concrete ("ninety-nine point nine percent"). Re-voice, bump `_v2`, re-key.
5. Then re-render and redo this comparison.
