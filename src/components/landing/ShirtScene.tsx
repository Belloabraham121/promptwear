"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
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

const MODEL_PATH = "/models/walking-tshirt.glb?v=hq1";

function makePrintTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#d6ff3c";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(110, 200);
  ctx.bezierCurveTo(180, 90, 340, 90, 400, 210);
  ctx.bezierCurveTo(340, 320, 180, 320, 110, 200);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(256, 250, 70, 0.2, Math.PI * 1.7);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(160, 380);
  ctx.lineTo(352, 380);
  ctx.moveTo(200, 420);
  ctx.lineTo(312, 420);
  ctx.stroke();

  ctx.fillStyle = "#d6ff3c";
  ctx.font = "800 42px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ONE OF ONE", 256, 500);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
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
      p < 0.28 ? 1 - p / 0.28 : Math.max(0, 1 - (p - 0.28) * 4);
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

function WalkingShirt({ progress }: SceneProps) {
  const root = useRef<THREE.Group>(null);
  const printMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const walkAction = useRef<THREE.AnimationAction | null>(null);
  const currentColor = useMemo(() => new THREE.Color("#b0b1aa"), []);
  const targetColor = useMemo(() => new THREE.Color("#b0b1aa"), []);
  const printTexture = useMemo(makePrintTexture, []);

  const { scene, animations } = useGLTF(MODEL_PATH, true);
  // Keep original scene graph so morph animation targets bind correctly
  const { actions, names } = useAnimations(animations, root);

  useLayoutEffect(() => {
    const mats: THREE.MeshStandardMaterial[] = [];
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const hasMorphs = Boolean(
        mesh.morphTargetInfluences && mesh.morphTargetInfluences.length > 0,
      );
      const hasMorphNormals = Boolean(
        mesh.geometry?.morphAttributes?.normal?.length,
      );

      // Soft fabric shading — no flat facets
      if (mesh.geometry && !mesh.geometry.getAttribute("normal")) {
        mesh.geometry.computeVertexNormals();
      }

      const next = new THREE.MeshStandardMaterial({
        color: "#b0b1aa",
        roughness: 0.9,
        metalness: 0.015,
        side: THREE.DoubleSide,
        morphTargets: hasMorphs,
        morphNormals: hasMorphNormals,
        flatShading: false,
      });
      mesh.material = next;
      mats.push(next);
    });
    materialsRef.current = mats;
    return () => {
      mats.forEach((mat) => mat.dispose());
    };
  }, [scene]);

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

  useEffect(() => {
    return () => {
      printTexture.dispose();
    };
  }, [printTexture]);

  useFrame((_state, delta) => {
    const p = progress.current;

    if (root.current) {
      // Subtle sink synced to the walk cycle (2 soft steps per loop)
      const walk = walkAction.current;
      const cycle = walk && walk.getClip().duration > 0
        ? (walk.time % walk.getClip().duration) / walk.getClip().duration
        : 0;
      const sink = Math.sin(cycle * Math.PI * 2) * 0.028;
      root.current.position.y = THREE.MathUtils.damp(
        root.current.position.y,
        -0.15 + sink,
        3,
        delta,
      );

      // Gentle scroll-driven turn — don't fight the walk cycle
      const targetYaw = 0.2 + p * 0.35;
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
    materialsRef.current.forEach((mat) => mat.color.copy(currentColor));

    if (printMaterial.current) {
      const printOpacity =
        p < 0.28 ? 0 : p < 0.55 ? THREE.MathUtils.smoothstep(p, 0.28, 0.55) : 1;
      printMaterial.current.opacity = THREE.MathUtils.damp(
        printMaterial.current.opacity,
        printOpacity,
        5,
        delta,
      );
    }
  });

  return (
    <group
      ref={root}
      position={[1.7, -0.15, 0]}
      rotation={[0.05, 0.45, 0]}
      scale={1.15}
    >
      <primitive object={scene} />
      <mesh position={[0, 0.3, 0.5]}>
        <planeGeometry args={[1.05, 1.25]} />
        <meshBasicMaterial
          ref={printMaterial}
          map={printTexture}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
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
      camera={{ position: [0.9, 0.55, 6.8], fov: 34 }}
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
