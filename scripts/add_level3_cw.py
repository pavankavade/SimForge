import re

with open("scripts/blender_simforge_cw.py", "r", encoding="utf-8") as f:
    code = f.read()

# -------------------------------------------------------------
# 1. Add Level 3 Props to setup_episode3_scene()
# -------------------------------------------------------------
l3_props_code = '''    # ---------------------------------------------------------
    # Level 3 Props: Steel Beam, Hydraulic Presses, Electric Coils, Paladin Cube
    # ---------------------------------------------------------
    # Steel I-Beam
    beam_root = bpy.data.objects.get("Beam_Root")
    if not beam_root:
        beam_root = bpy.data.objects.new("Beam_Root", None)
        beam_root.empty_display_type = 'PLAIN_AXES'
        beam_root.parent = room_root
        crush_col.objects.link(beam_root)
    for c in list(beam_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
        
    mat_beam_steel = make_vinyl_mat("BeamSteel", "#505864", "metal")
    mat_hazard_yellow = make_vinyl_mat("HazardYellow", "#e0b020", "gloss")
    mat_hazard_black = make_vinyl_mat("HazardBlack", "#1a1a1a", "gloss")
    mat_electric_blue = make_glow_mat("ElectricArc", "#4df0ff", 8.0)
    
    # I-Beam flanges and web
    beam_web = make_box("Beam_Web", 1.86, 0.08, 0.32, center=(0, 0, 0), mat=mat_beam_steel, ink=True, collection=crush_col)
    beam_web.parent = beam_root
    beam_top = make_box("Beam_TopFlange", 1.86, 0.30, 0.06, center=(0, 0, 0.16), mat=mat_beam_steel, ink=True, collection=crush_col)
    beam_top.parent = beam_root
    beam_bot = make_box("Beam_BotFlange", 1.86, 0.30, 0.06, center=(0, 0, -0.16), mat=mat_beam_steel, ink=True, collection=crush_col)
    beam_bot.parent = beam_root
    beam_root.location = Vector((0.0, -0.6, 0.95))
    beam_root.hide_render = True
    beam_root.hide_viewport = True

    # Twin 500-Ton Hydraulic Presses (Mounted on back sides of walls)
    for side, sx, name in [(-1, -1, "L"), (1, 1, "R")]:
        press_root = bpy.data.objects.get(f"HydraulicPress_{name}")
        if not press_root:
            press_root = bpy.data.objects.new(f"HydraulicPress_{name}", None)
            press_root.empty_display_type = 'PLAIN_AXES'
            press_root.parent = wall_l_root if side < 0 else wall_r_root
            crush_col.objects.link(press_root)
        for c in list(press_root.children):
            bpy.data.objects.remove(c, do_unlink=True)
            
        # Heavy hydraulic cylinder body
        cyl_body = make_cylinder(f"HydroBody_{name}", 0.32, 1.4, center=(sx * 0.9, 0.1, 1.65), rot=(0, math.radians(90), 0), mat=mat_hazard_yellow, ink=True, collection=crush_col)
        cyl_body.parent = press_root
        # Chrome piston rod
        piston = make_cylinder(f"HydroPiston_{name}", 0.18, 0.9, center=(sx * 0.25, 0.1, 1.65), rot=(0, math.radians(90), 0), mat=make_vinyl_mat("ChromePiston", "#c8d0d8", "metal"), ink=True, collection=crush_col)
        piston.parent = press_root
        # Hazard stripe bands
        for hx in [0.6, 1.1]:
            band = make_cylinder(f"HydroStripe_{name}_{hx}", 0.33, 0.18, center=(sx * hx, 0.1, 1.65), rot=(0, math.radians(90), 0), mat=mat_hazard_black, ink=False, collection=crush_col)
            band.parent = press_root
            
        press_root.hide_render = True
        press_root.hide_viewport = True

    # Electric Lightning Arcs (Glowing cyan jagged geometry bridging walls)
    electric_root = bpy.data.objects.get("Electric_Arcs")
    if not electric_root:
        electric_root = bpy.data.objects.new("Electric_Arcs", None)
        electric_root.empty_display_type = 'PLAIN_AXES'
        electric_root.parent = room_root
        crush_col.objects.link(electric_root)
    for c in list(electric_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
        
    arc1 = make_cylinder("Arc_Beam1", 0.035, 1.85, center=(0, -0.6, 0.95), rot=(0, math.radians(90), 0), mat=mat_electric_blue, ink=False, collection=crush_col)
    arc1.parent = electric_root
    arc2 = make_cylinder("Arc_Beam2", 0.025, 1.60, center=(0, -0.55, 1.35), rot=(math.radians(15), math.radians(90), 0), mat=mat_electric_blue, ink=False, collection=crush_col)
    arc2.parent = electric_root
    electric_root.hide_render = True
    electric_root.hide_viewport = True

    # Paladin Cube (Charred folded metal cube with Paladin crest)
    pal_cube = bpy.data.objects.get("Paladin_Cube")
    if not pal_cube:
        pal_cube = bpy.data.objects.new("Paladin_Cube", None)
        pal_cube.empty_display_type = 'PLAIN_AXES'
        pal_cube.parent = room_root
        crush_col.objects.link(pal_cube)
    for c in list(pal_cube.children):
        bpy.data.objects.remove(c, do_unlink=True)
        
    cube_box = make_box("Paladin_Cube_Body", 0.52, 0.52, 0.52, center=(0, 0, 0), mat=make_vinyl_mat("CharredArmor", "#30343a", "metal"), ink=True, collection=crush_col)
    cube_box.parent = pal_cube
    # Embedded crest & gold trim
    cube_crest = make_box("Paladin_Cube_Crest", 0.12, 0.36, 0.18, center=(0, -0.15, 0.28), mat=make_vinyl_mat("CubeGold", "#f2c14e", "gloss"), ink=True, collection=crush_col)
    cube_crest.parent = pal_cube
    cube_visor = make_box("Paladin_Cube_Visor", 0.32, 0.08, 0.08, center=(0, -0.27, 0.08), mat=make_vinyl_mat("CubeVisor", "#151515", "metal"), ink=True, collection=crush_col)
    cube_visor.parent = pal_cube
    pal_cube.location = Vector((1.15, -0.7, 0.26))
    pal_cube.hide_render = True
    pal_cube.hide_viewport = True
'''

# Find insertion point before "# 5. Loot Pedestal" or after boot assembly
if "# 5. Loot Pedestal" in code:
    code = code.replace("# 5. Loot Pedestal", l3_props_code + "\n    # 5. Loot Pedestal")
    print("Injected Level 3 Props into setup_episode3_scene()!")
else:
    print("Could not find '# 5. Loot Pedestal'!")

# -------------------------------------------------------------
# 2. Add Paladin1 character build in setup_episode3_scene()
# -------------------------------------------------------------
pal_char_code = '''    # Level 3 Character: Paladin 1
    build_chibi_character("paladin", "Paladin1", char_col)
'''
if 'build_chibi_character("rogue", "Rogue2", char_col)' in code:
    code = code.replace('build_chibi_character("rogue", "Rogue2", char_col)', 'build_chibi_character("rogue", "Rogue2", char_col)\n' + pal_char_code)
    print("Injected Paladin1 character creation!")
else:
    print("Could not find Rogue2 character creation!")

# -------------------------------------------------------------
# 3. Add Level 3 Camera Waypoints to setup_camera_animation()
# -------------------------------------------------------------
l3_cams = '''        # Level 3
        (873,  -0.8, 1.5, 9.5, 0.0),
        (915,  0.0, 1.6, 9.5, 0.0),
        (990,  0.0, 1.45, 8.5, 0.0),
        (1053, 0.0, 1.35, 7.8, 0.0),
        (1143, 0.0, 1.25, 7.2, 0.0),
        (1218, 0.0, 1.85, 11.0, 0.0),
        (1296, 0.0, 1.75, 10.5, 0.0),
        (1356, 0.0, 1.60, 9.5, 0.0),
        (1437, 0.0, 1.40, 8.5, 0.0),
        (1539, 0.0, 1.35, 8.0, 0.0),
        (1602, 0.0, 1.20, 7.2, 0.0),
        (1656, 0.0, 1.15, 7.2, 0.0),
        (1705, 0.0, 1.15, 7.5, 0.0),'''

if '(869, 0.0, 1.15, 6.8, 0.0),' in code:
    code = code.replace('(869, 0.0, 1.15, 6.8, 0.0),', '(869, 0.0, 1.15, 6.8, 0.0),\n' + l3_cams)
    print("Injected Level 3 Camera Waypoints!")
else:
    print("Could not find frame 869 camera waypoint!")

with open("scripts/blender_simforge_cw.py", "w", encoding="utf-8") as f:
    f.write(code)

print("Props and cameras for Level 3 ready.")
