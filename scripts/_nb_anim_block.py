def place_cast(roots):
    spots = {
        "Goblin": (0.55, 1.55),
        "Rogue": (-0.55, 1.95),
        "Mage": (1.25, 1.85),
        "Paladin": (0.05, 2.25),
        "Goblin2": (-1.15, 1.35),
        "Rogue2": (0.95, 1.05),
    }
    for name, (x, y) in spots.items():
        r = roots[name]
        r.location = (x, y, FLOOR_Z)
        r.rotation_euler = (0, 0, math.pi)


# ---------------------------------------------------------------------------
# camera
# ---------------------------------------------------------------------------

def get_camera():
    cam = bpy.data.objects.get("Camera")
    if not cam:
        data = bpy.data.cameras.new("Camera")
        cam = bpy.data.objects.new("Camera", data)
        bpy.context.scene.collection.objects.link(cam)
    cam.data.lens = 40
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 24
    bpy.context.scene.camera = cam
    return cam


def cam_set(cam, frame, loc, target, interp="BEZIER"):
    cam.location = Vector(loc)
    direction = Vector(target) - Vector(loc)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam.keyframe_insert("location", frame=frame)
    cam.keyframe_insert("rotation_euler", frame=frame)
    act = cam.animation_data.action
    for fcu in cw.get_action_fcurves(act):
        for kp in fcu.keyframe_points:
            if abs(kp.co.x - frame) < 0.01:
                kp.interpolation = interp


# ---------------------------------------------------------------------------
# animation
# ---------------------------------------------------------------------------

def animate(roots, fan, rotor, valve_flap, hatch_hinge, door_hinge, geiger_needle,
            rays, drops, cloud, items, plug, headhouse, exit2):
    cam = get_camera()

    # --- shots -------------------------------------------------------------
    wide = ((0.85, -17.6, 1.15), (0.30, 0, -2.35))
    wide_push = ((0.85, -16.4, 1.0), (0.30, 0, -2.55))
    yard = ((0.35, -11.8, 2.65), (0.15, 0.7, 0.65))
    inside = ((0.15, -12.4, -3.55), (0.35, 0.8, -4.85))
    inside_wide = ((0.45, -14.9, -3.20), (0.35, 0.6, -4.95))
    air_view = ((0.95, -7.4, -3.05), (2.00, 0.6, -4.15))
    door_view = ((-1.35, -6.4, 2.05), (-1.05, 0.3, 1.05))
    hatch_view = ((-4.05, -7.6, 1.95), (-4.40, 0.8, 0.45))
    wide_end = ((1.15, -20.6, 1.55), (0.20, 0, -2.15))

    cuts = [
        (0, "BEZIER", wide),
        (LS("l1b") - 8, "CONSTANT", yard),
        (LS("l2a") - 6, "CONSTANT", wide),
        (LS("l3a") - 6, "CONSTANT", inside),
        (LS("l4a") - 6, "CONSTANT", wide),
        (LS("l4b") - 6, "CONSTANT", inside),
        (LS("l5a") - 6, "CONSTANT", wide),
        (LS("l5b") - 6, "CONSTANT", air_view),
        (LS("l6b") - 8, "CONSTANT", door_view),
        (LS("l7b") - 6, "CONSTANT", hatch_view),
        (LS("l8a") - 6, "CONSTANT", inside),
        (LS("l9a") - 6, "CONSTANT", wide),
        (LS("l10a") - 6, "CONSTANT", inside_wide),
        (LS("end") - 8, "CONSTANT", wide_end),
    ]
    for f, interp, (loc, tgt) in cuts:
        cam_set(cam, f, loc, tgt, interp)

    # gentle push-ins during the long holds
    cam_set(cam, LE("l1a"), *wide_push)
    cam_set(cam, LS("l2a") + 30, (0.80, -17.0, 1.05), (0.30, 0, -2.55))
    cam_set(cam, LE("l2b"), (0.80, -16.2, 0.95), (0.30, 0, -2.60))
    cam_set(cam, LE("l3a"), (0.20, -11.6, -3.55), (0.35, 0.8, -4.85))
    cam_set(cam, LE("l5a"), (0.75, -16.2, 1.0), (0.30, 0, -2.55))
    cam_set(cam, LE("l8b"), (0.25, -12.0, -3.55), (0.35, 0.8, -4.85))
    cam_set(cam, LE("l9b"), (0.9, -17.0, 1.15), (0.30, 0, -2.4))

    # --- cast --------------------------------------------------------------
    r = roots
    base = {name: r[name].scale.copy() for _cls, name in CAST}

    def hide(name, frame):
        key(r[name], frame, scale=(0.001, 0.001, 0.001))

    def show(name, frame, dur=8):
        s = base[name]
        key(r[name], frame, scale=(0.001, 0.001, 0.001))
        key(r[name], frame + dur * 0.7, scale=(s.x * 1.08, s.y * 1.08, s.z * 1.08))
        key(r[name], frame + dur, scale=(s.x, s.y, s.z))

    # everyone but the goblin waits for the "ten people" line
    for _cls, name in CAST:
        if name != "Goblin":
            hide(name, 0)

    jump = W("l1a", "climb")
    surf = GROUND_Z
    g = r["Goblin"]
    key(g, LS("l1a") - 4, loc=(4.9, 1.5, surf), rot=(0, 0, math.radians(90)))
    key(g, jump - 32, loc=(4.9, 1.5, surf), rot=(0, 0, math.radians(90)))
    key(g, jump - 4, loc=(0.35, 1.5, surf), rot=(0, 0, math.radians(90)))
    key(g, jump, loc=(-0.55, 1.5, surf + 0.35), rot=(0, 0, math.radians(90)))
    key(g, jump + 7, loc=(SHAFT_X, 1.5, surf - 0.55), rot=(0, 0, math.radians(90)))
    # out of sight inside the dirt while the blast caves the hole
    hide("Goblin", jump + 9)

    # --- blast caves the yard hole ----------------------------------------
    cave = W("l1b", "caves")
    for i in range(14):
        cx = SHAFT_X + RNG.uniform(-0.9, 0.9)
        cy = 1.5 + RNG.uniform(-0.5, 0.5)
        cz = GROUND_Z + RNG.uniform(0.3, 1.1)
        size = RNG.uniform(0.14, 0.3)
        chunk = make_box(f"NB_CaveChunk_{i}", size, size, size * 0.8,
                         center=(cx, cy, cz),
                         mat=MAT["soil_light"] if i % 2 else MAT["soil"], ink=False)
        key(chunk, cave - 6 + i % 5, loc=(cx, cy, cz), rot=(0, 0, 0))
        key(chunk, cave + 14 + i, loc=(SHAFT_X + (cx - SHAFT_X) * 0.6, cy, GROUND_Z - 0.55),
            rot=(RNG.uniform(2, 5), RNG.uniform(1, 4), RNG.uniform(0, 3)))
        key(chunk, cave + 22 + i, loc=(SHAFT_X * 0.8, cy, GROUND_Z - 0.7),
            scale=(0.001, 0.001, 0.001))

    dust = make_sphere("NB_BlastDust", 0.9, center=(SHAFT_X, 1.5, GROUND_Z + 0.15),
                       scale=(0.001, 0.001, 0.001), mat=MAT["soil_light"], ink=False)
    key(dust, cave - 2, scale=(0.001, 0.001, 0.001))
    key(dust, cave + 6, scale=(2.4, 1.9, 1.0))
    key(dust, cave + 34, scale=(3.0, 2.4, 1.2))
    key(dust, cave + 52, scale=(0.001, 0.001, 0.001))

    # --- steel pipe --------------------------------------------------------
    pipe_beat = W("l2a", "steel")
    pipe = make_cylinder("NB_BigPipe", TUBE_R - 0.10, 4.3,
                         center=(TUBE_X, 6.0, TUBE_Z), rot=(math.pi / 2, 0, 0),
                         mat=MAT["steel"], ink=True, segments=40)
    key(pipe, pipe_beat - 6, loc=(TUBE_X, 6.0, TUBE_Z))
    key(pipe, pipe_beat + 15, loc=(TUBE_X, 1.05, TUBE_Z))
    ease_keys(pipe)
    for o in (pipe,):
        key(o, pipe_beat + 16, scale=(1, 1, 1))
        key(o, pipe_beat + 18, scale=(0.001, 0.001, 0.001))
    key(plug, pipe_beat + 13, scale=(1, 1, 1))
    key(plug, pipe_beat + 15, scale=(0.001, 0.001, 0.001))

    # the shaft arrives with the pipe; the goblin turns up inside
    for name in ("NB_Shaft_Straight", "NB_Shaft_Collar"):
        ob = bpy.data.objects[name]
        s = ob.scale.copy()
        pop_out(ob, pipe_beat + 4, 12, (s.x, s.y, s.z))
    show("Goblin", pipe_beat + 18, 14)
    key(g, pipe_beat + 18, loc=(0.55, 1.55, FLOOR_Z), rot=(0, 0, math.pi))

    # --- mushroom cloud and fallout --------------------------------------
    cloud_beat = W("l2b", "explosion")
    for p in cloud:
        s = p.scale.copy()
        key(p, cloud_beat - 4, scale=(0.001, 0.001, 0.001))
        key(p, cloud_beat + 26, scale=(s.x * 1.1, s.y * 1.1, s.z * 1.1))
        key(p, cloud_beat + 52, scale=(s.x, s.y, s.z))

    rain = W("l2b", "rains")
    for i, drop in enumerate(drops):
        x, y = drop.location.x, drop.location.y
        f0 = rain - 12 + i * 2
        key(drop, f0 - 1, loc=(x, y, 5.6), scale=(0.001, 0.001, 0.001))
        key(drop, f0, loc=(x, y, 5.6), scale=(1, 1, 1))
        key(drop, f0 + 46, loc=(x, y, GROUND_Z - 0.1), scale=(1, 1, 1))
        key(drop, f0 + 50, loc=(x, y, GROUND_Z - 0.15), scale=(0.001, 0.001, 0.001))

    # --- radiation ---------------------------------------------------------
    rays_on = LS("l3a") + 8
    for i, ray in enumerate(rays):
        x, y = ray.location.x, ray.location.y
        key(ray, rays_on + i, loc=(x, y, 0.9), scale=(1, 1, 0.001))
        key(ray, rays_on + 14 + i * 2, loc=(x, y, 0.9), scale=(1, 1, 1))

    doorway = W("l3b", "doorway")
    for i, ray in enumerate(rays):
        x, y = ray.location.x, ray.location.y
        key(ray, doorway - 4, loc=(x, y, 0.9), scale=(1, 1, 1))
        key(ray, doorway, loc=(x, y, -0.55), scale=(1, 1, 1.75))

    bend = W("l4a", "bend")
    for ray in rays:
        x, y = ray.location.x, ray.location.y
        key(ray, bend - 3, loc=(x, y, -0.55), scale=(1, 1, 1.75))
        key(ray, bend + 2, loc=(x, y, 1.35), scale=(1, 1, 0.82))
    # sparks where the rays hit the first bend
    for i in range(5):
        sp = make_sphere(f"NB_BendSpark_{i}", 0.08, center=(SHAFT_X, SHAFT_Y - 0.6, -0.75),
                         scale=(0.001, 0.001, 0.001), mat=MAT["rad"], ink=False,
                         segments=8, ring_count=6)
        f = bend + i * 2
        key(sp, f, scale=(0.001, 0.001, 0.001))
        key(sp, f + 4, loc=(SHAFT_X + RNG.uniform(-0.4, 0.4), SHAFT_Y - 0.6,
                            -0.75 + RNG.uniform(-0.3, 0.3)),
            scale=(1.6, 1.6, 1.6))
        key(sp, f + 14, scale=(0.001, 0.001, 0.001))

    # straight shaft -> zig-zag (off camera, wide shot)
    swap = LS("l4a") - 2
    straight = bpy.data.objects["NB_Shaft_Straight"]
    straight.hide_render = False
    straight.keyframe_insert("hide_render", frame=swap - 1)
    straight.hide_render = True
    straight.keyframe_insert("hide_render", frame=swap)
    for name in ("NB_Bent_1", "NB_Bent_2", "NB_Bent_3", "NB_Shaft_Collar"):
        ob = bpy.data.objects[name]
        ob.hide_render = True
        ob.keyframe_insert("hide_render", frame=swap - 1)
        ob.hide_render = False
        ob.keyframe_insert("hide_render", frame=swap)
        if name.startswith("NB_Bent"):
            key(ob, swap, loc=ob.location.copy())
            key(ob, swap + 10, loc=ob.location.copy())

    # --- ten people, stale air -------------------------------------------
    ten = W("l4b", "ten")
    for i, name in enumerate(("Rogue", "Mage", "Paladin", "Goblin2", "Rogue2")):
        show(name, ten + 4 + i * 5, 12)

    stale = W("l4b", "stale")
    haze = make_sphere("NB_StaleHaze", 1.45, center=(0.35, 1.2, -3.55),
                       scale=(0.001, 0.001, 0.001), mat=MAT["ember"], ink=False,
                       segments=20, ring_count=12)
    key(haze, stale - 2, scale=(0.001, 0.001, 0.001))
    key(haze, stale + 20, scale=(1.5, 1.1, 0.9))
    key(haze, LS("l5a") + 10, scale=(1.5, 1.1, 0.9))
    key(haze, LS("l5a") + 26, scale=(0.001, 0.001, 0.001))

    # --- air pipe, filter, fan -------------------------------------------
    grow = W("l5a", "pipe")
    air_names = ["NB_AirPipe", "NB_AirCap", "NB_AirCollar", "NB_FilterBox",
                 "NB_Fan", "NB_FanRotor", "NB_ValveRing", "NB_ValveBlade"]
    for i, name in enumerate(air_names):
        ob = bpy.data.objects[name]
        s = ob.scale.copy()
        pop_out(ob, grow + i, 12, (s.x, s.y, s.z))
    for i in range(4):
        ob = bpy.data.objects[f"NB_FilterGrill_{i}"]
        pop_out(ob, grow + 6 + i, 10)

    fan_beat = W("l5a", "fan")
    key(rotor, fan_beat, rot=(0, 0, 0))
    key(rotor, LS("l9a") - 40, rot=(0, math.tau * 22, 0))
    for fcu in cw.get_action_fcurves(rotor.animation_data.action):
        for kp in fcu.keyframe_points:
            kp.interpolation = "LINEAR"

    # --- shockwave down the pipe -----------------------------------------
    shock = W("l5b", "shockwave")
    beam = make_cylinder("NB_ShockBeam", 0.13, 5.2,
                         center=(AIR_X, AIR_Y - 0.30, 4.4),
                         mat=MAT["rad"], ink=False, segments=12)
    key(beam, shock, loc=(AIR_X, AIR_Y - 0.30, 4.4), scale=(1, 1, 0.001))
    key(beam, shock + 4, loc=(AIR_X, AIR_Y - 0.30, 1.2), scale=(1, 1, 1))
    key(beam, shock + 22, loc=(AIR_X, AIR_Y - 0.30, -2.6), scale=(1, 1, 1))
    key(beam, shock + 24, scale=(0.001, 0.001, 0.001))

    # --- blast valve ------------------------------------------------------
    valve_beat = W("l6a", "valve")
    slam = W("l6a", "slams")
    key(valve_flap, valve_beat - 4, rot=(0, math.radians(88), 0))
    key(valve_flap, slam - 2, rot=(0, math.radians(88), 0))
    key(valve_flap, slam + 1, rot=(0, 0, 0))
    ease_keys(valve_flap)

    # --- blast door -------------------------------------------------------
    door_beat = W("l6b", "door")
    outward = W("l6b", "outward")
    pop_out(bpy.data.objects["NB_Shed"], door_beat - 14, 12)
    pop_out(bpy.data.objects["NB_Shed_Roof"], door_beat - 12, 12)
    pop_out(bpy.data.objects["NB_Shed_Opening"], door_beat - 12, 12)
    pop_out(door_hinge, door_beat - 10, 12)
    key(door_hinge, outward - 2, rot=(0, 0, 0))
    key(door_hinge, outward + 8, rot=(0, 0, math.radians(-82)))
    key(door_hinge, LS("l7a") + 30, rot=(0, 0, math.radians(-82)))

    # --- rubble against the door -----------------------------------------
    rubble_beat = W("l7a", "rubble")
    for i in range(9):
        x = SHAFT_X + RNG.uniform(-0.9, 0.9)
        z = GROUND_Z + RNG.uniform(0.15, 0.7)
        rock = make_sphere(f"NB_Rubble_{i}", RNG.uniform(0.16, 0.3),
                           center=(x, -1.15, z), scale=(1.0, 0.8, 0.75),
                           mat=MAT["soil_light"] if i % 2 else MAT["soil"], ink=False)
        key(rock, rubble_beat - 4 + i % 4, loc=(x, -1.15, z + 1.6),
            scale=(0.001, 0.001, 0.001))
        key(rock, rubble_beat + 6 + i, loc=(x, -1.15, z), scale=(1, 1, 1))

    # --- second tunnel and hatch -----------------------------------------
    dig = W("l7b", "second")
    for i, ob in enumerate(exit2):
        s = ob.scale.copy()
        key(ob, dig - 2 + i, scale=(0.001, 0.001, 0.001))
        key(ob, dig + 14 + i, scale=(s.x, s.y, s.z))
    key(hatch_hinge, LE("l7b") - 10, rot=(0, 0, 0))
    key(hatch_hinge, LE("l7b") + 8, rot=(0, math.radians(78), 0))

    # --- geiger counter ---------------------------------------------------
    geiger_parts = [o for o in bpy.data.objects if o.name.startswith("NB_Geiger")]
    gshow = W("l8b", "hang")
    for i, ob in enumerate(geiger_parts):
        s = ob.scale.copy()
        key(ob, gshow - 2 + i, scale=(0.001, 0.001, 0.001))
        key(ob, gshow + 12 + i, scale=(s.x, s.y, s.z))
    ticks = W("l8b", "clicks")
    for k in range(12):
        f = ticks + k * 9
        ang = math.radians(-34 + (k % 4) * 20)
        key(geiger_needle, f, rot=(0, ang, 0))
        key(geiger_needle, f + 4, rot=(0, math.radians(-34), 0))

    # --- decay ------------------------------------------------------------
    decay = W("l9a", "ten")
    for i, drop in enumerate(drops):
        f = decay + 20 + (i % 8) * 4
        key(drop, f, scale=(1, 1, 1))
        key(drop, f + 24, scale=(0.001, 0.001, 0.001))
    for ray in rays:
        key(ray, decay, scale=(1, 1, 0.82))
        key(ray, decay + 10, scale=(0.001, 0.001, 0.001))

    # --- supplies, then the furniture ------------------------------------
    supplies = W("l9b", "supplies")
    for i, ob in enumerate(items):
        if ob.name.startswith(("NB_Crate", "NB_Can")):
            s = ob.scale.copy()
            key(ob, supplies + i * 2, scale=(0.001, 0.001, 0.001))
            key(ob, supplies + 12 + i * 2, scale=(s.x, s.y, s.z))

    furnish = W("l10a", "beds")
    rest = [ob for ob in items if not ob.name.startswith(("NB_Crate", "NB_Can"))]
    for i, ob in enumerate(rest):
        s = ob.scale.copy()
        f = furnish + i * 2
        key(ob, f - 2, scale=(0.001, 0.001, 0.001))
        key(ob, f + 10, scale=(s.x * 1.06, s.y * 1.06, s.z * 1.06))
        key(ob, f + 16, scale=(s.x, s.y, s.z))

    # --- end: everyone cheers --------------------------------------------
    end = LS("end")
    for _cls, name in CAST:
        ob = r[name]
        p = ob.location.copy()
        for k in range(4):
            f = end + 2 + k * 16
            key(ob, f, loc=(p.x, p.y, p.z))
            key(ob, f + 7, loc=(p.x, p.y, p.z + 0.22))
            key(ob, f + 14, loc=(p.x, p.y, p.z))

    # --- lights -----------------------------------------------------------
    sun_data = bpy.data.lights.new("NB_Sun", "SUN")
    sun_data.energy = 3.2
    sun_data.angle = math.radians(9)
    sun_obj = bpy.data.objects.new("NB_Sun_Obj", sun_data)
    sun_obj.rotation_euler = (math.radians(52), 0, math.radians(-35))
    bpy.context.scene.collection.objects.link(sun_obj)

    fill_data = bpy.data.lights.new("NB_Fill", "AREA")
    fill_data.energy = 420
    fill_data.size = 9
    fill_obj = bpy.data.objects.new("NB_Fill_Obj", fill_data)
    fill_obj.location = (3.0, -9.0, 3.0)
    fill_obj.rotation_euler = (math.radians(62), 0, math.radians(18))
    bpy.context.scene.collection.objects.link(fill_obj)

    return cam
