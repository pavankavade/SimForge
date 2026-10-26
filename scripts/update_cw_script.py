import re

with open('scripts/blender_simforge_cw.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update solve_pose
old_jump = """    elif pose_name == "jump":
        res["armL"] = [-1.5, 0, 0.4]
        res["armR"] = [-1.5, 0, -0.4]
        res["elbowL"] = [-0.8, 0, 0]
        res["elbowR"] = [-0.8, 0, 0]
        res["legL"] = [-0.5, 0, 0.05]
        res["legR"] = [-0.5, 0, -0.05]
        res["kneeL"] = [1.1, 0, 0]
        res["kneeR"] = [1.1, 0, 0]"""

new_jump = """    elif pose_name == "jump":
        res["armL"] = [-1.5, 0, 0.4]
        res["armR"] = [-1.5, 0, -0.4]
        res["elbowL"] = [-0.8, 0, 0]
        res["elbowR"] = [-0.8, 0, 0]
        res["legL"] = [-0.5, 0, 0.05]
        res["legR"] = [-0.5, 0, -0.05]
        res["kneeL"] = [1.1, 0, 0]
        res["kneeR"] = [1.1, 0, 0]
    elif pose_name == "slip":
        c = math.sin(f * 0.8)
        res["armL"] = [-1.6 + c * 0.3, 0, 0.7]
        res["armR"] = [-1.6 - c * 0.3, 0, -0.7]
        res["elbowL"] = [-1.2, 0, 0]
        res["elbowR"] = [-1.2, 0, 0]
        res["legL"] = [-1.1, 0, 0.1]
        res["legR"] = [0.4, 0, -0.1]
        res["kneeL"] = [0.2, 0, 0]
        res["kneeR"] = [1.3, 0, 0]
        res["lean"] = -0.45
        res["head"] = [-0.25, 0, 0]
    elif pose_name == "launch":
        res["armL"] = [-1.8, 0, 0.6]
        res["armR"] = [-1.8, 0, -0.6]
        res["elbowL"] = [-0.3, 0, 0]
        res["elbowR"] = [-0.3, 0, 0]
        res["legL"] = [0.6, 0, 0.05]
        res["legR"] = [0.6, 0, -0.05]
        res["kneeL"] = [0.4, 0, 0]
        res["kneeR"] = [0.4, 0, 0]
        res["lean"] = 0.5
        res["head"] = [0.4, 0, 0]"""

if old_jump in code:
    code = code.replace(old_jump, new_jump, 1)
    print("Added slip and launch poses.")
else:
    print("Warning: old_jump target not matched.")

# 2. Update setup_camera_animation waypoints
old_waypoints = """    waypoints = [
        (0,   0.0, 2.0, 14.5, 1.0),
        (101, 0.0, 1.5, 10.0, 0.0),
        (141, -0.8, 1.5, 9.5, 0.0),
        (198, 0.0, 1.35, 8.2, 0.0),
        (234, 0.0, 1.25, 7.4, 0.0),
        (257, 0.0, 1.15, 6.6, 0.0),
        (291, 0.0, 1.0,  6.4, 0.0),
    ]"""

new_waypoints = """    waypoints = [
        # Level 1
        (0,   0.0, 2.0, 14.5, 1.0),
        (101, 0.0, 1.5, 10.0, 0.0),
        (141, -0.8, 1.5, 9.5, 0.0),
        (198, 0.0, 1.35, 8.2, 0.0),
        (234, 0.0, 1.25, 7.4, 0.0),
        (257, 0.0, 1.15, 6.6, 0.0),
        (291, 0.0, 1.0,  6.4, 0.0),
        # Level 2
        (360, -0.8, 1.5, 9.5, 0.0),
        (381, 0.0, 1.85, 10.5, 0.0),
        (453, 0.0, 2.3, 10.5, 0.0),
        (486, 0.4, 3.6, 10.0, 0.0),
        (515, 0.4, 3.4, 10.0, 0.0),
        (529, 0.0, 1.6, 9.0, 0.0),
        (621, 0.0, 3.3, 9.0, 0.0),
        (651, 0.0, 2.2, 9.0, 0.0),
        (705, -0.8, 1.5, 9.5, 0.0),
        (721, 0.0, 1.85, 10.5, 0.0),
        (790, 0.0, 2.0, 10.0, 0.0),
        (800, 0.0, 1.4, 9.0, 0.0),
        (829, 0.0, 1.15, 6.8, 0.0),
        (869, 0.0, 1.15, 6.8, 0.0),
    ]"""

if old_waypoints in code:
    code = code.replace(old_waypoints, new_waypoints, 1)
    print("Updated camera waypoints through Level 2.")
else:
    print("Warning: old_waypoints target not matched.")

with open('scripts/blender_simforge_cw.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Finished script update pass 1.")
