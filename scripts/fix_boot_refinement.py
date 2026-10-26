import re

with open("scripts/blender_simforge_cw.py", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update boot creation in setup_episode3_scene
old_boot_create = '''    boot = make_box("Ceiling_SpringBoot", 0.35, 0.65, 0.45, center=(0.0, -0.7, 3.75), mat=make_vinyl_mat("BootLeather", "#4a2c16", "leather"), ink=True, collection=crush_col)
    boot.parent = room_root
    boot.hide_render = True
    boot.hide_viewport = True'''

new_boot_create = '''    # Spring Boot Assembly
    boot_root = bpy.data.objects.get("Ceiling_SpringBoot")
    if not boot_root:
        boot_root = bpy.data.objects.new("Ceiling_SpringBoot", None)
        boot_root.empty_display_type = 'PLAIN_AXES'
        boot_root.parent = room_root
        crush_col.objects.link(boot_root)
    
    # Clean previous children of boot_root
    for child in list(boot_root.children):
        bpy.data.objects.remove(child, do_unlink=True)
        
    mat_boot_leather = make_vinyl_mat("BootLeather", "#3a1e0b", "leather")
    mat_boot_cuff = make_vinyl_mat("BootCuff", "#8b1e1e", "cloth")
    mat_spring_metal = make_vinyl_mat("SpringMetal", "#717a84", "metal")
    
    # Shoe: main foot box extending forward
    boot_foot = make_box("Boot_Foot", 0.38, 0.68, 0.32, center=(0.0, 0.08, 0.0), mat=mat_boot_leather, ink=True, collection=crush_col)
    boot_foot.parent = boot_root
    # Toe bump
    boot_toe = make_cylinder("Boot_Toe", 0.18, 0.36, center=(0.0, 0.36, -0.04), rot=(0, math.radians(90), 0), mat=mat_boot_leather, ink=True, collection=crush_col)
    boot_toe.parent = boot_root
    # Sole: dark rubber bottom
    boot_sole = make_box("Boot_Sole", 0.40, 0.72, 0.08, center=(0.0, 0.08, -0.16), mat=make_vinyl_mat("BootSole", "#1a1a1a", "leather"), ink=True, collection=crush_col)
    boot_sole.parent = boot_root
    # Cuff: rim collar on top
    boot_cuff = make_box("Boot_Cuff", 0.36, 0.36, 0.15, center=(0.0, -0.06, 0.22), mat=mat_boot_cuff, ink=True, collection=crush_col)
    boot_cuff.parent = boot_root
    # Spring Piston: extending upward to chimney
    boot_spring = make_cylinder("Boot_Spring", 0.14, 0.85, center=(0.0, -0.06, 0.68), mat=mat_spring_metal, ink=True, collection=crush_col)
    boot_spring.parent = boot_root
    
    boot = boot_root
    boot.location = Vector((0.0, -0.7, 3.75))
    boot.hide_render = True
    boot.hide_viewport = True'''

if old_boot_create in code:
    code = code.replace(old_boot_create, new_boot_create)
    print("Replaced boot creation with Spring Boot Assembly!")
else:
    print("Could not find old_boot_create, searching pattern...")

# 2. Update boot animation in animate_scene_levels
old_boot_anim = '''        # Boot
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
            boot.keyframe_insert(data_path="hide_render", frame=f)'''

new_boot_anim = '''        # Boot
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
                boot.hide_render = False
                boot.hide_viewport = False
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
                boot_z = lerp(3.75, 1.65, t)
            elif f < 805: # Retract
                boot.hide_render = False
                boot.hide_viewport = False
                t = prog(f, 793, 805)
                boot_z = lerp(1.65, 3.75, ease_in_out(t))
            else:
                boot.hide_render = True
                boot.hide_viewport = True
                boot_z = 3.75
            boot.location = Vector((0.0, -0.7, boot_z))
            boot.keyframe_insert(data_path="location", frame=f)
            boot.keyframe_insert(data_path="hide_render", frame=f)
            for child in boot.children:
                child.hide_render = boot.hide_render
                child.hide_viewport = boot.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)'''

if old_boot_anim in code:
    code = code.replace(old_boot_anim, new_boot_anim)
    print("Replaced boot animation with child hide/show propagation!")
else:
    print("Could not find old_boot_anim!")

with open("scripts/blender_simforge_cw.py", "w", encoding="utf-8") as f:
    f.write(code)
print("Updated blender_simforge_cw.py successfully.")
