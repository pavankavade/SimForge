# Slow Flight — episode plan (draft)

**Working title:** *What If You Could Fly… But Only at Walking Speed?*
**Format reference (structure + look only):** "What If You Could Teleport?" — One Small If
(https://www.youtube.com/watch?v=6YYKFxKPmxo). We match its *style family* and quest structure.
Characters, story, HUD design, palette accents and every asset are our own.

## 1. The premise

You can fly. Anywhere, any height. But only at **3 mph through the air**, the speed of a walk.

The rules (they create every puzzle in the episode):

1. **Airspeed is fixed at 3 mph.** Ground speed = 3 mph **+ the wind**. A tailwind is a free ride,
   a headwind is a treadmill.
2. **You carry only what you could carry on foot.** One passenger on your back, and you get tired
   like you would hiking.
3. **The sky is still the sky:** about 3.5 °F colder per 1,000 ft, thinner air, and real weather.

## 2. The cast (original)

All three use the silhouette look (§4): a matte black sphere head with a warm rim, and white
decal faces. Each character is identified by **clothes and props**, never by skin colour.

| Character | Who | Silhouette hooks |
| --- | --- | --- |
| **You — "Kit"** (13) | Second-person protagonist; just found out they can fly. | Tangerine windbreaker with a reflective stripe, teal beanie, old aviator goggles pushed up on the head, white high-tops. |
| **Grandpa Teo** (71) | Retired crop-duster pilot who lost his licence; reads wind like a book. Grumpy, secretly thrilled. | Navy-and-cream flight jacket with a round wing patch, flat cap, white handlebar-moustache decal, round amber glasses, a cane he uses as a pointer, a dented thermos. |
| **Tess** (8) | Your little sister. It's her first solo at the school recital. | A sunflower costume with a petal collar; carries a tiny violin case. |
| Extras | A bus driver, a paraglider pilot, a red-tailed hawk (a "rival" in the thermal), cows, a crowd at the school hall. | — |

## 3. Story (about 6 min long-form; a short cut is in §7)

**Deadline:** Tess's recital starts at **7:00 pm**. Grandpa is her piano accompanist, so she can't
go on without him. Their bus breaks down in the foothills, **38 miles** and a mountain ridge from
town, at 3:10 pm.

**Clock:** 3 h 50 min. At 3 mph that takes about 12.7 h, so walking speed loses. The whole episode
is about finding extra speed in the wind.

| # | Beat | What happens | The real fact it teaches |
| --- | --- | --- | --- |
| 0 | **Cold open** | Kit floats up past a kitchen window; a cat walks along the sill faster than Kit flies. | Hook: flight at walking pace. |
| 1 | **The rules** | Practice in the yard: a jogging neighbour overtakes Kit. Then a gust carries Kit across the street in two seconds. | Ground speed = airspeed + wind. |
| 2 | **The problem** | The bus dies on a dusty road. Tess texts a photo of her costume. Grandpa looks at the ridge and does the maths: 12 hours. | Distance ÷ speed. |
| 3 | **Windsock lesson** | Grandpa teaches Kit to read a farm windsock: three stripes full means about 15 knots. Kit piggybacks him up into the tailwind and the HUD jumps from 3 to 18 mph. | How windsocks measure wind. |
| 4 | **Patchwork plains** | They cruise over farmland. Fun gags: a crop-duster passes and Grandpa salutes it; a cow stares. | Wind blows smoother higher up, away from friction with the ground. |
| 5 | **Headwind wall** | The valley bends and the wind turns against them. The HUD drops to 0 mph and they hover in place, "flying" while standing still. | A headwind cancels airspeed. |
| 6 | **Thermal** | A hawk is circling without flapping. Grandpa: "Follow the bird." They spiral up a column of rising warm air off a sunlit field, from 2,000 to 9,000 ft. | Thermals: warm air rises off sun-heated ground. |
| 7 | **Too high** | Frost on the goggles, Grandpa's thermos tea steaming, a jet far above. | Cold and thin air at altitude; the jet stream is fast but deadly cold. |
| 8 | **Ridge lift** | A paraglider pilot rides the wind along the ridge, and they join her. Wind hitting the mountain is forced upward, a free elevator along the crest. | Ridge (orographic) lift. |
| 9 | **The stall** | Clouds build up and the wind dies in the afternoon lull. 41 minutes left and 9 miles to go, which is three hours at 3 mph. Kit is exhausted. Grandpa tells a quiet story about his last flight. | — |
| 10 | **Sunset flip** | The sun touches the ridge. Grandpa licks a finger: "Wait for it." The mountain wind **reverses** and pours downhill toward town, a huge free tailwind. | Valley winds blow uphill by day and downhill after sunset (katabatic flow). |
| 11 | **Final run** | They race down the valley at 25 mph over rooftops. The HUD clock reads 6:58. They land on the school roof and come in through the skylight. | — |
| 12 | **Payoff** | Grandpa slides onto the piano bench as the curtain opens. Tess sees him and grins. Kit watches from the rafters, hovering, too tired to land. | — |
| 13 | **Sequel hook** | Outside after the show, the weather vane on the roof spins. On the news: "jet stream at 180 mph over the Atlantic." Kit looks east. "No." Then a call to comment and subscribe. | — |

Each fact gets a **callout tag** in the world (see §5) when it's spoken. Before the script is
locked, we check every number (stripe speeds, lapse rate, thermal heights, jet stream speeds) with
a web search.

## 4. Art style (final)

The target is a **clean toon-3D diorama with rim-lit silhouette people**: the same style family as
the reference, rendered with our R3F pipeline.

### Characters

- **Proportions:** about 4.5 heads tall (taller than our chibi fantasy cast), with thin straight
  legs, a simple capsule torso under the clothes, and mitten-like black gloved hands.
- **Head:** a perfect sphere in matte near-black (`#16161a`, roughness 0.9, almost no specular).
- **Rim:** a constant-width warm-cream outline (`#f4e3c3`) around the head, hands and dark legs.
  This is our existing inverted-hull ink with a new colour, plus a slightly brighter fresnel on the
  head so it glows against both bright sky and dark interiors.
- **Face:** flat white decals only: dot or arc eyes, bar eyebrows, a line mouth. Glasses,
  moustaches and goggles are coloured decals or small props. There are no noses or ears.
- **Clothes:** saturated, simple colours with toon-soft shading and one or two fold lines. Clothes
  carry each character's identity (see the table in §2).

### World

- **Shapes:** low-poly but smooth-shaded, with rounded edges. Nothing is realistic, but everything
  has real scale.
- **Palette:** sunny pastels by day (butter yellow, sage, sky blue, terracotta), shifting to an
  amber and violet golden hour for the finale.
- **Sky:** a gradient dome, puffy cloud blobs (instanced spheres) and atmospheric haze with
  distance.
- **Ground:** a patchwork farmland quilt (instanced tiles in three or four crop colours), low-poly
  ridges, roads with dashed lines, windsocks, silos.
- **Light:** one warm sun with soft shadows, ambient occlusion, gentle bloom on the sun and
  windows, and depth of field on close-ups (we already have `src/engine/PostFX.tsx` and
  `postprocessing`).
- **Wind visual:** thin white streaks drift past in the wind direction, and their speed scales with
  the HUD's wind number. Thermals show as a faint shimmering column; the hawk circling inside it
  sells the idea.

### Camera

- 3D cinematic with slow push-ins on dialogue.
- Low-angle wides when they take off.
- Top-down "map" shots over the patchwork.
- Over-the-shoulder shots looking down from altitude.

### Graphics (our own designs)

- **Flight card HUD** (top-left): `RECITAL IN 1:42:10`, a ground-speed readout split as
  `3 + 15 = 18 MPH`, a wind arrow and a route strip (bus → ridge → school). It is a rounded navy
  card with tangerine accents, unlike the reference's layout.
- **Callout tags:** pill-shaped world labels with an icon (`THERMAL +1,200 FT/MIN`,
  `RIDGE LIFT`, `WIND FLIP`).
- **Paper map insert:** a folding road map with a pencil route, instead of a globe.
- **Phone inserts:** Tess's texts and photo.

## 5. Production plan (SimForge pipeline)

1. **Series scaffold:** `src/whatif/slow-flight/` with its own `registry.ts` (like `src/shelter`)
   and the composition `SlowFlight`. Use the standard files (`timeline.ts`, `Scene.tsx`,
   `config.ts`, `data/`) and `scripts/slow-flight-audio.py`.
2. **Silhouette look in the hero rig** (one shared kit, no fork):
   - `inkMaterial(width, color)` gets a colour argument (the cache key includes the colour);
   - a `silhouette` option on `civilian()` adds the black head material, cream rim ink and a
     white-decal face set in `Face.tsx`;
   - a leg-length/proportion parameter on the kit (it scales the existing joints; the rig is not
     forked);
   - new kits `kit`, `grandpaTeo`, `tess`;
   - then `npm run lab` to check turnarounds, faces, the piggyback pose and the flying pose.
3. **New poses:** `fly` (horizontal glide, arms forward), `piggyback` (carrier and rider pair),
   `hover` (upright treading the air), `flyTired`. Add each to `POSES` and `solvePose`.
4. **New sets and props** in `src/artifacts/sky/`: `SkyDome`, `CloudField`, `PatchworkFarmland`,
   `Ridge`, `Windsock` (inflates with wind), `ThermalColumn`, `Hawk`, `Paraglider`, `SchoolHall`,
   `BrokenBus`.
5. **Kit additions** (reusable): `windStreaks(dir, speed)` in `fx`; a `FlightCard` HUD component;
   a `CalloutTag` component.
6. **Audio:**
   - `LINES` gain a `speaker` field: narrator (second person), Kit, Grandpa, Tess, and extras;
   - per-speaker Gemini TTS voices, with word timestamps as now;
   - a light acoustic, road-trip score;
   - wind-bed SFX whose volume follows the wind speed, plus whooshes, a windsock flap and hawk cries.
7. **Build order:** one beat at a time. Script → voice → `BEATS` → scene → camera → HUD → SFX →
   `npm run review --beats --around`.

## 6. Open decisions

- **Format:** 16:9 long-form (about 6 min, matching the reference) or the series' vertical
  1080×1920. The kit's camera and HUD zones (`AGENTS.md` §8) assume vertical, so 16:9 needs a
  second set of safe zones.
- **Names and setting:** Kit, Teo and Tess, set in a generic American high-plains county with a
  fictional town, so no real-place facts have to be exact. Or use a real route (for example Kansas
  into Colorado) and check every fact.

## 7. Short cut (about 90 s vertical)

Beats 1 → 2 → 3 → 6 → 10 → 11 → 12 → 13: rules, problem, windsock, thermal, sunset flip, final
run, payoff, hook. It has about 12 lines and uses the same assets.
