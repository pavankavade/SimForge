with open('scripts/blender_simforge_cw.py', 'r', encoding='utf-8') as f:
    text = f.read()

legacy_block = """    # 9. Paladin Cube (Hidden during L1)
    cube_obj = make_box("Paladin_Cube", 0.6, 0.6, 0.6, center=(1.15, 0.8, 0.3), mat=mat_steel, ink=True, collection=crush_col)
    cube_obj.parent = room_root
    cube_obj.hide_render = True
    cube_obj.hide_viewport = True
    cube_crest = make_box("Cube_Crest", 0.25, 0.25, 0.08, center=(1.15, 0.8, 0.64), mat=mat_gold, ink=True, collection=crush_col)
    cube_crest.parent = room_root
    cube_crest.hide_render = True
    cube_crest.hide_viewport = True
"""

text_norm = text.replace('\r\n', '\n')
legacy_norm = legacy_block.replace('\r\n', '\n')

if legacy_norm in text_norm:
    text_norm = text_norm.replace(legacy_norm, '')
    with open('scripts/blender_simforge_cw.py', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text_norm)
    print("SUCCESS: Removed legacy cube block")
else:
    print("WARNING: legacy block not matched")
