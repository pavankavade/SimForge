def build_ground():
    col = bpy.data.collections.new("NB_Terrain")
    bpy.context.scene.collection.children.link(col)

    soil_bottom = -9.0
    soil_h = GROUND_Z - soil_bottom
    soil = make_box("NB_SoilBlock", 18.0, 3.4, soil_h,
                    center=(0, 0.6, (GROUND_Z + soil_bottom) / 2),
                    mat=MAT["soil"], ink=False, collection=col)
    # the chamber is a round hole cut straight through the soil face
    cut_cylinder(soil, TUBE_R + 0.03, 8.0, (TUBE_X, 0.6, TUBE_Z))

    make_box("NB_GrassLayer", 18.0, 3.4, 0.30, center=(0, 0.6, GROUND_Z - 0.15),
             mat=MAT["grass"], ink=False, collection=col)

    # --- the cut face: soft strata, stones, roots and a ragged grass edge --
    face_y = SOIL_FRONT + 0.03
    RNG2 = random.Random(23)

    for bi, (z0, thick, mat) in enumerate([
        (-0.62, 0.26, MAT["soil_dark"]),
        (-1.62, 0.22, MAT["soil_light"]),
        (-2.60, 0.18, MAT["soil_dark"]),
        (-6.55, 0.34, MAT["soil_dark"]),
        (-7.60, 0.46, MAT["soil_light"]),
        (-8.55, 0.38, MAT["soil_dark"]),
    ]):
        x = -8.6
        k = 0
        while x < 8.6:
            z = z0 + math.sin(x * 0.85 + bi * 1.7) * 0.20
            if (x - TUBE_X) ** 2 + (z - TUBE_Z) ** 2 > (TUBE_R + 0.55) ** 2:
                make_sphere(f"NB_Band_{bi}_{k}", thick,
                            center=(x, face_y + RNG2.uniform(-0.01, 0.02), z),
                            scale=(2.4, 0.16, 0.8), mat=mat, ink=False,
                            collection=col, segments=10, ring_count=6)
                k += 1
            x += thick * 2.6

    # embedded stones
    for i in range(62):
        x = RNG2.uniform(-8.5, 8.5)
        z = RNG2.uniform(-8.5, -0.25)
        r = RNG2.uniform(0.10, 0.25)
        if (x - TUBE_X) ** 2 + (z - TUBE_Z) ** 2 < (TUBE_R + 0.30 + r) ** 2:
            continue
        make_sphere(f"NB_Stone_{i}", r,
                    center=(x, face_y + RNG2.uniform(0.0, 0.07), z),
                    scale=(1.0, RNG2.uniform(0.22, 0.45), RNG2.uniform(0.55, 1.0)),
                    mat=MAT["soil_light"] if i % 3 else MAT["soil_dark"],
                    ink=False, collection=col, segments=10, ring_count=6)

    # roots hanging out of the grass line
    for i in range(16):
        x = RNG2.uniform(-8.0, 8.0)
        if abs(x - TUBE_X) < TUBE_R + 0.4:
            continue
        for j in range(6):
            make_sphere(f"NB_Root_{i}_{j}", 0.075 - j * 0.008,
                        center=(x + math.sin(j * 1.2 + i) * 0.07, face_y + 0.01,
                                GROUND_Z - 0.16 - j * 0.17),
                        scale=(0.85, 0.30, 1.7), mat=MAT["wood"], ink=False,
                        collection=col, segments=8, ring_count=6)

    # ragged tufts overhanging the cut edge
    for i in range(52):
        x = -8.7 + i * 0.34 + RNG2.uniform(-0.09, 0.09)
        make_sphere(f"NB_GrassTuft_{i}", RNG2.uniform(0.10, 0.17),
                    center=(x, face_y + 0.02, GROUND_Z + RNG2.uniform(-0.03, 0.09)),
                    scale=(1.0, 0.32, RNG2.uniform(0.5, 0.9)),
                    mat=MAT["grass"], ink=False, collection=col,
                    segments=8, ring_count=6)

    # broken rock ring so the chamber mouth is not a perfect circle
    for i in range(30):
        a = math.tau * i / 30
        r = TUBE_R + 0.14
        make_sphere(f"NB_RimRock_{i}", RNG2.uniform(0.16, 0.27),
                    center=(TUBE_X + math.cos(a) * r, face_y + 0.01,
                            TUBE_Z + math.sin(a) * r),
                    scale=(1.0, 0.30, 0.95),
                    mat=MAT["soil_light"] if i % 3 else MAT["soil_dark"],
                    ink=False, collection=col, segments=8, ring_count=6)

    # hole in the yard, down to the entrance shaft
    make_cylinder("NB_HoleDark", 0.62, 1.5, center=(SHAFT_X, 1.5, GROUND_Z - 0.72),
                  mat=MAT["soil_dark"], ink=False, collection=col, segments=32)
    make_torus("NB_HoleRim", 0.66, 0.13, center=(SHAFT_X, 1.5, GROUND_Z + 0.04),
               rot=(0, 0, 0), mat=MAT["soil_light"], collection=col)

    build_house(col, HOUSE_X)
    build_tree(col, -6.20, scale=0.75)
    build_tree(col, 4.60, scale=0.62)
    build_fence(col)
    build_bushes(col)
    return col


