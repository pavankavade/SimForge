# Export the base human for the playable characters (src/artifacts/characters/paladin) from MakeHuman
# via MPFB, headless and reproducible:
#
#   blender.exe --background --python scripts/blender/export-human.py -- [--out <dir>]
#
# Needs the MPFB extension and the CC0 "MakeHuman system assets" pack installed in that Blender
# (docs/dungeon-explorer/base-human-import-plan.md, Phase 0). Writes into
# public/dungeon-explorer/assets/characters/:
#   human_male.glb   body + eyes + brows + lashes + two hair caps on the MPFB game-engine rig;
#                    face and build variants as position-only morph targets (baked at load and the
#                    normals rebuilt, see humanAsset.ts)
#   human_male.json  bone map, morph list, texture list, macro settings
#   human/*.jpg|png  skins, eyes, brows, lashes, hair (resized copies of the CC0 pack textures)
# Only MakeHuman output (CC0) is written; nothing from MPFB itself.
import json
import os
import shutil
import sys
import traceback

import bmesh
import bpy
import numpy as np

from bl_ext.user_default.mpfb.services.clothesservice import ClothesService
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.entities.objectproperties import HumanObjectProperties

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.join(ROOT, "public", "dungeon-explorer", "assets", "characters")
if "--out" in ARGS:
    OUT = os.path.abspath(ARGS[ARGS.index("--out") + 1])
NAME = "human_male"
TEX_DIR = "human"

# Average young man, about 1.75 m, close to the old procedural REST table (hip joint 0.946 m).
MACRO = {
    "gender": 1.0,
    "age": 0.5,
    "muscle": 0.7,
    "weight": 0.5,
    "proportions": 1.0,
    "height": 0.5,
    "cupsize": 0.5,
    "firmness": 0.5,
    "race": {"asian": 0.0, "caucasian": 1.0, "african": 0.0},
}

# Body build variants: macro overrides, stored as morphs relative to MACRO.
BUILDS = {
    "b_muscle": {"muscle": 1.0},
    "b_heavy": {"weight": 0.8},
    "b_lean": {"weight": 0.25},
}

# Face variants: FaceSpec field -> (targets for +1, targets for -1). "lr:" expands to l- and r-.
FACE = {
    "jawWidth": (["chin/chin-bones-incr"], ["chin/chin-bones-decr"]),
    "jawSquare": (["head/head-square"], ["chin/chin-triangle"]),
    "chin": (["chin/chin-prominent-incr"], ["chin/chin-prominent-decr"]),
    "chinWidth": (["chin/chin-width-incr"], ["chin/chin-width-decr"]),
    "cheekbones": (["cheek/lr:cheek-bones-incr"], ["cheek/lr:cheek-bones-decr"]),
    "cheekHollow": (["cheek/lr:cheek-volume-decr"], ["cheek/lr:cheek-volume-incr"]),
    "brow": (["eyebrows/eyebrows-trans-forward"], ["eyebrows/eyebrows-trans-backward"]),
    "eyeSize": (["eyes/lr:eye-scale-incr"], ["eyes/lr:eye-scale-decr"]),
    "eyeSpacing": (["eyes/lr:eye-trans-out"], ["eyes/lr:eye-trans-in"]),
    "eyeTilt": (["eyes/lr:eye-eyefold-angle-up"], ["eyes/lr:eye-eyefold-angle-down"]),
    "hooded": (["eyes/lr:eye-eyefold-down"], ["eyes/lr:eye-eyefold-up"]),
    "noseSize": (["nose/nose-scale-depth-incr"], ["nose/nose-scale-depth-decr"]),
    "noseWidth": (["nose/nose-scale-horiz-incr"], ["nose/nose-scale-horiz-decr"]),
    "noseBridge": (["nose/nose-hump-incr"], ["nose/nose-hump-decr"]),
    "noseTip": (["nose/nose-point-up"], ["nose/nose-point-down"]),
    "lips": (["mouth/mouth-upperlip-volume-incr", "mouth/mouth-lowerlip-volume-incr"],
             ["mouth/mouth-upperlip-volume-decr", "mouth/mouth-lowerlip-volume-decr"]),
    "mouthWidth": (["mouth/mouth-scale-horiz-incr"], ["mouth/mouth-scale-horiz-decr"]),
    "earSize": (["ears/lr:ear-scale-incr"], ["ears/lr:ear-scale-decr"]),
    "skullWidth": (["head/head-scale-horiz-incr"], ["head/head-scale-horiz-decr"]),
}

# Proxies (body parts and hair): object name -> (asset type, mhclo path in the user data dir).
PROXIES = {
    "eyes": ("Eyes", "eyes/high-poly/high-poly.mhclo"),
    "brows": ("Eyebrows", "eyebrows/eyebrow001/eyebrow001.mhclo"),
    "lashes": ("Eyelashes", "eyelashes/eyelashes02/eyelashes02.mhclo"),
    "hair_short02": ("Hair", "hair/short02/short02.mhclo"),
    "hair_short04": ("Hair", "hair/short04/short04.mhclo"),
}

# Texture copies: output name -> (source in the user data dir, max size, format).
TEXTURES = {
    "skin_young.jpg": ("skins/young_caucasian_male/young_lightskinned_male_diffuse.png", 2048, "JPEG"),
    "skin_middleage.jpg": ("skins/middleage_caucasian_male/middleage_lightskinned_male_diffuse.png", 2048, "JPEG"),
    "eye_brown.png": ("eyes/materials/brown_eye.png", 512, "PNG"),
    "eye_blue.png": ("eyes/materials/blue_eye.png", 512, "PNG"),
    "eye_green.png": ("eyes/materials/green_eye.png", 512, "PNG"),
    "eye_grey.png": ("eyes/materials/grey_eye.png", 512, "PNG"),
    "brows.png": ("eyebrows/eyebrow001/eyebrow001.png", 512, "PNG"),
    "lashes.png": ("eyelashes/eyelashes02/eyelashes02.png", 512, "PNG"),
    "hair_short02.png": ("hair/short02/short02_diffuse.png", 512, "PNG"),
    "hair_short02_normal.jpg": ("hair/short02/short02_normal.png", 512, "JPEG"),
    "hair_short04.png": ("hair/short04/short04_diffuse.png", 512, "PNG"),
}

# MPFB game-engine bone -> logical bone of src/artifacts/characters/paladin/rig.ts (null: follows parent).
BONE_MAP = {
    "pelvis": "hips", "spine_01": "spine", "spine_02": None, "spine_03": "chest",
    "neck_01": "neck", "head": "head",
    "clavicle_l": "clavL", "upperarm_l": "upperArmL", "lowerarm_l": "foreArmL", "hand_l": "handL",
    "clavicle_r": "clavR", "upperarm_r": "upperArmR", "lowerarm_r": "foreArmR", "hand_r": "handR",
    "thigh_l": "thighL", "calf_l": "shinL", "foot_l": "footL", "ball_l": "toeL",
    "thigh_r": "thighR", "calf_r": "shinR", "foot_r": "footR", "ball_r": "toeR",
}

EPS = 2e-5


def log(*a):
    print("[export-human]", *a, flush=True)


def user_data(rel):
    return os.path.join(LocationService.get_user_data(), *rel.split("/"))


def mix_coords(obj):
    """Vertex positions with every shape key applied (the state MPFB fits proxies to)."""
    me = obj.data
    out = np.empty(len(me.vertices) * 3, dtype=np.float64)
    if me.shape_keys is None:
        me.vertices.foreach_get("co", out)
        return out.reshape(-1, 3)
    key = obj.shape_key_add(name="__mix", from_mix=True)
    key.data.foreach_get("co", out)
    obj.shape_key_remove(key)
    return out.reshape(-1, 3)


def plain_coords(obj):
    me = obj.data
    out = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", out)
    return out.reshape(-1, 3)


def capture(basemesh, proxies):
    """Fit every proxy to the current shape and return all positions."""
    shot = {"body": mix_coords(basemesh)}
    for name, obj in proxies.items():
        ClothesService.fit_clothes_to_human(obj, basemesh, set_parent=False)
        shot[name] = plain_coords(obj)
    return shot


def set_macros(basemesh, macro):
    for key, value in macro.items():
        if key == "race":
            for r, v in value.items():
                HumanObjectProperties.set_value(r, v, entity_reference=basemesh)
        else:
            HumanObjectProperties.set_value(key, value, entity_reference=basemesh)
    TargetService.reapply_macro_details(basemesh)
    bpy.context.view_layer.update()


def target_paths(spec):
    group, name = spec.split("/")
    names = [name.replace("lr:", s) for s in ("l-", "r-")] if name.startswith("lr:") else [name]
    base = LocationService.get_mpfb_data("targets")
    return [os.path.join(base, group, n + ".target.gz") for n in names]


def keep_mask(obj):
    """True for real body vertices (MakeHuman helpers and joint cubes are not in 'body')."""
    gi = obj.vertex_groups["body"].index
    return np.array([any(g.group == gi for g in v.groups) for v in obj.data.vertices])


def delete_vertices(obj, keep):
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in np.nonzero(~keep)[0]], context="VERTS")
    bm.to_mesh(me)
    bm.free()
    me.update()


def add_morphs(obj, base, variants, keep=None):
    """Basis = base; one shape key per variant with near-zero deltas snapped to the basis."""
    names = []
    if keep is not None:
        base = base[keep]
    obj.shape_key_add(name="Basis", from_mix=False)
    for name, coords in variants.items():
        c = coords[keep] if keep is not None else coords
        d = c - base
        small = np.abs(d).max(axis=1) < EPS
        if small.all():
            continue
        c = np.where(small[:, None], base, c)
        key = obj.shape_key_add(name=name, from_mix=False)
        key.data.foreach_set("co", c.astype(np.float32).ravel())
        key.value = 0.0
        names.append(name)
    return names


def flat_material(obj, name):
    obj.data.materials.clear()
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    obj.data.materials.append(mat)


def save_texture(src, dst, size, fmt):
    img = bpy.data.images.load(src)
    w, h = img.size
    s = min(1.0, size / max(w, h))
    if s < 1.0:
        img.scale(max(1, int(w * s)), max(1, int(h * s)))
    scene = bpy.context.scene
    settings = scene.render.image_settings
    settings.file_format = fmt
    settings.quality = 86
    settings.color_mode = "RGBA" if fmt == "PNG" else "RGB"
    if fmt == "PNG":
        settings.compression = 100
    img.save_render(dst, scene=scene)
    bpy.data.images.remove(img)
    log("texture", os.path.basename(dst), img_size_str(dst))


def img_size_str(path):
    return "%.0f KB" % (os.path.getsize(path) / 1024)


def main():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)

    macro = json.loads(json.dumps(MACRO))
    basemesh = HumanService.create_human(mask_helpers=False, detailed_helpers=True, extra_vertex_groups=True,
                                         feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
    rig = HumanService.add_builtin_rig(basemesh, "game_engine")
    log("human", len(basemesh.data.vertices), "verts,", len(rig.data.bones), "bones")

    proxies = {}
    for name, (atype, rel) in PROXIES.items():
        obj = HumanService.add_mhclo_asset(user_data(rel), basemesh, asset_type=atype, subdiv_levels=0,
                                           material_type="MAKESKIN")
        obj.name = name
        proxies[name] = obj
        log("proxy", name, len(obj.data.vertices), "verts")

    # Capture the base and every variant before anything is baked.
    base = capture(basemesh, proxies)
    variants = {k: {} for k in ["body"] + list(proxies)}

    def store(key, shot):
        for part, coords in shot.items():
            variants[part][key] = coords

    for key, over in BUILDS.items():
        m = json.loads(json.dumps(MACRO))
        m.update(over)
        set_macros(basemesh, m)
        store(key, capture(basemesh, proxies))
        log("build", key)
    set_macros(basemesh, MACRO)

    for field, (plus, minus) in FACE.items():
        for sign, specs in (("p", plus), ("n", minus)):
            keys = []
            for spec in specs:
                for path in target_paths(spec):
                    k = TargetService.load_target(basemesh, path, weight=1.0, name="face." + os.path.basename(path))
                    keys.append(k.name)
            bpy.context.view_layer.update()
            store("f_%s_%s" % (field, sign), capture(basemesh, proxies))
            for k in keys:
                basemesh.shape_key_remove(basemesh.data.shape_keys.key_blocks[k])
        log("face", field)

    # Bake the macros into the basis, refit the proxies to it, and check it matches the capture.
    TargetService.bake_targets(basemesh)
    rest = capture(basemesh, proxies)
    for part in rest:
        log("bake drift", part, "%.2e" % np.abs(rest[part] - base[part]).max())

    # Drop MakeHuman helper geometry and non-bone vertex groups, then add the morphs.
    keep = keep_mask(basemesh)
    delete_vertices(basemesh, keep)
    bones = set(b.name for b in rig.data.bones)
    for obj in [basemesh] + list(proxies.values()):
        for g in list(obj.vertex_groups):
            if g.name not in bones:
                obj.vertex_groups.remove(g)
        for mod in list(obj.modifiers):
            if mod.type != "ARMATURE":
                obj.modifiers.remove(mod)
        obj.data.polygons.foreach_set("use_smooth", [True] * len(obj.data.polygons))
    basemesh.name = "body"
    order = np.abs(plain_coords(basemesh) - base["body"][keep]).max()
    log("body after helper removal", len(basemesh.data.vertices), "verts, order drift %.2e" % order)
    if order > 1e-4:
        raise RuntimeError("helper removal reordered the body vertices")

    morphs = {"body": add_morphs(basemesh, base["body"], variants["body"], keep)}
    for name, obj in proxies.items():
        morphs[name] = add_morphs(obj, base[name], variants[name])

    flat_material(basemesh, "skin")
    flat_material(proxies["eyes"], "eye")
    flat_material(proxies["brows"], "brows")
    flat_material(proxies["lashes"], "lashes")
    flat_material(proxies["hair_short02"], "hair_short02")
    flat_material(proxies["hair_short04"], "hair_short04")

    os.makedirs(os.path.join(OUT, TEX_DIR), exist_ok=True)
    glb = os.path.join(OUT, NAME + ".glb")
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.export_scene.gltf(
        filepath=glb,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_image_format="NONE",
        export_skins=True,
        export_all_influences=False,
        export_morph=True,
        export_morph_normal=False,
        export_morph_tangent=False,
        export_try_sparse_sk=True,
        export_animations=False,
        export_def_bones=False,
        export_rest_position_armature=True,
        export_extras=False,
    )
    log("glb", img_size_str(glb))

    for out, (src, size, fmt) in TEXTURES.items():
        save_texture(user_data(src), os.path.join(OUT, TEX_DIR, out), size, fmt)

    def joint(name):
        b = rig.data.bones[name]
        h = rig.matrix_world @ b.head_local
        return [round(h.x, 4), round(h.z, 4), round(-h.y, 4)]

    meta = {
        "source": "MakeHuman (CC0) via MPFB, scripts/blender/export-human.py",
        "macro": MACRO,
        "builds": BUILDS,
        "boneMap": BONE_MAP,
        "face": list(FACE.keys()),
        "morphs": morphs,
        "textures": {k: TEX_DIR + "/" + k for k in TEXTURES},
        "bindJoints": {name: joint(name) for name in rig.data.bones.keys()},
    }
    with open(os.path.join(OUT, NAME + ".json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=1)
    log("done", OUT)


try:
    main()
    print("EXPORT_OK")
except Exception:
    traceback.print_exc()
    print("EXPORT_FAIL")
