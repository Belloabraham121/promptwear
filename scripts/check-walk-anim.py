"""Try to resolve Alembic cache and bake walking mesh sequence to morphs/GLB."""

import sys
from pathlib import Path

import bpy

argv = sys.argv
sep = argv.index("--")
blend_path = Path(argv[sep + 1]).resolve()
out_path = Path(argv[sep + 2]).resolve()
abc_candidates = [
    blend_path.parent / "animationcache.abc",
    blend_path.parent / "animation cache.abc",
    blend_path.parent / "AnimationCache.abc",
]

bpy.ops.wm.open_mainfile(filepath=str(blend_path))

shirt = bpy.data.objects.get("cloth_parent")
print("shirt", shirt)
print("cache files", [(c.name, c.filepath) for c in bpy.data.cache_files])

found_abc = next((p for p in abc_candidates if p.exists()), None)
print("found_abc", found_abc)

if found_abc and bpy.data.cache_files:
    cf = bpy.data.cache_files[0]
    cf.filepath = str(found_abc)
    print("pointed cache to", cf.filepath)

# Report modifier status
if shirt:
    for mod in shirt.modifiers:
        print("mod", mod.name, mod.type)
        if mod.type == "MESH_SEQUENCE_CACHE":
            print("  cache_file", mod.cache_file)
            print("  object_path", getattr(mod, "object_path", None))

scene = bpy.context.scene
print("frames", scene.frame_start, scene.frame_end, "fps", scene.render.fps)

# If cache is readable, bake a sampled morph-target sequence is heavy.
# Instead export Alembic-applied mesh as MDD/PC2 is complex; try glTF after
# applying cache at multiple frames via geometry nodes is not trivial.
# First verify whether evaluating the depsgraph changes vertex positions across frames.

if shirt:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    def vert_sample(frame):
        scene.frame_set(frame)
        depsgraph.update()
        eval_obj = shirt.evaluated_get(depsgraph)
        mesh = eval_obj.to_mesh()
        # sample a few vertex coords
        idxs = [0, len(mesh.vertices)//4, len(mesh.vertices)//2]
        sample = [tuple(round(c, 4) for c in mesh.vertices[i].co) for i in idxs if i < len(mesh.vertices)]
        n = len(mesh.vertices)
        eval_obj.to_mesh_clear()
        return n, sample

    a = vert_sample(scene.frame_start)
    b = vert_sample(scene.frame_start + 20)
    c = vert_sample(scene.frame_end // 2)
    print("sample_start", a)
    print("sample_+20", b)
    print("sample_mid", c)
    print("mesh_animated", a[1] != b[1] or a[1] != c[1])
