"""Decimate the walking tshirt mesh and export a web-ready GLB."""

import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

argv = sys.argv
sep = argv.index("--")
blend_path = Path(argv[sep + 1]).resolve()
out_path = Path(argv[sep + 2]).resolve()
out_path.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(blend_path))

# Drop lights/cameras — we light in Three.js
for obj in list(bpy.data.objects):
    if obj.type in {"LIGHT", "CAMERA"}:
        bpy.data.objects.remove(obj, do_unlink=True)

shirt = bpy.data.objects.get("cloth_parent")
if shirt is None:
    raise RuntimeError("cloth_parent not found")

# Remove broken MeshSequenceCache so we export the editable mesh
for mod in list(shirt.modifiers):
    shirt.modifiers.remove(mod)

bpy.context.view_layer.objects.active = shirt
shirt.select_set(True)

# Decimate aggressively for realtime
dec = shirt.modifiers.new(name="DecimateWeb", type="DECIMATE")
dec.ratio = 0.04  # ~4% of original faces
bpy.ops.object.modifier_apply(modifier=dec.name)

# Recenter on origin for easier framing in Three.js
bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
shirt.location = (0.0, 0.0, 0.0)

# Ensure a simple fabric material without missing textures
mat = bpy.data.materials.new(name="PromptwearFabric")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links
nodes.clear()
out = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
bsdf.inputs["Base Color"].default_value = (0.23, 0.24, 0.22, 1.0)
bsdf.inputs["Roughness"].default_value = 0.82
bsdf.inputs["Metallic"].default_value = 0.02
links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
shirt.data.materials.clear()
shirt.data.materials.append(mat)

# Report polycount
mesh = shirt.data
print(f"Faces after decimate: {len(mesh.polygons)} verts={len(mesh.vertices)}")

bpy.ops.export_scene.gltf(
    filepath=str(out_path),
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_apply=True,
    export_skins=False,
    export_morph=False,
    export_lights=False,
    export_cameras=False,
    export_yup=True,
)

print(f"Exported: {out_path} ({out_path.stat().st_size} bytes)")
