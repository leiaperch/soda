import * as THREE from 'three';
import { ROAD_HALF, RAIL_H } from './layout.js';

/**
 * Prop generators. Everything is emitted straight into the shared Builder
 * buckets, so an entire city block still costs four draw calls.
 *
 * Every generator takes a resolved zone palette (`pal`) rather than reaching
 * for a global one: that indirection is the whole reason The Shore and The
 * Market can reuse the same code and not look like the same place.
 * `side` is -1 for the left kerb, +1 for the right, so the road-facing
 * direction is always `-side`.
 */

const WHITE = new THREE.Color('#fff6ea');
const _c = new THREE.Color();
const shade = (color, mul) => _c.copy(color).multiplyScalar(mul).clone();

export function resolvePalette(zone) {
  const c = zone.colors;
  return {
    road: new THREE.Color(c.road),
    kerb: new THREE.Color(c.kerb),
    deck: new THREE.Color(c.deck),
    edge: new THREE.Color(c.edge),
    lane: new THREE.Color(c.lane),
    accent: new THREE.Color(c.accent),
    accentGlow: new THREE.Color(c.accentGlow),
    chrome: WHITE.clone(),
    facades: zone.facades.map((h) => new THREE.Color(h)),
    archTints: zone.props.archTint.map((h) => new THREE.Color(h)),
  };
}

/** Horizontal band of lit windows on the road-facing facade. */
function windowBand(b, x, y, z, w, d, side, count, color) {
  const facing = -side;
  const step = d / count;
  for (let i = 0; i < count; i++) {
    const wz = z - d / 2 + step * (i + 0.5);
    b.box('emissive', x + facing * (w / 2 + 0.06), y, wz, 0.12, 0.34, step * 0.55, color);
  }
}

/**
 * Stacked tapered slabs, chrome trim between stacks, lit window bands facing
 * the road, and a dome or a mast on top. Nothing has a hard right angle, which
 * is the whole Y2K read.
 */
export function tower(b, rng, pal, x, z, side, opts = {}) {
  const w = opts.w ?? rng.range(6, 11);
  const d = opts.d ?? rng.range(7, 14);
  const stacks = opts.stacks ?? rng.int(2, 4);
  const base = pal.facades[rng.int(0, pal.facades.length - 1)];
  let y = 0;
  let cw = w;
  let cd = d;

  for (let i = 0; i < stacks; i++) {
    const h = rng.range(5, 11) * (1 - i * 0.12);
    b.taper('toon', x, y, z, cw, h, cd, rng.range(0.15, 0.6), base, 1 - i * 0.05);
    windowBand(b, x, y + h * 0.42, z, cw, cd * 0.86, side, Math.max(2, Math.round(cd / 2.4)), shade(pal.lane, 1.1));
    windowBand(b, x, y + h * 0.72, z, cw, cd * 0.86, side, Math.max(2, Math.round(cd / 2.4)), shade(pal.accentGlow, 1.0));
    y += h;
    b.box('chrome', x, y, z, cw + 0.5, 0.42, cd + 0.5, shade(pal.chrome, 0.95));
    y += 0.42;
    cw *= rng.range(0.66, 0.84);
    cd *= rng.range(0.7, 0.88);
  }

  const cap = rng();
  if (cap < 0.45) {
    b.dome('toon', x, y, z, Math.min(cw, cd) * 0.62, Math.min(cw, cd) * 0.5, 12, 5, shade(base, 1.08));
    b.cyl('emissive', x, y + Math.min(cw, cd) * 0.5, z, 0.16, 0.16, 2.4, 6, shade(pal.accentGlow, 1.2));
  } else if (cap < 0.78) {
    b.cyl('chrome', x, y, z, Math.min(cw, cd) * 0.24, 0.1, rng.range(4, 9), 8, shade(pal.chrome, 0.9));
  } else {
    b.box('glass', x, y, z, cw * 0.7, rng.range(2.5, 5), cd * 0.7, shade(pal.edge, 1.1));
    b.dome('chrome', x, y + 3, z, cw * 0.36, cw * 0.3, 10, 4, shade(pal.chrome, 1.0));
  }
}

/** Glass dome on a chrome collar. Pure orbital-suburb energy. */
export function bubbleHab(b, rng, pal, x, z, side) {
  const r = rng.range(3.2, 5.4);
  const base = pal.facades[rng.int(0, pal.facades.length - 1)];
  b.cyl('toon', x, 0, z, r * 1.05, r * 0.95, rng.range(1.6, 3.4), 12, shade(base, 0.95));
  const y = rng.range(1.6, 3.4);
  b.cyl('chrome', x, y, z, r * 1.02, r * 1.02, 0.4, 12, shade(pal.chrome, 0.95));
  b.dome('glass', x, y + 0.4, z, r, r * 0.85, 14, 6, shade(pal.edge, 1.15));
  b.cyl('emissive', x, y + 0.4, z, r * 0.35, r * 0.35, 0.12, 10, shade(pal.accentGlow, 1.1));
  windowBand(b, x, y * 0.5, z, r * 2, r * 1.4, side, 3, shade(pal.lane, 1.1));
}

/** Antenna palm: The Ring's idea of a street tree. */
export function antennaPalm(b, rng, pal, x, z) {
  const h = rng.range(5, 8.5);
  b.cyl('chrome', x, 0, z, 0.3, 0.16, h, 7, shade(pal.chrome, 0.85));
  const fronds = rng.int(5, 7);
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rng.range(0, 0.5);
    const len = rng.range(1.8, 3);
    b.at(x, h, z, a);
    b.box('toon', 0, -0.1, len * 0.5, 0.5, 0.16, len, shade(pal.edge, 1.0));
    b.box('emissive', 0, -0.02, len * 0.9, 0.18, 0.06, 0.5, shade(pal.edge, 1.25));
    b.pop();
  }
  b.dome('emissive', x, h, z, 0.4, 0.4, 8, 3, shade(pal.accentGlow, 1.2));
}

/** An actual palm, for The Shore: curved trunk, drooping fronds, coconuts. */
export function palmTree(b, rng, pal, x, z) {
  const h = rng.range(6, 10);
  const lean = rng.range(-0.22, 0.22);
  const segs = 6;
  const trunk = new THREE.Color('#8a6a44');
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const y0 = h * t0, y1 = h * t1;
    const x0 = x + lean * y0 * 0.5, x1 = x + lean * y1 * 0.5;
    b.cyl('toon', x0, y0, z, 0.34 - t0 * 0.16, 0.34 - t1 * 0.16, y1 - y0, 7, shade(trunk, 1 - i * 0.04));
    if (x1 !== x0) { /* the lean is baked into each segment's own origin */ }
  }
  const topX = x + lean * h * 0.5;
  const fronds = rng.int(6, 8);
  const leaf = new THREE.Color('#4fbf7a');
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rng.range(0, 0.4);
    const len = rng.range(2.4, 3.8);
    b.at(topX, h, z, a);
    b.box('toon', 0, 0.1, len * 0.42, 0.9, 0.14, len * 0.85, shade(leaf, rng.range(0.85, 1.15)));
    b.box('toon', 0, -0.42, len * 0.85, 0.55, 0.12, len * 0.5, shade(leaf, 0.78));
    b.pop();
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.dome('toon', topX + Math.cos(a) * 0.4, h - 0.5, z + Math.sin(a) * 0.4, 0.3, 0.3, 7, 3, new THREE.Color('#7a5a3a'));
  }
}

/** Street lamp: chrome hook with a glowing bulb, leaning over the road. */
export function lamp(b, pal, x, z, side) {
  const facing = -side;
  b.cyl('chrome', x, 0, z, 0.22, 0.14, 5.4, 7, shade(pal.chrome, 0.9));
  b.box('chrome', x + facing * 0.7, 5.4, z, 1.6, 0.22, 0.3, shade(pal.chrome, 0.9));
  b.dome('emissive', x + facing * 1.4, 5.0, z, 0.42, -0.42, 8, 3, shade(pal.lane, 1.3));
  b.dome('emissive', x + facing * 1.4, 5.4, z, 0.42, 0.3, 8, 3, shade(pal.accentGlow, 1.1));
}

/** Billboard on a chrome mast: flat glowing panel angled at the player. */
export function billboard(b, rng, pal, x, z, side) {
  const facing = -side;
  const h = rng.range(5, 8);
  b.cyl('chrome', x, 0, z, 0.26, 0.2, h, 6, shade(pal.chrome, 0.9));
  b.at(x + facing * 1.1, h, z, facing * 0.35);
  b.box('toon', 0, 0, 0, 5.6, 3.2, 0.3, new THREE.Color('#150a24'));
  const tint = pal.archTints[rng.int(0, pal.archTints.length - 1)];
  b.box('emissive', 0, 0.35, 0.18, 5.0, 1.5, 0.08, shade(tint, 1.25));
  b.box('emissive', 0, 2.15, 0.18, 3.2, 0.5, 0.08, shade(pal.lane, 1.2));
  b.pop();
}

/**
 * Market stall: awning, crate stack, hanging lanterns and a vertical sign.
 * Packed tight against the kerb, which is what makes The Market feel narrow
 * even though the road is exactly as wide as everywhere else.
 */
export function marketStall(b, rng, pal, x, z, side) {
  const facing = -side;
  const w = rng.range(3, 4.6);
  const d = rng.range(3, 5);
  const tint = pal.archTints[rng.int(0, pal.archTints.length - 1)];

  b.box('toon', x, 0, z, w, 2.4, d, new THREE.Color('#2a1836'));
  b.at(x + facing * (w * 0.35), 2.4, z, 0, 1, 1, 1);
  b.box('toon', 0, 0, 0, w * 1.15, 0.22, d * 1.1, shade(tint, 0.55));
  b.box('emissive', 0, -0.16, 0, w * 1.0, 0.1, d * 1.0, shade(tint, 1.3));
  b.pop();

  // crates
  for (let i = 0; i < rng.int(2, 4); i++) {
    b.box('toon', x + rng.range(-w * 0.3, w * 0.3), 2.62, z + rng.range(-d * 0.3, d * 0.3),
      rng.range(0.5, 0.9), rng.range(0.4, 0.8), rng.range(0.5, 0.9),
      shade(pal.facades[rng.int(0, pal.facades.length - 1)], 1.5));
  }

  // vertical neon sign facing the road
  const sh = rng.range(3, 5.5);
  b.box('chrome', x + facing * (w * 0.55), 2.6, z, 0.16, sh, 0.16, shade(pal.chrome, 0.8));
  b.box('toon', x + facing * (w * 0.62), 2.6, z, 0.12, sh * 0.9, 0.9, new THREE.Color('#150a24'));
  for (let i = 0; i < 4; i++) {
    b.box('emissive', x + facing * (w * 0.70), 3.0 + i * (sh * 0.2), z, 0.06, 0.42, 0.62, shade(tint, 1.35));
  }

  // hanging lanterns over the kerb
  for (let i = 0; i < 3; i++) {
    const lz = z - d / 2 + (i + 0.5) * (d / 3);
    b.cyl('chrome', x + facing * (w * 0.4), 2.62, lz, 0.04, 0.04, 0.7, 4, shade(pal.chrome, 0.7));
    b.dome('emissive', x + facing * (w * 0.4), 3.32, lz, 0.28, -0.34, 8, 3, shade(pal.accentGlow, 1.25));
  }
}

/** Round arch spanning the road: the tunnel-of-light rhythm at speed. */
export function skyArch(b, pal, z, roadHalf, color) {
  b.arch('chrome', 0, 0, z, roadHalf + 1.6, 0.5, 16, 6, shade(pal.chrome, 0.95), Math.PI, 0);
  b.arch('emissive', 0, 0, z, roadHalf + 1.6, 0.22, 16, 5, shade(color, 1.3), Math.PI, 0);
}

/** Flat gantry instead of an arch: harsher, industrial, right for The Market. */
export function gantry(b, pal, z, roadHalf, color) {
  const h = 6.2;
  for (const s of [-1, 1]) {
    b.box('toon', s * (roadHalf + 1.1), 0, z, 0.9, h, 0.9, new THREE.Color('#231436'));
    b.box('emissive', s * (roadHalf + 1.1), 1.2, z, 0.95, 0.14, 0.95, shade(color, 1.3));
    b.box('emissive', s * (roadHalf + 1.1), 4.4, z, 0.95, 0.14, 0.95, shade(color, 1.3));
  }
  b.box('toon', 0, h, z, (roadHalf + 1.6) * 2, 0.9, 1.0, new THREE.Color('#1c1030'));
  b.box('emissive', 0, h - 0.16, z, (roadHalf + 1.2) * 2, 0.14, 1.05, shade(color, 1.35));
  for (let i = -2; i <= 2; i++) {
    b.box('emissive', i * 2.4, h - 0.9, z, 1.1, 0.5, 0.1, shade(pal.lane, 1.15));
  }
}

/**
 * A swell crossing the road on The Shore: a low curved crest of water. Not a
 * wall, a timing gate. You clear it in the air or you plough through it.
 */
/**
 * A swell rearing up out of the sea.
 *
 * Built as a grid, not a row: it needs a profile front-to-back as well as
 * across, or it reads as a slab dropped on the water. It also runs far wider
 * than the lane, because a wave that stops at the lane edge is a ramp.
 */
export function swell(b, pal, z) {
  const span = 46;
  const cols = 22;
  const rows = 7;
  const depth = 7;

  for (let i = 0; i < cols; i++) {
    const tx = (i + 0.5) / cols;
    const x = -span / 2 + span * tx;
    const w = span / cols;
    // taller in the middle, tapering out to nothing at the far edges
    const across = Math.pow(Math.sin(tx * Math.PI), 0.45);
    for (let j = 0; j < rows; j++) {
      const tz = (j + 0.5) / rows;
      const cz = z - depth / 2 + depth * tz;
      const along = Math.sin(tz * Math.PI);
      const h = 0.06 + across * along * 1.05;
      b.box('toon', x, 0.02, cz, w * 1.03, h, (depth / rows) * 1.03,
        shade(pal.edge, 0.62 + along * 0.22));
      // foam only on the crest row
      if (tz > 0.5 && tz < 0.72 && across > 0.35) {
        b.box('emissive', x, 0.02 + h, cz, w * 1.03, 0.06, (depth / rows) * 0.8, shade(pal.lane, 0.5));
      }
    }
    // the lip curls forward off the crest, which is what makes it read broken
    if (across > 0.3) {
      const hc = 0.06 + across * 1.05;
      b.box('toon', x, hc * 0.94, z + depth * 0.24, w * 1.03, 0.22, 1.5, shade(pal.edge, 0.95));
      b.box('emissive', x, hc * 0.94 + 0.22, z + depth * 0.24, w * 1.03, 0.06, 1.55, shade(pal.lane, 0.62));
    }
  }
}

/**
 * A grind rail in one lane of The Market: chrome tube on posts with a lit top
 * edge so it is obvious from far away that it is standable, not an obstacle.
 */
export function rail(b, pal, x, from, to) {
  const len = to - from;
  const mid = -(from + len / 2);
  // Matte, not chrome. A twenty-metre polished bar running to the horizon
  // mirrors the whole environment map and the bloom turns that into a sheet
  // of light across the entire zone. Verified by rendering with bloom off.
  b.box('toon', x, RAIL_H - 0.16, mid, 0.34, 0.2, len, shade(pal.accent, 0.75));
  b.box('emissive', x, RAIL_H, mid, 0.26, 0.06, len, shade(pal.accentGlow, 0.7));
  b.box('toon', x, 0, mid, 0.5, 0.12, len, shade(pal.deck, 1.3));
  for (let z = from + 1; z < to; z += 4) {
    b.cyl('toon', x, 0, -z, 0.12, 0.1, RAIL_H - 0.16, 6, shade(pal.accent, 0.55));
  }
  // lit approach ramp so the entry point is unmistakable
  for (let i = 0; i < 3; i++) {
    b.box('emissive', x, 0.04, -(from - 1.6 - i * 1.6), 1.5, 0.02, 0.7, shade(pal.accentGlow, 0.22 + i * 0.18));
  }
}

/**
 * Cargo stack for The Docks: containers piled at angles, chrome banding, a
 * lit hazard stripe. Blocky on purpose, because everything else in the game
 * is rounded and the docks should feel like the industrial back of house.
 */
export function cargoStack(b, rng, pal, x, z, side) {
  const cols = rng.int(2, 3);
  let y = 0;
  for (let c = 0; c < cols; c++) {
    const rows = rng.int(1, 3);
    for (let r = 0; r < rows; r++) {
      const w = rng.range(4.5, 6.5);
      const d = rng.range(5, 9);
      const h = 2.6;
      const jitter = rng.range(-0.6, 0.6);
      const col = pal.facades[rng.int(0, pal.facades.length - 1)];
      b.at(x + jitter, y, z + rng.range(-1, 1), rng.range(-0.12, 0.12));
      b.box('toon', 0, 0, 0, w, h, d, shade(col, 1 - r * 0.06));
      b.box('chrome', 0, h - 0.2, 0, w + 0.2, 0.2, d + 0.2, shade(pal.chrome, 0.9));
      b.box('chrome', 0, 0, 0, w + 0.2, 0.2, d + 0.2, shade(pal.chrome, 0.85));
      // ribbing
      for (let i = -2; i <= 2; i++) {
        b.box('toon', i * (w / 6), h / 2, d / 2 + 0.06, w / 12, h * 0.7, 0.08, shade(col, 0.8));
      }
      b.box('emissive', 0, h * 0.5, -side * (d / 2 + 0.05), w * 0.5, 0.16, 0.06, shade(pal.accentGlow, 1.1));
      b.pop();
      y += h;
    }
    y = 0;
    x += rng.range(5.5, 7.5) * (side > 0 ? 1 : -1);
  }
}

/**
 * Cloud bank for The Heights: soft stacked domes below the deck, so the road
 * reads as being above the weather rather than floating in nothing.
 */
export function cloudBank(b, rng, pal, x, z) {
  const puffs = rng.int(4, 7);
  const baseY = rng.range(-9, -4);
  for (let i = 0; i < puffs; i++) {
    const r = rng.range(3.5, 8);
    b.dome('toon', x + rng.range(-9, 9), baseY + rng.range(-1.5, 2.5), z + rng.range(-10, 10),
      r, r * rng.range(0.45, 0.75), 10, 4, shade(pal.lane, rng.range(0.88, 1.05)));
  }
}

/**
 * Bloom pad for The Greenhouse: a fat flower that fires you upward. Built low
 * and wide so it never reads as something to avoid, which is the opposite of
 * every other object on the track.
 */
/**
 * The Storm's launch ramp: a kicker, not a flower.
 *
 * The bloom pad it replaced was a ring of petals, which is the right shape for
 * a greenhouse and the wrong shape for anything else — nothing about it said
 * "you will be thrown forwards and upwards". A wedge does, because it is the
 * shape of the arc it produces, and it says it from a long way off.
 *
 * She travels towards -z, so the wedge rises that way and the lip is the far
 * edge. Built from quads rather than boxes because the matrix stack only
 * rotates around Y, so a slope cannot be made by tilting a box.
 */
export function launchRamp(b, pal, x, z) {
  const w = 2.45, len = 6.2, top = 1.25;
  const zNear = z + len / 2, zFar = z - len / 2;
  const P = (dx, y, zz) => [x + dx, y, zz];
  const deck = shade(pal.kerb, 0.95);
  const side = shade(pal.deck, 1.2);
  // slope, then the two flanks and the back face that stop it reading as paper
  b.quad('toon', P(-w, 0, zNear), P(w, 0, zNear), P(w, top, zFar), P(-w, top, zFar), deck);
  // The flanks are right triangles in profile, not quads: a quad here would
  // have two coincident corners and collapse to a zero-area face.
  b.tri('toon', P(w, 0, zNear), P(w, 0, zFar), P(w, top, zFar), side);
  b.tri('toon', P(-w, 0, zFar), P(-w, 0, zNear), P(-w, top, zFar), side);
  b.box('toon', x, 0, zFar - 0.3, w * 2, top, 0.6, shade(pal.deck, 1.05));
  // Chevrons up the slope. They point the way she is going, and they are the
  // part that reads at distance, so they climb with the surface.
  for (let i = 0; i < 4; i++) {
    const t = (i + 0.6) / 4.6;
    b.box('emissive', x, 0.03 + top * t, zNear - len * t, w * 1.5, 0.09, 0.45,
      shade(pal.accentGlow, 0.3 + i * 0.09));
  }
  // lit lip: the exact line she leaves the ground on
  b.box('emissive', x, top, zFar - 0.12, w * 2, 0.16, 0.3, shade(pal.accent, 0.62));
  for (const s of [-1, 1]) {
    b.cyl('chrome', x + s * (w + 0.14), 0, zFar + 0.4, 0.13, 0.11, top + 0.5, 6, shade(pal.chrome, 0.9));
  }
}

export function springPad(b, pal, x, z) {
  const petals = 7;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    b.at(x + Math.cos(a) * 1.15, 0.06, z + Math.sin(a) * 1.15, a);
    b.dome('toon', 0, 0, 0, 0.85, 0.34, 7, 3, shade(pal.accentGlow, 0.9 + (i % 2) * 0.2));
    b.pop();
  }
  b.cyl('toon', x, 0.02, z, 1.35, 1.15, 0.28, 12, shade(pal.accent, 1.0));
  b.dome('emissive', x, 0.3, z, 0.95, 0.4, 12, 4, shade(pal.lane, 0.85));
  b.cyl('emissive', x, 0.68, z, 0.28, 0.16, 0.5, 8, shade(pal.accentGlow, 1.3));
  // A hint of updraft, kept small: at full size these read as yellow walls
  // standing in the lane, which is the opposite of "safe to touch".
  for (let i = 0; i < 3; i++) {
    b.box('beam', x, 1.1 + i * 1.4, z, 0.8 - i * 0.16, 0.4, 0.05, shade(pal.accentGlow, 0.22 - i * 0.05));
  }
}

/**
 * The glass vault of a greenhouse: white ribs with panes between them, arcing
 * right over the track. It is the single image that says "greenhouse", and it
 * changes the silhouette of the whole zone rather than its colour.
 */
export function glassVault(b, pal, z, roadHalf) {
  const r = roadHalf + 4.5;
  const frame = new THREE.Color('#fdf6e8');
  b.arch('chrome', 0, 0.4, z, r, 0.34, 18, 6, shade(frame, 0.95), Math.PI, 0);
  b.arch('glass', 0, 0.4, z, r, 0.9, 18, 5, shade(pal.edge, 1.05), Math.PI, 0);
  // vertical glazing bars, which is what reads as panes at speed
  const bars = 7;
  for (let i = 1; i < bars; i++) {
    const a = (i / bars) * Math.PI;
    b.at(Math.cos(a) * r, 0.4 + Math.sin(a) * r, z, 0, 1, 1, 1);
    b.box('chrome', 0, 0, 0, 0.2, 0.2, 2.6, shade(frame, 0.9));
    b.pop();
  }
  for (const s of [-1, 1]) {
    b.box('chrome', s * r, 0, z, 0.5, 0.5, 0.5, shade(frame, 0.85));
    b.box('toon', s * (r + 0.4), 0, z, 0.7, 1.1, 1.4, shade(pal.deck, 1.2));
  }
}

/**
 * A raised bed spilling over the kerb: soil, layered leaves, a few blooms.
 * Built in three sizes of dome so the mass reads as foliage rather than as a
 * green box, which is what the first pass got wrong.
 */
export function plantBed(b, rng, pal, x, z, side) {
  const soil = new THREE.Color('#4a3524');
  const w = rng.range(3.4, 5);
  const d = rng.range(4, 7);
  b.box('toon', x, 0, z, w, 0.7, d, shade(new THREE.Color('#c8b088'), 1.0));
  b.box('toon', x, 0.7, z, w - 0.4, 0.2, d - 0.4, shade(soil, 1.0));

  const clumps = rng.int(5, 9);
  for (let i = 0; i < clumps; i++) {
    const px = x + rng.range(-w * 0.4, w * 0.4);
    const pz = z + rng.range(-d * 0.4, d * 0.4);
    const r = rng.range(0.5, 1.3);
    const h = rng.range(0.6, 2.1);
    b.dome('toon', px, 0.85, pz, r, h, 7, 3, shade(pal.edge, rng.range(0.62, 1.1)));
    if (rng.chance(0.45)) {
      // a bloom on top, one of the few warm notes in a very green zone
      const bloom = rng.chance(0.5) ? pal.accent : pal.accentGlow;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        b.dome('toon', px + Math.cos(a) * r * 0.32, 0.85 + h, pz + Math.sin(a) * r * 0.32,
          r * 0.3, r * 0.16, 6, 2, shade(bloom, 1.0));
      }
      b.dome('emissive', px, 0.85 + h + 0.05, pz, r * 0.16, r * 0.14, 6, 2, shade(pal.lane, 0.9));
    }
  }
}

/** Big arcing fern, drooping over the track edge. */
export function bigFern(b, rng, pal, x, z) {
  const fronds = rng.int(6, 9);
  const h = rng.range(1.4, 2.6);
  b.cyl('toon', x, 0, z, 0.3, 0.2, h * 0.5, 7, shade(new THREE.Color('#4a6b32'), 1.0));
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rng.range(0, 0.4);
    const len = rng.range(2, 3.6);
    const tint = shade(pal.edge, rng.range(0.6, 1.0));
    b.at(x, h * 0.5, z, a);
    // three tapering segments make the frond bend instead of sticking out flat
    for (let s = 0; s < 3; s++) {
      const t = s / 3;
      b.box('toon', 0, -t * t * len * 0.55, len * (t + 0.16), 0.75 - t * 0.22, 0.13, len * 0.36, tint);
    }
    b.pop();
  }
}

/**
 * Wall bay for The Vault: a recessed alcove with a lit screen and cable runs.
 * The tube was legible but empty, and empty reads as unfinished.
 */
export function vaultBay(b, rng, pal, z, roadHalf, side) {
  const x = side * (roadHalf + 0.7);
  const h = rng.range(1.6, 2.6);
  const y = rng.range(1.2, 3.2);
  b.box('toon', x, y, z, 0.5, h, 3.2, shade(pal.road, 0.7));
  b.box('emissive', x - side * 0.16, y + 0.16, z, 0.1, h - 0.32, 2.7,
    shade(rng.chance(0.5) ? pal.accentGlow : pal.edge, 0.85));
  b.box('chrome', x - side * 0.1, y + h, z, 0.4, 0.18, 3.4, shade(pal.chrome, 0.85));
  b.box('chrome', x - side * 0.1, y - 0.18, z, 0.4, 0.18, 3.4, shade(pal.chrome, 0.85));
  // cable bundle running the length of the wall
  for (let i = 0; i < 3; i++) {
    b.box('toon', x - side * 0.22, 0.5 + i * 0.22, z, 0.16, 0.16, 3.6, shade(pal.deck, 0.8 + i * 0.15));
  }
}

/**
 * A hoop hung in the tube for The Vault. High ones want a jump, low ones want
 * a slide, and the height alone has to say which: there is no other cue at
 * 50 km/h. Threading one is a reward, missing it only costs tempo.
 */
export function ringGate(b, pal, x, z, mode, altY = null) {
  // In a flight zone the hoop sits on a grid cell and there is no floor to
  // stand a post on, so it hangs on its own.
  const flying = altY !== null;
  const high = mode === 'high';
  const cy = flying ? altY + 0.6 : (high ? 2.5 : 0.95);
  const r = flying ? 1.05 : (high ? 1.15 : 0.85);
  const tint = flying ? pal.accentGlow : (high ? pal.accentGlow : pal.edge);

  b.arch('chrome', x, cy, z, r, 0.16, 16, 6, shade(pal.chrome, 0.9), Math.PI * 2, 0);
  b.arch('emissive', x, cy, z, r - 0.16, 0.07, 16, 5, shade(tint, 1.15), Math.PI * 2, 0);
  // Faint: a whole tube of these stacks additively and floods the zone.
  b.arch('beam', x, cy, z, r * 0.6, r * 0.42, 12, 4, shade(tint, flying ? 0.09 : 0.24), Math.PI * 2, 0);

  // mount: hung from the vault for a high ring, stood on the floor for a low one
  if (flying) {
    b.box('chrome', x, cy + r, z, 0.12, 3.4, 0.12, shade(pal.chrome, 0.55));
    b.box('chrome', x, cy - r - 3.4, z, 0.12, 3.4, 0.12, shade(pal.chrome, 0.55));
  } else if (high) {
    b.box('chrome', x, cy + r, z, 0.18, 2.6, 0.18, shade(pal.chrome, 0.7));
  } else {
    for (const s of [-1, 1]) {
      b.box('chrome', x + s * r * 0.8, 0, z, 0.16, cy * 0.65, 0.16, shade(pal.chrome, 0.7));
    }
  }
  // approach marks, on the floor when there is one, in the air when flying
  for (let i = 0; i < 3; i++) {
    const my = flying ? cy : 0.04;
    b.box('emissive', x, my, z + 2.2 + i * 1.8, 1.5, 0.02, 0.5, shade(tint, (flying ? 0.3 : 0.5) - i * 0.09));
  }
}

/**
 * Conveyor belt for The Foundry. Colour and chevron direction carry the whole
 * message: green pointing forward pushes you, red pointing back drags you.
 * There is no other cue, so the two must never look alike.
 */
export function conveyor(b, pal, x, from, to, dir) {
  const len = to - from;
  const mid = -(from + len / 2);
  const tint = dir > 0 ? new THREE.Color('#6fe08a') : new THREE.Color('#ff4a3a');

  b.box('toon', x, 0.02, mid, 2.5, 0.16, len, shade(pal.road, 1.6));
  for (const s of [-1, 1]) {
    b.box('chrome', x + s * 1.28, 0.02, mid, 0.24, 0.3, len, shade(pal.chrome, 0.8));
  }
  // Drive rollers at each end.
  //
  // Boxes, not cylinders. `Builder.at()` only rotates around Y, so the cyl()
  // this used to use stood on end: every belt had a 2.4 m chrome post planted
  // at each end, right in the lane, that you walked straight through.
  for (const z of [from + 0.5, to - 0.5]) {
    b.box('chrome', x, 0.06, -z, 2.4, 0.34, 0.44, shade(pal.chrome, 0.9));
    b.box('chrome', x, 0.06, -z, 2.5, 0.2, 0.28, shade(pal.chrome, 1.0));
  }
  for (let z = from + 1.5; z < to - 0.5; z += 2.2) {
    // a chevron: two bars meeting at a point, apex in the direction of travel
    for (const s of [-1, 1]) {
      b.at(x + s * 0.62, 0.19, -z, -s * 0.72 * dir);
      b.box('emissive', 0, 0, 0, 0.34, 0.03, 1.7, shade(tint, 0.85));
      b.pop();
    }
  }
}

/** Parked hover pod, floating just off the deck. */
export function hoverPod(b, rng, pal, x, z) {
  const y = rng.range(1.1, 1.9);
  const col = pal.facades[rng.int(0, pal.facades.length - 1)];
  b.at(x, y, z, rng.range(-0.3, 0.3));
  b.taper('toon', 0, 0, 0, 2.6, 0.9, 4.6, 0.5, shade(col, 1.0));
  b.dome('glass', 0, 0.9, -0.4, 1.05, 0.85, 10, 4, shade(pal.edge, 1.2));
  b.box('emissive', 0, 0.28, 2.2, 1.6, 0.16, 0.16, shade(pal.accentGlow, 1.3));
  b.box('chrome', 0, 0.1, 0, 2.9, 0.22, 3.0, shade(pal.chrome, 0.95));
  b.pop();
  b.dome('emissive', x, y - 0.35, z, 0.9, -0.3, 8, 2, shade(pal.edge, 0.9));
}
