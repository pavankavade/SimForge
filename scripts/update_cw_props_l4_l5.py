import os

props_replacement = '''    # 10. Spell Orb (Arcane Energy Sphere)
    orb_root = bpy.data.objects.get("Spell_Orb_Root")
    if not orb_root:
        orb_root = bpy.data.objects.new("Spell_Orb_Root", None)
        orb_root.empty_display_type = 'PLAIN_AXES'
        orb_root.parent = room_root
        crush_col.objects.link(orb_root)
    orb_root.location = (0.0, -0.6, 1.25)
    for c in list(orb_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
    orb_core = make_sphere("Spell_Orb_Core", 0.22, center=(0, 0, 0), mat=make_glow_mat("SpellCoreWhite", "#ffffff", 14.0), ink=False, collection=crush_col)
    orb_core.parent = orb_root
    orb_mesh = make_sphere("Spell_Orb_Mesh", 0.42, center=(0, 0, 0), mat=make_glow_mat("SpellViolet", "#bf40ff", 8.0), ink=False, collection=crush_col)
    orb_mesh.parent = orb_root
    orb_root.hide_render = True
    orb_root.hide_viewport = True
    orb_core.hide_render = True
    orb_core.hide_viewport = True
    orb_mesh.hide_render = True
    orb_mesh.hide_viewport = True

    # 11. Arcane Deflection Mirrors (Mounted on inner wall faces)
    # Mirror L (mounted on Wall_L_Root, facing +X)
    mirror_l_root = bpy.data.objects.get("Arcane_Mirror_L")
    if not mirror_l_root:
        mirror_l_root = bpy.data.objects.new("Arcane_Mirror_L", None)
        mirror_l_root.empty_display_type = 'PLAIN_AXES'
        mirror_l_root.parent = wall_l_root
        crush_col.objects.link(mirror_l_root)
    mirror_l_root.location = (0.04, -0.7, 1.65)
    for c in list(mirror_l_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
    m_l_frame = make_box("Mirror_L_Frame", 0.05, 1.55, 1.85, center=(0, 0, 0), mat=make_vinyl_mat("MirrorGoldFrame", "#f2c14e", "gloss"), ink=True, collection=crush_col)
    m_l_frame.parent = mirror_l_root
    m_l_glass = make_box("Mirror_L_Glass", 0.06, 1.40, 1.70, center=(0.01, 0, 0), mat=mat_mirror, ink=False, collection=crush_col)
    m_l_glass.parent = mirror_l_root
    m_l_rune = make_box("Mirror_L_Rune", 0.07, 0.65, 0.65, center=(0.02, 0, 0), mat=make_glow_mat("MirrorRuneL", "#55f0ff", 6.0), ink=False, collection=crush_col)
    m_l_rune.parent = mirror_l_root
    mirror_l_root.hide_render = True
    mirror_l_root.hide_viewport = True
    for c in mirror_l_root.children:
        c.hide_render = True
        c.hide_viewport = True

    # Mirror R (mounted on Wall_R_Root, facing -X)
    mirror_r_root = bpy.data.objects.get("Arcane_Mirror_R")
    if not mirror_r_root:
        mirror_r_root = bpy.data.objects.new("Arcane_Mirror_R", None)
        mirror_r_root.empty_display_type = 'PLAIN_AXES'
        mirror_r_root.parent = wall_r_root
        crush_col.objects.link(mirror_r_root)
    mirror_r_root.location = (-0.04, -0.7, 1.65)
    for c in list(mirror_r_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
    m_r_frame = make_box("Mirror_R_Frame", 0.05, 1.55, 1.85, center=(0, 0, 0), mat=make_vinyl_mat("MirrorGoldFrame", "#f2c14e", "gloss"), ink=True, collection=crush_col)
    m_r_frame.parent = mirror_r_root
    m_r_glass = make_box("Mirror_R_Glass", 0.06, 1.40, 1.70, center=(-0.01, 0, 0), mat=mat_mirror, ink=False, collection=crush_col)
    m_r_glass.parent = mirror_r_root
    m_r_rune = make_box("Mirror_R_Rune", 0.07, 0.65, 0.65, center=(-0.02, 0, 0), mat=make_glow_mat("MirrorRuneR", "#55f0ff", 6.0), ink=False, collection=crush_col)
    m_r_rune.parent = mirror_r_root
    mirror_r_root.hide_render = True
    mirror_r_root.hide_viewport = True
    for c in mirror_r_root.children:
        c.hide_render = True
        c.hide_viewport = True

    # 12. Mage Ash Pile (Charred hat + purple glowing ash mound in Lane 4)
    ash_root = bpy.data.objects.get("Mage_AshPile_Root")
    if not ash_root:
        ash_root = bpy.data.objects.new("Mage_AshPile_Root", None)
        ash_root.empty_display_type = 'PLAIN_AXES'
        ash_root.parent = room_root
        crush_col.objects.link(ash_root)
    ash_root.location = (-0.95, -0.9, 0.06)
    for c in list(ash_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
    ash_mound = make_sphere("Ash_Mound", 0.45, center=(0, 0, 0.02), scale=(1.2, 0.9, 0.22), mat=make_vinyl_mat("AshCharcoal", "#1a1622", "skin"), ink=False, collection=crush_col)
    ash_mound.parent = ash_root
    ash_ember1 = make_sphere("Ash_Ember1", 0.05, center=(0.12, 0.08, 0.06), mat=make_glow_mat("AshEmber1", "#b040ff", 5.0), ink=False, collection=crush_col)
    ash_ember1.parent = ash_root
    ash_ember2 = make_sphere("Ash_Ember2", 0.04, center=(-0.15, -0.06, 0.05), mat=make_glow_mat("AshEmber2", "#d470ff", 6.0), ink=False, collection=crush_col)
    ash_ember2.parent = ash_root
    # Collapsed charred wizard hat
    hat_brim = make_cylinder("Ash_Hat_Brim", 0.36, 0.03, center=(0, 0, 0.06), rot=(0.25, 0.35, -0.4), mat=make_vinyl_mat("CharredHat", "#241d2e", "cloth"), ink=True, collection=crush_col)
    hat_brim.parent = ash_root
    hat_crown = make_cone("Ash_Hat_Crown", 0.20, 0.42, center=(0.08, -0.06, 0.18), rot=(0.55, 0.5, -0.7), mat=make_vinyl_mat("CharredHat", "#241d2e", "cloth"), ink=True, collection=crush_col)
    hat_crown.parent = ash_root
    ash_root.hide_render = True
    ash_root.hide_viewport = True
    for c in ash_root.children:
        c.hide_render = True
        c.hide_viewport = True

    # 13. High-Speed Room Rails (Floor of hall, stationary so room slides OVER them)
    rails_root = bpy.data.objects.get("HighSpeed_Rails_Root")
    if not rails_root:
        rails_root = bpy.data.objects.new("HighSpeed_Rails_Root", None)
        rails_root.empty_display_type = 'PLAIN_AXES'
        crush_col.objects.link(rails_root)
    rails_root.location = (0, 0, 0)
    for c in list(rails_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
    # Twin steel rails
    for ry in [-1.45, 0.15]:
        r_bar = make_box(f"Rail_Bar_{ry}", 16.0, 0.10, 0.08, center=(-2.5, ry, 0.04), mat=mat_steel, ink=False, collection=crush_col)
        r_bar.parent = rails_root
    # Wooden cross-ties
    for i, tx in enumerate([x * 0.75 - 8.5 for x in range(16)]):
        tie = make_box(f"Rail_Tie_{i}", 0.22, 1.95, 0.05, center=(tx, -0.65, 0.025), mat=mat_wood, ink=True, collection=crush_col)
        tie.parent = rails_root
    rails_root.hide_render = False
    rails_root.hide_viewport = False

    # 14. Pet Mimic (Mounted atop ceiling chute at x=0, y=-0.6, z=3.65, parented to room_root)
    mimic_root = bpy.data.objects.get("Mimic_Chest_Root")
    if not mimic_root:
        mimic_root = bpy.data.objects.new("Mimic_Chest_Root", None)
        mimic_root.empty_display_type = 'PLAIN_AXES'
        mimic_root.parent = room_root
        crush_col.objects.link(mimic_root)
    mimic_root.location = (0.0, -0.6, 3.65)
    for c in list(mimic_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
    
    m_body = make_box("Mimic_Body", 1.05, 0.75, 0.55, center=(0, 0, 0.275), mat=mat_wood, ink=True, collection=crush_col)
    m_body.parent = mimic_root
    m_trim = make_box("Mimic_Trim", 1.08, 0.78, 0.12, center=(0, 0, 0.50), mat=mat_gold, ink=True, collection=crush_col)
    m_trim.parent = mimic_root
    teeth_bot = make_box("Mimic_Teeth_Bot", 0.95, 0.06, 0.18, center=(0, 0.35, 0.58), mat=mat_teeth, ink=True, collection=crush_col)
    teeth_bot.parent = mimic_root
    m_tongue = make_cone("Mimic_Tongue", 0.18, 0.52, center=(0, 0.55, 0.48), rot=(math.pi/2 - 0.2, 0, 0), scale=(1.2, 0.45, 1.0), mat=make_vinyl_mat("MimicTongue", "#d43f3f", "cloth"), ink=True, collection=crush_col)
    m_tongue.parent = mimic_root

    lid_pivot = bpy.data.objects.get("Mimic_Lid_Pivot")
    if not lid_pivot:
        lid_pivot = bpy.data.objects.new("Mimic_Lid_Pivot", None)
        lid_pivot.empty_display_type = 'PLAIN_AXES'
        lid_pivot.parent = mimic_root
        crush_col.objects.link(lid_pivot)
    lid_pivot.location = (0, -0.36, 0.55)
    for c in list(lid_pivot.children):
        bpy.data.objects.remove(c, do_unlink=True)
    m_lid = make_box("Mimic_Lid", 1.06, 0.76, 0.35, center=(0, 0.36, 0.175), mat=mat_wood, ink=True, collection=crush_col)
    m_lid.parent = lid_pivot
    teeth_top = make_box("Mimic_Teeth_Top", 0.95, 0.06, 0.18, center=(0, 0.70, 0.05), mat=mat_teeth, ink=True, collection=crush_col)
    teeth_top.parent = lid_pivot
    # Big googly cartoon eyes on top lid
    for side, ex in [(-1, -0.25), (1, 0.25)]:
        eye_w = make_sphere(f"Mimic_EyeWhite_{'L' if side < 0 else 'R'}", 0.12, center=(ex, 0.45, 0.38), mat=make_vinyl_mat("MimicEyeWhite", "#ffffff", "gloss"), ink=True, collection=crush_col)
        eye_w.parent = lid_pivot
        eye_p = make_sphere(f"Mimic_EyePupil_{'L' if side < 0 else 'R'}", 0.06, center=(ex, 0.54, 0.38), mat=make_vinyl_mat("MimicEyePupil", "#111115", "gloss"), ink=False, collection=crush_col)
        eye_p.parent = lid_pivot

    mimic_root.hide_render = True
    mimic_root.hide_viewport = True
    for c in mimic_root.children:
        c.hide_render = True
        c.hide_viewport = True
    for c in lid_pivot.children:
        c.hide_render = True
        c.hide_viewport = True

    # 15. Ten-Foot Pole (Carried by Rogue 3 outside doorway)
    pole_obj = make_cylinder("TenFootPole", 0.028, 3.4, center=(0, 0, 0), rot=(0, math.pi/2, 0), mat=mat_wood, ink=True, collection=crush_col)
    pole_obj.parent = room_root
    pole_obj.hide_render = True
    pole_obj.hide_viewport = True
'''

with open('scripts/blender_simforge_cw.py', 'r', encoding='utf-8') as f:
    text = f.read()

text_norm = text.replace('\r\n', '\n')

# Find start of section 10: "    # 10. Spell Orb (Hidden during L1)"
start_idx = text_norm.find("    # 10. Spell Orb (Hidden during L1)")
# Find end of props: "# ---------------------------------------------------------------------------"
end_marker = "# ---------------------------------------------------------------------------\n# Chibi Character Rig & Generator"
end_idx = text_norm.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_text = text_norm[:start_idx] + props_replacement + "\n" + text_norm[end_idx:]
    with open('scripts/blender_simforge_cw.py', 'w', encoding='utf-8', newline='\n') as f:
        f.write(new_text)
    print("SUCCESS: Updated build_crush_room_props in blender_simforge_cw.py")
else:
    print(f"FAILED to find markers: start={start_idx}, end={end_idx}")
