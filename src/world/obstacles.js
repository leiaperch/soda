import * as THREE from 'three';
import { OBSTACLE } from './layout.js';

/**
 * Obstacle shapes, one family per zone.
 *
 * The three obstacles are always the same *contract* — jump the barrier, slide
 * under the gate, dodge the block — because relearning the grammar every zone
 * would be hostile. What changes is what they are made of. A concrete pillar
 * standing in the open sea is the single loudest sign that a zone is a repaint
 * of the first one.
 *
 * Every form must keep the silhouette its contract implies: barriers stay low
 * and solid, gates stay clear underneath and blocked above, blocks stay tall
 * and opaque. Read at 50 km/h, silhouette is all the player gets.
 */

const _c = new THREE.Color();
const shade = (color, m) => _c.copy(color).multiplyScalar(m).clone();

// ---------- barriers: low, jump them ---------------------------------------

const BARRIERS = {
  /** Guard fence with chrome caps. The city default. */
  fence(b, pal, x, z, s) {
    b.box('toon', x, 0, z, s.w, s.h, s.d, shade(pal.accent, 0.9));
    b.box('chrome', x, s.h, z, s.w + 0.16, 0.16, s.d + 0.16, shade(pal.chrome, 0.95));
    b.box('emissive', x, s.h * 0.55, z, s.w * 0.8, 0.16, s.d + 0.05, shade(pal.accentGlow, 1.3));
    for (const side of [-1, 1]) {
      b.cyl('chrome', x + side * s.w / 2, 0, z, 0.14, 0.12, s.h, 6, shade(pal.chrome, 0.9));
    }
  },

  /** Wet rock cluster breaking the surface. */
  rock(b, pal, x, z, s) {
    const stone = new THREE.Color('#6b7f86');
    b.dome('toon', x, 0, z, s.w * 0.52, s.h * 1.05, 7, 3, shade(stone, 1.0));
    b.dome('toon', x - s.w * 0.3, 0, z + 0.2, s.w * 0.3, s.h * 0.75, 6, 3, shade(stone, 0.85));
    b.dome('toon', x + s.w * 0.32, 0, z - 0.15, s.w * 0.26, s.h * 0.62, 6, 3, shade(stone, 0.92));
    b.dome('toon', x, 0, z, s.w * 0.62, 0.1, 8, 2, shade(pal.lane, 0.8));
    b.box('emissive', x, s.h * 0.9, z, s.w * 0.5, 0.07, s.d * 0.7, shade(pal.lane, 0.6));
  },

  /** Stacked crates with a strapped lid. */
  crate(b, pal, x, z, s) {
    const col = pal.facades[2];
    b.box('toon', x - s.w * 0.22, 0, z, s.w * 0.52, s.h * 0.62, s.d, shade(col, 1.3));
    b.box('toon', x + s.w * 0.24, 0, z + 0.1, s.w * 0.48, s.h * 0.9, s.d * 0.9, shade(col, 1.05));
    b.box('toon', x, s.h * 0.9, z, s.w, s.h * 0.18, s.d, shade(col, 1.5));
    b.box('chrome', x, s.h * 0.9, z, s.w + 0.1, 0.12, 0.24, shade(pal.chrome, 0.9));
    b.box('emissive', x, s.h * 0.45, z + s.d * 0.5, s.w * 0.7, 0.12, 0.06, shade(pal.accentGlow, 1.15));
  },

  /** A slab of the floor heaved up, still glowing along the crack. */
  slab(b, pal, x, z, s) {
    b.at(x, 0, z, 0, 1, 1, 1);
    b.taper('toon', 0, 0, 0, s.w, s.h, s.d, 0.35, shade(pal.road, 1.7));
    b.box('emissive', 0, s.h * 0.5, 0, s.w * 0.92, 0.1, s.d + 0.04, shade(pal.accentGlow, 1.25));
    b.box('emissive', 0, 0.05, 0, s.w * 1.15, 0.06, s.d * 1.6, shade(pal.edge, 0.9));
    b.pop();
  },

  /** Fallen trunk with moss on top. */
  log(b, pal, x, z, s) {
    const bark = new THREE.Color('#6b4a2f');
    b.at(x, s.h * 0.5, z, 0, 1, 1, 1);
    b.cyl('toon', 0, 0, 0, s.h * 0.5, s.h * 0.5, s.w, 8, shade(bark, 1.0));
    b.pop();
    b.box('toon', x, s.h * 0.82, z, s.w * 0.92, s.h * 0.22, s.d * 0.7, shade(pal.edge, 0.9));
    b.dome('emissive', x - s.w * 0.22, s.h, z, 0.22, 0.2, 6, 2, shade(pal.accentGlow, 1.2));
    b.dome('emissive', x + s.w * 0.26, s.h, z + 0.1, 0.16, 0.15, 6, 2, shade(pal.accentGlow, 1.0));
  },
};

// ---------- gates: high, slide under them ----------------------------------

const GATES = {
  /** Overhead sign gantry. The city default. */
  gantry(b, pal, x, z, s) {
    b.box('toon', x, s.base, z, s.w, s.h, s.d, shade(pal.deck, 1.2));
    b.box('chrome', x, s.base - 0.18, z, s.w + 0.2, 0.2, s.d + 0.2, shade(pal.chrome, 0.95));
    b.box('emissive', x, s.base - 0.16, z, s.w * 0.85, 0.1, s.d + 0.06, shade(pal.edge, 1.35));
    for (const side of [-1, 1]) {
      b.cyl('chrome', x + side * (s.w / 2 + 0.1), 0, z, 0.16, 0.14, s.base + s.h, 6, shade(pal.chrome, 0.85));
    }
  },

  /** Fishing net slung between two posts, floats along the bottom edge. */
  net(b, pal, x, z, s) {
    const rope = new THREE.Color('#c9a86a');
    for (const side of [-1, 1]) {
      b.cyl('toon', x + side * (s.w / 2 + 0.1), 0, z, 0.2, 0.16, s.base + s.h, 7, shade(rope, 0.8));
    }
    b.box('toon', x, s.base + s.h - 0.2, z, s.w + 0.4, 0.24, 0.24, shade(rope, 1.0));
    for (let i = 0; i < 7; i++) {
      const nx = x - s.w / 2 + (s.w / 6) * i;
      b.box('toon', nx, s.base, z, 0.07, s.h, 0.07, shade(rope, 0.95));
    }
    for (let i = 0; i < 4; i++) {
      b.box('toon', x, s.base + (s.h / 4) * i + 0.2, z, s.w, 0.07, 0.07, shade(rope, 0.95));
    }
    b.box('emissive', x, s.base - 0.1, z, s.w * 0.9, 0.14, 0.18, shade(pal.accentGlow, 1.2));
    for (let i = 0; i < 3; i++) {
      b.dome('toon', x - s.w * 0.3 + i * s.w * 0.3, s.base - 0.3, z, 0.22, 0.3, 6, 2, shade(pal.accent, 1.0));
    }
  },

  /** Crane beam with a slung load. */
  beam(b, pal, x, z, s) {
    b.box('chrome', x, s.base + s.h * 0.55, z, s.w + 3.4, 0.5, 0.6, shade(pal.chrome, 0.9));
    b.box('toon', x, s.base, z, s.w * 0.8, s.h * 0.55, s.d * 1.4, shade(pal.facades[0], 1.4));
    b.box('chrome', x, s.base + s.h * 0.55, z, 0.16, -0.3, 0.16, shade(pal.chrome, 0.8));
    b.box('emissive', x, s.base - 0.12, z, s.w * 0.75, 0.12, s.d * 1.3, shade(pal.accentGlow, 1.25));
    b.box('emissive', x, s.base + s.h * 0.55, z, s.w + 3.4, 0.08, 0.66, shade(pal.edge, 0.8));
  },

  /** Curtain of hanging vines. */
  vine(b, pal, x, z, s) {
    b.box('toon', x, s.base + s.h - 0.2, z, s.w + 0.8, 0.3, 0.5, shade(new THREE.Color('#6b4a2f'), 1.0));
    for (let i = 0; i < 9; i++) {
      const vx = x - s.w / 2 + (s.w / 8) * i;
      const len = s.h * (0.7 + ((i * 37) % 10) / 30);
      b.box('toon', vx, s.base + s.h - 0.2 - len, z, 0.14, len, 0.14, shade(pal.edge, 0.7 + (i % 3) * 0.12));
      b.dome('toon', vx, s.base + s.h - 0.2 - len, z, 0.3, -0.35, 6, 2, shade(pal.edge, 1.0));
    }
    b.box('emissive', x, s.base - 0.1, z, s.w * 0.9, 0.1, 0.2, shade(pal.accentGlow, 1.1));
  },

  /** Overhead pipe run, venting. */
  pipe(b, pal, x, z, s) {
    b.at(x, s.base + s.h * 0.45, z, Math.PI / 2, 1, 1, 1);
    b.cyl('chrome', 0, -(s.w / 2 + 1.6), 0, 0.62, 0.62, s.w + 3.2, 10, shade(pal.chrome, 0.85));
    b.pop();
    b.box('toon', x, s.base, z, s.w * 0.85, s.h * 0.5, s.d, shade(pal.road, 2.0));
    b.box('emissive', x, s.base - 0.14, z, s.w * 0.8, 0.14, s.d + 0.06, shade(pal.accentGlow, 1.3));
    for (const side of [-1, 1]) {
      b.cyl('chrome', x + side * (s.w / 2 + 0.5), 0, z, 0.26, 0.22, s.base + s.h * 0.45, 6, shade(pal.chrome, 0.7));
    }
  },
};

// ---------- blocks: full height, go around ---------------------------------

const BLOCKS = {
  /** Tapered pillar with light bands. The city default. */
  pillar(b, pal, x, z, s) {
    b.taper('toon', x, 0, z, s.w, s.h, s.d, 0.25, shade(pal.accentGlow, 0.7));
    b.box('chrome', x, s.h, z, s.w * 0.9, 0.22, s.d * 0.9, shade(pal.chrome, 0.95));
    for (let i = 0; i < 4; i++) {
      b.box('emissive', x, 0.5 + i * 0.85, z, s.w * 0.95, 0.12, s.d + 0.06, shade(pal.lane, 1.15));
    }
  },

  /** Half-sunk hull, listing. */
  wreck(b, pal, x, z, s) {
    const hull = new THREE.Color('#7a5a4a');
    b.at(x, 0, z, 0.22, 1, 1, 1);
    b.taper('toon', 0, 0, 0, s.w * 1.05, s.h * 0.72, s.d * 1.5, 0.5, shade(hull, 1.0));
    b.box('toon', 0, s.h * 0.72, 0, s.w * 0.55, s.h * 0.3, s.d * 0.8, shade(hull, 1.25));
    b.cyl('chrome', 0.2, s.h, 0, 0.14, 0.1, s.h * 0.5, 6, shade(pal.chrome, 0.8));
    b.box('emissive', 0, s.h * 0.4, s.d * 0.7, s.w * 0.7, 0.14, 0.08, shade(pal.accentGlow, 1.2));
    b.pop();
    b.dome('toon', x, 0, z, s.w * 0.8, 0.12, 8, 2, shade(pal.lane, 0.75));
  },

  /** Shipping container stood on end. */
  container(b, pal, x, z, s) {
    const col = pal.facades[1];
    b.box('toon', x, 0, z, s.w, s.h, s.d, shade(col, 1.15));
    for (let i = -3; i <= 3; i++) {
      b.box('toon', x + i * (s.w / 8), s.h / 2, z + s.d / 2 + 0.05, s.w / 16, s.h * 0.9, 0.08, shade(col, 0.82));
    }
    b.box('chrome', x, s.h - 0.22, z, s.w + 0.16, 0.22, s.d + 0.16, shade(pal.chrome, 0.9));
    b.box('chrome', x, 0, z, s.w + 0.16, 0.22, s.d + 0.16, shade(pal.chrome, 0.85));
    b.box('emissive', x, s.h * 0.62, z + s.d / 2 + 0.06, s.w * 0.55, 0.16, 0.05, shade(pal.accentGlow, 1.2));
  },

  /** Overgrown trunk with a canopy that hides the top. */
  tree(b, pal, x, z, s) {
    const bark = new THREE.Color('#5e4128');
    b.cyl('toon', x, 0, z, s.w * 0.34, s.w * 0.24, s.h * 0.72, 8, shade(bark, 1.0));
    for (let i = 0; i < 3; i++) {
      b.dome('toon', x + (i - 1) * s.w * 0.28, s.h * (0.55 + i * 0.11), z + (i % 2) * 0.4,
        s.w * (0.62 - i * 0.1), s.w * 0.5, 9, 3, shade(pal.edge, 0.8 + i * 0.12));
    }
    b.dome('emissive', x, s.h * 0.95, z, s.w * 0.22, 0.24, 7, 2, shade(pal.accentGlow, 1.15));
  },

  /** Hydraulic press column, clamped shut. */
  press(b, pal, x, z, s) {
    b.box('toon', x, 0, z, s.w, s.h * 0.28, s.d * 1.2, shade(pal.road, 2.2));
    b.cyl('chrome', x, s.h * 0.28, z, s.w * 0.3, s.w * 0.3, s.h * 0.45, 8, shade(pal.chrome, 0.8));
    b.box('toon', x, s.h * 0.7, z, s.w * 1.05, s.h * 0.3, s.d * 1.2, shade(pal.road, 2.6));
    for (let i = 0; i < 3; i++) {
      b.box('emissive', x, s.h * (0.32 + i * 0.12), z + s.d * 0.62, s.w * 0.8, 0.1, 0.06, shade(pal.accentGlow, 1.3));
    }
    b.box('emissive', x, s.h * 0.68, z, s.w * 1.1, 0.09, s.d * 1.25, shade(pal.edge, 1.0));
  },
};

const DEFAULTS = { barrier: 'fence', gate: 'gantry', block: 'pillar' };

/**
 * @param {object} kit - `{ barrier, gate, block }` form names from the zone.
 */
export function buildObstacle(b, pal, o, x, kit = DEFAULTS) {
  const spec = OBSTACLE[o.t];
  const z = -o.z;
  const form = (kit && kit[o.t]) || DEFAULTS[o.t];
  const table = o.t === 'barrier' ? BARRIERS : o.t === 'gate' ? GATES : BLOCKS;
  (table[form] || table[DEFAULTS[o.t]])(b, pal, x, z, spec);
}
