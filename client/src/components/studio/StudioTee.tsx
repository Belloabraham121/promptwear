"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import type { PatternPanel } from "@/lib/dashboard/types";
import { PATTERN_PANELS } from "@/lib/dashboard/types";
import { ATLAS_SIZE, uvRectToPixels } from "@/lib/studio/atlas";
import {
  getStudioGarment,
  type StudioGarmentId,
} from "@/lib/studio/garments";
import {
  getGarmentPanelShape,
  outlineToAtlasPoints,
  strokeOutline,
} from "@/lib/studio/panelShapeUtils";

type OrbitLike = {
  object: THREE.Camera;
  target: THREE.Vector3;
  update: () => void;
  minDistance: number;
  maxDistance: number;
};

export type PanelPrintMap = Partial<Record<PatternPanel, string | null>>;

type TeeMeshProps = {
  garmentId: StudioGarmentId;
  color: string;
  panelPrints: PanelPrintMap;
  printRevision: number;
};

function drawContained(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw =
    "naturalWidth" in img
      ? (img as HTMLImageElement).naturalWidth
      : (img as ImageBitmap).width;
  const ih =
    "naturalHeight" in img
      ? (img as HTMLImageElement).naturalHeight
      : (img as ImageBitmap).height;
  if (!iw || !ih) return;
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function prepareGeometry(geometry: THREE.BufferGeometry, useNormalMap: boolean) {
  // Keep authored CLO/mesh normals — recomputing on dense cloth creates faceting.
  if (!geometry.getAttribute("normal")) {
    geometry.computeVertexNormals();
  }
  if (useNormalMap && geometry.getAttribute("uv")) {
    // Indexed geometry is required for stable tangents; skip if missing.
    if (geometry.getIndex()) {
      try {
        geometry.computeTangents();
      } catch {
        // Fall through without tangents — material will drop normalMap below.
      }
    }
  }
}

function TeeMesh({
  garmentId,
  color,
  panelPrints,
  printRevision,
}: TeeMeshProps) {
  const garment = getStudioGarment(garmentId);
  const { scene } = useGLTF(garment.modelPath);
  const normalPath = garment.normalPath;
  const normalMap = useTexture(
    normalPath ?? "/models/studio/textures/normal.png",
  );
  const atlasRef = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);
  const imagesRef = useRef<Partial<Record<PatternPanel, HTMLImageElement>>>({});
  const bakeKey = useRef("");
  const pendingBake = useRef(true);
  const loadGen = useRef(0);

  const cloned = useMemo(() => scene.clone(true), [scene]);

  const frame = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const targetH = 1.65;
    const scale = size.y > 1e-5 ? targetH / size.y : 1;
    return { center, scale };
  }, [cloned]);

  useLayoutEffect(() => {
    // Oversized CLO mesh uses a unified UV atlas. A tiling fabric NRM on those
    // UVs reads as dense triangular noise; only apply a true atlas normal, and
    // keep strength low. Classic keeps its packed-island normal map.
    const useNormalMap = garmentId === "classic" || !!garment.normalPath;
    const oversized = garmentId === "oversized";

    if (useNormalMap) {
      normalMap.colorSpace = THREE.NoColorSpace;
      normalMap.flipY = false;
      normalMap.wrapS = THREE.ClampToEdgeWrapping;
      normalMap.wrapT = THREE.ClampToEdgeWrapping;
      normalMap.needsUpdate = true;
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
    texture.needsUpdate = true;
    atlasRef.current = { canvas, ctx, texture };

    const mats: THREE.MeshStandardMaterial[] = [];
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const geometry = mesh.geometry as THREE.BufferGeometry;
      prepareGeometry(geometry, useNormalMap && !oversized);

      // Oversized: solid albedo + soft shading only. Geometry already carries
      // cloth folds; atlas/flat normals + DoubleSide produced black fragments.
      const hasTangents = !!geometry.getAttribute("tangent");
      const applyNormal =
        useNormalMap && !oversized && hasTangents ? normalMap : null;

      const mat = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        map: texture,
        normalMap: applyNormal,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: oversized ? 0.78 : 0.88,
        metalness: 0.02,
        // FrontSide avoids backface dark triangles on thin CLO shells
        side: THREE.FrontSide,
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
        m.normalMap = null;
        m.dispose();
      });
    };
  }, [cloned, normalMap, garmentId, garment.normalPath]);

  useEffect(() => {
    const gen = ++loadGen.current;
    pendingBake.current = true;
    const next: Partial<Record<PatternPanel, HTMLImageElement>> = {};

    const jobs = PATTERN_PANELS.map(
      (panel) =>
        new Promise<void>((resolve) => {
          const url = panelPrints[panel];
          if (!url) {
            resolve();
            return;
          }
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            if (gen !== loadGen.current) {
              resolve();
              return;
            }
            next[panel] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        }),
    );

    void Promise.all(jobs).then(() => {
      if (gen !== loadGen.current) return;
      imagesRef.current = next;
      pendingBake.current = true;
    });
  }, [panelPrints, printRevision]);

  useFrame(() => {
    const atlas = atlasRef.current;
    if (!atlas) return;

    const loaded = PATTERN_PANELS.map((p) =>
      imagesRef.current[p] ? p : "",
    ).join("|");
    const key = `${garmentId}|${color}|${printRevision}|${loaded}`;
    if (!pendingBake.current && key === bakeKey.current) return;

    const waiting = PATTERN_PANELS.some(
      (p) => panelPrints[p] && !imagesRef.current[p],
    );
    if (waiting) return;

    const { ctx, texture } = atlas;
    const size = ATLAS_SIZE;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    const order: PatternPanel[] = [
      "front",
      "back",
      "sleeveL",
      "sleeveR",
      "collar",
    ];
    for (const panel of order) {
      const img = imagesRef.current[panel];
      if (!img) continue;
      const shape = getGarmentPanelShape(garmentId, panel);
      const { x, y, w, h } = uvRectToPixels(shape.uvRect, size);
      const poly = outlineToAtlasPoints(shape, size);
      ctx.save();
      strokeOutline(ctx, poly);
      ctx.clip();
      drawContained(ctx, img, x, y, w, h);
      ctx.restore();
    }

    texture.needsUpdate = true;
    bakeKey.current = key;
    pendingBake.current = false;
  });

  const { center, scale } = frame;
  return (
    <group position={[0.55, 0.42, 0]} scale={scale}>
      <group position={[-center.x, -center.y, -center.z]}>
        <primitive object={cloned} />
      </group>
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

useGLTF.preload(getStudioGarment("classic").modelPath);
useGLTF.preload(getStudioGarment("oversized").modelPath);

export function StudioTeeViewport({
  garmentId,
  color,
  panelPrints,
  printRevision,
  className,
  controlsRef,
}: {
  garmentId: StudioGarmentId;
  color: string;
  panelPrints: PanelPrintMap;
  printRevision: number;
  className?: string;
  controlsRef?: React.MutableRefObject<OrbitLike | null>;
}) {
  const localControls = useRef<OrbitLike | null>(null);
  const ref = controlsRef ?? localControls;

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0.55, 0.55, 2.85], fov: 34 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.75]}
        style={{ touchAction: "none" }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none";
        }}
      >
        <ambientLight intensity={0.7} />
        <hemisphereLight color="#f3f0e8" groundColor="#1a1f1a" intensity={0.4} />
        <directionalLight position={[3.2, 4.2, 2.4]} intensity={1.05} />
        <directionalLight position={[-2.4, 1.8, -2.2]} intensity={0.35} />
        <Suspense fallback={null}>
          <TeeMesh
            key={garmentId}
            garmentId={garmentId}
            color={color}
            panelPrints={panelPrints}
            printRevision={printRevision}
          />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          zoomSpeed={1.1}
          minDistance={1.1}
          maxDistance={8}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI * 0.72}
          target={[0.55, 0.42, 0]}
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
  const min = controls.minDistance || 1.1;
  const max = controls.maxDistance || 8;
  if (dist < min || dist > max) return;
  cam.position.copy(target).add(next);
  controls.update();
}
