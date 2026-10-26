# Nuclear Bunker short — handoff

Original recovery: OpenCode session `ses_e8d5ac1bcffeoYzx97tvMbpyHI` (2026-10-24).
Second pass: Claude Code session, 2026-10-26.

## Goal
An **original** ~92 s 1080×1920@30 explainer, "how a hole in your yard becomes a nuclear bunker".
Style reference: the YouTube Short https://www.youtube.com/shorts/33dT0bfPwDE. Use it for the look
(3/4 cutaway diorama, moving camera, corrugated pipe, big one-word captions), not for the script.
Narration is our own wording (`scripts/nuclear-bunker-audio.py`, edge-tts `en-US-AndrewMultilingualNeural`).

Decisions made with the user (2026-10-26):
- **Cast:** a modern family in the SimForge ink & vinyl chibi style (Dad = the "you" of the
  narration, Mom, Kid, Grandma, six neighbours = ten people, plus a dog). No fantasy classes.
- **Look:** hybrid. Reference camera, materials and explainer visuals; our stylised characters.

## Pipeline
1. **Scene:** `scripts/blender_nuclear_bunker.py` (reuses `scripts/blender_simforge_cw.py`).
   It now runs **headless**, so no Blender MCP is needed:
   ```bash
   "/d/SteamLibrary/steamapps/common/Blender/blender.exe" -b --factory-startup --python scripts/blender_nuclear_bunker.py
   ```
   Saves `out/nuclear_bunker.blend` (~2 s). Every key comes from `src/shelter/nuclear-bunker/data/narrationCues.json`.
2. **Frames:** `blender -b out/nuclear_bunker.blend -a` → `out/nb_frames/f_0000.png …` (frames 0..2768).
3. **Encode:** `ffmpeg -framerate 30 -start_number 0 -i out/nb_frames/f_%04d.png -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p public/shelter/nuclear-bunker/scene_v1.mp4`
4. **Audio:** `python scripts/nuclear-bunker-audio.py narration|sfx|score|all`. Only the first
   argument is read, so `sfx score` builds the SFX only. Everything is built: narration_v1,
   score_v1 (−27 LUFS) and 51 SFX.
5. **Remotion:** composition `NuclearBunker` (`src/shelter/nuclear-bunker/`). The engine has a new
   `FootageVideo`/`defineFootage` (`src/engine/FootageVideo.tsx`): the pre-rendered mp4 plus
   narration, score, SFX, word captions (`subtitles.mode: "word"`), HUD and fades.
   `npm run render:nuclear-bunker`, then `npm run check:video -- nuclear-bunker`.

Still-review helpers used this session (they live in the scratchpad, so recreate them as needed):
render chosen frames with `bpy.ops.render.render(write_still=True)` after `scene.frame_set(f)`,
and tile a beat sheet into `out/nb_check_sheet.png`. A 40–50 % preview shows black speckles in
dark areas; full resolution is clean.

## Done in pass 2
- Headless build fixes: a context-collection fallback in `blender_simforge_cw.py`; the camera is
  relinked after `clean_scene()`.
- **Cast:** `build_civilian()` reuses the rogue body, strips its gear and adds per-person skin,
  clothes and hair (short/bob/bun/pony/cap). `build_dog()` builds the dog. Dad climbs in, the dirt
  cave buries him to the neck with a shovel planted beside him, and he reappears inside the steel
  pipe. The rest enter on "ten people", and everyone cheers at the end.
- **Camera:** rewritten as 3/4 elevated moving shots (`moves` list in `animate()`): each shot eases
  A→B, and shots meet in hard cuts. Close-ups cover the cave, valve, door, hatch and Geiger counter.
  The soil block is now 44 wide and 40 deep, so wide portrait frames never see its edges.
- **Materials:** `mat_corrugated` (ribbed steel along each pipe's local axis) on the shell, shafts,
  second tunnel and dropped pipe; `mat_lawn` (mown stripes); `mat_strata` (layered soil face); the
  dropped pipe is now hollow and ribbed.
- **Explainer:** l3a shows half-value layers: dashed lines appear, eight rays fall and half stop at
  each line (8→4→2→1→0). The doorway rays now start on l3b.
- **Bug fixes:** `make_sphere`/`make_box` bake both `center` **and** `scale` into the mesh:
  - the mound, dust, haze and sparks were permanently tiny, and the cloud was never visible;
  - the shockwave beam and the cloud were mispositioned;
  - `recenter_origins()` now moves every loose mesh's origin to its own bounds, so pop-ins grow in
    place instead of flying in from the world origin.

  Also fixed: the zig-zag shaft joints, rubble at double position, lawn/soil z-fighting, the plug
  and rim rocks giving the hole away before the dig, the shockwave overshooting into the floor, and
  the exposure of the white shed and steel.

## Next steps
1. Check the full render (`out/nb_frames`, `scene_v1.mp4`) frame-by-frame on a contact sheet.
2. `npm run review -- NuclearBunker --beats --around`. Check the caption position (`wordTop: 700`)
   against each shot, and that the title card does not collide with the first words.
3. `npm run render:nuclear-bunker`, then `npm run check:video -- nuclear-bunker` (−14 LUFS).
4. Polish candidates:
   - characters have no mouths (the rig has eyes only);
   - the mushroom cloud is small in the blast shot;
   - the end shot could be tighter;
   - the explosion could get a flash.

## Gotchas
- `make_box`/`make_sphere`/`make_cylinder` bake `center`, `scale` and `rot` into the mesh. Build at
  the origin, then set `location`/`scale`. Never pass `scale=(0.001, …)` to hide something; key
  `obj.scale` instead. `recenter_origins()` only fixes objects built before `animate()`.
- Before an object's first key, Blender holds that key's value. Always add an early key (frame 0)
  for anything that should start hidden.
- Two faces at the same height z-fight; keep the grass 1 cm proud.
- Camera: `sensor_fit=HORIZONTAL`, `sensor_width=36`. In portrait the vertical FOV is huge (≈93° at
  30 mm), so wide shots look steeply down.
- Nothing committed to git yet.
