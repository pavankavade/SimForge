---
name: youtube-thumbnails
description: Design, build and check YouTube thumbnails (and the title that goes with them) for SimForge episodes. Use whenever asked for thumbnails, thumbnail options, a title or upload metadata for any episode (what-if, dungeon, shelter, campaign).
---

# YouTube thumbnails for SimForge

These rules come from a study of the what-if / science-explainer niche on YouTube in Oct 2026. It covered the top 74 results for eight searches ("what if you could teleport", "what if the earth stopped spinning", "what if you could fly", "what if you fell through the earth", "what if gravity", …), ranked by views. The rules say what separated the 10M+ thumbnails from the ones stuck at 20–100K. Follow them, then prove the result with the check sheet (§5).

## 1. What the winners do

| Channel (views) | Pattern |
| --- | --- |
| Kurzgesagt (15–29M) | 2–3 HUGE words ("NUKE A CITY", "NO MORE SUN", "DEATH BY BANANA"), one glowing subject on a dark or saturated field, often a red arrow or circle on the key detail ("NOT THIS..." + arrow at the crash). |
| What If (2–14M) | One cinematic hero image (an astronaut's terrified face, a man falling past the camera) plus a 3–4 word white caps phrase bottom-left beside the "IF" logo. The same layout on every video. |
| IFOLOGY (200–400K in under 2 weeks, new channel) | One character, large, with one strong pose on a clean flat background. 1–3 words that give the **twist, not the title**: "What if you could fly?" → "NO WINGS.", gravity → "UP IS DOWN.", teleport → no text, just the pixel-trail pose. |
| Peekaboo / AumSum (1–6M, kids) | The title repeated in bubbly text, cartoon faces with extreme expressions, maximum saturation. Kids browse differently: do not copy the repeated title. |

**Common to every winner:**

1. **One idea, one focal subject**, filling 40–60% of the frame. A face, a planet, a body mid-fall. Never a wide establishing shot.
2. **Huge text or none.** 1–3 words, at most 4. Cap height at least 15% of the frame height. Heavy sans caps (Arial Black weight) with a thick dark outline or drop. The text adds what the title doesn't say: the stakes, the twist, the number.
3. **An emotional face, big.** At least 25% of the frame height, with an extreme expression (shock, scared, joy). It must still read at 168 px wide.
4. **Saturated colour with a hard contrast split.** Bright subject on dark, or dark subject on bright. One dominant hue plus one complementary accent.
5. **One pointer** (red arrow or circle) when the key detail is small.
6. **A single big number** when the number is the hook ("28,000 KPH", "×12", "6,371 km").
7. **A series system.** The same layout, logo slot, palette and cast every episode, so a returning viewer spots the channel in the feed.

## 2. What the losers do (20–100K and below)

- **Copying a hit style without its brand.** A dozen IFOLOGY stick-figure clones ("SEE YA.", "POP.", "SWAP!") sit at 3–33K. A clone looks like the original, so the original gets the click.
- **Thin, small or serif "cinematic" text** ("FOREVER", "6,371 km" in a light serif), and text placed low in the frame. These sit at 50–100K.
- **Busy collage.** Several characters, several props, AI-art clutter, text in two places. 10–15K.
- **The title repeated word for word**, which wastes the frame.
- **Detail in the bottom-right corner**, which the duration badge covers.

## 3. Rules for SimForge thumbnails

Our biggest asset is the cast: chunky toy characters with big heads and expressive 2D-on-3D faces. Lead with them.

- **Frame:** 1280×720, PNG or JPG, **under 2 MB** (YouTube's upload limit). Export JPG at quality 90 if a PNG is bigger.
- **Composition:** text on the left ~45%, hero on the right ~55% (or the reverse). Keep the bottom-right 22% × 18% (duration badge) and the top-right corner (hover icons) free of anything important. Keep everything inside the middle 90%.
- **Hero:** one or two characters, close. The face takes at least 25% of the frame height. Use a longer lens (`fov` 24–30) and shoot from slightly below for presence. Give each character an extreme `expression` (`shock`, `scared`, `yell`, `happy`). No wide sets.
- **Background:** simple and supporting. Plain sky, a single colour field, or the set pushed out of focus. Keep it darker or lighter than the hero so the silhouette pops. Add the rim light / bloom from the episode postfx.
- **Text:** one element only, 1–3 words, ≤ 12 characters per line. Font size ≥ 150 px at 1280 wide; make the key word yellow or tangerine and the rest white. Use a thick `#18213a` stroke plus a drop. **No pill / sub-caption at 168 px:** a fact box is fine only if its text is at least 64 px tall. Otherwise drop it.
- **Pair it with the title:** the title asks the question ("What If You Could Teleport… But Kept Your Momentum?"). The thumbnail shows the consequence ("27 MPH", "WRONG SPEED", a face full of hay). Never repeat the title.
- **Series system:**
  - **What-if:** Kit (orange jacket) and Grandpa Teo are the recurring faces. Palette is tangerine `#f27a2e`, gold `#ffd84d`, navy `#18213a`, teal `#33c2bd`. Text sits top-left, rotated −3°.
  - **Dungeon/Evolution:** the trap and its victim.
  - **Shelter:** the shelter and its threat.
- **Three distinct concepts per episode** (feed YouTube Studio's *Test & Compare*, which A/B-tests up to three thumbnails):
  1. **Reaction:** the hero's face at the moment of consequence, plus 1–2 words.
  2. **Stakes/number:** the big number or result, plus the hero mid-action.
  3. **Curiosity:** the diagram or the impossible image (a globe with an arrow, a cross-section), plus one pointer and 1–2 words.

  Each option must work on its own. Don't make three crops of the same shot.

## 4. Building one in this repo

- Each episode gets `src/<series>/<slug>/Thumbnail.tsx`, exporting `<Slug>Thumbnail` with a `variant` prop. Pattern: `src/whatif/teleport/Thumbnail.tsx` and `src/whatif/slow-flight/Thumbnail.tsx`. It renders `<EpisodeVideo>` with a 2-frame config: a fixed camera (two identical waypoints), the episode's sets and props posed by hand, and an HTML `OverlayComponent` for the text.
- Pose characters with `AdventurerUnit` / `Tilted` directly (a still needs no easing). Reuse the episode's props and geometry constants so the thumbnail matches the video.
- Register it in `src/Root.tsx` (`durationInFrames={2}`, 1280×720, `defaultProps={{ variant: 0 }}`).
- Render each variant (thumbnails always bundle the full studio):
  ```pwsh
  node scripts/solo.mjs still <Slug>Thumbnail out/<series>/<slug>/thumbnails/<slug>-thumb-1.png --props='{"variant":0}' --frame=0
  ```
  Delete the old PNG first: the still command skips files that already exist.
- **Before/after split** (a strong concept when the joke is cause → consequence): render two variants with the subject in the middle 640 px of each, then `node scripts/thumb-split.mjs <left.png> <right.png> <out.png>`. Put the text in the right-hand variant at `left ≥ 345` so it survives the crop.
- **Lessons from Teleport:**
  - A rider on a carrier's back hides behind the carrier's head from the front. For a face close-up, use one character.
  - `fall` crosses the arms over the chin. Use `cheer` + `shock` for "flailing".
  - `yell` reads as angry on Kit, so use `shock` or `scared` for fear.
  - Speed lines in front of a face cut across the eyes. Keep them behind the subject.
- Write the upload metadata to `out/<series>/<slug>/thumbnails/<slug>-metadata.md`, in the same format as `out/dungeon/dungeon-trap/thumbnails/dungeon-trap-metadata.md` and `out/whatif/teleport/thumbnails/teleport-metadata.md`. It holds title options, a description (hook paragraph, the key facts as emoji bullets, a comment question, chapters from `narrationCues.json` line starts, hashtags) and one line per thumbnail.

## 5. Check (required)

```pwsh
node scripts/thumb-sheet.mjs out/<series>/<slug>/thumbnails/<slug>-thumb-1.png out/<series>/<slug>/thumbnails/<slug>-thumb-2.png out/<series>/<slug>/thumbnails/<slug>-thumb-3.png
```

It writes `<slug>-thumb-sheet.png` next to the first thumbnail, with each thumbnail at 640 px, 360 px (home feed), 168 px (search/sidebar) and in greyscale, on YouTube's dark background. Look at it and confirm every point:

- [ ] At **168 px** the text reads, the face reads, and you can say what the video is about in one glance.
- [ ] In **greyscale** the hero separates from the background (if it doesn't, change the value contrast, not just the hue).
- [ ] One focal subject; nothing important in the bottom-right badge area.
- [ ] The text is ≤ 3 words, does not repeat the title, and adds stakes or a twist.
- [ ] The three options are three different ideas.
- [ ] Each file is under 2 MB.
- [ ] Characters are on-model (no clipping, floating feet or hidden faces) and match the episode.
