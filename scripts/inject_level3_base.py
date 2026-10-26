with open("scripts/blender_simforge_cw.py", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add Paladin1 build call in setup_episode3_scene
old_char_calls = '''    build_chibi_character("goblin", "Goblin")
    build_chibi_character("rogue", "Rogue1")
    build_chibi_character("rogue", "Rogue2")'''

new_char_calls = '''    build_chibi_character("goblin", "Goblin")
    build_chibi_character("rogue", "Rogue1")
    build_chibi_character("rogue", "Rogue2")
    build_chibi_character("paladin", "Paladin1")'''

if old_char_calls in code:
    code = code.replace(old_char_calls, new_char_calls)
    print("Added Paladin1 character build to setup_episode3_scene!")
else:
    print("Could not find old_char_calls!")

# 2. Add Level 3 objects to animate_scene_levels
old_anim_header = '''def animate_scene_levels():
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
    
    animated_objs = [wall_l, wall_r, pedestal, coin, goblin, rogue1, rogue2, plates_l, plates_r, chimney, boot]'''

new_anim_header = '''def animate_scene_levels():
    print("Animating Episode 3: Level 1, Level 2, Level 3...")
    
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
    paladin1 = bpy.data.objects.get("Paladin1_Root")
    beam = bpy.data.objects.get("Beam_Root")
    press_l = bpy.data.objects.get("HydraulicPress_L")
    press_r = bpy.data.objects.get("HydraulicPress_R")
    electric_arcs = bpy.data.objects.get("Electric_Arcs")
    pal_cube = bpy.data.objects.get("Paladin_Cube")
    
    animated_objs = [wall_l, wall_r, pedestal, coin, goblin, rogue1, rogue2, plates_l, plates_r, chimney, boot, paladin1, beam, press_l, press_r, electric_arcs, pal_cube]'''

if old_anim_header in code:
    code = code.replace(old_anim_header, new_anim_header)
    print("Updated animated_objs list in animate_scene_levels!")
else:
    print("Could not find old_anim_header!")

# 3. Update the loop range and wall animation for Level 3
old_range_start = '''    cfg_gob = CLASS_CONFIGS["goblin"]
    cfg_rog = CLASS_CONFIGS["rogue"]
    gob_scale = cfg_gob["scale"]
    rog_scale = cfg_rog["scale"]
    
    for f in range(0, 870):'''

new_range_start = '''    cfg_gob = CLASS_CONFIGS["goblin"]
    cfg_rog = CLASS_CONFIGS["rogue"]
    cfg_pal = CLASS_CONFIGS["paladin"]
    gob_scale = cfg_gob["scale"]
    rog_scale = cfg_rog["scale"]
    pal_scale = cfg_pal["scale"]
    
    for f in range(0, 1710):'''

if old_range_start in code:
    code = code.replace(old_range_start, new_range_start)
    print("Updated loop range to 1710 frames!")
else:
    print("Could not find old_range_start!")

# 4. Update wall_inner for Level 3
old_wall_inner = '''        elif f < 835:
            t = prog(f, 826, 835)
            inner = lerp(0.90, 0.06, ease_in_cubic(t))
        elif f < 849:
            inner = 0.06
        else: # Reopen after Rogue 2 pancake
            t = prog(f, 849, 860)
            inner = lerp(0.06, 1.8, ease_in_out(t))'''

new_wall_inner = '''        elif f < 835:
            t = prog(f, 826, 835)
            inner = lerp(0.90, 0.06, ease_in_cubic(t))
        elif f < 849:
            inner = 0.06
        elif f < 870: # Reopen after Rogue 2 pancake
            t = prog(f, 849, 860)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        # --- Level 3 Walls ---
        elif f < 978:
            inner = 1.8
        elif f < 1017: # Closes toward wedged steel beam
            t = prog(f, 978, 1017)
            inner = lerp(1.8, 1.25, ease_in_out(t))
        elif f < 1437: # Locked against beam!
            inner = 1.25
        elif f < 1593: # Circuit completes, pressing firmly
            t = prog(f, 1437, 1488)
            inner = lerp(1.25, 1.20, ease_in_out(t))
        elif f < 1623: # 500-ton hydraulic press crushes through beam!
            t = prog(f, 1593, 1623)
            inner = lerp(1.20, 0.28, ease_in_cubic(t))
        elif f < 1677: # Holds cube
            inner = 0.28
        else: # Reopen to 1.8 leaving cube on floor
            t = prog(f, 1677, 1705)
            inner = lerp(0.28, 1.8, ease_in_out(t))'''

if old_wall_inner in code:
    code = code.replace(old_wall_inner, new_wall_inner)
    print("Updated wall inner positions for Level 3!")
else:
    print("Could not find old_wall_inner!")

with open("scripts/blender_simforge_cw.py", "w", encoding="utf-8") as f:
    f.write(code)

print("Level 3 wall keyframing base updated.")
