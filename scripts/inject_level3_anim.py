with open("scripts/blender_simforge_cw.py", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Replace wall inner logic
old_wall_code = '''        elif f < 849:
            inner = 0.06
        elif f < 863: # Reopen revealing Rogue 2 pancake
            t = prog(f, 849, 863)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        else:
            inner = 1.8'''

new_wall_code = '''        elif f < 849:
            inner = 0.06
        elif f < 863: # Reopen revealing Rogue 2 pancake
            t = prog(f, 849, 863)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        # --- Level 3 Walls ---
        elif f < 978:
            inner = 1.8
        elif f < 1017: # Closes toward wedged steel beam
            t = prog(f, 978, 1017)
            inner = lerp(1.8, 1.25, ease_in_out(t))
        elif f < 1437: # Locked against beam!
            inner = 1.25
        elif f < 1488: # Circuit completes, pressing firmly
            t = prog(f, 1437, 1488)
            inner = lerp(1.25, 1.20, ease_in_out(t))
        elif f < 1593: # Circuit active, locked
            inner = 1.20
        elif f < 1623: # 500-ton hydraulic press crushes through beam!
            t = prog(f, 1593, 1623)
            inner = lerp(1.20, 0.28, ease_in_cubic(t))
        elif f < 1677: # Holds cube
            inner = 0.28
        else: # Reopen to 1.8 leaving cube on floor
            t = prog(f, 1677, 1705)
            inner = lerp(0.28, 1.8, ease_in_out(t))'''

if old_wall_code in code:
    code = code.replace(old_wall_code, new_wall_code)
    print("Replaced wall inner logic for Level 3!")
else:
    print("Could not find old_wall_code!")

# 2. Add Level 3 objects animation code before "# 7. Gold Coin"
l3_anim_code = '''        # ---------------------------------------------------------
        # Level 3: Steel Beam
        # ---------------------------------------------------------
        if beam:
            if f < 978:
                beam.hide_render = True
                beam.hide_viewport = True
                beam.scale = Vector((1.0, 1.0, 1.0))
            elif f < 1017: # Paladin raises beam
                beam.hide_render = False
                beam.hide_viewport = False
                t = prog(f, 978, 1017)
                beam.location = Vector((0.0, -0.6, lerp(0.2, 0.95, ease_out_back(t))))
                beam.scale = Vector((1.0, 1.0, 1.0))
            elif f < 1593: # Wedged horizontally between walls
                beam.hide_render = False
                beam.hide_viewport = False
                beam.location = Vector((0.0, -0.6, 0.95))
                beam.scale = Vector((1.0, 1.0, 1.0))
            elif f < 1623: # Crumples under 500-ton presses!
                beam.hide_render = False
                beam.hide_viewport = False
                t = prog(f, 1593, 1623)
                beam.location = Vector((0.0, -0.6, 0.95))
                beam.scale = Vector((lerp(1.0, 0.15, ease_in_cubic(t)), 1.0, lerp(1.0, 0.2, t)))
            else:
                beam.hide_render = True
                beam.hide_viewport = True
                beam.scale = Vector((0.1, 0.1, 0.1))
            beam.keyframe_insert(data_path="location", frame=f)
            beam.keyframe_insert(data_path="scale", frame=f)
            beam.keyframe_insert(data_path="hide_render", frame=f)
            for child in beam.children:
                child.hide_render = beam.hide_render
                child.hide_viewport = beam.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # Level 3: Hydraulic Presses L & R
        # ---------------------------------------------------------
        if press_l and press_r:
            if f < 1218:
                press_l.hide_render = True
                press_l.hide_viewport = True
                press_r.hide_render = True
                press_r.hide_viewport = True
                pz = 6.0
            elif f < 1296: # Drop down and mount behind walls
                press_l.hide_render = False
                press_l.hide_viewport = False
                press_r.hide_render = False
                press_r.hide_viewport = False
                t = prog(f, 1218, 1296)
                pz = lerp(6.0, 0.0, ease_out_back(t))
            else:
                press_l.hide_render = False
                press_l.hide_viewport = False
                press_r.hide_render = False
                press_r.hide_viewport = False
                pz = 0.0
            press_l.location.z = pz
            press_r.location.z = pz
            press_l.keyframe_insert(data_path="location", index=2, frame=f)
            press_r.keyframe_insert(data_path="location", index=2, frame=f)
            press_l.keyframe_insert(data_path="hide_render", frame=f)
            press_r.keyframe_insert(data_path="hide_render", frame=f)
            for child in press_l.children:
                child.hide_render = press_l.hide_render
                child.hide_viewport = press_l.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)
            for child in press_r.children:
                child.hide_render = press_r.hide_render
                child.hide_viewport = press_r.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # Level 3: Electric Arcs
        # ---------------------------------------------------------
        if electric_arcs:
            if 1488 <= f < 1593: # High-voltage circuit complete!
                electric_arcs.hide_render = False
                electric_arcs.hide_viewport = False
                # Rapid voltage jitter
                s = 1.15 if f % 2 == 0 else 0.90
                electric_arcs.scale = Vector((1.0, s, s))
            else:
                electric_arcs.hide_render = True
                electric_arcs.hide_viewport = True
                electric_arcs.scale = Vector((1.0, 1.0, 1.0))
            electric_arcs.keyframe_insert(data_path="hide_render", frame=f)
            electric_arcs.keyframe_insert(data_path="scale", frame=f)
            for child in electric_arcs.children:
                child.hide_render = electric_arcs.hide_render
                child.hide_viewport = electric_arcs.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # Level 3: Paladin 1 Character
        # ---------------------------------------------------------
        if paladin1:
            if f < 873:
                paladin1.hide_render = True
                paladin1.hide_viewport = True
                p_x, p_y, p_z = -10.2, -0.6, 0.0
                p_yaw = math.radians(90)
                p_pose = "walk"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 915: # Heavy stomp in
                paladin1.hide_render = False
                paladin1.hide_viewport = False
                t = prog(f, 873, 915)
                p_x = lerp(-10.2, 0.0, t)
                p_y, p_z = -0.6, 0.0
                p_yaw = math.radians(90)
                p_pose = "walk"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 978: # Shakes head at climbing ("won't even try")
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "point" if f < 945 else "idle"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1017: # Lifts and wedges heavy steel beam
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "smash"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1143: # Smug gloat to camera, arms folded
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "cheer"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1218: # Idle smug
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "idle"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1437: # Eyeballs hydraulic upgrades
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = math.radians(-25) if f < 1320 else math.radians(25)
                p_pose = "windup"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1488: # Bracing behind shield
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "shield"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1593: # HIGH-VOLTAGE ROAST! Rapid shock vibration
                paladin1.hide_render = False
                paladin1.hide_viewport = False
                p_x = math.sin(f * 2.8) * 0.035
                p_y = -0.6
                p_z = 0.0
                p_yaw = 0.0
                p_pose = "slip"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1623: # Folded into cube by 500-ton rams
                t = prog(f, 1593, 1623)
                p_x, p_y = 0.0, -0.6
                p_z = lerp(0.0, 0.95, t)
                p_yaw = 0.0
                p_pose = "cower"
                sq = lerp(1.0, 0.28, ease_in_cubic(t))
                p_sx = pal_scale * sq
                p_sy = pal_scale * sq
                p_sz = pal_scale * sq
            else: # Character hidden, replaced by Paladin_Cube
                paladin1.hide_render = True
                paladin1.hide_viewport = True
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "cower"
                p_sx, p_sy, p_sz = 0.01, 0.01, 0.01
                
            paladin1.location = Vector((p_x, p_y, p_z))
            paladin1.rotation_euler.z = p_yaw
            paladin1.scale = Vector((p_sx, p_sy, p_sz))
            paladin1.keyframe_insert(data_path="location", frame=f)
            paladin1.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            paladin1.keyframe_insert(data_path="scale", frame=f)
            paladin1.keyframe_insert(data_path="hide_render", frame=f)
            for child in paladin1.children:
                child.hide_render = paladin1.hide_render
                child.hide_viewport = paladin1.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)
                
            p_data = solve_pose(p_pose, f)
            apply_pose_to_char("Paladin1", p_data)

        # ---------------------------------------------------------
        # Level 3: Paladin Cube (Permanent corpse in Lane 3)
        # ---------------------------------------------------------
        if pal_cube:
            if f < 1623:
                pal_cube.hide_render = True
                pal_cube.hide_viewport = True
                cube_loc = Vector((0.0, -0.6, 0.95))
            elif f < 1677: # Held compacted between walls
                pal_cube.hide_render = False
                pal_cube.hide_viewport = False
                cube_loc = Vector((0.0, -0.6, 0.95))
            elif f < 1695: # Walls release, cube drops into corpse lane 3
                pal_cube.hide_render = False
                pal_cube.hide_viewport = False
                t = prog(f, 1677, 1695)
                cx = lerp(0.0, 1.15, ease_in_out(t))
                cy = lerp(-0.6, -1.0, ease_in_out(t))
                cz = lerp(0.95, 0.26, ease_out_bounce(t))
                cube_loc = Vector((cx, cy, cz))
            else: # Resting permanently on floor beside pancakes!
                pal_cube.hide_render = False
                pal_cube.hide_viewport = False
                cube_loc = Vector((1.15, -1.0, 0.26))
            pal_cube.location = cube_loc
            pal_cube.keyframe_insert(data_path="location", frame=f)
            pal_cube.keyframe_insert(data_path="hide_render", frame=f)
            for child in pal_cube.children:
                child.hide_render = pal_cube.hide_render
                child.hide_viewport = pal_cube.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)
'''

# Find insertion before "# 7. Gold Coin"
if "# 7. Gold Coin (handled for Level 1 & 2)" in code:
    code = code.replace("# 7. Gold Coin (handled for Level 1 & 2)", l3_anim_code + "\n        # 7. Gold Coin (handled for Level 1 & 2)")
    print("Injected Level 3 animation keyframing!")
else:
    print("Could not find '# 7. Gold Coin'!")

with open("scripts/blender_simforge_cw.py", "w", encoding="utf-8") as f:
    f.write(code)

print("Updated blender_simforge_cw.py with complete Level 3 animation.")
