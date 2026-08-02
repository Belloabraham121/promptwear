"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF, useTexture } from "@react-three/drei";
import {
  type MutableRefObject,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";

type SceneProps = {
  progress: MutableRefObject<number>;
};

const MODEL_PATH = "/models/walking-tshirt.glb?v=chest11";

const PRINTS = [
  "/prints/print-sketch.png",
  "/prints/print-polished.png",
  "/prints/print-finalize.png",
] as const;

/** Mid-chest stamp — tuned against the landing camera yaw. */
const PRINT_UV = { u0: 0.18, v0: 0.02, u1: 0.82, v1: 0.6 };
const ATLAS_SIZE = 2048;

type TorsoFrame = {
  xMin: number;
  yMin: number;
  xSpan: number;
  ySpan: number;
};

function measureTorsoFrame(geometry: THREE.BufferGeometry): TorsoFrame {
  const pos = geometry.getAttribute("position");
  const nrm = geometry.getAttribute("normal");

  let neckY = -Infinity;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nz = nrm ? nrm.getZ(i) : 1;
    if (Math.abs(x) > 0.18) continue;
    if (z < 0.15 || nz < 0.2) continue;
    if (y > neckY) neckY = y;
  }
  if (!Number.isFinite(neckY)) neckY = 1.2;

  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  let n = 0;

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nz = nrm ? nrm.getZ(i) : 1;
    // Broad front panel so the print can sit large on the chest
    if (Math.abs(x) > 0.55) continue;
    if (y < neckY - 1.05 || y > neckY - 0.08) continue;
    if (z < 0.08 || nz < 0.3) continue;
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
    n += 1;
  }

  if (n < 40) {
    xMin = -0.5;
    xMax = 0.5;
    yMin = neckY - 1.0;
    yMax = neckY - 0.1;
  }

  // Landing camera sees the tee slightly yawed — small -X bias so the stamp
  // reads on the visual middle of the chest rather than the near sleeve.
  // Face-on landing camera — no lateral UV bias needed
  const biasX = 0;
  xMin += biasX;
  xMax += biasX;

  return {
    xMin,
    yMin,
    xSpan: Math.max(xMax - xMin, 1e-5),
    ySpan: Math.max(yMax - yMin, 1e-5),
  };
}

/** Stick a rest-pose torso UV on every vertex (survives morphs). */
function bindChestUVs(geometry: THREE.BufferGeometry, frame: TorsoFrame) {
  const pos = geometry.getAttribute("position");
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    uvs[i * 2] = (pos.getX(i) - frame.xMin) / frame.xSpan;
    uvs[i * 2 + 1] = (pos.getY(i) - frame.yMin) / frame.ySpan;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.attributes.uv.needsUpdate = true;
}

function PromptAura({ progress }: SceneProps) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const count = 72;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2;
      const r = 0.45 + (i % 5) * 0.1;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = 0.35 + Math.sin(a * 1.7) * 0.55;
      arr[i * 3 + 2] = 0.55 + Math.sin(a) * 0.12;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const p = progress.current;
    const intensity =
      p < 0.2 ? 1 : p < 0.38 ? 1 - (p - 0.2) / 0.18 : 0;
    if (!points.current) return;
    points.current.rotation.z = state.clock.elapsedTime * 0.18;
    const mat = points.current.material as THREE.PointsMaterial;
    mat.opacity = intensity * 0.9;
    points.current.visible = intensity > 0.02;
  });

  return (
    <points ref={points} position={[0, 0.25, 0.35]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#d6ff3c"
        size={0.05}
        transparent
        opacity={0.85}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  opacity: number,
) {
  if (opacity < 0.01) return;
  const iw =
    "naturalWidth" in img
      ? (img as HTMLImageElement).naturalWidth
      : (img as ImageBitmap).width;
  const ih =
    "naturalHeight" in img
      ? (img as HTMLImageElement).naturalHeight
      : (img as ImageBitmap).height;
  if (!iw || !ih) return;

  const imgAspect = iw / ih;
  const boxAspect = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (boxAspect > imgAspect) {
    dw = h * imgAspect;
    dx = x + (w - dw) * 0.5;
  } else {
    dh = w / imgAspect;
    dy = y + (h - dh) * 0.5;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(dx, dy + dh);
  ctx.scale(1, -1);
  ctx.drawImage(img, 0, 0, dw, dh);
  ctx.restore();
}

function WalkingShirt({ progress }: SceneProps) {
  const root = useRef<THREE.Group>(null);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const atlasRef = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);
  const printOpacity = useRef({ a: 0, b: 0, c: 0 });
  const walkAction = useRef<THREE.AnimationAction | null>(null);
  const currentColor = useMemo(() => new THREE.Color("#b0b1aa"), []);
  const targetColor = useMemo(() => new THREE.Color("#b0b1aa"), []);
  const lastBake = useRef({ a: -1, b: -1, c: -1, color: "", imgs: 0 });

  const { scene, animations } = useGLTF(MODEL_PATH, true);
  const { actions, names } = useAnimations(animations, root);
  const [sketch, polished, finalize] = useTexture([...PRINTS]);

  useLayoutEffect(() => {
    for (const tex of [sketch, polished, finalize]) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    }

    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_SIZE;
    canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return undefined;

    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    atlasRef.current = { canvas, ctx, texture };

    const mats: THREE.MeshStandardMaterial[] = [];
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Fresh geometry from the cached GLB each setup pass
      const source = mesh.geometry;
      const geometry = source.clone();
      if (!geometry.getAttribute("normal")) {
        geometry.computeVertexNormals();
      }
      const frame = measureTorsoFrame(geometry);
      bindChestUVs(geometry, frame);
      mesh.geometry = geometry;

      if (typeof window !== "undefined") {
        (
          window as unknown as { __pwChest?: TorsoFrame & { ok: true } }
        ).__pwChest = { ...frame, ok: true };
      }

      const next = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        map: texture,
        roughness: 0.9,
        metalness: 0.015,
        side: THREE.DoubleSide,
        flatShading: false,
      });
      mesh.material = next;
      mats.push(next);
    });
    materialsRef.current = mats;
    lastBake.current = { a: -1, b: -1, c: -1, color: "", imgs: 0 };

    return () => {
      texture.dispose();
      atlasRef.current = null;
      mats.forEach((mat) => {
        mat.map = null;
        mat.dispose();
      });
    };
  }, [scene, sketch, polished, finalize]);

  useEffect(() => {
    const preferred =
      names.find((name) => /walk/i.test(name)) ?? names[0] ?? null;
    const action = preferred ? actions[preferred] : null;
    if (!action) return undefined;

    action.reset().fadeIn(0.35).play();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.timeScale = 0.38;
    walkAction.current = action;

    return () => {
      walkAction.current = null;
      action.fadeOut(0.2);
    };
  }, [actions, names]);

  useFrame((_state, delta) => {
    const p = progress.current;

    if (root.current) {
      const walk = walkAction.current;
      const cycle =
        walk && walk.getClip().duration > 0
          ? (walk.time % walk.getClip().duration) / walk.getClip().duration
          : 0;
      const sink = Math.sin(cycle * Math.PI * 2) * 0.028;
      root.current.position.y = THREE.MathUtils.damp(
        root.current.position.y,
        -0.15 + sink,
        3,
        delta,
      );

      // Face the chest toward camera so a centered stamp reads centered
      const targetYaw = 0.02 + p * 0.06;
      root.current.rotation.y = THREE.MathUtils.damp(
        root.current.rotation.y,
        targetYaw,
        2.4,
        delta,
      );
      const fit = p > 0.7 ? 1.06 : 1;
      const s = THREE.MathUtils.damp(root.current.scale.x, fit, 4, delta);
      root.current.scale.setScalar(s);
    }

    if (p < 0.33) targetColor.set("#b0b1aa");
    else if (p < 0.66) targetColor.set("#1a1a1a");
    else targetColor.set("#ebe6dc");
    currentColor.lerp(targetColor, 1 - Math.exp(-delta * 4));

    const sketchOpacity =
      p < 0.18
        ? 0
        : p < 0.36
          ? THREE.MathUtils.smoothstep(p, 0.18, 0.36)
          : p < 0.52
            ? 1 - THREE.MathUtils.smoothstep(p, 0.4, 0.52)
            : 0;

    const polishedOpacity =
      p < 0.4
        ? 0
        : p < 0.58
          ? THREE.MathUtils.smoothstep(p, 0.4, 0.58)
          : p < 0.72
            ? 1 - THREE.MathUtils.smoothstep(p, 0.62, 0.72)
            : 0;

    const finalizeOpacity =
      p < 0.62 ? 0 : THREE.MathUtils.smoothstep(p, 0.62, 0.78);

    printOpacity.current.a = THREE.MathUtils.damp(
      printOpacity.current.a,
      sketchOpacity * 0.95,
      6,
      delta,
    );
    printOpacity.current.b = THREE.MathUtils.damp(
      printOpacity.current.b,
      polishedOpacity * 0.98,
      6,
      delta,
    );
    printOpacity.current.c = THREE.MathUtils.damp(
      printOpacity.current.c,
      finalizeOpacity * 0.98,
      6,
      delta,
    );

    const atlas = atlasRef.current;
    if (!atlas) return;

    const imgA = sketch.image as CanvasImageSource | undefined;
    const imgB = polished.image as CanvasImageSource | undefined;
    const imgC = finalize.image as CanvasImageSource | undefined;
    const readyCount =
      (imgA &&
      (("naturalWidth" in imgA && imgA.naturalWidth > 0) ||
        ("width" in imgA && (imgA as ImageBitmap).width > 0))
        ? 1
        : 0) +
      (imgB &&
      (("naturalWidth" in imgB && imgB.naturalWidth > 0) ||
        ("width" in imgB && (imgB as ImageBitmap).width > 0))
        ? 1
        : 0) +
      (imgC &&
      (("naturalWidth" in imgC && imgC.naturalWidth > 0) ||
        ("width" in imgC && (imgC as ImageBitmap).width > 0))
        ? 1
        : 0);

    const colorKey = currentColor.getStyle();
    const a = printOpacity.current.a;
    const b = printOpacity.current.b;
    const c = printOpacity.current.c;
    const changed =
      Math.abs(a - lastBake.current.a) > 0.004 ||
      Math.abs(b - lastBake.current.b) > 0.004 ||
      Math.abs(c - lastBake.current.c) > 0.004 ||
      colorKey !== lastBake.current.color ||
      readyCount !== lastBake.current.imgs;

    if (!changed) return;

    const { ctx, texture } = atlas;
    const size = ATLAS_SIZE;
    ctx.fillStyle = colorKey;
    ctx.fillRect(0, 0, size, size);

    const x = PRINT_UV.u0 * size;
    const y = PRINT_UV.v0 * size;
    const w = (PRINT_UV.u1 - PRINT_UV.u0) * size;
    const h = (PRINT_UV.v1 - PRINT_UV.v0) * size;

    if (imgA) drawContainedImage(ctx, imgA, x, y, w, h, a);
    if (imgB) drawContainedImage(ctx, imgB, x, y, w, h, b);
    if (imgC) drawContainedImage(ctx, imgC, x, y, w, h, c);

    if (a + b + c > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = colorKey;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    texture.needsUpdate = true;
    lastBake.current = { a, b, c, color: colorKey, imgs: readyCount };
  });

  return (
    <group
      ref={root}
      position={[1.45, -0.15, 0]}
      rotation={[0.03, 0.08, 0]}
      scale={1.15}
    >
      <primitive object={scene} />
      <PromptAura progress={progress} />
    </group>
  );
}

function ShirtFallback() {
  return (
    <mesh position={[1.4, 0, 0]}>
      <boxGeometry args={[1.6, 2.1, 0.35]} />
      <meshStandardMaterial color="#2a2c29" roughness={0.9} />
    </mesh>
  );
}

export function ShirtScene({ progress }: SceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0.55, 0.55, 6.8], fov: 34 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#070807", 1);
      }}
      style={{ width: "100%", height: "100%", background: "#070807" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={2.8} color="#fff4e0" />
      <directionalLight position={[-5, 2, 3]} intensity={1.2} color="#dfe6ff" />
      <spotLight
        position={[2, 4, 5]}
        angle={0.5}
        penumbra={0.7}
        intensity={2.2}
        color="#d6ff3c"
      />
      <hemisphereLight args={["#f5f0e6", "#1a1c18", 0.55]} />
      <Suspense fallback={<ShirtFallback />}>
        <WalkingShirt progress={progress} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_PATH, true);
