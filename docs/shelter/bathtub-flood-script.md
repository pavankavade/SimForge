# How a Bathtub Becomes a Flood Shelter (script v1)

OmnixxLabs shelter short, about 65–75 s (17 lines). It follows the tornado short's formula (58K
views, see `docs/omnixxlabs.md`): it starts in *your* home, the threat is a real modern fear,
each level adds one piece of real engineering, and one myth is busted. The bathtub fails as a
hiding place and evolves, step by step, into a sealed, self-righting floating pod like the real
tsunami survival capsules. The last line gives the true safety advice (go to higher ground), so
nobody leaves thinking a bathtub is a flood shelter.

- **Slug:** `bathtub-flood`, id `BathtubFlood`, series `shelter`.
- **Title:** How a Bathtub Becomes a Flood Shelter
- **Alt titles:** How Your Bathtub Survives a Flood / How a Bathtub Becomes a Survival Pod
- **End stamp:** `FLOOD STATUS` → `UNSINKABLE`, then the comment dare.
- **Art style:** the clean low-poly look (`src/lowpoly`), like the tornado short. Cast: dad + kid.

## LINES

```python
LINES = [
    ("l1a", "When the flood warning comes, you hide in the bathtub, like you would for a tornado.", 0.30),
    ("l1b", "But the water pours in under the door, and the tub fills up with you in it.", 0.90),
    ("l2a", "You might think you should drive away. Don't. Just one foot of moving water can carry away a car.", 0.90),
    ("l2b", "So you pull the bathtub free, and ride it like a boat.", 0.30),
    ("l2c", "It floats. But the first wave tips it over.", 0.90),
    ("l3a", "So you seal it with a lid and a rubber gasket. Not a drop gets in.", 0.30),
    ("l3b", "But the next wave rolls it over, and it stays upside down.", 0.90),
    ("l4a", "So you bolt a heavy weight to the bottom. Like the keel of a boat, it flips you back up every time.", 0.30),
    ("l4b", "Then a floating log slams into it, and you bounce around inside like a pinball.", 0.90),
    ("l4c", "So you add padded seats with seat belts.", 0.30),
    ("l5a", "Now it is sealed so tight that the air inside starts running out.", 0.90),
    ("l5b", "So you add air vents on top, with valves that let air in but keep the water out.", 0.30),
    ("l5c", "And you paint it bright yellow, so a rescue helicopter can spot you.", 0.90),
    ("l6a", "Real tsunami survival pods are built just like this.", 0.30),
    ("l6b", "But the best flood shelter is still higher ground. When they tell you to evacuate, go.", 1.00),
    ("end", "Congratulations. You have built a flood shelter.", 0.35),
    ("cta", "Unless you can prove us wrong in the comments.", 1.60),
]
```

Beat words (each appears once in its line, or is keyed with `nth`): `bathtub`, `tornado`, `pours`,
`fills`, `drive`, `don't`, `car`, `free`, `boat`, `floats`, `tips`, `lid`, `gasket`, `drop`,
`rolls`, `upside`, `weight`, `keel`, `flips`, `log`, `slams`, `pinball`, `seats`, `belts`,
`air`, `vents`, `valves`, `yellow`, `helicopter`, `pods`, `higher`, `evacuate`, `go`,
`Congratulations`, `unless`, `prove`.

## Shots (one low-poly flooded neighbourhood, side-on camera)

| Line | Picture |
| --- | --- |
| l1a | A cutaway house in the rain. Dad and the kid hurry into the bathroom and crouch in the tub. |
| l1b | Brown water slides in under the door, the room fills, and the tub fills with them in it. Heads just above the water, shock faces. |
| l2a | Outside: the car in the flooded driveway. Dad on the porch with the keys. A big red ✕ on "Don't", and the car lifts off and drifts away. |
| l2b | The tub pops out of the house and floats on the open flood with Dad and the kid sitting in it. |
| l2c | A wave rolls in, the tub flips, they splash in and pop up clinging to the upturned tub. |
| l3a | A lid drops onto the tub with an overshoot; a black gasket ring. A wave splashes over: nothing gets in. |
| l3b | Another wave rolls the pod over. It stays upside down. Inside (cutaway set): the two hang upside down. |
| l4a | A dark iron keel bolts on underneath (sparks). A wave rolls it; it swings back upright, twice. |
| l4b | A log slams into the side. Inside: the two bounce off the walls. |
| l4c | Padded seats slide in; yellow belts snap across. The next bump: they stay put, smug. |
| l5a | Inside: the air gauge drops into the red, the air hazes, gasping faces. |
| l5b | Two vents pop up on top. A wave washes over: the ball valves bob shut, then open; air puffs in. Relief. |
| l5c | The pod paints yellow in a sweep; a beacon blinks. A helicopter flies over and its searchlight finds the pod. |
| l6a | Wide: the yellow pod bobbing in the flooded street, calm. |
| l6b | Dad and the kid walk up a hill road out of the water, to the people waiting at the top. |
| end / cta | Pull back: the hill and the pod below. Stamp, then the dare. |

## Facts (checked before voicing)

- NWS "Turn Around, Don't Drown": **12 inches (one foot) of moving water can carry away most cars**;
  six inches can knock an adult down. Most flood deaths happen in vehicles.
- A bathtub is tornado advice (NWS: interior room, lowest floor), not flood advice: on the ground
  floor the room floods. Played as the first failure.
- Real tsunami / flood survival capsules (for example the US "Survival Capsule" and the Japanese
  "Noah" pod) are sealed, weighted low so they self-right, have harnessed or padded seats, air
  vents near the top, and bright colours so rescuers can find them. "Built just like this" is a
  fair summary, not a claim that a bathtub would work.
- A low weight (keel/ballast) below the centre of buoyancy is what makes a hull self-right.
- Official advice (FEMA / Ready.gov, NWS): **evacuate when told to, and get to higher ground**.
  That is the last story line so the short ends on the true advice.
