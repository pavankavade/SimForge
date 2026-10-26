"""
SimForge Episode 3: "Crushing Walls" Blender Generator & Scene Recreator.
Zero external assets: 100% procedural geometry, vinyl PBR materials,
inverted-hull ink outlines, chibi character rigs, props, and camera.
"""

import bpy
import bmesh
import math
import json
from pathlib import Path
from mathutils import Vector, Euler, Matrix, Quaternion

ROOT = Path(r"D:\git\SimForge")
CUES_PATH = ROOT / "src" / "episodes" / "crushing-walls" / "data" / "narrationCues.json"

# ---------------------------------------------------------------------------
# Color & Material Helpers
# ---------------------------------------------------------------------------

def srgb_to_linear(c):
    return [((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c]

def hex_to_rgba(hex_str, alpha=1.0):
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join([c*2 for c in hex_str])
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    lin = srgb_to_linear([r, g, b])
    return (lin[0], lin[1], lin[2], alpha)

def get_or_create_ink_mat():
    mat = bpy.data.materials.get("SimForge_Ink")
    if not mat:
        mat = bpy.data.materials.new("SimForge_Ink")
    mat.use_nodes = True
    mat.use_backface_culling = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    mix = nodes.new('ShaderNodeMixShader')
    light_path = nodes.new('ShaderNodeLightPath')
    emit = nodes.new('ShaderNodeEmission')
    emit.inputs['Color'].default_value = (0.01, 0.01, 0.01, 1.0)
    emit.inputs['Strength'].default_value = 0.0
    transp = nodes.new('ShaderNodeBsdfTransparent')
    # Use Transparent BSDF on shadow rays so the inverted-hull outline casts zero shadow on the body
    mat.node_tree.links.new(light_path.outputs['Is Shadow Ray'], mix.inputs['Fac'])
    mat.node_tree.links.new(emit.outputs['Emission'], mix.inputs[1])
    mat.node_tree.links.new(transp.outputs['BSDF'], mix.inputs[2])
    mat.node_tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return mat

def setup_dungeon_masonry_mat(name, c1="#3d414e", c2="#484d5c", mortar="#22242b", scale=2.5):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs['Rotation'].default_value = (math.radians(90), 0.0, 0.0)
    mapping.inputs['Scale'].default_value = (scale, scale, scale)
    
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.inputs['Color1'].default_value = hex_to_rgba(c1)
    brick.inputs['Color2'].default_value = hex_to_rgba(c2)
    brick.inputs['Mortar'].default_value = hex_to_rgba(mortar)
    brick.inputs['Mortar Size'].default_value = 0.02
    brick.inputs['Mortar Smooth'].default_value = 0.1
    brick.inputs['Row Height'].default_value = 0.5
    brick.inputs['Brick Width'].default_value = 1.0
    
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs['Strength'].default_value = 0.35
    bump.inputs['Distance'].default_value = 0.08
    
    nt.links.new(coord.outputs['Object'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], brick.inputs['Vector'])
    nt.links.new(brick.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(brick.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    
    bsdf.inputs['Roughness'].default_value = 0.65
    if 'Sheen Weight' in bsdf.inputs:
        bsdf.inputs['Sheen Weight'].default_value = 0.45
    return mat

def setup_dungeon_floor_mat(name, c1="#454854", c2="#555968", mortar="#22242c", scale=2.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs['Scale'].default_value = (scale, scale, scale)
    
    voronoi_dist = nt.nodes.new("ShaderNodeTexVoronoi")
    voronoi_dist.feature = 'DISTANCE_TO_EDGE'
    voronoi_dist.inputs['Scale'].default_value = 1.8
    
    voronoi_color = nt.nodes.new("ShaderNodeTexVoronoi")
    voronoi_color.feature = 'F1'
    voronoi_color.inputs['Scale'].default_value = 1.8
    
    ramp_color = nt.nodes.new("ShaderNodeValToRGB")
    ramp_color.color_ramp.elements[0].position = 0.0
    ramp_color.color_ramp.elements[0].color = hex_to_rgba(c1)
    ramp_color.color_ramp.elements[1].position = 1.0
    ramp_color.color_ramp.elements[1].color = hex_to_rgba(c2)
    
    ramp_mortar = nt.nodes.new("ShaderNodeValToRGB")
    ramp_mortar.color_ramp.elements[0].position = 0.0
    ramp_mortar.color_ramp.elements[0].color = (0.0, 0.0, 0.0, 1.0)
    ramp_mortar.color_ramp.elements[1].position = 0.08
    ramp_mortar.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
    
    mix_color = nt.nodes.new("ShaderNodeMix")
    mix_color.data_type = 'RGBA'
    mix_color.inputs[6].default_value = hex_to_rgba(mortar)
    
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs['Strength'].default_value = 0.40
    bump.inputs['Distance'].default_value = 0.05
    
    nt.links.new(coord.outputs['Object'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], voronoi_dist.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], voronoi_color.inputs['Vector'])
    
    nt.links.new(voronoi_color.outputs['Distance'], ramp_color.inputs['Fac'])
    nt.links.new(voronoi_dist.outputs['Distance'], ramp_mortar.inputs['Fac'])
    
    nt.links.new(ramp_mortar.outputs['Color'], mix_color.inputs['Factor'])
    nt.links.new(ramp_color.outputs['Color'], mix_color.inputs[7])
    
    nt.links.new(mix_color.outputs[2], bsdf.inputs['Base Color'])
    nt.links.new(voronoi_dist.outputs['Distance'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    
    bsdf.inputs['Roughness'].default_value = 0.60
    if 'Sheen Weight' in bsdf.inputs:
        bsdf.inputs['Sheen Weight'].default_value = 0.35
    return mat

def setup_hazard_stripe_mat(name, c_yellow="#e5b824", c_black="#18181b", scale=12.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs['Rotation'].default_value = (0.0, 0.0, math.radians(45))
    mapping.inputs['Scale'].default_value = (scale, scale, scale)
    
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'X'
    wave.inputs['Scale'].default_value = 1.0
    wave.inputs['Distortion'].default_value = 0.0
    
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = hex_to_rgba(c_yellow)
    ramp.color_ramp.elements[1].position = 0.5
    ramp.color_ramp.elements[1].color = hex_to_rgba(c_black)
    
    nt.links.new(coord.outputs['Object'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], wave.inputs['Vector'])
    nt.links.new(wave.outputs['Color'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    
    bsdf.inputs['Roughness'].default_value = 0.25
    bsdf.inputs['Metallic'].default_value = 0.1
    return mat

def make_vinyl_mat(name, hex_color, finish="skin"):
    mat_name = f"Vinyl_{name}"
    mat = bpy.data.materials.get(mat_name)
    if mat:
        return mat
    mat = bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if not bsdf:
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")
        out = nodes.get("Material Output")
        mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    
    rgba = hex_to_rgba(hex_color)
    bsdf.inputs['Base Color'].default_value = rgba
    
    metallic = 0.0
    roughness = 0.4
    if finish == "skin":
        roughness = 0.38
    elif finish == "leather":
        roughness = 0.55
    elif finish == "cloth":
        roughness = 0.72
    elif finish == "hair":
        roughness = 0.65
    elif finish == "wood":
        roughness = 0.70
    elif finish == "gloss":
        roughness = 0.15
    elif finish == "metal":
        roughness = 0.35
        metallic = 0.90
    elif finish == "gold":
        roughness = 0.22
        metallic = 0.92
    elif finish == "bone":
        roughness = 0.45
    
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    
    if 'Sheen Weight' in bsdf.inputs:
        bsdf.inputs['Sheen Weight'].default_value = 0.65
        if 'Sheen Tint' in bsdf.inputs:
            bsdf.inputs['Sheen Tint'].default_value = (1.0, 0.9, 0.75, 1.0)
    elif 'Sheen' in bsdf.inputs:
        bsdf.inputs['Sheen'].default_value = 0.65
        
    return mat

def make_glow_mat(name, hex_color, strength=3.0):
    mat_name = f"Glow_{name}"
    mat = bpy.data.materials.get(mat_name)
    if mat:
        return mat
    mat = bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    rgba = hex_to_rgba(hex_color)
    if 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = rgba
        bsdf.inputs['Emission Strength'].default_value = strength
    elif 'Emission' in bsdf.inputs:
        bsdf.inputs['Emission'].default_value = rgba
        if 'Emission Strength' in bsdf.inputs:
            bsdf.inputs['Emission Strength'].default_value = strength
    return mat

def apply_ink_outline(obj, thickness=0.010):
    ink_mat = get_or_create_ink_mat()
    if ink_mat.name not in obj.data.materials:
        obj.data.materials.append(ink_mat)
    ink_idx = obj.data.materials.find(ink_mat.name)
    
    sol = obj.modifiers.get("InkOutline")
    if not sol:
        sol = obj.modifiers.new("InkOutline", 'SOLIDIFY')
    sol.thickness = -thickness
    sol.offset = 0.0
    sol.use_flip_normals = True
    sol.material_offset = ink_idx
    sol.use_rim = False

# ---------------------------------------------------------------------------
# Procedural Mesh Primitive Generators
# ---------------------------------------------------------------------------

def create_mesh_obj(name, bm, mat=None, collection=None, smooth=True):
    # Remove existing object with same name if any
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
        
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    if len(mesh.polygons) > 0:
        mesh.polygons.foreach_set('use_smooth', [smooth] * len(mesh.polygons))
    obj = bpy.data.objects.new(name, mesh)
    if mat:
        obj.data.materials.append(mat)
    col = collection or bpy.context.collection or bpy.context.scene.collection
    col.objects.link(obj)
    return obj

def make_box(name, sx, sy, sz, center=(0,0,0), mat=None, ink=True, ink_thickness=0.010, collection=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    obj = create_mesh_obj(name, bm, mat, collection, smooth=False)
    if ink:
        apply_ink_outline(obj, thickness=ink_thickness)
    return obj

def make_cylinder(name, r, depth, center=(0,0,0), rot=(0,0,0), segments=24, mat=None, ink=True, ink_thickness=0.010, collection=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, radius1=r, radius2=r, depth=depth, segments=segments)
    for f in bm.faces:
        f.smooth = True
    if rot != (0,0,0):
        R = Euler(rot).to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=R, verts=bm.verts)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    obj = create_mesh_obj(name, bm, mat, collection, smooth=True)
    if ink:
        apply_ink_outline(obj, thickness=ink_thickness)
    return obj

def make_sphere(name, r, center=(0,0,0), scale=(1,1,1), segments=24, ring_count=16, mat=None, ink=True, ink_thickness=0.010, collection=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=ring_count, radius=r)
    for f in bm.faces:
        f.smooth = True
    if scale != (1,1,1):
        bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    obj = create_mesh_obj(name, bm, mat, collection, smooth=True)
    if ink:
        apply_ink_outline(obj, thickness=ink_thickness)
    return obj

def make_cone(name, r, depth, center=(0,0,0), rot=(0,0,0), scale=(1,1,1), segments=20, mat=None, ink=True, ink_thickness=0.010, collection=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, radius1=r, radius2=0.0, depth=depth, segments=segments)
    for f in bm.faces:
        f.smooth = True
    if scale != (1,1,1):
        bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    if rot != (0,0,0):
        R = Euler(rot).to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=R, verts=bm.verts)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    obj = create_mesh_obj(name, bm, mat, collection, smooth=True)
    if ink:
        apply_ink_outline(obj, thickness=ink_thickness)
    return obj

def make_capsule(name, r, length, center=(0,0,0), rot=(0,0,0), segments=20, rings=8, mat=None, ink=True, ink_thickness=0.010, collection=None):
    bm = bmesh.new()
    cyl_len = max(0.001, length - 2.0 * r)
    half_cyl = cyl_len / 2.0
    
    profile_coords = []
    for i in range(rings + 1):
        phi = math.pi / 2.0 - (i / rings) * (math.pi / 2.0)
        x = r * math.cos(phi)
        z = half_cyl + r * math.sin(phi)
        profile_coords.append((x, 0.0, z))
    for i in range(1, rings + 1):
        phi = -(i / rings) * (math.pi / 2.0)
        x = r * math.cos(phi)
        z = -half_cyl + r * math.sin(phi)
        profile_coords.append((x, 0.0, z))

    p_verts = [bm.verts.new(co) for co in profile_coords]
    p_edges = [bm.edges.new((p_verts[i], p_verts[i+1])) for i in range(len(p_verts) - 1)]

    bmesh.ops.spin(
        bm,
        geom=p_edges + p_verts,
        axis=(0.0, 0.0, 1.0),
        cent=(0.0, 0.0, 0.0),
        angle=2.0 * math.pi,
        steps=segments,
        use_duplicate=False
    )
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
        
    if rot != (0,0,0):
        R = Euler(rot).to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=R, verts=bm.verts)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    obj = create_mesh_obj(name, bm, mat, collection, smooth=True)
    if ink:
        apply_ink_outline(obj, thickness=ink_thickness)
    return obj
# ---------------------------------------------------------------------------
# Diorama Hall Generator
# ---------------------------------------------------------------------------

def build_diorama_hall():
    hall_col = bpy.data.collections.get("DioramaHall")
    if not hall_col:
        hall_col = bpy.data.collections.new("DioramaHall")
        bpy.context.scene.collection.children.link(hall_col)
    
    mat_floor = setup_dungeon_floor_mat("HallFloor", "#454854", "#555968", "#22242c", scale=1.5)
    mat_wall = setup_dungeon_masonry_mat("HallWall", "#3d414e", "#484d5c", "#22242b", scale=2.5)
    mat_pillar = setup_dungeon_masonry_mat("HallPillar", "#525667", "#5c6174", "#2a2d36", scale=3.5)
    mat_trim = make_vinyl_mat("HallTrim", "#2a2d36", "leather")
    mat_wood = make_vinyl_mat("BeamWood", "#4a3320", "wood")
    mat_gold = make_vinyl_mat("GoldTrim", "#f2c14e", "gold")
    
    # 1. Back Wall
    make_box("Hall_BackWall", 24.0, 0.4, 7.5, center=(0.0, -2.5, 3.75), mat=mat_wall, ink=False, collection=hall_col)
    for row in range(7):
        z_pos = 0.55 + row * 1.05
        make_box(f"Wall_Band_{row}", 24.0, 0.05, 0.04, center=(0.0, -2.28, z_pos), mat=mat_trim, ink=False, collection=hall_col)
    
    # 2. Floor
    make_box("Hall_Floor", 24.0, 3.6, 0.3, center=(0.0, -0.6, -0.15), mat=mat_floor, ink=False, collection=hall_col)
    for col in range(-5, 6):
        x_pos = col * 2.2
        make_box(f"Floor_Seam_X_{col}", 0.04, 3.6, 0.02, center=(x_pos, -0.6, 0.005), mat=mat_trim, ink=False, collection=hall_col)
    
    # Foundation Plinth
    make_box("Hall_Plinth", 34.0, 4.0, 6.0, center=(0.0, -0.6, -3.3), mat=make_vinyl_mat("Plinth", "#15171e", "cloth"), ink=False, collection=hall_col)
    
    # 3. Pillars: at X = -9.2, 5.0, 7.4
    for i, px in enumerate([-9.2, 5.0, 7.4]):
        make_box(f"Pillar_Shaft_{i}", 0.7, 0.7, 7.5, center=(px, -2.0, 3.75), mat=mat_pillar, ink=True, ink_thickness=0.012, collection=hall_col)
        make_box(f"Pillar_Base_{i}", 0.9, 0.9, 0.45, center=(px, -2.0, 0.225), mat=mat_trim, ink=True, ink_thickness=0.012, collection=hall_col)
        make_box(f"Pillar_Cap_{i}", 0.9, 0.9, 0.45, center=(px, -2.0, 7.2), mat=mat_trim, ink=True, ink_thickness=0.012, collection=hall_col)
    
    # 4. Ceiling Beams
    for bx in [-8.0, -4.0, 0.0, 3.5, 8.5]:
        make_box(f"Ceiling_Beam_{bx}", 0.35, 3.8, 0.4, center=(bx, -0.6, 7.4), mat=mat_wood, ink=True, ink_thickness=0.012, collection=hall_col)
    
    # 5. Wall Torches: outer wall torches and flanking entrance torches
    torch_positions = [-8.4, -3.8, 3.8, 6.2]
    for i, tx in enumerate(torch_positions):
        make_box(f"Sconce_{i}", 0.12, 0.35, 0.3, center=(tx, -2.1, 2.7), mat=mat_trim, ink=True, collection=hall_col)
        make_cylinder(f"Torch_Cup_{i}", 0.08, 0.18, center=(tx, -1.95, 2.85), mat=mat_gold, ink=True, collection=hall_col)
        
        l_name = f"Torch_Light_{i}"
        l_data = bpy.data.lights.get(l_name)
        if not l_data:
            l_data = bpy.data.lights.new(l_name, 'POINT')
        l_data.color = (1.0, 0.70, 0.38)
        l_data.energy = 220.0
        l_data.shadow_soft_size = 0.35
        l_obj = bpy.data.objects.get(f"Torch_Light_Obj_{i}")
        if not l_obj:
            l_obj = bpy.data.objects.new(f"Torch_Light_Obj_{i}", l_data)
            hall_col.objects.link(l_obj)
        l_obj.location = (tx, -1.9, 3.0)
    
    # 6. Lighting: Daylight Exit, World Ambient, Studio Sun & Rim
    world = bpy.context.scene.world
    if not world:
        world = bpy.data.worlds.new("ToonWorld")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs['Color'].default_value = (0.28, 0.32, 0.42, 1.0)
        bg.inputs['Strength'].default_value = 1.2
        
    ex_name = "Daylight_Exit"
    ex_data = bpy.data.lights.get(ex_name)
    if not ex_data:
        ex_data = bpy.data.lights.new(ex_name, 'SPOT')
    ex_data.color = (0.6, 0.85, 1.0)
    ex_data.energy = 850.0
    ex_data.spot_size = math.radians(75)
    ex_data.spot_blend = 0.5
    ex_obj = bpy.data.objects.get("Daylight_Exit_Light")
    if not ex_obj:
        ex_obj = bpy.data.objects.new("Daylight_Exit_Light", ex_data)
        hall_col.objects.link(ex_obj)
    ex_obj.location = (-11.5, -0.6, 3.5)
    ex_obj.rotation_euler = (0.0, math.radians(65), 0.0)
    
    key_name = "Studio_Key"
    key_data = bpy.data.lights.get(key_name)
    if not key_data:
        key_data = bpy.data.lights.new(key_name, 'SUN')
    key_data.color = (1.0, 0.95, 0.88)
    key_data.energy = 2.4
    if hasattr(key_data, 'angle'):
        key_data.angle = math.radians(5.0)
    key_obj = bpy.data.objects.get("Studio_Key_Obj")
    if not key_obj:
        key_obj = bpy.data.objects.new("Studio_Key_Obj", key_data)
        bpy.context.scene.collection.objects.link(key_obj)
    key_obj.rotation_euler = (math.radians(-35), math.radians(15), math.radians(-25))
    
    rim_name = "Studio_Rim"
    rim_data = bpy.data.lights.get(rim_name)
    if not rim_data:
        rim_data = bpy.data.lights.new(rim_name, 'SUN')
    rim_data.color = (0.7, 0.85, 1.0)
    rim_data.energy = 1.8
    if hasattr(rim_data, 'angle'):
        rim_data.angle = math.radians(8.0)
    rim_obj = bpy.data.objects.get("Studio_Rim_Obj")
    if not rim_obj:
        rim_obj = bpy.data.objects.new("Studio_Rim_Obj", rim_data)
        bpy.context.scene.collection.objects.link(rim_obj)
    rim_obj.rotation_euler = (math.radians(45), math.radians(-15), math.radians(155))

# ---------------------------------------------------------------------------
# Crushing Room Props Generator
# ---------------------------------------------------------------------------

def build_crush_room_props():
    crush_col = bpy.data.collections.get("CrushRoom")
    if not crush_col:
        crush_col = bpy.data.collections.new("CrushRoom")
        bpy.context.scene.collection.children.link(crush_col)
        
    mat_stone_l = setup_dungeon_masonry_mat("WallStoneL", "#606473", "#6c7182", "#2e313c", scale=2.8)
    mat_stone_r = setup_dungeon_masonry_mat("WallStoneR", "#525664", "#5d6272", "#282a34", scale=2.8)
    mat_steel = make_vinyl_mat("WallSteel", "#8a909c", "metal")
    mat_plate = make_vinyl_mat("WallPlate", "#727885", "metal")
    mat_gold = make_vinyl_mat("PedestalGold", "#f2c14e", "gold")
    mat_cushion = make_vinyl_mat("CushionRed", "#a82424", "cloth")
    mat_coin = make_vinyl_mat("CoinGold", "#ffd84d", "gold")
    mat_pedestal = setup_dungeon_masonry_mat("PedestalStone", "#323540", "#3d4250", "#1e2028", scale=3.5)
    mat_press = make_vinyl_mat("PressBody", "#3c404d", "metal")
    mat_press_piston = make_vinyl_mat("PressPiston", "#c5cad6", "metal")
    mat_hazard = setup_hazard_stripe_mat("HazardStripeMat", "#e5b824", "#18181b", scale=12.0)
    mat_mirror = make_vinyl_mat("MirrorGlass", "#a5d8f0", "gloss")
    mat_wood = make_vinyl_mat("ChestWood", "#5c3a21", "wood")
    mat_teeth = make_vinyl_mat("ChestTeeth", "#f2efe9", "bone")
    
    # 1. Room Root Empty
    room_root = bpy.data.objects.get("CrushRoom_Root")
    if not room_root:
        room_root = bpy.data.objects.new("CrushRoom_Root", None)
        room_root.empty_display_type = 'PLAIN_AXES'
        crush_col.objects.link(room_root)
        
    # Warm Point Light inside Crush Room
    cr_light_name = "CrushRoom_Light"
    cr_light_data = bpy.data.lights.get(cr_light_name)
    if not cr_light_data:
        cr_light_data = bpy.data.lights.new(cr_light_name, 'POINT')
    cr_light_data.color = (1.0, 0.78, 0.54)
    cr_light_data.energy = 380.0
    cr_light_data.shadow_soft_size = 0.5
    cr_light_obj = bpy.data.objects.get("CrushRoom_Light_Obj")
    if not cr_light_obj:
        cr_light_obj = bpy.data.objects.new("CrushRoom_Light_Obj", cr_light_data)
        crush_col.objects.link(cr_light_obj)
    cr_light_obj.location = (0.0, 1.0, 2.7)
    cr_light_obj.parent = room_root

    # 2. Left Wall Root
    wall_l_root = bpy.data.objects.get("Wall_L_Root")
    if not wall_l_root:
        wall_l_root = bpy.data.objects.new("Wall_L_Root", None)
        wall_l_root.empty_display_type = 'PLAIN_AXES'
        wall_l_root.parent = room_root
        crush_col.objects.link(wall_l_root)
    wall_l_root.location = (-1.8, 0, 0)
    
    # Left Wall Geometry:
    w_l_back = make_box("Wall_L_BackBlock", 0.6, 0.65, 2.99, center=(-0.3, -1.375, 1.655), mat=mat_stone_l, ink=True, collection=crush_col)
    w_l_back.parent = wall_l_root
    w_l_lintel = make_box("Wall_L_Lintel", 0.6, 1.35, 0.90, center=(-0.3, -0.375, 2.70), mat=mat_stone_l, ink=True, collection=crush_col)
    w_l_lintel.parent = wall_l_root
    gate_l = make_box("Wall_L_DropGate", 0.16, 1.32, 2.1, center=(-0.3, -0.375, 1.2), mat=mat_steel, ink=True, collection=crush_col)
    gate_l.parent = wall_l_root
    plates_l = make_box("Wall_L_Plates", 0.04, 1.95, 2.95, center=(0.02, -0.7, 1.65), mat=mat_plate, ink=True, collection=crush_col)
    plates_l.parent = wall_l_root
    plates_l.hide_render = True
    plates_l.hide_viewport = True
    
    # 3. Right Wall Root
    wall_r_root = bpy.data.objects.get("Wall_R_Root")
    if not wall_r_root:
        wall_r_root = bpy.data.objects.new("Wall_R_Root", None)
        wall_r_root.empty_display_type = 'PLAIN_AXES'
        wall_r_root.parent = room_root
        crush_col.objects.link(wall_r_root)
    wall_r_root.location = (1.8, 0, 0)
    
    w_r_block = make_box("Wall_R_Block", 0.6, 2.0, 2.99, center=(0.3, -0.7, 1.655), mat=mat_stone_r, ink=True, collection=crush_col)
    w_r_block.parent = wall_r_root
    plates_r = make_box("Wall_R_Plates", 0.04, 1.95, 2.95, center=(-0.02, -0.7, 1.65), mat=mat_plate, ink=True, collection=crush_col)
    plates_r.parent = wall_r_root
    plates_r.hide_render = True
    plates_r.hide_viewport = True
    
    # 4. Room Ceiling Slab
    c_slab_l = make_box("Ceiling_Slab_L", 2.15, 2.0, 0.25, center=(-1.525, -0.7, 3.325), mat=mat_stone_l, ink=True, collection=crush_col)
    c_slab_l.parent = room_root
    c_slab_r = make_box("Ceiling_Slab_R", 2.15, 2.0, 0.25, center=(1.525, -0.7, 3.325), mat=mat_stone_r, ink=True, collection=crush_col)
    c_slab_r.parent = room_root
    chimney = make_box("Ceiling_Chimney", 0.95, 0.95, 0.60, center=(0.0, -0.7, 3.75), mat=mat_steel, ink=True, collection=crush_col)
    chimney.parent = room_root
    
    # Spring Boot Assembly
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
    boot.hide_viewport = True
    
        # ---------------------------------------------------------
    # Level 3 Props: Steel Beam, Hydraulic Presses, Electric Coils, Paladin Cube
    # ---------------------------------------------------------
    # Steel I-Beam
    beam_root = bpy.data.objects.get("Beam_Root")
    if not beam_root:
        beam_root = bpy.data.objects.new("Beam_Root", None)
        beam_root.empty_display_type = 'PLAIN_AXES'
        beam_root.parent = room_root
        crush_col.objects.link(beam_root)
    for c in list(beam_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
        
    mat_beam_steel = make_vinyl_mat("BeamSteel", "#505864", "metal")
    mat_hazard_yellow = make_vinyl_mat("HazardYellow", "#e0b020", "gloss")
    mat_hazard_black = make_vinyl_mat("HazardBlack", "#1a1a1a", "gloss")
    mat_electric_blue = make_glow_mat("ElectricArc", "#4df0ff", 8.0)
    
    # I-Beam flanges and web
    beam_web = make_box("Beam_Web", 1.86, 0.08, 0.32, center=(0, 0, 0), mat=mat_beam_steel, ink=True, collection=crush_col)
    beam_web.parent = beam_root
    beam_top = make_box("Beam_TopFlange", 1.86, 0.30, 0.06, center=(0, 0, 0.16), mat=mat_beam_steel, ink=True, collection=crush_col)
    beam_top.parent = beam_root
    beam_bot = make_box("Beam_BotFlange", 1.86, 0.30, 0.06, center=(0, 0, -0.16), mat=mat_beam_steel, ink=True, collection=crush_col)
    beam_bot.parent = beam_root
    beam_root.location = Vector((0.0, -0.6, 0.95))
    beam_root.hide_render = True
    beam_root.hide_viewport = True

    # Twin 500-Ton Hydraulic Presses (Mounted on back sides of walls)
    for side, sx, name in [(-1, -1, "L"), (1, 1, "R")]:
        press_root = bpy.data.objects.get(f"HydraulicPress_{name}")
        if not press_root:
            press_root = bpy.data.objects.new(f"HydraulicPress_{name}", None)
            press_root.empty_display_type = 'PLAIN_AXES'
            press_root.parent = wall_l_root if side < 0 else wall_r_root
            crush_col.objects.link(press_root)
        for c in list(press_root.children):
            bpy.data.objects.remove(c, do_unlink=True)
            
        # Heavy hydraulic cylinder body
        cyl_body = make_cylinder(f"HydroBody_{name}", 0.32, 1.4, center=(sx * 0.9, 0.1, 1.65), rot=(0, math.radians(90), 0), mat=mat_hazard_yellow, ink=True, collection=crush_col)
        cyl_body.parent = press_root
        # Chrome piston rod
        piston = make_cylinder(f"HydroPiston_{name}", 0.18, 0.9, center=(sx * 0.25, 0.1, 1.65), rot=(0, math.radians(90), 0), mat=make_vinyl_mat("ChromePiston", "#c8d0d8", "metal"), ink=True, collection=crush_col)
        piston.parent = press_root
        # Hazard stripe bands
        for hx in [0.6, 1.1]:
            band = make_cylinder(f"HydroStripe_{name}_{hx}", 0.33, 0.18, center=(sx * hx, 0.1, 1.65), rot=(0, math.radians(90), 0), mat=mat_hazard_black, ink=False, collection=crush_col)
            band.parent = press_root
            
        press_root.hide_render = True
        press_root.hide_viewport = True

    # Electric Lightning Arcs (Glowing cyan jagged geometry bridging walls)
    electric_root = bpy.data.objects.get("Electric_Arcs")
    if not electric_root:
        electric_root = bpy.data.objects.new("Electric_Arcs", None)
        electric_root.empty_display_type = 'PLAIN_AXES'
        electric_root.parent = room_root
        crush_col.objects.link(electric_root)
    for c in list(electric_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
        
    arc1 = make_cylinder("Arc_Beam1", 0.035, 1.85, center=(0, -0.6, 0.95), rot=(0, math.radians(90), 0), mat=mat_electric_blue, ink=False, collection=crush_col)
    arc1.parent = electric_root
    arc2 = make_cylinder("Arc_Beam2", 0.025, 1.60, center=(0, -0.55, 1.35), rot=(math.radians(15), math.radians(90), 0), mat=mat_electric_blue, ink=False, collection=crush_col)
    arc2.parent = electric_root
    electric_root.hide_render = True
    electric_root.hide_viewport = True

    # Paladin Cube (Charred folded metal cube with Paladin crest)
    pal_cube = bpy.data.objects.get("Paladin_Cube")
    if not pal_cube:
        pal_cube = bpy.data.objects.new("Paladin_Cube", None)
        pal_cube.empty_display_type = 'PLAIN_AXES'
        crush_col.objects.link(pal_cube)
    pal_cube.parent = None
    for c in list(pal_cube.children):
        bpy.data.objects.remove(c, do_unlink=True)
        
    cube_box = make_box("Paladin_Cube_Body", 0.52, 0.52, 0.52, center=(0, 0, 0), mat=make_vinyl_mat("CharredArmor", "#30343a", "metal"), ink=True, collection=crush_col)
    cube_box.parent = pal_cube
    # Embedded crest & gold trim
    cube_crest = make_box("Paladin_Cube_Crest", 0.12, 0.36, 0.18, center=(0, -0.15, 0.28), mat=make_vinyl_mat("CubeGold", "#f2c14e", "gloss"), ink=True, collection=crush_col)
    cube_crest.parent = pal_cube
    cube_visor = make_box("Paladin_Cube_Visor", 0.32, 0.08, 0.08, center=(0, -0.27, 0.08), mat=make_vinyl_mat("CubeVisor", "#151515", "metal"), ink=True, collection=crush_col)
    cube_visor.parent = pal_cube
    pal_cube.location = Vector((1.15, -0.7, 0.26))
    pal_cube.hide_render = True
    pal_cube.hide_viewport = True

    # 5. Loot Pedestal
    pedestal_root = bpy.data.objects.get("Pedestal_Root")
    if not pedestal_root:
        pedestal_root = bpy.data.objects.new("Pedestal_Root", None)
        pedestal_root.empty_display_type = 'PLAIN_AXES'
        pedestal_root.parent = room_root
        crush_col.objects.link(pedestal_root)
    pedestal_root.location = (0.0, -1.1, 0.0)
    
    p_shaft = make_box("Pedestal_Shaft", 0.48, 0.48, 0.95, center=(0, 0, 0.475), mat=mat_pedestal, ink=True, collection=crush_col)
    p_shaft.parent = pedestal_root
    p_cap = make_box("Pedestal_Cap", 0.56, 0.56, 0.06, center=(0, 0, 0.98), mat=mat_gold, ink=True, collection=crush_col)
    p_cap.parent = pedestal_root
    p_cushion = make_box("Pedestal_Cushion", 0.42, 0.42, 0.08, center=(0, 0, 1.05), mat=mat_cushion, ink=True, collection=crush_col)
    p_cushion.parent = pedestal_root
    
    # 6. Gold Coin
    coin_root = bpy.data.objects.get("Coin_Root")
    if not coin_root:
        coin_root = bpy.data.objects.new("Coin_Root", None)
        coin_root.empty_display_type = 'PLAIN_AXES'
        coin_root.parent = room_root
        crush_col.objects.link(coin_root)
    coin_root.location = (0.0, -1.1, 1.15)
    coin_mesh = make_cylinder("Coin_Mesh", 0.16, 0.04, center=(0, 0, 0), rot=(math.pi/2, 0, 0), segments=28, mat=mat_coin, ink=True, collection=crush_col)
    coin_mesh.parent = coin_root
    
    # 7. Hydraulic Presses (Hidden during L1)
    for side, px in [(-1, -3.3), (1, 3.3)]:
        press_name = f"Hydraulic_Press_{'L' if side < 0 else 'R'}"
        press_root = bpy.data.objects.get(press_name)
        if not press_root:
            press_root = bpy.data.objects.new(press_name, None)
            press_root.empty_display_type = 'PLAIN_AXES'
            press_root.parent = room_root
            crush_col.objects.link(press_root)
        press_root.location = (px, -0.6, 2.75)
        p_body = make_cylinder(f"{press_name}_Cylinder", 0.42, 1.4, center=(0, 0, 0), rot=(0, math.pi/2, 0), mat=mat_press, ink=True, collection=crush_col)
        p_body.parent = press_root
        p_body.hide_render = True
        p_body.hide_viewport = True
        p_ram = make_cylinder(f"{press_name}_Ram", 0.28, 1.1, center=(-side * 0.7, 0, 0), rot=(0, math.pi/2, 0), mat=mat_press_piston, ink=True, collection=crush_col)
        p_ram.parent = press_root
        p_ram.hide_render = True
        p_ram.hide_viewport = True
        p_foot = make_box(f"{press_name}_Foot", 0.12, 0.85, 0.85, center=(-side * 1.25, 0, 0), mat=mat_hazard, ink=True, collection=crush_col)
        p_foot.parent = press_root
        p_foot.hide_render = True
        p_foot.hide_viewport = True
        
    # (Redundant Steel_Beam_Root removed; Beam_Root from Level 3 is used)
    
    # 10. Spell Orb (Arcane Energy Sphere)
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
        crush_col.objects.link(ash_root)
    ash_root.parent = None
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
    rails_root.hide_render = True
    rails_root.hide_viewport = True
    for c in rails_root.children:
        c.hide_render = True
        c.hide_viewport = True

    # 14. Pet Mimic (Mounted atop ceiling chute at x=0, y=-0.6, z=3.65, parented to room_root)
    mimic_root = bpy.data.objects.get("Mimic_Chest_Root")
    if not mimic_root:
        mimic_root = bpy.data.objects.new("Mimic_Chest_Root", None)
        mimic_root.empty_display_type = 'PLAIN_AXES'
        crush_col.objects.link(mimic_root)
    mimic_root.parent = room_root
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
        crush_col.objects.link(lid_pivot)
    lid_pivot.parent = mimic_root
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

# ---------------------------------------------------------------------------
# Chibi Character Rig & Generator (Normalized Scale)
# ---------------------------------------------------------------------------

RIG = {
    "hipY": 0.62,
    "hipX": 0.11,
    "thigh": 0.26,
    "shin": 0.25,
    "shoulderY": 1.04,
    "shoulderX": 0.27,
    "upperArm": 0.21,
    "forearm": 0.21,
    "headY": 1.39,
    "headR": 0.25,
    "height": 1.64,
}

CLASS_CONFIGS = {
    "goblin": {
        "scale": 0.82,
        "headR": 0.29,
        "skin": "#7fc456",
        "skinDark": "#5a9a3c",
        "tunic": "#a8834f",
        "pants": "#7fc456",
        "accent": "#9c6a44",
        "eyes": "#e08a12",
        "sclera": "#fff6c2",
    },
    "rogue": {
        "scale": 1.0,
        "headR": 0.25,
        "skin": "#eab88e",
        "skinDark": "#d09568",
        "tunic": "#3a7d6e",
        "pants": "#2e2b36",
        "accent": "#c8323a",
        "hood": "#2f6f62",
        "mask": "#2b3542",
        "eyes": "#2f9a7e",
        "sclera": "#fbf7ee",
    },
    "paladin": {
        "scale": 1.06,
        "headR": 0.25,
        "skin": "#e4ae86",
        "skinDark": "#c88e62",
        "tunic": "#c43a36",
        "pants": "#d9e1ec",
        "accent": "#f2c14e",
        "armor": "#d9e1ec",
        "cape": "#a8262e",
        "eyes": "#3a6fc4",
        "sclera": "#fbf7ee",
    },
    "mage": {
        "scale": 1.0,
        "headR": 0.25,
        "skin": "#eebb92",
        "skinDark": "#d29c6e",
        "tunic": "#4b4fd1",
        "pants": "#383ba8",
        "accent": "#f2c14e",
        "hat": "#383ba8",
        "beard": "#f1f2f6",
        "eyes": "#3aa6ff",
        "sclera": "#fbf7ee",
    },
}

def build_chibi_character(class_type, char_name, collection=None):
    cfg = CLASS_CONFIGS[class_type]
    head_r = cfg["headR"]
    
    char_col = bpy.data.collections.get(f"Char_{char_name}")
    if not char_col:
        char_col = bpy.data.collections.new(f"Char_{char_name}")
        parent_col = collection if collection else bpy.context.scene.collection
        parent_col.children.link(char_col)
        
    mat_skin = make_vinyl_mat(f"{class_type}_Skin", cfg["skin"], "skin")
    mat_skin_dark = make_vinyl_mat(f"{class_type}_SkinDark", cfg["skinDark"], "skin")
    mat_tunic = make_vinyl_mat(f"{class_type}_Tunic", cfg["tunic"], "cloth")
    mat_pants = make_vinyl_mat(f"{class_type}_Pants", cfg["pants"], "cloth")
    mat_accent = make_vinyl_mat(f"{class_type}_Accent", cfg["accent"], "metal" if class_type in ["goblin", "paladin"] else "cloth")
    mat_eyes = make_vinyl_mat(f"{class_type}_Eyes", cfg["eyes"], "gloss")
    mat_sclera = make_vinyl_mat(f"{class_type}_Sclera", cfg["sclera"], "gloss")
    mat_pupil = make_vinyl_mat("PupilBlack", "#111115", "gloss")
    mat_gold = make_vinyl_mat("TrimGold", "#f2c14e", "gold")
    mat_steel = make_vinyl_mat("ArmorSteel", "#d9e1ec", "metal")
    mat_leather = make_vinyl_mat("LeatherDark", "#5a3a24", "leather")
    
    # 1. Character Root (with uniform scale)
    root_obj = bpy.data.objects.get(f"{char_name}_Root")
    if not root_obj:
        root_obj = bpy.data.objects.new(f"{char_name}_Root", None)
        root_obj.empty_display_type = 'PLAIN_AXES'
        char_col.objects.link(root_obj)
    root_obj.scale = Vector((cfg["scale"], cfg["scale"], cfg["scale"]))
        
    # 2. Hips Empty
    hips_obj = bpy.data.objects.get(f"{char_name}_Hips")
    if not hips_obj:
        hips_obj = bpy.data.objects.new(f"{char_name}_Hips", None)
        hips_obj.empty_display_type = 'PLAIN_AXES'
        hips_obj.parent = root_obj
        char_col.objects.link(hips_obj)
    hips_obj.location = (0, 0, RIG["hipY"])
    
    # Pelvis & Torso (in normalized coordinates)
    pelvis = make_sphere(f"{char_name}_Pelvis", 0.18, center=(0, 0, 0), scale=(1.15, 0.85, 0.7), mat=mat_pants, ink=True, collection=char_col)
    pelvis.parent = hips_obj
    
    torso = make_capsule(f"{char_name}_Torso", 0.20, 0.48, center=(0, 0, 0.24), mat=mat_tunic, ink=True, collection=char_col)
    torso.parent = hips_obj
    
    # Class-specific Torso Gear
    if class_type == "goblin":
        kilt = make_cone(f"{char_name}_Kilt", 0.28, 0.26, center=(0, 0, -0.05), rot=(math.pi, 0, 0), scale=(1.0, 0.85, 1.0), mat=mat_tunic, ink=True, collection=char_col)
        kilt.parent = hips_obj
        belt = make_cylinder(f"{char_name}_Belt", 0.22, 0.06, center=(0, 0, 0.08), mat=mat_accent, ink=True, collection=char_col)
        belt.parent = hips_obj
    elif class_type == "rogue":
        scarf = make_cylinder(f"{char_name}_Scarf", 0.22, 0.12, center=(0, 0, 0.42), mat=mat_accent, ink=True, collection=char_col)
        scarf.parent = hips_obj
    elif class_type == "paladin":
        cuirass = make_box(f"{char_name}_Cuirass", 0.44, 0.32, 0.42, center=(0, 0, 0.24), mat=mat_steel, ink=True, collection=char_col)
        cuirass.parent = hips_obj
        tabard = make_box(f"{char_name}_Tabard", 0.32, 0.35, 0.52, center=(0, 0, 0.18), mat=mat_tunic, ink=True, collection=char_col)
        tabard.parent = hips_obj
        cape = make_box(f"{char_name}_Cape", 0.42, 0.04, 0.65, center=(0, -0.16, 0.12), mat=make_vinyl_mat("PaladinCape", cfg["cape"], "cloth"), ink=True, collection=char_col)
        cape.parent = hips_obj
    elif class_type == "mage":
        skirt = make_cone(f"{char_name}_Skirt", 0.36, 0.52, center=(0, 0, -0.18), rot=(math.pi, 0, 0), scale=(1.0, 0.85, 1.0), mat=mat_tunic, ink=True, collection=char_col)
        skirt.parent = hips_obj
        
    # 3. Head Empty (parented to Hips, offset from hips to headY)
    head_empty = bpy.data.objects.get(f"{char_name}_Head")
    if not head_empty:
        head_empty = bpy.data.objects.new(f"{char_name}_Head", None)
        head_empty.empty_display_type = 'PLAIN_AXES'
        head_empty.parent = hips_obj
        char_col.objects.link(head_empty)
    head_empty.location = (0, 0, RIG["headY"] - RIG["hipY"])
    
    # Head Sphere
    head_sphere = make_sphere(f"{char_name}_Head_Mesh", head_r, center=(0, 0, 0), mat=mat_skin, ink=True, collection=char_col)
    head_sphere.parent = head_empty
    
    # Chibi Eyes (looking forward along +Y)
    eye_offset_x = 0.11
    eye_offset_y = head_r * 0.88
    eye_offset_z = 0.04
    for side, sx in [(-1, -eye_offset_x), (1, eye_offset_x)]:
        sclera = make_sphere(f"{char_name}_Sclera_{'L' if side < 0 else 'R'}", 0.065, center=(sx, eye_offset_y, eye_offset_z), scale=(0.85, 0.45, 1.15), mat=mat_sclera, ink=False, collection=char_col)
        sclera.parent = head_empty
        iris = make_sphere(f"{char_name}_Iris_{'L' if side < 0 else 'R'}", 0.045, center=(sx, eye_offset_y + 0.02, eye_offset_z), scale=(0.85, 0.3, 1.0), mat=mat_eyes, ink=False, collection=char_col)
        iris.parent = head_empty
        pupil = make_sphere(f"{char_name}_Pupil_{'L' if side < 0 else 'R'}", 0.025, center=(sx, eye_offset_y + 0.03, eye_offset_z), scale=(0.85, 0.25, 0.85), mat=mat_pupil, ink=False, collection=char_col)
        pupil.parent = head_empty
        
    # Class-specific Head Gear
    if class_type == "goblin":
        for side, sx in [(-1, -head_r * 0.95), (1, head_r * 0.95)]:
            ear = make_cone(f"{char_name}_Ear_{'L' if side < 0 else 'R'}", 0.10, 0.38, center=(sx, -0.02, 0.04), rot=(0.15, -side * 1.15, -side * 0.35), scale=(1.0, 0.35, 1.0), mat=mat_skin, ink=True, collection=char_col)
            ear.parent = head_empty
        snout = make_cone(f"{char_name}_Snout", 0.07, 0.26, center=(0, head_r * 0.95, -0.04), rot=(math.pi/2 + 0.45, 0, 0), mat=mat_skin_dark, ink=True, collection=char_col)
        snout.parent = head_empty
        helm = make_sphere(f"{char_name}_Helm", head_r * 1.06, center=(0, -0.01, 0.07), scale=(1.0, 1.0, 0.95), mat=mat_accent, ink=True, collection=char_col)
        helm.parent = head_empty
        helm_rim = make_cylinder(f"{char_name}_HelmRim", head_r * 1.08, 0.05, center=(0, -0.01, 0.05), mat=make_vinyl_mat("HelmRim", "#7d5536", "metal"), ink=True, collection=char_col)
        helm_rim.parent = head_empty
    elif class_type == "rogue":
        mask = make_sphere(f"{char_name}_Mask", head_r + 0.01, center=(0, 0.02, -0.04), scale=(0.95, 1.0, 0.65), mat=make_vinyl_mat("RogueMask", cfg["mask"], "cloth"), ink=False, collection=char_col)
        mask.parent = head_empty
        hood = make_sphere(f"{char_name}_Hood", head_r + 0.04, center=(0, -0.02, 0.02), scale=(1.04, 1.04, 1.0), mat=make_vinyl_mat("RogueHood", cfg["hood"], "cloth"), ink=True, collection=char_col)
        hood.parent = head_empty
        hood_tail = make_cone(f"{char_name}_HoodTail", 0.12, 0.36, center=(0, -head_r * 1.1, 0.08), rot=(-1.2, 0, 0), mat=make_vinyl_mat("RogueHood", cfg["hood"], "cloth"), ink=True, collection=char_col)
        hood_tail.parent = head_empty
    elif class_type == "paladin":
        helm = make_sphere(f"{char_name}_Helm", head_r + 0.035, center=(0, -0.01, 0.04), mat=mat_steel, ink=True, collection=char_col)
        helm.parent = head_empty
        plume = make_box(f"{char_name}_Plume", 0.08, 0.28, 0.24, center=(0, -0.05, head_r + 0.12), mat=mat_tunic, ink=True, collection=char_col)
        plume.parent = head_empty
    elif class_type == "mage":
        beard = make_cone(f"{char_name}_Beard", 0.20, 0.44, center=(0, head_r * 0.8, -0.16), rot=(math.pi - 0.3, 0, 0), scale=(1.0, 0.55, 1.0), mat=make_vinyl_mat("MageBeard", cfg["beard"], "hair"), ink=True, collection=char_col)
        beard.parent = head_empty
        hat_brim = make_cylinder(f"{char_name}_HatBrim", 0.44, 0.04, center=(0, -0.01, 0.14), rot=(-0.1, 0, 0.05), mat=mat_tunic, ink=True, collection=char_col)
        hat_brim.parent = head_empty
        hat_crown = make_cone(f"{char_name}_HatCrown", 0.25, 0.60, center=(0.04, -0.08, 0.44), rot=(-0.35, 0.15, 0), mat=mat_tunic, ink=True, collection=char_col)
        hat_crown.parent = head_empty
        hat_star = make_sphere(f"{char_name}_HatStar", 0.045, center=(0.14, -0.22, 0.68), mat=make_glow_mat("HatStar", "#ffe27a", 4.0), ink=False, collection=char_col)
        hat_star.parent = head_empty
        
    # 4. Arms & Hands
    for side, sx in [(-1, -RIG["shoulderX"]), (1, RIG["shoulderX"])]:
        arm_name = f"{char_name}_Arm_{'L' if side < 0 else 'R'}"
        arm_empty = bpy.data.objects.get(arm_name)
        if not arm_empty:
            arm_empty = bpy.data.objects.new(arm_name, None)
            arm_empty.empty_display_type = 'PLAIN_AXES'
            arm_empty.parent = hips_obj
            char_col.objects.link(arm_empty)
        arm_empty.location = (sx, 0, RIG["shoulderY"] - RIG["hipY"])
        
        u_arm = make_capsule(f"{arm_name}_Upper", 0.075, RIG["upperArm"] * 1.2, center=(0, 0, -RIG["upperArm"] * 0.5), mat=mat_tunic, ink=True, collection=char_col)
        u_arm.parent = arm_empty
        
        elbow_name = f"{char_name}_Elbow_{'L' if side < 0 else 'R'}"
        elbow_empty = bpy.data.objects.get(elbow_name)
        if not elbow_empty:
            elbow_empty = bpy.data.objects.new(elbow_name, None)
            elbow_empty.empty_display_type = 'PLAIN_AXES'
            elbow_empty.parent = arm_empty
            char_col.objects.link(elbow_empty)
        elbow_empty.location = (0, 0, -RIG["upperArm"])
        
        f_arm = make_capsule(f"{arm_name}_Forearm", 0.065, RIG["forearm"] * 1.2, center=(0, 0, -RIG["forearm"] * 0.5), mat=mat_tunic if class_type == "mage" else mat_leather, ink=True, collection=char_col)
        f_arm.parent = elbow_empty
        
        hand = make_sphere(f"{arm_name}_Hand", 0.075, center=(0, 0, -RIG["forearm"]), mat=mat_skin, ink=True, collection=char_col)
        hand.parent = elbow_empty
        
        if class_type == "goblin" and side == 1:
            club = make_capsule(f"{char_name}_Club", 0.08, 0.65, center=(0, 0.15, -RIG["forearm"]), rot=(math.pi/2, 0, 0), mat=mat_leather, ink=True, collection=char_col)
            club.parent = elbow_empty
        elif class_type == "rogue":
            dag = make_box(f"{char_name}_Dagger_{'L' if side < 0 else 'R'}", 0.04, 0.42, 0.06, center=(0, 0.12, -RIG["forearm"]), mat=mat_steel, ink=True, collection=char_col)
            dag.parent = elbow_empty
        elif class_type == "paladin":
            if side == 1:
                sword = make_box(f"{char_name}_Sword", 0.06, 0.82, 0.04, center=(0, 0.35, -RIG["forearm"]), mat=mat_steel, ink=True, collection=char_col)
                sword.parent = elbow_empty
            else:
                shield = make_box(f"{char_name}_Shield", 0.12, 0.06, 0.75, center=(-0.14, 0.10, -RIG["forearm"] + 0.1), mat=mat_tunic, ink=True, collection=char_col)
                shield.parent = elbow_empty
        elif class_type == "mage" and side == 1:
            staff = make_cylinder(f"{char_name}_Staff", 0.04, 1.45, center=(0, 0.08, 0.15), mat=mat_leather, ink=True, collection=char_col)
            staff.parent = elbow_empty
            orb = make_sphere(f"{char_name}_StaffOrb", 0.09, center=(0, 0.08, 0.88), mat=make_glow_mat("StaffOrb", "#5fe8ff", 4.0), ink=False, collection=char_col)
            orb.parent = elbow_empty
            
    # 5. Legs & Feet
    for side, sx in [(-1, -RIG["hipX"]), (1, RIG["hipX"])]:
        leg_name = f"{char_name}_Leg_{'L' if side < 0 else 'R'}"
        leg_empty = bpy.data.objects.get(leg_name)
        if not leg_empty:
            leg_empty = bpy.data.objects.new(leg_name, None)
            leg_empty.empty_display_type = 'PLAIN_AXES'
            leg_empty.parent = hips_obj
            char_col.objects.link(leg_empty)
        leg_empty.location = (sx, 0, 0)
        
        thigh = make_capsule(f"{leg_name}_Thigh", 0.085, RIG["thigh"] * 1.2, center=(0, 0, -RIG["thigh"] * 0.5), mat=mat_pants, ink=True, collection=char_col)
        thigh.parent = leg_empty
        
        knee_name = f"{char_name}_Knee_{'L' if side < 0 else 'R'}"
        knee_empty = bpy.data.objects.get(knee_name)
        if not knee_empty:
            knee_empty = bpy.data.objects.new(knee_name, None)
            knee_empty.empty_display_type = 'PLAIN_AXES'
            knee_empty.parent = leg_empty
            char_col.objects.link(knee_empty)
        knee_empty.location = (0, 0, -RIG["thigh"])
        
        shin = make_capsule(f"{leg_name}_Shin", 0.075, RIG["shin"] * 1.2, center=(0, 0, -RIG["shin"] * 0.5), mat=mat_pants, ink=True, collection=char_col)
        shin.parent = knee_empty
        
        if class_type == "goblin":
            foot = make_sphere(f"{leg_name}_Foot", 0.095, center=(0, 0.06, -RIG["shin"]), scale=(0.85, 1.45, 0.55), mat=mat_skin_dark, ink=True, collection=char_col)
            foot.parent = knee_empty
        else:
            boot = make_box(f"{leg_name}_Boot", 0.16, 0.26, 0.12, center=(0, 0.04, -RIG["shin"]), mat=mat_steel if class_type == "paladin" else mat_leather, ink=True, collection=char_col)
            boot.parent = knee_empty
            
    print(f"Chibi character '{char_name}' ({class_type}) built successfully.")
    return root_obj

# ---------------------------------------------------------------------------
# Kinematic Pose Solver & Animation Keyframer
# ---------------------------------------------------------------------------

def solve_pose(pose_name, frame):
    f = float(frame)
    res = {
        "armL": [0.1, 0, 0.12],
        "armR": [0.1, 0, -0.12],
        "elbowL": [-0.25, 0, 0],
        "elbowR": [-0.25, 0, 0],
        "legL": [0, 0, 0.03],
        "legR": [0, 0, -0.03],
        "kneeL": [0.05, 0, 0],
        "kneeR": [0.05, 0, 0],
        "bob": 0.0,
        "lean": 0.0,
        "head": [0.0, 0.0, 0.0],
    }
    
    if pose_name == "walk":
        c = math.sin(f * 0.32)
        res["armL"] = [c * 0.65, 0, 0.14]
        res["armR"] = [-c * 0.65, 0, -0.14]
        res["elbowL"] = [-0.3 - max(0.0, -c) * 0.4, 0, 0]
        res["elbowR"] = [-0.3 - max(0.0, c) * 0.4, 0, 0]
        res["legL"] = [-c * 0.6, 0, 0.02]
        res["legR"] = [c * 0.6, 0, -0.02]
        res["kneeL"] = [max(0.0, -c) * 0.85 + 0.06, 0, 0]
        res["kneeR"] = [max(0.0, c) * 0.85 + 0.06, 0, 0]
        res["bob"] = abs(c) * 0.05
        res["lean"] = 0.06
        res["head"] = [-0.03 + abs(c) * 0.04, c * 0.04, 0]
    elif pose_name == "run":
        c = math.sin(f * 0.42)
        res["armL"] = [c * 1.05, 0, 0.2]
        res["armR"] = [-c * 1.05, 0, -0.2]
        res["elbowL"] = [-1.25, 0, 0]
        res["elbowR"] = [-1.25, 0, 0]
        res["legL"] = [-c * 0.95, 0, 0.02]
        res["legR"] = [c * 0.95, 0, -0.02]
        res["kneeL"] = [max(0.0, -c) * 1.4 + 0.2, 0, 0]
        res["kneeR"] = [max(0.0, c) * 1.4 + 0.2, 0, 0]
        res["bob"] = abs(c) * 0.09 - 0.02
        res["lean"] = 0.24
        res["head"] = [-0.12, c * 0.05, 0]
    elif pose_name == "cheer":
        c = math.sin(f * 0.45)
        res["armL"] = [-1.8 + c * 0.2, 0, 0.5]
        res["armR"] = [-1.8 - c * 0.2, 0, -0.5]
        res["elbowL"] = [-0.4, 0, 0]
        res["elbowR"] = [-0.4, 0, 0]
        res["head"] = [-0.15, 0, 0]
        res["bob"] = abs(c) * 0.04
    elif pose_name == "point":
        res["armL"] = [0.2, 0, 0.15]
        res["armR"] = [-1.3, 0, -0.2]
        res["elbowR"] = [-0.15, 0, 0]
        res["head"] = [0.05, 0.1, 0]
    elif pose_name == "cower":
        res["armL"] = [-1.4, 0, 0.6]
        res["armR"] = [-1.4, 0, -0.6]
        res["elbowL"] = [-1.8, 0, 0]
        res["elbowR"] = [-1.8, 0, 0]
        res["legL"] = [-0.4, 0, 0.05]
        res["legR"] = [-0.4, 0, -0.05]
        res["kneeL"] = [0.9, 0, 0]
        res["kneeR"] = [0.9, 0, 0]
        res["bob"] = -0.16
        res["lean"] = 0.35
        res["head"] = [0.35, 0, 0]
    elif pose_name == "jump":
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
        res["head"] = [0.4, 0, 0]
        
    return res

def apply_pose_to_char(char_name, pose_data):
    hips = bpy.data.objects.get(f"{char_name}_Hips")
    if hips:
        hips.location.z = RIG["hipY"] + pose_data["bob"]
        hips.rotation_euler.x = pose_data["lean"]
        
    head = bpy.data.objects.get(f"{char_name}_Head")
    if head:
        head.rotation_euler = Euler(pose_data["head"])
        
    for side_code, key in [("L", "armL"), ("R", "armR")]:
        arm = bpy.data.objects.get(f"{char_name}_Arm_{side_code}")
        if arm:
            arm.rotation_euler = Euler(pose_data[key])
            
    for side_code, key in [("L", "elbowL"), ("R", "elbowR")]:
        elbow = bpy.data.objects.get(f"{char_name}_Elbow_{side_code}")
        if elbow:
            elbow.rotation_euler = Euler(pose_data[key])
            
    for side_code, key in [("L", "legL"), ("R", "legR")]:
        leg = bpy.data.objects.get(f"{char_name}_Leg_{side_code}")
        if leg:
            leg.rotation_euler = Euler(pose_data[key])
            
    for side_code, key in [("L", "kneeL"), ("R", "kneeR")]:
        knee = bpy.data.objects.get(f"{char_name}_Knee_{side_code}")
        if knee:
            knee.rotation_euler = Euler(pose_data[key])

def ease_in_cubic(t):
    return t * t * t

def ease_out_cubic(t):
    t -= 1.0
    return t * t * t + 1.0

def ease_out_back(t, s=1.70158):
    t -= 1.0
    return t * t * ((s + 1.0) * t + s) + 1.0

def ease_in_out(t):
    return 0.5 * (1.0 - math.cos(math.pi * t))

def ease_out_bounce(t):
    n1 = 7.5625
    d1 = 2.75
    if t < 1 / d1:
        return n1 * t * t
    elif t < 2 / d1:
        t -= 1.5 / d1
        return n1 * t * t + 0.75
    elif t < 2.5 / d1:
        t -= 2.25 / d1
        return n1 * t * t + 0.9375
    else:
        t -= 2.625 / d1
        return n1 * t * t + 0.984375

def clamp(v, min_v, max_v):
    return max(min_v, min(max_v, v))

def prog(f, a, b):
    return clamp((f - a) / float(b - a), 0.0, 1.0)

def lerp(v0, v1, t):
    return v0 + (v1 - v0) * t

def get_all_descendants(obj):
    res = []
    if not obj:
        return res
    for c in obj.children:
        res.append(c)
        res.extend(get_all_descendants(c))
    return res

def get_action_fcurves(action):
    if not action:
        return []
    if hasattr(action, "fcurves"):
        return list(action.fcurves)
    fcurves = []
    if hasattr(action, "layers"):
        for layer in action.layers:
            for strip in layer.strips:
                if hasattr(strip, "channelbags"):
                    for cb in strip.channelbags:
                        if hasattr(cb, "fcurves"):
                            fcurves.extend(list(cb.fcurves))
                elif hasattr(strip, "fcurves"):
                    fcurves.extend(list(strip.fcurves))
    return fcurves

def set_hierarchy_visibility(root_obj, intervals, end_frame=3109):
    if not root_obj:
        return
    objs = [root_obj] + get_all_descendants(root_obj)
    sorted_inv = sorted(intervals, key=lambda x: x[0])
    transitions = []
    curr = 0
    for s, e in sorted_inv:
        if s > curr:
            transitions.append((curr, True))
        transitions.append((s, False))
        transitions.append((e, True))
        curr = e
    if curr <= end_frame:
        transitions.append((curr, True))
        
    for o in objs:
        for f, h in transitions:
            o.hide_render = h
            o.hide_viewport = h
            o.keyframe_insert(data_path="hide_render", frame=f)
            o.keyframe_insert(data_path="hide_viewport", frame=f)
        if o.animation_data and o.animation_data.action:
            for fcu in get_action_fcurves(o.animation_data.action):
                if fcu.data_path in ("hide_render", "hide_viewport"):
                    for kf in fcu.keyframe_points:
                        kf.interpolation = 'CONSTANT'

# ---------------------------------------------------------------------------
# Camera-Parented Broadcast HUD Elements (Title, Stage Badges, End Stamp)
# ---------------------------------------------------------------------------

def make_hud_text(name, body, size, location, color_hex="#ffffff", align_x='CENTER', align_y='CENTER', parent=None, collection=None):
    old_obj = bpy.data.objects.get(name)
    if old_obj:
        bpy.data.objects.remove(old_obj, do_unlink=True)
    old_curve = bpy.data.curves.get(name + "_Curve")
    if old_curve:
        bpy.data.curves.remove(old_curve)
        
    curve = bpy.data.curves.new(type="FONT", name=name + "_Curve")
    curve.body = body
    curve.align_x = align_x
    curve.align_y = align_y
    curve.size = size
    
    obj = bpy.data.objects.new(name, curve)
    col = collection or bpy.context.collection or bpy.context.scene.collection
    col.objects.link(obj)
    
    mat_name = f"HUD_TextMat_{name}"
    mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs['Color'].default_value = hex_to_rgba(color_hex)
    emit.inputs['Strength'].default_value = 1.0
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    obj.data.materials.append(mat)
    
    obj.visible_shadow = False
    obj.visible_diffuse = False
    obj.visible_glossy = False
    
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = Matrix.Identity(4)
        
    obj.location = location
    obj.scale = (1.0, 1.0, 1.0)
    return obj

def make_hud_plate(name, sx, sy, sz, location, color_hex="#14151a", parent=None, collection=None):
    old_obj = bpy.data.objects.get(name)
    if old_obj:
        bpy.data.objects.remove(old_obj, do_unlink=True)
        
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    
    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.polygons.foreach_set('use_smooth', [False] * len(mesh.polygons))
    
    obj = bpy.data.objects.new(name, mesh)
    col = collection or bpy.context.collection or bpy.context.scene.collection
    col.objects.link(obj)
    
    mat_name = f"HUD_PlateMat_{name}"
    mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs['Color'].default_value = hex_to_rgba(color_hex)
    emit.inputs['Strength'].default_value = 0.9
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    obj.data.materials.append(mat)
    
    obj.visible_shadow = False
    obj.visible_diffuse = False
    obj.visible_glossy = False
    
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = Matrix.Identity(4)
        
    obj.location = location
    return obj

def build_hud_elements(cam_obj):
    hud_col = bpy.data.collections.get("HUD")
    if not hud_col:
        hud_col = bpy.data.collections.new("HUD")
        bpy.context.scene.collection.children.link(hud_col)
        
    # 1. Title Card Root (frames 0 to 82)
    title_root = bpy.data.objects.get("HUD_Title_Root")
    if not title_root:
        title_root = bpy.data.objects.new("HUD_Title_Root", None)
        title_root.empty_display_type = 'PLAIN_AXES'
        hud_col.objects.link(title_root)
    title_root.parent = cam_obj
    title_root.matrix_parent_inverse = Matrix.Identity(4)
    title_root.location = (0.0, 0.0, 0.0)
    for c in list(title_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
        
    make_hud_plate("HUD_Title_Plate", 0.78, 0.16, 0.005, location=(0.0, 0.67, -2.01), color_hex="#121318", parent=title_root, collection=hud_col)
    make_hud_plate("HUD_Title_Bar", 0.78, 0.008, 0.006, location=(0.0, 0.75, -2.00), color_hex="#e5a824", parent=title_root, collection=hud_col)
    make_hud_text("HUD_Title_Kicker", "EVOLUTION OF A", size=0.024, location=(0.0, 0.71, -1.98), color_hex="#e5a824", parent=title_root, collection=hud_col)
    make_hud_text("HUD_Title_Main", "CRUSHING WALLS", size=0.046, location=(0.0, 0.63, -1.98), color_hex="#ffffff", parent=title_root, collection=hud_col)

    # 2. Stage Badges 1 to 5
    stages_info = [
        {"name": "STAGE 1: SLIDING STONE WALLS", "color": "#d9a066"},
        {"name": "STAGE 2: GREASE + SPRING BOOT", "color": "#9bd35a"},
        {"name": "STAGE 3: ELECTRIC PRESS", "color": "#5fd0ff"},
        {"name": "STAGE 4: ARCANE MIRROR PONG", "color": "#c27bff"},
        {"name": "STAGE 5: LUNGING RAIL ROOM", "color": "#ff6a4d"},
    ]
    for i, s in enumerate(stages_info):
        st_root = bpy.data.objects.get(f"HUD_Stage_{i+1}_Root")
        if not st_root:
            st_root = bpy.data.objects.new(f"HUD_Stage_{i+1}_Root", None)
            st_root.empty_display_type = 'PLAIN_AXES'
            hud_col.objects.link(st_root)
        st_root.parent = cam_obj
        st_root.matrix_parent_inverse = Matrix.Identity(4)
        st_root.location = (0.0, 0.0, 0.0)
        for c in list(st_root.children):
            bpy.data.objects.remove(c, do_unlink=True)
            
        make_hud_plate(f"HUD_Stage_{i+1}_Plate", 0.74, 0.088, 0.005, location=(0.0, 0.68, -2.01), color_hex="#121318", parent=st_root, collection=hud_col)
        make_hud_plate(f"HUD_Stage_{i+1}_Accent", 0.74, 0.006, 0.006, location=(0.0, 0.724, -2.00), color_hex=s["color"], parent=st_root, collection=hud_col)
        make_hud_text(f"HUD_Stage_{i+1}_Text", s["name"], size=0.035, location=(0.0, 0.68, -1.98), color_hex=s["color"], parent=st_root, collection=hud_col)

    # 3. End Stamp Root (frames 2939 to 3109)
    stamp_root = bpy.data.objects.get("HUD_Stamp_Root")
    if not stamp_root:
        stamp_root = bpy.data.objects.new("HUD_Stamp_Root", None)
        stamp_root.empty_display_type = 'PLAIN_AXES'
        hud_col.objects.link(stamp_root)
    stamp_root.parent = cam_obj
    stamp_root.matrix_parent_inverse = Matrix.Identity(4)
    stamp_root.location = (0.0, 0.0, 0.0)
    for c in list(stamp_root.children):
        bpy.data.objects.remove(c, do_unlink=True)
        
    make_hud_text("HUD_Stamp_Subtitle", "DUNGEON STATUS", size=0.032, location=(0.0, 0.44, -1.98), color_hex="#a1a1aa", parent=stamp_root, collection=hud_col)
    
    # Stamp box (angled stamp border and text)
    stamp_box = bpy.data.objects.get("HUD_Stamp_Box")
    if not stamp_box:
        stamp_box = bpy.data.objects.new("HUD_Stamp_Box", None)
        stamp_box.empty_display_type = 'PLAIN_AXES'
        hud_col.objects.link(stamp_box)
    stamp_box.parent = stamp_root
    stamp_box.matrix_parent_inverse = Matrix.Identity(4)
    stamp_box.location = (0.0, 0.28, 0.0)
    stamp_box.rotation_euler = (0.0, 0.0, math.radians(-7.0))
    for c in list(stamp_box.children):
        bpy.data.objects.remove(c, do_unlink=True)
        
    make_hud_plate("HUD_Stamp_BTop", 0.72, 0.015, 0.005, location=(0.0, 0.10, -2.00), color_hex="#e11d48", parent=stamp_box, collection=hud_col)
    make_hud_plate("HUD_Stamp_BBot", 0.72, 0.015, 0.005, location=(0.0, -0.10, -2.00), color_hex="#e11d48", parent=stamp_box, collection=hud_col)
    make_hud_plate("HUD_Stamp_BLeft", 0.015, 0.215, 0.005, location=(-0.36, 0.0, -2.00), color_hex="#e11d48", parent=stamp_box, collection=hud_col)
    make_hud_plate("HUD_Stamp_BRight", 0.015, 0.215, 0.005, location=(0.36, 0.0, -2.00), color_hex="#e11d48", parent=stamp_box, collection=hud_col)
    make_hud_plate("HUD_Stamp_BFill", 0.705, 0.185, 0.004, location=(0.0, 0.0, -2.01), color_hex="#18080a", parent=stamp_box, collection=hud_col)
    make_hud_text("HUD_Stamp_Text", "UNBEATABLE", size=0.072, location=(0.0, 0.0, -1.98), color_hex="#ef4444", parent=stamp_box, collection=hud_col)

def setup_camera_animation():
    cam_obj = bpy.data.objects.get("Camera")
    if not cam_obj:
        return
        
    cam_obj.animation_data_clear()
    
    waypoints = [
        # Level 1
        (0,    0.0, 2.0, 14.5, 1.0),
        (101,  0.0, 1.5, 10.0, 0.0),
        (141, -0.8, 1.5,  9.5, 0.0),
        (198,  0.0, 1.35, 8.2, 0.0),
        (234,  0.0, 1.25, 7.4, 0.0),
        (257,  0.0, 1.15, 6.6, 0.0),
        (291,  0.0, 1.0,  6.4, 0.0),
        # Level 2
        (360, -0.8, 1.5,  9.5, 0.0),
        (381,  0.0, 1.85, 10.5, 0.0),
        (453,  0.0, 2.3, 10.5, 0.0),
        (486,  0.4, 3.6, 10.0, 0.0),
        (515,  0.4, 3.4, 10.0, 0.0),
        (529,  0.0, 1.6,  9.0, 0.0),
        (621,  0.0, 3.3,  9.0, 0.0),
        (651,  0.0, 2.2,  9.0, 0.0),
        (705, -0.8, 1.5,  9.5, 0.0),
        (721,  0.0, 1.85, 10.5, 0.0),
        (790,  0.0, 2.0, 10.0, 0.0),
        (800,  0.0, 1.4,  9.0, 0.0),
        (829,  0.0, 1.15, 6.8, 0.0),
        (869,  0.0, 1.15, 6.8, 0.0),
        # Level 3
        (873,  -0.8, 1.5,  9.5, 0.0),
        (915,   0.0, 1.6,  9.5, 0.0),
        (990,   0.0, 1.45, 8.5, 0.0),
        (1053,  0.0, 1.35, 7.8, 0.0),
        (1143,  0.0, 1.25, 7.2, 0.0),
        (1218,  0.0, 1.85, 11.0, 0.0),
        (1296,  0.0, 1.75, 10.5, 0.0),
        (1356,  0.0, 1.60, 9.5, 0.0),
        (1437,  0.0, 1.40, 8.5, 0.0),
        (1539,  0.0, 1.35, 8.0, 0.0),
        (1602,  0.0, 1.20, 7.2, 0.0),
        (1656,  0.0, 1.15, 7.2, 0.0),
        (1705,  0.0, 1.15, 7.5, 0.0),
        # Level 4: Mage Teleport & Arcane Pong
        (1706, -0.8, 1.5,  9.5, 0.0),
        (1781,  0.0, 1.45, 8.5, 0.0),
        (1838, -2.2, 1.4,  8.5, 0.0),
        (1879,  0.0, 1.6, 10.2, 0.0),
        (1957,  0.0, 1.6,  9.5, 0.0),
        (2007,  0.0, 1.45, 8.5, 0.0),
        (2037,  0.0, 1.4,  8.0, 0.0),
        (2091,  0.0, 1.35, 7.5, 0.0),
        (2172,  0.0, 1.25, 6.8, 0.0),
        (2250,  0.0, 1.15, 6.5, 0.0),
        (2298,  0.0, 1.15, 6.5, 0.0),
        (2316,  0.0, 1.15, 7.5, 0.0),
        (2345,  0.0, 1.25, 7.8, 0.0), # Hold 4-corpse center composition
        # Level 5: Paranoid Party & Room Lunge
        (2346, -5.2, 1.45, 9.5, 0.0), # Hard cut to party outside doorway
        (2454, -5.0, 1.35, 8.8, 0.0),
        (2526, -3.2, 1.6, 11.5, 0.0), # Show high-speed rails under room
        (2637, -4.5, 1.35, 8.8, 0.0),
        (2685, -4.0, 1.30, 8.2, 0.0), # Stick touches tile!
        (2709, -3.5, 1.5, 11.0, 0.0), # Room lunges forward
        (2760, -5.8, 1.6,  9.5, 0.0), # Room swallows party
        (2826, -5.8, 2.6, 11.0, 0.0), # Chimney launch
        (2907, -5.8, 3.4,  9.5, 0.0), # Chomped into Mimic
        (2939,  0.0, 1.6, 14.5, 1.0), # Finale hero establishing shot
        (3109,  0.0, 1.6, 14.5, 1.0),
    ]
    
    for f, wx, wy, dist, rise in waypoints:
        cam_x = wx
        cam_y = -0.6 + dist
        cam_z = wy + rise
        
        target = Vector((wx, -0.6, wy))
        loc = Vector((cam_x, cam_y, cam_z))
        direction = target - loc
        quat = direction.to_track_quat('-Z', 'Y')
        
        cam_obj.location = loc
        cam_obj.rotation_mode = 'QUATERNION'
        cam_obj.rotation_quaternion = quat
        
        cam_obj.keyframe_insert(data_path="location", frame=f)
        cam_obj.keyframe_insert(data_path="rotation_quaternion", frame=f)


def animate_scene_levels():
    print("Animating Episode 3: Complete 5-Level Sequence (0 -> 3109)...")
    
    wall_l = bpy.data.objects.get("Wall_L_Root")
    wall_r = bpy.data.objects.get("Wall_R_Root")
    gate_l = bpy.data.objects.get("Wall_L_DropGate")
    pedestal = bpy.data.objects.get("Pedestal_Root")
    coin = bpy.data.objects.get("Coin_Root")
    goblin = bpy.data.objects.get("Goblin_Root")
    rogue1 = bpy.data.objects.get("Rogue1_Root")
    rogue2 = bpy.data.objects.get("Rogue2_Root")
    plates_l = bpy.data.objects.get("Wall_L_Plates")
    plates_r = bpy.data.objects.get("Wall_R_Plates")
    chimney = bpy.data.objects.get("Ceiling_Chimney")
    boot = bpy.data.objects.get("Ceiling_SpringBoot")
    paladin1 = bpy.data.objects.get("Paladin1_Root")
    beam = bpy.data.objects.get("Beam_Root")
    press_l = bpy.data.objects.get("HydraulicPress_L")
    press_r = bpy.data.objects.get("HydraulicPress_R")
    electric_arcs = bpy.data.objects.get("Electric_Arcs")
    pal_cube = bpy.data.objects.get("Paladin_Cube")
    
    mage1 = bpy.data.objects.get("Mage1_Root")
    mage2 = bpy.data.objects.get("Mage2_Root")
    mirror_l = bpy.data.objects.get("Arcane_Mirror_L")
    mirror_r = bpy.data.objects.get("Arcane_Mirror_R")
    spell_orb = bpy.data.objects.get("Spell_Orb_Root")
    mage_ash = bpy.data.objects.get("Mage_AshPile_Root")
    
    room_root = bpy.data.objects.get("CrushRoom_Root")
    goblin2 = bpy.data.objects.get("Goblin2_Root")
    rogue3 = bpy.data.objects.get("Rogue3_Root")
    mage3 = bpy.data.objects.get("Mage3_Root")
    pole = bpy.data.objects.get("TenFootPole")
    mimic = bpy.data.objects.get("Mimic_Chest_Root")
    mimic_lid = bpy.data.objects.get("Mimic_Lid_Pivot")
    mimic_tongue = bpy.data.objects.get("Mimic_Tongue")
    rails_root = bpy.data.objects.get("HighSpeed_Rails_Root")
    
    hud_title = bpy.data.objects.get("HUD_Title_Root")
    hud_stage1 = bpy.data.objects.get("HUD_Stage_1_Root")
    hud_stage2 = bpy.data.objects.get("HUD_Stage_2_Root")
    hud_stage3 = bpy.data.objects.get("HUD_Stage_3_Root")
    hud_stage4 = bpy.data.objects.get("HUD_Stage_4_Root")
    hud_stage5 = bpy.data.objects.get("HUD_Stage_5_Root")
    hud_stamp = bpy.data.objects.get("HUD_Stamp_Root")
    stamp_box = bpy.data.objects.get("HUD_Stamp_Box")
    
    animated_objs = [
        wall_l, wall_r, gate_l, pedestal, coin, goblin, rogue1, rogue2,
        plates_l, plates_r, chimney, boot, paladin1, beam, press_l, press_r,
        electric_arcs, pal_cube, mage1, mage2, mirror_l, mirror_r,
        spell_orb, mage_ash, room_root, goblin2, rogue3, mage3, pole,
        mimic, mimic_lid, mimic_tongue, rails_root,
        hud_title, hud_stage1, hud_stage2, hud_stage3, hud_stage4, hud_stage5,
        hud_stamp, stamp_box
    ]
    for obj in animated_objs:
        if obj:
            obj.animation_data_clear()

    # Pre-keyframe recursive hierarchy visibility for all characters and props cleanly and efficiently
    set_hierarchy_visibility(goblin, [(131, 3110)])
    set_hierarchy_visibility(rogue1, [(310, 515)])
    set_hierarchy_visibility(rogue2, [(665, 3110)])
    set_hierarchy_visibility(paladin1, [(873, 1623)])
    set_hierarchy_visibility(pal_cube, [(1623, 3110)])
    set_hierarchy_visibility(beam, [(990, 1623)])
    set_hierarchy_visibility(press_l, [(1218, 1705)])
    set_hierarchy_visibility(press_r, [(1218, 1705)])
    set_hierarchy_visibility(electric_arcs, [(1488, 1593)])
    set_hierarchy_visibility(mage1, [(1706, 1838), (1855, 1870)])
    set_hierarchy_visibility(mirror_l, [(1915, 3110)])
    set_hierarchy_visibility(mirror_r, [(1915, 3110)])
    set_hierarchy_visibility(mage2, [(1996, 2298)])
    set_hierarchy_visibility(spell_orb, [(2070, 2306)])
    set_hierarchy_visibility(mage_ash, [(2316, 3110)])
    set_hierarchy_visibility(goblin2, [(2346, 2865)])
    set_hierarchy_visibility(rogue3, [(2346, 2880)])
    set_hierarchy_visibility(mage3, [(2346, 2900)])
    set_hierarchy_visibility(pole, [(2346, 2709)])
    set_hierarchy_visibility(mimic, [(2529, 3110)])
    set_hierarchy_visibility(boot, [(651, 3110)])
    set_hierarchy_visibility(plates_l, [(529, 3110)])
    set_hierarchy_visibility(plates_r, [(529, 3110)])
    set_hierarchy_visibility(chimney, [(621, 3110)])
    set_hierarchy_visibility(rails_root, [(2526, 3110)])
    
    # Broadcast HUD visibility intervals
    set_hierarchy_visibility(hud_title, [(0, 82)])
    set_hierarchy_visibility(hud_stage1, [(84, 513)])
    set_hierarchy_visibility(hud_stage2, [(514, 1190)])
    set_hierarchy_visibility(hud_stage3, [(1191, 1878)])
    set_hierarchy_visibility(hud_stage4, [(1879, 2525)])
    set_hierarchy_visibility(hud_stage5, [(2526, 2938)])
    set_hierarchy_visibility(hud_stamp, [(2939, 3109)])
            
    cfg_gob = CLASS_CONFIGS["goblin"]
    cfg_rog = CLASS_CONFIGS["rogue"]
    cfg_pal = CLASS_CONFIGS["paladin"]
    cfg_mag = CLASS_CONFIGS["mage"]
    gob_scale = cfg_gob["scale"]
    rog_scale = cfg_rog["scale"]
    pal_scale = cfg_pal["scale"]
    mag_scale = cfg_mag["scale"]
    
    for f in range(0, 3110):
        # ---------------------------------------------------------
        # 0. CrushRoom_Root (Stationary during L1-L4, lunges on rails in L5)
        # ---------------------------------------------------------
        if room_root:
            if f < 2709:
                rx = 0.0
            elif f < 2760: # Lunges along rails from 0.0 to -6.5
                t = prog(f, 2709, 2760)
                rx = lerp(0.0, -6.5, ease_in_cubic(t))
            elif f < 2915: # Holds at -6.5 engulfing party and launching them
                rx = -6.5
            elif f < 2939: # Rolls smoothly back along rails to 0.0
                t = prog(f, 2915, 2939)
                rx = lerp(-6.5, 0.0, ease_in_out(t))
            else: # Centered for hero establishing shot!
                rx = 0.0
            room_root.location.x = rx
            room_root.keyframe_insert(data_path="location", index=0, frame=f)

        # ---------------------------------------------------------
        # 1. Sliding Walls inner position
        # ---------------------------------------------------------
        if f < 51:
            inner = 6.6
        elif f < 95:
            t = prog(f, 51, 95)
            inner = lerp(6.6, 1.8, ease_out_back(t))
        elif f < 228:
            inner = 1.8
        elif f < 255:
            t = prog(f, 228, 255)
            inner = lerp(1.8, 0.06, ease_in_cubic(t))
        elif f < 275:
            inner = 0.06
        elif f < 289:
            t = prog(f, 275, 289)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        elif f < 362:
            inner = 1.8
        # --- Level 2 Walls ---
        elif f < 453: # Parkour jumps between walls
            t = prog(f, 381, 453)
            inner = lerp(1.8, 0.72, ease_in_out(t))
        elif f < 523: # Crushes shut in Level 2 escape
            t = prog(f, 453, 523)
            inner = lerp(0.72, 0.06, ease_in_cubic(t))
        elif f < 537: # Reopen for plates install
            t = prog(f, 523, 537)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        elif f < 707:
            inner = 1.8
        elif f < 829: # Closing on Rogue 2
            t = prog(f, 707, 829)
            inner = lerp(1.8, 1.0, ease_in_out(t))
        elif f < 835: # Walls slam shut on Rogue 2
            t = prog(f, 829, 835)
            inner = lerp(1.0, 0.06, ease_in_cubic(t))
        elif f < 849:
            inner = 0.06
        elif f < 863: # Reopen revealing Rogue 2 pancake
            t = prog(f, 849, 863)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        # --- Level 3 Walls ---
        elif f < 978:
            inner = 1.8
        elif f < 1017: # Closes toward wedged steel beam
            t = prog(f, 978, 1017)
            inner = lerp(1.8, 1.25, ease_in_out(t))
        elif f < 1437: # Locked against beam!
            inner = 1.25
        elif f < 1488: # Circuit completes, pressing firmly
            t = prog(f, 1437, 1488)
            inner = lerp(1.25, 1.20, ease_in_out(t))
        elif f < 1593: # Circuit active, locked
            inner = 1.20
        elif f < 1623: # 500-ton hydraulic press crushes through beam!
            t = prog(f, 1593, 1623)
            inner = lerp(1.20, 0.28, ease_in_cubic(t))
        elif f < 1677: # Holds cube
            inner = 0.28
        elif f < 1705: # Reopens for Level 4
            t = prog(f, 1677, 1705)
            inner = lerp(0.28, 1.8, ease_in_out(t))
        # --- Level 4 Walls: Pong Sequence ---
        elif f < 2091: # Mirrors install & Mage 2 entry
            inner = 1.8
        elif f < 2298: # High-speed Pong: walls close steadily down to 0.06
            t = prog(f, 2091, 2298)
            inner = lerp(1.8, 0.06, t)
        elif f < 2310: # Slammed shut on orb implosion
            inner = 0.06
        elif f < 2330: # Reopens revealing ash pile in Lane 4
            t = prog(f, 2310, 2330)
            inner = lerp(0.06, 1.8, ease_in_out(t))
        else: # Stays open for Level 5
            inner = 1.8
            
        if wall_l:
            wall_l.location.x = -inner
            wall_l.keyframe_insert(data_path="location", index=0, frame=f)
        if wall_r:
            wall_r.location.x = inner
            wall_r.keyframe_insert(data_path="location", index=0, frame=f)

        # Front Drop Gate
        if gate_l:
            if f < 2709:
                gz = 1.2
            elif f < 2730: # Opens high as room lunges
                t = prog(f, 2709, 2730)
                gz = lerp(1.2, 2.8, ease_out_back(t))
            elif f < 2778:
                gz = 2.8
            elif f < 2795: # Slams shut trapping party
                t = prog(f, 2778, 2795)
                gz = lerp(2.8, 0.0, ease_in_cubic(t))
            else:
                gz = 0.0
            gate_l.location.z = gz
            gate_l.keyframe_insert(data_path="location", index=2, frame=f)

        # ---------------------------------------------------------
        # 2. Trap Props (Plates, Chimney, SpringBoot)
        # ---------------------------------------------------------
        # Plates
        if plates_l and plates_r:
            if f < 529:
                plates_l.hide_render = True
                plates_l.hide_viewport = True
                plates_r.hide_render = True
                plates_r.hide_viewport = True
                plates_l.location.z = 6.0
                plates_r.location.z = 6.0
            elif f < 598:
                t = prog(f, 529, 598)
                plates_l.hide_render = False
                plates_l.hide_viewport = False
                plates_r.hide_render = False
                plates_r.hide_viewport = False
                plates_l.location.z = lerp(6.0, 0.0, ease_out_back(t))
                plates_r.location.z = lerp(6.0, 0.0, ease_out_back(t))
            else:
                plates_l.hide_render = False
                plates_l.hide_viewport = False
                plates_r.hide_render = False
                plates_r.hide_viewport = False
                plates_l.location.z = 0.0
                plates_r.location.z = 0.0
            plates_l.keyframe_insert(data_path="location", index=2, frame=f)
            plates_r.keyframe_insert(data_path="location", index=2, frame=f)
            plates_l.keyframe_insert(data_path="hide_render", frame=f)
            plates_r.keyframe_insert(data_path="hide_render", frame=f)

        # Chimney
        if chimney:
            if f < 621:
                chimney.hide_render = True
                chimney.hide_viewport = True
                chimney.location.z = 6.0
            elif f < 651:
                t = prog(f, 621, 651)
                chimney.hide_render = False
                chimney.hide_viewport = False
                chimney.location.z = lerp(6.0, 2.9, ease_out_back(t))
            else:
                chimney.hide_render = False
                chimney.hide_viewport = False
                chimney.location.z = 2.9
            chimney.keyframe_insert(data_path="location", index=2, frame=f)
            chimney.keyframe_insert(data_path="hide_render", frame=f)
            
        # SpringBoot
        if boot:
            if f < 651:
                boot.hide_render = True
                boot.hide_viewport = True
                boot_z = 3.75
            elif f < 660: # Demo extension
                t = prog(f, 651, 660)
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = lerp(3.75, 2.45, ease_out_bounce(t))
            elif f < 685: # Retracts back into chimney
                t = prog(f, 660, 685)
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = lerp(2.45, 3.75, ease_in_out(t))
            elif f < 791: # Armed in chimney
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = 3.75
            elif f < 794: # Punts Rogue 2 downward!
                t = prog(f, 791, 794)
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = lerp(3.75, 1.25, ease_in_cubic(t))
            elif f < 815: # Retracts
                t = prog(f, 794, 815)
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = lerp(1.25, 3.75, ease_in_out(t))
            else:
                boot.hide_render = False
                boot.hide_viewport = False
                boot_z = 3.75
            boot.location.z = boot_z
            boot.keyframe_insert(data_path="location", index=2, frame=f)
            boot.keyframe_insert(data_path="hide_render", frame=f)
            for child in boot.children:
                child.hide_render = boot.hide_render
                child.hide_viewport = boot.hide_viewport
                child.keyframe_insert(data_path="hide_render", frame=f)

        # ---------------------------------------------------------
        # 3. Pedestal
        # ---------------------------------------------------------
        if pedestal:
            if f < 101:
                ped_z = -1.5
            elif f < 171:
                t = prog(f, 101, 171)
                ped_z = lerp(-1.5, 0.0, ease_out_back(t))
            elif f < 255:
                ped_z = 0.0
            elif f < 275:
                t = prog(f, 255, 275)
                ped_z = lerp(0.0, -1.5, ease_in_cubic(t))
            else:
                ped_z = 0.0
            pedestal.location.z = ped_z
            pedestal.keyframe_insert(data_path="location", index=2, frame=f)

        # ---------------------------------------------------------
        # 4. Goblin 1 (L1 victim -> Permanent pancake in Lane 1)
        # ---------------------------------------------------------
        if goblin:
            if f < 131:
                goblin.hide_render = True
                goblin.hide_viewport = True
                gob_x, gob_y, gob_z = -10.2, -0.6, 0.0
                yaw = math.radians(90)
                pose = "run"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 198:
                goblin.hide_render = False
                goblin.hide_viewport = False
                t = prog(f, 131, 198)
                gob_x = lerp(-10.2, -0.5, t)
                gob_y, gob_z = -0.6, 0.0
                yaw = math.radians(90)
                pose = "run"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 228:
                gob_x, gob_y, gob_z = -0.5, -0.6, 0.0
                yaw = math.radians(60) if f < 212 else 0.0
                pose = "cheer" if f < 212 else "point"
                sx, sy, sz = gob_scale, gob_scale, gob_scale
            elif f < 255:
                gob_x, gob_y, gob_z = 0.0, -0.6, 0.0
                yaw = 0.0
                pose = "cower"
                squeeze = clamp(inner / (0.36 * gob_scale), 0.12, 1.0)
                sx = gob_scale * squeeze
                sy = gob_scale
                sz = gob_scale * lerp(1.0, 1.35, 1.0 - squeeze)
            elif f < 289:
                gob_x, gob_y, gob_z = 0.0, -0.6, 0.0
                yaw = 0.0
                pose = "cower"
                sx = gob_scale * 0.12
                sy = gob_scale
                sz = gob_scale * 1.35
            else: # Stays dead flat in pancake lane 1!
                fall = ease_in_out(prog(f, 299, 306))
                gob_x = lerp(0.0, 0.85, fall)
                gob_y = lerp(-0.6, -1.35, fall)
                gob_z = 0.03
                yaw = 0.0
                pose = "cower"
                sx = gob_scale * lerp(0.12, 1.55, fall)
                sy = gob_scale * 1.55
                sz = gob_scale * lerp(1.35, 0.08, fall)
                
            goblin.location = Vector((gob_x, gob_y, gob_z))
            goblin.rotation_euler.z = yaw
            goblin.scale = Vector((sx, sy, sz))
            goblin.keyframe_insert(data_path="location", frame=f)
            goblin.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            goblin.keyframe_insert(data_path="scale", frame=f)
            
            p_data = solve_pose(pose, f)
            apply_pose_to_char("Goblin", p_data)

        # ---------------------------------------------------------
        # 5. Rogue 1 (Parkour escape through ceiling vent)
        # ---------------------------------------------------------
        if rogue1:
            if f < 310:
                rogue1.hide_render = True
                rogue1.hide_viewport = True
                r1_x, r1_y, r1_z = -12.0, -0.6, 0.0
                r1_yaw = math.radians(90)
                r1_pose = "run"
            elif f < 356:
                rogue1.hide_render = False
                rogue1.hide_viewport = False
                t = prog(f, 310, 356)
                r1_x = lerp(-10.2, -0.5, t)
                r1_y, r1_z = -0.6, 0.0
                r1_yaw = math.radians(90)
                r1_pose = "run"
            elif f < 381:
                r1_x, r1_y, r1_z = -0.5, -0.6, 0.0
                r1_yaw = math.radians(60) if f < 365 else 0.0
                r1_pose = "point" if f < 365 else "cheer"
            elif f < 453: # Parkour wall jumps
                t = prog(f, 381, 453)
                k = min(3, int(t * 4))
                local = t * 4 - k
                side = 1 if k % 2 == 0 else -1
                reach = max(0.2, inner - 0.28)
                from_x = -0.5 if k == 0 else -side * reach
                to_x = side * reach
                r1_x = lerp(from_x, to_x, local)
                r1_y = -0.6
                r1_z = lerp(k * 0.72, (k + 1) * 0.72, local)
                r1_yaw = math.radians(90 if side > 0 else -90)
                r1_pose = "jump"
            elif f < 515: # Ceiling chimney hang & gloat
                r1_x = 0.0
                r1_y = -0.6
                r1_z = 3.25
                r1_yaw = 0.0
                r1_pose = "cheer" if f > 480 else "point"
            else: # Escapes through chimney
                r1_x = 0.0
                r1_y = -0.6
                r1_z = 6.0
                rogue1.hide_render = True
                rogue1.hide_viewport = True
                r1_yaw = 0.0
                r1_pose = "idle"
                
            rogue1.location = Vector((r1_x, r1_y, r1_z))
            rogue1.rotation_euler.z = r1_yaw
            rogue1.keyframe_insert(data_path="location", frame=f)
            rogue1.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            
            p_data = solve_pose(r1_pose, f)
            apply_pose_to_char("Rogue1", p_data)

        # ---------------------------------------------------------
        # 6. Rogue 2 (Punted by spring boot -> Permanent pancake 2 in Lane 2)
        # ---------------------------------------------------------
        if rogue2:
            if f < 665:
                rogue2.hide_render = True
                rogue2.hide_viewport = True
                r2_x, r2_y, r2_z = -12.0, -0.6, 0.0
                r2_yaw = math.radians(90)
                r2_pose = "run"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 705:
                rogue2.hide_render = False
                rogue2.hide_viewport = False
                t = prog(f, 665, 705)
                r2_x = lerp(-10.2, -0.5, t)
                r2_y, r2_z = -0.6, 0.0
                r2_yaw = math.radians(90)
                r2_pose = "run"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 721:
                r2_x, r2_y, r2_z = -0.5, -0.6, 0.0
                r2_yaw = 0.0
                r2_pose = "point"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 791: # Parkour jump up chimney
                t = prog(f, 721, 791)
                r2_x = lerp(-0.5, 0.0, t)
                r2_y = -0.6
                r2_z = lerp(0.0, 1.25, t)
                r2_yaw = 0.0
                r2_pose = "jump"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 794: # Boot impact!
                r2_x, r2_y = 0.0, -0.6
                r2_z = 1.25
                r2_yaw = 0.0
                r2_pose = "cower"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 798: # Driven down to floor
                t = prog(f, 794, 798)
                r2_x, r2_y = 0.0, -0.6
                r2_z = lerp(1.25, 0.0, t)
                r2_yaw = 0.0
                r2_pose = "cower"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 829:
                r2_x, r2_y, r2_z = 0.0, -0.6, 0.0
                r2_yaw = 0.0
                r2_pose = "cower"
                r2_sx, r2_sy, r2_sz = rog_scale, rog_scale, rog_scale
            elif f < 835: # Walls crush Rogue 2 into pancake
                r2_x, r2_y, r2_z = 0.0, -0.6, 0.0
                r2_yaw = 0.0
                r2_pose = "cower"
                squeeze = clamp(inner / (0.36 * rog_scale), 0.12, 1.0)
                r2_sx = rog_scale * squeeze
                r2_sy = rog_scale
                r2_sz = rog_scale * lerp(1.0, 1.35, 1.0 - squeeze)
            elif f < 849: # Squeezed wafer
                r2_x, r2_y, r2_z = 0.15, -0.6, 0.0
                r2_yaw = 0.0
                r2_pose = "cower"
                r2_sx = rog_scale * 0.12
                r2_sy = rog_scale
                r2_sz = rog_scale * 1.35
            else: # Wobble and flop flat into lane 2
                fall = ease_in_out(prog(f, 849, 860))
                r2_x = lerp(0.15, 0.75, fall)
                r2_y = lerp(-0.6, 0.0, fall)
                r2_z = 0.03
                r2_yaw = 0.0
                r2_pose = "cower"
                r2_sx = rog_scale * lerp(0.12, 1.55, fall)
                r2_sy = rog_scale * 1.55
                r2_sz = rog_scale * lerp(1.35, 0.08, fall)
                
            rogue2.location = Vector((r2_x, r2_y, r2_z))
            rogue2.rotation_euler.z = r2_yaw
            rogue2.scale = Vector((r2_sx, r2_sy, r2_sz))
            rogue2.keyframe_insert(data_path="location", frame=f)
            rogue2.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            rogue2.keyframe_insert(data_path="scale", frame=f)
            
            p_data = solve_pose(r2_pose, f)
            apply_pose_to_char("Rogue2", p_data)

        # ---------------------------------------------------------
        # Level 3: Paladin 1 (Wedges Beam -> Folded Cube)
        # ---------------------------------------------------------
        if paladin1:
            if f < 873:
                paladin1.hide_render = True
                paladin1.hide_viewport = True
                p_x, p_y, p_z = -12.0, -0.6, 0.0
                p_yaw = math.radians(90)
                p_pose = "run"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 915:
                paladin1.hide_render = False
                paladin1.hide_viewport = False
                t = prog(f, 873, 915)
                p_x = lerp(-10.2, -0.6, t)
                p_y, p_z = -0.6, 0.0
                p_yaw = math.radians(90)
                p_pose = "run"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 990:
                p_x, p_y, p_z = -0.6, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "shield"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1017: # Wedges beam overhead
                t = prog(f, 990, 1017)
                p_x = lerp(-0.6, 0.0, t)
                p_y, p_z = -0.6, 0.0
                p_yaw = 0.0
                p_pose = "cast"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1437: # Smug brace under wedged beam
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "cheer" if f > 1143 else "cast"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1539: # Shock as circuit completes!
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "cower"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1593: # High-voltage electrocution jitter!
                p_x = 0.0 + (0.04 if (f % 2 == 0) else -0.04)
                p_y, p_z = -0.6, 0.0
                p_yaw = 0.05 if (f % 4 < 2) else -0.05
                p_pose = "cower"
                p_sx, p_sy, p_sz = pal_scale, pal_scale, pal_scale
            elif f < 1623: # Folded into cube by 500-ton rams
                t = prog(f, 1593, 1623)
                p_x, p_y = 0.0, -0.6
                p_z = lerp(0.0, 0.95, t)
                p_yaw = 0.0
                p_pose = "cower"
                sq = lerp(1.0, 0.28, ease_in_cubic(t))
                p_sx = pal_scale * sq
                p_sy = pal_scale * sq
                p_sz = pal_scale * sq
            else: # Character hidden, replaced by Paladin_Cube
                paladin1.hide_render = True
                paladin1.hide_viewport = True
                p_x, p_y, p_z = 0.0, -0.6, 0.0
                p_yaw = 0.0
                p_pose = "cower"
                p_sx, p_sy, p_sz = 0.01, 0.01, 0.01
                
            paladin1.location = Vector((p_x, p_y, p_z))
            paladin1.rotation_euler.z = p_yaw
            paladin1.scale = Vector((p_sx, p_sy, p_sz))
            paladin1.keyframe_insert(data_path="location", frame=f)
            paladin1.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            paladin1.keyframe_insert(data_path="scale", frame=f)
                
            p_data = solve_pose(p_pose, f)
            apply_pose_to_char("Paladin1", p_data)

        # Steel Beam
        if beam:
            if f < 990:
                beam.hide_render = True
                beam.hide_viewport = True
                bz = 0.0
            elif f < 1017: # Lifted up and wedged
                t = prog(f, 990, 1017)
                beam.hide_render = False
                beam.hide_viewport = False
                bz = lerp(0.0, 0.95, ease_out_back(t))
            elif f < 1593: # Locked wedged between walls
                beam.hide_render = False
                beam.hide_viewport = False
                bz = 0.95
            elif f < 1623: # Crushed into cube with Paladin
                t = prog(f, 1593, 1623)
                beam.hide_render = False
                beam.hide_viewport = False
                beam.scale.x = lerp(1.0, 0.22, ease_in_cubic(t))
                beam.keyframe_insert(data_path="scale", index=0, frame=f)
                bz = 0.95
            else:
                beam.hide_render = True
                beam.hide_viewport = True
                bz = 0.95
            beam.location.z = bz
            beam.keyframe_insert(data_path="location", index=2, frame=f)

        # Hydraulic Presses L & R
        if press_l and press_r:
            if f < 1218:
                pz = 6.0
            elif f < 1296: # Drop down and mount behind walls
                t = prog(f, 1218, 1296)
                pz = lerp(6.0, 0.0, ease_out_back(t))
            elif f < 1677:
                pz = 0.0
            elif f < 1705: # Retracts upward into ceiling after crushing paladin
                t = prog(f, 1677, 1705)
                pz = lerp(0.0, 6.0, ease_in_out(t))
            else:
                pz = 6.0
            press_l.location.z = pz
            press_r.location.z = pz
            press_l.keyframe_insert(data_path="location", index=2, frame=f)
            press_r.keyframe_insert(data_path="location", index=2, frame=f)

        # Electric Arcs
        if electric_arcs:
            if 1488 <= f < 1593:
                electric_arcs.scale.y = 1.0 + (0.35 if (f % 2 == 0) else -0.35)
                electric_arcs.location.z = 0.95 + (0.05 if (f % 3 == 0) else -0.05)
                electric_arcs.keyframe_insert(data_path="scale", index=1, frame=f)
                electric_arcs.keyframe_insert(data_path="location", index=2, frame=f)

        # Paladin Cube (Permanent corpse in Lane 3)
        if pal_cube:
            if f < 1623:
                cube_loc = Vector((0.0, -0.6, 0.95))
            elif f < 1677: # Held compacted between walls
                cube_loc = Vector((0.0, -0.6, 0.95))
            elif f < 1695: # Walls release, cube drops into corpse lane 3
                t = prog(f, 1677, 1695)
                cx = lerp(0.0, 1.22, ease_in_out(t))
                cy = lerp(-0.6, -0.9, ease_in_out(t))
                cz = lerp(0.95, 0.26, ease_out_bounce(t))
                cube_loc = Vector((cx, cy, cz))
            else: # Resting permanently on floor beside pancakes!
                cube_loc = Vector((1.22, -0.9, 0.26))
            pal_cube.location = cube_loc
            pal_cube.keyframe_insert(data_path="location", frame=f)

        # ---------------------------------------------------------
        # Level 4: Mage 1 (Teleports through wall, gloats)
        # ---------------------------------------------------------
        if mage1:
            if f < 1706:
                m1_x, m1_y, m1_z = -12.0, -0.6, 0.0
                m1_yaw = math.radians(90)
                m1_pose = "run"
            elif f < 1763: # Enters
                t = prog(f, 1706, 1763)
                m1_x = lerp(-10.2, -0.5, t)
                m1_y, m1_z = -0.6, 0.0
                m1_yaw = math.radians(90)
                m1_pose = "run"
            elif f < 1781:
                m1_x, m1_y, m1_z = -0.5, -0.6, 0.0
                m1_yaw = 0.0
                m1_pose = "idle"
            elif f < 1823: # Casts teleport!
                m1_x, m1_y, m1_z = -0.5, -0.6, 0.0
                m1_yaw = 0.0
                m1_pose = "cast"
            elif f < 1838: # Blinks out!
                m1_x, m1_y, m1_z = -0.5, -0.6, 0.0
                m1_yaw = 0.0
                m1_pose = "idle"
            elif f < 1870: # Reappears outside right wall, gloating!
                m1_x, m1_y, m1_z = -2.6, -0.6, 0.0
                m1_yaw = math.radians(-30)
                m1_pose = "point" if f < 1855 else "cheer"
            else: # Exits stage right
                m1_x, m1_y, m1_z = -2.6, -0.6, 0.0
                m1_yaw = 0.0
                m1_pose = "idle"
                
            mage1.location = Vector((m1_x, m1_y, m1_z))
            mage1.rotation_euler.z = m1_yaw
            mage1.keyframe_insert(data_path="location", frame=f)
            mage1.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            p_data = solve_pose(m1_pose, f)
            apply_pose_to_char("Mage1", p_data)

        # ---------------------------------------------------------
        # Level 4: Arcane Mirrors L & R
        # ---------------------------------------------------------
        if mirror_l and mirror_r:
            if f < 1915:
                mz = 4.0
            elif f < 1978: # Drop and unfold into place
                t = prog(f, 1915, 1978)
                mz = lerp(4.0, 1.65, ease_out_back(t))
            else:
                mz = 1.65
            mirror_l.location.z = mz
            mirror_r.location.z = mz
            mirror_l.keyframe_insert(data_path="location", index=2, frame=f)
            mirror_r.keyframe_insert(data_path="location", index=2, frame=f)

        # ---------------------------------------------------------
        # Level 4: Mage 2 (Victim: casts spell, pong bounce -> vaporized)
        # ---------------------------------------------------------
        if mage2:
            if f < 1996:
                m2_x, m2_y, m2_z = -12.0, -0.6, 0.0
                m2_yaw = math.radians(90)
                m2_pose = "run"
            elif f < 2037: # Enters
                t = prog(f, 1996, 2037)
                m2_x = lerp(-10.2, 0.0, t)
                m2_y, m2_z = -0.6, 0.0
                m2_yaw = math.radians(90)
                m2_pose = "run"
            elif f < 2070: # Casts teleport!
                m2_x, m2_y, m2_z = 0.0, -0.6, 0.0
                m2_yaw = 0.0
                m2_pose = "cast"
            elif f < 2298: # Trapped in center cowering as orb bounces
                m2_x, m2_y, m2_z = 0.0, -0.6, 0.0
                m2_yaw = 0.15 * math.sin(f * 0.4)
                m2_pose = "cower"
            else: # Vaporized! Replaced by Mage_AshPile
                m2_x, m2_y, m2_z = 0.0, -0.6, 0.0
                m2_yaw = 0.0
                m2_pose = "cower"
                
            mage2.location = Vector((m2_x, m2_y, m2_z))
            mage2.rotation_euler.z = m2_yaw
            mage2.keyframe_insert(data_path="location", frame=f)
            mage2.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            p_data = solve_pose(m2_pose, f)
            apply_pose_to_char("Mage2", p_data)

        # ---------------------------------------------------------
        # Level 4: Spell Orb (Pong bouncing trajectory)
        # ---------------------------------------------------------
        if spell_orb:
            if f < 2070:
                orb_loc = Vector((0.0, -0.6, 1.35))
                orb_sq = 1.0
            elif f < 2091: # Emerges from staff
                t = prog(f, 2070, 2091)
                orb_loc = Vector((lerp(0.0, 0.8, t), -0.6, 1.35))
                orb_sq = 1.0
            elif f < 2298: # Accelerated Pong bouncing between walls!
                u = prog(f, 2091, 2298)
                reach_w = max(0.05, inner - 0.22)
                phi = 2.0 * math.pi * (u + 4.5 * u * u + 8.0 * u * u * u)
                ox = reach_w * math.sin(phi)
                oz = 1.35 + 0.22 * math.cos(1.5 * phi)
                orb_loc = Vector((ox, -0.6, oz))
                orb_sq = 1.0
            elif f < 2306: # Implosion blast!
                t = prog(f, 2298, 2306)
                orb_loc = Vector((0.0, -0.6, 1.35))
                orb_sq = lerp(1.5, 0.02, t)
            else:
                orb_loc = Vector((0.0, -0.6, 1.35))
                orb_sq = 0.01
            spell_orb.location = orb_loc
            spell_orb.scale = Vector((orb_sq, orb_sq, orb_sq))
            spell_orb.keyframe_insert(data_path="location", frame=f)
            spell_orb.keyframe_insert(data_path="scale", frame=f)

        # ---------------------------------------------------------
        # Level 4: Mage Ash Pile (Permanent corpse in Lane 4)
        # ---------------------------------------------------------
        # Handled by set_hierarchy_visibility at frame 2316!

        # ---------------------------------------------------------
        # Level 5: Paranoid Party (Goblin 2, Rogue 3, Mage 3)
        # ---------------------------------------------------------
        if goblin2:
            if f < 2709: # Standing outside doorway
                g2_x, g2_y, g2_z = -5.8, -0.6, 0.0
                g2_yaw = math.radians(75)
                g2_pose = "cower"
            elif f < 2760: # Swallowed into room!
                t = prog(f, 2709, 2760)
                g2_x = lerp(-5.8, -6.8, t)
                g2_y, g2_z = -0.6, 0.0
                g2_yaw = 0.0
                g2_pose = "cower"
            elif f < 2826: # Trapped in room
                g2_x, g2_y, g2_z = -6.8, -0.6, 0.0
                g2_yaw = 0.0
                g2_pose = "cower"
            elif f < 2865: # Blasted up chimney chute into Mimic!
                t = prog(f, 2826, 2865)
                g2_x = -6.65
                g2_y = -0.75
                g2_z = lerp(0.0, 4.3, ease_out_cubic(t))
                g2_yaw = math.radians(f * 8)
                g2_pose = "jump"
            else: # Swallowed by Mimic!
                g2_x, g2_y, g2_z = -6.65, -0.75, 4.3
                g2_yaw = 0.0
                g2_pose = "idle"
            goblin2.location = Vector((g2_x, g2_y, g2_z))
            goblin2.rotation_euler.z = g2_yaw
            goblin2.keyframe_insert(data_path="location", frame=f)
            goblin2.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            p_data = solve_pose(g2_pose, f)
            apply_pose_to_char("Goblin2", p_data)

        if rogue3:
            if f < 2637: # Standing holding pole
                r3_x, r3_y, r3_z = -5.1, -0.6, 0.0
                r3_yaw = math.radians(90)
                r3_pose = "point" if f > 2454 else "idle"
            elif f < 2709: # Poking floor with pole
                r3_x, r3_y, r3_z = -5.1, -0.6, 0.0
                r3_yaw = math.radians(90)
                r3_pose = "point"
            elif f < 2760: # Swallowed into room!
                t = prog(f, 2709, 2760)
                r3_x = lerp(-5.1, -6.5, t)
                r3_y, r3_z = -0.6, 0.0
                r3_yaw = 0.0
                r3_pose = "cower"
            elif f < 2845:
                r3_x, r3_y, r3_z = -6.5, -0.6, 0.0
                r3_yaw = 0.0
                r3_pose = "cower"
            elif f < 2880: # Blasted up chute!
                t = prog(f, 2845, 2880)
                r3_x = -6.50
                r3_y = -0.55
                r3_z = lerp(0.0, 4.3, ease_out_cubic(t))
                r3_yaw = math.radians(f * 9)
                r3_pose = "jump"
            else: # Swallowed by Mimic!
                r3_x, r3_y, r3_z = -6.50, -0.55, 4.3
                r3_yaw = 0.0
                r3_pose = "idle"
            rogue3.location = Vector((r3_x, r3_y, r3_z))
            rogue3.rotation_euler.z = r3_yaw
            rogue3.keyframe_insert(data_path="location", frame=f)
            rogue3.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            p_data = solve_pose(r3_pose, f)
            apply_pose_to_char("Rogue3", p_data)

        # Ten-Foot Pole
        if pole:
            if f < 2454: # Held upright
                pole.location = Vector((-5.0, -0.6, 1.4))
                pole.rotation_euler = (0, math.radians(75), 0)
            elif f < 2637: # Lowered horizontally
                t = prog(f, 2454, 2520)
                pole.location = Vector((lerp(-5.0, -4.5, t), -0.6, lerp(1.4, 0.45, t)))
                pole.rotation_euler = (0, lerp(math.radians(75), 0.0, t), 0)
            elif f < 2709: # Reaches forward touching tile!
                t = prog(f, 2637, 2685)
                pole.location = Vector((lerp(-4.5, -3.8, t), -0.6, 0.25))
                pole.rotation_euler = (0, 0, 0)
            else: # Knocked away / swallowed
                pole.location = Vector((-3.8, -0.6, 0.25))
                pole.rotation_euler = (0, 0, 0)
            pole.keyframe_insert(data_path="location", frame=f)
            pole.keyframe_insert(data_path="rotation_euler", frame=f)

        if mage3:
            if f < 2709: # Watching party
                m3_x, m3_y, m3_z = -6.4, -0.6, 0.0
                m3_yaw = math.radians(70)
                m3_pose = "idle"
            elif f < 2760: # Swallowed into room!
                t = prog(f, 2709, 2760)
                m3_x = lerp(-6.4, -6.2, t)
                m3_y, m3_z = -0.6, 0.0
                m3_yaw = 0.0
                m3_pose = "cower"
            elif f < 2865:
                m3_x, m3_y, m3_z = -6.2, -0.6, 0.0
                m3_yaw = 0.0
                m3_pose = "cower"
            elif f < 2900: # Blasted up chute!
                t = prog(f, 2865, 2900)
                m3_x = -6.35
                m3_y = -0.65
                m3_z = lerp(0.0, 4.3, ease_out_cubic(t))
                m3_yaw = math.radians(f * 7)
                m3_pose = "jump"
            else: # Swallowed by Mimic!
                m3_x, m3_y, m3_z = -6.35, -0.65, 4.3
                m3_yaw = 0.0
                m3_pose = "idle"
            mage3.location = Vector((m3_x, m3_y, m3_z))
            mage3.rotation_euler.z = m3_yaw
            mage3.keyframe_insert(data_path="location", frame=f)
            mage3.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
            p_data = solve_pose(m3_pose, f)
            apply_pose_to_char("Mage3", p_data)

        # ---------------------------------------------------------
        # Level 5: Pet Mimic Chest
        # ---------------------------------------------------------
        if mimic and mimic_lid:
            if f < 2826: # Dormant atop chute
                lid_rot_x = 0.0
                m_scale = Vector((1.0, 1.0, 1.0))
            elif f < 2850: # Opens wide maw!
                t = prog(f, 2826, 2850)
                lid_rot_x = lerp(0.0, 1.25, ease_out_back(t))
                m_scale = Vector((1.0, 1.0, 1.0))
            elif f < 2907: # Open, waiting for lunch
                lid_rot_x = 1.25
                m_scale = Vector((1.0, 1.0, 1.0))
            elif f < 2915: # CHOMPS shut!
                t = prog(f, 2907, 2915)
                lid_rot_x = lerp(1.25, 0.0, ease_in_cubic(t))
                m_scale = Vector((1.0, 1.0, 1.0))
            elif f < 2930: # Comical swallow bulge & squash!
                lid_rot_x = 0.0
                t = prog(f, 2915, 2930)
                sq_z = lerp(0.72, 1.0, ease_out_bounce(t))
                sq_xy = lerp(1.15, 1.0, ease_out_bounce(t))
                m_scale = Vector((sq_xy, sq_xy, sq_z))
            else: # Proud and happy
                lid_rot_x = 0.0
                m_scale = Vector((1.0, 1.0, 1.0))
                
            mimic.scale = m_scale
            mimic_lid.rotation_euler.x = lid_rot_x
            mimic.keyframe_insert(data_path="scale", frame=f)
            mimic_lid.keyframe_insert(data_path="rotation_euler", index=0, frame=f)

        # ---------------------------------------------------------
        # Gold Coin
        # ---------------------------------------------------------
        if coin:
            if f < 105:
                coin.location = Vector((0.0, -1.1, -1.0))
            elif f < 171:
                coin.location = Vector((0.0, -1.1, ped_z + 1.15))
            elif f < 202:
                coin.location = Vector((-0.5 + 0.22, -0.5, 0.95))
            elif f < 212:
                t = prog(f, 202, 212)
                coin.location = Vector((lerp(-0.5, 0.0, t) + 0.22, -0.5, 0.95))
            elif f < 255:
                coin.location = Vector((0.18, -0.55, 0.9))
            elif f < 305:
                coin.location = Vector((0.45, -0.5, 0.05))
            elif f < 360:
                coin.location = Vector((0.0, -1.1, ped_z + 1.15))
            elif f < 381:
                coin.location = Vector((-0.5 + 0.22, -0.5, 0.95))
            elif f < 515:
                coin.location = Vector((r1_x + 0.2, -0.5, r1_z + 0.8))
            elif f < 555:
                coin.location = Vector((0.0, -1.1, -1.0))
            elif f < 705:
                coin.location = Vector((0.0, -1.1, ped_z + 1.15))
            elif f < 790:
                coin.location = Vector((r2_x + 0.2, -0.5, r2_z + 0.8))
            elif f < 1705:
                coin.location = Vector((0.35, -0.5, 0.05))
            elif f < 1763:
                coin.location = Vector((0.0, -1.1, ped_z + 1.15))
            elif f < 1823:
                coin.location = Vector((m1_x + 0.2, -0.5, 0.85))
            else:
                coin.location = Vector((0.0, -1.1, -1.0))
            coin.keyframe_insert(data_path="location", frame=f)

    # Animate UNBEATABLE stamp punch impact at frame 3029 (from BEATS.stamp)
    if stamp_box:
        stamp_box.animation_data_clear()
        stamp_box.scale = Vector((0.001, 0.001, 0.001))
        stamp_box.keyframe_insert(data_path="scale", frame=2939)
        stamp_box.keyframe_insert(data_path="scale", frame=3028)
        stamp_box.scale = Vector((1.35, 1.35, 1.35))
        stamp_box.keyframe_insert(data_path="scale", frame=3029)
        stamp_box.scale = Vector((1.0, 1.0, 1.0))
        stamp_box.keyframe_insert(data_path="scale", frame=3034)
        if stamp_box.animation_data and stamp_box.animation_data.action:
            for fcu in get_action_fcurves(stamp_box.animation_data.action):
                for kf in fcu.keyframe_points:
                    kf.interpolation = 'BEZIER'

    print("Complete Episode 3 Animation Keyframing (0 -> 3109) Finished.")


def clean_scene():
    for obj in list(bpy.data.objects):
        if obj.type != 'CAMERA':
            bpy.data.objects.remove(obj, do_unlink=True)
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)
    for mat in list(bpy.data.materials):
        if mat.users == 0:
            bpy.data.materials.remove(mat)


def setup_episode3_scene():
    print("Building Full Episode 3 Scene in Blender...")
    clean_scene()
    build_diorama_hall()
    build_crush_room_props()
    build_chibi_character("goblin", "Goblin")
    build_chibi_character("rogue", "Rogue1")
    build_chibi_character("rogue", "Rogue2")
    build_chibi_character("paladin", "Paladin1")
    build_chibi_character("mage", "Mage1")
    build_chibi_character("mage", "Mage2")
    build_chibi_character("goblin", "Goblin2")
    build_chibi_character("rogue", "Rogue3")
    build_chibi_character("mage", "Mage3")
    setup_camera_animation()
    build_hud_elements(bpy.data.objects.get("Camera"))
    animate_scene_levels()
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = 3109
    print("Episode 3 Setup & Animation Complete.")


if __name__ == "__main__":
    setup_episode3_scene()
