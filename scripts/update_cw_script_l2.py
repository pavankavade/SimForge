with open('scripts/blender_simforge_cw.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's inspect animate_level_1 and replace with animate_episode_levels
# We will combine Level 1 and Level 2 into a clean animation loop up to frame 870!

l2_animation_code = '''
def animate_scene_levels():
    print("Animating Episode 3: Level 1 & Level 2...")
    
    wall_l = bpy.data.objects.get("Wall_L_Root")
    wall_r = bpy.data.objects.get("Wall_R_Root")
    pedestal = bpy.data.objects.get("Pedestal_Root")
    coin = bpy.data.objects.get("Coin_Root")
    goblin = bpy.data.objects.get("Goblin_Root")
    rogue1 = bpy.data.objects.get("Rogue1_Root")
    rogue2 = bpy.data.objects.get("Rogue2_Root")
    plates_l = bpy.data.objects.get("Wall_L_Plates")
    plates_r = bpy.data.objects.get("Wall_R_Plates")
    chimney = bpy.data.objects.get("Ceiling_Chimney")
    boot = bpy.data.objects.get("Ceiling_SpringBoot")
    
    animated_objs = [wall_l, wall_r, pedestal, coin, goblin, rogue1, rogue2, plates_l, plates_r, chimney, boot]
    for obj in animated_objs:
        if obj:
            obj.animation_data_clear()
            
    cfg_gob = CLASS_CONFIGS["goblin"]
    cfg_rog = CLASS_CONFIGS["rogue"]
    gob_scale = cfg_gob["scale"]
    rog_scale = cfg_rog["scale"]
    
    for f in range(0, 870):
        # ---------------------------------------------------------
        # 1. Sliding Walls inner position
        # ---------------------------------------------------------
        if f < 51:
            inner = 6.6
        elif f < 95:
            t = prog(f, 51, 95)
            inner = lerp(6.6, 1.8, ease_out_back(t))
        elif f < 228:
            inner = 1.8
        elif f < 255:
            t = prog(f, 228, 255)
            inner = lerp(1.8, 0.06, ease_in_cubic(t))
        elif f < 275:
            inner = 0.06
        elif f < 289:
            t = prog(f, 275, 289)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        elif f < 362:
            inner = 1.8
        elif f < 453: # Parkour crevice
            t = prog(f, 362, 453)
            inner = lerp(1.8, 0.90, ease_in_out(t))
        elif f < 484:
            inner = 0.90
        elif f < 492: # Walls slam shut under rogue
            t = prog(f, 484, 492)
            inner = lerp(0.90, 0.06, ease_in_cubic(t))
        elif f < 523:
            inner = 0.06
        elif f < 537: # Reopen for plates install
            t = prog(f, 523, 537)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        elif f < 707:
            inner = 1.8
        elif f < 829: # Closing on Rogue 2
            t = prog(f, 707, 829)
            inner = lerp(1.8, 1.0, ease_in_out(t))
        elif f < 835: # Walls slam shut on Rogue 2
            t = prog(f, 829, 835)
            inner = lerp(1.0, 0.06, ease_in_cubic(t))
        elif f < 849:
            inner = 0.06
        elif f < 863: # Reopen revealing Rogue 2 pancake
            t = prog(f, 849, 863)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        else:
            inner = 1.8
            
        if wall_l:
            wall_l.location.x = -inner
            wall_l.keyframe_insert(data_path="location", index=0, frame=f)
        if wall_r:
            wall_r.location.x = inner
            wall_r.keyframe_insert(data_path="location", index=0, frame=f)

        # ---------------------------------------------------------
        # 2. Trap Props (Plates, Chimney, SpringBoot)
        # ---------------------------------------------------------
        # Plates
        if plates_l and plates_r:
            if f < 529:
                plates_l.hide_render = True
                plates_l.hide_viewport = True
                plates_r.hide_render = True
                plates_r.hide_viewport = True
                plates_l.location.z = 6.0
                plates_r.location.z = 6.0
            elif f < 598:
                t = prog(f, 529, 598)
                plates_l.hide_render = False
                plates_l.hide_viewport = False
                plates_r.hide_render = False
                plates_r.hide_viewport = False
                plates_l.location.z = lerp(6.0, 0.0, ease_out_back(t))
                plates_r.location.z = lerp(6.0, 0.0, ease_out_back(t))
            else:
                plates_l.hide_render = False
                plates_l.hide_viewport = False
                plates_r.hide_render = False
                plates_r.hide_viewport = False
                plates_l.location.z = 0.0
                plates_r.location.z = 0.0
            plates_l.keyframe_insert(data_path="hide_render", frame=f)
            plates_r.keyframe_insert(data_path="hide_render", frame=f)
            plates_l.keyframe_insert(data_path="location", index=2, frame=f)
            plates_r.keyframe_insert(data_path="location", index=2, frame=f)

        # Boot
        if boot:
            if f < 655:
                boot.hide_render = True
                boot.hide_viewport = True
                boot_z = 3.75
            elif f < 665: # Demo drop
                boot.hide_render = False
                boot.hide_viewport = False
                t = prog(f, 655, 665)
                boot_z = lerp(3.75, 2.2, ease_out_back(t))
            elif f < 678: # Demo retract
                t = prog(f, 665, 678)
                boot_z = lerp(2.2, 3.75, ease_in_out(t))
            elif f < 790: # Hidden in chimney
                boot.hide_render = True
                boot.hide_viewport = True
                boot_z = 3.75
            elif f < 793: # PUNT impact!
                boot.hide_render = False
                boot.hide_viewport = False
                t = prog(f, 790, 793)
                boot_z = lerp(3.75, 1.85, t)
            elif f < 805: # Retract
                t = prog(f, 793, 805)
                boot_z = lerp(1.85, 3.75, ease_in_out(t))
            else:
                boot.hide_render = True
                boot.hide_viewport = True
                boot_z = 3.75
            boot.location.z = boot_z
            boot.keyframe_insert(data_path="location", index=2, frame=f)
            boot.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # 3. Pedestal
        # ---------------------------------------------------------
        if f < 105:
            ped_z = -1.1
        elif f < 117:
            t = prog(f, 105, 117)
            ped_z = lerp(-1.1, 0.0, ease_out_back(t))
        elif f < 228:
            ped_z = 0.0
        elif f < 255: # Sinks during crush
            t = prog(f, 228, 255)
            ped_z = lerp(0.0, -1.1, ease_in_cubic(t))
        elif f < 289:
            ped_z = -1.1
        elif f < 305: # Rises on reopen
            t = prog(f, 289, 305)
            ped_z = lerp(-1.1, 0.0, ease_out_back(t))
        elif f < 484:
            ped_z = 0.0
        elif f < 492: # Sinks on crush
            t = prog(f, 484, 492)
            ped_z = lerp(0.0, -1.1, ease_in_cubic(t))
        elif f < 537:
            ped_z = -1.1
        elif f < 555: # Rises on reopen
            t = prog(f, 537, 555)
            ped_z = lerp(-1.1, 0.0, ease_out_back(t))
        elif f < 829:
            ped_z = 0.0
        elif f < 835:
            t = prog(f, 829, 835)
            ped_z = lerp(0.0, -1.1, ease_in_cubic(t))
        else:
            ped_z = -1.1
            
        if pedestal:
            pedestal.location.z = ped_z
            pedestal.keyframe_insert(data_path="location", index=2, frame=f)

        # ---------------------------------------------------------
        # 4. Goblin (stays dead as pancake in Level 2)
        # ---------------------------------------------------------
        if goblin:
            if f < 59:
                gob_x, gob_y, gob_z = -12.0, -0.6, 0.0
                yaw = math.radians(90)
                pose = "walk"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 167:
                t = prog(f, 59, 167)
                gob_x = lerp(-10.2, -0.5, t)
                gob_y, gob_z = -0.6, 0.0
                yaw = math.radians(90)
                pose = "walk"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 171:
                gob_x, gob_y, gob_z = -0.5, -0.6, 0.0
                yaw = math.radians(70)
                pose = "point"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 202:
                gob_x, gob_y, gob_z = -0.5, -0.6, 0.0
                yaw = 0.0
                pose = "cheer"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 212:
                t = prog(f, 202, 212)
                gob_x = lerp(-0.5, 0.0, ease_in_out(t))
                hop_h = math.sin(t * math.pi) * 0.35
                gob_y = -0.6
                gob_z = hop_h
                yaw = math.radians(45)
                pose = "jump"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 228:
                gob_x, gob_y, gob_z = 0.0, -0.6, 0.0
                yaw = 0.0
                pose = "cheer"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 234:
                gob_x, gob_y, gob_z = 0.0, -0.6, 0.0
                yaw = math.radians(-35) if f < 231 else math.radians(35)
                pose = "point"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 255:
                gob_x, gob_y, gob_z = 0.0, -0.6, 0.0
                yaw = 0.0
                pose = "cower"
                squeeze = clamp(inner / (0.33 * gob_scale), 0.12, 1.0)
                sx = gob_scale * squeeze
                sy = gob_scale
                sz = gob_scale * lerp(1.0, 1.35, 1.0 - squeeze)
            elif f < 289:
                gob_x, gob_y, gob_z = 0.0, -0.6, 0.0
                yaw = 0.0
                pose = "cower"
                sx = gob_scale * 0.12
                sy = gob_scale
                sz = gob_scale * 1.35
            elif f < 299:
                wob = prog(f, 289, 299)
                gob_x, gob_y, gob_z = 0.0, -0.6, 0.0
                yaw = math.sin(wob * math.pi * 3) * 0.22 * (1.0 - wob)
                pose = "cower"
                sx = gob_scale * 0.12
                sy = gob_scale
                sz = gob_scale * 1.35
            else: # Stays dead flat in pancake lane!
                fall = ease_in_out(prog(f, 299, 306))
                gob_x = lerp(0.0, 0.85, fall)
                gob_y = lerp(-0.6, -1.35, fall)
                gob_z = 0.03
                yaw = 0.0
                pose = "cower"
                sx = gob_scale * lerp(0.12, 1.55, fall)
                sy = gob_scale * 1.55
                sz = gob_scale * lerp(1.35, 0.08, fall)
                
            goblin.location = Vector((gob_x, gob_y, gob_z))
            goblin.rotation_euler.z = yaw
            goblin.scale = Vector((sx, sy, sz))
            goblin.keyframe_insert(data_path="location", frame=f)
            goblin.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            goblin.keyframe_insert(data_path="scale", frame=f)
            
            p_data = solve_pose(pose, f)
            apply_pose_to_char("Goblin", p_data)

        # ---------------------------------------------------------
        # 5. Rogue 1 (Parkour escape through ceiling vent)
        # ---------------------------------------------------------
        if rogue1:
            if f < 310:
                rogue1.hide_render = True
                rogue1.hide_viewport = True
                r1_x, r1_y, r1_z = -12.0, -0.6, 0.0
                r1_yaw = math.radians(90)
                r1_pose = "run"
            elif f < 356:
                rogue1.hide_render = False
                rogue1.hide_viewport = False
                t = prog(f, 310, 356)
                r1_x = lerp(-10.2, -0.5, t)
                r1_y, r1_z = -0.6, 0.0
                r1_yaw = math.radians(90)
                r1_pose = "run"
            elif f < 381:
                r1_x, r1_y, r1_z = -0.5, -0.6, 0.0
                r1_yaw = math.radians(60) if f < 365 else 0.0
                r1_pose = "point" if f < 365 else "cheer"
            elif f < 453: # Parkour wall jumps (4 kicks)
                t = prog(f, 381, 453)
                k = min(3, int(t * 4))
                local = t * 4 - k
                side = 1 if k % 2 == 0 else -1
                reach = max(0.2, inner - 0.28)
                from_x = -0.5 if k == 0 else -side * reach
                to_x = 0.0 if k == 3 else side * reach
                r1_x = lerp(from_x, to_x, ease_in_out(local))
                y0 = (k / 4.0) * 1.30
                y1 = ((k + 1) / 4.0) * 1.30
                r1_z = lerp(y0, y1, local) + math.sin(local * math.pi) * 0.35
                r1_y = -0.6
                r1_yaw = math.radians(90) if side > 0 else math.radians(-90)
                if k == 3 and local > 0.6:
                    r1_yaw = 0.0
                r1_pose = "jump"
            elif f < 486: # Through vent to roof
                t = prog(f, 453, 486)
                r1_x = lerp(0.0, 0.4, t)
                r1_y = -0.6
                r1_z = lerp(1.30, 3.45, ease_out_cubic(t))
                r1_yaw = 0.0
                r1_pose = "jump"
            elif f < 515: # Gloat on roof!
                r1_x = 0.4
                r1_y = -0.6
                r1_z = 3.45
                r1_yaw = 0.0
                r1_pose = "cheer" if f < 500 else "point"
            elif f < 535: # Run off right side
                t = prog(f, 515, 535)
                r1_x = lerp(0.4, 6.0, t)
                r1_y = -0.6
                r1_z = 3.45
                r1_yaw = math.radians(90)
                r1_pose = "run"
            else:
                rogue1.hide_render = True
                rogue1.hide_viewport = True
                r1_x, r1_y, r1_z = 6.0, -0.6, 3.45
                r1_yaw = math.radians(90)
                r1_pose = "run"
                
            rogue1.location = Vector((r1_x, r1_y, r1_z))
            rogue1.rotation_euler.z = r1_yaw
            rogue1.scale = Vector((rog_scale, rog_scale, rog_scale))
            rogue1.keyframe_insert(data_path="location", frame=f)
            rogue1.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            rogue1.keyframe_insert(data_path="hide_render", frame=f)
            
            p_data = solve_pose(r1_pose, f)
            apply_pose_to_char("Rogue1", p_data)

        # ---------------------------------------------------------
        # 6. Rogue 2 (Punted by spring boot -> Pancake 2)
        # ---------------------------------------------------------
        if rogue2:
            if f < 665:
                rogue2.hide_render = True
                rogue2.hide_viewport = True
                r2_x, r2_y, r2_z = -12.0, -0.6, 0.0
                r2_yaw = math.radians(90)
                r2_pitch = 0.0
                r2_pose = "run"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 705: # Sprint in
                rogue2.hide_render = False
                rogue2.hide_viewport = False
                t = prog(f, 665, 705)
                r2_x = lerp(-10.2, -0.5, t)
                r2_y, r2_z = -0.6, 0.0
                r2_yaw = math.radians(90)
                r2_pitch = 0.0
                r2_pose = "run"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 721:
                r2_x, r2_y, r2_z = -0.5, -0.6, 0.0
                r2_yaw = math.radians(45)
                r2_pitch = 0.0
                r2_pose = "point"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 769: # Climbing & slipping on grease
                t = prog(f, 721, 769)
                k = min(3, int(t * 4))
                local = t * 4 - k
                side = 1 if k % 2 == 0 else -1
                reach = max(0.2, inner - 0.28)
                from_x = -0.5 if k == 0 else -side * reach
                to_x = 0.0 if k == 3 else side * reach
                r2_x = lerp(from_x, to_x, ease_in_out(local))
                y0 = (k / 4.0) * 1.30
                y1 = ((k + 1) / 4.0) * 1.30
                # Slip drop
                slip = 0.25 if (730 < f < 742 or 748 < f < 760) else 0.0
                r2_z = max(0.0, lerp(y0, y1, local) - slip) + math.sin(local * math.pi) * 0.3
                r2_y = -0.6
                r2_yaw = math.radians(90) if side > 0 else math.radians(-90)
                r2_pitch = 0.0
                r2_pose = "slip" if slip > 0 else "jump"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 790: # Scrambles to vent
                r2_x, r2_y, r2_z = 0.0, -0.6, 1.30
                r2_yaw = 0.0
                r2_pitch = 0.0
                r2_pose = "jump"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 800: # PUNTED down to floor!
                t = prog(f, 790, 800)
                r2_x = lerp(0.0, 0.15, t)
                r2_y = -0.6
                r2_z = lerp(1.30, 0.0, ease_out_cubic(t))
                r2_yaw = math.radians(90)
                r2_pitch = lerp(0.0, math.radians(90), ease_out_cubic(t))
                r2_pose = "launch"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 829: # Lying dazed on floor
                r2_x, r2_y, r2_z = 0.15, -0.6, 0.0
                r2_yaw = math.radians(90)
                r2_pitch = math.radians(90)
                r2_pose = "cower"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 835: # Walls crush Rogue 2
                r2_x, r2_y, r2_z = 0.15, -0.6, 0.0
                r2_yaw = 0.0
                r2_pitch = 0.0
                r2_pose = "cower"
                squeeze = clamp(inner / (0.36 * rog_scale), 0.12, 1.0)
                r2_sx = rog_scale * squeeze
                r2_sy = rog_scale
                r2_sz = rog_scale * lerp(1.0, 1.35, 1.0 - squeeze)
            elif f < 849: # Squeezed wafer
                r2_x, r2_y, r2_z = 0.15, -0.6, 0.0
                r2_yaw = 0.0
                r2_pitch = 0.0
                r2_pose = "cower"
                r2_sx = rog_scale * 0.12
                r2_sy = rog_scale
                r2_sz = rog_scale * 1.35
            else: # Wobble and flop flat into lane [0.75, Z + 0.6]!
                fall = ease_in_out(prog(f, 849, 860))
                r2_x = lerp(0.15, 0.75, fall)
                r2_y = lerp(-0.6, 0.0, fall)
                r2_z = 0.03
                r2_yaw = 0.0
                r2_pitch = 0.0
                r2_pose = "cower"
                r2_sx = rog_scale * lerp(0.12, 1.55, fall)
                r2_sy = rog_scale * 1.55
                r2_sz = rog_scale * lerp(1.35, 0.08, fall)
                
            rogue2.location = Vector((r2_x, r2_y, r2_z))
            rogue2.rotation_euler.z = r2_yaw
            rogue2.rotation_euler.x = r2_pitch
            rogue2.scale = Vector((r2_sx, r2_sy, r2_sz))
            rogue2.keyframe_insert(data_path="location", frame=f)
            rogue2.keyframe_insert(data_path="rotation_euler", frame=f)
            rogue2.keyframe_insert(data_path="scale", frame=f)
            rogue2.keyframe_insert(data_path="hide_render", frame=f)
            
            p_data = solve_pose(r2_pose, f)
            apply_pose_to_char("Rogue2", p_data)

        # ---------------------------------------------------------
        # 7. Gold Coin (handled for Level 1 & 2)
        # ---------------------------------------------------------
        if coin:
            if f < 105:
                coin.location = Vector((0.0, -1.1, -1.0))
            elif f < 171:
                coin.location = Vector((0.0, -1.1, ped_z + 1.15))
            elif f < 202:
                coin.location = Vector((-0.5 + 0.22, -0.5, 0.95))
            elif f < 212:
                t = prog(f, 202, 212)
                coin.location = Vector((lerp(-0.5, 0.0, t) + 0.22, -0.5, 0.95 + hop_h))
            elif f < 255:
                coin.location = Vector((0.18, -0.55, 0.9))
            elif f < 305: # Dropped from goblin
                coin.location = Vector((0.45, -0.5, 0.05))
            elif f < 360: # Respawns on pedestal cushion!
                coin.location = Vector((0.0, -1.1, ped_z + 1.15))
            elif f < 381: # Held by Rogue 1
                coin.location = Vector((-0.5 + 0.22, -0.5, 0.95))
            elif f < 515: # Carried with Rogue 1
                coin.location = Vector((r1_x + 0.2, -0.5, r1_z + 0.8))
            elif f < 555: # Vanishes with Rogue 1
                coin.location = Vector((0.0, -1.1, -1.0))
            elif f < 705: # Respawns on pedestal cushion for Rogue 2!
                coin.location = Vector((0.0, -1.1, ped_z + 1.15))
            elif f < 790: # Carried by Rogue 2
                coin.location = Vector((r2_x + 0.2, -0.5, r2_z + 0.8))
            else: # Dropped on floor after boot punt
                coin.location = Vector((0.35, -0.5, 0.05))
            coin.keyframe_insert(data_path="location", frame=f)

    print("Level 1 & Level 2 Animation Keyframing Complete.")
'''

# Find def animate_level_1() and replace it with animate_scene_levels
import re
pattern = r"def animate_level_1\(\):[\s\S]+?def clean_scene\(\):"
replacement = l2_animation_code + "\ndef clean_scene():"

code = re.sub(pattern, replacement, code, count=1)

# In setup_episode3_scene, build Rogue1 and Rogue2 and call animate_scene_levels
old_setup = """def setup_episode3_scene():
    print("Building Full Episode 3 Scene in Blender...")
    clean_scene()
    build_diorama_hall()
    build_crush_room_props()
    build_chibi_character("goblin", "Goblin")
    setup_camera_animation()
    animate_level_1()
    print("Episode 3 Setup & Animation Complete.")"""

new_setup = """def setup_episode3_scene():
    print("Building Full Episode 3 Scene in Blender...")
    clean_scene()
    build_diorama_hall()
    build_crush_room_props()
    build_chibi_character("goblin", "Goblin")
    build_chibi_character("rogue", "Rogue1")
    build_chibi_character("rogue", "Rogue2")
    setup_camera_animation()
    animate_scene_levels()
    print("Episode 3 Setup & Animation Complete.")"""

code = code.replace(old_setup, new_setup)

with open('scripts/blender_simforge_cw.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Successfully injected Level 2 animation into blender_simforge_cw.py!")
