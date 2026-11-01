# What if a Bag of Holding were real? (draft script v1)

Parked idea for the main SimForge (dungeon / D&D-themed) channel, not the IF Kit channel. Built on the dungeon cast and sets. Long-form like Teleport: one goal, one physics
catch, escalating failures, a clever physics fix, a payoff and a hook. 36 lines, about 3 minutes.

**The catch:** the magic folds space, not mass. Everything inside still weighs what it weighed outside.

**Cast (Season 2):** rogue (he, show-off, owns the bag), barbarian (strong and dumb; no pronouns
in the script until decided), mage (he), paladin (he), bard (she, the clever one).

## LINES

| id | line | pause |
| --- | --- | --- |
| a1 | What if a Bag of Holding were real? A little sack that is bigger on the inside. Big enough for a whole treasure room. | 0.4 |
| a2 | There is just one catch. The magic folds space. It does not fold mass. | 0.4 |
| a3 | Everything you put in still weighs exactly what it weighed outside. | 0.3 |
| a4 | The rogue sweeps the entire treasure pile into the bag, with a flourish. | 0.2 |
| a5 | He ties it shut, swings it onto his shoulder, and folds like a lawn chair. | 1.0 |
| b1 | Gold is heavy. Almost twice as heavy as lead. | 0.3 |
| b2 | A block of gold one foot on each side weighs as much as a horse. | 0.3 |
| b3 | That pile was about forty of those blocks. He just put forty horses in a sack. Over twenty tons. | 0.4 |
| b4 | The strongest human who ever lived could lift about one horse. | 0.3 |
| b5 | The barbarian is very strong, and very confident. | 0.2 |
| b6 | The barbarian grabs the strap and heaves. The bag does not move. The strap snaps. | 1.0 |
| c1 | Then the floor starts to crack. | 0.3 |
| c2 | All twenty tons rest on the bottom of the bag. A patch about the size of a dinner plate. | 0.3 |
| c3 | That is forty horses standing on one plate. | 0.4 |
| c4 | And this is floor two. Every dungeon floor is also somebody's ceiling. | 0.3 |
| c5 | The bag punches straight through, and takes the rogue with it. He would not let go. | 1.0 |
| d1 | Floor one. The mage has a plan. Levitation. | 0.3 |
| d2 | The spell cancels weight. The bag lifts off the rubble, light as a feather. | 0.3 |
| d3 | Weight is gone. But mass is not. | 0.3 |
| d4 | Mass is how hard something is to get moving, and how hard it is to stop. | 0.4 |
| d5 | The rogue gives it a mighty shove. It creeps forward at half an inch a second. | 0.4 |
| d6 | So the whole party pushes, for half a minute, until it drifts along at walking pace. | 0.3 |
| d7 | Twenty tons at walking pace is as hard to stop as a car at forty miles an hour. | 0.3 |
| d8 | And the corridor turns left. | 0.3 |
| d9 | The paladin steps in front of it and raises his shield. | 0.2 |
| d10 | It shoves him backward, boots squealing, for seventy feet, and pins him gently to the far wall. | 1.0 |
| e1 | The bard has been watching from the stairs. She grew up in a harbour town. | 0.3 |
| e2 | Sailors stop ships with a rope and a post. | 0.3 |
| e3 | Wrap a rope around a post, and the friction does not just add up with every turn. It multiplies. | 0.4 |
| e4 | Three turns around a stone pillar, and one hand can hold back forty horses. | 0.4 |
| e5 | And a rope around a pillar does not just stop the bag. It swings it round the corner. | 0.4 |
| e6 | So the party sails twenty tons of gold out of the dungeon. Push gently. Loop a pillar. Let it swing. Ease it to a stop. | 0.9 |
| f1 | Back at the Guild Hall, the bard ties it off at the bar. Not a scratch on anyone. Mostly. | 0.4 |
| f2 | The rogue opens the bag to show off. The mage checks the time. | 0.3 |
| f3 | The floating spell lasts ten minutes. It has been eleven. | 0.4 |
| f4 | Twenty tons of gold land on a wooden tavern floor. | 0.3 |
| f5 | Every tavern floor is also somebody's ceiling. | 1.0 |
| g1 | One last rule. Never, ever put a Bag of Holding inside another Bag of Holding. | 0.9 |
| end | What would you carry in yours? Tell us in the comments, and subscribe for the next what if. | 1.6 |

## Numbers behind the lines

- Gold is 19.3 g/cm³, lead 11.3 (1.7x). 1 ft³ of gold = 547 kg = 1,206 lb, about one horse.
- 40 ft³ = 21.9 t = 24 short tons ("over twenty tons").
- Deadlift record: 501 kg (Hafþór Björnsson, 2020), about one horse.
- 22 t on a 25 cm (dinner plate) base: about 4.4 MPa, enough to crack a slab spanning a void.
- One 300 N shove for a second: 1.4 cm/s (half an inch a second).
- Four people at 300 N each: walking pace (1.4 m/s) in about 25 s.
- Momentum at walking pace: 22 t × 1.4 m/s matches a 1.5 t car at about 45 mph.
- The paladin braced at about 1,000 N stops it in about 21 m (70 ft).
- Capstan equation: holding force = load / e^(μθ). With μ 0.3 and three turns, the holding force is
  1/284 of the load. Stopping it in 5 m needs about 4.3 kN, and the rope hand holds about 15 N.

## Sets and props needed

- Floor-two treasure room (DioramaHall + gold pile), with a breakaway floor slab.
- A floor-one corridor that turns left, with pillars (rope wraps).
- The bag: a small sack that swallows the pile (a shrink-and-flow effect), plus a strap that snaps.
- The Guild Hall (`TavernGuildHall`) with a breakaway plank floor and a cellar of barrels.
- A rope that wraps around the pillars (a new prop).
