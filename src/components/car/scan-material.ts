import * as THREE from "three";

export const MAX_ZONES = 2;

// Shared uniforms, mutated every frame by the scene. One object so every mesh
// on the car (body + 4 wheels) reads the same scan state.
export function createScanUniforms() {
  return {
    uTime: { value: 0 },
    uScanY: { value: 2 }, // world-space height of the scan plane
    uScanOn: { value: 0 }, // 0..1, fades the whole scan in and out
    uCarInv: { value: new THREE.Matrix4() }, // world → car space, so zones follow the car
    uZoneMin: { value: Array.from({ length: MAX_ZONES }, () => new THREE.Vector3()) },
    uZoneMax: { value: Array.from({ length: MAX_ZONES }, () => new THREE.Vector3()) },
    uDamage: { value: new Array<number>(MAX_ZONES).fill(0) }, // 0..1 per zone
    uSky: { value: new THREE.Color() },
    uAmber: { value: new THREE.Color() },
    uPaint: { value: new THREE.Color() },
  };
}
export type ScanUniforms = ReturnType<typeof createScanUniforms>;

/*
  Patches a MeshStandardMaterial with the scanner:
  - repaints the model's red body paint with a neutral tone (amber must stand out)
  - a thin sky-blue line where the surface crosses uScanY
  - faint horizontal contour slices just above the line, like a body scanner
  - amber glow inside each damage zone, scaled by uDamage
  - a soft sky-blue fresnel rim
*/
export function applyScan(material: THREE.MeshStandardMaterial, u: ScanUniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
uniform mat4 uCarInv;
varying vec3 vScanWorld;
varying vec3 vScanCar;`,
      )
      .replace(
        "#include <project_vertex>",
        /* glsl */ `#include <project_vertex>
vec4 scanWorld = modelMatrix * vec4(transformed, 1.0);
vScanWorld = scanWorld.xyz;
vScanCar = (uCarInv * scanWorld).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
uniform float uTime;
uniform float uScanY;
uniform float uScanOn;
uniform vec3 uZoneMin[${MAX_ZONES}];
uniform vec3 uZoneMax[${MAX_ZONES}];
uniform float uDamage[${MAX_ZONES}];
uniform vec3 uSky;
uniform vec3 uAmber;
uniform vec3 uPaint;
varying vec3 vScanWorld;
varying vec3 vScanCar;`,
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `#include <map_fragment>
// Kenney's body paint is a saturated coral; swap it for a neutral tone.
// Values are linear: paint ≈ (0.77, 0.11, 0.07); tail lamps (0.65, 0.04) stay red.
float paintMask = smoothstep(0.66, 0.72, diffuseColor.r)
  * smoothstep(0.06, 0.09, diffuseColor.g) * (1.0 - smoothstep(0.2, 0.3, diffuseColor.g));
diffuseColor.rgb = mix(diffuseColor.rgb, uPaint, paintMask);

float damage = 0.0;
for (int i = 0; i < ${MAX_ZONES}; i++) {
  vec3 outside = max(uZoneMin[i] - vScanCar, vScanCar - uZoneMax[i]);
  float edge = max(outside.x, max(outside.y, outside.z));
  damage = max(damage, (1.0 - smoothstep(0.0, 0.05, edge)) * uDamage[i]);
}
diffuseColor.rgb = mix(diffuseColor.rgb, uAmber, damage * 0.55);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
// Scan line: distance of this fragment from the plane.
float above = vScanWorld.y - uScanY;
float scanLine = exp(-abs(above) * 70.0);
// Contour slices trailing above the line, fading with distance.
float slice = smoothstep(0.82, 1.0, abs(fract(vScanCar.y * 16.0) - 0.5) * 2.0);
float trail = step(0.0, above) * exp(-above * 5.0);
totalEmissiveRadiance += uSky * (scanLine * 2.2 + slice * trail * 0.35) * uScanOn;

totalEmissiveRadiance += uAmber * damage * (0.55 + 0.25 * sin(uTime * 7.0));

float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);
totalEmissiveRadiance += uSky * rim * 0.28;`,
      );
  };
  // Distinct program key so three doesn't reuse an unpatched program.
  material.customProgramCacheKey = () => "car-scan-v1";
  material.needsUpdate = true;
}

// The horizontal plane itself: a soft disc of grid with a bright rim line,
// drawn at uScanY. Transparent, no depth write, so it never hides the car.
export function createScanPlaneMaterial(u: ScanUniforms) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uScanOn: u.uScanOn, uSky: u.uSky },
    vertexShader: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: /* glsl */ `
uniform float uScanOn;
uniform vec3 uSky;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float disc = 1.0 - smoothstep(0.9, 1.0, r);
  vec2 cell = abs(fract(vUv * 18.0) - 0.5);
  float grid = 1.0 - smoothstep(0.0, 0.06, 0.5 - max(cell.x, cell.y));
  float ring = exp(-abs(r - 0.88) * 40.0);
  float a = (grid * 0.22 * (1.0 - r) + 0.04 * (1.0 - r) + ring * 0.55) * disc * uScanOn;
  gl_FragColor = vec4(uSky, a);
}`,
  });
}
