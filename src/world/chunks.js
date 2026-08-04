import * as THREE from 'three';
import { Builder } from '../core/builder.js';
import {
  resolvePalette, tower, bubbleHab, antennaPalm, palmTree, lamp, billboard,
  marketStall, skyArch, gantry, hoverPod, swell, rail, cargoStack, cloudBank,
  springPad, glassVault, plantBed, bigFern, vaultBay, ringGate, conveyor,
} from './props.js';
import { LANE_X, ALT_Y, ROAD_HALF, CHUNK_LEN, RAIL_H, DECK_Y, OBSTACLE } from './layout.js';
import { buildObstacle } from './obstacles.js';

export { LANE_X, ALT_Y, ROAD_HALF, CHUNK_LEN, RAIL_H, DECK_Y, OBSTACLE };

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
  // The Docks: the catwalk simply stops. Widths are tuned to the low-gravity
  // jump arc, which is roughly twice as long as everywhere else.
  // Exactly one gap per chunk, and never near a chunk edge.
  //
  // The low-gravity jump covers about 30 m at that zone's top speed, so two
  // gaps inside one 48 m chunk made the second one unavoidable: you were still
  // in the air from the first with no way to choose where you came down. One
  // per chunk puts 48 m between holes, which leaves real margin.
  gap: [
    [{ from: 20, to: 26 }],
    [{ from: 24, to: 32 }],
    [{ from: 18, to: 25 }],
    [{ from: 22, to: 30 }],
  ],
  // The Heights: whole lane panels are missing. Long enough that jumping them
  // is not on the table, so the answer is always "be in another lane".
  // The Greenhouse: bloom pads that fire you up. Chained close enough that a
  // clean run reads as bouncing rather than as jumping.
  // One pad and one hedge per chunk.
  //
  // The boosted arc covers 26 to 40 m. With pads every 12 m you flew straight
  // over the next pad without triggering it, then landed in front of its hedge
  // with nothing to clear it. Same failure as the first Docks layout: the
  // move outranges the spacing.
  spring: [
    [{ lane: 1, z: 16 }],
    [{ lane: 0, z: 18 }],
    [{ lane: 2, z: 15 }],
    [{ lane: 1, z: 20 }],
  ],
  // The Vault: a slalom of hoops. High wants a jump, low wants a slide, and
  // they alternate so the zone is a rhythm of two verbs rather than dodging.
  ring: [
    [{ lane: 1, z: 12, mode: 'high' }, { lane: 1, z: 24, mode: 'low' }, { lane: 1, z: 36, mode: 'high' }],
    [{ lane: 0, z: 14, mode: 'low' }, { lane: 1, z: 26, mode: 'high' }, { lane: 2, z: 38, mode: 'low' }],
    [{ lane: 2, z: 11, mode: 'high' }, { lane: 2, z: 22, mode: 'high' }, { lane: 1, z: 34, mode: 'low' }],
    [{ lane: 1, z: 15, mode: 'low' }, { lane: 0, z: 28, mode: 'low' }, { lane: 0, z: 40, mode: 'high' }],
  ],
  // The Foundry: conveyor lanes. Every phrase offers at least one belt running
  // with you, so the zone is a choice and never a tax.
  // The middle lane is always the bad belt.
  //
  // With green sometimes landing under the default line, doing nothing was a
  // winning strategy and the lane choice was decorative. Putting the drag
  // where a player starts means the good lane always has to be gone and got.
  belt: [
    [{ lane: 1, from: 8, to: 34, dir: -1 }, { lane: 0, from: 8, to: 34, dir: 1 }],
    [{ lane: 1, from: 6, to: 32, dir: -1 }, { lane: 2, from: 6, to: 32, dir: 1 }],
    [{ lane: 1, from: 10, to: 40, dir: -1 }, { lane: 2, from: 10, to: 24, dir: 1 }, { lane: 0, from: 26, to: 40, dir: 1 }],
    [{ lane: 1, from: 5, to: 44, dir: -1 }, { lane: 0, from: 5, to: 22, dir: 1 }, { lane: 2, from: 24, to: 44, dir: 1 }],
  ],
  // The Storm: an upper deck running over the road, entered off a launch pad.
  // `pad` is where the pad sits, `from`/`to` the span of the deck itself.
  //
  // The gap between them is not decoration. At that zone's gravity a launch
  // takes ~1.1 s to reach deck height and she covers ~24 m in that time, so a
  // deck that started at the pad would be a ceiling she smacks into. Every
  // entry gives her 22 m of run-up and the deck outlasts the arc, so there is
  // always something under her when she comes down.
  // Every deck runs to the chunk boundary and every chunk opens with a stub of
  // deck, so two storm chunks back to back read as one continuous upper road
  // rather than as a row of separate platforms. It also means the deck she is
  // standing on ends at a seam she can see coming, not under her feet.
  deck: [
    [{ pad: 5, from: 26, to: 48 }, { from: 0, to: 16 }],
    [{ pad: 4, from: 24, to: 48 }, { from: 0, to: 12 }],
    [{ pad: 7, from: 28, to: 48 }, { from: 0, to: 18 }],
    [{ pad: 3, from: 23, to: 48 }, { from: 0, to: 14 }],
  ],
  hole: [
    [{ lane: 0, from: 12, to: 30 }],
    [{ lane: 2, from: 9, to: 27 }],
    [{ lane: 1, from: 14, to: 33 }],
    [{ lane: 0, from: 6, to: 22 }, { lane: 2, from: 28, to: 45 }],
    [{ lane: 1, from: 8, to: 24 }, { lane: 0, from: 30, to: 46 }],
  ],
};

/** True when an obstacle sits close enough to a feature to make it unfair. */
function conflicts(o, features) {
  return features.some((f) => {
    if (f.kind === 'swell') return Math.abs(o.z - f.z) < 5.5;
    // A pad owns the stretch after it in every lane, because the hedge it
    // exists to clear spans all of them.
    if (f.kind === 'spring') return o.z > f.z - 6 && o.z < f.z + 15;
    if (f.kind === 'ring') return o.lane === f.lane && Math.abs(o.z - f.z) < 8;
    // The launch pad spans every lane and the whole run-up under the deck has
    // to stay clear: she is committed the moment she touches the pad.
    if (f.kind === 'deck') return o.z > f.pad - 6 && o.z < f.to + 3;
    // A gap spans every lane, so nothing may sit near either lip.
    if (f.kind === 'gap') return o.z > f.from - 9 && o.z < f.to + 6;
    if (f.kind === 'hole') return o.lane === f.lane && o.z > f.from - 7 && o.z < f.to + 3;
    if (f.kind === 'belt') return o.lane === f.lane && o.z > f.from - 3 && o.z < f.to + 3;
    return o.lane === f.lane && o.z > f.from - 5 && o.z < f.to + 5;
  });
}

/**
 * Flight patterns for The Vault. A cell is (lane, altitude), so these read as
 * a 3x3 grid with some cells closed. Every phrase always leaves at least one
 * cell open at each z, and never closes a cell more than one move away from
 * an open one.
 */
const FLIGHT_PATTERNS = [
  { tier: 0, obstacles: [{ t: 'panel', lane: 1, alt: 0, z: 18 }], rings: [{ lane: 1, alt: 1, z: 32 }], cells: [{ lane: 1, alt: 1, z: 34, n: 4 }] },
  { tier: 0, obstacles: [{ t: 'panel', lane: 1, alt: 2, z: 20 }], rings: [{ lane: 1, alt: 0, z: 34 }], cells: [{ lane: 1, alt: 0, z: 36, n: 4 }] },
  { tier: 1, obstacles: [{ t: 'panel', lane: 0, alt: 1, z: 16 }, { t: 'panel', lane: 1, alt: 1, z: 16 }], rings: [{ lane: 2, alt: 1, z: 16 }, { lane: 1, alt: 2, z: 34 }], cells: [{ lane: 2, alt: 1, z: 20, n: 3 }] },
  { tier: 1, obstacles: [{ t: 'panel', lane: 1, alt: 0, z: 14 }, { t: 'panel', lane: 1, alt: 1, z: 30 }], rings: [{ lane: 1, alt: 2, z: 30 }], cells: [{ lane: 1, alt: 2, z: 33, n: 4 }] },
  { tier: 2, obstacles: [{ t: 'panel', lane: 0, alt: 0, z: 14 }, { t: 'panel', lane: 2, alt: 2, z: 14 }, { t: 'panel', lane: 1, alt: 1, z: 32 }], rings: [{ lane: 1, alt: 0, z: 32 }], cells: [{ lane: 1, alt: 0, z: 35, n: 3 }] },
  { tier: 2, obstacles: [{ t: 'panel', lane: 0, alt: 2, z: 12 }, { t: 'panel', lane: 1, alt: 2, z: 12 }, { t: 'panel', lane: 1, alt: 0, z: 28 }, { t: 'panel', lane: 2, alt: 0, z: 28 }], rings: [{ lane: 2, alt: 0, z: 12 }, { lane: 0, alt: 1, z: 40 }], cells: [{ lane: 0, alt: 1, z: 42, n: 3 }] },
];

/** A panel fills one grid cell, so its vertical extent depends on its slot. */
export function panelSpec(alt) {
  return { w: 2.4, h: 1.5, d: 0.8, base: ALT_Y[alt] - 0.1 };
}

/**
 * The Storm. Every phrase is the same sentence: something on the floor puts
 * you in the air, and something in the air is waiting for you when you get
 * there. The barrier is the launcher, the drift is the question.
 *
 * Spacing is set by the arc, not by taste. At that zone's gravity a jump lasts
 * ~1.9 s and its top speed is 22, so she covers ~42 m airborne. A drift 12 m
 * past the barrier arrives 0.55 s into the flight and one at 24 m arrives at
 * 1.1 s — both while she is still up, which is the only time a drift means
 * anything. Past ~40 m she has landed and it is scenery.
 */
/**
 * The Storm's upper deck: a second road slung over the first.
 *
 * Both ends are cut off square and lit, because the only thing a player needs
 * to read from below is where it starts, and the only thing they need to read
 * from on top is where it stops. The launch pad that gets you up there is
 * built separately, at `f.pad`.
 */
function upperDeck(b, pal, f) {
  const len = f.to - f.from;
  const mid = -(f.from + len / 2);
  const half = ROAD_HALF * 0.82;
  b.box('toon', 0, DECK_Y - 0.3, mid, half * 2, 0.5, len, shade(pal.deck, 1.25));
  b.box('toon', 0, DECK_Y, mid, half * 2, 0.12, len, shade(pal.road, 1.5));
  // lit lips, so the ends read as edges rather than as the deck ending in fog
  for (const end of [-(f.from), -(f.to)]) {
    b.box('emissive', 0, DECK_Y + 0.06, end, half * 2, 0.14, 0.5, shade(pal.accentGlow, 0.55));
  }
  for (const side of [-1, 1]) {
    b.box('toon', side * half, DECK_Y + 0.36, mid, 0.22, 0.72, len, shade(pal.kerb, 0.95));
    b.box('emissive', side * half, DECK_Y + 0.72, mid, 0.3, 0.09, len, shade(pal.accent, 0.45));
    // pylons down to the road, spaced so the deck reads as carried, not floating
    for (let z = f.from + 3; z < f.to; z += 9) {
      b.cyl('toon', side * (half - 0.2), 0, -z, 0.34, 0.26, DECK_Y - 0.5, 6, shade(pal.deck, 1.05));
    }
  }
}

const STORM_PATTERNS = [
  { tier: 0, obstacles: [{ t: 'barrier', lane: 1, z: 12 }, { t: 'drift', lane: 1, z: 24 }], cells: [{ lane: 0, z: 26, n: 4 }] },
  { tier: 0, obstacles: [{ t: 'barrier', lane: 0, z: 14 }, { t: 'drift', lane: 0, z: 27 }], cells: [{ lane: 1, z: 30, n: 4 }] },
  { tier: 1, obstacles: [{ t: 'barrier', lane: 2, z: 10 }, { t: 'drift', lane: 2, z: 22 }, { t: 'drift', lane: 1, z: 34 }], cells: [{ lane: 0, z: 36, n: 3 }] },
  { tier: 1, obstacles: [{ t: 'barrier', lane: 1, z: 11 }, { t: 'drift', lane: 0, z: 23 }, { t: 'drift', lane: 2, z: 23 }], cells: [{ lane: 1, z: 26, n: 5 }] },
  { tier: 2, obstacles: [{ t: 'barrier', lane: 0, z: 10 }, { t: 'barrier', lane: 1, z: 10 }, { t: 'drift', lane: 2, z: 23 }, { t: 'drift', lane: 1, z: 35 }], cells: [{ lane: 0, z: 37, n: 3 }] },
  { tier: 2, obstacles: [{ t: 'barrier', lane: 1, z: 9 }, { t: 'drift', lane: 1, z: 20 }, { t: 'drift', lane: 0, z: 31 }, { t: 'drift', lane: 2, z: 42 }], cells: [{ lane: 1, z: 34, n: 4 }] },
];

export function pickPattern(rng, tier, flight, storm) {
  const source = storm ? STORM_PATTERNS : flight ? FLIGHT_PATTERNS : PATTERNS;
  const pool = source.filter((p) => p.tier <= tier);
  return pool[rng.int(0, pool.length - 1)];
}

const _c = new THREE.Color();
const shade = (color, m) => _c.copy(color).multiplyScalar(m).clone();

/**
 * Track structure, not decoration. Each style emits a different *shape* of
 * track: what is underfoot, whether there are edges, whether there is even
 * ground beside you. Repainting a street was the thing that made every zone
 * feel like the first one.
 */
function buildRoad(b, pal, props, features = [], rng) {
  switch (props.road) {
    case 'sea': return buildSea(b, pal, props);
    case 'catwalk': return buildCatwalk(b, pal, props, features);
    case 'skybridge': return buildSkybridge(b, pal, props, features);
    case 'tube': return buildTube(b, pal, props, rng);
    case 'plant': return buildPlant(b, pal, props);
    default: return buildStreet(b, pal, props);
  }
}

/** Open water to the horizon. No kerb, no deck, no rail, no edge at all. */
function buildSea(b, pal, props) {
  const L = CHUNK_LEN;
  const wide = 150;

  // Shallow and low-contrast on purpose: step the height or the shade too far
  // and rolling water reads as a flight of stairs.
  const rows = 64;
  const step = L / rows;
  for (let i = 0; i < rows; i++) {
    const z = -(i + 0.5) * step;
    const phase = i * 0.42;
    const h = 0.07 + Math.sin(phase) * 0.035 + Math.sin(phase * 0.31) * 0.025;
    b.box('toon', 0, 0.02, z, wide, h, step * 1.02, shade(pal.road, 0.95 + Math.sin(phase) * 0.07));
    if (Math.sin(phase) > 0.86) {
      b.box('emissive', 0, 0.02 + h, z + step * 0.4, wide * 0.7, 0.035, step * 0.26, shade(pal.lane, 0.28));
    }
  }

  // Lanes are marked by buoys, because painted lines on the sea make no sense
  // and were the main thing still reading as "road".
  for (let z = 4; z < L; z += 7) {
    for (const s of [-1, 1]) {
      const x = s * (ROAD_HALF + 0.4);
      b.dome('toon', x, 0.06, -z, 0.55, 0.75, 8, 3, shade(pal.accent, 1.0));
      b.cyl('emissive', x, 0.78, -z, 0.16, 0.16, 0.5, 6, shade(pal.accentGlow, 1.25));
      b.dome('toon', x, 0.06, -z, 0.75, -0.12, 8, 2, shade(pal.lane, 0.7));
    }
  }
  for (let z = 2; z < L; z += 5) {
    for (const x of [-1.3, 1.3]) {
      b.dome('toon', x, 0.05, -z, 0.24, 0.3, 6, 2, shade(pal.lane, 0.85));
    }
  }
}

/**
 * A floating catwalk in vacuum. Nothing below, nothing beside, and it stops
 * dead wherever a gap is authored: the deck is built as the spans *between*
 * the holes rather than as one slab with holes drawn on it.
 */
function buildCatwalk(b, pal, props, gaps = []) {
  const L = CHUNK_LEN;
  const half = ROAD_HALF;

  const holes = gaps.filter((g) => g.kind === 'gap').sort((a, b2) => a.from - b2.from);
  const spans = [];
  let cursor = 0;
  for (const g of holes) {
    if (g.from > cursor) spans.push([cursor, g.from]);
    cursor = Math.max(cursor, g.to);
  }
  if (cursor < L) spans.push([cursor, L]);

  for (const [from, to] of spans) {
    const len = to - from;
    if (len <= 0.2) continue;
    const mid = -(from + len / 2);
    b.box('toon', 0, -0.5, mid, half * 2, 0.5, len, shade(pal.road, 1.0));
    b.slab('toon', 0, 0.02, mid, half * 2, len, shade(pal.road, 1.25));

    // grating ribs, so speed reads on a surface with no markings beside it
    for (let z = from + 1; z < to; z += 2.4) {
      b.box('toon', 0, 0.03, -z, half * 2 - 0.3, 0.05, 0.5, shade(pal.deck, 1.5));
    }
    for (const s of [-1, 1]) {
      b.box('chrome', s * (half - 0.15), 0.02, mid, 0.5, 0.28, len, shade(pal.chrome, 0.9));
      b.box('emissive', s * (half - 0.15), 0.3, mid, 0.3, 0.06, len, shade(pal.edge, 0.85));
      for (let z = from + 3; z < to; z += 9) {
        b.at(s * (half - 0.2), -0.5, -z, 0, 1, 1, 1);
        b.box('chrome', s * 0.9, -1.6, 0, 0.3, 3.4, 0.3, shade(pal.chrome, 0.7));
        b.pop();
        b.cyl('emissive', s * (half + 0.55), -3.5, -z, 0.22, 0.22, 0.2, 6, shade(pal.accentGlow, 1.2));
      }
    }
    // lip and warning stripes at each cut end
    for (const [edgeZ, dir] of [[from, 1], [to, -1]]) {
      if (edgeZ <= 0.01 || edgeZ >= L - 0.01) continue;
      b.box('chrome', 0, 0.02, -edgeZ, half * 2, 0.34, 0.5, shade(pal.chrome, 1.0));
      b.box('emissive', 0, 0.36, -edgeZ, half * 2 - 0.4, 0.07, 0.55, shade(pal.accentGlow, 1.3));
      for (let i = 0; i < 3; i++) {
        b.box('emissive', 0, 0.04, -(edgeZ + dir * (1.4 + i * 1.5)), half * 2 - 1.2, 0.02, 0.6,
          shade(pal.accentGlow, 0.5 - i * 0.13));
      }
    }
  }
}

/** A bare bridge above the clouds. The lack of railings is the mechanic. */
function buildSkybridge(b, pal, props, features = []) {
  const L = CHUNK_LEN;
  const mid = -L / 2;
  const half = props.deckHalf ?? ROAD_HALF;

  // The deck is three lane panels, not one slab, because panels are what go
  // missing. A hole has to be a hole you can see through, not a texture.
  const laneW = 2.6;
  for (let lane = 0; lane < 3; lane++) {
    const holes = features
      .filter((f) => f.kind === 'hole' && f.lane === lane)
      .sort((a, b2) => a.from - b2.from);
    const spans = [];
    let cursor = 0;
    for (const h of holes) {
      if (h.from > cursor) spans.push([cursor, h.from]);
      cursor = Math.max(cursor, h.to);
    }
    if (cursor < L) spans.push([cursor, L]);

    for (const [from, to] of spans) {
      const len = to - from;
      if (len <= 0.2) continue;
      const cz = -(from + len / 2);
      b.box('toon', LANE_X[lane], -0.9, cz, laneW, 0.92, len, shade(pal.road, 0.72));
      b.slab('toon', LANE_X[lane], 0.02, cz, laneW, len, pal.road);
      // lit lip at each broken end, so the hole is legible from a long way off
      for (const edgeZ of [from, to]) {
        if (edgeZ <= 0.01 || edgeZ >= L - 0.01) continue;
        b.box('emissive', LANE_X[lane], 0.03, -edgeZ, laneW * 0.94, 0.06, 0.55, shade(pal.accentGlow, 1.2));
      }
    }
  }
  // the strips of deck outside the lanes are always intact
  for (const s of [-1, 1]) {
    b.box('toon', s * (half - (half - 3.9) / 2 - 0.55), -0.9, mid, Math.max(0.4, half - 3.9 + 1.1), 0.92, L, shade(pal.road, 0.72));
    b.slab('toon', s * (half - (half - 3.9) / 2 - 0.55), 0.02, mid, Math.max(0.4, half - 3.9 + 1.1), L, pal.road);
  }

  // The edge is the danger, so it is the brightest thing on the deck.
  for (const s of [-1, 1]) {
    b.box('toon', s * (half + 0.12), 0, mid, 0.55, 0.14, L, shade(pal.kerb, 1.0));
    b.box('emissive', s * (half + 0.12), 0.14, mid, 0.42, 0.05, L, shade(pal.edge, 1.0));
    // hazard chevrons pointing off the side
    for (let z = 2; z < L; z += 3.2) {
      b.box('emissive', s * (half - 0.55), 0.04, -z, 0.7, 0.02, 1.1, shade(pal.edge, 0.35));
    }
  }
  // suspension pylons, spaced far apart so the deck feels thin and exposed
  for (let z = 8; z < L; z += 24) {
    for (const s of [-1, 1]) {
      b.cyl('chrome', s * (half + 0.9), -0.9, -z, 0.5, 0.3, 16, 8, shade(pal.chrome, 0.95));
      b.box('emissive', s * (half + 0.9), 14, -z, 0.5, 0.4, 0.5, shade(pal.accentGlow, 1.2));
    }
    b.box('chrome', 0, 15.2, -z, half * 2 + 2.2, 0.5, 0.6, shade(pal.chrome, 0.9));
  }
}

/**
 * A sealed chrome tube. Walls AND a ceiling, which is the point: with a roof
 * overhead there is no sky and no skyline, so the only thing to read is the
 * track. It makes the same three obstacles feel completely different.
 */
function buildTube(b, pal, props, rng) {
  const L = CHUNK_LEN;
  const mid = -L / 2;
  const half = ROAD_HALF;

  b.box('toon', 0, -1.0, mid, half * 2 + 2, 1.0, L, shade(pal.road, 0.6));
  b.slab('toon', 0, 0.02, mid, half * 2, L, pal.road);

  // The shell is a run of solid arches, one per metre, which closes the vault
  // properly. A flat ceiling slab left a lit grey lid hanging over the track.
  const shellR = half + 1.5;
  for (let z = 0.5; z < L; z += 1.0) {
    b.arch('toon', 0, 0.02, -z, shellR, 1.1, 13, 5, shade(pal.road, 0.85), Math.PI, 0);
  }
  // ribs on top of the shell, every third one lit: that is the speed beat
  const rings = 16;
  const step = L / rings;
  for (let i = 0; i < rings; i++) {
    const z = -(i + 0.5) * step;
    const lit = i % 3 === 0;
    b.arch(lit ? 'emissive' : 'chrome', 0, 0.02, z, half + 0.55, lit ? 0.13 : 0.3, 13, 5,
      lit ? shade(pal.accentGlow, 1.0) : shade(pal.chrome, 0.85), Math.PI, 0);
  }
  for (const s of [-1, 1]) {
    b.box('emissive', s * (half + 0.5), 1.4, mid, 0.12, 0.2, L, shade(pal.edge, 0.75));
    b.box('emissive', s * (half + 0.5), 4.2, mid, 0.12, 0.14, L, shade(pal.accentGlow, 0.55));
  }
  for (let z = 1; z < L; z += 4) {
    for (const x of [-1.3, 1.3]) {
      b.box('emissive', x, 0.03, -z, 0.16, 0.02, 2.0, shade(pal.lane, 1.0));
    }
  }
  // Wall bays. An empty tube is legible but reads as unfinished.
  for (let z = 3; z < L; z += 6) {
    for (const s of [-1, 1]) vaultBay(b, rng, pal, -z, half, s);
  }
}

/**
 * A box that follows the hill.
 *
 * The elevation shader displaces vertices from world z, so anything built as
 * one long box only gets its two ends displaced and the middle is a straight
 * chord. Over a 48 m chunk against a 140 m wavelength that chord cuts clean
 * through the road. Slicing it gives the shader something to bend.
 */
function longBox(b, key, x, y, from, to, w, h, color, slice) {
  const len = to - from;
  if (!slice || slice >= len) {
    b.box(key, x, y, -(from + len / 2), w, h, len, color);
    return;
  }
  const n = Math.ceil(len / slice);
  const step = len / n;
  for (let i = 0; i < n; i++) {
    b.box(key, x, y, -(from + step * (i + 0.5)), w, h, step * 1.02, color);
  }
}

/**
 * A bottling line, not a road.
 *
 * Three separate belt decks running side by side with open grating between
 * them, syrup pipes overhead and bottle racks at the sides. The first version
 * of this zone was a walled street with gantries, which is exactly what The
 * Core already is: the palette was different and the structure was not.
 */
function buildPlant(b, pal, props) {
  const L = CHUNK_LEN;
  const mid = -L / 2;

  b.box('toon', 0, -1.1, mid, ROAD_HALF * 2 + 12, 1.1, L, shade(pal.road, 0.7));

  // One deck per lane, with a visible slot between them.
  //
  // Kept deliberately low. The first version was 0.34 tall, which is higher
  // than the conveyor surface the zone is entirely about, so every belt was
  // buried inside the floor and the zone's one mechanic was invisible.
  for (let lane = 0; lane < 3; lane++) {
    const x = LANE_X[lane];
    b.box('toon', x, 0, mid, 2.3, 0.1, L, shade(pal.road, 1.5));
    for (const s of [-1, 1]) {
      b.box('chrome', x + s * 1.22, 0, mid, 0.16, 0.22, L, shade(pal.chrome, 0.85));
    }
    // Idle rollers, so a lane with no belt still reads as machinery. Boxes,
    // not cylinders: the matrix stack only rotates around Y, so a cyl() here
    // stands up as a post instead of lying down as a roller.
    for (let z = 1.5; z < L; z += 1.6) {
      b.box('chrome', x, 0.1, -z, 2.0, 0.09, 0.28, shade(pal.chrome, 0.95));
    }
  }

  // syrup pipes and vats above the line
  for (let z = 3; z < L; z += 8) {
    b.box('chrome', 0, 6.2, -z, ROAD_HALF * 2 + 6, 1.0, 1.0, shade(pal.chrome, 0.9));
    b.box('emissive', 0, 6.1, -z, ROAD_HALF * 2, 0.12, 1.1, shade(pal.accentGlow, 0.75));
  }
  // Syrup vats.
  //
  // Squat and banded on purpose. The first pass was a tall thin chrome
  // cylinder, and chrome reflecting a pink sky is simply a pink post: a row
  // of them read as a colonnade of poles standing beside the track. A vat has
  // to be wider than it is tall, and it has to be made of something.
  for (let z = 8; z < L; z += 26) {
    for (const s of [-1, 1]) {
      const x = s * (ROAD_HALF + 10.5);
      b.cyl('toon', x, 0, -z, 4.0, 3.9, 0.5, 14, shade(pal.deck, 0.9));
      b.cyl('toon', x, 0.5, -z, 3.7, 3.6, 3.0, 14, shade(pal.facades[0], 1.0));
      // a window band with the syrup level showing through
      b.cyl('glass', x, 1.1, -z, 3.75, 3.75, 1.5, 14, shade(pal.accentGlow, 1.15));
      b.cyl('emissive', x, 1.1, -z, 3.5, 3.5, 0.9, 14, shade(pal.accentGlow, 0.55));
      for (const y of [0.5, 2.5, 3.5]) {
        b.cyl('chrome', x, y, -z, 3.85, 3.85, 0.28, 14, shade(pal.chrome, 0.9));
      }
      b.dome('toon', x, 3.5, -z, 3.6, 1.5, 14, 4, shade(pal.facades[1], 1.0));
      b.cyl('chrome', x, 5.0, -z, 0.4, 0.34, 1.4, 8, shade(pal.chrome, 0.85));
      b.box('emissive', x, 2.9, -z + 3.5, 2.2, 0.16, 0.12, shade(pal.edge, 0.95));
    }
  }
  // Bottle racks, well clear of the lanes. Sitting them just off the kerb made
  // a picket fence of upright shapes right at the edge of vision that read as
  // obstacles you then sailed straight through.
  for (const s of [-1, 1]) {
    const x = s * (ROAD_HALF + 4.2);
    b.box('toon', x, 0, mid, 3.0, 0.8, L, shade(pal.deck, 1.0));
    for (let z = 1.2; z < L; z += 1.6) {
      b.cyl('glass', x, 0.8, -z, 0.26, 0.22, 0.8, 6, shade(pal.accentGlow, 1.15));
      b.cyl('toon', x, 1.6, -z, 0.11, 0.11, 0.14, 6, shade(pal.lane, 1.0));
    }
  }
}

function buildStreet(b, pal, props) {
  const L = CHUNK_LEN;
  const mid = -L / 2;
  // On a flat zone one box per run is cheaper and identical.
  const slice = props.hill ? 2.4 : 0;

  longBox(b, 'toon', 0, -1.2, 0, L, ROAD_HALF * 2 + 9, 1.2, shade(pal.road, 0.6), slice);

  if (props.waterRoad) {
    // On The Shore there is no asphalt at all: the lane IS the sea. Rolling
    // rows of crest across the full width, so a swell reads as the water
    // rearing up rather than as a bump sitting on a road.
    // Shallow and low-contrast on purpose: step the height or the shade too
    // far and rolling water reads as a flight of stairs.
    const rows = 56;
    const step = L / rows;
    for (let i = 0; i < rows; i++) {
      const z = -(i + 0.5) * step;
      const phase = i * 0.42;
      const h = 0.07 + Math.sin(phase) * 0.035 + Math.sin(phase * 0.31) * 0.025;
      b.box('toon', 0, 0.02, z, ROAD_HALF * 2, h, step * 1.02, shade(pal.road, 0.95 + Math.sin(phase) * 0.07));
      // foam only on the odd crest, so it scatters rather than stripes
      if (Math.sin(phase) > 0.86) {
        b.box('emissive', 0, 0.02 + h, z + step * 0.4, ROAD_HALF * 2 * 0.8, 0.035, step * 0.26, shade(pal.lane, 0.32));
      }
    }
  } else if (slice) {
    longBox(b, 'toon', 0, -0.06, 0, L, ROAD_HALF * 2, 0.1, pal.road, slice);
  } else {
    b.slab('toon', 0, 0.02, mid, ROAD_HALF * 2, L, pal.road);
  }

  for (const s of [-1, 1]) {
    longBox(b, 'toon', s * (ROAD_HALF + 0.35), 0, 0, L, 0.7, 0.42, shade(pal.kerb, 0.95), slice);
    longBox(b, 'emissive', s * (ROAD_HALF + 0.35), 0.42, 0, L, 0.5, 0.07, shade(pal.edge, 1.15), slice);
    longBox(b, 'toon', s * (ROAD_HALF + 3.2), 0, 0, L, 5.4, 0.4, pal.deck, slice);
  }

  // Dashed lane dividers. Lifted clear of the swell on a water road, or they
  // sink inside the crests and the player loses the only lane reference.
  const laneY = props.waterRoad ? 0.17 : 0.03;
  for (let z = 1; z < L; z += 4) {
    for (const x of [-1.3, 1.3]) {
      b.box('emissive', x, laneY, -z, 0.16, 0.02, 2.0, shade(pal.lane, 1.0));
    }
  }

  // Guard rails on both kerbs
  for (const s of [-1, 1]) {
    const x = s * (ROAD_HALF + 0.9);
    for (let z = 2; z < L; z += 6) {
      b.cyl('chrome', x, 0.4, -z, 0.13, 0.11, 1.0, 6, shade(pal.chrome, 0.9));
    }
    longBox(b, 'chrome', x, 1.3, 0, L, 0.18, 0.16, shade(pal.chrome, 0.95), slice);
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

  // The Core runs in a trench: walls right at the kerb turn an avenue into a
  // chute, which is most of why it feels like a descent rather than a street.
  if (props.walls) {
    for (const s of [-1, 1]) {
      longBox(b, 'toon', s * (ROAD_HALF + 2.4), 0, 0, L, 3.4, 18, shade(pal.road, 0.45), slice);
      longBox(b, 'emissive', s * (ROAD_HALF + 0.72), 2.4, 0, L, 0.14, 0.34, shade(pal.edge, 0.75), slice);
      for (let z = 4; z < L; z += 6) {
        b.box('emissive', s * (ROAD_HALF + 0.72), 5.5, -z, 0.14, 1.6, 1.2, shade(pal.accentGlow, 0.8));
      }
    }
  }
}

// Obstacle shapes live in obstacles.js, one family per zone.

function buildScenery(b, rng, pal, props) {
  const L = CHUNK_LEN;

  if (props.arches !== 'none' && props.archEvery > 0) {
    for (let z = props.archEvery * 0.3; z < L; z += props.archEvery) {
      const tint = pal.archTints[rng.int(0, pal.archTints.length - 1)];
      if (props.arches === 'gantry') gantry(b, pal, -z, ROAD_HALF, tint);
      else if (props.arches === 'glass') glassVault(b, pal, -z, ROAD_HALF);
      else skyArch(b, pal, -z, ROAD_HALF, tint);
    }
  }

  for (const side of [-1, 1]) {
    for (let z = 4; props.lampEvery > 0 && z < L; z += props.lampEvery) {
      lamp(b, pal, side * (ROAD_HALF + 2.0), -z, side);
    }

    for (let z = 6; props.streetEvery > 0 && z < L; z += props.streetEvery) {
      const roll = rng();
      const x = side * (ROAD_HALF + 4.6);
      if (props.bedChance && roll < props.bedChance) {
        plantBed(b, rng, pal, side * (ROAD_HALF + 3.2), -z, side);
        if (rng.chance(0.7)) bigFern(b, rng, pal, side * (ROAD_HALF + 1.4), -(z + rng.range(-2, 2)));
      } else if (roll < props.stallChance) marketStall(b, rng, pal, side * (ROAD_HALF + 5.4), -z, side);
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
    while (props.skylineChance > 0 && z < L - 4) {
      const depth = rng.range(props.lotMin, props.lotMax);
      const x = side * (ROAD_HALF + 9 + rng.range(0, 9));
      if (rng() < props.skylineChance) {
        if (props.cargoChance && rng() < props.cargoChance) {
          cargoStack(b, rng, pal, x, -(z + depth / 2), side);
        } else if (rng.chance(0.75)) {
          tower(b, rng, pal, x, -(z + depth / 2), side, {
            d: depth, stacks: rng.int(props.towerStacks[0], props.towerStacks[1]),
          });
        } else {
          bubbleHab(b, rng, pal, x, -(z + depth / 2), side);
        }
      }
      if (props.cloudChance && rng() < props.cloudChance) {
        cloudBank(b, rng, pal, side * (ROAD_HALF + rng.range(10, 26)), -(z + depth / 2));
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
  const flight = !!zone.props.flight;

  // In a flight zone the pattern carries its own grid cells and rings; there
  // is no separate feature table because the whole zone is the feature.
  const kind = flight ? 'ring' : zone.props.feature;
  const features = flight
    ? (pattern.rings || []).map((r) => ({ kind: 'ring', ...r }))
    : (kind && FEATURES[kind] ? FEATURES[kind][rng.int(0, FEATURES[kind].length - 1)] : []).map((f) => ({ kind, ...f }));
  // The Arcade turns every block into a bumper, so the authored phrases carry
  // straight over and the zone reads as the same track played by other rules.
  const kept = flight
    ? pattern.obstacles.map((o) => ({ ...o, spec: panelSpec(o.alt) }))
    : pattern.obstacles
      .filter((o) => !conflicts(o, features))
      .map((o) => (zone.props.bumpers && o.t === 'block' ? { ...o, t: 'bumper' } : o));

  // Road first, but it has to know the features: on The Docks the gaps are
  // holes in the deck, not markings on it.
  const cells = [];
  for (const row of (pattern.cells || [])) {
    for (let i = 0; i < row.n; i++) {
      cells.push({
        lane: row.lane,
        z: -(row.z + i * 2.6),
        y: row.alt !== undefined ? ALT_Y[row.alt] + 0.6 : undefined,
      });
    }
  }

  // A bloom pad without a reason to use it is a decoration. Each one is paired
  // with a hedge across every lane, close enough to be inside the boosted arc
  // and too tall for a normal jump, plus a string of CELLS along that arc. So
  // the pad is both the only way through and the only way to the fuel.
  const extra = [];
  for (const f of features) {
    if (f.kind !== 'spring') continue;
    for (let lane = 0; lane < 3; lane++) extra.push({ t: 'hedge', lane, z: f.z + 9 });
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      cells.push({ lane: f.lane, z: -(f.z + 3 + t * 12), y: 1.8 + Math.sin(t * Math.PI) * 3.4 });
    }
  }

  buildRoad(b, pal, zone.props, features, rng);
  buildScenery(b, rng, pal, zone.props);
  for (const o of [...kept, ...extra]) buildObstacle(b, pal, o, LANE_X[o.lane], zone.props.obstacleKit);
  for (const f of features) {
    if (f.kind === 'swell') swell(b, pal, -f.z);
    else if (f.kind === 'spring') springPad(b, pal, LANE_X[f.lane], -f.z);
    else if (f.kind === 'ring') ringGate(b, pal, LANE_X[f.lane], -f.z, f.mode, f.alt !== undefined ? ALT_Y[f.alt] : null);
    else if (f.kind === 'belt') conveyor(b, pal, LANE_X[f.lane], f.from, f.to, f.dir);
    else if (f.kind === 'rail') rail(b, pal, LANE_X[f.lane], f.from, f.to);
    else if (f.kind === 'deck') {
      upperDeck(b, pal, f);
      // The pad spans the road: the launch is not a lane decision, it is a
      // yes-or-no. Three of them so it reads as a ramp you cannot miss. A
      // continuation span has no pad, and building one at `-undefined` would
      // put NaN in the vertex buffer and take the whole chunk with it.
      if (f.pad !== undefined) {
        for (const lane of [0, 1, 2]) springPad(b, pal, LANE_X[lane], -f.pad);
      }
    }
  }

  const group = b.toGroup(materials);
  const obstacles = [...kept, ...extra].map((o) => ({
    lane: o.lane,
    z: -o.z,
    type: o.t,
    spec: o.spec || OBSTACLE[o.t],
  }));
  return { group, obstacles, cells, features };
}
