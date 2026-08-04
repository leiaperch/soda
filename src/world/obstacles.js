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
    b.box('chrome', x, y, z, s.w + 3.6, 1.15, 1.15, shade(pal.chrome, 0.85));
    b.box('chrome', x, y - 0.1, z, s.w + 4.0, 0.28, 1.35, shade(pal.chrome, 0.7));
    b.box('toon', x, s.base, z, s.w * 0.85, s.h * 0.5, s.d, shade(pal.road, 2.0));
    b.box('emissive', x, s.base - 0.14, z, s.w * 0.8, 0.14, s.d + 0.06, shade(pal.accentGlow, 1.3));
    // valve wheels on the run, so it reads as plumbing rather than a girder
    for (const side of [-1, 1]) {
      b.cyl('chrome', x + side * (s.w * 0.5 + 1.1), y + 0.55, z, 0.42, 0.42, 0.22, 8, shade(pal.chrome, 0.95));
      b.box('emissive', x + side * (s.w * 0.5 + 0.4), y - 0.6, z, 0.5, 0.16, 0.5, shade(pal.edge, 1.0));
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

/** Barrier: a hoarding blown flat across the lane, still lit. */
function hoard(b, pal, x, z, s) {
  b.at(x, 0, z, 0.16, 1, 1, 1);
  b.box('toon', 0, 0, 0, s.w, s.h * 0.72, s.d * 0.8, shade(pal.kerb, 0.86));
  b.box('toon', -s.w * 0.12, s.h * 0.66, 0.08, s.w * 0.78, s.h * 0.3, s.d * 0.7, shade(pal.kerb, 1.0));
  // the ad face, half torn off
  b.box('emissive', s.w * 0.06, s.h * 0.34, s.d * 0.42, s.w * 0.56, s.h * 0.34, 0.06, shade(pal.accent, 0.5));
  b.box('emissive', -s.w * 0.3, s.h * 0.2, s.d * 0.42, s.w * 0.2, s.h * 0.16, 0.06, shade(pal.accentGlow, 0.45));
  b.pop();
  // the snapped legs it stood on
  for (const side of [-1, 1]) {
    b.cyl('chrome', x + side * s.w * 0.42, 0, z - s.d * 0.3, 0.11, 0.09, s.h * 0.5, 6, shade(pal.chrome, 0.8));
  }
}

/** Gate: a service walkway sheared off its building and jammed overhead. */
function skywalk(b, pal, x, z, s) {
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
  b.box('emissive', x, y + 0.06, z, s.w * 0.85, 0.12, s.d * 0.8, shade(pal.accentGlow, 0.5));
}

/** Block: a comms mast down in the lane, dish and all. */
function mast(b, pal, x, z, s) {
  b.at(x, 0, z, -0.22, 1, 1, 1);
  b.box('toon', 0, 0, 0, s.w * 0.5, s.h * 0.28, s.d * 0.9, shade(pal.deck, 1.2));
  b.cyl('chrome', 0, s.h * 0.24, 0, 0.3, 0.2, s.h * 0.6, 7, shade(pal.chrome, 0.85));
  // lattice, the silhouette that says mast rather than pillar
  for (let i = 0; i < 4; i++) {
    const yy = s.h * 0.3 + i * s.h * 0.16;
    b.box('chrome', 0, yy, 0, 0.9 - i * 0.13, 0.09, 0.9 - i * 0.13, shade(pal.chrome, 0.95));
  }
  b.dome('toon', 0.34, s.h * 0.7, 0, 0.62, 0.34, 9, 3, shade(pal.kerb, 0.9));
  b.box('emissive', 0, s.h * 0.88, 0, 0.2, 0.42, 0.2, shade(pal.accent, 0.6));
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
