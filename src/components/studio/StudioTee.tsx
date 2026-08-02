"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { ATLAS_SIZE, PRINT_UV } from "@/lib/studio/atlas";

type OrbitLike = {
  object: THREE.Camera;
  target: THREE.Vector3;
  update: () => void;
  minDistance: number;
  maxDistance: number;
};

const MODEL_PATH = "/models/walking-tshirt.glb?v=studio1";

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

  return {
    xMin,
    yMin,
    xSpan: Math.max(xMax - xMin, 1e-5),
    ySpan: Math.max(yMax - yMin, 1e-5),
  };
}

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

type TeeMeshProps = {
  color: string;
  printUrl: string | null;
  printRevision: number;
};

function TeeMesh({ color, printUrl, printRevision }: TeeMeshProps) {
  const { scene } = useGLTF(MODEL_PATH);
  const root = useRef<THREE.Group>(null);
  const atlasRef = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);
  const printImg = useRef<HTMLImageElement | null>(null);
  const bakeKey = useRef("");
  const pendingBake = useRef(true);

  const cloned = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_SIZE;
    canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return undefined;

    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    atlasRef.current = { canvas, ctx, texture };

    const mats: THREE.MeshStandardMaterial[] = [];
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const geometry = mesh.geometry.clone();
      if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
      bindChestUVs(geometry, measureTorsoFrame(geometry));
      mesh.geometry = geometry;
      const mat = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        map: texture,
        roughness: 0.9,
        metalness: 0.015,
        side: THREE.DoubleSide,
      });
      mesh.material = mat;
      mats.push(mat);
    });

    pendingBake.current = true;

    return () => {
      texture.dispose();
      atlasRef.current = null;
      mats.forEach((m) => {
        m.map = null;
        m.dispose();
      });
    };
  }, [cloned]);

  useEffect(() => {
    pendingBake.current = true;
    if (!printUrl) {
      printImg.current = null;
      return;
    }
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      printImg.current = img;
      pendingBake.current = true;
    };
    img.onerror = () => {
      printImg.current = null;
      pendingBake.current = true;
    };
    img.src = printUrl;
  }, [printUrl, printRevision]);

  useFrame(() => {
    const atlas = atlasRef.current;
    if (!atlas) return;

    const key = `${color}|${printRevision}|${printUrl ?? ""}|${printImg.current ? 1 : 0}`;
    if (!pendingBake.current && key === bakeKey.current) return;
    if (printUrl && !printImg.current) return;

    const { ctx, texture } = atlas;
    const size = ATLAS_SIZE;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    const img = printImg.current;
    if (img) {
      const x = PRINT_UV.u0 * size;
      const y = PRINT_UV.v0 * size;
      const w = (PRINT_UV.u1 - PRINT_UV.u0) * size;
      const h = (PRINT_UV.v1 - PRINT_UV.v0) * size;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (iw > 0 && ih > 0) {
        // Cover the chest stamp area so artwork reads large on the tee
        const scale = Math.max(w / iw, h / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
        ctx.restore();
      }
    }

    texture.needsUpdate = true;
    bakeKey.current = key;
    pendingBake.current = false;
  });

  return (
    <group ref={root} position={[0, -0.2, 0]} scale={1.05}>
      <primitive object={cloned} />
    </group>
  );
}

function ZoomBinder({
  controlsRef,
}: {
  controlsRef: React.MutableRefObject<OrbitLike | null>;
}) {
  const { controls } = useThree();
  useEffect(() => {
    controlsRef.current = (controls as unknown as OrbitLike | null) ?? null;
  }, [controls, controlsRef]);
  return null;
}

useGLTF.preload(MODEL_PATH);

export function StudioTeeViewport({
  color,
  printUrl,
  printRevision,
  className,
  controlsRef,
}: {
  color: string;
  printUrl: string | null;
  printRevision: number;
  className?: string;
  controlsRef?: React.MutableRefObject<OrbitLike | null>;
}) {
  const localControls = useRef<OrbitLike | null>(null);
  const ref = controlsRef ?? localControls;

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.4, 2.8], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.75]}
        style={{ touchAction: "none" }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none";
        }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1.15} />
        <directionalLight position={[-2, 1, -2]} intensity={0.4} />
        <Suspense fallback={null}>
          <TeeMesh
            color={color}
            printUrl={printUrl}
            printRevision={printRevision}
          />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          zoomSpeed={1.1}
          minDistance={0.9}
          maxDistance={9}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI - 0.15}
          target={[0, 0.35, 0]}
        />
        <ZoomBinder controlsRef={ref} />
      </Canvas>
    </div>
  );
}

export function zoomStudioTee(
  controls: OrbitLike | null,
  direction: "in" | "out",
) {
  if (!controls) return;
  const cam = controls.object;
  const target = controls.target;
  const offset = new THREE.Vector3().subVectors(cam.position, target);
  const next = offset.clone().multiplyScalar(direction === "in" ? 0.82 : 1.22);
  const dist = next.length();
  const min = controls.minDistance || 0.9;
  const max = controls.maxDistance || 9;
  if (dist < min || dist > max) return;
  cam.position.copy(target).add(next);
  controls.update();
}
