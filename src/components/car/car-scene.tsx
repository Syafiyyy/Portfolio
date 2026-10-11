"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import { SCAN } from "@/data/site";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { applyScan, createCloudMaterial, createScanPlaneMaterial, createScanUniforms, MAX_ZONES, type ScanUniforms } from "./scan-material";

type Part = (typeof SCAN.parts)[number]["part"];
type Zone = { min: THREE.Vector3Tuple; max: THREE.Vector3Tuple; label: THREE.Vector3Tuple };

/*
  The car's profile. The model is normalised to a fixed frame: front is +Z,
  2.55 long, wheels on y = 0.
    zones   damage boxes in car space (front bumper, right-hand headlamp);
            `label` is where each label is pinned. The shader takes zone 0
            as the bumper and zone 1 as the headlamp (SCAN.parts order)
    dent    the bumper dent, on its front face, kept to what the label
            says: moderate
    top     where the scan plane starts, just above the roof
    env     studio reflections for the metallic paint (three's procedural
            RoomEnvironment, nothing downloaded), per theme
*/
type Profile = {
  src: string;
  zones: Record<Part, Zone>;
  dent: { x: number; y: number; radius: number; depth: number };
  camera: THREE.Vector3Tuple;
  target: THREE.Vector3Tuple;
  top: number;
  env: { dark: number; light: number };
};
// "Car Concept" by Eric Chadwick, Khronos glTF Sample Assets (CC BY 4.0),
// modified: logos removed, simplified, recoloured (see README). 0.67 tall.
// Boxes from its meshes: BodyPanelsColor2's front, BodyHeadlights' right half.
const P: Profile = {
  src: "/models/car.glb",
  zones: {
    bumper: { min: [-0.56, 0.04, 1.14], max: [0.56, 0.2, 1.3], label: [-0.42, 0.12, 1.25] },
    headlamp: { min: [0.17, 0.345, 1.08], max: [0.48, 0.415, 1.2], label: [0.33, 0.38, 1.17] },
  },
  dent: { x: -0.3, y: 0.12, radius: 0.09, depth: 0.06 },
  camera: [2.9, 1.15, 3.2],
  target: [0, 0.3, 0],
  top: 0.85,
  env: { dark: 0.55, light: 0.8 },
};
const MODEL = P.src;
const ZONES = P.zones;
const DENT = P.dent;
export const PARTS = SCAN.parts.slice(0, MAX_ZONES);

// Scan cycle, seconds.
const SWEEP = 1.8; // plane travels top → bottom
const CLOUD_OUT = 0.7; // point cloud resolves back into the solid car
const HOLD_UNTIL = 4.3; // damage stays lit until here
const FADE = 0.5;
const CYCLE = 5.6;
const TOP = P.top;
const BOTTOM = -0.05;
const sweepEase = gsap.parseEase("power1.inOut");

// One car per page, so the scan state lives at module scope and the frame
// loop mutates it directly (no React state per frame).
const uniforms: ScanUniforms = createScanUniforms();
PARTS.forEach((p, i) => {
  uniforms.uZoneMin.value[i].fromArray(ZONES[p.part].min);
  uniforms.uZoneMax.value[i].fromArray(ZONES[p.part].max);
});
uniforms.uDent.value.set(DENT.x, DENT.y, DENT.radius, DENT.depth);
const carView = new THREE.Matrix4();
const toCam = new THREE.Vector3();
const front = new THREE.Vector3();
const anchor = new THREE.Vector3();

const CAMERA = P.camera;
const TARGET = P.target;

export type SceneColors = { sky: string; amber: string; theme: "dark" | "light" };

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
        <Car colors={colors} reduced={reduced} lowEnd={lowEnd} cued={cued} labels={labels} onReady={onReady} onFirstScan={onFirstScan} />
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

function Car({
  colors,
  reduced,
  lowEnd,
  cued,
  labels,
  onReady,
  onFirstScan,
}: Pick<Props, "colors" | "reduced" | "lowEnd" | "cued" | "labels" | "onReady" | "onFirstScan">) {
  const { scene } = useGLTF(MODEL, false, true);
  const invalidate = useThree((s) => s.invalidate);
  const root = useRef<THREE.Group>(null);
  const plane = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Points>(null);
  const state = useRef({ rise: reduced ? 1 : 0, scanClock: -1, readySent: false, scanned: false });


  // Every material on the car gets the scan patch (one clone each, shared
  // by the meshes that use it).
  const model = useMemo(() => {
    const car = scene.clone(true);
    const patched = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    car.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const src = o.material as THREE.MeshStandardMaterial;
      let m = patched.get(src);
      if (!m) {
        m = src.clone();
        applyScan(m, uniforms);
        patched.set(src, m);
      }
      o.material = m;
    });
    return car;
  }, [scene]);

  const planeMaterial = useMemo(() => createScanPlaneMaterial(uniforms), []);

  // Studio reflections for the metallic paint (see Profile.env): built once,
  // its strength follows the theme.
  const getThree = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene: threeScene } = getThree();
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    threeScene.environment = env;
    return () => {
      threeScene.environment = null;
      env.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [getThree]);
  useEffect(() => {
    getThree().scene.environmentIntensity = P.env[colors.theme];
    invalidate();
  }, [colors.theme, getThree, invalidate]);

  // The point cloud: points spread over the car's surface by area, nudged
  // out along the normal so they sit just on top of it. None for reduced
  // motion (there is no scan); fewer on low-end devices.
  const cloud = useMemo(() => {
    if (reduced) return null;
    const total = lowEnd ? 3500 : 9000;
    model.updateMatrixWorld(true);
    const meshes: { mesh: THREE.Mesh; sampler: MeshSurfaceSampler; area: number }[] = [];
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const sampler = new MeshSurfaceSampler(o).build();
      const dist = (sampler as unknown as { distribution: Float32Array }).distribution;
      meshes.push({ mesh: o, sampler, area: dist[dist.length - 1] ?? 0 });
    });
    const sum = meshes.reduce((a, m) => a + m.area, 0) || 1;
    const positions: number[] = [];
    const seeds: number[] = [];
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const normalMatrix = new THREE.Matrix3();
    for (const m of meshes) {
      normalMatrix.getNormalMatrix(m.mesh.matrixWorld);
      const count = Math.round((m.area / sum) * total);
      for (let i = 0; i < count; i++) {
        m.sampler.sample(p, n);
        p.applyMatrix4(m.mesh.matrixWorld);
        n.applyMatrix3(normalMatrix).normalize();
        p.addScaledVector(n, 0.012);
        positions.push(p.x, p.y, p.z);
        // Stable per-point phase for the twinkle (a hash, not Math.random).
        const k = positions.length / 3;
        seeds.push(Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
    const material = createCloudMaterial(uniforms);
    return new THREE.Points(geometry, material);
  }, [model, reduced, lowEnd]);
  useEffect(() => () => {
    cloud?.geometry.dispose();
    (cloud?.material as THREE.Material | undefined)?.dispose();
  }, [cloud]);

  useEffect(() => {
    uniforms.uSky.value.set(colors.sky);
    uniforms.uAmber.value.set(colors.amber);
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


  useFrame(({ clock, camera, size, viewport }, rawDelta) => {
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
    uniforms.uCarNormal.value.setFromMatrix4(carView.multiplyMatrices(camera.matrixWorldInverse, g.matrixWorld));
    uniforms.uTime.value = t;
    const pts = cloudRef.current;
    if (pts) (pts.material as THREE.ShaderMaterial).uniforms.uSize.value = 40 * viewport.dpr;

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
      // Room either side of the pin, so narrow-screen labels stay inside.
      l.style.setProperty("--x", `${x.toFixed(0)}px`);
      l.style.setProperty("--room", `${(size.width - x - 14).toFixed(0)}px`);
      l.style.opacity = (uniforms.uDamage.value[i] * facing).toFixed(3);
    });

    if (reduced) return;

    let scanOn = 0;
    let cloudOn = 0;
    if (s.scanClock >= 0) {
      s.scanClock = (s.scanClock + dt) % CYCLE;
      const c = s.scanClock;
      const sweep = Math.min(c / SWEEP, 1);
      uniforms.uScanY.value = THREE.MathUtils.lerp(TOP, BOTTOM, sweepEase(sweep));
      scanOn = c < 0.15 ? c / 0.15 : c < SWEEP - 0.2 ? 1 : Math.max(0, (SWEEP - c) / 0.2);
      // The cloud builds behind the line, then resolves back into the car.
      cloudOn = c < 0.15 ? c / 0.15 : c < SWEEP ? 1 : Math.max(0, 1 - (c - SWEEP) / CLOUD_OUT);

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
    uniforms.uCloud.value = cloudOn;
    if (pts) pts.visible = cloudOn > 0.001;
    if (plane.current) {
      plane.current.visible = scanOn > 0.001;
      plane.current.position.y = uniforms.uScanY.value;
    }
  });

  return (
    <>
      <group ref={root}>
        <primitive object={model} />
        {cloud && <primitive ref={cloudRef} object={cloud} visible={false} />}
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
