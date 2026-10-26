with open("scripts/blender_simforge_cw.py", "r", encoding="utf-8") as f:
    code = f.read()

target = '''            elif f < 790: # Scrambles to vent
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
                r2_sz = rog_scale * lerp(1.0, 1.35, 1.0 - squeeze)'''

replacement = '''            elif f < 790: # Scrambles to vent directly under chimney
                r2_x, r2_y, r2_z = 0.0, -0.6, 1.25
                r2_yaw = 0.0
                r2_pitch = 0.0
                r2_pose = "jump"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 798: # PUNTED straight down to floor by boot!
                t = prog(f, 790, 798)
                r2_x = 0.0
                r2_y = -0.6
                r2_z = lerp(1.25, 0.0, ease_out_cubic(t))
                r2_yaw = 0.0
                r2_pitch = 0.0
                r2_pose = "cower"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 829: # Dazed on floor between closing walls!
                r2_x, r2_y, r2_z = 0.0, -0.6, 0.0
                r2_yaw = 0.0
                r2_pitch = 0.0
                r2_pose = "cower"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 835: # Walls crush Rogue 2 into pancake
                r2_x, r2_y, r2_z = 0.0, -0.6, 0.0
                r2_yaw = 0.0
                r2_pitch = 0.0
                r2_pose = "cower"
                squeeze = clamp(inner / (0.36 * rog_scale), 0.12, 1.0)
                r2_sx = rog_scale * squeeze
                r2_sy = rog_scale
                r2_sz = rog_scale * lerp(1.0, 1.35, 1.0 - squeeze)'''

if target in code:
    code = code.replace(target, replacement)
    with open("scripts/blender_simforge_cw.py", "w", encoding="utf-8") as f:
        f.write(code)
    print("Successfully updated Rogue 2 punt & floor daze animation!")
else:
    print("Could not find target!")
