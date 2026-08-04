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
  /**
   * A pallet stack that has come apart: one crate split open, one slid off,
   * strapping still holding the rest. Three aligned boxes read as one box with
   * seams; the read comes from the pieces NOT lining up.
   */
  crate(b, pal, x, z, s) {
    const col = pal.facades[2];
    b.at(x, 0, z, 0.19, 1, 1, 1);
    // pallet under it, which is what makes the stack sit on the road
    b.box('toon', 0, 0, 0, s.w * 1.04, 0.12, s.d * 1.1, shade(pal.deck, 1.2));
    for (let i = 0; i < 3; i++) {
      b.box('toon', -s.w * 0.4 + i * s.w * 0.38, 0.02, 0, 0.1, 0.1, s.d * 1.14, shade(pal.deck, 0.9));
    }
    // the intact one, square on
    b.box('toon', -s.w * 0.2, 0.12, 0, s.w * 0.5, s.h * 0.66, s.d * 0.92, shade(col, 1.25));
    b.box('chrome', -s.w * 0.2, 0.12 + s.h * 0.3, 0, s.w * 0.54, 0.07, s.d * 0.96, shade(pal.chrome, 0.9));
    // the split one: lid lifted at an angle, contents showing
    const cx = s.w * 0.26, cy = 0.12, cw = s.w * 0.46, ch = s.h * 0.5, cd = s.d * 0.86;
    b.box('toon', cx, cy, 0, cw, ch, cd, shade(col, 1.0));
    b.quad('toon', [cx - cw / 2, cy + ch, -cd / 2], [cx + cw / 2, cy + ch, -cd / 2],
      [cx + cw / 2, cy + ch * 1.5, cd / 2], [cx - cw / 2, cy + ch * 1.5, cd / 2], shade(col, 1.5));
    b.box('emissive', cx, cy + ch * 0.55, 0, cw * 0.6, 0.22, cd * 0.5, shade(pal.accentGlow, 0.6));
    // one that slid off and landed short
    b.box('toon', -s.w * 0.52, 0.02, s.d * 0.5, s.w * 0.34, s.h * 0.34, s.d * 0.6, shade(col, 0.85));
    // strapping over the top
    b.box('chrome', -s.w * 0.2, 0.12 + s.h * 0.66, 0, s.w * 0.56, 0.06, 0.16, shade(pal.chrome, 1.0));
    b.box('emissive', -s.w * 0.2, 0.12 + s.h * 0.34, s.d * 0.47, s.w * 0.34, 0.14, 0.05, shade(pal.accent, 0.62));
    b.pop();
  },

  /** A slab of the floor heaved up, still glowing along the crack. */
  /**
   * A slab of the floor heaved up, still glowing along the crack.
   *
   * Free points, not a taper: the plate is levered up on one edge and sits at
   * an angle, with the hole it came out of open behind it. A symmetrical
   * taper reads as a moulded object placed on the road, which is the opposite
   * of the idea — this is the road, broken.
   */
  slab(b, pal, x, z, s) {
    const w = s.w * 0.5, d = s.d * 1.1;
    // Nothing may stand above the collision box. A first pass reached 1.57 on a
    // hitbox topping out at 1.05, which is the "visible post you pass through"
    // failure this project has already shipped five times.
    const lo = 0.06, hi = s.h * 0.94;
    const P = (dx, y, dz) => [x + dx, y, z + dz];
    const face = shade(pal.road, 2.4);
    // the tilted plate: high edge towards her, low edge dropping into the hole
    b.quad('toon', P(-w, lo, d), P(w, lo * 1.6, d), P(w * 0.86, hi, -d * 0.5), P(-w * 0.86, hi * 0.82, -d * 0.5), face);
    b.quad('toon', P(-w, lo, d), P(-w * 0.86, hi * 0.82, -d * 0.5), P(w * 0.86, hi, -d * 0.5), P(w, lo * 1.6, d), shade(pal.road, 1.5));
    // broken side edges, uneven on purpose
    b.tri('toon', P(-w, lo, d), P(-w * 0.86, hi * 0.82, -d * 0.5), P(-w * 0.7, 0, -d), shade(pal.road, 1.9));
    b.tri('toon', P(w, lo * 1.6, d), P(w * 0.7, 0, -d), P(w * 0.86, hi, -d * 0.5), shade(pal.road, 1.9));
    // the crack it came out of, lit from underneath
    b.box('emissive', x, 0.02, z - d * 0.75, s.w * 1.2, 0.05, s.d * 0.8, shade(pal.accentGlow, 0.72));
    b.box('emissive', x, hi * 0.9, z - d * 0.5, s.w * 0.9, 0.1, 0.12, shade(pal.edge, 0.66));
    // rebar left sticking out of the break
    for (const [dx, h] of [[-0.55, 0.22], [0.1, 0.3], [0.62, 0.16]]) {
      b.box('chrome', x + dx, hi * 0.62, z - d * 0.45, 0.07, h, 0.07, shade(pal.chrome, 0.85));
    }
  },

  /**
   * Fallen trunk with moss on top.
   *
   * Boxes and domes, never a `cyl()` inside an `at()`: the matrix stack only
   * rotates around Y, so the cylinder this used to use stood on end as a
   * three-metre stump you then jumped through at one metre.
   */
  log(b, pal, x, z, s) {
    const bark = new THREE.Color('#6b4a2f');
    const r = s.h * 0.5;
    // faceted barrel, built from stacked slabs so it lies across the lane
    for (const [dy, w] of [[0.16, 1.0], [0.5, 0.92], [0.82, 0.66]]) {
      b.box('toon', x, dy * s.h - 0.08, z, s.w * 1.02, s.h * 0.36, s.d * (0.55 + w * 0.5),
        shade(bark, 0.9 + dy * 0.35));
    }
    for (const side of [-1, 1]) {
      b.dome('toon', x + side * s.w * 0.5, s.h * 0.5, z, r * 0.95, side * 0.28, 8, 3, shade(bark, 1.15));
    }
    // moss and a couple of glowing caps along the top
    b.box('toon', x, s.h * 0.86, z, s.w * 0.9, s.h * 0.2, s.d * 0.72, shade(pal.edge, 0.9));
    b.dome('emissive', x - s.w * 0.22, s.h * 1.02, z, 0.22, 0.2, 6, 2, shade(pal.accentGlow, 1.2));
    b.dome('emissive', x + s.w * 0.26, s.h * 1.02, z + 0.1, 0.16, 0.15, 6, 2, shade(pal.accentGlow, 1.0));
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

  /**
   * Overhead pipe run, venting.
   *
   * Built from boxes: `Builder.at()` only rotates around Y, so the `cyl()`
   * this used to use stood up as a 5.6 m column planted in the lane while the
   * collision stayed overhead. You slid straight through a visible post.
   */
  pipe(b, pal, x, z, s) {
    const y = s.base + s.h * 0.45;
    const run = s.w + 3.6;
    // A round profile faked in three slabs. The old one was a single box, so a
    // six-metre pipe read as a flat bar with wheels stuck on it; a pipe is a
    // silhouette with no corners, and the matrix stack cannot roll a box, so
    // the roundness has to be stacked.
    const prof = [[-0.46, 0.34, 0.86], [-0.12, 0.5, 1.0], [0.38, 0.3, 0.8]];
    for (const [dy, h, w] of prof) {
      b.box('chrome', x, y + dy, z, run, h, 1.2 * w, shade(pal.chrome, 0.78 + (dy + 0.5) * 0.4));
    }
    // flanges along the run: joints are what give a pipe its rhythm
    for (let i = -2; i <= 2; i++) {
      const fx = x + i * (run / 5);
      b.box('chrome', fx, y - 0.5, z, 0.22, 1.02, 1.42, shade(pal.chrome, 1.0));
      b.box('emissive', fx, y - 0.44, z + 0.72, 0.16, 0.5, 0.05, shade(pal.accentGlow, 0.5));
    }
    // hangers up to whatever is above, so it is carried rather than floating
    for (const side of [-1, 1]) {
      b.box('chrome', x + side * run * 0.3, y + 0.44, z, 0.12, 1.5, 0.12, shade(pal.chrome, 0.7));
    }
    // the load it is carrying, and the lit lip that marks the clearance
    b.taper('toon', x, s.base, z, s.w * 0.85, s.h * 0.42, s.d, 0.08, shade(pal.road, 2.2));
    b.box('emissive', x, s.base - 0.12, z, s.w * 0.88, 0.16, s.d + 0.08, shade(pal.accentGlow, 0.8));
    // valve wheels, out at the ends where they do not crowd the clearance
    for (const side of [-1, 1]) {
      b.cyl('chrome', x + side * (run * 0.42), y + 0.62, z, 0.4, 0.4, 0.2, 8, shade(pal.chrome, 0.98));
      b.cyl('chrome', x + side * (run * 0.42), y + 0.3, z, 0.1, 0.09, 0.34, 6, shade(pal.chrome, 0.8));
    }
  },
};

// ---------- blocks: full height, go around ---------------------------------

const BLOCKS = {
  /** Tapered pillar with light bands. The city default. */
  /**
   * Fluted column with a broken cap.
   *
   * The old one was a single tapered box with four stripes on it, which is the
   * shape a placeholder has. A column reads from three things a box cannot
   * give: a base wider than the shaft, flutes breaking the round silhouette,
   * and a cap that overhangs. The break at the top is what stops three of them
   * in a row from looking stamped.
   */
  pillar(b, pal, x, z, s) {
    const r = s.w * 0.36;
    b.taper('toon', x, 0, z, s.w * 1.02, 0.32, s.d * 1.02, 0.14, shade(pal.deck, 1.25));
    b.cyl('toon', x, 0.32, z, r * 1.06, r * 0.9, s.h * 0.82, 10, shade(pal.accentGlow, 0.62));
    // flutes: eight thin ribs around the shaft, the detail that carries at speed
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.box('toon', x + Math.cos(a) * r * 0.92, 0.34, z + Math.sin(a) * r * 0.92,
        0.11, s.h * 0.78, 0.11, shade(pal.accentGlow, 0.48));
    }
    b.cyl('chrome', x, s.h * 0.86, z, r * 1.15, r * 1.02, 0.18, 10, shade(pal.chrome, 0.95));
    b.taper('toon', x, s.h * 0.86 + 0.18, z, s.w * 0.92, s.h * 0.12, s.d * 0.92, -0.1, shade(pal.deck, 1.4));
    // the cap is snapped off at an angle rather than cut flat
    b.tri('toon', [x - s.w * 0.46, s.h * 0.98, z], [x + s.w * 0.46, s.h * 0.98, z],
      [x, s.h * 1.06, z - s.d * 0.4], shade(pal.deck, 1.6));
    b.cyl('emissive', x, 0.36, z, r * 1.1, r * 1.1, 0.1, 10, shade(pal.lane, 0.6));
    b.cyl('emissive', x, s.h * 0.8, z, r * 1.04, r * 1.04, 0.1, 10, shade(pal.lane, 0.55));
  },

  /**
   * A market sign tower: stacked lit boards on a mast, listing.
   *
   * The Market used the Ring's `pillar` and The Core's arches, so from the road
   * the three zones met in the middle. This is the thing The Market has that
   * nothing else does — a stack of signage, wider at the top than the bottom,
   * which is the opposite silhouette to every other block in the game.
   */
  signtower(b, pal, x, z, s) {
    b.at(x, 0, z, 0.14, 1, 1, 1);
    b.taper('toon', 0, 0, 0, s.w * 0.5, 0.26, s.d * 0.8, 0.08, shade(pal.deck, 1.3));
    b.cyl('chrome', 0, 0.26, 0, 0.17, 0.13, s.h * 0.92, 6, shade(pal.chrome, 0.85));
    const boards = [
      [0.30, 0.62, -1], [0.52, 0.78, 1], [0.72, 0.66, -1], [0.88, 0.9, 1],
    ];
    for (const [t, wide, side] of boards) {
      const y = 0.3 + t * s.h * 0.72;
      const w = s.w * wide;
      b.box('toon', side * w * 0.18, y, 0, w, s.h * 0.15, s.d * 0.34, shade(pal.facades[1], 1.5));
      b.box('emissive', side * w * 0.18, y + s.h * 0.02, s.d * 0.18, w * 0.86, s.h * 0.09, 0.05,
        shade(side > 0 ? pal.accent : pal.accentGlow, 0.62));
      b.box('chrome', side * w * 0.18, y - 0.04, 0, w + 0.1, 0.06, s.d * 0.38, shade(pal.chrome, 0.9));
    }
    b.dome('emissive', 0, s.h * 0.98, 0, 0.2, 0.24, 6, 2, shade(pal.accent, 0.7));
    b.pop();
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
  /**
   * A shipping can stood on its end, dented, with its doors hanging open.
   *
   * Laid flat it was a box with stripes, which is indistinguishable from every
   * other block at speed. On end it is tall and narrow with a clear top edge,
   * and the open doors break the outline on one side only.
   */
  container(b, pal, x, z, s) {
    const col = pal.facades[3];
    b.at(x, 0, z, 0.11, 1, 1, 1);
    b.box('toon', 0, 0, 0, s.w * 0.78, s.h * 0.92, s.d * 0.82, shade(col, 1.15));
    // corrugation: vertical ribs, the thing that says shipping can
    for (let i = -3; i <= 3; i++) {
      b.box('toon', i * s.w * 0.105, 0.1, s.d * 0.4, 0.07, s.h * 0.8, 0.09, shade(col, 1.45));
      b.box('toon', i * s.w * 0.105, 0.1, -s.d * 0.4, 0.07, s.h * 0.8, 0.09, shade(col, 0.9));
    }
    // corner castings top and bottom
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (const y of [0, s.h * 0.86]) {
        b.box('chrome', sx * s.w * 0.37, y, sz * s.d * 0.39, 0.24, 0.2, 0.24, shade(pal.chrome, 0.92));
      }
    }
    // doors swung open on one side, plus the dent in the top corner
    b.quad('toon', [s.w * 0.38, 0.1, s.d * 0.4], [s.w * 0.86, 0.1, s.d * 0.72],
      [s.w * 0.86, s.h * 0.6, s.d * 0.72], [s.w * 0.38, s.h * 0.72, s.d * 0.4], shade(col, 0.8));
    b.tri('toon', [-s.w * 0.39, s.h * 0.92, -s.d * 0.41], [-s.w * 0.39, s.h * 0.7, s.d * 0.41],
      [-s.w * 0.1, s.h * 0.92, s.d * 0.41], shade(col, 1.6));
    b.box('emissive', 0, s.h * 0.5, s.d * 0.42, s.w * 0.42, 0.26, 0.05, shade(pal.accentGlow, 0.6));
    b.box('emissive', 0, s.h * 0.88, 0, s.w * 0.8, 0.08, s.d * 0.84, shade(pal.accent, 0.5));
    b.pop();
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
  /**
   * Forge press: an anvil, two guide columns, a ram hanging between them.
   *
   * The old one was three boxes and a cylinder in a vertical line, which is
   * the same silhouette as a pillar with a bulge. A press is read from the gap
   * between the ram and the bed — so the gap is built, and lit, even though
   * nothing passes through it.
   */
  press(b, pal, x, z, s) {
    // bed
    b.taper('toon', x, 0, z, s.w * 1.05, s.h * 0.2, s.d * 1.3, 0.1, shade(pal.road, 2.2));
    b.box('chrome', x, s.h * 0.2, z, s.w * 0.8, 0.12, s.d, shade(pal.chrome, 0.8));
    // guide columns, outside the ram so the gap between them reads
    for (const side of [-1, 1]) {
      b.cyl('chrome', x + side * s.w * 0.46, s.h * 0.2, z, 0.15, 0.13, s.h * 0.72, 7, shade(pal.chrome, 0.9));
      b.box('chrome', x + side * s.w * 0.46, s.h * 0.5, z, 0.3, 0.1, 0.3, shade(pal.chrome, 1.05));
    }
    // crown and the ram slung under it
    b.box('toon', x, s.h * 0.86, z, s.w * 1.15, s.h * 0.16, s.d * 1.15, shade(pal.road, 2.8));
    b.taper('toon', x, s.h * 0.56, z, s.w * 0.62, s.h * 0.3, s.d * 0.7, -0.08, shade(pal.deck, 1.8));
    b.box('chrome', x, s.h * 0.5, z, s.w * 0.68, 0.1, s.d * 0.76, shade(pal.chrome, 1.0));
    // the working gap, lit from inside: the one thing that says press
    b.box('emissive', x, s.h * 0.36, z, s.w * 0.56, 0.12, s.d * 0.6, shade(pal.accentGlow, 0.7));
    b.box('emissive', x, s.h * 0.24, z, s.w * 0.72, 0.08, s.d * 0.9, shade(pal.edge, 0.5));
    for (const side of [-1, 1]) {
      b.box('emissive', x + side * s.w * 0.46, s.h * 0.9, z, 0.2, 0.12, 0.2, shade(pal.accent, 0.6));
    }
  },
};

// ---------- hedge: spans everything, only a bloom pad clears it ------------

function hedge(b, pal, x, z, s) {
  const dark = new THREE.Color('#2f5a34');
  b.box('toon', x, 0, z, s.w, s.h * 0.55, s.d, shade(dark, 1.0));
  for (let i = 0; i < 5; i++) {
    const px = x + (i - 2) * (s.w / 5);
    b.dome('toon', px, s.h * 0.45, z + ((i % 2) - 0.5) * 0.5,
      s.w * 0.34, s.h * (0.5 + (i % 3) * 0.09), 7, 3, shade(pal.edge, 0.6 + (i % 3) * 0.16));
  }
  // thorn tips, so it never reads as something soft you could push through
  for (let i = 0; i < 4; i++) {
    b.cyl('toon', x + (i - 1.5) * (s.w / 4), s.h * 0.86, z, 0.09, 0.01, 0.55, 5, shade(dark, 0.7));
  }
  b.box('emissive', x, 0.12, z + s.d * 0.5, s.w * 0.9, 0.1, 0.06, shade(pal.accentGlow, 0.9));
}

// ---------- panel: blocks one cell of a flight grid ------------------------

function panel(b, pal, x, z, s) {
  const y = s.base;
  b.box('toon', x, y, z, s.w, s.h, s.d, shade(pal.road, 1.9));
  b.box('chrome', x, y + s.h - 0.14, z, s.w + 0.14, 0.16, s.d + 0.14, shade(pal.chrome, 0.85));
  b.box('chrome', x, y, z, s.w + 0.14, 0.16, s.d + 0.14, shade(pal.chrome, 0.85));
  // hazard bars, angled so they read as "closed" instead of as a wall texture
  for (let i = 0; i < 4; i++) {
    b.at(x - s.w * 0.32 + i * (s.w * 0.22), y + s.h * 0.5, z + s.d * 0.5, 0, 1, 1, 1);
    b.box('emissive', 0, 0, 0, 0.26, s.h * 0.78, 0.07, shade(pal.accentGlow, 1.1));
    b.pop();
  }
  for (const side of [-1, 1]) {
    b.cyl('chrome', x + side * (s.w / 2 + 0.08), y, z, 0.12, 0.12, s.h, 6, shade(pal.chrome, 0.7));
  }
}

// ---------- bumper: the only obstacle you are meant to hit ----------------

function bumper(b, pal, x, z, s) {
  const r = s.w * 0.5;
  b.cyl('toon', x, 0, z, r * 1.15, r * 1.05, 0.4, 14, shade(pal.accent, 0.8));
  b.cyl('chrome', x, 0.4, z, r, r * 0.92, s.h * 0.5, 14, shade(pal.chrome, 0.95));
  b.dome('toon', x, 0.4 + s.h * 0.5, z, r * 0.94, r * 0.8, 14, 5, shade(pal.accentGlow, 0.95));
  // lit rings, the arcade tell that this is a target and not a wall
  for (let i = 0; i < 3; i++) {
    b.cyl('emissive', x, 0.55 + i * 0.42, z, r * 1.02, r * 1.02, 0.11, 14, shade(pal.edge, 1.05 - i * 0.16));
  }
  b.dome('emissive', x, 0.4 + s.h * 0.5 + r * 0.8, z, r * 0.3, 0.26, 8, 3, shade(pal.lane, 1.1));
}

// ---------- The Storm: things the wind tore off the city --------------------
//
// The zone's whole premise is that the road is coming apart, so its three
// forms are all pieces of the city that used to be somewhere else. They keep
// the contracts exactly — low and solid, clear underneath, tall and opaque —
// because the grammar is what a player reads at speed, not the story.
//
// Nothing here leans, and that is a constraint rather than a choice: the
// matrix stack only rotates around Y. Wreckage reads as wreckage through
// offset stacking and yaw instead, which is cheaper anyway.

/**
 * A lit footprint under a storm obstacle.
 *
 * The zone runs on a near-black road and a near-black deck, and this family is
 * matte and pale, so at speed the obstacles simply did not register — on the
 * upper deck they were reported as missing entirely. Every other zone gets its
 * read from an emissive strip somewhere on the form; these get a base ring,
 * which works on both levels because it travels with the object.
 */
function stormMark(b, pal, x, z, s) {
  b.cyl('emissive', x, 0.02, z, s.w * 0.62, s.w * 0.56, 0.05, 16, shade(pal.accent, 0.5));
  b.cyl('emissive', x, 0.02, z, s.w * 0.34, s.w * 0.28, 0.05, 12, shade(pal.accentGlow, 0.42));
}

/** Barrier: a hoarding blown flat across the lane, still lit. */
function hoard(b, pal, x, z, s) {
  stormMark(b, pal, x, z, s);
  // A leaning panel, not a stack of boxes. The face is four free points, so it
  // tilts back along z and its top corner is cut away — an outline you can name
  // at a glance. A box, however it is shaded, only ever reads as a box.
  const w = s.w * 0.5, top = s.h * 1.05, lean = s.d * 0.55;
  const P = (dx, y, dz) => [x + dx, y, z + dz];
  const face = shade(pal.kerb, 1.0);
  const back = shade(pal.kerb, 0.7);
  // the torn corner: the top edge stops short on one side
  const cut = w * 0.35;
  b.quad('toon', P(-w, 0.06, lean), P(w, 0.06, lean), P(w, top * 0.62, -lean), P(-w, top, -lean), face);
  b.quad('toon', P(-w, 0.06, lean + 0.16), P(-w, top, -lean + 0.16), P(w, top * 0.62, -lean + 0.16), P(w, 0.06, lean + 0.16), back);
  // ragged strip hanging off the tall side
  b.tri('toon', P(-w, top, -lean), P(-w + cut, top * 0.78, -lean), P(-w + cut * 0.4, top * 0.5, -lean), face);
  // frame rails along both long edges, which is what gives it a hard outline
  b.box('chrome', x, 0.06, z + lean, s.w + 0.12, 0.14, 0.16, shade(pal.chrome, 0.9));
  for (const side of [-1, 1]) {
    b.cyl('chrome', x + side * (w + 0.06), 0, z + lean * 0.4, 0.09, 0.07, s.h * 0.85, 6, shade(pal.chrome, 0.85));
  }
  // the ad still burning on the face
  b.quad('emissive', P(-w * 0.72, s.h * 0.3, lean * 0.2), P(w * 0.42, s.h * 0.26, lean * 0.2),
    P(w * 0.42, s.h * 0.66, -lean * 0.2), P(-w * 0.72, s.h * 0.74, -lean * 0.2), shade(pal.accent, 0.66));
  b.box('emissive', x - w * 0.2, top * 0.86, z - lean, s.w * 0.5, 0.1, 0.14, shade(pal.accentGlow, 0.58));
}

/** Gate: a service walkway sheared off its building and jammed overhead. */
function skywalk(b, pal, x, z, s) {
  stormMark(b, pal, x, z, s);
  const y = s.base;
  b.box('toon', x, y + s.h * 0.42, z, s.w + 0.5, s.h * 0.34, s.d, shade(pal.deck, 1.3));
  b.box('toon', x, y + s.h * 0.2, z, s.w, s.h * 0.22, s.d * 0.7, shade(pal.kerb, 0.8));
  // handrail still attached, the tell that people used to walk on this
  for (const side of [-1, 1]) {
    b.box('chrome', x + side * (s.w * 0.5 + 0.2), y + s.h * 0.82, z, 0.1, 0.5, s.d, shade(pal.chrome, 0.9));
    b.box('chrome', x + side * (s.w * 0.5 + 0.2), y + s.h * 0.82 + 0.5, z, 0.16, 0.1, s.d, shade(pal.chrome, 1.0));
  }
  // torn cabling hanging into the gap you slide through
  for (let i = -1; i <= 1; i++) {
    b.cyl('toon', x + i * s.w * 0.3, y - 0.34, z + (i % 2) * 0.2, 0.05, 0.04, 0.36, 5, shade(pal.deck, 0.8));
  }
  // A gate's underside is the edge you have to read, so it is the brightest
  // thing on it: that line is where the clearance stops.
  b.box('emissive', x, y - 0.04, z, s.w * 0.95, 0.16, s.d * 0.9, shade(pal.accentGlow, 0.78));
  b.box('emissive', x, y + s.h * 0.6, z, s.w + 0.5, 0.1, s.d * 0.9, shade(pal.accent, 0.5));
}

/** Block: a comms mast down in the lane, dish and all. */
function mast(b, pal, x, z, s) {
  stormMark(b, pal, x, z, s);
  b.at(x, 0, z, -0.22, 1, 1, 1);
  // Four legs that draw in as they rise, with braces between them. The old
  // version was five stacked plates and read as a pile of crates; a truss is
  // read from its gaps, so the gaps are the point.
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const rad = (t) => 0.62 - t * 0.34;
  const steps = 5;
  for (const [sx, sz] of legs) {
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const y0 = 0.1 + t0 * s.h * 0.82, y1 = 0.1 + t1 * s.h * 0.82;
      const r0 = rad(t0), r1 = rad(t1);
      b.quad('chrome',
        [sx * r0 - 0.05, y0, sz * r0], [sx * r0 + 0.05, y0, sz * r0],
        [sx * r1 + 0.05, y1, sz * r1], [sx * r1 - 0.05, y1, sz * r1],
        shade(pal.chrome, 0.8 + t0 * 0.3));
    }
  }
  // horizontal collars and one diagonal per bay, alternating side
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, y = 0.1 + t * s.h * 0.82, r = rad(t);
    b.box('chrome', 0, y, 0, r * 2, 0.08, r * 2, shade(pal.chrome, 1.0));
    if (i < steps) {
      const t1 = (i + 1) / steps, y1 = 0.1 + t1 * s.h * 0.82, r1 = rad(t1);
      const dir = i % 2 ? 1 : -1;
      b.quad('chrome', [-r * dir, y, r], [r * dir, y, r], [r1 * dir, y1, r1], [-r1 * dir, y1, r1],
        shade(pal.chrome, 0.7));
    }
    if (i % 2 === 0) b.box('emissive', 0, y, 0, r * 2.05, 0.06, r * 2.05, shade(pal.accentGlow, 0.46));
  }
  // base plate, dish and the beacon on top
  b.taper('toon', 0, 0, 0, s.w * 0.62, 0.22, s.d * 0.9, 0.12, shade(pal.deck, 1.3));
  b.dome('toon', 0.42, s.h * 0.66, 0, 0.66, 0.36, 10, 3, shade(pal.kerb, 0.92));
  b.cyl('chrome', 0.2, s.h * 0.66, 0, 0.07, 0.06, 0.5, 5, shade(pal.chrome, 0.9));
  b.box('emissive', 0, s.h * 0.9, 0, 0.2, 0.44, 0.2, shade(pal.accent, 0.78));
  b.pop();
}

// ---------- drift: the only obstacle that lives in the air ------------------

/**
 * Storm debris caught in the updraft: a slab of torn decking with a bent rail
 * still attached, tumbling nose-down. Everything about it has to say "up
 * there" — nothing touches the road, and a lit shadow ring is painted on the
 * floor underneath so its lane is readable long before its height is.
 */
function drift(b, pal, x, z, s) {
  const y = s.base;
  // Pale body, not a facade colour. The zone is a dark violet city at night
  // and the first version was dark violet debris in it: invisible until it was
  // too late, which in a zone that is entirely about reading one object ahead
  // of time is not a look, it is a broken level.
  const body = pal.kerb;
  b.at(x, y + s.h * 0.5, z, 0.34, 1, 1, 1);
  b.box('toon', 0, 0, 0, s.w, s.h * 0.34, s.d, shade(body, 1.0));
  b.box('toon', -s.w * 0.18, s.h * 0.3, 0.1, s.w * 0.55, s.h * 0.3, s.d * 0.8, shade(body, 0.78));
  b.box('chrome', 0, -s.h * 0.2, 0, s.w * 0.9, 0.14, s.d + 0.1, shade(pal.chrome, 0.95));
  // torn rail, the tell that this used to be part of the track
  for (const side of [-1, 1]) {
    b.cyl('chrome', side * s.w * 0.42, s.h * 0.42, 0, 0.1, 0.08, s.h * 0.5, 6, shade(pal.chrome, 0.8));
  }
  // Hazard chevrons on the underside, because underneath is the face you see
  // on the approach. Kept at 0.55 so a row of them cannot bloom into a bar.
  for (let i = -1; i <= 1; i++) {
    b.box('emissive', i * s.w * 0.3, -s.h * 0.19, 0, s.w * 0.2, 0.1, s.d * 0.85, shade(pal.accent, 0.55));
  }
  b.box('emissive', 0, -s.h * 0.16, s.d * 0.5, s.w * 0.7, 0.14, 0.07, shade(pal.accentGlow, 0.6));
  b.pop();
  // Ground marker: a thin ring, not a disc. At disc size it reads as a pad you
  // are meant to hit, which is the opposite of what it means, and it is the
  // brightest thing on the road at the exact moment you are looking down.
  b.cyl('emissive', x, 0.03, z, s.w * 0.34, s.w * 0.30, 0.04, 16, shade(pal.accentGlow, 0.34));
  b.cyl('emissive', x, 0.03, z, s.w * 0.20, s.w * 0.16, 0.04, 14, shade(pal.accent, 0.28));
}

BARRIERS.hoard = hoard;
GATES.skywalk = skywalk;
BLOCKS.mast = mast;

const DEFAULTS = { barrier: 'fence', gate: 'gantry', block: 'pillar', hedge: 'hedge' };

/**
 * @param {object} kit - `{ barrier, gate, block }` form names from the zone.
 */
export function buildObstacle(b, pal, o, x, kit = DEFAULTS) {
  const spec = o.spec || OBSTACLE[o.t];
  const z = -o.z;
  // An obstacle on The Storm's upper deck is the same obstacle, moved up. The
  // whole form is translated rather than its `base` being raised, because the
  // forms use `base` to mean their own clearance and raising it would move a
  // gate's gap instead of the gate.
  if (o.lift) {
    b.at(0, o.lift, 0, 0);
    buildObstacle(b, pal, { ...o, lift: 0 }, x, kit);
    b.pop();
    return undefined;
  }
  if (o.t === 'panel') return panel(b, pal, x, z, spec);
  if (o.t === 'hedge') return hedge(b, pal, x, z, spec);
  if (o.t === 'bumper') return bumper(b, pal, x, z, spec);
  if (o.t === 'drift') return drift(b, pal, x, z, spec);
  const form = (kit && kit[o.t]) || DEFAULTS[o.t];
  const table = o.t === 'barrier' ? BARRIERS : o.t === 'gate' ? GATES : BLOCKS;
  (table[form] || table[DEFAULTS[o.t]])(b, pal, x, z, spec);
}
