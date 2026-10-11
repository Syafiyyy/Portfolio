import * as THREE from "three";

export const MAX_ZONES = 2;

// Shared uniforms, mutated every frame by the scene. One object so every mesh
// on the car (body + 4 wheels) reads the same scan state.
export function createScanUniforms() {
  return {
    uTime: { value: 0 },
    uScanY: { value: 2 }, // world-space height of the scan plane
    uScanOn: { value: 0 }, // 0..1, fades the whole scan in and out
    uCloud: { value: 0 }, // 0..1, machine-vision view above the line (point cloud)
    uCarInv: { value: new THREE.Matrix4() }, // world → car space, so zones follow the car
    uCarNormal: { value: new THREE.Matrix3() }, // car → view rotation, for the dent's normals
    // The damage itself, in car space on the front faces:
    uDent: { value: new THREE.Vector4() }, // bumper dent: centre x, y, radius, depth
    uCrack: { value: new THREE.Vector4() }, // headlamp crack: centre x, y, radius, 0
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
  - the damage, always there: a shallow dent in the bumper (bent normals, a
    darker dish, light scuffs) and a short star crack in the headlamp
  - above the line while uCloud is up, the body dims to a dark silhouette
    so the point cloud (createCloudMaterial) reads as the scanner's view
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
varying vec3 vScanCar;
varying vec3 vScanCarN;`,
      )
      .replace(
        "#include <project_vertex>",
        /* glsl */ `#include <project_vertex>
vec4 scanWorld = modelMatrix * vec4(transformed, 1.0);
vScanWorld = scanWorld.xyz;
vScanCar = (uCarInv * scanWorld).xyz;
vScanCarN = normalize(mat3(uCarInv) * mat3(modelMatrix) * objectNormal);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
uniform float uTime;
uniform float uScanY;
uniform float uScanOn;
uniform float uCloud;
uniform mat3 uCarNormal;
uniform vec4 uDent;
uniform vec4 uCrack;
uniform vec3 uZoneMin[${MAX_ZONES}];
uniform vec3 uZoneMax[${MAX_ZONES}];
uniform float uDamage[${MAX_ZONES}];
uniform vec3 uSky;
uniform vec3 uAmber;
uniform vec3 uPaint;
varying vec3 vScanWorld;
varying vec3 vScanCar;
varying vec3 vScanCarN;`,
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
diffuseColor.rgb = mix(diffuseColor.rgb, uAmber, damage * 0.55);

// Damage only marks surfaces facing the front of the car.
float frontFace = smoothstep(0.75, 0.95, vScanCarN.z);

// Bumper dent: a shallow dish, h = (1 - q)^2 inside the radius. Its slope
// bends the normal below; the dish is a little darker (less light reaches
// in) and a few horizontal scuffs show bare, lighter material around it.
vec2 dentP = vScanCar.xy - uDent.xy;
float dentQ = dot(dentP, dentP) / (uDent.z * uDent.z);
float dentIn = frontFace * step(dentQ, 1.0) * step(uZoneMin[0].z, vScanCar.z);
vec2 dentSlope = dentIn * uDent.w * 2.0 * (1.0 - dentQ) * (-2.0 * dentP / (uDent.z * uDent.z));
float dish = dentIn * (1.0 - dentQ);
// A crease where the dent meets the undamaged panel.
float crease = frontFace * step(uZoneMin[0].z, vScanCar.z) * exp(-abs(sqrt(dentQ) - 1.0) * 16.0);
diffuseColor.rgb *= (1.0 - 0.32 * dish) * (1.0 - 0.35 * crease);
// Three short diagonal scratches trailing off the dent (bare, lighter).
vec2 sp = (dentP / uDent.z) * mat2(0.87, -0.5, 0.5, 0.87);
float scuffZone = frontFace * step(uZoneMin[0].z, vScanCar.z) * step(0.9, sp.x) * step(sp.x, 1.9) * step(abs(sp.y), 0.4);
float scuff = 1.0 - smoothstep(0.0, 0.035, abs(fract(sp.y * 3.0 + 0.5) - 0.5));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78), scuff * scuffZone * 0.45);

// Headlamp crack: a few radial lines from an impact point plus a small
// ring, kept short (a crack, not a smashed lamp).
vec2 crackP = vScanCar.xy - uCrack.xy;
float crackR = length(crackP) / uCrack.z;
float crackA = atan(crackP.y, crackP.x) / 6.2831853;
float spoke = abs(fract(crackA * 6.0 + 0.12 * sin(crackR * 11.0 + crackA * 19.0)) - 0.5);
float lamp = frontFace * step(uZoneMin[1].x, vScanCar.x) * step(vScanCar.x, uZoneMax[1].x)
  * step(uZoneMin[1].y, vScanCar.y) * step(vScanCar.y, uZoneMax[1].y) * step(uZoneMin[1].z, vScanCar.z);
float crack = lamp * max(
  (1.0 - smoothstep(0.0, 0.045, spoke)) * step(0.1, crackR) * (1.0 - smoothstep(0.55, 1.0, crackR)),
  exp(-abs(crackR - 0.12) * 45.0) * step(crackR, 0.3)
);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04), crack * 0.8);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
// The dent's slope, from car space into view space.
if (dentIn > 0.0) normal = normalize(mix(normal, normalize(uCarNormal * normalize(vec3(dentSlope, 1.0))), dentIn));`,
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
// Above the line, the scanner's view takes over: the body goes dark under
// the point cloud (diffuseColor still feeds the lighting that follows).
diffuseColor.rgb *= 1.0 - 0.82 * step(0.0, above) * uCloud;

// The amber glow holds back inside the crack and the dent so the damage
// itself stays readable while it is highlighted.
totalEmissiveRadiance += uAmber * damage * (0.55 + 0.25 * sin(uTime * 7.0))
  * (1.0 - 0.9 * crack) * (1.0 - 0.5 * dish) * (1.0 - 0.4 * crease);

float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);
totalEmissiveRadiance += uSky * rim * 0.28;`,
      );
  };
  // Distinct program key so three doesn't reuse an unpatched program.
  material.customProgramCacheKey = () => "car-scan-v2";
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

/*
  Point cloud: points sampled over the car's surface (car space), drawn only
  above the scan line while uCloud is up: what the scanner has seen so far.
  Brightest just above the line, sky-blue, amber inside a lit damage zone.
  Additive and depth-tested, so the solid car still hides the far side.
*/
export function createCloudMaterial(u: ScanUniforms) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uScanY: u.uScanY,
      uCloud: u.uCloud,
      uSky: u.uSky,
      uAmber: u.uAmber,
      uZoneMin: u.uZoneMin,
      uZoneMax: u.uZoneMax,
      uDamage: u.uDamage,
      uTime: u.uTime,
      uSize: { value: 1 },
    },
    vertexShader: /* glsl */ `
uniform float uScanY;
uniform float uCloud;
uniform float uTime;
uniform float uSize;
uniform vec3 uZoneMin[${MAX_ZONES}];
uniform vec3 uZoneMax[${MAX_ZONES}];
uniform float uDamage[${MAX_ZONES}];
attribute float aSeed;
varying float vAlpha;
varying float vDamage;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  float above = world.y - uScanY;
  float near = exp(-max(above, 0.0) * 14.0);
  float twinkle = 0.75 + 0.25 * sin(uTime * 3.0 + aSeed * 40.0);
  vAlpha = step(0.0, above) * uCloud * (0.5 + 0.5 * near) * twinkle;
  vDamage = 0.0;
  for (int i = 0; i < ${MAX_ZONES}; i++) {
    vec3 inside = step(uZoneMin[i] - 0.02, position) * step(position, uZoneMax[i] + 0.02);
    vDamage = max(vDamage, inside.x * inside.y * inside.z * uDamage[i]);
  }
  vec4 mv = viewMatrix * world;
  gl_PointSize = uSize * (1.0 + 1.2 * near + vDamage) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: /* glsl */ `
uniform vec3 uSky;
uniform vec3 uAmber;
varying float vAlpha;
varying float vDamage;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5 || vAlpha < 0.01) discard;
  float a = vAlpha * (1.0 - smoothstep(0.25, 0.5, d));
  gl_FragColor = vec4(mix(uSky, uAmber, vDamage) * a, a);
}`,
  });
}
