import os

# We will construct the complete replacement for setup_camera_animation, animate_scene_levels, and setup_episode3_scene

full_code = '''def setup_camera_animation():
    cam_obj = bpy.data.objects.get("Camera")
    if not cam_obj:
        return
        
    cam_obj.animation_data_clear()
    
    waypoints = [
        # Level 1
        (0,    0.0, 2.0, 14.5, 1.0),
        (101,  0.0, 1.5, 10.0, 0.0),
        (141, -0.8, 1.5,  9.5, 0.0),
        (198,  0.0, 1.35, 8.2, 0.0),
        (234,  0.0, 1.25, 7.4, 0.0),
        (257,  0.0, 1.15, 6.6, 0.0),
        (291,  0.0, 1.0,  6.4, 0.0),
        # Level 2
        (360, -0.8, 1.5,  9.5, 0.0),
        (381,  0.0, 1.85, 10.5, 0.0),
        (453,  0.0, 2.3, 10.5, 0.0),
        (486,  0.4, 3.6, 10.0, 0.0),
        (515,  0.4, 3.4, 10.0, 0.0),
        (529,  0.0, 1.6,  9.0, 0.0),
        (621,  0.0, 3.3,  9.0, 0.0),
        (651,  0.0, 2.2,  9.0, 0.0),
        (705, -0.8, 1.5,  9.5, 0.0),
        (721,  0.0, 1.85, 10.5, 0.0),
        (790,  0.0, 2.0, 10.0, 0.0),
        (800,  0.0, 1.4,  9.0, 0.0),
        (829,  0.0, 1.15, 6.8, 0.0),
        (869,  0.0, 1.15, 6.8, 0.0),
        # Level 3
        (873,  -0.8, 1.5,  9.5, 0.0),
        (915,   0.0, 1.6,  9.5, 0.0),
        (990,   0.0, 1.45, 8.5, 0.0),
        (1053,  0.0, 1.35, 7.8, 0.0),
        (1143,  0.0, 1.25, 7.2, 0.0),
        (1218,  0.0, 1.85, 11.0, 0.0),
        (1296,  0.0, 1.75, 10.5, 0.0),
        (1356,  0.0, 1.60, 9.5, 0.0),
        (1437,  0.0, 1.40, 8.5, 0.0),
        (1539,  0.0, 1.35, 8.0, 0.0),
        (1602,  0.0, 1.20, 7.2, 0.0),
        (1656,  0.0, 1.15, 7.2, 0.0),
        (1705,  0.0, 1.15, 7.5, 0.0),
        # Level 4: Mage Teleport & Arcane Pong
        (1706, -0.8, 1.5,  9.5, 0.0),
        (1781,  0.0, 1.45, 8.5, 0.0),
        (1838, -2.2, 1.4,  8.5, 0.0),
        (1879,  0.0, 1.6, 10.2, 0.0),
        (1957,  0.0, 1.6,  9.5, 0.0),
        (2007,  0.0, 1.45, 8.5, 0.0),
        (2037,  0.0, 1.4,  8.0, 0.0),
        (2091,  0.0, 1.35, 7.5, 0.0),
        (2172,  0.0, 1.25, 6.8, 0.0),
        (2250,  0.0, 1.15, 6.5, 0.0),
        (2298,  0.0, 1.15, 6.5, 0.0),
        (2316,  0.0, 1.15, 7.5, 0.0),
        # Level 5: Paranoid Party & Room Lunge
        (2346, -4.8, 1.45, 9.5, 0.0),
        (2454, -4.8, 1.35, 8.8, 0.0),
        (2526, -2.8, 1.6, 11.5, 0.0),
        (2637, -4.2, 1.35, 8.8, 0.0),
        (2709, -2.5, 1.5, 11.0, 0.0),
        (2760, -5.5, 1.5,  9.5, 0.0),
        (2826, -5.5, 2.5, 11.0, 0.0),
        (2907, -5.5, 3.4,  9.0, 0.0),
        (2939,  0.0, 1.6, 14.5, 1.0),
        (3109,  0.0, 1.6, 14.5, 1.0),
    ]
    
    for f, wx, wy, dist, rise in waypoints:
        cam_x = wx
        cam_y = -0.6 + dist
        cam_z = wy + rise
        
        target = Vector((wx, -0.6, wy))
        loc = Vector((cam_x, cam_y, cam_z))
        direction = target - loc
        quat = direction.to_track_quat('-Z', 'Y')
        
        cam_obj.location = loc
        cam_obj.rotation_mode = 'QUATERNION'
        cam_obj.rotation_quaternion = quat
        
        cam_obj.keyframe_insert(data_path="location", frame=f)
        cam_obj.keyframe_insert(data_path="rotation_quaternion", frame=f)


def animate_scene_levels():
    print("Animating Episode 3: Complete 5-Level Sequence (0 -> 3109)...")
    
    wall_l = bpy.data.objects.get("Wall_L_Root")
    wall_r = bpy.data.objects.get("Wall_R_Root")
    gate_l = bpy.data.objects.get("Wall_L_DropGate")
    pedestal = bpy.data.objects.get("Pedestal_Root")
    coin = bpy.data.objects.get("Coin_Root")
    goblin = bpy.data.objects.get("Goblin_Root")
    rogue1 = bpy.data.objects.get("Rogue1_Root")
    rogue2 = bpy.data.objects.get("Rogue2_Root")
    plates_l = bpy.data.objects.get("Wall_L_Plates")
    plates_r = bpy.data.objects.get("Wall_R_Plates")
    chimney = bpy.data.objects.get("Ceiling_Chimney")
    boot = bpy.data.objects.get("Ceiling_SpringBoot")
    paladin1 = bpy.data.objects.get("Paladin1_Root")
    beam = bpy.data.objects.get("Beam_Root")
    press_l = bpy.data.objects.get("HydraulicPress_L")
    press_r = bpy.data.objects.get("HydraulicPress_R")
    electric_arcs = bpy.data.objects.get("Electric_Arcs")
    pal_cube = bpy.data.objects.get("Paladin_Cube")
    
    mage1 = bpy.data.objects.get("Mage1_Root")
    mage2 = bpy.data.objects.get("Mage2_Root")
    mirror_l = bpy.data.objects.get("Arcane_Mirror_L")
    mirror_r = bpy.data.objects.get("Arcane_Mirror_R")
    spell_orb = bpy.data.objects.get("Spell_Orb_Root")
    mage_ash = bpy.data.objects.get("Mage_AshPile_Root")
    
    room_root = bpy.data.objects.get("CrushRoom_Root")
    goblin2 = bpy.data.objects.get("Goblin2_Root")
    rogue3 = bpy.data.objects.get("Rogue3_Root")
    mage3 = bpy.data.objects.get("Mage3_Root")
    pole = bpy.data.objects.get("TenFootPole")
    mimic = bpy.data.objects.get("Mimic_Chest_Root")
    mimic_lid = bpy.data.objects.get("Mimic_Lid_Pivot")
    mimic_tongue = bpy.data.objects.get("Mimic_Tongue")
    
    animated_objs = [
        wall_l, wall_r, gate_l, pedestal, coin, goblin, rogue1, rogue2,
        plates_l, plates_r, chimney, boot, paladin1, beam, press_l, press_r,
        electric_arcs, pal_cube, mage1, mage2, mirror_l, mirror_r,
        spell_orb, mage_ash, room_root, goblin2, rogue3, mage3, pole,
        mimic, mimic_lid, mimic_tongue
    ]
    for obj in animated_objs:
        if obj:
            obj.animation_data_clear()
            
    cfg_gob = CLASS_CONFIGS["goblin"]
    cfg_rog = CLASS_CONFIGS["rogue"]
    cfg_pal = CLASS_CONFIGS["paladin"]
    cfg_mag = CLASS_CONFIGS["mage"]
    gob_scale = cfg_gob["scale"]
    rog_scale = cfg_rog["scale"]
    pal_scale = cfg_pal["scale"]
    mag_scale = cfg_mag["scale"]
    
    for f in range(0, 3110):
        # ---------------------------------------------------------
        # 0. CrushRoom_Root (Stationary during L1-L4, lunges on rails in L5)
        # ---------------------------------------------------------
        if room_root:
            if f < 2709:
                rx = 0.0
            elif f < 2760: # Lunges along rails from 0.0 to -6.5
                t = prog(f, 2709, 2760)
                rx = lerp(0.0, -6.5, ease_in_cubic(t))
            elif f < 2915: # Holds at -6.5 engulfing party and launching them
                rx = -6.5
            elif f < 2939: # Rolls smoothly back along rails to 0.0
                t = prog(f, 2915, 2939)
                rx = lerp(-6.5, 0.0, ease_in_out(t))
            else: # Centered for hero establishing shot!
                rx = 0.0
            room_root.location.x = rx
            room_root.keyframe_insert(data_path="location", index=0, frame=f)

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
        # --- Level 2 Walls ---
        elif f < 453: # Parkour jumps between walls
            t = prog(f, 381, 453)
            inner = lerp(1.8, 0.72, ease_in_out(t))
        elif f < 523: # Crushes shut in Level 2 escape
            t = prog(f, 453, 523)
            inner = lerp(0.72, 0.06, ease_in_cubic(t))
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
        elif f < 1705: # Reopens for Level 4
            t = prog(f, 1677, 1705)
            inner = lerp(0.28, 1.8, ease_in_out(t))
        # --- Level 4 Walls: Pong Sequence ---
        elif f < 2091: # Mirrors install & Mage 2 entry
            inner = 1.8
        elif f < 2298: # High-speed Pong: walls close steadily down to 0.06
            t = prog(f, 2091, 2298)
            inner = lerp(1.8, 0.06, t)
        elif f < 2310: # Slammed shut on orb implosion
            inner = 0.06
        elif f < 2330: # Reopens revealing ash pile in Lane 4
            t = prog(f, 2310, 2330)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        else: # Stays open for Level 5
            inner = 1.8
            
        if wall_l:
            wall_l.location.x = -inner
            wall_l.keyframe_insert(data_path="location", index=0, frame=f)
        if wall_r:
            wall_r.location.x = inner
            wall_r.keyframe_insert(data_path="location", index=0, frame=f)

        # Front Drop Gate
        if gate_l:
            if f < 2709:
                gz = 1.2
            elif f < 2730: # Opens high as room lunges
                t = prog(f, 2709, 2730)
                gz = lerp(1.2, 2.8, ease_out_back(t))
            elif f < 2778:
                gz = 2.8
            elif f < 2795: # Slams shut trapping party
                t = prog(f, 2778, 2795)
                gz = lerp(2.8, 0.0, ease_in_cubic(t))
            else:
                gz = 0.0
            gate_l.location.z = gz
            gate_l.keyframe_insert(data_path="location", index=2, frame=f)

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
            plates_l.keyframe_insert(data_path="location", index=2, frame=f)
            plates_r.keyframe_insert(data_path="location", index=2, frame=f)
            plates_l.keyframe_insert(data_path="hide_render", frame=f)
            plates_r.keyframe_insert(data_path="hide_render", frame=f)

        # Chimney
        if chimney:
            if f < 621:
                chimney.hide_render = True
                chimney.hide_viewport = True
                chimney.location.z = 6.0
            elif f < 651:
                t = prog(f, 621, 651)
                chimney.hide_render = False
                chimney.hide_viewport = False
                chimney.location.z = lerp(6.0, 2.9, ease_out_back(t))
            else:
                chimney.hide_render = False
                chimney.hide_viewport = False
                chimney.location.z = 2.9
            chimney.keyframe_insert(data_path="location", index=2, frame=f)
            chimney.keyframe_insert(data_path="hide_render", frame=f)
            
        # SpringBoot
        if boot:
            if f < 651:
                boot.hide_render = True
                boot.hide_viewport = True
                boot_z = 3.75
            elif f < 660: # Demo extension
                t = prog(f, 651, 660)
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = lerp(3.75, 2.45, ease_out_bounce(t))
            elif f < 685: # Retracts back into chimney
                t = prog(f, 660, 685)
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = lerp(2.45, 3.75, ease_in_out(t))
            elif f < 791: # Armed in chimney
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = 3.75
            elif f < 794: # Punts Rogue 2 downward!
                t = prog(f, 791, 794)
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = lerp(3.75, 1.25, ease_in_cubic(t))
            elif f < 815: # Retracts
                t = prog(f, 794, 815)
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = lerp(1.25, 3.75, ease_in_out(t))
            else:
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = 3.75
            boot.location.z = boot_z
            boot.keyframe_insert(data_path="location", index=2, frame=f)
            boot.keyframe_insert(data_path="hide_render", frame=f)
            for child in boot.children:
                child.hide_render = boot.hide_render
                child.hide_viewport = boot.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # 3. Pedestal
        # ---------------------------------------------------------
        if pedestal:
            if f < 101:
                ped_z = -1.5
            elif f < 171:
                t = prog(f, 101, 171)
                ped_z = lerp(-1.5, 0.0, ease_out_back(t))
            elif f < 255:
                ped_z = 0.0
            elif f < 275:
                t = prog(f, 255, 275)
                ped_z = lerp(0.0, -1.5, ease_in_cubic(t))
            else:
                ped_z = 0.0
            pedestal.location.z = ped_z
            pedestal.keyframe_insert(data_path="location", index=2, frame=f)

        # ---------------------------------------------------------
        # 4. Goblin 1 (L1 victim -> Permanent pancake in Lane 1)
        # ---------------------------------------------------------
        if goblin:
            if f < 131:
                goblin.hide_render = True
                goblin.hide_viewport = True
                gob_x, gob_y, gob_z = -10.2, -0.6, 0.0
                yaw = math.radians(90)
                pose = "run"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 198:
                goblin.hide_render = False
                goblin.hide_viewport = False
                t = prog(f, 131, 198)
                gob_x = lerp(-10.2, -0.5, t)
                gob_y, gob_z = -0.6, 0.0
                yaw = math.radians(90)
                pose = "run"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 228:
                gob_x, gob_y, gob_z = -0.5, -0.6, 0.0
                yaw = math.radians(60) if f < 212 else 0.0
                pose = "cheer" if f < 212 else "point"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 255:
                gob_x, gob_y, gob_z = 0.0, -0.6, 0.0
                yaw = 0.0
                pose = "cower"
                squeeze = clamp(inner / (0.36 * gob_scale), 0.12, 1.0)
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
            else: # Stays dead flat in pancake lane 1!
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
            elif f < 453: # Parkour wall jumps
                t = prog(f, 381, 453)
                k = min(3, int(t * 4))
                local = t * 4 - k
                side = 1 if k % 2 == 0 else -1
                reach = max(0.2, inner - 0.28)
                from_x = -0.5 if k == 0 else -side * reach
                to_x = side * reach
                r1_x = lerp(from_x, to_x, local)
                r1_y = -0.6
                r1_z = lerp(k * 0.72, (k + 1) * 0.72, local)
                r1_yaw = math.radians(90 if side > 0 else -90)
                r1_pose = "jump"
            elif f < 515: # Ceiling chimney hang & gloat
                r1_x = 0.0
                r1_y = -0.6
                r1_z = 3.25
                r1_yaw = 0.0
                r1_pose = "cheer" if f > 480 else "point"
            else: # Escapes through chimney
                r1_x = 0.0
                r1_y = -0.6
                r1_z = 6.0
                rogue1.hide_render = True
                rogue1.hide_viewport = True
                r1_yaw = 0.0
                r1_pose = "idle"
                
            rogue1.location = Vector((r1_x, r1_y, r1_z))
            rogue1.rotation_euler.z = r1_yaw
            rogue1.keyframe_insert(data_path="location", frame=f)
            rogue1.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            rogue1.keyframe_insert(data_path="hide_render", frame=f)
            for child in rogue1.children:
                child.keyframe_insert(data_path="hide_render", frame=f)
            
            p_data = solve_pose(r1_pose, f)
            apply_pose_to_char("Rogue1", p_data)

        # ---------------------------------------------------------
        # 6. Rogue 2 (Punted by spring boot -> Permanent pancake 2 in Lane 2)
        # ---------------------------------------------------------
        if rogue2:
            if f < 665:
                rogue2.hide_render = True
                rogue2.hide_viewport = True
                r2_x, r2_y, r2_z = -12.0, -0.6, 0.0
                r2_yaw = math.radians(90)
                r2_pose = "run"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 705:
                rogue2.hide_render = False
                rogue2.hide_viewport = False
                t = prog(f, 665, 705)
                r2_x = lerp(-10.2, -0.5, t)
                r2_y, r2_z = -0.6, 0.0
                r2_yaw = math.radians(90)
                r2_pose = "run"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 721:
                r2_x, r2_y, r2_z = -0.5, -0.6, 0.0
                r2_yaw = 0.0
                r2_pose = "point"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 791: # Parkour jump up chimney
                t = prog(f, 721, 791)
                r2_x = lerp(-0.5, 0.0, t)
                r2_y = -0.6
                r2_z = lerp(0.0, 1.25, t)
                r2_yaw = 0.0
                r2_pose = "jump"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 794: # Boot impact!
                r2_x, r2_y = 0.0, -0.6
                r2_z = 1.25
                r2_yaw = 0.0
                r2_pose = "cower"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 798: # Driven down to floor
                t = prog(f, 794, 798)
                r2_x, r2_y = 0.0, -0.6
                r2_z = lerp(1.25, 0.0, t)
                r2_yaw = 0.0
                r2_pose = "cower"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 829:
                r2_x, r2_y, r2_z = 0.0, -0.6, 0.0
                r2_yaw = 0.0
                r2_pose = "cower"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 835: # Walls crush Rogue 2 into pancake
                r2_x, r2_y, r2_z = 0.0, -0.6, 0.0
                r2_yaw = 0.0
                r2_pose = "cower"
                squeeze = clamp(inner / (0.36 * rog_scale), 0.12, 1.0)
                r2_sx = rog_scale * squeeze
                r2_sy = rog_scale
                r2_sz = rog_scale * lerp(1.0, 1.35, 1.0 - squeeze)
            elif f < 849: # Squeezed wafer
                r2_x, r2_y, r2_z = 0.15, -0.6, 0.0
                r2_yaw = 0.0
                r2_pose = "cower"
                r2_sx = rog_scale * 0.12
                r2_sy = rog_scale
                r2_sz = rog_scale * 1.35
            else: # Wobble and flop flat into lane 2
                fall = ease_in_out(prog(f, 849, 860))
                r2_x = lerp(0.15, 0.75, fall)
                r2_y = lerp(-0.6, 0.0, fall)
                r2_z = 0.03
                r2_yaw = 0.0
                r2_pose = "cower"
                r2_sx = rog_scale * lerp(0.12, 1.55, fall)
                r2_sy = rog_scale * 1.55
                r2_sz = rog_scale * lerp(1.35, 0.08, fall)
                
            rogue2.location = Vector((r2_x, r2_y, r2_z))
            rogue2.rotation_euler.z = r2_yaw
            rogue2.scale = Vector((r2_sx, r2_sy, r2_sz))
            rogue2.keyframe_insert(data_path="location", frame=f)
            rogue2.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            rogue2.keyframe_insert(data_path="scale", frame=f)
            rogue2.keyframe_insert(data_path="hide_render", frame=f)
            for child in rogue2.children:
                child.keyframe_insert(data_path="hide_render", frame=f)
            
            p_data = solve_pose(r2_pose, f)
            apply_pose_to_char("Rogue2", p_data)

        # ---------------------------------------------------------
        # Level 3: Paladin 1 (Wedges Beam -> Folded Cube)
        # ---------------------------------------------------------
        if paladin1:
            if f < 873:
                paladin1.hide_render = True
                paladin1.hide_viewport = True
                p_x, p_y, p_z = -12.0, -0.6, 0.0
                p_yaw = math.radians(90)
                p_pose = "run"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 915:
                paladin1.hide_render = False
                paladin1.hide_viewport = False
                t = prog(f, 873, 915)
                p_x = lerp(-10.2, -0.6, t)
                p_y, p_z = -0.6, 0.0
                p_yaw = math.radians(90)
                p_pose = "run"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 990:
                p_x, p_y, p_z = -0.6, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "shield"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1017: # Wedges beam overhead
                t = prog(f, 990, 1017)
                p_x = lerp(-0.6, 0.0, t)
                p_y, p_z = -0.6, 0.0
                p_yaw = 0.0
                p_pose = "cast"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1437: # Smug brace under wedged beam
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "cheer" if f > 1143 else "cast"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1539: # Shock as circuit completes!
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "cower"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1593: # High-voltage electrocution jitter!
                p_x = 0.0 + (0.04 if (f % 2 == 0) else -0.04)
                p_y, p_z = -0.6, 0.0
                p_yaw = 0.05 if (f % 4 < 2) else -0.05
                p_pose = "cower"
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

        # Steel Beam
        if beam:
            if f < 990:
                beam.hide_render = True
                beam.hide_viewport = True
                bz = 0.0
            elif f < 1017: # Lifted up and wedged
                t = prog(f, 990, 1017)
                beam.hide_render = False
                beam.hide_viewport = False
                bz = lerp(0.0, 0.95, ease_out_back(t))
            elif f < 1593: # Locked wedged between walls
                beam.hide_render = False
                beam.hide_viewport = False
                bz = 0.95
            elif f < 1623: # Crushed into cube with Paladin
                t = prog(f, 1593, 1623)
                beam.hide_render = False
                beam.hide_viewport = False
                beam.scale.x = lerp(1.0, 0.22, ease_in_cubic(t))
                beam.keyframe_insert(data_path="scale", index=0, frame=f)
                bz = 0.95
            else:
                beam.hide_render = True
                beam.hide_viewport = True
                bz = 0.95
            beam.location.z = bz
            beam.keyframe_insert(data_path="location", index=2, frame=f)
            beam.keyframe_insert(data_path="hide_render", frame=f)
            for child in beam.children:
                child.hide_render = beam.hide_render
                child.hide_viewport = beam.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # Hydraulic Presses L & R
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

        # Electric Arcs
        if electric_arcs:
            if 1488 <= f < 1593:
                electric_arcs.hide_render = False
                electric_arcs.hide_viewport = False
                electric_arcs.scale.y = 1.0 + (0.35 if (f % 2 == 0) else -0.35)
                electric_arcs.location.z = 0.95 + (0.05 if (f % 3 == 0) else -0.05)
                electric_arcs.keyframe_insert(data_path="scale", index=1, frame=f)
                electric_arcs.keyframe_insert(data_path="location", index=2, frame=f)
            else:
                electric_arcs.hide_render = True
                electric_arcs.hide_viewport = True
            electric_arcs.keyframe_insert(data_path="hide_render", frame=f)
            for child in electric_arcs.children:
                child.hide_render = electric_arcs.hide_render
                child.hide_viewport = electric_arcs.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # Paladin Cube (Permanent corpse in Lane 3)
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
                cx = lerp(0.0, 1.22, ease_in_out(t))
                cy = lerp(-0.6, -0.9, ease_in_out(t))
                cz = lerp(0.95, 0.26, ease_out_bounce(t))
                cube_loc = Vector((cx, cy, cz))
            else: # Resting permanently on floor beside pancakes!
                pal_cube.hide_render = False
                pal_cube.hide_viewport = False
                cube_loc = Vector((1.22, -0.9, 0.26))
            pal_cube.location = cube_loc
            pal_cube.keyframe_insert(data_path="location", frame=f)
            pal_cube.keyframe_insert(data_path="hide_render", frame=f)
            for child in pal_cube.children:
                child.hide_render = pal_cube.hide_render
                child.hide_viewport = pal_cube.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # Level 4: Mage 1 (Teleports through wall, gloats)
        # ---------------------------------------------------------
        if mage1:
            if f < 1706:
                mage1.hide_render = True
                mage1.hide_viewport = True
                m1_x, m1_y, m1_z = -12.0, -0.6, 0.0
                m1_yaw = math.radians(90)
                m1_pose = "run"
            elif f < 1763: # Enters
                mage1.hide_render = False
                mage1.hide_viewport = False
                t = prog(f, 1706, 1763)
                m1_x = lerp(-10.2, -0.5, t)
                m1_y, m1_z = -0.6, 0.0
                m1_yaw = math.radians(90)
                m1_pose = "run"
            elif f < 1781:
                m1_x, m1_y, m1_z = -0.5, -0.6, 0.0
                m1_yaw = 0.0
                m1_pose = "idle"
            elif f < 1823: # Casts teleport!
                m1_x, m1_y, m1_z = -0.5, -0.6, 0.0
                m1_yaw = 0.0
                m1_pose = "cast"
            elif f < 1838: # Blinks out!
                mage1.hide_render = True
                mage1.hide_viewport = True
                m1_x, m1_y, m1_z = -0.5, -0.6, 0.0
                m1_yaw = 0.0
                m1_pose = "idle"
            elif f < 1870: # Reappears outside right wall, gloating!
                mage1.hide_render = False
                mage1.hide_viewport = False
                m1_x, m1_y, m1_z = -2.6, -0.6, 0.0
                m1_yaw = math.radians(-30)
                m1_pose = "point" if f < 1855 else "cheer"
            else: # Exits stage right
                mage1.hide_render = True
                mage1.hide_viewport = True
                m1_x, m1_y, m1_z = -2.6, -0.6, 0.0
                m1_yaw = 0.0
                m1_pose = "idle"
                
            mage1.location = Vector((m1_x, m1_y, m1_z))
            mage1.rotation_euler.z = m1_yaw
            mage1.keyframe_insert(data_path="location", frame=f)
            mage1.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            mage1.keyframe_insert(data_path="hide_render", frame=f)
            for child in mage1.children:
                child.hide_render = mage1.hide_render
                child.hide_viewport = mage1.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)
            p_data = solve_pose(m1_pose, f)
            apply_pose_to_char("Mage1", p_data)

        # ---------------------------------------------------------
        # Level 4: Arcane Mirrors L & R
        # ---------------------------------------------------------
        if mirror_l and mirror_r:
            if f < 1915:
                mirror_l.hide_render = True
                mirror_l.hide_viewport = True
                mirror_r.hide_render = True
                mirror_r.hide_viewport = True
                mz = 4.0
            elif f < 1978: # Drop and unfold into place
                mirror_l.hide_render = False
                mirror_l.hide_viewport = False
                mirror_r.hide_render = False
                mirror_r.hide_viewport = False
                t = prog(f, 1915, 1978)
                mz = lerp(4.0, 1.65, ease_out_back(t))
            else:
                mirror_l.hide_render = False
                mirror_l.hide_viewport = False
                mirror_r.hide_render = False
                mirror_r.hide_viewport = False
                mz = 1.65
            mirror_l.location.z = mz
            mirror_r.location.z = mz
            mirror_l.keyframe_insert(data_path="location", index=2, frame=f)
            mirror_r.keyframe_insert(data_path="location", index=2, frame=f)
            mirror_l.keyframe_insert(data_path="hide_render", frame=f)
            mirror_r.keyframe_insert(data_path="hide_render", frame=f)
            for child in mirror_l.children:
                child.hide_render = mirror_l.hide_render
                child.hide_viewport = mirror_l.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)
            for child in mirror_r.children:
                child.hide_render = mirror_r.hide_render
                child.hide_viewport = mirror_r.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # Level 4: Mage 2 (Victim: casts spell, pong bounce -> vaporized)
        # ---------------------------------------------------------
        if mage2:
            if f < 1996:
                mage2.hide_render = True
                mage2.hide_viewport = True
                m2_x, m2_y, m2_z = -12.0, -0.6, 0.0
                m2_yaw = math.radians(90)
                m2_pose = "run"
            elif f < 2037: # Enters
                mage2.hide_render = False
                mage2.hide_viewport = False
                t = prog(f, 1996, 2037)
                m2_x = lerp(-10.2, 0.0, t)
                m2_y, m2_z = -0.6, 0.0
                m2_yaw = math.radians(90)
                m2_pose = "run"
            elif f < 2070: # Casts teleport!
                m2_x, m2_y, m2_z = 0.0, -0.6, 0.0
                m2_yaw = 0.0
                m2_pose = "cast"
            elif f < 2298: # Trapped in center cowering as orb bounces
                m2_x, m2_y, m2_z = 0.0, -0.6, 0.0
                m2_yaw = 0.15 * math.sin(f * 0.4)
                m2_pose = "cower"
            else: # Vaporized! Replaced by Mage_AshPile
                mage2.hide_render = True
                mage2.hide_viewport = True
                m2_x, m2_y, m2_z = 0.0, -0.6, 0.0
                m2_yaw = 0.0
                m2_pose = "cower"
                
            mage2.location = Vector((m2_x, m2_y, m2_z))
            mage2.rotation_euler.z = m2_yaw
            mage2.keyframe_insert(data_path="location", frame=f)
            mage2.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            mage2.keyframe_insert(data_path="hide_render", frame=f)
            for child in mage2.children:
                child.hide_render = mage2.hide_render
                child.hide_viewport = mage2.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)
            p_data = solve_pose(m2_pose, f)
            apply_pose_to_char("Mage2", p_data)

        # ---------------------------------------------------------
        # Level 4: Spell Orb (Pong bouncing trajectory)
        # ---------------------------------------------------------
        if spell_orb:
            if f < 2070:
                spell_orb.hide_render = True
                spell_orb.hide_viewport = True
                orb_loc = Vector((0.0, -0.6, 1.35))
                orb_sq = 1.0
            elif f < 2091: # Emerges from staff
                spell_orb.hide_render = False
                spell_orb.hide_viewport = False
                t = prog(f, 2070, 2091)
                orb_loc = Vector((lerp(0.0, 0.8, t), -0.6, 1.35))
                orb_sq = 1.0
            elif f < 2298: # Accelerated Pong bouncing between walls!
                spell_orb.hide_render = False
                spell_orb.hide_viewport = False
                u = prog(f, 2091, 2298)
                reach_w = max(0.05, inner - 0.22)
                phi = 2.0 * math.pi * (u + 4.5 * u * u + 8.0 * u * u * u)
                ox = reach_w * math.sin(phi)
                oz = 1.35 + 0.22 * math.cos(1.5 * phi)
                orb_loc = Vector((ox, -0.6, oz))
                orb_sq = 1.0
            elif f < 2306: # Implosion blast!
                spell_orb.hide_render = False
                spell_orb.hide_viewport = False
                t = prog(f, 2298, 2306)
                orb_loc = Vector((0.0, -0.6, 1.35))
                orb_sq = lerp(1.5, 0.02, t)
            else:
                spell_orb.hide_render = True
                spell_orb.hide_viewport = True
                orb_loc = Vector((0.0, -0.6, 1.35))
                orb_sq = 0.01
            spell_orb.location = orb_loc
            spell_orb.scale = Vector((orb_sq, orb_sq, orb_sq))
            spell_orb.keyframe_insert(data_path="location", frame=f)
            spell_orb.keyframe_insert(data_path="scale", frame=f)
            spell_orb.keyframe_insert(data_path="hide_render", frame=f)
            for child in spell_orb.children:
                child.hide_render = spell_orb.hide_render
                child.hide_viewport = spell_orb.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # Level 4: Mage Ash Pile (Permanent corpse in Lane 4)
        # ---------------------------------------------------------
        if mage_ash:
            if f < 2298:
                mage_ash.hide_render = True
                mage_ash.hide_viewport = True
            else:
                mage_ash.hide_render = False
                mage_ash.hide_viewport = False
            mage_ash.keyframe_insert(data_path="hide_render", frame=f)
            for child in mage_ash.children:
                child.hide_render = mage_ash.hide_render
                child.hide_viewport = mage_ash.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # Level 5: Paranoid Party (Goblin 2, Rogue 3, Mage 3)
        # ---------------------------------------------------------
        if goblin2:
            if f < 2346:
                goblin2.hide_render = True
                goblin2.hide_viewport = True
                g2_x, g2_y, g2_z = -5.8, -0.6, 0.0
                g2_yaw = math.radians(90)
                g2_pose = "cower"
            elif f < 2709: # Standing outside doorway
                goblin2.hide_render = False
                goblin2.hide_viewport = False
                g2_x, g2_y, g2_z = -5.8, -0.6, 0.0
                g2_yaw = math.radians(75)
                g2_pose = "cower"
            elif f < 2760: # Swallowed into room!
                goblin2.hide_render = False
                goblin2.hide_viewport = False
                t = prog(f, 2709, 2760)
                g2_x = lerp(-5.8, -6.8, t)
                g2_y, g2_z = -0.6, 0.0
                g2_yaw = 0.0
                g2_pose = "cower"
            elif f < 2826: # Trapped in room
                g2_x, g2_y, g2_z = -6.8, -0.6, 0.0
                g2_yaw = 0.0
                g2_pose = "cower"
            elif f < 2895: # Blasted up chimney chute into Mimic!
                t = prog(f, 2826, 2895)
                g2_x = -6.5
                g2_y = -0.6
                g2_z = lerp(0.0, 4.2, t)
                g2_yaw = math.radians(f * 8)
                g2_pose = "jump"
            else: # Swallowed by Mimic!
                goblin2.hide_render = True
                goblin2.hide_viewport = True
                g2_x, g2_y, g2_z = -6.5, -0.6, 4.2
                g2_yaw = 0.0
                g2_pose = "idle"
            goblin2.location = Vector((g2_x, g2_y, g2_z))
            goblin2.rotation_euler.z = g2_yaw
            goblin2.keyframe_insert(data_path="location", frame=f)
            goblin2.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            goblin2.keyframe_insert(data_path="hide_render", frame=f)
            for child in goblin2.children:
                child.hide_render = goblin2.hide_render
                child.hide_viewport = goblin2.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)
            p_data = solve_pose(g2_pose, f)
            apply_pose_to_char("Goblin2", p_data)

        if rogue3:
            if f < 2346:
                rogue3.hide_render = True
                rogue3.hide_viewport = True
                r3_x, r3_y, r3_z = -5.1, -0.6, 0.0
                r3_yaw = math.radians(90)
                r3_pose = "idle"
            elif f < 2637: # Standing holding pole
                rogue3.hide_render = False
                rogue3.hide_viewport = False
                r3_x, r3_y, r3_z = -5.1, -0.6, 0.0
                r3_yaw = math.radians(90)
                r3_pose = "point" if f > 2454 else "idle"
            elif f < 2709: # Poking floor with pole
                r3_x, r3_y, r3_z = -5.1, -0.6, 0.0
                r3_yaw = math.radians(90)
                r3_pose = "point"
            elif f < 2760: # Swallowed into room!
                rogue3.hide_render = False
                rogue3.hide_viewport = False
                t = prog(f, 2709, 2760)
                r3_x = lerp(-5.1, -6.5, t)
                r3_y, r3_z = -0.6, 0.0
                r3_yaw = 0.0
                r3_pose = "cower"
            elif f < 2826:
                r3_x, r3_y, r3_z = -6.5, -0.6, 0.0
                r3_yaw = 0.0
                r3_pose = "cower"
            elif f < 2895: # Blasted up chute!
                t = prog(f, 2826, 2895)
                r3_x = -6.5
                r3_y = -0.6
                r3_z = lerp(0.0, 4.2, t)
                r3_yaw = math.radians(f * 9)
                r3_pose = "jump"
            else: # Swallowed by Mimic!
                rogue3.hide_render = True
                rogue3.hide_viewport = True
                r3_x, r3_y, r3_z = -6.5, -0.6, 4.2
                r3_yaw = 0.0
                r3_pose = "idle"
            rogue3.location = Vector((r3_x, r3_y, r3_z))
            rogue3.rotation_euler.z = r3_yaw
            rogue3.keyframe_insert(data_path="location", frame=f)
            rogue3.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            rogue3.keyframe_insert(data_path="hide_render", frame=f)
            for child in rogue3.children:
                child.hide_render = rogue3.hide_render
                child.hide_viewport = rogue3.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)
            p_data = solve_pose(r3_pose, f)
            apply_pose_to_char("Rogue3", p_data)

        # Ten-Foot Pole
        if pole:
            if f < 2346:
                pole.hide_render = True
                pole.hide_viewport = True
            elif f < 2454: # Held upright
                pole.hide_render = False
                pole.hide_viewport = False
                pole.location = Vector((-5.0, -0.6, 1.4))
                pole.rotation_euler = (0, math.radians(75), 0)
            elif f < 2637: # Lowered horizontally
                pole.hide_render = False
                pole.hide_viewport = False
                t = prog(f, 2454, 2520)
                pole.location = Vector((lerp(-5.0, -4.5, t), -0.6, lerp(1.4, 0.45, t)))
                pole.rotation_euler = (0, lerp(math.radians(75), 0.0, t), 0)
            elif f < 2709: # Reaches forward touching tile!
                t = prog(f, 2637, 2685)
                pole.location = Vector((lerp(-4.5, -3.8, t), -0.6, 0.25))
                pole.rotation_euler = (0, 0, 0)
            else: # Knocked away / swallowed
                pole.hide_render = True
                pole.hide_viewport = True
            pole.keyframe_insert(data_path="location", frame=f)
            pole.keyframe_insert(data_path="rotation_euler", frame=f)
            pole.keyframe_insert(data_path="hide_render", frame=f)

        if mage3:
            if f < 2346:
                mage3.hide_render = True
                mage3.hide_viewport = True
                m3_x, m3_y, m3_z = -6.4, -0.6, 0.0
                m3_yaw = math.radians(90)
                m3_pose = "idle"
            elif f < 2709: # Watching party
                mage3.hide_render = False
                mage3.hide_viewport = False
                m3_x, m3_y, m3_z = -6.4, -0.6, 0.0
                m3_yaw = math.radians(70)
                m3_pose = "idle"
            elif f < 2760: # Swallowed into room!
                mage3.hide_render = False
                mage3.hide_viewport = False
                t = prog(f, 2709, 2760)
                m3_x = lerp(-6.4, -6.2, t)
                m3_y, m3_z = -0.6, 0.0
                m3_yaw = 0.0
                m3_pose = "cower"
            elif f < 2826:
                m3_x, m3_y, m3_z = -6.2, -0.6, 0.0
                m3_yaw = 0.0
                m3_pose = "cower"
            elif f < 2895: # Blasted up chute!
                t = prog(f, 2826, 2895)
                m3_x = -6.5
                m3_y = -0.6
                m3_z = lerp(0.0, 4.2, t)
                m3_yaw = math.radians(f * 7)
                m3_pose = "jump"
            else: # Swallowed by Mimic!
                mage3.hide_render = True
                mage3.hide_viewport = True
                m3_x, m3_y, m3_z = -6.5, -0.6, 4.2
                m3_yaw = 0.0
                m3_pose = "idle"
            mage3.location = Vector((m3_x, m3_y, m3_z))
            mage3.rotation_euler.z = m3_yaw
            mage3.keyframe_insert(data_path="location", frame=f)
            mage3.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            mage3.keyframe_insert(data_path="hide_render", frame=f)
            for child in mage3.children:
                child.hide_render = mage3.hide_render
                child.hide_viewport = mage3.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)
            p_data = solve_pose(m3_pose, f)
            apply_pose_to_char("Mage3", p_data)

        # ---------------------------------------------------------
        # Level 5: Pet Mimic Chest
        # ---------------------------------------------------------
        if mimic and mimic_lid:
            if f < 2529:
                mimic.hide_render = True
                mimic.hide_viewport = True
                lid_rot_x = 0.0
                m_scale = Vector((1.0, 1.0, 1.0))
            elif f < 2826: # Dormant atop chute
                mimic.hide_render = False
                mimic.hide_viewport = False
                lid_rot_x = 0.0
                m_scale = Vector((1.0, 1.0, 1.0))
            elif f < 2850: # Opens wide maw!
                mimic.hide_render = False
                mimic.hide_viewport = False
                t = prog(f, 2826, 2850)
                lid_rot_x = lerp(0.0, -1.15, ease_out_back(t))
                m_scale = Vector((1.0, 1.0, 1.0))
            elif f < 2907: # Open, waiting for lunch
                mimic.hide_render = False
                mimic.hide_viewport = False
                lid_rot_x = -1.15
                m_scale = Vector((1.0, 1.0, 1.0))
            elif f < 2915: # CHOMPS shut!
                mimic.hide_render = False
                mimic.hide_viewport = False
                t = prog(f, 2907, 2915)
                lid_rot_x = lerp(-1.15, 0.0, ease_in_cubic(t))
                m_scale = Vector((1.0, 1.0, 1.0))
            elif f < 2930: # Comical swallow bulge & squash!
                mimic.hide_render = False
                mimic.hide_viewport = False
                lid_rot_x = 0.0
                t = prog(f, 2915, 2930)
                sq_z = lerp(0.72, 1.0, ease_out_bounce(t))
                sq_xy = lerp(1.15, 1.0, ease_out_bounce(t))
                m_scale = Vector((sq_xy, sq_xy, sq_z))
            else: # Proud and happy
                mimic.hide_render = False
                mimic.hide_viewport = False
                lid_rot_x = 0.0
                m_scale = Vector((1.0, 1.0, 1.0))
                
            mimic.scale = m_scale
            mimic_lid.rotation_euler.x = lid_rot_x
            mimic.keyframe_insert(data_path="scale", frame=f)
            mimic.keyframe_insert(data_path="hide_render", frame=f)
            mimic_lid.keyframe_insert(data_path="rotation_euler", index=0, frame=f)
            for child in mimic.children:
                child.hide_render = mimic.hide_render
                child.hide_viewport = mimic.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)
            for child in mimic_lid.children:
                child.hide_render = mimic.hide_render
                child.hide_viewport = mimic.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # Gold Coin
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
                coin.location = Vector((lerp(-0.5, 0.0, t) + 0.22, -0.5, 0.95))
            elif f < 255:
                coin.location = Vector((0.18, -0.55, 0.9))
            elif f < 305:
                coin.location = Vector((0.45, -0.5, 0.05))
            elif f < 360:
                coin.location = Vector((0.0, -1.1, ped_z + 1.15))
            elif f < 381:
                coin.location = Vector((-0.5 + 0.22, -0.5, 0.95))
            elif f < 515:
                coin.location = Vector((r1_x + 0.2, -0.5, r1_z + 0.8))
            elif f < 555:
                coin.location = Vector((0.0, -1.1, -1.0))
            elif f < 705:
                coin.location = Vector((0.0, -1.1, ped_z + 1.15))
            elif f < 790:
                coin.location = Vector((r2_x + 0.2, -0.5, r2_z + 0.8))
            elif f < 1705:
                coin.location = Vector((0.35, -0.5, 0.05))
            elif f < 1763:
                coin.location = Vector((0.0, -1.1, ped_z + 1.15))
            elif f < 1823:
                coin.location = Vector((m1_x + 0.2, -0.5, 0.85))
            else:
                coin.location = Vector((0.0, -1.1, -1.0))
            coin.keyframe_insert(data_path="location", frame=f)

    print("Complete Episode 3 Animation Keyframing (0 -> 3109) Finished.")


def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    for obj in bpy.context.selected_objects:
        if obj.type not in ['CAMERA']:
            bpy.data.objects.remove(obj, do_unlink=True)
    for m in bpy.data.meshes:
        if m.users == 0:
            bpy.data.meshes.remove(m)


def setup_episode3_scene():
    print("Building Full Episode 3 Scene in Blender...")
    clean_scene()
    build_diorama_hall()
    build_crush_room_props()
    build_chibi_character("goblin", "Goblin")
    build_chibi_character("rogue", "Rogue1")
    build_chibi_character("rogue", "Rogue2")
    build_chibi_character("paladin", "Paladin1")
    build_chibi_character("mage", "Mage1")
    build_chibi_character("mage", "Mage2")
    build_chibi_character("goblin", "Goblin2")
    build_chibi_character("rogue", "Rogue3")
    build_chibi_character("mage", "Mage3")
    setup_camera_animation()
    animate_scene_levels()
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = 3109
    print("Episode 3 Setup & Animation Complete.")


if __name__ == "__main__":
    setup_episode3_scene()
'''

with open('scripts/blender_simforge_cw.py', 'r', encoding='utf-8') as f:
    text = f.read()

text_norm = text.replace('\r\n', '\n')

marker = "def setup_camera_animation():"
idx = text_norm.find(marker)

if idx != -1:
    new_script = text_norm[:idx] + full_code
    with open('scripts/blender_simforge_cw.py', 'w', encoding='utf-8', newline='\n') as f:
        f.write(new_script)
    print("SUCCESS: blender_simforge_cw.py updated with complete 5-level animation!")
else:
    print("ERROR: marker def setup_camera_animation not found!")
