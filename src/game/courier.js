import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const RIGGED_URL = 'models/courier-b.fbx';   // Mixamo auto-rig, T-pose
const TARGET_HEIGHT = 2.1;

/** The authored texture is darker than the city. Colour is not clamped to 1 in
 *  three, so this lifts her out of the road without touching the texture. */
const LIFT = 1.42;

/**
 * Loads the courier and conditions her for the game.
 *
 * One source: `courier-b.fbx`, the Mixamo auto-rigged mesh. The original
 * untextured glTF used to ship alongside it as a fallback, but it never ran,
 * and it and its texture atlas cost 5.7 MB of every install. The fallback is
 * now the procedural courier in `player.js`, which is code and weighs nothing.
 *
 * TEXTURE NOTE. She is deliberately untextured. Mixamo did not just rig the
 * model, it reprocessed the geometry, and the UV layout no longer matches the
 * original atlas: applying it produces marbled garbage, verified lit, unlit
 * and with flipY both ways. She wears a painted pink/blue/violet ramp instead.
 * The real fix is upstream, re-uploading her to Mixamo WITH the texture so it
 * comes back on a UV set that matches.
 *
 * The export ships no normals and three does not synthesise them, so the mesh
 * renders unlit until `computeVertexNormals()`, and it arrives about one unit
 * tall centred on the origin rather than standing on the floor.
 *
 * Resolves to null if it fails, so the caller keeps the procedural placeholder
 * rather than dropping the player into an empty scene.
 */
export async function loadCourier(materials, { outline = true } = {}) {
  const loaded = await loadRigged();
  if (!loaded) return null;

  const { model, skinned } = loaded;
  const map = null;

  for (const mesh of meshesOf(model)) {
    if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
    const previous = mesh.material;
    mesh.material = map
      ? new THREE.MeshToonMaterial({
        map,
        color: new THREE.Color(LIFT, LIFT, LIFT),
        gradientMap: materials.toon.gradientMap,
        // A floor under her shadows. Without it she disappears into the road
        // in the night zones, where the key light is deliberately weak.
        emissive: new THREE.Color(0x3a2b4d),
        side: THREE.DoubleSide,
      })
      : (paintByHeight(mesh.geometry), new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.86,
        roughness: 0.26,
        envMapIntensity: 1.25,
        emissive: new THREE.Color(0x2a1d3d),
        side: THREE.DoubleSide,
      }));
    if (previous && previous.dispose) previous.dispose();
    mesh.frustumCulled = false;
  }

  // Normalise scale and stand her on the floor.
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const scale = TARGET_HEIGHT / (size.y || 1);

  const rig = new THREE.Group();
  model.scale.multiplyScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  rig.add(model);

  if (outline) addOutline(model, materials.outline);

  rig.userData.skinned = skinned;
  return rig;
}

/**
 * Paints the untextured rigged mesh with a vertical pink / blue / violet ramp
 * baked into vertex colours.
 *
 * Vertex colours rather than a shader gradient because they travel with the
 * skin: once baked in the bind pose, a raised knee keeps its own colour
 * instead of sliding through the ramp as she moves.
 */
function paintByHeight(geometry) {
  const pos = geometry.attributes.position;
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const span = (max.y - min.y) || 1;

  // bottom to top: violet boots, blue mid, hot pink shoulders and head
  const ramp = [
    [0.00, new THREE.Color('#7c4dd6')],
    [0.34, new THREE.Color('#5b8fe0')],
    [0.58, new THREE.Color('#62cfff')],
    [0.78, new THREE.Color('#ff5db1')],
    [1.00, new THREE.Color('#ffd9ee')],
  ];

  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) - min.y) / span, 0, 1);
    let a = ramp[0];
    let b = ramp[ramp.length - 1];
    for (let k = 0; k < ramp.length - 1; k++) {
      if (t >= ramp[k][0] && t <= ramp[k + 1][0]) { a = ramp[k]; b = ramp[k + 1]; break; }
    }
    const k = (t - a[0]) / ((b[0] - a[0]) || 1);
    c.copy(a[1]).lerp(b[1], k);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function meshesOf(root) {
  const out = [];
  root.traverse((o) => { if (o.isMesh) out.push(o); });
  return out;
}

async function loadRigged() {
  try {
    const fbx = await new FBXLoader().loadAsync(RIGGED_URL);
    let skinned = false;
    fbx.traverse((o) => { if (o.isSkinnedMesh) skinned = true; });
    if (!skinned) throw new Error('rigged export has no SkinnedMesh');
    // The T-pose export carries a one-frame clip; the real ones load separately.
    fbx.animations.length = 0;
    return { model: fbx, skinned: true };
  } catch (err) {
    console.warn('[soda] rigged courier failed to load, keeping placeholder', err);
    return null;
  }
}

/**
 * Inverted-hull outline. A skinned mesh needs a skinned hull bound to the same
 * skeleton, otherwise the outline stays in the bind pose while she moves.
 */
function addOutline(model, material) {
  for (const mesh of meshesOf(model)) {
    if (mesh.isSkinnedMesh) {
      const hull = new THREE.SkinnedMesh(mesh.geometry, material);
      hull.bind(mesh.skeleton, mesh.bindMatrix);
      hull.frustumCulled = false;
      hull.scale.setScalar(1.03);
      mesh.parent.add(hull);
    } else {
      const hull = new THREE.Mesh(mesh.geometry, material);
      hull.frustumCulled = false;
      hull.scale.setScalar(1.045);
      mesh.add(hull);
    }
  }
}
