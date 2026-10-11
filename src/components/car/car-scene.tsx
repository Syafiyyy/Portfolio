"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import { SCAN } from "@/data/site";
import { applyScan, createScanPlaneMaterial, createScanUniforms, MAX_ZONES, type ScanUniforms } from "./scan-material";

const MODEL = "/models/car.glb";

/*
  Damage zones in car space (Kenney sedan: front is +Z, 2.55 long, 1.3 tall).
  Boxes were measured from the model's texture regions: the grey front bumper
  and the yellow right-hand headlamp. `label` is where each label is pinned.
*/
const ZONES: Record<(typeof SCAN.parts)[number]["part"], { min: THREE.Vector3Tuple; max: THREE.Vector3Tuple; label: THREE.Vector3Tuple }> = {
  bumper: { min: [-0.72, 0.15, 1.05], max: [0.72, 0.47, 1.34], label: [-0.55, 0.3, 1.3] },
  headlamp: { min: [0.26, 0.56, 0.98], max: [0.7, 0.78, 1.3], label: [0.5, 0.67, 1.2] },
};
export const PARTS = SCAN.parts.slice(0, MAX_ZONES);

// Scan cycle, seconds.
const SWEEP = 1.8; // plane travels top → bottom
const HOLD_UNTIL = 4.3; // damage stays lit until here
const FADE = 0.5;
const CYCLE = 5.6;
const TOP = 1.45;
const BOTTOM = -0.05;
const sweepEase = gsap.parseEase("power1.inOut");

// One car per page, so the scan state lives at module scope and the frame
// loop mutates it directly (no React state per frame).
const uniforms: ScanUniforms = createScanUniforms();
PARTS.forEach((p, i) => {
  uniforms.uZoneMin.value[i].fromArray(ZONES[p.part].min);
  uniforms.uZoneMax.value[i].fromArray(ZONES[p.part].max);
});
const toCam = new THREE.Vector3();
const front = new THREE.Vector3();
const anchor = new THREE.Vector3();

const CAMERA: THREE.Vector3Tuple = [3.4, 1.75, 3.7];
const TARGET: THREE.Vector3Tuple = [0, 0.55, 0];

export type SceneColors = { sky: string; amber: string; paint: string };

type Props = {
  colors: SceneColors;
  reduced: boolean;
  lowEnd: boolean;
  active: boolean; // stage on screen
  cued: boolean; // stage scrolled into view: rise, then scan
  interactive: boolean;
  // DOM labels laid over the canvas, one per part; positioned every frame.
  labels: React.RefObject<(HTMLDivElement | null)[]>;
  onReady: () => void;
  onFirstScan: () => void;
};

export default function CarScene({ colors, reduced, lowEnd, active, cued, interactive, labels, onReady, onFirstScan }: Props) {
  const frameloop = !active ? "never" : reduced || lowEnd ? "demand" : "always";
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={frameloop}
      camera={{ position: CAMERA, fov: 30, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      {lowEnd && !reduced && active && <FrameCap fps={30} />}
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} />
      <directionalLight position={[-3, 2.5, -4.5]} intensity={2.6} color={colors.sky} />
      <Suspense fallback={null}>
        <Car colors={colors} reduced={reduced} cued={cued} labels={labels} onReady={onReady} onFirstScan={onFirstScan} />
      </Suspense>
      <OrbitControls
        enabled={interactive}
        target={TARGET}
        enableZoom={false}
        enablePan={false}
        enableDamping
        rotateSpeed={0.6}
        minAzimuthAngle={-0.15}
        maxAzimuthAngle={1.65}
        minPolarAngle={1.0}
        maxPolarAngle={1.45}
      />
    </Canvas>
  );
}

// On low-end devices: render on demand, ticked at a fixed rate.
function FrameCap({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

function Car({ colors, reduced, cued, labels, onReady, onFirstScan }: Pick<Props, "colors" | "reduced" | "cued" | "labels" | "onReady" | "onFirstScan">) {
  const { scene } = useGLTF(MODEL, false, true);
  const invalidate = useThree((s) => s.invalidate);
  const root = useRef<THREE.Group>(null);
  const plane = useRef<THREE.Mesh>(null);
  const state = useRef({ rise: reduced ? 1 : 0, scanClock: -1, readySent: false, scanned: false });


  // One patched material shared by every mesh on the car.
  const model = useMemo(() => {
    const car = scene.clone(true);
    let shared: THREE.MeshStandardMaterial | null = null;
    car.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (!shared) {
        shared = (o.material as THREE.MeshStandardMaterial).clone();
        applyScan(shared, uniforms);
      }
      o.material = shared;
    });
    return car;
  }, [scene]);

  const planeMaterial = useMemo(() => createScanPlaneMaterial(uniforms), []);

  useEffect(() => {
    uniforms.uSky.value.set(colors.sky);
    uniforms.uAmber.value.set(colors.amber);
    uniforms.uPaint.value.set(colors.paint);
    invalidate();
  }, [colors, invalidate]);

  // Reduced motion: no scan, damage shown and labelled, still.
  useEffect(() => {
    if (!reduced) return;
    uniforms.uDamage.value.fill(1);
    invalidate();
  }, [reduced, invalidate]);

  // Rise into view when the intro cues it; the first scan follows.
  useEffect(() => {
    if (reduced || !cued) return;
    const s = state.current;
    const tween = gsap.to(s, {
      rise: 1,
      duration: 0.9,
      ease: "power3.out",
      onComplete: () => {
        s.scanClock = 0;
      },
    });
    return () => {
      tween.kill();
    };
  }, [cued, reduced]);


  useFrame(({ clock, camera, size }, rawDelta) => {
    const g = root.current;
    if (!g) return;
    const s = state.current;
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();

    if (!s.readySent) {
      s.readySent = true;
      onReady();
    }

    // Slow sway keeps the damaged front in view while still turning.
    g.rotation.y = reduced ? 0 : Math.sin(t * 0.28) * 0.5;
    g.position.y = (s.rise - 1) * 0.45;
    g.updateMatrixWorld();
    uniforms.uCarInv.value.copy(g.matrixWorld).invert();
    uniforms.uTime.value = t;

    // Labels fade out when the front of the car turns away from the camera.
    front.set(0, 0, 1).applyQuaternion(g.quaternion);
    toCam.copy(camera.position).sub(g.position).setY(0).normalize();
    const facing = THREE.MathUtils.smoothstep(front.dot(toCam), 0.05, 0.35);

    // Pin each DOM label to its part's screen position.
    PARTS.forEach((p, i) => {
      const l = labels.current[i];
      if (!l) return;
      anchor.fromArray(ZONES[p.part].label).applyMatrix4(g.matrixWorld).project(camera);
      const x = ((anchor.x + 1) / 2) * size.width;
      const y = ((1 - anchor.y) / 2) * size.height;
      const lift = (1 - uniforms.uDamage.value[i]) * 4;
      l.style.transform = `translate(${x.toFixed(1)}px, ${(y + lift).toFixed(1)}px)`;
      l.style.opacity = (uniforms.uDamage.value[i] * facing).toFixed(3);
    });

    if (reduced) return;

    let scanOn = 0;
    if (s.scanClock >= 0) {
      s.scanClock = (s.scanClock + dt) % CYCLE;
      const c = s.scanClock;
      const sweep = Math.min(c / SWEEP, 1);
      uniforms.uScanY.value = THREE.MathUtils.lerp(TOP, BOTTOM, sweepEase(sweep));
      scanOn = c < 0.15 ? c / 0.15 : c < SWEEP - 0.2 ? 1 : Math.max(0, (SWEEP - c) / 0.2);

      PARTS.forEach((p, i) => {
        const z = ZONES[p.part];
        const centerY = (z.min[1] + z.max[1]) / 2 + g.position.y;
        // Lights up once the plane has passed the zone's centre, then fades.
        const d = c < HOLD_UNTIL ? Number(uniforms.uScanY.value < centerY) : Math.max(0, 1 - (c - HOLD_UNTIL) / FADE);
        const cur = uniforms.uDamage.value[i];
        uniforms.uDamage.value[i] = d > cur ? Math.min(d, cur + dt / 0.25) : d;
      });
      if (!s.scanned && c >= SWEEP) {
        s.scanned = true;
        onFirstScan();
      }
    }
    uniforms.uScanOn.value = scanOn;
    if (plane.current) {
      plane.current.visible = scanOn > 0.001;
      plane.current.position.y = uniforms.uScanY.value;
    }
  });

  return (
    <>
      <group ref={root}>
        <primitive object={model} />
        <ContactBlob />
      </group>
      <mesh ref={plane} rotation-x={-Math.PI / 2} material={planeMaterial} visible={false} renderOrder={2}>
        <planeGeometry args={[3.8, 3.8]} />
      </mesh>
    </>
  );
}

// Soft fake shadow under the car: cheaper than real shadows and never pops.
function ContactBlob() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
varying vec2 vUv;
void main() {
  float r = length((vUv - 0.5) * 2.0);
  gl_FragColor = vec4(0.0, 0.0, 0.0, (1.0 - smoothstep(0.2, 1.0, r)) * 0.45);
}`,
      }),
    [],
  );
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.005} material={material}>
      <planeGeometry args={[2.1, 3.3]} />
    </mesh>
  );
}

useGLTF.preload(MODEL, false, true);
