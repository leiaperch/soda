import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import {
  resolvePalette, tower, bubbleHab, antennaPalm, palmTree, lamp, billboard,
  marketStall, skyArch, gantry, hoverPod, swell, rail,
} from './props.js';
import { LANE_X, ROAD_HALF, CHUNK_LEN, RAIL_H, OBSTACLE } from './layout.js';

export { LANE_X, ROAD_HALF, CHUNK_LEN, RAIL_H, OBSTACLE };

/**
 * Authored obstacle patterns. Placement is never random: random obstacle
 * placement reads as noise and produces unfair or trivial stretches. Each
 * pattern is a hand-made phrase, and the track picks phrases by tier as the
 * player's speed climbs.
 */
const PATTERNS = [
  // --- tier 0: teach the verbs -------------------------------------------
  { tier: 0, obstacles: [{ t: 'barrier', lane: 1, z: 24 }], cells: [{ lane: 1, z: 14, n: 4 }] },
  { tier: 0, obstacles: [{ t: 'gate', lane: 1, z: 26 }], cells: [{ lane: 1, z: 30, n: 4 }] },
  { tier: 0, obstacles: [{ t: 'block', lane: 1, z: 22 }], cells: [{ lane: 0, z: 28, n: 3 }] },
  { tier: 0, obstacles: [{ t: 'barrier', lane: 0, z: 18 }, { t: 'barrier', lane: 2, z: 18 }], cells: [{ lane: 1, z: 22, n: 4 }] },

  // --- tier 1: combine two verbs -----------------------------------------
  { tier: 1, obstacles: [{ t: 'block', lane: 0, z: 14 }, { t: 'gate', lane: 1, z: 30 }], cells: [{ lane: 2, z: 18, n: 3 }] },
  { tier: 1, obstacles: [{ t: 'barrier', lane: 1, z: 12 }, { t: 'barrier', lane: 1, z: 22 }, { t: 'barrier', lane: 1, z: 32 }], cells: [{ lane: 1, z: 17, n: 2 }] },
  { tier: 1, obstacles: [{ t: 'gate', lane: 0, z: 16 }, { t: 'gate', lane: 1, z: 16 }, { t: 'block', lane: 2, z: 34 }], cells: [{ lane: 0, z: 24, n: 4 }] },
  { tier: 1, obstacles: [{ t: 'block', lane: 1, z: 18 }, { t: 'block', lane: 0, z: 32 }], cells: [{ lane: 2, z: 26, n: 4 }] },

  // --- tier 2: forced routes ---------------------------------------------
  { tier: 2, obstacles: [{ t: 'block', lane: 0, z: 12 }, { t: 'block', lane: 1, z: 12 }, { t: 'gate', lane: 2, z: 26 }, { t: 'barrier', lane: 2, z: 38 }], cells: [{ lane: 2, z: 30, n: 3 }] },
  { tier: 2, obstacles: [{ t: 'gate', lane: 0, z: 14 }, { t: 'barrier', lane: 1, z: 14 }, { t: 'block', lane: 2, z: 14 }, { t: 'block', lane: 0, z: 34 }], cells: [{ lane: 1, z: 24, n: 5 }] },
  { tier: 2, obstacles: [{ t: 'barrier', lane: 0, z: 10 }, { t: 'gate', lane: 1, z: 20 }, { t: 'barrier', lane: 2, z: 30 }, { t: 'gate', lane: 1, z: 40 }], cells: [{ lane: 1, z: 35, n: 3 }] },
  { tier: 2, obstacles: [{ t: 'block', lane: 1, z: 10 }, { t: 'block', lane: 1, z: 20 }, { t: 'block', lane: 0, z: 30 }, { t: 'block', lane: 2, z: 40 }], cells: [{ lane: 0, z: 15, n: 3 }, { lane: 2, z: 35, n: 3 }] },
];

/**
 * Per-zone feature layouts. Authored like the obstacle phrases and for the
 * same reason: a swell you cannot see coming, or a rail that starts under a
 * gate, is not difficulty, it is a bug the player blames themselves for.
 */
const FEATURES = {
  swell: [
    [{ z: 16 }, { z: 34 }],
    [{ z: 11 }, { z: 26 }, { z: 41 }],
    [{ z: 22 }],
    [{ z: 14 }, { z: 38 }],
  ],
  rail: [
    [{ lane: 0, from: 10, to: 30 }],
    [{ lane: 2, from: 14, to: 36 }],
    [{ lane: 1, from: 9, to: 25 }, { lane: 2, from: 31, to: 44 }],
    [{ lane: 0, from: 8, to: 22 }, { lane: 1, from: 28, to: 43 }],
  ],
};

/** True when an obstacle sits close enough to a feature to make it unfair. */
function conflicts(o, features) {
  return features.some((f) => (f.kind === 'swell'
    ? Math.abs(o.z - f.z) < 5.5
    : o.lane === f.lane && o.z > f.from - 5 && o.z < f.to + 5));
}

export function pickPattern(rng, tier) {
  const pool = PATTERNS.filter((p) => p.tier <= tier);
  return pool[rng.int(0, pool.length - 1)];
}

const _c = new THREE.Color();
const shade = (color, m) => _c.copy(color).multiplyScalar(m).clone();

function buildRoad(b, pal, props) {
  const L = CHUNK_LEN;
  const mid = -L / 2;

  b.box('toon', 0, -1.2, mid, ROAD_HALF * 2 + 9, 1.2, L, shade(pal.road, 0.6));
  b.slab('toon', 0, 0.02, mid, ROAD_HALF * 2, L, pal.road);

  for (const s of [-1, 1]) {
    b.box('toon', s * (ROAD_HALF + 0.35), 0, mid, 0.7, 0.42, L, shade(pal.kerb, 0.95));
    b.box('emissive', s * (ROAD_HALF + 0.35), 0.42, mid, 0.5, 0.07, L, shade(pal.edge, 1.15));
    b.box('toon', s * (ROAD_HALF + 3.2), 0, mid, 5.4, 0.4, L, pal.deck);
  }

  // Dashed lane dividers
  for (let z = 1; z < L; z += 4) {
    for (const x of [-1.3, 1.3]) {
      b.box('emissive', x, 0.03, -z, 0.16, 0.02, 2.0, shade(pal.lane, 1.0));
    }
  }

  // Guard rails on both kerbs
  for (const s of [-1, 1]) {
    const x = s * (ROAD_HALF + 0.9);
    for (let z = 2; z < L; z += 6) {
      b.cyl('chrome', x, 0.4, -z, 0.13, 0.11, 1.0, 6, shade(pal.chrome, 0.9));
    }
    b.box('chrome', x, 1.3, mid, 0.18, 0.16, L, shade(pal.chrome, 0.95));
  }

  // The Shore replaces the far deck with open water and a strip of sand.
  if (props.waterSides) {
    for (const s of [-1, 1]) {
      b.box('toon', s * (ROAD_HALF + 10), -0.1, mid, 9, 0.3, L, shade(pal.kerb, 1.02));
      b.slab('glass', s * (ROAD_HALF + 34), 0.25, mid, 44, L, shade(pal.edge, 1.15));
      b.slab('emissive', s * (ROAD_HALF + 15.5), 0.3, mid, 2.2, L, shade(pal.lane, 0.9));
      for (let z = 3; z < L; z += 9) {
        b.box('emissive', s * (ROAD_HALF + 19 + (z % 3) * 2), 0.32, -z, 5.5, 0.05, 0.5, shade(pal.lane, 0.75));
      }
    }
  }
}

function buildObstacle(b, pal, o) {
  const spec = OBSTACLE[o.t];
  const x = LANE_X[o.lane];
  const z = -o.z;

  if (o.t === 'barrier') {
    b.box('toon', x, spec.base, z, spec.w, spec.h, spec.d, shade(pal.accent, 0.9));
    b.box('chrome', x, spec.base + spec.h, z, spec.w + 0.16, 0.16, spec.d + 0.16, shade(pal.chrome, 0.95));
    b.box('emissive', x, spec.base + spec.h * 0.55, z, spec.w * 0.8, 0.16, spec.d + 0.05, shade(pal.accentGlow, 1.3));
    for (const s of [-1, 1]) {
      b.cyl('chrome', x + s * spec.w / 2, 0, z, 0.14, 0.12, spec.h, 6, shade(pal.chrome, 0.9));
    }
  } else if (o.t === 'gate') {
    b.box('toon', x, spec.base, z, spec.w, spec.h, spec.d, shade(pal.deck, 1.2));
    b.box('chrome', x, spec.base - 0.18, z, spec.w + 0.2, 0.2, spec.d + 0.2, shade(pal.chrome, 0.95));
    b.box('emissive', x, spec.base - 0.16, z, spec.w * 0.85, 0.1, spec.d + 0.06, shade(pal.edge, 1.35));
    for (const s of [-1, 1]) {
      b.cyl('chrome', x + s * (spec.w / 2 + 0.1), 0, z, 0.16, 0.14, spec.base + spec.h, 6, shade(pal.chrome, 0.85));
    }
  } else {
    b.taper('toon', x, 0, z, spec.w, spec.h, spec.d, 0.25, shade(pal.accentGlow, 0.7));
    b.box('chrome', x, spec.h, z, spec.w * 0.9, 0.22, spec.d * 0.9, shade(pal.chrome, 0.95));
    for (let i = 0; i < 4; i++) {
      b.box('emissive', x, 0.5 + i * 0.85, z, spec.w * 0.95, 0.12, spec.d + 0.06, shade(pal.lane, 1.15));
    }
  }
}

function buildScenery(b, rng, pal, props) {
  const L = CHUNK_LEN;

  if (props.arches !== 'none' && props.archEvery > 0) {
    for (let z = props.archEvery * 0.3; z < L; z += props.archEvery) {
      const tint = pal.archTints[rng.int(0, pal.archTints.length - 1)];
      if (props.arches === 'gantry') gantry(b, pal, -z, ROAD_HALF, tint);
      else skyArch(b, pal, -z, ROAD_HALF, tint);
    }
  }

  for (const side of [-1, 1]) {
    for (let z = 4; z < L; z += props.lampEvery) {
      lamp(b, pal, side * (ROAD_HALF + 2.0), -z, side);
    }

    for (let z = 6; z < L; z += props.streetEvery) {
      const roll = rng();
      const x = side * (ROAD_HALF + 4.6);
      if (roll < props.stallChance) marketStall(b, rng, pal, side * (ROAD_HALF + 5.4), -z, side);
      else if (roll < props.stallChance + props.palmChance * 0.6) {
        if (props.waterSides) palmTree(b, rng, pal, x, -z);
        else antennaPalm(b, rng, pal, x, -z);
      } else if (rng() < props.podChance) hoverPod(b, rng, pal, x, -z);
    }

    if (rng() < props.billboardChance) {
      billboard(b, rng, pal, side * (ROAD_HALF + 5.0), -rng.range(6, L - 6), side);
    }

    // Skyline behind the deck.
    let z = rng.range(2, 8);
    while (z < L - 4) {
      const depth = rng.range(props.lotMin, props.lotMax);
      const x = side * (ROAD_HALF + 9 + rng.range(0, 9));
      if (rng() < props.skylineChance) {
        if (rng.chance(0.75)) {
          tower(b, rng, pal, x, -(z + depth / 2), side, {
            d: depth, stacks: rng.int(props.towerStacks[0], props.towerStacks[1]),
          });
        } else {
          bubbleHab(b, rng, pal, x, -(z + depth / 2), side);
        }
      }
      if (rng() < props.backRowChance) {
        tower(b, rng, pal, side * (ROAD_HALF + 24 + rng.range(0, 12)), -(z + rng.range(0, 14)), side, {
          w: rng.range(9, 16), d: rng.range(10, 20),
          stacks: rng.int(props.towerStacks[0] + 1, props.towerStacks[1] + 1),
        });
      }
      z += depth + rng.range(2, 6);
    }
  }
}

/**
 * Build one recyclable chunk for a zone. Obstacles are baked into the merged
 * mesh because they never disappear; CELLS and RELAYS are pooled separately
 * since they do.
 */
export function buildChunk(rng, pattern, materials, zone) {
  const pal = resolvePalette(zone);
  const b = new Builder();

  const kind = zone.props.feature;
  const set = kind && FEATURES[kind] ? FEATURES[kind][rng.int(0, FEATURES[kind].length - 1)] : [];
  const features = set.map((f) => ({ kind, ...f }));
  const kept = pattern.obstacles.filter((o) => !conflicts(o, features));

  buildRoad(b, pal, zone.props);
  buildScenery(b, rng, pal, zone.props);
  for (const o of kept) buildObstacle(b, pal, o);
  for (const f of features) {
    if (f.kind === 'swell') swell(b, pal, -f.z);
    else rail(b, pal, LANE_X[f.lane], f.from, f.to);
  }

  const group = b.toGroup(materials);
  const obstacles = kept.map((o) => ({
    lane: o.lane,
    z: -o.z,
    type: o.t,
    spec: OBSTACLE[o.t],
  }));
  const cells = [];
  for (const row of (pattern.cells || [])) {
    for (let i = 0; i < row.n; i++) {
      cells.push({ lane: row.lane, z: -(row.z + i * 2.6) });
    }
  }
  return { group, obstacles, cells, features };
}
