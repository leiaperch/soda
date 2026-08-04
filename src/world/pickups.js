import * as THREE from 'three';
import { Builder, disposeGroup } from '../core/builder.js';
import { resolvePalette } from './props.js';
import { ROAD_HALF } from './chunks.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _c = new THREE.Color();
const shade = (color, m) => _c.copy(color).multiplyScalar(m).clone();

function tinted(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return geo;
}

/**
 * CELLS: chrome-ringed charge crystals. Two InstancedMeshes (ring + glowing
 * core) so the whole field of pickups costs exactly two draw calls no matter
 * how many are on screen.
 */
export class CellPool {
  constructor(scene, materials, max = 96) {
    this.max = max;
    // The glow has to be on the OUTSIDE: a chrome shell around an emissive
    // core just hides the light. Chrome is reduced to a ring orbiting it.
    const ring = tinted(new THREE.TorusGeometry(0.62, 0.07, 6, 14), new THREE.Color('#fff4e8'));
    const core = tinted(new THREE.OctahedronGeometry(0.44, 0), new THREE.Color('#6ff2d2').multiplyScalar(1.5));

    this.ringMesh = new THREE.InstancedMesh(ring, materials.chrome, max);
    this.coreMesh = new THREE.InstancedMesh(core, materials.emissive, max);
    for (const m of [this.ringMesh, this.coreMesh]) {
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      scene.add(m);
    }
  }

  update(items, time) {
    const n = Math.min(items.length, this.max);
    for (let i = 0; i < n; i++) {
      const c = items[i];
      _v.set(c.x, c.y + Math.sin(time * 3 + c.z * 0.2) * 0.18, c.z);
      _e.set(0.4, time * 2.2 + i, 0);
      _q.setFromEuler(_e);
      _m.compose(_v, _q, _s);
      this.ringMesh.setMatrixAt(i, _m);
      this.coreMesh.setMatrixAt(i, _m);
    }
    this.ringMesh.count = n;
    this.coreMesh.count = n;
    this.ringMesh.instanceMatrix.needsUpdate = true;
    this.coreMesh.instanceMatrix.needsUpdate = true;
  }
}

/**
 * POWER-UPS: a caged bubble with a glowing core.
 *
 * Bigger than a CELL and shaped differently on purpose. A pickup that only
 * differs by colour is a pickup the player grabs by accident; the silhouette
 * has to say "this is not the usual thing" before the colour says which one.
 * The core is tinted per instance, so all three kinds cost two draw calls.
 */
export class PowerPool {
  constructor(scene, materials, max = 8) {
    this.max = max;

    // A can, because the game is called SODA. The first version was an
    // abstract caged bubble and it read at distance as a coloured lump with no
    // shape at all. A recognisable object beats an abstract one every time:
    // the silhouette says "pickup" and the label colour says which.
    const b = new Builder();
    const white = new THREE.Color('#ffffff');
    b.cyl('chrome', 0, -0.52, 0, 0.40, 0.40, 1.04, 14, white);
    b.cyl('chrome', 0, 0.46, 0, 0.42, 0.33, 0.12, 14, white);
    b.cyl('chrome', 0, -0.60, 0, 0.33, 0.42, 0.12, 14, white);
    b.box('chrome', 0, 0.55, 0, 0.26, 0.05, 0.12, white);          // pull tab
    b.cyl('emissive', 0, -0.30, 0, 0.425, 0.425, 0.60, 14, white); // label band
    b.cyl('emissive', 0, 0.20, 0, 0.415, 0.415, 0.08, 14, white);  // top stripe
    b.cyl('emissive', 0, -0.42, 0, 0.415, 0.415, 0.08, 14, white); // bottom stripe
    const parts = b.toGroup(materials);
    const geomFor = (mat) => parts.children.find((c) => c.material === mat).geometry;

    this.bodyMesh = new THREE.InstancedMesh(geomFor(materials.chrome), materials.chrome, max);
    this.labelMesh = new THREE.InstancedMesh(geomFor(materials.emissive), materials.emissive, max);
    // A soft halo so it is spottable from the far end of a chunk. Dim base
    // colour on purpose: the material is additive and double sided, so this
    // gets multiplied by the label tint and then again by the bloom.
    this.haloMesh = new THREE.InstancedMesh(
      tinted(new THREE.IcosahedronGeometry(0.95, 1), new THREE.Color(0.09, 0.09, 0.09)),
      materials.beam, max,
    );

    for (const m of [this.haloMesh, this.bodyMesh, this.labelMesh]) {
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      scene.add(m);
    }
  }

  update(items, time) {
    const n = Math.min(items.length, this.max);
    for (let i = 0; i < n; i++) {
      const p = items[i];
      _v.set(p.x, p.y + Math.sin(time * 2.4 + i) * 0.2, p.z);
      // Tilted and spinning on its own axis, so the label sweeps past rather
      // than tumbling: a tumbling can is unreadable.
      _e.set(0.34, time * 2.1 + i, 0.12);
      _q.setFromEuler(_e);
      _m.compose(_v, _q, _s);
      this.bodyMesh.setMatrixAt(i, _m);
      this.labelMesh.setMatrixAt(i, _m);
      this.labelMesh.setColorAt(i, p.colour);

      const halo = 1 + Math.sin(time * 4 + i) * 0.07;
      _m.compose(_v, _q, _s.set(halo, halo, halo));
      this.haloMesh.setMatrixAt(i, _m);
      this.haloMesh.setColorAt(i, p.colour);
      _s.set(1, 1, 1);
    }
    for (const m of [this.haloMesh, this.bodyMesh, this.labelMesh]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}

/**
 * RELAY gates: the Pin Out checkpoint, and the single most important object on
 * the track, so it is built to be unmissable at 40 m/s.
 *
 * The first version was a half-torus with a sheet of glass across it, which
 * read as a shower screen. This one is a real gate: two heavy pylons, a
 * loaded gantry beam, chevrons painted on the road pointing into it, and an
 * additive light curtain instead of a solid pane. Additive is the whole
 * difference between "a surface" and "light".
 */
export class RelayPool {
  constructor(scene, materials, count = 5) {
    this.scene = scene;
    this.materials = materials;
    this.count = count;
    this.slots = [];
    this.template = null;
  }

  _buildTemplate(zone) {
    const pal = resolvePalette(zone);
    const b = new Builder();
    const half = ROAD_HALF + 1.3;
    // Raised, and the crossbar slimmed. At 6.4 with a full-height light
    // curtain the gate filled the middle of a phone screen and hid whatever
    // obstacle sat just past it — you were asked to read something you could
    // not see. A checkpoint should be unmissable at distance and out of the
    // way up close, which means high and thin, not big and bright.
    const top = 8.6;
    const glow = shade(pal.accentGlow, 1.5);
    const glow2 = shade(pal.edge, 1.45);

    // pylons
    for (const s of [-1, 1]) {
      const x = s * half;
      b.taper('chrome', x, 0, 0, 2.0, top, 2.0, 0.45, shade(pal.chrome, 0.92));
      b.box('toon', x, 0, 0, 2.3, 0.5, 2.3, shade(pal.accent, 0.8));
      for (let i = 0; i < 4; i++) {
        b.box('emissive', x, 0.9 + i * 1.35, 0, 2.05 - i * 0.12, 0.16, 2.05 - i * 0.12, glow);
      }
      b.cyl('emissive', x, 0.06, 0, 1.7, 1.7, 0.1, 12, shade(glow2, 0.8));
    }

    // gantry beam and its lit underside
    b.box('chrome', 0, top, 0, half * 2 + 2.0, 0.7, 1.4, shade(pal.chrome, 0.95));
    b.box('emissive', 0, top - 0.14, 0, half * 2 + 0.6, 0.18, 1.5, glow);
    for (let i = -3; i <= 3; i++) {
      b.box('emissive', i * 2.5, top + 0.7, 0, 1.5, 0.3, 1.2, shade(pal.lane, 1.25));
    }

    // Light curtain: banded so it fades upward without needing a gradient map.
    // Kept under 1.0 because six additive bands plus bloom will otherwise
    // clip to a white hole, which is exactly what happens at night.
    // Three bands, and they stop below head height. The curtain is the part
    // that actually occludes, so it now reads as a threshold on the floor
    // rather than as a screen hung across the road.
    for (let i = 0; i < 3; i++) {
      const y = 0.3 + i * 0.62;
      const k = 1 - i / 3.4;
      b.box('beam', 0, y, 0, half * 2 - 0.6, 0.58, 0.06, shade(glow2, 0.7 * k));
    }

    // Chevrons painted on the road, apex pointing INTO the gate (-Z).
    for (let i = 0; i < 3; i++) {
      const cz = 6 + i * 3.2;
      const k = 0.55 + i * 0.22;
      for (const s of [-1, 1]) {
        b.at(s * 1.7, 0, cz, -s * 0.62);
        b.box('emissive', 0, 0.04, 0, 0.55, 0.02, 4.4, shade(glow, k));
        b.pop();
      }
    }

    return b.toGroup(this.materials);
  }

  /** Rebuild for a zone. Geometry is shared across every live gate. */
  setZone(zone) {
    for (const g of this.slots) this.scene.remove(g);
    this.slots.length = 0;
    if (this.template) disposeGroup(this.template);

    this.template = this._buildTemplate(zone);
    for (let i = 0; i < this.count; i++) {
      const g = new THREE.Group();
      for (const child of this.template.children) {
        const mesh = new THREE.Mesh(child.geometry, child.material);
        mesh.frustumCulled = false;
        g.add(mesh);
      }
      g.visible = false;
      this.scene.add(g);
      this.slots.push(g);
    }
  }

  update(items, time) {
    for (let i = 0; i < this.slots.length; i++) {
      const g = this.slots[i];
      const item = items[i];
      if (!item) { g.visible = false; continue; }
      g.visible = true;
      g.position.set(0, 0, item.z);
      // A slow breathing scale on the whole gate reads at distance far better
      // than any flashing texture would.
      const pulse = 1 + Math.sin(time * 2.4 + i) * 0.012;
      g.scale.set(pulse, pulse, 1);
    }
  }
}

/**
 * The end of a zone. Deliberately not a bigger RELAY: a checkpoint means
 * "keep going" and a finish means "stop", so it has to read as a different
 * kind of object from a hundred metres out. Chequered banner, gold, and a
 * flat wall of light rather than a curtain you pass through.
 */
export class FinishGate {
  constructor(scene, materials) {
    this.scene = scene;
    this.materials = materials;
    this.group = null;
  }

  setZone(zone) {
    if (this.group) { this.scene.remove(this.group); disposeGroup(this.group); }
    const pal = resolvePalette(zone);
    const b = new Builder();
    const half = ROAD_HALF + 1.8;
    const top = 7.4;
    const gold = new THREE.Color('#ffd76a');
    const white = new THREE.Color('#fff6e0');

    for (const s of [-1, 1]) {
      const x = s * half;
      b.taper('chrome', x, 0, 0, 2.6, top, 2.6, 0.5, shade(white, 0.95));
      b.box('toon', x, 0, 0, 3.0, 0.6, 3.0, shade(gold, 0.85));
      for (let i = 0; i < 5; i++) {
        b.box('emissive', x, 0.9 + i * 1.3, 0, 2.7 - i * 0.14, 0.2, 2.7 - i * 0.14, shade(gold, 1.35));
      }
      b.dome('emissive', x, top, 0, 1.2, 1.0, 10, 4, shade(white, 1.3));
    }

    // banner with a chequered strip
    b.box('chrome', 0, top, 0, half * 2 + 2.6, 1.9, 2.2, shade(white, 0.95));
    const cells = 18;
    const cw = (half * 2) / cells;
    for (let i = 0; i < cells; i++) {
      const x = -half + cw * (i + 0.5);
      for (let row = 0; row < 2; row++) {
        const dark = (i + row) % 2 === 0;
        b.box(dark ? 'toon' : 'emissive', x, top + 0.15 + row * 0.72, 1.15,
          cw * 0.98, 0.7, 0.08, dark ? new THREE.Color('#241436') : shade(white, 1.25));
      }
    }
    b.box('emissive', 0, top - 0.28, 0, half * 2 + 1.0, 0.26, 2.3, shade(gold, 1.4));

    // a solid wall of light: this one you finish on, you do not pass through it
    for (let i = 0; i < 7; i++) {
      const y = 0.4 + i * 1.0;
      b.box('beam', 0, y, 0, half * 2 - 0.4, 0.95, 0.06, shade(gold, 0.9 - i * 0.06));
    }

    // landing strip on the road
    for (let i = 0; i < 6; i++) {
      b.box('emissive', 0, 0.04, 5 + i * 3.4, ROAD_HALF * 2 - 0.6, 0.02, 1.1,
        shade(gold, 0.35 + i * 0.11));
    }

    this.group = b.toGroup(this.materials);
    this.group.visible = false;
    this.scene.add(this.group);
  }

  update(finishZ, playerZ, time) {
    if (!this.group) return;
    // Only worth drawing once it is plausibly in view.
    const visible = finishZ !== null && (playerZ - finishZ) < 420;
    this.group.visible = visible;
    if (!visible) return;
    this.group.position.set(0, Math.sin(time * 1.8) * 0.08, finishZ);
  }
}
