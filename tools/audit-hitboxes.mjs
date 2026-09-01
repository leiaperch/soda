/**
 * Hitbox audit: does any obstacle draw geometry on the surface the player
 * physically travels past?
 *
 * The rule is stated once, at the top of src/world/obstacles.js, and it is read
 * per contract rather than per object:
 *   - a BARRIER is jumped, so nothing may stand above `base + h`;
 *   - a GATE is slid under, so nothing may hang below `base`;
 *   - a BLOCK is 3.6 m against a 1.8 m apex, so its top is unreachable and it
 *     is exempt. Same for the hedge and the bumper, which are never cleared.
 *   - a PANEL blocks one cell of a flight grid and is passed on either side,
 *     so both its faces are travelled;
 *   - a DRIFT floats overhead and is passed underneath, so only its underside
 *     counts.
 *
 * Collision, from game.js `_collisions()`, is exact in Y and padded in X/Z, so
 * geometry that spills sideways is still inside the box that kills you. Y is
 * the only axis worth auditing.
 *
 * Run: node tools/audit-hitboxes.mjs
 */
import * as THREE from 'three';
import { Builder } from '../src/core/builder.js';
import { buildObstacle } from '../src/world/obstacles.js';
import { OBSTACLE, ALT_Y } from '../src/world/layout.js';
import { panelSpec } from '../src/world/chunks.js';

/** Geometry lying flat on the road is a marking, not a solid. */
const DECAL_Y = 0.15;

/**
 * Half-width of the corridor she actually occupies, centred on the obstacle.
 *
 * Without this every gate fails, and wrongly: a gantry's legs stand at the
 * edge of its box and run to the ground, which is "below the base" by the
 * letter of the rule and completely fine by its intent. She goes through the
 * gap, not through the legs. Only what is inside the clear span — the box
 * narrowed by her own radius — hangs into somewhere she can be.
 *
 * A barrier is the opposite case and gets no corridor at all: she jumps it
 * from anywhere along it, and can be as far off centre as the collision test
 * allows, so every part of its top is a surface she travels past.
 */
const RADIUS = 0.52;   // PLAYER.radius, from player.js

/** Anything under this is measurement noise, not a shape that reads. */
const EPS = 0.002;

const col = (hex) => new THREE.Color(hex);
const PAL = {
  accent: col('#ff4fa3'), accentGlow: col('#ff9ad5'), chrome: col('#cfd8e3'),
  edge: col('#5ef2c8'), lane: col('#7fd0ff'), deck: col('#8a7f9c'),
  road: col('#3a3550'), kerb: col('#e8e3f0'),
  facades: [col('#d86fa8'), col('#f0c46b'), col('#8fd6f2'), col('#c79bf0')],
};

/** Every form, with the contract it has to keep. */
const FORMS = [
  ...['fence', 'rock', 'crate', 'slab', 'log', 'hoard', 'kerbstack', 'barrels', 'cabinet', 'ridge', 'cable', 'dish'].map((f) => ({ f, t: 'barrier' })),
  ...['gantry', 'net', 'beam', 'vine', 'pipe', 'skywalk', 'scanner', 'signal', 'marquee', 'archway', 'strut', 'monitors'].map((f) => ({ f, t: 'gate' })),
  ...['pillar', 'signtower', 'wreck', 'container', 'tree', 'press', 'mast', 'gumball', 'booth', 'crane', 'spire', 'pylon', 'transformer'].map((f) => ({ f, t: 'block' })),
  { f: 'hedge', t: 'hedge' }, { f: 'bumper', t: 'bumper' }, { f: 'drift', t: 'drift' },
  ...[0, 1, 2].map((alt) => ({ f: `panel(alt ${alt})`, t: 'panel', alt, spec: panelSpec(alt) })),
];

/** Build one form alone and return the Y span of what it actually drew. */
function extent(entry) {
  const b = new Builder();
  const spec = entry.spec || OBSTACLE[entry.t];
  const kit = { barrier: 'fence', gate: 'gantry', block: 'pillar' };
  if (entry.t === 'barrier' || entry.t === 'gate' || entry.t === 'block') kit[entry.t] = entry.f;
  buildObstacle(b, PAL, { t: entry.t, z: 0, spec }, 0, kit);

  // Per TRIANGLE, not per vertex. A box wide enough to span the corridor has
  // its corners outside it and no vertex within — a vertex scan calls that
  // clear, when it is in fact a slab straight across the gap.
  const clear = Math.max(0.2, spec.w / 2 - RADIUS);
  let min = Infinity, max = -Infinity, minSolid = Infinity, maxIn = -Infinity;
  for (const bucket of b._buckets.values()) {
    for (let i = 0; i < bucket.pos.length; i += 9) {
      const xs = [bucket.pos[i], bucket.pos[i + 3], bucket.pos[i + 6]];
      const ys = [bucket.pos[i + 1], bucket.pos[i + 4], bucket.pos[i + 7]];
      const lo = Math.min(...ys), hi = Math.max(...ys);
      if (lo < min) min = lo;
      if (hi > max) max = hi;
      // Does this triangle's x-span reach into the corridor at all?
      if (Math.min(...xs) > clear || Math.max(...xs) < -clear) continue;
      if (lo > DECAL_Y && lo < minSolid) minSolid = lo;
      if (hi > maxIn) maxIn = hi;
    }
  }
  return { spec, min, max, minSolid, maxIn };
}

const rows = [];
for (const entry of FORMS) {
  const { spec, min, max, minSolid, maxIn } = extent(entry);
  const top = spec.base + spec.h;
  const over = [];

  // Above the box: only a barrier is ever up there, and from anywhere along it.
  if (entry.t === 'barrier' && max > top + EPS) {
    over.push({ face: 'above', by: max - top });
  }
  // Below the box: gates, drifts and panels are all passed underneath.
  if (['gate', 'drift', 'panel'].includes(entry.t) && minSolid < spec.base - EPS) {
    over.push({ face: 'below', by: spec.base - minSolid });
  }
  // A panel is also flown OVER, and the limit there is not its own box top —
  // it is the altitude of the cell above, which is where she actually is.
  if (entry.t === 'panel' && entry.alt < ALT_Y.length - 1) {
    const overhead = ALT_Y[entry.alt + 1];
    if (maxIn > overhead + EPS) over.push({ face: 'into the cell above', by: maxIn - overhead });
  }
  rows.push({ ...entry, spec, min, max, over });
}

const bad = rows.filter((r) => r.over.length);
const pad = (s, n) => String(s).padEnd(n);
const m = (v) => `${v >= 0 ? ' ' : ''}${v.toFixed(3)}`;

console.log('\nform            contract   box Y            drawn Y          verdict');
console.log('-'.repeat(78));
for (const r of rows) {
  const box = `${m(r.spec.base)}..${m(r.spec.base + r.spec.h)}`;
  const drawn = `${m(r.min)}..${m(r.max)}`;
  const verdict = r.over.length
    ? r.over.map((o) => `${o.face} by ${(o.by * 100).toFixed(1)} cm`).join(', ')
    : 'ok';
  console.log(`${pad(r.f, 15)} ${pad(r.t, 10)} ${pad(box, 16)} ${pad(drawn, 16)} ${verdict}`);
}
console.log('-'.repeat(78));
console.log(`${rows.length} forms, ${bad.length} outside their box.`);
console.log(`Geometry at or below y=${DECAL_Y} is read as a road marking and ignored.\n`);
process.exit(bad.length ? 1 : 0);
