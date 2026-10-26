# ---------------------------------------------------------------------------
# set
# ---------------------------------------------------------------------------

GROUND_Z = 0.38          # lawn surface
SOIL_FRONT = -1.10       # the cut plane the camera looks at

TUBE_X = -0.35
TUBE_Z = -4.55
TUBE_R = 2.12
TUBE_FRONT = -1.02
TUBE_BACK = 2.60
FLOOR_Z = -5.50

SHAFT_X = 1.35
SHAFT_Y = -0.95
AIR_X = -2.05
AIR_Y = -0.95
HOUSE_X = -2.75
HOUSE_Y = 1.20


def cut_cylinder(target, radius, depth, center, rot=(math.pi / 2, 0, 0), segments=64):
    """Boolean-subtract a cylinder from target, then delete the cutter."""
    cutter = make_cylinder("NB_Cutter", radius, depth, center=center, rot=rot,
                           segments=segments, mat=None, ink=False)
    mod = target.modifiers.new("Hole", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    bpy.context.view_layer.objects.active = target
    target.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def make_torus(name, r_major, r_minor, center=(0, 0, 0), rot=(0, 0, 0),
               major_seg=40, minor_seg=10, mat=None, collection=None):
    import bmesh

    bm = bmesh.new()
    grid = []
    for i in range(major_seg):
        a = 2 * math.pi * i / major_seg
        row = []
        for j in range(minor_seg):
            b = 2 * math.pi * j / minor_seg
            rr = r_major + r_minor * math.cos(b)
            row.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), r_minor * math.sin(b))))
        grid.append(row)
    for i in range(major_seg):
        for j in range(minor_seg):
            a0 = grid[i][j]
            a1 = grid[(i + 1) % major_seg][j]
            b1 = grid[(i + 1) % major_seg][(j + 1) % minor_seg]
            b0 = grid[i][(j + 1) % minor_seg]
            bm.faces.new((a0, a1, b1, b0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
    obj = cw.create_mesh_obj(name, bm, mat, collection, smooth=True)
    obj.rotation_euler = Euler(rot)
    obj.location = Vector(center)
    return obj


def make_gable(name, width, depth, height, center, mat, collection, ink=True):
    import bmesh

    bm = bmesh.new()
    hw, hd = width / 2, depth / 2
    v = [
        bm.verts.new((-hw, -hd, 0)), bm.verts.new((hw, -hd, 0)), bm.verts.new((0, -hd, height)),
        bm.verts.new((-hw, hd, 0)), bm.verts.new((hw, hd, 0)), bm.verts.new((0, hd, height)),
    ]
    bm.faces.new((v[0], v[1], v[2]))
    bm.faces.new((v[3], v[4], v[5]))
    bm.faces.new((v[0], v[3], v[5], v[2]))
    bm.faces.new((v[1], v[4], v[5], v[2]))
    bm.faces.new((v[0], v[1], v[4], v[3]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = cw.create_mesh_obj(name, bm, mat, collection, smooth=False)
    if ink:
        cw.apply_ink_outline(obj, thickness=0.012)
    obj.location = Vector(center)
    return obj


def build_world():
    scene = bpy.context.scene
    world = bpy.data.worlds.new("NB_World")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.30, 0.55, 0.86, 1)
    bg.inputs["Strength"].default_value = 0.9
    scene.world = world

    # far clouds, so the sky above the house is not a flat blue card
    col = bpy.data.collections.new("NB_Sky")
    bpy.context.scene.collection.children.link(col)
    for i, (x, z, r, sy) in enumerate([
        (-6.5, 6.4, 1.5, 0.55), (-4.6, 6.9, 1.1, 0.5), (-8.0, 6.9, 1.0, 0.5),
        (4.2, 7.4, 1.7, 0.55), (6.2, 7.9, 1.2, 0.5), (2.6, 8.1, 1.0, 0.5),
    ]):
        make_sphere(f"NB_SkyCloud_{i}", r, center=(x, 6.0, z), scale=(1.0, 0.5, sy),
                    mat=MAT["cream"], ink=False, collection=col)


def build_ground():
    col = bpy.data.collections.new("NB_Terrain")
    bpy.context.scene.collection.children.link(col)

    soil = make_box("NB_SoilBlock", 18.0, 3.4, 9.4, center=(0, 0.6, -4.35),
                    mat=MAT["soil"], ink=False, collection=col)
    # the chamber is a round hole cut straight through the soil face
    cut_cylinder(soil, TUBE_R + 0.03, 8.0, (TUBE_X, 0.6, TUBE_Z))

    make_box("NB_GrassLayer", 18.0, 3.4, 0.30, center=(0, 0.6, GROUND_Z - 0.15),
             mat=MAT["grass"], ink=False, collection=col)

    # exposed strata on the cut face
    for i, (z, h, m) in enumerate([
        (-0.10, 0.52, MAT["soil_dark"]),
        (-1.75, 0.5, MAT["soil_light"]),
        (-7.05, 0.7, MAT["soil_dark"]),
        (-8.15, 0.8, MAT["soil_light"]),
    ]):
        make_box(f"NB_Strata_{i}", 18.0, 0.05, h, center=(0, SOIL_FRONT + 0.004, z),
                 mat=m, ink=False, collection=col)

    # pebbles and roots on the cut face, kept clear of the chamber
    RNG2 = random.Random(23)
    for i in range(26):
        x = RNG2.uniform(-8.4, 8.4)
        z = RNG2.uniform(-8.6, -0.3)
        if (x - TUBE_X) ** 2 + (z - TUBE_Z) ** 2 < (TUBE_R + 0.35) ** 2:
            continue
        make_sphere(f"NB_Pebble_{i}", RNG2.uniform(0.07, 0.16),
                    center=(x, SOIL_FRONT + 0.03, z),
                    scale=(1.0, 0.35, RNG2.uniform(0.6, 1.0)),
                    mat=MAT["soil_light"] if i % 2 else MAT["soil_dark"],
                    ink=False, collection=col, segments=10, ring_count=6)

    # hole in the yard, down to the entrance shaft
    make_cylinder("NB_HoleDark", 0.62, 1.5, center=(SHAFT_X, 1.5, GROUND_Z - 0.72),
                  mat=MAT["soil_dark"], ink=False, collection=col, segments=32)
    make_torus("NB_HoleRim", 0.66, 0.13, center=(SHAFT_X, 1.5, GROUND_Z + 0.04),
               rot=(0, 0, 0), mat=MAT["soil_light"], collection=col)

    build_house(col, HOUSE_X)
    build_tree(col, -5.55)
    build_tree(col, 5.05, scale=0.8)
    build_fence(col)
    build_bushes(col)
    return col


def build_house(col, hx):
    base_z = GROUND_Z
    w, d, h = 4.4, 2.0, 3.0
    front = HOUSE_Y - d / 2

    make_box("NB_House_Foundation", w + 0.2, d + 0.2, 0.18,
             center=(hx, HOUSE_Y, base_z + 0.09), mat=MAT["concrete"], ink=False, collection=col)
    make_box("NB_House_Walls", w, d, h, center=(hx, HOUSE_Y, base_z + h / 2),
             mat=MAT["wall"], ink=True, ink_thickness=0.02, collection=col)
    make_gable("NB_House_Gable", w, d, 1.25, center=(hx, HOUSE_Y, base_z + h),
               mat=MAT["wall"], collection=col)

    # roof slabs follow the gable
    pitch = math.atan2(1.25, w / 2)
    slab_len = math.hypot(w / 2, 1.25) + 0.28
    for side in (-1, 1):
        slab = make_box(f"NB_Roof_{side}", slab_len, d + 0.4, 0.16,
                        center=(hx + side * (w / 4 + 0.06), HOUSE_Y, base_z + h + 0.64),
                        mat=MAT["roof"], ink=True, collection=col)
        slab.rotation_euler = (0, side * pitch, 0)

    make_box("NB_Chimney", 0.42, 0.42, 1.45, center=(hx + 1.25, HOUSE_Y + 0.35, base_z + h + 0.85),
             mat=MAT["concrete"], ink=True, collection=col)
    make_box("NB_ChimneyCap", 0.56, 0.56, 0.12, center=(hx + 1.25, HOUSE_Y + 0.35, base_z + h + 1.6),
             mat=MAT["steel_dark"], ink=False, collection=col)

    # two storeys of windows with shutters
    for row, wz in enumerate((1.05, 2.35)):
        for ci, wx in enumerate((-1.45, 0.0, 1.45)):
            if row == 0 and ci == 1:
                continue  # the door lives here
            make_box(f"NB_WinFrame_{row}_{ci}", 0.68, 0.08, 0.86,
                     center=(hx + wx, front - 0.02, base_z + wz), mat=MAT["trim"],
                     ink=False, collection=col)
            make_box(f"NB_WinGlass_{row}_{ci}", 0.54, 0.06, 0.72,
                     center=(hx + wx, front - 0.06, base_z + wz), mat=MAT["glass"],
                     ink=False, collection=col)
            make_box(f"NB_WinBarV_{row}_{ci}", 0.05, 0.07, 0.72,
                     center=(hx + wx, front - 0.07, base_z + wz), mat=MAT["trim"],
                     ink=False, collection=col)
            make_box(f"NB_WinBarH_{row}_{ci}", 0.54, 0.07, 0.05,
                     center=(hx + wx, front - 0.07, base_z + wz), mat=MAT["trim"],
                     ink=False, collection=col)
            for side in (-1, 1):
                make_box(f"NB_Shutter_{row}_{ci}_{side}", 0.17, 0.07, 0.80,
                         center=(hx + wx + side * 0.44, front - 0.03, base_z + wz),
                         mat=MAT["blue"], ink=False, collection=col)

    # door + step + porch
    make_box("NB_FrontDoor", 0.66, 0.10, 1.30, center=(hx, front - 0.03, base_z + 0.65),
             mat=MAT["blue"], ink=True, collection=col)
    make_sphere("NB_Knob", 0.05, center=(hx + 0.22, front - 0.10, base_z + 0.62),
                mat=MAT["hazard"], ink=False, collection=col)
    make_box("NB_Step", 1.1, 0.45, 0.14, center=(hx, front - 0.22, base_z + 0.07),
             mat=MAT["concrete"], ink=False, collection=col)
    make_box("NB_Porch", 1.3, 0.5, 0.10, center=(hx, front - 0.20, base_z + 1.45),
             mat=MAT["roof"], ink=True, collection=col)

    # a plant by the door
    make_cylinder("NB_Pot", 0.16, 0.22, center=(hx + 0.85, front - 0.12, base_z + 0.11),
                  mat=MAT["orange"], ink=False, collection=col, segments=16)
    for i in range(4):
        make_sphere(f"NB_PotLeaf_{i}", 0.12, center=(hx + 0.85 + (i - 1.5) * 0.09,
                    front - 0.14, base_z + 0.30 + (i % 2) * 0.08),
                    scale=(0.9, 0.7, 0.5), mat=MAT["grass"], ink=False,
                    collection=col, segments=10, ring_count=6)


def build_tree(col, tx, scale=1.0):
    make_cylinder(f"NB_Tree_Trunk_{tx}", 0.16 * scale, 1.9 * scale,
                  center=(tx, 1.55, GROUND_Z + 0.95 * scale), mat=MAT["wood"],
                  ink=True, collection=col, segments=16)
    for i, (dx, dz, r) in enumerate([(0, 2.5, 0.9), (-0.5, 2.1, 0.62), (0.5, 2.2, 0.66)]):
        make_sphere(f"NB_Tree_Leaf_{tx}_{i}", r * scale,
                    center=(tx + dx * scale, 1.55, GROUND_Z + dz * scale),
                    scale=(1.0, 0.85, 0.85), mat=MAT["grass"], ink=True, collection=col)


def build_fence(col):
    for i in range(-9, 10):
        make_box(f"NB_Picket_{i}", 0.12, 0.09, 0.75, center=(i * 0.75, 2.65, GROUND_Z + 0.38),
                 mat=MAT["wood"], ink=False, collection=col)
    make_box("NB_FenceRail", 15.0, 0.07, 0.10, center=(0, 2.62, GROUND_Z + 0.55),
             mat=MAT["wood"], ink=False, collection=col)


def build_bushes(col):
    for i, (x, r) in enumerate([(-0.15, 0.42), (0.45, 0.34), (6.4, 0.5), (-6.6, 0.45)]):
        make_sphere(f"NB_Bush_{i}", r, center=(x, 0.95, GROUND_Z + r * 0.55),
                    scale=(1.0, 0.8, 0.75), mat=MAT["grass"], ink=True, collection=col)


# ---------------------------------------------------------------------------
# bunker
# ---------------------------------------------------------------------------

def build_tube():
    col = bpy.data.collections.new("NB_Bunker")
    bpy.context.scene.collection.children.link(col)

    # ribbed steel shell: a ring of panels around the chamber axis (Y)
    n = 40
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        seg = TUBE_R * 2 * math.pi / n * 1.06
        panel = make_box(f"NB_Shell_{i:02d}", seg, TUBE_BACK - TUBE_FRONT, 0.09,
                         center=(TUBE_X + math.cos(a) * TUBE_R,
                                 (TUBE_BACK + TUBE_FRONT) / 2,
                                 TUBE_Z + math.sin(a) * TUBE_R),
                         mat=MAT["steel_dark"] if i % 2 else MAT["steel"],
                         ink=False, collection=col)
        panel.rotation_euler = (0, math.pi / 2 - a, 0)

    # corrugation rings inside the pipe
    for i in range(7):
        y = TUBE_FRONT + 0.45 + i * 0.45
        make_torus(f"NB_Rib_{i}", TUBE_R - 0.055, 0.045, center=(TUBE_X, y, TUBE_Z),
                   rot=(math.pi / 2, 0, 0), mat=MAT["steel_warm"], collection=col)

    # bright mouth rim + dark back wall
    make_torus("NB_Rim", TUBE_R + 0.01, 0.11, center=(TUBE_X, TUBE_FRONT + 0.02, TUBE_Z),
               rot=(math.pi / 2, 0, 0), mat=MAT["steel"], collection=col)
    make_cylinder("NB_BackWall", TUBE_R, 0.16, center=(TUBE_X, TUBE_BACK - 0.06, TUBE_Z),
                  rot=(math.pi / 2, 0, 0), mat=MAT["steel_dark"], ink=False,
                  collection=col, segments=48)

    # dirt plug that hides the chamber until the pipe is installed
    make_cylinder("NB_Plug", TUBE_R + 0.01, 0.12,
                  center=(TUBE_X, SOIL_FRONT + 0.05, TUBE_Z),
                  rot=(math.pi / 2, 0, 0), mat=MAT["soil"], ink=False,
                  collection=col, segments=64)

    # timber floor inside the pipe
    make_box("NB_Floor", 3.55, TUBE_BACK - TUBE_FRONT - 0.15, 0.14,
             center=(TUBE_X, (TUBE_BACK + TUBE_FRONT) / 2, FLOOR_Z - 0.07),
             mat=MAT["wood"], ink=False, collection=col)
    for i in range(8):
        make_box(f"NB_PlankLine_{i}", 0.025, TUBE_BACK - TUBE_FRONT - 0.2, 0.012,
                 center=(TUBE_X - 1.55 + i * 0.44, (TUBE_BACK + TUBE_FRONT) / 2,
                         FLOOR_Z + 0.005),
                 mat=MAT["soil_dark"], ink=False, collection=col)
    make_box("NB_FloorLip", 3.6, 0.1, 0.24, center=(TUBE_X, TUBE_FRONT + 0.02, FLOOR_Z - 0.03),
             mat=MAT["steel_dark"], ink=False, collection=col)

    # ceiling lamp
    make_cylinder("NB_Lamp", 0.17, 0.07, center=(TUBE_X, 1.1, TUBE_Z + TUBE_R - 0.13),
                  mat=MAT["bulb"], ink=False, collection=col, segments=20)
    ld = bpy.data.lights.new("NB_LampLight", "POINT")
    ld.energy = 260
    ld.color = (1.0, 0.86, 0.64)
    ld.shadow_soft_size = 0.45
    lo = bpy.data.objects.new("NB_LampLight_Obj", ld)
    lo.location = (TUBE_X, 1.1, TUBE_Z + TUBE_R - 0.45)
    bpy.context.scene.collection.objects.link(lo)

    return col


def build_shaft():
    col = bpy.data.collections.new("NB_Shaft")
    bpy.context.scene.collection.children.link(col)

    top = GROUND_Z + 0.05
    ceiling = TUBE_Z + math.sqrt(TUBE_R ** 2 - (SHAFT_X - TUBE_X) ** 2)

    # straight entrance pipe: surface to the chamber ceiling
    straight = make_cylinder("NB_Shaft_Straight", 0.52, top - ceiling,
                             center=(SHAFT_X, SHAFT_Y, (top + ceiling) / 2),
                             mat=MAT["steel"], ink=True, collection=col, segments=24)
    make_torus("NB_Shaft_Collar", 0.58, 0.09, center=(SHAFT_X, SHAFT_Y, top - 0.02),
               rot=(0, 0, 0), mat=MAT["steel_warm"], collection=col)

    # zig-zag version, revealed when the tunnel is bent
    b1 = make_cylinder("NB_Bent_1", 0.46, 1.55, center=(SHAFT_X - 0.36, SHAFT_Y, -0.62),
                       mat=MAT["steel"], ink=True, collection=col, segments=20)
    b1.rotation_euler = (0, math.radians(28), 0)
    b2 = make_cylinder("NB_Bent_2", 0.46, 1.6, center=(SHAFT_X - 0.98, SHAFT_Y, -1.78),
                       mat=MAT["steel"], ink=True, collection=col, segments=20)
    b2.rotation_euler = (0, math.radians(-26), 0)
    b3 = make_cylinder("NB_Bent_3", 0.46, 1.35, center=(SHAFT_X - 0.62, SHAFT_Y, -2.72),
                       mat=MAT["steel"], ink=True, collection=col, segments=20)
    b3.rotation_euler = (0, math.radians(26), 0)
    for name in ("NB_Bent_1", "NB_Bent_2", "NB_Bent_3", "NB_Shaft_Collar"):
        bpy.data.objects[name].hide_render = True

    # surface headhouse with the outward-opening blast door
    house = bpy.data.collections.new("NB_Headhouse")
    bpy.context.scene.collection.children.link(house)
    make_box("NB_Shed", 1.95, 1.5, 1.75, center=(SHAFT_X, 0.25, GROUND_Z + 0.88),
             mat=MAT["concrete"], ink=True, ink_thickness=0.014, collection=house)
    make_box("NB_Shed_Roof", 2.15, 1.7, 0.16, center=(SHAFT_X, 0.25, GROUND_Z + 1.8),
             mat=MAT["concrete"], ink=False, collection=house)
    make_box("NB_Shed_Opening", 1.02, 0.16, 1.45, center=(SHAFT_X, -0.5, GROUND_Z + 0.72),
             mat=MAT["soil_dark"], ink=False, collection=house)

    hinge = bpy.data.objects.new("NB_Door_Hinge", None)
    bpy.context.scene.collection.objects.link(hinge)
    hinge.location = (SHAFT_X - 0.52, -0.56, GROUND_Z + 0.02)
    door = make_box("NB_BlastDoor", 1.02, 0.14, 1.42, center=(0.51, 0, 0.71),
                    mat=MAT["steel_dark"], ink=True, collection=house)
    door.parent = hinge
    for i in range(3):
        stripe = make_box(f"NB_DoorStripe_{i}", 1.04, 0.15, 0.09, center=(0.51, 0, 0.22 + i * 0.42),
                          mat=MAT["hazard"], ink=False, collection=house)
        stripe.parent = hinge
    wheel = make_cylinder("NB_DoorWheel", 0.24, 0.07, center=(0.51, -0.10, 0.78),
                          rot=(math.pi / 2, 0, 0), mat=MAT["hazard"], ink=False,
                          collection=house, segments=20)
    wheel.parent = hinge

    # tucked away until the blast door beat
    for ob in house.objects:
        ob.scale = (0.001, 0.001, 0.001)

    return col, hinge, house


def build_air_pipe():
    col = bpy.data.collections.new("NB_Air")
    bpy.context.scene.collection.children.link(col)

    top = GROUND_Z + 1.62
    ceiling = TUBE_Z + math.sqrt(TUBE_R ** 2 - (AIR_X - TUBE_X) ** 2)  # ~ -3.29
    bottom = ceiling - 0.42
    pipe = make_cylinder("NB_AirPipe", 0.20, top - bottom,
                         center=(AIR_X, AIR_Y, (top + bottom) / 2),
                         mat=MAT["steel"], ink=True, collection=col, segments=20)
    make_cone("NB_AirCap", 0.62, 0.34, center=(AIR_X, AIR_Y, top + 0.10),
              mat=MAT["steel_dark"], ink=True, collection=col, segments=24)
    make_cylinder("NB_AirCollar", 0.32, 0.12, center=(AIR_X, AIR_Y, GROUND_Z + 0.06),
                  mat=MAT["steel_warm"], ink=False, collection=col, segments=20)

    # dust filter box and hand-cranked fan hanging inside the chamber
    make_box("NB_FilterBox", 0.78, 0.62, 0.5, center=(AIR_X, AIR_Y, bottom - 0.28),
             mat=MAT["steel_dark"], ink=True, collection=col)
    for i in range(4):
        make_box(f"NB_FilterGrill_{i}", 0.6, 0.05, 0.05,
                 center=(AIR_X, AIR_Y - 0.34, bottom - 0.12 - i * 0.11),
                 mat=MAT["steel"], ink=False, collection=col)
    fan = make_cylinder("NB_Fan", 0.30, 0.07, center=(AIR_X, AIR_Y - 0.10, bottom - 0.60),
                        rot=(math.pi / 2, 0, 0), mat=MAT["steel_dark"], ink=True,
                        collection=col, segments=20)
    for i in range(4):
        blade = make_box(f"NB_FanBlade_{i}", 0.52, 0.06, 0.11, center=(0, -0.05, 0),
                         mat=MAT["steel"], ink=False, collection=col)
        blade.parent = fan
        blade.rotation_euler = (0, 0, i * math.pi / 2 + 0.4)
    return col, fan


def build_valve():
    col = bpy.data.collections.new("NB_Valve")
    bpy.context.scene.collection.children.link(col)
    z = TUBE_Z + math.sqrt(TUBE_R ** 2 - (AIR_X - TUBE_X) ** 2) - 1.05
    make_torus("NB_ValveRing", 0.33, 0.09, center=(AIR_X, AIR_Y - 0.04, z),
               rot=(math.pi / 2, 0, 0), mat=MAT["hazard"], collection=col)
    flap = bpy.data.objects.new("NB_ValveFlap", None)
    bpy.context.scene.collection.objects.link(flap)
    flap.location = (AIR_X, AIR_Y, z)
    blade = make_cylinder("NB_ValveBlade", 0.31, 0.05, center=(0, 0, 0),
                          rot=(math.pi / 2, 0, 0), mat=MAT["steel"], ink=False,
                          collection=col, segments=20)
    blade.parent = flap
    return col, flap


def build_second_exit():
    col = bpy.data.collections.new("NB_Exit2")
    bpy.context.scene.collection.children.link(col)

    # diagonal tunnel from the chamber to a hatch away from the house
    a = (1.55, -4.55)
    b = (4.25, 0.10)
    length = math.hypot(b[0] - a[0], b[1] - a[1])
    ang = math.atan2(b[0] - a[0], b[1] - a[1])
    tunnel = make_cylinder("NB_Exit2_Tunnel", 0.44, length,
                           center=((a[0] + b[0]) / 2, SHAFT_Y, (a[1] + b[1]) / 2),
                           mat=MAT["steel"], ink=False, collection=col, segments=20)
    tunnel.rotation_euler = (0, ang, 0)

    make_torus("NB_Hatch_Ring", 0.56, 0.11, center=(b[0], SHAFT_Y, GROUND_Z + 0.04),
               rot=(0, 0, 0), mat=MAT["steel_dark"], collection=col)
    hinge = bpy.data.objects.new("NB_Hatch_Hinge", None)
    bpy.context.scene.collection.objects.link(hinge)
    hinge.location = (b[0] - 0.52, SHAFT_Y, GROUND_Z + 0.10)
    lid = make_cylinder("NB_Hatch_Lid", 0.60, 0.10, center=(0.52, 0, 0),
                        rot=(0, 0, 0), mat=MAT["steel"], ink=True, collection=col, segments=24)
    lid.parent = hinge
    for ob in col.objects:
        ob.scale = (0.001, 0.001, 0.001)
    return col, hinge


def build_geiger():
    col = bpy.data.collections.new("NB_Geiger")
    bpy.context.scene.collection.children.link(col)
    body = make_box("NB_Geiger_Body", 0.62, 0.16, 0.46, center=(-1.72, 0.30, -4.35),
                    mat=MAT["cream"], ink=True, collection=col)
    dial = make_cylinder("NB_Geiger_Dial", 0.19, 0.05, center=(-1.72, 0.20, -4.35),
                         rot=(math.pi / 2, 0, 0), mat=MAT["steel_dark"], ink=False,
                         collection=col, segments=20)
    needle = make_box("NB_Geiger_Needle", 0.02, 0.03, 0.16, center=(-1.72, 0.17, -4.30),
                      mat=MAT["red"], ink=False, collection=col)
    needle.parent = dial
    for ob in col.objects:
        ob.scale = (0.001, 0.001, 0.001)
    return col, needle


def build_furniture():
    col = bpy.data.collections.new("NB_Furniture")
    bpy.context.scene.collection.children.link(col)
    items = []

    # bunk beds against the back wall, left side
    bx = -1.65
    for bi, by in enumerate((1.55, 2.05)):
        for side in (-1, 1):
            make_box(f"NB_BedPost_{bi}_{side}", 0.08, 0.08, 1.35,
                     center=(bx + side * 0.62, by, FLOOR_Z + 0.67),
                     mat=MAT["steel_dark"], ink=False, collection=col)
        for lvl in (0, 1):
            bed = make_box(f"NB_Bed_{bi}_{lvl}", 1.3, 0.8, 0.12,
                           center=(bx, by, FLOOR_Z + 0.32 + lvl * 0.62),
                           mat=MAT["cream"], ink=False, collection=col)
            make_box(f"NB_BedPillow_{bi}_{lvl}", 0.5, 0.62, 0.14,
                     center=(bx - 0.34, by, FLOOR_Z + 0.42 + lvl * 0.62),
                     mat=MAT["red"], ink=False, collection=col)
            items.append(bed)

    # crates and cans, right side
    for i, (cx, cy) in enumerate([(1.5, 2.15), (1.5, 1.75), (1.05, 2.15)]):
        items.append(make_box(f"NB_Crate_{i}", 0.42, 0.42, 0.34,
                              center=(cx, cy, FLOOR_Z + 0.17),
                              mat=MAT["orange"] if i % 2 else MAT["green"],
                              ink=False, collection=col))
    for i in range(9):
        items.append(make_cylinder(f"NB_Can_{i}", 0.065, 0.16,
                                   center=(1.05 + (i % 3) * 0.15, 1.62 + (i // 3) * 0.15,
                                           FLOOR_Z + 0.44),
                                   mat=MAT["red"] if i % 2 else MAT["hazard"],
                                   ink=False, collection=col, segments=12))

    # crank radio on a small table
    items.append(make_box("NB_Table", 0.8, 0.55, 0.07, center=(0.35, 1.9, FLOOR_Z + 0.55),
                          mat=MAT["wood"], ink=False, collection=col))
    for dx, dy in ((-0.32, -0.2), (0.32, -0.2), (-0.32, 0.2), (0.32, 0.2)):
        items.append(make_box(f"NB_TableLeg_{dx}_{dy}", 0.06, 0.06, 0.55,
                              center=(0.35 + dx, 1.9 + dy, FLOOR_Z + 0.27),
                              mat=MAT["wood"], ink=False, collection=col))
    radio = make_box("NB_Radio", 0.5, 0.22, 0.32, center=(0.35, 1.9, FLOOR_Z + 0.74),
                     mat=MAT["blue"], ink=True, collection=col)
    make_box("NB_RadioGrill", 0.2, 0.05, 0.18, center=(0.22, 1.78, FLOOR_Z + 0.74),
             mat=MAT["steel_dark"], ink=False, collection=col)
    items.append(radio)

    # board game on the floor
    board = make_box("NB_Board", 0.85, 0.55, 0.05, center=(-0.15, 1.15, FLOOR_Z + 0.03),
                     mat=MAT["cream"], ink=False, collection=col)
    for i in range(8):
        make_box(f"NB_BoardTile_{i}", 0.1, 0.1, 0.014,
                 center=(-0.44 + (i % 4) * 0.19, 1.02 + (i // 4) * 0.2, FLOOR_Z + 0.065),
                 mat=MAT["red"] if i % 3 else MAT["hazard"], ink=False, collection=col)
    items.append(board)

    for ob in items:
        ob.scale = (0.001, 0.001, 0.001)
    return col, items


def build_radiation():
    col = bpy.data.collections.new("NB_Radiation")
    bpy.context.scene.collection.children.link(col)
    rays = []
    for i in range(5):
        x = SHAFT_X - 0.32 + i * 0.16
        ray = make_cylinder(f"NB_Ray_{i}", 0.028, 5.6, center=(x, SHAFT_Y - 0.62, 0.9),
                            mat=MAT["rad"], ink=False, collection=col, segments=6)
        rays.append(ray)

    drops = []
    for i in range(34):
        x = -7.5 + RNG.uniform(0, 15.0)
        y = -0.2 + RNG.uniform(0, 2.2)
        drop = make_sphere(f"NB_Fallout_{i}", 0.06, center=(x, y, 6.0),
                           mat=MAT["rad_dim"], ink=False, collection=col,
                           segments=8, ring_count=6)
        drops.append(drop)
    return col, rays, drops


def build_cloud():
    col = bpy.data.collections.new("NB_Cloud")
    bpy.context.scene.collection.children.link(col)
    parts = []
    cx = 4.6
    stem = make_sphere("NB_Cloud_Stem", 1.0, center=(cx, 2.6, 3.4),
                       scale=(0.5, 0.5, 1.6), mat=MAT["smoke"], ink=False, collection=col)
    parts.append(stem)
    for i, (dx, dz, r) in enumerate([(0, 5.2, 1.35), (-1.15, 4.9, 1.0), (1.15, 4.9, 1.0),
                                     (-0.55, 6.0, 1.0), (0.6, 6.0, 1.05), (0, 6.6, 0.9)]):
        p = make_sphere(f"NB_Cloud_Puff_{i}", r, center=(cx + dx, 2.6, dz),
                        scale=(1.0, 0.9, 0.8),
                        mat=MAT["smoke_dark"] if i % 2 else MAT["smoke"],
                        ink=False, collection=col)
        parts.append(p)
    ring = make_cylinder("NB_Cloud_Ring", 2.0, 0.35, center=(cx, 2.6, 1.0),
                         mat=MAT["smoke"], ink=False, collection=col, segments=40)
    parts.append(ring)
    for p in parts:
        p.scale = (0.001, 0.001, 0.001)
    return col, parts
