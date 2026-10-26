"""Builds the NuclearBunker cutaway diorama in Blender.

Run inside Blender:
    exec(open(r"D:/git/SimForge/scripts/blender_nuclear_bunker.py").read())

Reuses the procedural primitive + chibi rig helpers from blender_simforge_cw.py.
Everything is keyed from narrationCues.json, so re-voicing moves the whole scene.
"""

import importlib.util
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Vector

ROOT = Path(r"D:\git\SimForge")
CUES_PATH = ROOT / "src" / "shelter" / "nuclear-bunker" / "data" / "narrationCues.json"
OUT_BLEND = ROOT / "out" / "nuclear_bunker.blend"
FRAMES_DIR = ROOT / "out" / "nb_frames"

# --- import the shared Blender toolkit --------------------------------------
_spec = importlib.util.spec_from_file_location(
    "cw_blender", ROOT / "scripts" / "blender_simforge_cw.py"
)
cw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cw)

make_box = cw.make_box
make_cylinder = cw.make_cylinder
make_sphere = cw.make_sphere
make_cone = cw.make_cone
make_capsule = cw.make_capsule
vinyl = cw.make_vinyl_mat
glow = cw.make_glow_mat

CUES = json.loads(CUES_PATH.read_text())
FPS = 30
DURATION = CUES["durationFrames"]
LINES = CUES["lines"]


def W(line, word, nth=0):
    """Frame of a spoken word, case/punctuation-insensitive."""
    want = "".join(ch for ch in word.lower() if ch.isalnum() or ch == "'")
    hits = []
    for w in LINES[line]["words"]:
        got = "".join(ch for ch in w["word"].lower() if ch.isalnum() or ch == "'")
        if got == want:
            hits.append(w["startFrame"])
    if not hits:
        raise KeyError(f"{word!r} not in {line}")
    return hits[min(nth, len(hits) - 1)]


def LS(line):
    return LINES[line]["startFrame"]


def LE(line):
    return LINES[line]["endFrame"]


# ---------------------------------------------------------------------------
# materials
# ---------------------------------------------------------------------------

def mat_surface(name, c1, c2, scale=8.0, roughness=0.75, bump=0.25):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = roughness
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 6.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = Vector(cw.hex_to_rgba(c1))
    ramp.color_ramp.elements[1].color = Vector(cw.hex_to_rgba(c2))
    ramp.color_ramp.elements[0].position = 0.32
    ramp.color_ramp.elements[1].position = 0.72
    bmp = nt.nodes.new("ShaderNodeBump")
    bmp.inputs["Strength"].default_value = bump
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(noise.outputs["Fac"], bmp.inputs["Height"])
    nt.links.new(bmp.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def _noise(nt, scale, detail=6.0, coord=None):
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    if coord is not None:
        nt.links.new(coord, n.inputs["Vector"])
    return n


def _ramp(nt, stops):
    r = nt.nodes.new("ShaderNodeValToRGB")
    els = r.color_ramp.elements
    while len(els) < len(stops):
        els.new(0.5)
    for el, (pos, hex_color) in zip(els, stops):
        el.position = pos
        el.color = Vector(cw.hex_to_rgba(hex_color))
    return r


def mat_lawn(name):
    """Mown lawn: soft light/dark stripes plus fine blade speckle."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.85
    coord = nt.nodes.new("ShaderNodeTexCoord").outputs["Object"]
    stripes = nt.nodes.new("ShaderNodeTexWave")
    stripes.wave_profile = "SIN"
    stripes.inputs["Scale"].default_value = 0.9
    stripes.inputs["Distortion"].default_value = 1.5
    nt.links.new(coord, stripes.inputs["Vector"])
    blades = _noise(nt, 70.0, 2.0, coord)
    patches = _noise(nt, 3.0, 4.0, coord)
    mix = nt.nodes.new("ShaderNodeMath")
    mix.operation = "MULTIPLY_ADD"
    mix.inputs[1].default_value = 0.35
    nt.links.new(stripes.outputs["Fac"], mix.inputs[0])
    nt.links.new(blades.outputs["Fac"], mix.inputs[2])
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "MULTIPLY_ADD"
    add.inputs[1].default_value = 0.4
    nt.links.new(patches.outputs["Fac"], add.inputs[0])
    nt.links.new(mix.outputs[0], add.inputs[2])
    ramp = _ramp(nt, [(0.45, "#2f7a2c"), (0.75, "#4f9e3c"), (1.05, "#79c04f")])
    nt.links.new(add.outputs[0], ramp.inputs["Fac"])
    bmp = nt.nodes.new("ShaderNodeBump")
    bmp.inputs["Strength"].default_value = 0.35
    nt.links.new(blades.outputs["Fac"], bmp.inputs["Height"])
    nt.links.new(bmp.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def mat_strata(name):
    """Cut soil face: dark topsoil, tan clay, reddish subsoil, gravel bands,
    wobbled by noise and grained like real earth (world Z drives the layers)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.92
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    wob = _noise(nt, 0.35, 3.0, geo.outputs["Position"])
    depth = nt.nodes.new("ShaderNodeMath")
    depth.operation = "MULTIPLY_ADD"
    depth.inputs[1].default_value = 0.9
    nt.links.new(wob.outputs["Fac"], depth.inputs[0])
    nt.links.new(sep.outputs["Z"], depth.inputs[2])
    norm = nt.nodes.new("ShaderNodeMapRange")
    norm.inputs["From Min"].default_value = GROUND_Z - 9.0
    norm.inputs["From Max"].default_value = GROUND_Z + 0.4
    nt.links.new(depth.outputs[0], norm.inputs["Value"])
    layers = _ramp(nt, [(0.0, "#6e3f24"), (0.30, "#86512e"), (0.52, "#9a7048"),
                        (0.70, "#7d5a3a"), (0.86, "#5a3c26"), (0.94, "#3e2a1b")])
    layers.color_ramp.interpolation = "EASE"
    nt.links.new(norm.outputs[0], layers.inputs["Fac"])
    grain = _noise(nt, 26.0, 8.0, geo.outputs["Position"])
    shade = nt.nodes.new("ShaderNodeMapRange")
    shade.inputs["To Min"].default_value = 0.72
    shade.inputs["To Max"].default_value = 1.12
    nt.links.new(grain.outputs["Fac"], shade.inputs["Value"])
    tint = nt.nodes.new("ShaderNodeMix")
    tint.data_type = "RGBA"
    tint.blend_type = "MULTIPLY"
    tint.inputs["Factor"].default_value = 1.0
    nt.links.new(layers.outputs["Color"], tint.inputs[6])
    nt.links.new(shade.outputs[0], tint.inputs[7])
    nt.links.new(tint.outputs[2], bsdf.inputs["Base Color"])
    bmp = nt.nodes.new("ShaderNodeBump")
    bmp.inputs["Strength"].default_value = 0.45
    nt.links.new(grain.outputs["Fac"], bmp.inputs["Height"])
    nt.links.new(bmp.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def mat_paint(name, hex_color, rough=0.55, metallic=0.15, bump=0.12):
    """Painted steel: a little sheen, no mirror, so warm lamps read on it."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = Vector(cw.hex_to_rgba(hex_color))
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metallic
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 22.0
    noise.inputs["Detail"].default_value = 4.0
    bmp = nt.nodes.new("ShaderNodeBump")
    bmp.inputs["Strength"].default_value = bump
    nt.links.new(noise.outputs["Fac"], bmp.inputs["Height"])
    nt.links.new(bmp.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def mat_corrugated(name, hex_color, axis="Y", pitch=0.13):
    """Painted corrugated steel: shallow ribs every `pitch` along the pipe's
    local axis (object coordinates), plus the paint's fine noise."""
    mat = mat_paint(name, hex_color, 0.45, 0.25, 0.08)
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Object"], sep.inputs[0])
    # sine of the axis coordinate -> rib height
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 2 * math.pi / pitch
    nt.links.new(sep.outputs[axis], mul.inputs[0])
    sine = nt.nodes.new("ShaderNodeMath")
    sine.operation = "SINE"
    nt.links.new(mul.outputs[0], sine.inputs[0])
    ribs = nt.nodes.new("ShaderNodeBump")
    ribs.inputs["Strength"].default_value = 0.55
    ribs.inputs["Distance"].default_value = 0.02
    nt.links.new(sine.outputs[0], ribs.inputs["Height"])
    # chain after the paint's own noise bump
    old = bsdf.inputs["Normal"].links[0].from_node
    nt.links.new(old.outputs["Normal"], ribs.inputs["Normal"])
    nt.links.new(ribs.outputs["Normal"], bsdf.inputs["Normal"])
    # a touch of grime in the troughs so the ribs read at phone size
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = -1.0
    ramp.inputs["To Min"].default_value = 0.72
    ramp.inputs["To Max"].default_value = 1.0
    nt.links.new(sine.outputs[0], ramp.inputs["Value"])
    tint = nt.nodes.new("ShaderNodeMix")
    tint.data_type = "RGBA"
    tint.blend_type = "MULTIPLY"
    tint.inputs["Factor"].default_value = 1.0
    tint.inputs[6].default_value = Vector(cw.hex_to_rgba(hex_color))
    nt.links.new(ramp.outputs[0], tint.inputs[7])
    nt.links.new(tint.outputs[2], bsdf.inputs["Base Color"])
    return mat


def tinted_glow(name, hex_color, strength):
    """cw glow keeps a white base colour, which washes thin rays out to white."""
    mat = glow(name, hex_color, strength)
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = \
        Vector(cw.hex_to_rgba(hex_color))
    return mat


def build_materials():
    """Built after clean_scene(), so no stale data-block references survive."""
    return {
    "soil": mat_surface("NB_Soil", "#4b3320", "#6d4c31", 7.0),
    "soil_dark": mat_surface("NB_SoilDark", "#332216", "#4a3220", 9.0),
    "soil_light": mat_surface("NB_SoilLight", "#6a4a30", "#8a6342", 11.0),
    "plug": mat_surface("NB_Plug", "#4b3320", "#6d4c31", 5.0),
    "hole": mat_surface("NB_Hole", "#1c1209", "#2a1a0c", 4.0),
    "grass": mat_lawn("NB_Grass"),
    "strata": mat_strata("NB_Strata"),
    "hedge": mat_surface("NB_Hedge", "#2b5c31", "#3c7a3d", 4.0),
    "concrete": mat_surface("NB_Concrete", "#837d72", "#9a9386", 6.0, bump=0.1),
    "wood": mat_surface("NB_Wood", "#9a6a39", "#c58f52", 12.0, bump=0.12),
    "slab": vinyl("NB_Slab", "#8d8579", "cloth"),
    "wall": vinyl("NB_Wall", "#f2efe3", "cloth"),
    "roof": vinyl("NB_Roof", "#b0402c", "cloth"),
    "trim": vinyl("NB_Trim", "#fbfaf4", "cloth"),
    "glass": vinyl("NB_Glass", "#4a6f9e", "gloss"),
    "steel": mat_paint("NB_Steel", "#a39b8d", 0.52, 0.18),
    "corr_y": mat_corrugated("NB_CorrY", "#a39b8d", "Y"),
    "corr_z": mat_corrugated("NB_CorrZ", "#a39b8d", "Z"),
    "steel_dark": mat_paint("NB_SteelDark", "#8d867c", 0.58, 0.16),
    "steel_warm": mat_paint("NB_SteelWarm", "#b98d57", 0.5, 0.2),
    "steel_blue": mat_paint("NB_SteelBlue", "#8c99a6", 0.55, 0.18),
    "hazard": vinyl("NB_Hazard", "#e0a52a", "cloth"),
    "rubber": vinyl("NB_Rubber", "#2b2f36", "leather"),
    "green": vinyl("NB_Green", "#4f7d4a", "cloth"),
    "orange": vinyl("NB_Orange", "#d97b2f", "cloth"),
    "cream": vinyl("NB_Cream", "#e8ddc4", "cloth"),
    "red": vinyl("NB_Red", "#c4463a", "cloth"),
    "blue": vinyl("NB_Blue", "#3f6ea8", "cloth"),
    "rad": tinted_glow("NB_Radiation", "#b8e03a", 1.0),
    "rad_dim": tinted_glow("NB_RadiationDim", "#a6d63a", 0.85),
    "iris": vinyl("NB_Iris", "#5a3a22", "gloss"),
    "bulb": glow("NB_Bulb", "#ffe6a6", 8.0),
    "ember": glow("NB_Ember", "#ff8a3c", 4.0),
    "smoke": vinyl("NB_Smoke", "#8a7f74", "cloth"),
    "smoke_dark": vinyl("NB_SmokeDark", "#5b4b40", "cloth"),
    "water": vinyl("NB_Water", "#4a8bb8", "gloss"),
    }


MAT = {}

RNG = random.Random(11)


def setmat(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def key(obj, frame, loc=None, rot=None, scale=None):
    if loc is not None:
        obj.location = Vector(loc)
        obj.keyframe_insert("location", frame=frame)
    if rot is not None:
        obj.rotation_euler = Euler(rot)
        obj.keyframe_insert("rotation_euler", frame=frame)
    if scale is not None:
        obj.scale = Vector(scale)
        obj.keyframe_insert("scale", frame=frame)


def pop_out(obj, frame, dur=8, final=(1, 1, 1)):
    """Scale in with a springy overshoot."""
    key(obj, frame, scale=(0.001, 0.001, 0.001))
    key(obj, frame + dur * 0.65, scale=tuple(c * 1.14 for c in final))
    key(obj, frame + dur, scale=final)


def vanish(obj, frame):
    key(obj, frame, scale=(1, 1, 1))
    key(obj, frame + 2, scale=(0.001, 0.001, 0.001))


def ease_keys(obj):
    act = obj.animation_data.action if obj.animation_data else None
    if not act:
        return
    for fcu in cw.get_action_fcurves(act):
        for kp in fcu.keyframe_points:
            kp.interpolation = "BEZIER"


POSE_PARTS = ("Hips", "Head", "Arm_L", "Arm_R", "Elbow_L", "Elbow_R",
              "Leg_L", "Leg_R", "Knee_L", "Knee_R")


def pose_key(name, frame, pose):
    """Freeze a solved pose on a character at one frame."""
    cw.apply_pose_to_char(name, cw.solve_pose(pose, frame))
    for part in POSE_PARTS:
        ob = bpy.data.objects.get(f"{name}_{part}")
        if not ob:
            continue
        ob.keyframe_insert("rotation_euler", frame=frame)
        if part == "Hips":
            ob.keyframe_insert("location", frame=frame)


# ---------------------------------------------------------------------------
# set
# ---------------------------------------------------------------------------

GROUND_Z = 0.38          # lawn surface
SOIL_FRONT = -1.10       # the cut plane the camera looks at

TUBE_X = 0.35
TUBE_Z = -3.85
TUBE_R = 2.12
TUBE_FRONT = -1.02
TUBE_BACK = 2.60
FLOOR_Z = -4.80

SHAFT_X = -0.60
SHAFT_Y = -0.95
AIR_X = 1.95
AIR_Y = -0.95
HOUSE_X = -2.55
HOUSE_Y = 2.30
HOUSE_SCALE = 0.62


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
    bg.inputs["Strength"].default_value = 0.75
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

    soil_bottom = -40.0   # portrait frames look steeply down: never see under the block
    soil_h = GROUND_Z - soil_bottom
    soil = make_box("NB_SoilBlock", 44.0, 3.4, soil_h,
                    center=(0, 0.6, (GROUND_Z + soil_bottom) / 2),
                    mat=MAT["strata"], ink=False, collection=col)
    # the chamber is a round hole cut straight through the soil face
    cut_cylinder(soil, TUBE_R + 0.03, 8.0, (TUBE_X, 0.6, TUBE_Z))

    # 1 cm proud of the soil block's top, or the two faces z-fight
    make_box("NB_GrassLayer", 44.0, 3.4, 0.30, center=(0, 0.6, GROUND_Z - 0.14),
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

    # hole in the yard: a dark oval on the grass band, with a kicked-up rim
    make_sphere("NB_HoleDark", 0.58,
                center=(SHAFT_X, SOIL_FRONT - 0.02, GROUND_Z - 0.10),
                scale=(1.0, 0.10, 0.38), mat=MAT["hole"],
                ink=False, collection=col, segments=24, ring_count=12)
    hole_rim = make_torus("NB_HoleRim", 0.60, 0.07,
                          center=(SHAFT_X, SOIL_FRONT - 0.01, GROUND_Z - 0.09),
                          rot=(math.pi / 2, 0, 0), mat=MAT["soil"], collection=col)
    hole_rim.scale = (1.0, 0.38, 1.0)
    # spoil heap beside it
    for i, (dx, dz, r) in enumerate([(0.78, 0.02, 0.26), (0.92, 0.10, 0.19), (0.66, 0.12, 0.17)]):
        make_sphere(f"NB_Spoil_{i}", r, center=(SHAFT_X + dx, SOIL_FRONT + 0.02, GROUND_Z + dz),
                    scale=(1.0, 0.5, 0.7), mat=MAT["soil_light"], ink=False,
                    collection=col, segments=10, ring_count=6)

    build_house(col, HOUSE_X)
    build_tree(col, -6.20, scale=0.75)
    build_tree(col, 4.60, scale=0.62)
    build_fence(col)
    build_bushes(col)
    build_backdrop(col)
    return col


def build_backdrop(col):
    """A dark tree line behind the fence, so the horizon is not empty sky."""
    for i, (x, r, z) in enumerate([(-6.4, 0.72, 0.52), (-4.2, 0.92, 0.62), (-1.8, 0.85, 0.55),
                                   (0.8, 0.95, 0.62), (3.2, 0.75, 0.52), (5.6, 0.88, 0.58),
                                   (7.8, 0.75, 0.52)]):
        make_sphere(f"NB_Hedge_{i}", r, center=(x, 6.5, GROUND_Z + z), scale=(1.0, 0.6, 1.0),
                    mat=MAT["hedge"], ink=False, collection=col)
    make_box("NB_HedgeBase", 22.0, 1.0, 0.55, center=(0, 6.5, GROUND_Z + 0.2),
             mat=MAT["hedge"], ink=False, collection=col)


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
                        center=(0, 0, 0),
                        mat=MAT["roof"], ink=True, collection=col)
        slab.rotation_euler = (0, side * pitch, 0)
        slab.location = (hx + side * (w / 4 + 0.06), HOUSE_Y, base_z + h + 0.64)

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

    # shrink the whole house about its base: a distant home, not a set piece
    s = HOUSE_SCALE
    pivot = Vector((hx, HOUSE_Y, base_z))
    hub = bpy.data.objects.new("NB_HousePivot", None)
    bpy.context.scene.collection.objects.link(hub)
    hub.location = pivot
    hub.scale = (s, s, s)
    for ob in [o for o in col.objects if o.name.startswith(
            ("NB_House", "NB_Roof_", "NB_Chimney", "NB_Win", "NB_Shutter",
             "NB_FrontDoor", "NB_Knob", "NB_Step", "NB_Porch", "NB_Pot"))]:
        ob.parent = hub
        ob.matrix_parent_inverse = Matrix.Translation(-pivot)


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
        make_box(f"NB_Picket_{i}", 0.10, 0.08, 0.55,
                 center=(i * 0.62, 2.95, GROUND_Z + 0.28),
                 mat=MAT["wood"], ink=False, collection=col)
    make_box("NB_FenceRail", 12.0, 0.06, 0.08, center=(0, 2.92, GROUND_Z + 0.42),
             mat=MAT["wood"], ink=False, collection=col)


def build_bushes(col):
    for i, (x, r) in enumerate([(1.55, 0.34), (2.05, 0.26), (4.9, 0.34), (-5.1, 0.30)]):
        make_sphere(f"NB_Bush_{i}", r, center=(x, 1.75, GROUND_Z + r * 0.55),
                    scale=(1.0, 0.8, 0.75), mat=MAT["grass"], ink=True, collection=col)


# ---------------------------------------------------------------------------
# bunker
# ---------------------------------------------------------------------------

def build_tube():
    col = bpy.data.collections.new("NB_Bunker")
    bpy.context.scene.collection.children.link(col)

    mid_y = (TUBE_BACK + TUBE_FRONT) / 2
    depth = TUBE_BACK - TUBE_FRONT

    # riveted steel shell: a ring of plates around the chamber axis (Y)
    n = 40
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        seg = TUBE_R * 2 * math.pi / n * 1.06
        panel = make_box(f"NB_Shell_{i:02d}", seg, depth, 0.09,
                         center=(0, 0, 0), mat=MAT["corr_y"],
                         ink=False, collection=col)
        panel.rotation_euler = (0, math.pi / 2 - a, 0)
        panel.location = (TUBE_X + math.cos(a) * TUBE_R, mid_y,
                          TUBE_Z + math.sin(a) * TUBE_R)
        # darker seam between plates, so the wall reads as bolted sheet metal
        if i % 2 == 0:
            seam = make_box(f"NB_Seam_{i:02d}", 0.035, depth, 0.11,
                            center=(0, 0, 0), mat=MAT["steel_dark"],
                            ink=False, collection=col)
            seam.rotation_euler = (0, math.pi / 2 - a, 0)
            seam.location = (TUBE_X + math.cos(a) * (TUBE_R - 0.02), mid_y,
                             TUBE_Z + math.sin(a) * (TUBE_R - 0.02))

    # stiffener rings inside the pipe
    for i in range(4):
        y = TUBE_FRONT + 0.70 + i * 0.85
        make_torus(f"NB_Rib_{i}", TUBE_R - 0.055, 0.055, center=(TUBE_X, y, TUBE_Z),
                   rot=(math.pi / 2, 0, 0), mat=MAT["steel_dark"], collection=col)

    # steel lip around the mouth
    make_torus("NB_Rim", TUBE_R + 0.01, 0.075, center=(TUBE_X, TUBE_FRONT + 0.02, TUBE_Z),
               rot=(math.pi / 2, 0, 0), mat=MAT["steel_dark"], collection=col)
    bpy.data.objects["NB_Rim"].scale = (0.001, 0.001, 0.001)

    # dirt packed under the deck, so the mouth reads as a D, not a drum
    make_box("NB_SubFloor", TUBE_R * 2 + 0.2, 3.85, 1.16,
             center=(TUBE_X, 0.82, -5.54), mat=MAT["soil_dark"], ink=False,
             collection=col)

    # --- back bulkhead: plate, ribs, hatch and conduit --------------------
    back_y = TUBE_BACK - 0.08
    make_cylinder("NB_BackWall", TUBE_R, 0.16, center=(TUBE_X, back_y, TUBE_Z),
                  rot=(math.pi / 2, 0, 0), mat=MAT["steel_dark"], ink=False,
                  collection=col, segments=48)
    for i, (bx, bz) in enumerate(((-1.25, -0.55), (1.25, -0.55), (-1.25, 0.95),
                                  (1.25, 0.95))):
        make_box(f"NB_BackRib_{i}", 0.10, 0.08, 2.0, center=(TUBE_X + bx, back_y - 0.10,
                TUBE_Z + bz), mat=MAT["steel_blue"], ink=False, collection=col)
    make_cylinder("NB_BackHatch", 0.62, 0.10, center=(TUBE_X, back_y - 0.13, FLOOR_Z + 1.05),
                  rot=(math.pi / 2, 0, 0), mat=MAT["steel"], ink=False,
                  collection=col, segments=32)
    make_torus("NB_BackHatchRing", 0.62, 0.06, center=(TUBE_X, back_y - 0.17, FLOOR_Z + 1.05),
               rot=(math.pi / 2, 0, 0), mat=MAT["steel_warm"], collection=col)
    make_cylinder("NB_BackHatchWheel", 0.17, 0.06, center=(TUBE_X, back_y - 0.22, FLOOR_Z + 1.05),
                  rot=(math.pi / 2, 0, 0), mat=MAT["hazard"], ink=False,
                  collection=col, segments=16)
    # conduit and junction box on the back plate
    make_box("NB_Conduit", 0.08, 0.06, 2.4, center=(TUBE_X + 1.78, back_y - 0.10, TUBE_Z + 0.55),
             mat=MAT["steel_blue"], ink=False, collection=col)
    make_box("NB_JunctionBox", 0.34, 0.12, 0.34, center=(TUBE_X + 1.78, back_y - 0.14, TUBE_Z - 0.55),
             mat=MAT["steel_blue"], ink=False, collection=col)

    # dirt plug that hides the chamber until the pipe is installed
    plug = make_cylinder("NB_Plug", TUBE_R + 0.06, 0.12,
                         center=(TUBE_X, SOIL_FRONT + 0.07, TUBE_Z),
                         rot=(math.pi / 2, 0, 0), mat=MAT["strata"], ink=False,
                         collection=col, segments=64)
    # flat, so the cap does not shade like a dome against the soil face
    plug.data.polygons.foreach_set("use_smooth", [False] * len(plug.data.polygons))
    for i in range(16):
        ang = RNG.uniform(0, math.tau)
        rad = RNG.uniform(0.2, 1.75)
        make_sphere(f"NB_PlugPebble_{i}", RNG.uniform(0.08, 0.17),
                    center=(TUBE_X + math.cos(ang) * rad, SOIL_FRONT + 0.04,
                            TUBE_Z + math.sin(ang) * rad),
                    scale=(1.0, 0.4, RNG.uniform(0.6, 1.0)),
                    mat=MAT["soil_light"] if i % 2 else MAT["soil_dark"],
                    ink=False, collection=col, segments=10, ring_count=6)
    # ragged seam of clods where the plug meets the undisturbed face
    for i in range(26):
        a = math.tau * i / 26
        make_sphere(f"NB_PlugSeam_{i}", RNG.uniform(0.07, 0.13),
                    center=(TUBE_X + math.cos(a) * (TUBE_R + 0.03), SOIL_FRONT,
                            TUBE_Z + math.sin(a) * (TUBE_R + 0.03)),
                    scale=(1.0, 0.5, 1.0), mat=MAT["soil_light"],
                    ink=False, collection=col, segments=8, ring_count=6)
    # the strata-matched plug is seamless on its own; the clods gave the hole
    # away before it was dug (built anyway so the RNG sequence is unchanged)
    for ob in [o for o in col.objects if o.name.startswith(("NB_PlugPebble_", "NB_PlugSeam_"))]:
        bpy.data.objects.remove(ob, do_unlink=True)

    # timber floor inside the pipe (spans the chord, so no gap at the walls)
    make_box("NB_Floor", TUBE_R * 2 - 0.36, depth - 0.12, 0.14,
             center=(TUBE_X, mid_y, FLOOR_Z - 0.07),
             mat=MAT["wood"], ink=False, collection=col)
    for i in range(10):
        make_box(f"NB_PlankLine_{i}", 0.025, depth - 0.2, 0.012,
                 center=(TUBE_X - 1.62 + i * 0.36, mid_y, FLOOR_Z + 0.005),
                 mat=MAT["soil_dark"], ink=False, collection=col)
    make_box("NB_FloorLip", TUBE_R * 2 - 0.2, 0.10, 0.16,
             center=(TUBE_X, TUBE_FRONT, FLOOR_Z - 0.08),
             mat=MAT["steel_dark"], ink=False, collection=col)

    # ceiling lamp
    make_cylinder("NB_Lamp", 0.17, 0.07, center=(TUBE_X, 1.1, TUBE_Z + TUBE_R - 0.13),
                  mat=MAT["bulb"], ink=False, collection=col, segments=20)

    # fixed ladder against the left wall
    lx, ly = -1.66, 0.25
    for i, dy in enumerate((-0.20, 0.20)):
        make_box(f"NB_LadderRail_{i}", 0.07, 0.07, 2.95,
                 center=(lx, ly + dy, FLOOR_Z + 1.48),
                 mat=MAT["steel_warm"], ink=False, collection=col)
    for i in range(9):
        make_box(f"NB_Rung_{i}", 0.06, 0.44, 0.05,
                 center=(lx + 0.02, ly, FLOOR_Z + 0.26 + i * 0.30),
                 mat=MAT["steel_warm"], ink=False, collection=col)
    for name, energy, loc in (
            ("NB_LampLight", 60, (TUBE_X, 1.0, TUBE_Z + TUBE_R - 0.5)),
            ("NB_LampLight2", 34, (TUBE_X - 0.8, 2.0, FLOOR_Z + 2.2))):
        ld = bpy.data.lights.new(name, "POINT")
        ld.energy = energy
        ld.color = (1.0, 0.84, 0.62)
        ld.shadow_soft_size = 0.45
        lo = bpy.data.objects.new(name + "_Obj", ld)
        lo.location = loc
        bpy.context.scene.collection.objects.link(lo)

    return col


def build_dirt_cave():
    """The bare dirt hole, before the liner: the first 'bunker'."""
    col = bpy.data.collections.new("NB_DirtCave")
    bpy.context.scene.collection.children.link(col)

    mid_y = (TUBE_BACK + TUBE_FRONT) / 2
    depth = TUBE_BACK - TUBE_FRONT
    n = 40
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        seg = TUBE_R * 2 * math.pi / n * 1.08
        panel = make_box(f"NB_Dirt_{i:02d}", seg, depth, 0.16, center=(0, 0, 0),
                         mat=MAT["soil"] if i % 3 else MAT["soil_dark"],
                         ink=False, collection=col)
        panel.rotation_euler = (0, math.pi / 2 - a, 0)
        panel.location = (TUBE_X + math.cos(a) * (TUBE_R - 0.07), mid_y,
                          TUBE_Z + math.sin(a) * (TUBE_R - 0.07))

    make_cylinder("NB_DirtBack", TUBE_R - 0.04, 0.14,
                  center=(TUBE_X, TUBE_BACK - 0.10, TUBE_Z),
                  rot=(math.pi / 2, 0, 0), mat=MAT["soil_dark"], ink=False,
                  collection=col, segments=40)
    make_box("NB_DirtFloor", TUBE_R * 2 - 0.3, depth - 0.1, 0.12,
             center=(TUBE_X, mid_y, FLOOR_Z - 0.06), mat=MAT["soil_dark"],
             ink=False, collection=col)

    # roots and stones poking out of the raw earth
    for i in range(18):
        a = RNG.uniform(0.15, math.pi - 0.15)
        make_sphere(f"NB_DirtRoot_{i}_{0}", RNG.uniform(0.06, 0.11),
                    center=(TUBE_X + math.cos(a) * (TUBE_R - 0.16),
                            RNG.uniform(TUBE_FRONT + 0.2, TUBE_BACK - 0.2),
                            TUBE_Z + math.sin(a) * (TUBE_R - 0.16)),
                    scale=(1.0, 0.4, 1.4), mat=MAT["wood"], ink=False,
                    collection=col, segments=8, ring_count=6)
    for i in range(22):
        a = RNG.uniform(0, math.tau)
        make_sphere(f"NB_DirtRock_{i}", RNG.uniform(0.09, 0.19),
                    center=(TUBE_X + math.cos(a) * (TUBE_R - 0.18),
                            RNG.uniform(TUBE_FRONT + 0.2, TUBE_BACK - 0.2),
                            TUBE_Z + math.sin(a) * (TUBE_R - 0.18)),
                    scale=(1.0, 1.0, 0.8), mat=MAT["soil_light"], ink=False,
                    collection=col, segments=8, ring_count=6)

    return col


def build_shaft():
    col = bpy.data.collections.new("NB_Shaft")
    bpy.context.scene.collection.children.link(col)

    top = GROUND_Z + 0.05
    ceiling = TUBE_Z + math.sqrt(TUBE_R ** 2 - (SHAFT_X - TUBE_X) ** 2)

    # straight entrance pipe: surface to the chamber ceiling
    straight = make_cylinder("NB_Shaft_Straight", 0.52, top - ceiling,
                             center=(SHAFT_X, SHAFT_Y, (top + ceiling) / 2),
                             mat=MAT["corr_z"], ink=True, collection=col, segments=24)
    straight.scale = (0.001, 0.001, 0.001)
    make_torus("NB_Shaft_Collar", 0.58, 0.09, center=(SHAFT_X, SHAFT_Y, top - 0.02),
               rot=(0, 0, 0), mat=MAT["steel_warm"], collection=col)
    bpy.data.objects["NB_Shaft_Collar"].scale = (0.001, 0.001, 0.001)

    # zig-zag version, revealed when the tunnel is bent
    # joints run surface -> chamber; segments meet exactly, elbows hide the seams
    joints = [(SHAFT_X, top), (SHAFT_X - 0.75, -0.40),
              (SHAFT_X + 0.05, -1.25), (SHAFT_X - 0.35, -2.25)]
    for i, ((xa, za), (xb, zb)) in enumerate(zip(joints, joints[1:])):
        seg = make_cylinder(f"NB_Bent_{i + 1}", 0.46, math.hypot(xb - xa, zb - za),
                            center=(0, 0, 0), mat=MAT["corr_z"], ink=True,
                            collection=col, segments=20)
        seg.rotation_euler = (0, math.atan2(xb - xa, zb - za), 0)
        seg.location = ((xa + xb) / 2, SHAFT_Y, (za + zb) / 2)
    for i, (x, z) in enumerate(joints[1:-1]):
        make_sphere(f"NB_Bent_Elbow_{i + 1}", 0.47, center=(0, 0, 0), mat=MAT["steel_dark"],
                    ink=True, collection=col, segments=20).location = (x, SHAFT_Y, z)
    for ob in col.objects:
        if ob.name.startswith("NB_Bent"):
            ob.hide_render = True
    bpy.data.objects["NB_Shaft_Collar"].hide_render = True

    # surface headhouse with the outward-opening blast door
    house = bpy.data.collections.new("NB_Headhouse")
    bpy.context.scene.collection.children.link(house)
    shed_y = -0.62
    front = shed_y - 0.90
    make_box("NB_Shed", 1.95, 1.80, 1.75, center=(SHAFT_X, shed_y, GROUND_Z + 0.88),
             mat=MAT["concrete"], ink=True, ink_thickness=0.014, collection=house)
    make_box("NB_Shed_Roof", 2.20, 2.05, 0.16, center=(SHAFT_X, shed_y, GROUND_Z + 1.82),
             mat=MAT["concrete"], ink=False, collection=house)
    make_box("NB_Shed_Apron", 2.40, 2.20, 0.12, center=(SHAFT_X, shed_y, GROUND_Z + 0.05),
             mat=MAT["slab"], ink=False, collection=house)
    make_box("NB_Shed_Opening", 1.02, 0.16, 1.45, center=(SHAFT_X, front + 0.04, GROUND_Z + 0.74),
             mat=MAT["soil_dark"], ink=False, collection=house)
    # ladder down the shaft, seen through the opening
    for side in ("L", "R"):
        make_box(f"NB_Shed_LadderRail_{side}", 0.05, 0.05, 1.5,
                 center=(SHAFT_X + (-0.22 if side == "L" else 0.22), front + 0.22, GROUND_Z + 0.72),
                 mat=MAT["steel_dark"], ink=False, collection=house)
    for i in range(6):
        make_box(f"NB_Shed_Rung_{i}", 0.44, 0.05, 0.04,
                 center=(SHAFT_X, front + 0.24, GROUND_Z + 0.18 + i * 0.24),
                 mat=MAT["steel_dark"], ink=False, collection=house)
    # hazard band over the doorway
    make_box("NB_Shed_Band", 1.60, 0.14, 0.14, center=(SHAFT_X, front + 0.01, GROUND_Z + 1.60),
             mat=MAT["hazard"], ink=False, collection=house)

    hinge = bpy.data.objects.new("NB_Door_Hinge", None)
    bpy.context.scene.collection.objects.link(hinge)
    hinge.location = (SHAFT_X - 0.52, front - 0.10, GROUND_Z + 0.02)
    door = make_box("NB_BlastDoor", 1.02, 0.14, 1.42, center=(0.51, 0, 0.71),
                    mat=MAT["steel_dark"], ink=True, collection=house)
    door.parent = hinge
    for i in range(4):
        ridge = make_box(f"NB_DoorRidge_{i}", 0.98, 0.16, 0.07, center=(0.51, 0, 0.24 + i * 0.30),
                         mat=MAT["steel"], ink=False, collection=house)
        ridge.parent = hinge
    for i in range(3):
        stripe = make_box(f"NB_DoorStripe_{i}", 0.98, 0.17, 0.07, center=(0.51, 0, 0.10 + i * 0.62),
                          mat=MAT["hazard"], ink=False, collection=house)
        stripe.parent = hinge
    wheel = make_cylinder("NB_DoorWheel", 0.24, 0.07, center=(0.51, -0.12, 0.78),
                          rot=(math.pi / 2, 0, 0), mat=MAT["hazard"], ink=False,
                          collection=house, segments=20)
    wheel.parent = hinge

    # tucked away until the blast door beat (children follow the hinge)
    for name in ("NB_Shed", "NB_Shed_Roof", "NB_Shed_Opening", "NB_Shed_Apron",
                 "NB_Shed_Band", "NB_Shed_LadderRail_L", "NB_Shed_LadderRail_R"):
        bpy.data.objects[name].scale = (0.001, 0.001, 0.001)
    for i in range(6):
        bpy.data.objects[f"NB_Shed_Rung_{i}"].scale = (0.001, 0.001, 0.001)
    hinge.scale = (0.001, 0.001, 0.001)

    return col, hinge, house


def build_air_pipe():
    col = bpy.data.collections.new("NB_Air")
    bpy.context.scene.collection.children.link(col)

    top = GROUND_Z + 1.62
    ceiling = TUBE_Z + math.sqrt(TUBE_R ** 2 - (AIR_X - TUBE_X) ** 2)  # ~ -3.29
    pipe = make_cylinder("NB_AirPipe", 0.20, top - (ceiling - 0.10),
                         center=(AIR_X, AIR_Y, (top + ceiling - 0.10) / 2),
                         mat=MAT["steel"], ink=True, collection=col, segments=20)
    make_cone("NB_AirCap", 0.62, 0.34, center=(AIR_X, AIR_Y, top + 0.10),
              mat=MAT["steel_dark"], ink=True, collection=col, segments=24)
    make_cylinder("NB_AirCollar", 0.32, 0.12, center=(AIR_X, AIR_Y, GROUND_Z + 0.06),
                  mat=MAT["steel_warm"], ink=False, collection=col, segments=20)

    # cabinet hanging under the ceiling, facing the room
    cz = ceiling - 0.46
    make_box("NB_FilterBox", 0.92, 0.52, 0.94, center=(AIR_X, AIR_Y, cz),
             mat=MAT["steel_dark"], ink=True, collection=col)
    make_box("NB_FilterFace", 0.84, 0.05, 0.86, center=(AIR_X, AIR_Y - 0.28, cz),
             mat=MAT["steel_blue"], ink=False, collection=col)
    for i in range(5):
        make_box(f"NB_FilterGrill_{i}", 0.68, 0.05, 0.055,
                 center=(AIR_X, AIR_Y - 0.32, cz + 0.36 - i * 0.10),
                 mat=MAT["steel"], ink=False, collection=col)
    # hazard band and a red running lamp
    make_box("NB_FilterBand", 0.94, 0.54, 0.07, center=(AIR_X, AIR_Y, cz + 0.44),
             mat=MAT["hazard"], ink=False, collection=col)
    make_sphere("NB_AirLamp", 0.055, center=(AIR_X + 0.36, AIR_Y - 0.30, cz + 0.30),
                mat=MAT["ember"], ink=False, segments=10, ring_count=6)
    # brackets up to the ceiling
    for dx in (-0.34, 0.34):
        make_box(f"NB_FilterBracket_{dx}", 0.05, 0.05, 0.22,
                 center=(AIR_X + dx, AIR_Y, ceiling - 0.02),
                 mat=MAT["steel_blue"], ink=False, collection=col)

    # fan in a round housing on the cabinet face
    fz = cz - 0.26
    make_torus("NB_Fan", 0.285, 0.045, center=(AIR_X, AIR_Y - 0.34, fz),
               rot=(math.pi / 2, 0, 0), mat=MAT["steel"], collection=col)
    make_cylinder("NB_FanHub", 0.085, 0.07, center=(AIR_X, AIR_Y - 0.36, fz),
                  rot=(math.pi / 2, 0, 0), mat=MAT["steel_dark"], ink=True,
                  collection=col, segments=16)
    rotor = bpy.data.objects.new("NB_FanRotor", None)
    col.objects.link(rotor)
    rotor.location = (AIR_X, AIR_Y - 0.36, fz)
    for i in range(4):
        blade = make_box(f"NB_FanBlade_{i}", 0.50, 0.04, 0.13, center=(0, 0, 0),
                         mat=MAT["steel"], ink=False, collection=col)
        blade.parent = rotor
        blade.rotation_euler = (0, i * math.pi / 2 + 0.4, 0)
    # a couple of guard bars over the blades
    for i in range(3):
        make_box(f"NB_FanGuard_{i}", 0.56, 0.02, 0.02,
                 center=(AIR_X, AIR_Y - 0.40, fz - 0.18 + i * 0.18),
                 mat=MAT["steel_dark"], ink=False, collection=col)
    return col, rotor, rotor


def build_valve():
    col = bpy.data.collections.new("NB_Valve")
    bpy.context.scene.collection.children.link(col)
    ceiling = TUBE_Z + math.sqrt(TUBE_R ** 2 - (AIR_X - TUBE_X) ** 2)
    z = ceiling - 1.28
    make_cylinder("NB_ValveHousing", 0.30, 0.26, center=(AIR_X, AIR_Y, z),
                  rot=(math.pi / 2, 0, 0), mat=MAT["steel_dark"], ink=True,
                  collection=col, segments=24)
    make_torus("NB_ValveRing", 0.26, 0.05, center=(AIR_X, AIR_Y - 0.14, z),
               rot=(math.pi / 2, 0, 0), mat=MAT["hazard"], collection=col)
    flap = bpy.data.objects.new("NB_ValveFlap", None)
    col.objects.link(flap)
    flap.location = (AIR_X, AIR_Y - 0.14, z)
    blade = make_cylinder("NB_ValveBlade", 0.245, 0.05, center=(0, 0, 0),
                          rot=(math.pi / 2, 0, 0), mat=MAT["steel"], ink=False,
                          collection=col, segments=24)
    blade.parent = flap
    # hand wheel, so the valve reads as something you crank
    wheel = bpy.data.objects.new("NB_ValveWheel", None)
    col.objects.link(wheel)
    wheel.location = (AIR_X - 0.42, AIR_Y - 0.20, z)
    wheel.rotation_euler = (math.pi / 2, 0, 0)
    rim = make_torus("NB_ValveWheelRim", 0.17, 0.035, center=(0, 0, 0),
                     mat=MAT["hazard"], collection=col)
    rim.parent = wheel
    for i in range(3):
        spoke = make_box(f"NB_ValveSpoke_{i}", 0.30, 0.035, 0.035, center=(0, 0, 0),
                         mat=MAT["hazard"], ink=False, collection=col)
        spoke.parent = wheel
        spoke.rotation_euler = (0, 0, i * math.pi / 3)
    return col, flap


def build_second_exit():
    col = bpy.data.collections.new("NB_Exit2")
    bpy.context.scene.collection.children.link(col)

    # diagonal tunnel from the chamber to a hatch away from the house
    a = (2.23, -2.87)
    b = (3.45, 0.05)
    length = math.hypot(b[0] - a[0], b[1] - a[1])
    ang = math.atan2(b[0] - a[0], b[1] - a[1])
    tunnel = make_cylinder("NB_Exit2_Tunnel", 0.44, length,
                           center=(0, 0, 0),
                           mat=MAT["corr_z"], ink=False, collection=col, segments=20)
    tunnel.rotation_euler = (0, ang, 0)
    # on the cut face like the entrance shaft, or the soil block hides it
    ty = SHAFT_Y
    tunnel.location = ((a[0] + b[0]) / 2, ty, (a[1] + b[1]) / 2)

    ring = make_torus("NB_Hatch_Ring", 0.56, 0.11, center=(0, 0, 0),
                      rot=(0, 0, 0), mat=MAT["steel_dark"], collection=col)
    ring.location = (b[0], ty, GROUND_Z + 0.04)
    hinge = bpy.data.objects.new("NB_Hatch_Hinge", None)
    bpy.context.scene.collection.objects.link(hinge)
    hinge.location = (b[0] - 0.52, ty, GROUND_Z + 0.10)
    lid = make_cylinder("NB_Hatch_Lid", 0.60, 0.10, center=(0.52, 0, 0),
                        rot=(0, 0, 0), mat=MAT["steel"], ink=True, collection=col, segments=24)
    lid.parent = hinge
    for name in ("NB_Exit2_Tunnel", "NB_Hatch_Ring"):
        bpy.data.objects[name].scale = (0.001, 0.001, 0.001)
    hinge.scale = (0.001, 0.001, 0.001)
    return col, hinge, [tunnel, bpy.data.objects["NB_Hatch_Ring"], hinge]


def build_geiger():
    col = bpy.data.collections.new("NB_Geiger")
    bpy.context.scene.collection.children.link(col)
    gx, gy, gz = -1.18, 0.72, -3.30
    make_box("NB_Geiger_Hook", 0.05, 0.05, 0.30, center=(gx, gy, gz + 0.36),
             mat=MAT["steel_dark"], ink=False, collection=col)
    body = make_box("NB_Geiger_Body", 0.62, 0.16, 0.46, center=(gx, gy, gz),
                    mat=MAT["cream"], ink=True, collection=col)
    dial = make_cylinder("NB_Geiger_Dial", 0.19, 0.05, center=(gx, gy - 0.10, gz),
                         rot=(math.pi / 2, 0, 0), mat=MAT["steel_dark"], ink=False,
                         collection=col, segments=20)
    needle = make_box("NB_Geiger_Needle", 0.02, 0.03, 0.16, center=(gx, gy - 0.13, gz + 0.04),
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
    bx = -0.95
    for bi, by in enumerate((1.72, 2.02)):
        for side in (-1, 1):
            make_box(f"NB_BedPost_{bi}_{side}", 0.08, 0.08, 1.35,
                     center=(bx + side * 0.38, by, FLOOR_Z + 0.67),
                     mat=MAT["steel_dark"], ink=False, collection=col)
        for lvl in (0, 1):
            bed = make_box(f"NB_Bed_{bi}_{lvl}", 0.8, 1.1, 0.12,
                           center=(bx, by, FLOOR_Z + 0.32 + lvl * 0.62),
                           mat=MAT["cream"], ink=False, collection=col)
            make_box(f"NB_BedPillow_{bi}_{lvl}", 0.6, 0.34, 0.14,
                     center=(bx, by - 0.34, FLOOR_Z + 0.42 + lvl * 0.62),
                     mat=MAT["red"], ink=False, collection=col)
            items.append(bed)

    # crates and cans, right side
    for i, (cx, cy) in enumerate([(1.95, 2.20), (1.95, 1.74), (1.50, 2.24)]):
        items.append(make_box(f"NB_Crate_{i}", 0.42, 0.42, 0.34,
                              center=(cx, cy, FLOOR_Z + 0.17),
                              mat=MAT["orange"] if i % 2 else MAT["green"],
                              ink=False, collection=col))
    for i in range(9):
        items.append(make_cylinder(f"NB_Can_{i}", 0.065, 0.16,
                                   center=(1.62 + (i % 3) * 0.15, 1.58 + (i // 3) * 0.15,
                                           FLOOR_Z + 0.44),
                                   mat=MAT["red"] if i % 2 else MAT["hazard"],
                                   ink=False, collection=col, segments=12))

    # crank radio on a small table
    items.append(make_box("NB_Table", 0.8, 0.55, 0.07, center=(0.55, 2.25, FLOOR_Z + 0.55),
                          mat=MAT["wood"], ink=False, collection=col))
    for dx, dy in ((-0.32, -0.2), (0.32, -0.2), (-0.32, 0.2), (0.32, 0.2)):
        items.append(make_box(f"NB_TableLeg_{dx}_{dy}", 0.06, 0.06, 0.55,
                              center=(0.55 + dx, 2.25 + dy, FLOOR_Z + 0.27),
                              mat=MAT["wood"], ink=False, collection=col))
    radio = make_box("NB_Radio", 0.5, 0.22, 0.32, center=(0.55, 2.25, FLOOR_Z + 0.74),
                     mat=MAT["blue"], ink=True, collection=col)
    make_box("NB_RadioGrill", 0.2, 0.05, 0.18, center=(0.42, 2.13, FLOOR_Z + 0.74),
             mat=MAT["steel_dark"], ink=False, collection=col)
    items.append(radio)

    # the very long board game, laid out in the middle of the deck
    board = make_box("NB_Board", 1.15, 0.85, 0.05, center=(0.35, 0.45, FLOOR_Z + 0.03),
                     mat=MAT["cream"], ink=False, collection=col)
    for i in range(12):
        make_box(f"NB_BoardTile_{i}", 0.1, 0.1, 0.014,
                 center=(0.35 - 0.44 + (i % 6) * 0.176, 0.45 + (i // 6) * 0.22, FLOOR_Z + 0.062),
                 mat=MAT["red"] if i % 3 else MAT["hazard"], ink=False, collection=col)
    items.append(board)

    for ob in items:
        ob.scale = (0.001, 0.001, 0.001)
    # every piece of furniture waits for its cue, so scale the whole set
    for ob in col.objects:
        ob.scale = (0.001, 0.001, 0.001)
    return col, list(col.objects)


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


# ---------------------------------------------------------------------------
# characters
# ---------------------------------------------------------------------------

# a modern family plus neighbours, in the same ink & vinyl chibi build as the
# SimForge cast. "Dad" is the "you" of the narration.
CAST = {
    #            skin       shirt      pants      shoes      hair       style      scale
    "Dad":      ("#e8b48c", "#3f78c4", "#3b4a63", "#4a3324", "#5a3a22", "short",   1.0),
    "Mom":      ("#f0c39e", "#d9534f", "#46506b", "#2e2a2a", "#8a4a26", "bob",     0.96),
    "Kid":      ("#eab88e", "#f2c14e", "#4f7dc4", "#e8e8e8", "#3a2516", "pony",    0.76),
    "Grandma":  ("#e9bd9a", "#8e6fb8", "#5b5568", "#4a3324", "#d9d9e0", "bun",     0.92),
    "Neighbor1": ("#a8714a", "#3aa67c", "#2e3442", "#2b2b2b", "#1e1612", "cap",    1.02),
    "Neighbor2": ("#7a4e33", "#f08a3c", "#3b4a63", "#2b2b2b", "#140e0b", "short",  1.0),
    "Neighbor3": ("#f2c7a5", "#6d8f3a", "#6b5640", "#4a3324", "#d8a04a", "bob",    0.95),
    "Neighbor4": ("#c98b62", "#c44a7a", "#2e3442", "#2b2b2b", "#2a1a10", "bun",    0.96),
    "Neighbor5": ("#e3ad84", "#5b6470", "#33302c", "#2b2b2b", "#6b6b70", "cap",    1.04),
    "Neighbor6": ("#8f5a3a", "#2fa8c4", "#3b4a63", "#e8e8e8", "#1a120c", "short",  0.82),
}
ROGUE_GEAR = ("Mask", "Hood", "HoodTail", "Scarf", "Dagger_L", "Dagger_R")


def _restyle(name, part, mat):
    ob = bpy.data.objects.get(f"{name}_{part}")
    if ob and ob.data.materials:
        ob.data.materials[0] = mat


def build_civilian(name, look):
    skin, shirt, pants, shoes, hair, style, scale = look
    cw.build_chibi_character("rogue", name)
    for gear in ROGUE_GEAR:
        ob = bpy.data.objects.get(f"{name}_{gear}")
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)
    m_skin = vinyl(f"{name}_Skin", skin, "skin")
    m_shirt = vinyl(f"{name}_Shirt", shirt, "cloth")
    m_pants = vinyl(f"{name}_Pants", pants, "cloth")
    m_shoes = vinyl(f"{name}_Shoes", shoes, "leather")
    m_hair = vinyl(f"{name}_Hair", hair, "hair")
    _restyle(name, "Head_Mesh", m_skin)
    _restyle(name, "Torso", m_shirt)
    _restyle(name, "Pelvis", m_pants)
    for s in ("L", "R"):
        _restyle(name, f"Arm_{s}_Upper", m_shirt)
        _restyle(name, f"Arm_{s}_Forearm", m_skin)
        _restyle(name, f"Arm_{s}_Hand", m_skin)
        _restyle(name, f"Leg_{s}_Thigh", m_pants)
        _restyle(name, f"Leg_{s}_Shin", m_pants)
        _restyle(name, f"Leg_{s}_Boot", m_shoes)
        _restyle(name, f"Iris_{s}", MAT["iris"])

    col = bpy.data.collections[f"Char_{name}"]
    head = bpy.data.objects[f"{name}_Head"]
    r = cw.CLASS_CONFIGS["rogue"]["headR"]

    def part(suffix, maker, *args, **kw):
        ob = maker(f"{name}_{suffix}", *args, mat=m_hair, ink=True, collection=col, **kw)
        ob.parent = head
        return ob

    # every style starts from a cap of hair that stops above the eyes
    part("Hair", make_sphere, r * 1.07, center=(0, -0.05, 0.09), scale=(1.0, 0.97, 0.78))
    if style == "bob":
        for sx in (-1, 1):
            part(f"HairSide_{sx}", make_sphere, 0.12, center=(sx * 0.19, -0.06, -0.06),
                 scale=(0.7, 1.0, 1.25))
    elif style == "bun":
        part("HairBun", make_sphere, 0.10, center=(0, -0.20, 0.20))
    elif style == "pony":
        part("HairPony", make_capsule, 0.06, 0.26, center=(0, -0.27, -0.02), rot=(0.5, 0, 0))
    elif style == "cap":
        cap = vinyl(f"{name}_CapCloth", shirt, "cloth")
        brim = make_box(f"{name}_CapBrim", 0.30, 0.20, 0.03, center=(0, 0.24, 0.13),
                        mat=cap, ink=True, collection=col)
        brim.parent = head
        bpy.data.objects[f"{name}_Hair"].data.materials[0] = cap

    root = bpy.data.objects[f"{name}_Root"]
    root.scale = (scale, scale, scale)
    return root


def build_dog():
    """A small toy dog that tags along with the family."""
    col = bpy.data.collections.new("Char_Dog")
    bpy.context.scene.collection.children.link(col)
    root = bpy.data.objects.new("Dog_Root", None)
    col.objects.link(root)
    fur = vinyl("Dog_Fur", "#c58a4a", "cloth")
    dark = vinyl("Dog_Dark", "#6b4126", "cloth")
    nose = vinyl("Dog_Nose", "#1b1b1f", "gloss")
    parts = [
        make_capsule("Dog_Body", 0.15, 0.42, center=(0, 0, 0.36), rot=(math.pi / 2, 0, 0), mat=fur),
        make_sphere("Dog_Head", 0.16, center=(0, 0.30, 0.56), mat=fur),
        make_sphere("Dog_Snout", 0.08, center=(0, 0.45, 0.52), scale=(1.0, 1.2, 0.8), mat=fur),
        make_sphere("Dog_NoseTip", 0.035, center=(0, 0.55, 0.55), mat=nose, ink=False),
        make_sphere("Dog_Ear_L", 0.07, center=(-0.13, 0.26, 0.62), scale=(0.5, 0.9, 1.4), mat=dark),
        make_sphere("Dog_Ear_R", 0.07, center=(0.13, 0.26, 0.62), scale=(0.5, 0.9, 1.4), mat=dark),
        make_cone("Dog_Tail", 0.05, 0.24, center=(0, -0.30, 0.50), rot=(-0.7, 0, 0), mat=dark),
    ]
    for sx in (-0.08, 0.08):
        for sy in (-0.15, 0.17):
            parts.append(make_cylinder(f"Dog_Leg_{sx}_{sy}", 0.045, 0.26,
                                       center=(sx, sy, 0.13), mat=fur))
    for i, eye_x in enumerate((-0.07, 0.07)):
        parts.append(make_sphere(f"Dog_Eye_{i}", 0.028, center=(eye_x, 0.43, 0.62),
                                 mat=nose, ink=False))
    for ob in parts:
        for c in ob.users_collection:
            c.objects.unlink(ob)
        col.objects.link(ob)
        ob.parent = root
    return root


def build_cast():
    roots = {name: build_civilian(name, look) for name, look in CAST.items()}
    roots["Dog"] = build_dog()
    return roots


def place_cast(roots):
    """Ten people: two loose rows on the deck, clear of the furniture."""
    spots = {
        "Dad": (0.75, 1.75),
        "Mom": (-0.55, 1.95),
        "Grandma": (1.35, 1.95),
        "Neighbor1": (0.05, 2.15),
        "Kid": (0.95, 1.20),
        "Neighbor2": (-0.35, 1.00),
        "Neighbor3": (1.65, 1.05),
        "Neighbor4": (-1.05, 1.35),
        "Neighbor5": (0.35, 0.80),
        "Neighbor6": (-0.95, 0.60),
        "Dog": (0.15, 0.45),
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
    # clean_scene() drops collections, which can orphan an existing camera
    if not cam.users_collection:
        bpy.context.scene.collection.objects.link(cam)
    cam.data.lens = 100
    cam.data.sensor_fit = "HORIZONTAL"
    cam.data.sensor_width = 36
    bpy.context.scene.camera = cam
    return cam


def cam_set(cam, frame, loc, target, interp="BEZIER", lens=None):
    if lens:
        cam.data.lens = lens
    cam.location = Vector(loc)
    direction = Vector(target) - Vector(loc)
    # compatible euler, so moves never spin the long way round
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler("XYZ", cam.rotation_euler)
    cam.keyframe_insert("location", frame=frame)
    cam.keyframe_insert("rotation_euler", frame=frame)
    cam.data.keyframe_insert("lens", frame=frame)
    act = cam.animation_data.action
    for fcu in cw.get_action_fcurves(act):
        for kp in fcu.keyframe_points:
            if abs(kp.co.x - frame) < 0.01:
                kp.interpolation = interp


# ---------------------------------------------------------------------------
# animation
# ---------------------------------------------------------------------------

def animate(roots, fan, rotor, valve_flap, hatch_hinge, door_hinge, geiger_needle,
            rays, drops, cloud, items, plug, headhouse, exit2, liner, dirt_cave):
    cam = get_camera()

    # --- shots -------------------------------------------------------------
    # 3/4 elevated views of the cutaway block, like a diorama on a table.
    # Each shot is a slow move from A to B; shots meet in hard cuts.
    def S(loc, tgt, lens):
        return (loc, tgt, lens)

    yard_hi = S((-3.4, -8.6, 3.0), (0.8, -0.3, 0.2), 40)
    yard_in = S((-2.6, -7.2, 2.3), (-0.2, -0.4, 0.0), 40)
    cave_a = S((-2.5, -7.0, -2.3), (0.5, 1.6, -4.2), 30)
    cave_b = S((-1.7, -6.3, -2.7), (0.5, 1.6, -4.3), 30)
    wide_a = S((-5.6, -14.2, 5.6), (0.3, 0.8, -2.0), 38)
    wide_b = S((-4.6, -13.0, 4.6), (0.3, 0.8, -2.1), 38)
    blast_a = S((-3.8, -13.5, 1.2), (3.4, 2.0, 2.8), 40)
    blast_b = S((-3.2, -12.4, 0.9), (3.6, 2.0, 3.4), 40)
    layers_a = S((-1.2, -8.8, 0.9), (0.9, -0.6, -0.7), 40)
    layers_b = S((-0.7, -7.9, 0.6), (0.9, -0.6, -0.7), 40)
    shaft_a = S((-4.0, -10.2, 1.8), (-0.5, 0.0, -1.6), 34)
    shaft_b = S((-3.2, -9.2, 1.2), (-0.5, 0.0, -1.8), 34)
    room_a = S((-2.3, -6.3, -1.0), (0.5, 1.6, -4.0), 28)
    room_b = S((-1.3, -6.0, -1.4), (0.5, 1.6, -4.1), 28)
    air_a = S((5.0, -10.6, 2.2), (1.4, 0.3, -1.6), 32)
    air_b = S((4.2, -9.4, 1.4), (1.5, 0.3, -1.8), 32)
    valve_a = S((3.8, -4.8, -2.4), (AIR_X - 0.2, AIR_Y, -3.6), 40)
    valve_b = S((3.3, -4.1, -2.8), (AIR_X - 0.2, AIR_Y, -3.7), 40)
    door_a = S((-3.6, -6.6, 2.8), (-0.6, -0.6, 1.0), 35)
    door_b = S((-3.0, -6.0, 2.4), (-0.6, -0.6, 1.0), 35)
    door_c = S((-4.2, -7.6, 3.2), (-0.5, -0.6, 0.9), 35)
    hatch_a = S((5.6, -8.4, 1.6), (2.6, 0.0, -1.0), 32)
    hatch_b = S((5.0, -7.6, 1.2), (2.7, 0.0, -1.1), 32)
    geiger_a = S((2.9, -5.9, -2.0), (-0.6, 1.0, -3.4), 30)
    geiger_b = S((2.3, -5.4, -2.4), (-0.7, 1.0, -3.4), 30)
    decay_a = S((-5.4, -15.0, 6.0), (0.3, 0.8, -1.6), 36)
    decay_b = S((-4.4, -13.6, 5.0), (0.3, 0.8, -1.8), 36)
    stock_a = S((-2.3, -6.3, -1.1), (0.5, 1.6, -4.0), 28)
    stock_b = S((1.6, -6.5, -1.2), (0.3, 1.6, -4.0), 28)
    end_a = S((-3.0, -9.0, 2.4), (0.6, 0.8, -2.4), 36)
    end_b = S((-4.4, -12.0, 3.8), (0.6, 0.8, -2.0), 36)

    moves = [
        (0, yard_hi, yard_in),
        (LS("l1b") - 6, cave_a, cave_b),           # the raw dirt hole
        (LS("l2a") - 6, wide_a, wide_b),           # steel pipe, three feet of dirt
        (W("l2b", "explosion") - 4, blast_a, blast_b),
        (W("l2b", "rains") - 4, wide_b, wide_a),
        (LS("l3a") - 6, layers_a, layers_b),       # half-value layers
        (LS("l3b") - 6, shaft_a, shaft_b),         # rays down the doorway
        (LS("l4a") - 6, shaft_b, shaft_a),         # bend it
        (LS("l4b") - 6, room_a, room_b),           # ten people
        (LS("l5a") - 6, air_a, air_b),
        (LS("l6a") - 6, valve_a, valve_b),
        (LS("l6b") - 8, door_a, door_b),
        (LS("l7a") - 6, door_b, door_c),           # rubble
        (LS("l7b") - 6, hatch_a, hatch_b),
        (LS("l8a") - 6, geiger_a, geiger_b),
        (LS("l9a") - 6, decay_a, decay_b),
        (LS("l9b") - 6, stock_a, stock_b),         # supplies, then beds
        (LS("end") - 8, end_a, end_b),
    ]
    for i, (f, a, b) in enumerate(moves):
        nxt = moves[i + 1][0] if i + 1 < len(moves) else DURATION + 4
        cam_set(cam, f, a[0], a[1], "BEZIER", a[2])
        cam_set(cam, nxt - 1, b[0], b[1], "CONSTANT", b[2])

    # --- cast --------------------------------------------------------------
    r = roots
    base = {name: ob.scale.copy() for name, ob in r.items()}

    def hide(name, frame):
        s = base[name]
        key(r[name], frame - 1, scale=(s.x, s.y, s.z))
        key(r[name], frame, scale=(0.001, 0.001, 0.001))

    def show(name, frame, dur=8):
        s = base[name]
        key(r[name], frame, scale=(0.001, 0.001, 0.001))
        key(r[name], frame + dur * 0.7, scale=(s.x * 1.08, s.y * 1.08, s.z * 1.08))
        key(r[name], frame + dur, scale=(s.x, s.y, s.z))

    # everyone but Dad waits for the "ten people" line
    for name in r:
        if name != "Dad":
            hide(name, 0)

    jump = W("l1a", "climb")
    surf = GROUND_Z
    g = r["Dad"]
    key(g, LS("l1a") - 4, loc=(2.60, -0.55, surf), rot=(0, 0, math.radians(90)))
    key(g, jump - 24, loc=(2.25, -0.55, surf), rot=(0, 0, math.radians(90)))
    key(g, jump - 4, loc=(0.35, -0.55, surf), rot=(0, 0, math.radians(90)))
    key(g, jump, loc=(SHAFT_X + 0.02, -0.55, surf + 0.45), rot=(0, 0, math.radians(90)))
    key(g, jump + 7, loc=(SHAFT_X, -0.55, surf - 0.55), rot=(0, 0, math.radians(90)))
    # he drops out of the lawn shot and lands in the bare hole
    hide("Dad", jump + 9)

    cave = W("l1b", "caves")
    cave_in = LS("l1b") - 6           # cut to the raw dirt chamber
    show("Dad", cave_in, 10)
    key(g, cave_in, loc=(0.55, 1.60, FLOOR_Z), rot=(0, 0, math.pi))
    key(g, cave - 10, loc=(0.55, 1.60, FLOOR_Z), rot=(0, 0, math.pi))

    # --- the blast caves the raw dirt walls in on him ---------------------
    for i in range(13):
        a = RNG.uniform(0.3, math.pi - 0.3)
        cx = 0.55 + math.cos(a) * RNG.uniform(0.2, 1.45)
        cy = 1.60 + RNG.uniform(-0.55, 0.55)
        cz = TUBE_Z + TUBE_R - 0.35
        size = RNG.uniform(0.16, 0.32)
        chunk = make_box(f"NB_Bury_{i}", size, size, size * 0.75,
                         center=(cx, cy, cz),
                         mat=MAT["soil_light"] if i % 2 else MAT["soil"], ink=False)
        fall = cave - 4 + i % 6
        key(chunk, 0, scale=(0.001, 0.001, 0.001))
        key(chunk, fall, loc=(cx, cy, cz), rot=(0, 0, 0), scale=(1, 1, 1))
        key(chunk, fall + 12 + i % 4, loc=(0.55 + (cx - 0.55) * 0.5, cy, FLOOR_Z + 0.18),
            rot=(RNG.uniform(2, 5), RNG.uniform(1, 4), RNG.uniform(0, 3)))
        key(chunk, cave + 40, scale=(0.001, 0.001, 0.001))

    # the mound that buries him, and a club left sticking out
    mound = make_sphere("NB_BuryMound", 1.0, center=(0, 0, 0),
                        mat=MAT["soil"], ink=False)
    mound.location = (0.55, 1.60, FLOOR_Z + 0.12)
    key(mound, cave + 4, scale=(0.001, 0.001, 0.001))
    key(mound, cave + 22, scale=(0.55, 0.55, 0.34))
    key(mound, cave + 34, scale=(0.95, 0.95, 0.68))
    key(mound, cave + 60, scale=(1.02, 1.02, 0.74))

    # his shovel ends up planted in the mound beside him
    stick = bpy.data.objects.new("NB_BuriedShovel", None)
    bpy.context.scene.collection.objects.link(stick)
    for ob in (make_cylinder("NB_ShovelShaft", 0.035, 0.95, center=(0, 0, 0.48), mat=MAT["wood"]),
               make_box("NB_ShovelBlade", 0.24, 0.05, 0.30, center=(0, 0, -0.10),
                        mat=MAT["steel_dark"]),
               make_box("NB_ShovelGrip", 0.18, 0.05, 0.05, center=(0, 0, 0.96), mat=MAT["wood"])):
        ob.parent = stick
    stick.scale = (0.001, 0.001, 0.001)
    key(stick, cave + 18, loc=(1.15, 1.62, FLOOR_Z + 0.35), rot=(0.15, -0.35, 0),
        scale=(0.001, 0.001, 0.001))
    key(stick, cave + 30, loc=(1.15, 1.62, FLOOR_Z + 0.55), rot=(0.15, -0.35, 0),
        scale=(1, 1, 1))


    cower_at = cave - 8
    pose_key("Dad", cave_in, "idle")
    pose_key("Dad", cower_at, "cower")
    # buried to the neck: only his head pokes out of the mound
    pose_key("Dad", cave + 16, "idle")
    buried = (0.55, 1.60, FLOOR_Z - 0.44)
    key(g, cave + 18, loc=buried)

    # --- steel pipe --------------------------------------------------------
    pipe_beat = W("l2a", "steel")
    pipe = make_cylinder("NB_BigPipe", TUBE_R - 0.02, 4.3,
                         center=(0, 0, 0), rot=(math.pi / 2, 0, 0),
                         mat=MAT["corr_y"], ink=True, segments=48)
    # a dark bore so the pipe reads as a hollow tube end-on, not a solid ball
    bore = make_cylinder("NB_BigPipeBore", TUBE_R - 0.22, 4.34,
                         center=(0, 0, 0), rot=(math.pi / 2, 0, 0),
                         mat=MAT["hole"], ink=False, segments=48)
    bore.parent = pipe
    for i in range(7):
        rib = make_torus(f"NB_BigPipeRib_{i}", TUBE_R - 0.02, 0.05,
                         rot=(math.pi / 2, 0, 0), mat=MAT["steel_dark"])
        rib.location = (0, -1.95 + i * 0.65, 0)
        rib.parent = pipe
    key(pipe, 0, loc=(TUBE_X, -1.55, 9.4), scale=(0.001, 0.001, 0.001))
    key(pipe, pipe_beat - 9, scale=(0.001, 0.001, 0.001))
    key(pipe, pipe_beat - 8, loc=(TUBE_X, -1.55, 9.4), scale=(1, 1, 1))
    key(pipe, pipe_beat + 6, loc=(TUBE_X, -1.55, TUBE_Z), scale=(1, 1, 1))
    key(pipe, pipe_beat + 14, loc=(TUBE_X, 0.85, TUBE_Z), scale=(1, 1, 1))
    ease_keys(pipe)
    key(pipe, pipe_beat + 15, scale=(1, 1, 1))
    key(pipe, pipe_beat + 17, scale=(0.001, 0.001, 0.001))

    # the dirt plug is only there to keep the face solid before the dig lands
    plug_pebbles = [o for o in bpy.data.objects if o.name.startswith("NB_PlugPebble")]
    seam_clods = [o for o in bpy.data.objects if o.name.startswith("NB_PlugSeam")]
    for o in [plug] + plug_pebbles + seam_clods:
        key(o, 0, scale=(1, 1, 1))
        key(o, 80, scale=(1, 1, 1))
        key(o, 84, scale=(0.001, 0.001, 0.001))
    rim = bpy.data.objects["NB_Rim"]
    key(rim, 0, scale=(0.001, 0.001, 0.001))
    pop_out(rim, pipe_beat + 13, 12)

    # the raw hole (and its rocky lip) only exists from the "you have a bunker" line
    rim_rocks = [o for o in bpy.data.objects if o.name.startswith("NB_RimRock_")]
    for ob in dirt_cave + rim_rocks + [bpy.data.objects["NB_SubFloor"]]:
        key(ob, 0, scale=(0.001, 0.001, 0.001))
        key(ob, 83, scale=(0.001, 0.001, 0.001))
        key(ob, 84, scale=(1, 1, 1))

    # the liner snaps into the fresh hole, plate by plate
    for i, ob in enumerate(liner):
        key(ob, 0, scale=(0.001, 0.001, 0.001))
        pop_out(ob, pipe_beat + 10 + (i % 9), 10)
    for ob in dirt_cave + [stick] + [o for o in bpy.data.objects
                                     if o.name.startswith("NB_Bury_")]:
        key(ob, pipe_beat + 12, scale=(1, 1, 1))
        key(ob, pipe_beat + 15, scale=(0.001, 0.001, 0.001))
    key(mound, pipe_beat + 12, scale=(1.02, 1.02, 0.74))
    key(mound, pipe_beat + 15, scale=(0.001, 0.001, 0.001))

    # the shaft arrives with the pipe; a fresh goblin is already inside
    for name in ("NB_Shaft_Straight", "NB_Shaft_Collar"):
        ob = bpy.data.objects[name]
        key(ob, 0, scale=(0.001, 0.001, 0.001))
        pop_out(ob, pipe_beat + 4, 12, (1, 1, 1))
    # dug out and dusted off, Dad is waiting inside the pipe
    key(g, pipe_beat + 12, loc=buried)
    hide("Dad", pipe_beat + 13)
    g2 = g
    show("Dad", pipe_beat + 14, 14)
    key(g2, pipe_beat + 14, loc=(0.75, 1.75, FLOOR_Z), rot=(0, 0, math.pi))
    pose_key("Dad", pipe_beat + 14, "idle")

    # --- mushroom cloud and fallout --------------------------------------
    cloud_beat = W("l2b", "explosion")
    # the shape is baked into each puff's mesh, so full size is scale 1
    for p in cloud:
        key(p, cloud_beat - 4, scale=(0.001, 0.001, 0.001))
        key(p, cloud_beat + 26, scale=(1.1, 1.1, 1.1))
        key(p, cloud_beat + 52, scale=(1, 1, 1))
        key(p, LE("l2b") + 6, scale=(1.15, 1.15, 1.15))
        key(p, LE("l2b") + 24, scale=(0.001, 0.001, 0.001))

    rain = W("l2b", "rains")
    for i, drop in enumerate(drops):
        x, y = drop.location.x, drop.location.y
        f0 = rain - 12 + i * 2
        key(drop, f0 - 1, loc=(x, y, 5.6), scale=(0.001, 0.001, 0.001))
        key(drop, f0, loc=(x, y, 5.6), scale=(1, 1, 1))
        key(drop, f0 + 46, loc=(x, y, GROUND_Z - 0.1), scale=(1, 1, 1))
        key(drop, f0 + 50, loc=(x, y, GROUND_Z - 0.15), scale=(0.001, 0.001, 0.001))

    # --- half-value layers: each band of dirt stops half the rays --------
    # dashed layer lines in the dirt above the pipe; eight rays fall from the
    # lawn and half of them die at every line, none reach the steel.
    hv_x0, hv_x1 = 0.10, 1.70
    hv_y = SOIL_FRONT - 0.06
    hv_top = GROUND_Z - 0.02
    hv_layers = [hv_top - 0.48 * (k + 1) for k in range(4)]
    hv_on = W("l3a", "every")
    hv_gone = LS("l3b") + 4
    hv_parts = []
    for k, z in enumerate(hv_layers):
        f = hv_on + 6 + k * 8
        x = hv_x0
        d = 0
        while x < hv_x1:
            dash = make_box(f"NB_HalfDash_{k}_{d}", 0.10, 0.02, 0.025,
                            center=(0, 0, 0), mat=MAT["rad_dim"], ink=False)
            dash.location = (x + 0.05, hv_y, z)
            key(dash, 0, scale=(0.001, 0.001, 0.001))
            key(dash, f + d // 3, scale=(0.001, 0.001, 0.001))
            key(dash, f + d // 3 + 4, scale=(1, 1, 1))
            hv_parts.append(dash)
            x += 0.17
            d += 1
    # how many layers each ray survives: 8 -> 4 -> 2 -> 1 -> 0
    survive = [4, 1, 2, 1, 3, 1, 2, 1]
    fall = W("l3a", "half", 1) - 26        # rays land on the second "half"
    for i, n in enumerate(survive):
        x = hv_x0 + 0.1 + i * (hv_x1 - hv_x0 - 0.2) / 7
        length = hv_top - hv_layers[n - 1]
        ray = make_cylinder(f"NB_HalfRay_{i}", 0.022, length,
                            center=(0, 0, -length / 2), mat=MAT["rad"], ink=False,
                            segments=8)
        ray.location = (x, hv_y - 0.02, hv_top)
        f = fall + i
        key(ray, 0, scale=(0.001, 0.001, 0.001))
        key(ray, f, scale=(1, 1, 0.001))
        key(ray, f + 6 + 5 * n, scale=(1, 1, 1))
        hv_parts.append(ray)
        # a tiny flash where the ray is stopped
        tip = make_sphere(f"NB_HalfTip_{i}", 0.06, center=(0, 0, 0), mat=MAT["rad"],
                          ink=False, segments=8, ring_count=6)
        tip.location = (x, hv_y - 0.02, hv_layers[n - 1])
        key(tip, 0, scale=(0.001, 0.001, 0.001))
        key(tip, f + 6 + 5 * n, scale=(0.001, 0.001, 0.001))
        key(tip, f + 9 + 5 * n, scale=(1.6, 1.6, 1.6))
        key(tip, f + 16 + 5 * n, scale=(0.8, 0.8, 0.8))
        hv_parts.append(tip)
    for ob in hv_parts:
        s_ = ob.scale.copy()
        key(ob, hv_gone - 6, scale=(s_.x, s_.y, s_.z))
        key(ob, hv_gone, scale=(0.001, 0.001, 0.001))

    # --- radiation ---------------------------------------------------------
    rays_on = LS("l3b") + 8
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
        # the kink stops them: the shafts fade out of the yard
        key(ray, bend + 22, loc=(x, y, 1.9), scale=(1, 1, 0.82))
        key(ray, bend + 30, loc=(x, y, 2.1), scale=(0.001, 0.001, 0.001))
    # sparks where the rays hit the first bend
    for i in range(5):
        sp = make_sphere(f"NB_BendSpark_{i}", 0.08, center=(0, 0, 0),
                         mat=MAT["rad"], ink=False,
                         segments=8, ring_count=6)
        f = bend + i * 2
        at = (SHAFT_X + RNG.uniform(-0.4, 0.4), SHAFT_Y - 0.6, -0.75 + RNG.uniform(-0.3, 0.3))
        key(sp, 0, loc=at, scale=(0.001, 0.001, 0.001))
        key(sp, f, scale=(0.001, 0.001, 0.001))
        key(sp, f + 4, scale=(1.6, 1.6, 1.6))
        key(sp, f + 14, scale=(0.001, 0.001, 0.001))

    # straight shaft -> zig-zag (off camera, wide shot)
    swap = LS("l4a") - 2
    straight = bpy.data.objects["NB_Shaft_Straight"]
    straight.hide_render = False
    straight.keyframe_insert("hide_render", frame=swap - 1)
    straight.hide_render = True
    straight.keyframe_insert("hide_render", frame=swap)
    bent = [o.name for o in bpy.data.objects
            if o.name.startswith("NB_Bent") and o.type == "MESH" and "_Ink" not in o.name]
    for name in bent + ["NB_Shaft_Collar"]:
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
    crowd = ["Mom", "Kid", "Dog", "Grandma", "Neighbor1", "Neighbor2", "Neighbor3",
             "Neighbor4", "Neighbor5", "Neighbor6"]
    for i, name in enumerate(crowd):
        show(name, ten + 4 + i * 4, 12)
        if name != "Dog":
            pose_key(name, ten + 4 + i * 4, "idle")

    stale = W("l4b", "stale")
    haze = []
    for i, (hx, hy, hz, hr) in enumerate([(-0.55, 1.1, -2.45, 0.75), (0.85, 1.3, -2.35, 0.85),
                                         (0.15, 1.9, -2.20, 0.65)]):
        h = make_sphere(f"NB_StaleHaze_{i}", hr, center=(0, 0, 0),
                        mat=MAT["smoke"], ink=False,
                        segments=16, ring_count=10)
        h.location = (hx, hy, hz)
        key(h, stale - 2, scale=(0.001, 0.001, 0.001))
        key(h, stale + 22 + i * 4, scale=(1.0, 1.0, 0.8))
        key(h, LS("l5a") + 10, scale=(1.15, 1.15, 0.9))
        key(h, LS("l5a") + 26, scale=(0.001, 0.001, 0.001))
        haze.append(h)

    # --- air pipe, filter, fan -------------------------------------------
    grow = W("l5a", "pipe")
    air_cols = ("NB_Air", "NB_Valve")
    air_parts = [o for c in air_cols for o in bpy.data.collections[c].objects
                 if o.parent is None]
    for i, ob in enumerate(air_parts):
        key(ob, 0, scale=(0.001, 0.001, 0.001))
        pop_out(ob, grow + (i % 8), 12, (1, 1, 1))

    fan_beat = W("l5a", "fan")
    key(rotor, fan_beat, rot=(0, 0, 0))
    key(rotor, LS("l9a") - 40, rot=(0, math.tau * 22, 0))
    for fcu in cw.get_action_fcurves(rotor.animation_data.action):
        for kp in fcu.keyframe_points:
            kp.interpolation = "LINEAR"

    # --- shockwave down the pipe -----------------------------------------
    shock = W("l5b", "shockwave")
    beam = make_cylinder("NB_ShockBeam", 0.13, 5.2,
                         center=(0, 0, 0),
                         mat=MAT["rad"], ink=False, segments=12)
    key(beam, 0, loc=(AIR_X, AIR_Y - 0.30, 4.4), scale=(0.001, 0.001, 0.001))
    key(beam, shock - 1, scale=(0.001, 0.001, 0.001))
    key(beam, shock, loc=(AIR_X, AIR_Y - 0.30, 4.4), scale=(1, 1, 0.001))
    key(beam, shock + 4, loc=(AIR_X, AIR_Y - 0.30, 1.2), scale=(1, 1, 1))
    # 5.2 long: its bottom end stops at the valve (z ~ -3.6), not in the floor
    key(beam, shock + 22, loc=(AIR_X, AIR_Y - 0.30, -1.0), scale=(1, 1, 1))
    key(beam, shock + 24, scale=(0.001, 0.001, 0.001))

    # --- blast valve ------------------------------------------------------
    valve_beat = W("l6a", "valve")
    slam = W("l6a", "slams")
    key(valve_flap, valve_beat - 4, rot=(0, 0, math.radians(-82)))
    key(valve_flap, slam - 2, rot=(0, 0, math.radians(-82)))
    key(valve_flap, slam + 1, rot=(0, 0, 0))
    ease_keys(valve_flap)

    # --- blast door -------------------------------------------------------
    door_beat = W("l6b", "door")
    outward = W("l6b", "outward")
    shed_parts = [o for o in bpy.data.objects if o.name.startswith("NB_Shed")]
    for i, ob in enumerate(shed_parts):
        pop_out(ob, door_beat - 14 + (i % 6), 12)
    pop_out(door_hinge, door_beat - 10, 12)
    key(door_hinge, outward - 2, rot=(0, 0, 0))
    key(door_hinge, outward + 8, rot=(0, 0, math.radians(-82)))
    key(door_hinge, LS("l7a") + 30, rot=(0, 0, math.radians(-82)))

    # --- rubble against the door -----------------------------------------
    rubble_beat = W("l7a", "rubble")
    for i in range(11):
        x = SHAFT_X + RNG.uniform(-1.0, 1.0)
        z = GROUND_Z + RNG.uniform(0.10, 0.85)
        rock = make_sphere(f"NB_Rubble_{i}", RNG.uniform(0.18, 0.34),
                           center=(0, 0, 0), scale=(1.0, 0.8, 0.75),
                           mat=MAT["soil_light"] if i % 2 else MAT["soil"], ink=False)
        key(rock, rubble_beat - 4 + i % 4, loc=(x, -1.86, z + 1.8),
            scale=(0.001, 0.001, 0.001))
        key(rock, rubble_beat + 6 + i, loc=(x, -1.86, z), scale=(1, 1, 1))

    # --- second tunnel and hatch -----------------------------------------
    dig = W("l7b", "second")
    for i, ob in enumerate(exit2):
        key(ob, dig - 2 + i, scale=(0.001, 0.001, 0.001))
        key(ob, dig + 14 + i, scale=(1, 1, 1))
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
    for name, ob in r.items():
        p = ob.location.copy()
        if name != "Dog":
            pose_key(name, end - 2, "cheer")
        for k in range(4):
            f = end + 2 + k * 16
            key(ob, f, loc=(p.x, p.y, p.z))
            key(ob, f + 7, loc=(p.x, p.y, p.z + 0.22))
            key(ob, f + 14, loc=(p.x, p.y, p.z))

    # --- lights -----------------------------------------------------------
    sun_data = bpy.data.lights.new("NB_Sun", "SUN")
    sun_data.energy = 2.8
    sun_data.angle = math.radians(9)
    sun_obj = bpy.data.objects.new("NB_Sun_Obj", sun_data)
    sun_obj.rotation_euler = (math.radians(52), 0, math.radians(-35))
    bpy.context.scene.collection.objects.link(sun_obj)

    fill_data = bpy.data.lights.new("NB_Fill", "AREA")
    fill_data.energy = 180
    fill_data.size = 9
    fill_obj = bpy.data.objects.new("NB_Fill_Obj", fill_data)
    fill_obj.location = (3.0, -9.0, 3.0)
    fill_obj.rotation_euler = (math.radians(62), 0, math.radians(18))
    bpy.context.scene.collection.objects.link(fill_obj)

    # soft frontal fill so the cut face is not a dark wall
    face_data = bpy.data.lights.new("NB_FaceFill", "AREA")
    face_data.energy = 900
    face_data.size = 15
    face_obj = bpy.data.objects.new("NB_FaceFill_Obj", face_data)
    face_obj.location = (0.0, -7.0, -2.6)
    face_obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.scene.collection.objects.link(face_obj)

    return cam


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def recenter_origins():
    """make_* bakes `center` into the mesh, so scale keys pivot on the world
    origin and pop-ins fly in from the middle of the set. Move each loose,
    unrotated mesh's origin to its own bounds centre so it grows in place."""
    for ob in bpy.data.objects:
        if (ob.type != "MESH" or ob.parent or ob.children or ob.data.users > 1
                or ob.location.length > 1e-6 or Vector(ob.rotation_euler).length > 1e-6):
            continue
        corners = [Vector(c) for c in ob.bound_box]
        c = sum(corners, Vector()) / 8
        if c.length < 1e-4:
            continue
        ob.data.transform(Matrix.Translation(-c))
        ob.location = c


def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1920
    scene.render.resolution_percentage = 100
    scene.render.fps = 30
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(FRAMES_DIR / "f_")
    scene.eevee.taa_render_samples = 24
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "High Contrast"
    scene.view_settings.exposure = 0.2
    scene.frame_start = 0
    scene.frame_end = DURATION + 4


def main():
    global MAT
    cw.clean_scene()
    MAT = build_materials()
    build_world()
    build_ground()
    build_tube()
    build_dirt_cave()
    shaft_col, door_hinge, headhouse = build_shaft()
    air_col, fan, rotor = build_air_pipe()
    valve_col, valve_flap = build_valve()
    exit2_col, hatch_hinge, exit2 = build_second_exit()
    geiger_col, geiger_needle = build_geiger()
    furniture_col, items = build_furniture()
    build_radiation()
    build_cloud()

    recenter_origins()
    roots = build_cast()
    place_cast(roots)
    plug = bpy.data.objects["NB_Plug"]
    rays = [o for o in bpy.data.objects if o.name.startswith("NB_Ray_")]
    drops = [o for o in bpy.data.objects if o.name.startswith("NB_Fallout_")]
    cloud = [o for o in bpy.data.objects if o.name.startswith("NB_Cloud")]

    liner_prefixes = ("NB_Shell_", "NB_Seam_", "NB_Rib_", "NB_BackWall", "NB_BackRib_",
                      "NB_BackHatch", "NB_Conduit", "NB_JunctionBox", "NB_Floor",
                      "NB_PlankLine_", "NB_FloorLip", "NB_Lamp", "NB_Ladder", "NB_Rung_")
    liner = [o for o in bpy.data.collections["NB_Bunker"].objects
             if o.type == "MESH" and o.name.startswith(liner_prefixes)]
    dirt_cave = [o for o in bpy.data.collections["NB_DirtCave"].objects if o.type == "MESH"]

    cam = animate(roots, fan, rotor, valve_flap, hatch_hinge, door_hinge,
                  geiger_needle, rays, drops, cloud, items, plug, headhouse, exit2,
                  liner, dirt_cave)
    setup_render()
    OUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
    print(f"Built NuclearBunker: {len(bpy.data.objects)} objects, {DURATION} frames")


if __name__ in ("__main__", "nb_main"):
    main()
