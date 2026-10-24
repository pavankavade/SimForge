# SimForge Episode 3 – Production Specification

**Title:** Upgrading the Crushing Walls Dungeon Trap until it’s UNBEATABLE 🧱💀  
**Format:** 9:16 Vertical Short (1080x1920), 30 FPS  
**Total Duration:** ~76 Seconds (2,280 Frames)  
**Visual Style:** Clean procedural 3D primitives (Three.js / Remotion), high-contrast dungeon lighting, snappy ease-in-out mechanical keyframes, slapstick physics.

---

## 1. Locked Voiceover Script & Timestamp Map

| Stage | Timecode | Frames (30fps) | Narration (TTS / Voiceover) |
| --- | --- | --- | --- |
| **Stage 1: Goblin** | 00:00 - 00:09 | 0 - 270 | "If you wire two sliding stone walls to a loot pedestal, a greedy goblin will grab the shiny coin and get pressed into a pancake." |
| **Stage 2: Rogue** | 00:09 - 00:25 | 271 - 750 | "However, a show-off rogue will immediately parkour up the stone crevices to escape through the ceiling vent. So, you replace the stone with grease-coated steel plates and hide a spring-loaded boot inside the vent. Even if he climbs the grease, the ceiling punts him right back to the floor." |
| **Stage 3: Paladin** | 00:25 - 00:44 | 751 - 1320 | "But a stubborn paladin won't even try to climb. He just wedges a reinforced steel beam between the walls and stands there smugly. To fix this, you upgrade to twin five-hundred-ton hydraulic presses and electrify the wall plates. The moment his metal beam touches both sides, it completes the circuit—roasting him inside his own armor before folding him into a neat little cube." |
| **Stage 4: Mage** | 00:44 - 00:59 | 1321 - 1770 | "However, a lazy mage will simply cast a teleport spell to blink right through the wall. So, you line the room with arcane deflection mirrors. The moment he teleports, his spell bounces between the closing walls like a game of high-speed Pong until there is nowhere left to bounce." |
| **Stage 5: Finale** | 00:59 - 01:16 | 1771 - 2280 | "Finally, for paranoid parties that stand outside the doorway poking the floor with a ten-foot pole, you mount the entire room on high-speed rails. The moment their stick touches a tile, the whole room lunges into the hallway, swallows them whole, and blasts them through the ceiling chute straight into your pet Mimic. Congratulations, your dungeon is now unbeatable." |

---

## 2. Shared 3D Environment & Asset Primitives

### The Room Container (`RoomGroup`)
- **Floor:** Segmented stone grid (`BoxGeometry` tiles) with a central retractable toaster-slot (`width: 0.4`, `length: 4.0`).
- **Left & Right Crushing Walls (`Wall_L`, `Wall_R`):** Large vertical slabs (`BoxGeometry(2, 8, 8)`) starting at `x = -5` and `x = +5`.
- **Center Pedestal:** Cylindrical pillar (`CylinderGeometry`) at `(0, 1, 0)` with a glowing gold coin (`CylinderGeometry`, emissive yellow `#FFD700`).
- **Ceiling Structure:** Framed roof at `y = 8` with a central square ventilation shaft (2x2 opening).

### Character Rig Archetypes (Procedural Capsule/Box Pawns)
- **Goblin:** Green skin (`#4CAF50`), short scale (`0.7x`), pointy ears (`ConeGeometry`).
- **Rogue:** Dark hood/cloak (`#212121`), dual daggers, agile keyframe posture.
- **Paladin:** Bulky silver plate armor (`#B0BEC5`, metallic), gold trim, oversized horizontal I-beam prop (`BoxGeometry(9.5, 0.5, 0.5)`).
- **Mage:** Blue wizard robes (`#1E88E5`), pointed hat (`ConeGeometry`), glowing cyan staff.

---

## 3. Scene-by-Scene Animation, Camera & Audio Breakdown

### SCENE 1: The Goblin & The Toaster Slot (00:00 - 00:09 | Frames 0 - 270)

#### Camera Rig
- **F0–F120:** Isometric 3/4 overhead view looking down into the open room (`pos: [0, 7, 10]`, `lookAt: [0, 2, 0]`).
- **F121–F270:** Fast dolly zoom into center pedestal (`pos: [0, 3, 5]`).

#### Mechanical & Character Animation
- **F0–F90:** Goblin hops eagerly to `(0, 0, 0)` and snatches the gold coin off the pedestal. Pedestal depresses (`y: -0.2`, glows red).
- **F91–F160:** `Wall_L` (`x: -5 -> -0.05`) and `Wall_R` (`x: +5 -> +0.05`) slam inward with `easeInExpo`.
- **F161–F200:** Walls hold shut for 15 frames, then retract outward (`x: -4`, `x: +4`).
- **F201–F270:** Goblin's `scale.x` is squashed to `0.02` (flat 2D disc). Floor slot opens underneath; flattened Goblin drops vertically (`y: 0 -> -5`) like a slice of toast.

#### SFX Cues
- **F90:** Click/trigger stone sound.
- **F155:** Heavy stone slam + high-pitched kitchen toaster DING!
- **F215:** Comedic paper-slide whistle as Goblin drops through the slot.

---

### SCENE 2: The Rogue & The Spring-Loaded Boot (00:09 - 00:25 | Frames 271 - 750)

#### Camera Rig
- **F271–F450:** Low-angle tilt-up shot tracking the Rogue climbing toward the ceiling vent (`pos: [0, 2, 6]`, `lookAt: [0, 6, 0]`).
- **F451–F600:** Blueprint/Upgrade camera whip-pan (360° fast rotation around Y-axis) while wall materials swap.
- **F601–F750:** Side-profile orthographic-style view (`pos: [0, 4, 9]`) to clearly read the vertical punt.

#### Mechanical & Character Animation
- **Part A (The Counter - F271–F450):** Walls begin closing. Rogue wall-jumps back and forth (`x: -3 -> +2 -> -1.5`, `y: 1 -> 3.5 -> 6.5`) up brick protrusions and slips into the ceiling vent at `y = 8`.
- **Part B (The Upgrade - F451–F570):** Brick protrusions scale to 0. Wall material swaps to glossy chrome (`metalness: 0.9`, `roughness: 0.1`) with dripping yellow oil particles. Inside the ceiling vent (`y = 8.5`), a giant red mechanical boot attached to a coiled helix spring (`TorusGeometry` stack) scales in.
- **Part C (The Payoff - F571–F750):** Rogue attempts to wall-jump, slips comically for 30 frames, grabs the lip of the ceiling vent at `y = 7.5`, and gets blasted downward (`y: 7.5 -> 0` in 6 frames) as the spring-boot extends (`y: 8.5 -> 6.0`). Rogue craters into the floor.

#### SFX Cues
- **F280:** Ninja swoosh / parkour jump sounds.
- **F460:** Industrial upgrade wrench/ratchet clanks.
- **F590:** Cartoon tire-squeak / slipping sound on grease.
- **F660:** Giant spring BOING + bowling pin strike impact.

---

### SCENE 3: The Paladin & The Car Compactor (00:25 - 00:44 | Frames 751 - 1320)

#### Camera Rig
- **F751–F960:** Medium hero shot on the Paladin (`pos: [2, 3, 6]`, `lookAt: [0, 2, 0]`).
- **F961–F1140:** Wide pull-back (`pos: [0, 8, 14]`) to reveal massive exterior hydraulic pistons and Tesla coils mounting behind the walls.
- **F1141–F1320:** Tight front-on shot (`pos: [0, 2.5, 5]`) as the cube forms.

#### Mechanical & Character Animation
- **Part A (The Counter - F751–F960):** Stone walls slide in (`x: -3.5`, `x: +3.5`). Paladin plants a massive steel I-beam horizontally across the gap. Walls shudder (high-frequency x jitter `±0.05`), smoke rises from gears, walls stall. Paladin does an exaggerated chest-puff idle animation.
- **Part B (The Upgrade - F961–F1140):** Exterior stone gears shatter and fall away. Twin colossal yellow/black striped hydraulic cylinders (`CylinderGeometry`) lock onto the backs of `Wall_L` and `Wall_R`. Copper Tesla coils mount to the top corners of the walls.
- **Part C (The Payoff - F1141–F1320):** Walls make contact with the steel beam. Bright cyan lightning arcs (`LineSegments` with randomized jagged vertices + bloom) surge through the beam into the Paladin's armor (Paladin flashes white/black skeleton silhouette). Hydraulic pistons surge forward with zero resistance, crushing the beam and Paladin inward while a ceiling piston drops down—leaving a tiny 1x1x1 metallic scrap cube on the floor.

#### SFX Cues
- **F820:** Metallic clank + straining gear groan.
- **F980:** Heavy hydraulic hiss + pneumatic lock.
- **F1150:** High-voltage Tesla BZZZT zap + heavy industrial car-crusher crunch.

---

### SCENE 4: The Mage & Arcane Pong (00:44 - 00:59 | Frames 1321 - 1770)

#### Camera Rig
- **F1321–F1500:** Over-the-shoulder angle behind the Mage (`pos: [-2, 3, 7]`).
- **F1501–F1770:** Top-down 90-degree arcade view (`pos: [0, 14, 0.1]`, `lookAt: [0, 0, 0]`) framing the closing walls like a classic 2D Pong screen.

#### Mechanical & Character Animation
- **Part A (The Counter - F1321–F1480):** Walls close in. Mage raises staff, spawns a purple portal ring (`TorusGeometry`), steps through, and reappears safely outside the left wall (`x = -7`), waving at the camera.
- **Part B (The Upgrade - F1481–F1580):** Hexagonal crystalline mirror plates (`CylinderGeometry` with 6 sides, glowing magenta edges, high specular reflection) snap onto the inner faces of `Wall_L` and `Wall_R`.
- **Part C (The Payoff - F1581–F1770):** As `Wall_L` and `Wall_R` slide from `x = ±4.5` to `x = ±0.2`, the Mage casts teleport into `Wall_L`. Instead of passing through, the Mage turns into a glowing cyan energy orb/silhouette that ricochets between `Wall_L` and `Wall_R` along a zig-zag vector. Each bounce decreases the travel time (`Δt = 25 -> 15 -> 8 -> 4 -> 2 -> 1` frames) until the walls slam shut at `x = 0` in a burst of arcane sparkles.

#### SFX Cues
- **F1390:** Ethereal teleport vvv-oop chime.
- **F1590–F1750:** Classic 8-bit Atari Pong paddle beeps (440Hz alternating with 880Hz) accelerating into a continuous high-pitched buzz right before the final SMASH.

---

### SCENE 5: The Finale – The Lunging Room & Ceiling Cannon (00:59 - 01:16 | Frames 1771 - 2280)

#### Camera Rig
- **F1771–F1930:** Hallway perspective outside the room entrance (`pos: [0, 3, 15]`, `lookAt: [0, 2, 5]`), showing the full 4-hero party huddled outside.
- **F1931–F2080:** Dynamic wide side-tracking shot (`pos: [12, 5, 8]`) showing the entire room exterior mounted on steel rails.
- **F2081–F2280:** Fast vertical camera pan up the ceiling chute (`y: 5 -> 25`) into the Mimic chamber above.

#### Mechanical & Character Animation
- **Part A (The Counter - F1771–F1930):** All 4 heroes huddle tightly at `z = +8` outside the room threshold (`z = +4`). The Rogue holds an absurdly long wooden pole (`CylinderGeometry`, length: 6) and gently pokes a single floor tile inside the doorway at F1920.
- **Part B (The Upgrade & Lunge - F1931–F2060):** Heavy steel railway tracks appear under the entire `RoomGroup` along the Z-axis, backed by twin rocket thrusters at `z = -5`. At F1960, the thrusters ignite—the entire room structure lunges forward along the Z-axis (`z: 0 -> +8` in 12 frames), swallowing the stationary party into the center of the room. A steel blast door slams down behind them.
- **Part C (The Vacuum Launch & Mimic - F2061–F2280):** `Wall_L` and `Wall_R` slam inward at supersonic speed (10 frames), creating a pressurized air shockwave ring that shoots the huddled party straight up through the ceiling chute (`y: 1 -> 22`). At `y = 22`, a giant wooden Treasure Chest Mimic (with hinged jaw, rows of white `ConeGeometry` teeth, and a purple tongue) snaps shut in mid-air (F2210) and burps out a single Paladin helmet.

#### SFX Cues
- **F1920:** Tiny wooden tink as the pole taps the tile.
- **F1960:** Jet thruster roar + train-on-tracks metallic screech + steel blast door slam.
- **F2070:** Pneumatic air-cannon THOOMP + group Wilhelm-style scream fading upward.
- **F2210:** Giant wooden chomp + comedic burp + victory fanfare chord on "Congratulations, your dungeon is now unbeatable."

---

## 4. Pipeline Implementation Checklist (For Code Generation)

- **State Driven StageManager:** Split into 5 isolated sub-components (`Stage1_Goblin.tsx`, `Stage2_Rogue.tsx`, `Stage3_Paladin.tsx`, `Stage4_Mage.tsx`, `Stage5_Finale.tsx`) inside a master `<Series>` sequence so wall positions and materials reset cleanly between stages without state bleed.
- **Camera Continuity Fix:** Use smooth `interpolate()` with `Easing.bezier(0.25, 1, 0.5, 1)` on camera position and `lookAt` vectors during the Stage 5 vertical tube launch so the Mimic stays dead-center in the 9:16 frame.
- **Clipping Prevention:** Clamp `Wall_L.position.x` to `-0.5` and `Wall_R.position.x` to `+0.5` (accounting for half-width 1.0 of each wall) so the inner faces meet flush at `x = 0` without Z-fighting.
