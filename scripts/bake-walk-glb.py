"""
Bake Alembic walking cloth → high-quality centered morph GLB.

Milder decimation so sleeve/hem edges stay clean. Light smoothing only —
enough to calm noise, not enough to melt silhouette.
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy
from mathutils import Vector, kdtree

argv = sys.argv
sep = argv.index("--")
blend_path = Path(argv[sep + 1]).resolve()
out_path = Path(argv[sep + 2]).resolve()
abc_path = blend_path.parent / "animationcache.abc"

if not abc_path.exists():
    raise SystemExit(f"Missing Alembic cache: {abc_path}")

out_path.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(blend_path))

for obj in list(bpy.data.objects):
    if obj.type in {"LIGHT", "CAMERA"}:
        bpy.data.objects.remove(obj, do_unlink=True)

high = bpy.data.objects.get("cloth_parent")
if high is None:
    raise SystemExit("cloth_parent not found")

for cf in bpy.data.cache_files:
    cf.filepath = str(abc_path)
    print("cache ->", cf.filepath)

scene = bpy.context.scene
frame_start = int(scene.frame_start)
frame_end = int(scene.frame_end)
print(f"frames {frame_start}-{frame_end}")

scene.frame_set(frame_start)
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
eval_high = high.evaluated_get(depsgraph)
high_mesh0 = eval_high.to_mesh()

min_c = Vector(high_mesh0.vertices[0].co)
max_c = Vector(high_mesh0.vertices[0].co)
for v in high_mesh0.vertices:
    min_c = Vector((min(min_c.x, v.co.x), min(min_c.y, v.co.y), min(min_c.z, v.co.z)))
    max_c = Vector((max(max_c.x, v.co.x), max(max_c.y, v.co.y), max(max_c.z, v.co.z)))
center = (min_c + max_c) * 0.5
extent = max((max_c - min_c).x, (max_c - min_c).y, (max_c - min_c).z) or 1.0
scale = 3.4 / extent
print("center", tuple(round(c, 3) for c in center), "scale", round(scale, 5))


def xform(co: Vector) -> Vector:
    return (co - center) * scale


tmp = bpy.data.meshes.new("tmp_high")
tmp.from_pydata(
    [xform(v.co) for v in high_mesh0.vertices],
    [],
    [p.vertices[:] for p in high_mesh0.polygons],
)
tmp.update()

# Keep original garment UVs so prints can bake onto the fabric in-engine
if high_mesh0.uv_layers:
    src_uv = high_mesh0.uv_layers.active.data
    dst_uv = tmp.uv_layers.new(name="UVMap")
    if len(src_uv) == len(dst_uv.data):
        for i, loop_uv in enumerate(dst_uv.data):
            loop_uv.uv = src_uv[i].uv.copy()
        print(f"copied UVs ({len(src_uv)} loops)")
    else:
        print(f"UV loop mismatch src={len(src_uv)} dst={len(dst_uv.data)} — smart projecting")
        # Fallback applied after object creation below
else:
    print("no source UVs — will smart project")

eval_high.to_mesh_clear()

low = bpy.data.objects.new("tshirt_web", tmp)
bpy.context.collection.objects.link(low)
bpy.ops.object.select_all(action="DESELECT")
low.select_set(True)
bpy.context.view_layer.objects.active = low

if not low.data.uv_layers:
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")
    print("smart-projected UVs")

# Keep most of the silhouette — only light reduction for web
dec = low.modifiers.new(name="DecimateWeb", type="DECIMATE")
dec.ratio = 0.12  # ~12% of original faces — preserves edges
bpy.ops.object.modifier_apply(modifier=dec.name)

# Very light smooth — don't melt hems/sleeves
smooth = low.modifiers.new(name="SmoothWeb", type="SMOOTH")
smooth.factor = 0.15
smooth.iterations = 2
bpy.ops.object.modifier_apply(modifier=smooth.name)

print(f"low verts={len(low.data.vertices)} faces={len(low.data.polygons)}")

scene.frame_set(frame_start)
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
eval_high = high.evaluated_get(depsgraph)
high_mesh0 = eval_high.to_mesh()
kd = kdtree.KDTree(len(high_mesh0.vertices))
for i, v in enumerate(high_mesh0.vertices):
    kd.insert(xform(v.co), i)
kd.balance()

# Small neighborhood — slight wrinkle calm without blurring edges
K = 5
mapping = []
for v in low.data.vertices:
    neighbors = kd.find_n(v.co, K)
    mapping.append([index for _co, index, _dist in neighbors])
print(f"mapped {len(mapping)} low verts x {K}")
eval_high.to_mesh_clear()

if low.data.shape_keys:
    low.shape_key_clear()
low.shape_key_add(name="Basis", from_mix=False)

# Slightly denser morph sampling for smoother walk
step = 4
sample_frames = list(range(frame_start, frame_end + 1, step))
if sample_frames[-1] != frame_end:
    sample_frames.append(frame_end)

print(f"baking {len(sample_frames)} morphs...")
shape_keys = []
for i, frame in enumerate(sample_frames):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_high = high.evaluated_get(depsgraph)
    high_mesh = eval_high.to_mesh()
    high_pos = [xform(v.co) for v in high_mesh.vertices]

    key = low.shape_key_add(name=f"f{frame:04d}", from_mix=False)
    for li, idxs in enumerate(mapping):
        acc = Vector((0.0, 0.0, 0.0))
        for hi in idxs:
            acc += high_pos[hi]
        key.data[li].co = acc / float(len(idxs))
    eval_high.to_mesh_clear()
    shape_keys.append(key)
    if i % 8 == 0 or i == len(sample_frames) - 1:
        print(f"  {i+1}/{len(sample_frames)} frame={frame}")

# One gentle laplacian pass only (preserve silhouette)
print("light shape-key polish...")
adjacency = [set() for _ in range(len(low.data.vertices))]
for poly in low.data.polygons:
    verts = poly.vertices
    for a in range(len(verts)):
        for b in range(a + 1, len(verts)):
            adjacency[verts[a]].add(verts[b])
            adjacency[verts[b]].add(verts[a])

for key in shape_keys:
    coords = [key.data[i].co.copy() for i in range(len(key.data))]
    nxt = []
    for i, co in enumerate(coords):
        nbrs = adjacency[i]
        if not nbrs:
            nxt.append(co)
            continue
        avg = Vector((0.0, 0.0, 0.0))
        for j in nbrs:
            avg += coords[j]
        avg /= float(len(nbrs))
        nxt.append(co.lerp(avg, 0.18))
    for i, co in enumerate(nxt):
        key.data[i].co = co

bpy.data.objects.remove(high, do_unlink=True)
low.location = (0.0, 0.0, 0.0)

mat = bpy.data.materials.new(name="PromptwearFabric")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links
nodes.clear()
out = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
bsdf.inputs["Base Color"].default_value = (0.69, 0.7, 0.66, 1.0)
bsdf.inputs["Roughness"].default_value = 0.86
bsdf.inputs["Metallic"].default_value = 0.02
links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
low.data.materials.clear()
low.data.materials.append(mat)

bpy.ops.object.shade_smooth()

sk_block = low.data.shape_keys
sk_block.use_relative = True
action = bpy.data.actions.new(name="WalkCycle")
sk_block.animation_data_create()
sk_block.animation_data.action = action

scene.frame_start = 0
scene.frame_end = max(len(shape_keys) - 1, 1)
scene.render.fps = 12

for i, key in enumerate(shape_keys):
    for j, other in enumerate(shape_keys):
        other.value = 1.0 if i == j else 0.0
        other.keyframe_insert(data_path="value", frame=i)

bpy.ops.object.select_all(action="DESELECT")
low.select_set(True)
bpy.context.view_layer.objects.active = low

bpy.ops.export_scene.gltf(
    filepath=str(out_path),
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_morph=True,
    export_morph_animation=True,
    export_morph_normal=False,
    export_texcoords=True,
    export_apply=False,
    export_skins=False,
    export_lights=False,
    export_cameras=False,
    export_yup=True,
)

print(f"Exported {out_path} ({out_path.stat().st_size} bytes)")
print(f"Morphs={len(shape_keys)} verts={len(low.data.vertices)}")
