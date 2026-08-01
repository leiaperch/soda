import * as THREE from 'three';

/**
 * SODA art direction: cel-shaded pastel everywhere (cheap, reads at speed on a
 * small screen), chrome reserved for the things that matter to the player
 * (courier, rollers, RELAY gates, CELLS) so the important stuff is literally
 * the shiniest thing on screen.
 */

export const PALETTE = {
  deep: new THREE.Color('#1b0f2e'),
  road: new THREE.Color('#3b2360'),
  roadEdge: new THREE.Color('#f7e3cf'),
  pink: new THREE.Color('#ff7ac6'),
  mint: new THREE.Color('#7ff0d4'),
  lilac: new THREE.Color('#b79bff'),
  cream: new THREE.Color('#fff2e0'),
  peach: new THREE.Color('#ffb27a'),
  sky: new THREE.Color('#ffa9d4'),
  facade: [
    new THREE.Color('#ffc2e2'),
    new THREE.Color('#c9b6ff'),
    new THREE.Color('#a8ecda'),
    new THREE.Color('#ffd9b0'),
    new THREE.Color('#e9d5ff'),
    new THREE.Color('#bfe3ff'),
  ],
};

/**
 * Shared uniforms for the world-bend. The Ring is an orbital band, so the
 * track curves away and rolls as it recedes. Doing it in the vertex shader
 * costs nothing and sells the "you are on a giant ring" read instantly.
 * Collision stays in flat coordinates: the bend is purely a lie told to the eye.
 */
export const bendUniforms = {
  uPlayerZ: { value: 0 },
  uBendY: { value: 0.00085 },   // drop-off with distance
  uBendX: { value: 0.00042 },   // lateral curve of the ring
  uTime: { value: 0 },
};

const BEND_PARS = /* glsl */`
  uniform float uPlayerZ;
  uniform float uBendY;
  uniform float uBendX;
  uniform float uTime;
`;

// Replaces <project_vertex> wholesale so the bend is applied in *world* space,
// after the model and instance matrices. That makes it correct for merged
// chunks (identity matrix), pooled props (translation), spinning pickups
// (rotation) and InstancedMesh alike, with no per-case special pleading.
const BEND_PROJECT = /* glsl */`
  vec4 mvPosition = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  vec4 sodaWorld = modelMatrix * mvPosition;
  float sodaD = sodaWorld.z - uPlayerZ;
  float sodaD2 = sodaD * sodaD;
  sodaWorld.y -= sodaD2 * uBendY;
  sodaWorld.x += sodaD2 * uBendX;
  mvPosition = viewMatrix * sodaWorld;
  gl_Position = projectionMatrix * mvPosition;
`;

function applyBend(material, cacheKey) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPlayerZ = bendUniforms.uPlayerZ;
    shader.uniforms.uBendY = bendUniforms.uBendY;
    shader.uniforms.uBendX = bendUniforms.uBendX;
    shader.uniforms.uTime = bendUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${BEND_PARS}\nvoid main() {`)
      .replace('#include <project_vertex>', BEND_PROJECT);
  };
  material.customProgramCacheKey = () => cacheKey;
  return material;
}

/** 3-step ramp: the entire cel-shading look lives in this 4-pixel texture. */
function toonRamp() {
  const data = new Uint8Array([88, 132, 196, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

// Equirectangular needs a 2:1 canvas or the PMREM conversion degenerates.
function equirect(stops) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The sky the player actually sees. Stops come from the active zone. */
export function skyTexture(stops) {
  return equirect(stops || [
    [0.00, '#2a1450'],
    [0.28, '#7a3d9c'],
    [0.50, '#ff7ac6'],
    [0.68, '#ffb27a'],
    [0.82, '#ffe9c9'],
    [1.00, '#7ff0d4'],
  ]);
}

/**
 * The environment the chrome reflects. Deliberately NOT the same as the sky:
 * a mirror needs a hard horizon and a dark lower half to read as metal. Using
 * the pastel sky for both is exactly what makes chrome look like pink plastic.
 */
export function envTexture() {
  return equirect([
    [0.00, '#fff6e6'],
    [0.34, '#ffd9ee'],
    [0.49, '#ff7ac6'],
    [0.51, '#3a1f6a'],
    [0.72, '#1b0f2e'],
    [1.00, '#0d0718'],
  ]);
}

export function createMaterials(renderer) {
  const gradientMap = toonRamp();

  const toon = applyBend(new THREE.MeshToonMaterial({
    vertexColors: true,
    gradientMap,
    side: THREE.DoubleSide,
  }), 'soda-toon');

  const chrome = applyBend(new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 1.0,
    roughness: 0.22,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide,
  }), 'soda-chrome');

  // Emissive pass: toneMapped false keeps neon punchy while everything else
  // stays filmic. This is what makes lane strips and signage glow for free.
  const emissive = applyBend(new THREE.MeshBasicMaterial({
    vertexColors: true,
    toneMapped: false,
    side: THREE.DoubleSide,
  }), 'soda-emissive');

  const glass = applyBend(new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.1,
    roughness: 0.08,
    transparent: true,
    opacity: 0.42,
    envMapIntensity: 1.2,
    side: THREE.DoubleSide,
  }), 'soda-glass');

  // Additive light curtain. Used where a solid surface would read as a pane of
  // glass rather than as light: RELAY gates, holo signage.
  const beam = applyBend(new THREE.MeshBasicMaterial({
    vertexColors: true,
    toneMapped: false,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), 'soda-beam');

  const outline = new THREE.MeshBasicMaterial({
    color: 0x2a1450,
    side: THREE.BackSide,
    toneMapped: false,
  });
  applyBend(outline, 'soda-outline');

  return { toon, chrome, emissive, glass, beam, outline };
}
