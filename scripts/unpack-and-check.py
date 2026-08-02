"""Unpack any packed files from the blend and report animation sources."""

import sys
from pathlib import Path

import bpy

blend_path = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
out_dir = Path(sys.argv[sys.argv.index("--") + 2]).resolve()
out_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(blend_path))

print("packed images", sum(1 for i in bpy.data.images if i.packed_file))
print("libraries", [l.filepath for l in bpy.data.libraries])

# Try unpacking everything next to the blend
try:
    bpy.ops.file.unpack_all(method="USE_LOCAL")
    print("unpack_all USE_LOCAL ok")
except Exception as exc:
    print("unpack_all failed", exc)

# List files created near blend
for path in sorted(blend_path.parent.glob("*")):
    if path.suffix.lower() in {".abc", ".png", ".jpg", ".exr", ".tif", ".jpeg"}:
        print("sidecar", path.name, path.stat().st_size)

# Check if MeshSequenceCache can evaluate
shirt = bpy.data.objects.get("cloth_parent")
scene = bpy.context.scene
if shirt:
    depsgraph = bpy.context.evaluated_depsgraph_get()

    def sample(frame: int):
        scene.frame_set(frame)
        depsgraph.update()
        ev = shirt.evaluated_get(depsgraph)
        mesh = ev.to_mesh()
        idxs = [0, max(0, len(mesh.vertices) // 3), max(0, len(mesh.vertices) // 2)]
        pts = [tuple(round(x, 5) for x in mesh.vertices[i].co) for i in idxs]
        count = len(mesh.vertices)
        ev.to_mesh_clear()
        return count, pts

    s0 = sample(0)
    s1 = sample(30)
    s2 = sample(90)
    print("frame0", s0)
    print("frame30", s1)
    print("frame90", s2)
    print("deforming", s0 != s1 or s0 != s2)

# Also dump action channels
for action in bpy.data.actions:
    print("action", action.name)
    for fc in action.fcurves:
        print("  fcurve", fc.data_path, fc.array_index, "keys", len(fc.keyframe_points))
