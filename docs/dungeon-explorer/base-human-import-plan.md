# Plan: replace the hand-coded body with an imported base human

Handoff for the playable paladin in `src/artifacts/characters/paladin/`. Written 2026-11-15.
Read all of it before touching code. Items marked **(verify)** are from memory, not checked on
this machine.

## 1. Why

The user rejected the procedural body: "hands shoulders and stuff are still awkward, they need to
look natural not like a lego character". The face was accepted ("face is fine for now").

The cause is structural, not tuning. In `human.ts` each limb is its own `Surface(theta, y)` pushed
into the torso, so shoulders and hips are overlapping tubes with no shared edge loops, and the
hands are capsule fingers wrapped round a grip. A sculpted mesh with painted weights fixes both.

## 2. Goal and what done looks like

One imported, rigged, realistic human that every class reuses, with different armour on top and
small face/build changes per character.

Done when, in the lab (`npm run explorer`, then `http://127.0.0.1:5395/?lab=paladin`):

- Bare, doublet and full-plate views show natural shoulders, elbows, hips and five-fingered hands
  through idle, walk, run, all three swings, block and jump. No tube joints, no gaps at the neck.
- Fingers close round the sword grip and the shield strap in first and third person.
- All existing behaviour still works: gait, combo, blade hits and wall clangs, cape and tabard,
  armour slot toggles, helm toggle (H), first/third person (V), `?char=<name>`.
- At least two characters differ in face and build from the same base file.
- `npm run lint` passes, the dungeon loads with no console errors, `npm --prefix web run build`
  passes.

## 3. Current state

Committed and deployed (`8e10b0c`): the armoured paladin on a procedural body.

Uncommitted in the working tree: the parametric base human (`sculpt.ts`, `spec.ts`, `head.ts`,
`facePaint.ts`, `human.ts`, plus edits to `build.ts`, `index.ts`, `materials.ts`,
`paladinLab.ts`, `DungeonApp.tsx`). Lint passed at the last check. Ask the user whether to commit
it as a checkpoint before starting; do not commit unasked.

| File | Role | Fate |
| --- | --- | --- |
| `rig.ts` | 25 logical bones, FK arrays `mq`/`mp`, two-bone IK `solveLimb`, `apply()` | Keep as the solver; add a binding to the imported skeleton (§6) |
| `animator.ts` | gait, aim-space hands, springs, swing combo, block, jump | Keep; add finger grips |
| `combat.ts`, `cloth.ts`, `sfx.ts` | blade sweep, verlet cape/tabard, audio | Keep unchanged |
| `geo.ts` | `loft`, `rigid`, `weighted`, primitives | Keep (armour, weapons) |
| `build.ts` | `Pieces`, slots, mail, plate, helm, sword, shield | Keep; refit to the new body (§8) |
| `materials.ts` | procedural PBR, env map | Keep armour materials; skin/eye/hair switch to imported textures |
| `index.ts` | `createPaladin`, slot visibility, first person | Keep API; load becomes async |
| `human.ts` | procedural torso, arms, legs, hands, feet, clothes | Body, hands, feet replaced. Clothes (doublet, hose, braies, shoes) re-cut from the imported body |
| `head.ts`, `facePaint.ts` | procedural head, eyes, shell hair, painted texture | Replaced only after the user approves the new face (§9) |
| `spec.ts` | `HumanSpec`, four characters | Reshaped: morph weights + skin/hair choices |
| `sculpt.ts` | grid and surface helpers | Keep what clothing still uses |

Rig conventions the animator depends on: character faces +Z, left is +X, every logical bone has
identity rest orientation, limbs run along −Y, feet along +Z. `REST` in `rig.ts` holds joint
positions (hips y 1.0, shoulders x ±0.215 y 1.45, elbow 1.15, wrist 0.88, hip joint ±0.095 0.94,
knee 0.5, ankle 0.085).

## 4. Asset choice

**MakeHuman via MPFB** (Blender add-on). Realistic body and head, full finger rig, sliders for
build, age and face, output licensed CC0.

Checked on 2026-11-15:

- Blender 5.3.0, Steam build, at `D:\SteamLibrary\steamapps\common\Blender\blender.exe`. It was
  open; the user confirmed it is installed. MPFB is **not** installed (5.3 has an empty
  `extensions\blender_org`).
- MPFB 2.0.18 on https://extensions.blender.org/add-ons/mpfb/ : 43.8 MB, GPL-3.0-or-later,
  "Blender 4.2 LTS and newer". Not tested on 5.3.
- The MPFB page says to install the "MakeHuman system assets" pack first (skins, eyes, teeth,
  proxies; CC0). Its page is
  https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html .
  **Size not checked.**
- Optional CC0 packs on the same site: Skins 02 (natural male skins), Eyebrows 01, Eyelashes 01,
  Bodyparts 05 (beards), Hair 01. Avoid the CC-BY packs unless credit is added.

Rejected: Quaternius Universal Base Characters (CC0 but stylised, no face morphs), Mixamo
mannequin (faceless, licence awkward in a public repo), SMPL-X. `scripts/preview-glb.mjs` from
another chat defaults to `scratch_smplx_male.obj`; SMPL-X is, as far as I know, non-commercial
research only **(verify)**. Do not ship it.

Licence handling: commit only the exported `.glb` and textures (CC0 output). Never commit MPFB
code or the downloaded zips. Add a line to `public/dungeon-explorer/CREDITS.md`.

## 5. Phase 0: permission and install

**Downloads need the user's explicit yes.** Before downloading, tell them each file name, source
and size (get the system-assets size from its page first). The user stopped the last session
while it was reading those pages, so ask rather than assume.

1. Download to a new, empty folder outside the repo sources, for example
   `D:\git\SimForge\out\tmp\mpfb\` (`out/` is git-ignored).
2. Install without touching the open Blender window **(verify flags on 5.3)**:
   `blender.exe --command extension install-file -r user_default --enable <mpfb.zip>`
3. Load the asset pack. In the UI it is MPFB tab → Apply assets → Library settings → Load pack
   from zip file, then restart Blender. Find the scripted equivalent, or ask the user to click it.
4. Smoke test headless: `blender.exe --background --python <script>` that creates one human and
   prints vertex, bone and shape-key counts. A background Blender is a separate process, so it
   does not disturb the user's open session.

If MPFB fails on 5.3, stop and tell the user. Options then: a portable Blender 4.2 LTS (another
download to approve) or the MPFB nightly build.

## 6. Phase 1: export pipeline

Add `scripts/blender/export-human.py`, run headless, reproducible. Discover the real operator and
service names in Blender first (`dir(bpy.ops.mpfb)`, the MPFB `HumanService`/`TargetService`
modules); the names below are **(verify)**.

- Create the human from a saved preset: male, average build, helpers deleted, about 1.80 m. Body
  only is roughly 13k vertices **(verify)**, which is fine for the game.
- Rig: the MPFB **game engine** rig (Unreal-style names such as `pelvis`, `spine_01`,
  `clavicle_l`, `upperarm_l`, `lowerarm_l`, `hand_l`, `index_01_l`, `thigh_l`, `calf_l`,
  `foot_l`, `ball_l`, `neck_01`, `head`) **(verify)**. It has all finger joints and no face bones.
- Body proportions (macro sliders: muscle, weight, proportions) are baked into the mesh so the
  skeleton matches. Use one body per class at first.
- Face: keep a curated set of about 15–20 face targets as shape keys (jaw width, chin, cheekbones,
  brow, eye size/spacing, nose size/width/bridge, lip fullness, plus blink L/R and jaw open).
  These map onto today's `FaceSpec` fields.
- Add eyes, teeth, eyebrows and eyelashes from the system assets as separate meshes on the same
  armature.
- Skin: one CC0 skin, diffuse at 2048 px, exported as JPEG or WebP. Tint per character at runtime.
- Export GLB: skins on, morphs on, sparse shape keys on (face targets touch only the head, so they
  stay small), no animations, +Y up, modifiers **not** applied (applying drops shape keys).
- Output: `public/dungeon-explorer/assets/characters/human_male.glb`. Both servers already serve
  that folder at the site root (`scripts/dungeon-explorer.mjs` `PUBLIC_DIR`, `web/vite.config.js`
  `publicDir`). Budget: under 5 MB with textures.
- Also write `human_male.json` beside it: bone name → logical bone, the morph list, and the
  vertex-group or bone names used to split slots.

## 7. Phase 2: load and drive it

**Loader.** New `paladin/humanAsset.ts`: `loadHuman(url): Promise<HumanAsset>` using
`GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js`. Root uses three 0.178 and `web/`
0.187; check the import in both builds. `createPaladin` becomes async (or takes a preloaded
asset); update `paladinLab.ts` and `DungeonApp.tsx`, and keep the player hidden until it resolves.

**Binding the solver to the imported skeleton.** Keep `Rig` and `PaladinAnimator` exactly as they
are and retarget at `apply()`:

1. At load, read each imported bone's bind-pose world quaternion `R` and joint position.
2. Rebuild `REST` from the imported joint positions (after uniform scale and a recentre so feet
   are at y = 0 and the character faces +Z). IK then uses the real limb lengths.
3. For each mapped bone compute a constant `C = A · R`, where `A` is the shortest-arc rotation
   taking the bone's bind direction (towards its child) onto the logical direction: −Y for arms,
   legs and fingers, +Y for spine, neck and head, +Z for foot and toe. The bind pose is an A- or
   T-pose, so `A` is what brings the arms down to the logical rest.
4. Each frame: imported world quaternion = `mq[logical] · C`, converted to local with the parent's
   world quaternion. Write rotations only, plus the hips position. Bone lengths come from the mesh.
5. Unmapped bones follow their parent: extra spine joints split the logical spine/chest rotation;
   twist bones, if present, take half the forearm/upper-arm twist.

Check: with every logical bone at identity the character must stand upright with arms straight
down and palms facing the thighs. If palms face forward or back, fix the roll in `A` for the arm
chain (align the elbow hinge axis as well as the direction).

**Armour-only bones.** `pauldronL/R` and `tassetL/R` do not exist in the import. Keep the logical
`THREE.Skeleton` for armour, cloth pins and weapons, and drive both skeletons from the one solve.
Body meshes bind to the imported skeleton, armour meshes to the logical one.

**Fingers.** Add grip poses in `animator.ts`: a table of curl angles per finger joint about its
hinge axis, for `relaxed`, `swordGrip` and `shieldStrap`, blended like the other poses. The
sword's grip radius is in `buildSword` (`SWORD.base` 0.09); the shield mount is in `buildShield`.
Check the grips in close-up from both cameras.

**Slots.** Split the body mesh at load by dominant bone weight into the existing slots: `head`
(head + neck top), `hands` (hand + fingers), `feet` (foot + ball), `body` (the rest). Keep the
original normals so no seam shows when neighbours are both visible. The visibility rules in
`index.ts` `syncEquipment` then work unchanged (body hidden under mail or doublet, hands under
gauntlets, head in first person and under the helm).

## 8. Phase 3: refit clothes and armour

The plate, mail and helm in `build.ts` are `loft` rings with fixed numbers written against the
old `REST` and the old body. The doublet, hose and braies are cut from `BodyShape` surfaces in
`human.ts`.

1. Implement `BodyShape` (`torso`, `arm`, `leg` surfaces and `torsoRadius`) from the imported
   bind-pose mesh: for each limb build a lookup table radius(theta, y) by casting rays outward
   from the limb axis. Clothing code keeps working against the same interface.
2. Add `measureRing(y)` on the same tables, returning `rx`, `rf`, `rb`. Replace the fixed ring
   numbers in `underLayer`, `torsoPlate`, `armPlate`, `legPlate` and `helm` with measured ring +
   clearance (mail about 6 mm, plate about 14 mm), and take joint heights from the new `REST`.
3. Easier start: in Blender, nudge the base human's height and limb proportions towards the old
   `REST` table before export, so the first fit is already close.
4. Check every armour combination in the lab for skin poking through at elbows, knees, armpits
   and neck during a swing and a crouch.

## 9. Phase 4: head, characters, clean-up

- **Head.** Recommended: use the MPFB head so neck and body are one skin, with real eyes and
  teeth. The user accepted the current procedural face, so show both side by side in the lab and
  get a yes before deleting `head.ts` and `facePaint.ts`. A procedural head on the imported neck
  would bring the collar seam back.
- **Hair and beard.** First pass: MPFB eyebrows and eyelashes, plus either a CC0 hair asset or the
  existing shell hair regenerated from the imported scalp (offset the scalp vertices along their
  normals). Beard the same way or from Bodyparts 05.
- **Characters.** `HumanSpec` becomes: asset id, face morph weights, skin tint, eye colour, hair
  style/colour/grey, beard, brows. Port `aldric`, `garrick`, `tomas`, `rhys`. Bake the face
  weights into the head positions at load so only blink and jaw stay as live morphs.
- **Later, not in this pass:** blinking and eye look-at, a female body, the wizard with spellbook
  on the same base, replacing the chibi mobs.

## 10. Verification

- Lab API: `window.__paladinLab` (`step(frames)`, `state`, `paladin`, `attack()`, `equip`,
  `setAllArmor`, `camera`, `controls`, `view`). The preview pane throttles animation when hidden:
  load with `?paused=1`, advance with `L.step(n)`, wait briefly before a screenshot, and set
  `controls.enableDamping = false`.
- Screenshots go to `out/misc/paladin/wip/`. Never commit anything under `out/`.
- Compare before and after for the same views: bare front/back/side, doublet, full plate, each
  swing at mid-strike, block, first-person guard and swing, hand close-ups.
- Then the dungeon: `http://127.0.0.1:5395/` and the web portal (`npm --prefix web run dev`,
  port 5195, `?mode=explorer`).

## 11. Constraints

- TypeScript `lib` is es2015: no `flatMap`/`flat`, `Object.values`/`entries`, `Array.includes`.
  `noUnusedLocals` is on. Lint is `eslint src && tsc`.
- Shell is Windows pwsh. Write temporary scripts to files; no `python -c` one-liners.
- Commit only when the user asks. Pushing to `main` deploys to Cloudflare Pages.
- Treat downloaded archives as untrusted: own folder, scripts kept elsewhere.
- Keep one body for first and third person. The chibi cast and `AGENTS.md` episode rules are for
  the shorts, not this game.

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| MPFB 2.0.18 does not load on Blender 5.3 | Smoke test first; fall back to Blender 4.2 LTS portable or MPFB nightly |
| Retarget gives twisted forearms or flipped palms | The identity-pose check in §7 before any animation work |
| Armour refit takes longer than the body swap | Ship body + doublet first, plate second |
| GLB too large | Sparse shape keys, 2048 px textures, drop unused face targets |
| New face reads worse than the accepted one | Side-by-side sign-off before deleting the procedural head |
| Load is now async | Gate first-frame on the promise; lab shows a loading state |

## 13. Suggested order

1. Phase 0 (ask, download, install, smoke test).
2. Export a first GLB, no morphs, and render it in the lab beside the current paladin.
3. Retarget + identity-pose check, then run the existing animations on it bare.
4. Finger grips with sword and shield.
5. Slot split, doublet and hose from the new `BodyShape`.
6. Plate and mail refit.
7. Head, hair, characters, then remove the dead procedural code.

Show the user screenshots after steps 3, 4 and 6.

## 14. Status (2026-11-15, end of first implementation pass)

Done, nothing committed:

- Phase 0: MPFB 2.0.18 works on Blender 5.3; the CC0 system assets are installed. The zips are in
  `out/tmp/mpfb/` (`files2.` mirror crawls at ~11 KB/s; `files.makehumancommunity.org` is fast).
- Phase 1: `scripts/blender/export-human.py` (headless, reproducible) writes
  `public/dungeon-explorer/assets/characters/human_male.glb` (2.0 MB: body, eyes, brows, lashes,
  two hair caps, 53-bone game-engine rig, 41 face/build morphs, position-only) plus
  `human_male.json` and `human/*` textures (about 4.0 MB in all). Macros: male, height 0.5,
  muscle 0.7, proportions 1. Macros must be applied before `add_builtin_rig` (the rig fits to the
  `joint-*` helper groups); proxies are refit per morph so eyes, brows and hair follow the face.
- Phase 2: `humanAsset.ts` (load, rest pose, morph baking with seam-safe normals, slot and shell
  helpers), `retarget.ts` (`BodyRig`: C = A * R per bone, forearm takes half the hand twist,
  finger curls for `relaxed` / `sword` / `strap`), `rig.ts` (`AUTHOR` table, live `REST`, `DIM`,
  `setRest`). `createPaladin` is async; lab and dungeon await it. Identity pose checked: upright,
  arms down, palms to the thighs (bind wrist twist is only 3 degrees).
- Phase 3: `body.ts` splits the skin into head/body/hands/feet by dominant bone and cuts braies,
  doublet, belt, hose, shoes and the mail shirt as offset shells of the skin (same weights).
  Plates use `authorAnchor` (authored heights, imported limb lines); torso plates, fauld, gorget,
  hanging mail and the cape/tabard pins are warped onto the measured torso (`fit.ts`). The sword
  mounts at the measured fist; the shield is placed so the left fist closes on its hand strap.
- Phase 4 (partial): all four characters bake from the one file with their face, build, skin
  (young or middle-aged texture, tinted), eye colour and hair. Beards and buzz cuts are painted into
  the skin texture plus a few sparse shells.
- Checks: `npm run lint`, `npm --prefix web run build`, dungeon and portal load with no console
  errors. Sheets: `node scripts/paladin-shots.mjs <tag>` (explorer server running) writes
  `out/misc/paladin/wip/<tag>/`; `before`, `after2` and `classic-head` are there.

Open:

- Face sign-off: the imported head is the default; `?head=classic` puts the old head on the new
  body (it shows the collar seam, as predicted). On a yes, delete `head.ts`, `facePaint.ts`,
  `human.ts` (and `sculpt.ts` if nothing else uses it), the `classicHead` option and the old
  `faceSkin`/`eye`/`skin` harness materials.
- Freckles (`spec.freckles`) are not painted yet; hair-cap hairlines are hard-edged; brows are a
  single CC0 style.
- `paladin-shots.mjs` "swing 2/3" tiles show the first swing (the combo helper does not chain).
- Teeth/tongue were left out (no jaw-open yet); blink and look-at are later work.
