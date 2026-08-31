"""Inspect the walking tshirt blend for caches, modifiers, and packed files."""

import sys
from pathlib import Path

import bpy

blend_path = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
bpy.ops.wm.open_mainfile(filepath=str(blend_path))

print("=== OBJECTS ===")
for obj in bpy.data.objects:
    print(f"- {obj.name} type={obj.type} loc={tuple(round(v,3) for v in obj.location)} dims={tuple(round(v,3) for v in obj.dimensions)}")
    for mod in obj.modifiers:
        print(f"  modifier: {mod.name} type={mod.type}")
        if mod.type == "MESH_SEQUENCE_CACHE":
            print(f"    cache_file={getattr(mod, 'cache_file', None)}")
            cf = getattr(mod, "cache_file", None)
            if cf:
                print(f"    filepath={cf.filepath}")
                print(f"    is_sequence={cf.is_sequence}")

print("\n=== CACHE FILES ===")
for cf in bpy.data.cache_files:
    print(f"- {cf.name} filepath={cf.filepath}")

print("\n=== IMAGES ===")
for img in bpy.data.images:
    print(f"- {img.name} size={img.size[:]} packed={img.packed_file is not None} filepath={img.filepath}")

print("\n=== MATERIALS ===")
for mat in bpy.data.materials:
    print(f"- {mat.name}")
    if mat.use_nodes and mat.node_tree:
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                print(f"  tex: {node.image.name} packed={node.image.packed_file is not None}")

print("\n=== ACTIONS ===")
for action in bpy.data.actions:
    print(f"- {action.name} fcurves={len(action.fcurves)}")

print("\n=== FRAME RANGE ===")
print(f"start={bpy.context.scene.frame_start} end={bpy.context.scene.frame_end} fps={bpy.context.scene.render.fps}")
