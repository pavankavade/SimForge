# Teleport: episode plan

**Title:** *What If You Could Teleport… But Kept Your Momentum?*
**Format:** 16:9 long-form for the "What if" series (The If Kit), about 4.5 minutes. Same cast and look as
Slow Flight: Kit (13), Grandpa Teo (ex-crop-duster pilot), and Tess (now nine).

## The rule

You can teleport anywhere on Earth instantly, but you **keep your momentum**. You arrive moving exactly as you
were moving when you left.

## The physics (every number checked)

- The ground moves eastward at 1,037 mph × cos(latitude) because Earth spins once a day:
  - 1,037 mph at the equator;
  - about 779 mph on the Connecticut shore (41.3° N);
  - 0 mph at the poles.
- Earth also orbits the Sun at about 67,000 mph (mean 66,600 mph). Every place on Earth shares that
  motion, so it cancels between any two places.
- **Landing speed** is the difference between the ground velocity where you leave and where you land.
  - Because the ground's motion is a rigid rotation, that difference is |ω × chord|, where ω is one turn
    per sidereal day (0.2625 rad/h).
  - So you land at most about **a quarter mph per mile jumped**, measured in a straight line.
- Hops due north along a meridian land at the difference of the two ground speeds:
  - 10 miles north at 41° N lands at 1.7 mph;
  - 42.3° N to 44.47° N (150 miles) lands at 1,037 × (cos 42.3° − cos 44.47°), about 27 mph.
- A jump straight to the pole lands at the full local ground speed, 779 mph.
- **A chord parallel to the axis lands at 0 mph.** That chord joins the same longitude and latitude, mirrored
  south of the equator. The story uses:
  - 44.47° N 72.4° W (a Vermont hayfield near Hardwick) to 44.42° S 72.4° W (Queulat, Patagonia);
  - chord length 2R sin φ ≈ 5,550 miles.
- July is winter in the southern hemisphere, so there is snow at Queulat (its hanging glacier is
  permanent).
- Swing: a 2 m chain at a 1.2 rad amplitude passes the bottom at about 5.4 m/s, which is 12 mph.

The script avoids time-zone claims: the Aysén region has stayed on UTC−3 all year since 2025. It says
only that the sun sits in the same part of the sky, lower and colder.

## Story beats (lines in `scripts/teleport-audio.py`)

| Lines | Beat |
| --- | --- |
| a1–a4 | Kit blinks around the yard, then teleports off a swing at 12 mph and runs straight into Grandpa's hedge. |
| b1–b7 | The spinning ground (globe), the orbit that cancels, and the quarter-mph-per-mile rule. |
| c1–c6 | Tess's ninth birthday in July: her wish is a real snowball. Candles at 4:00; it's 3:20. Kit's North Pole plan would land at 780 mph. |
| d1–d6 | Ten-mile hops, piggyback with Grandpa and his map: a cornfield, a cow pasture, a fishing dock. 340 hops each way won't make it. |
| e1–e3 | One 150-mile hop: a Vermont hayfield at 27 mph, through the bales. |
| f1–f5 | Grandpa's keychain globe: the axis, the parallel chord, and July being winter in the south. |
| g1–g5 | Through the Earth at a landing speed of 0. Snow in Patagonia under the hanging glacier, and the biggest snowball. |
| h1–h4 | The free jump back, then 22 hops home in 11 minutes while the snowball drips. |
| k1–k3 | The candles, the snowball (smaller now), and a snowball in Kit's face. |
| m1–end | Night: the globe stops on the equator. Equator to pole would land at 1,037 mph: not a crash, a launch. |

## Sources

- Earth's rotation speed: [WorldAtlas](https://www.worldatlas.com/articles/how-fast-does-the-earth-spin.html),
  [Physics Forums](https://www.physicsforums.com/threads/how-fast-does-earth-spin-at-different-latitudes.985268/)
- Orbital speed: [Wikipedia: Earth's orbit](https://en.wikipedia.org/wiki/Earth%27s_orbit),
  [Space.com](https://space.com/33527-how-fast-is-earth-moving.html)
- Queulat: [Wikipedia: Queulat National Park](https://en.wikipedia.org/wiki/Queulat_National_Park)
- Osorno, the mirror of the Connecticut shore: [Wikipedia](https://en.wikipedia.org/wiki/Osorno_(volcano))
- Chile time zones: [Wikipedia: Time in Chile](https://en.wikipedia.org/wiki/Time_in_Chile)
