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

/**
 * NOTHING MAY BE DRAWN ON THE SIDE OF A HITBOX THE PLAYER TRAVELS PAST.
 *
 * Read the constraint per contract, not per object:
 *   - a BARRIER is jumped, so nothing may stand above its box;
 *   - a GATE is slid under, so nothing may hang below its base. Its top is as
 *     unreachable as a block's and is not a constraint at all.
 * In both cases the rule covers the surface the player physically travels
 * past. Geometry there is geometry she passes through, which reads as the
 * game cheating.
 *
 * Blocks are exempt, and deliberately so: a block is 3.6 m against a 1.8 m
 * jump apex, so its top is somewhere she can never be. `wreck` stands 1.8 m
 * clear of its box and that is fine — squashing a listing hull by a third to
 * satisfy a rule nobody can observe would cost the silhouette for nothing.
 */

// ---------- barriers: low, jump them ---------------------------------------

const BARRIERS = {
  /** Guard fence with chrome caps. The city default. */
  fence(b, pal, x, z, s) {
    // The cap is inset, not stacked on top. Sat at `s.h` it put 0.16 m of
    // visible rail above the hitbox, so a jump that the game scored as clean
    // passed through the bar you can see. See the note above BARRIERS.
    b.box('toon', x, 0, z, s.w, s.h - 0.16, s.d, shade(pal.accent, 0.9));
    b.box('chrome', x, s.h - 0.16, z, s.w + 0.16, 0.16, s.d + 0.16, shade(pal.chrome, 0.95));
    b.box('emissive', x, s.h * 0.55, z, s.w * 0.8, 0.16, s.d + 0.05, shade(pal.accentGlow, 1.3));
    for (const side of [-1, 1]) {
      b.cyl('chrome', x + side * s.w / 2, 0, z, 0.14, 0.12, s.h - 0.02, 6, shade(pal.chrome, 0.9));
    }
  },

  /** Wet rock cluster breaking the surface. */
  rock(b, pal, x, z, s) {
    const stone = new THREE.Color('#6b7f86');
    // Flush with the box, not proud of it. At 1.05 the tallest boulder stood
    // 5 cm above the hitbox and a clean jump clipped visible rock.
    b.dome('toon', x, 0, z, s.w * 0.52, s.h, 7, 3, shade(stone, 1.0));
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
  /**
   * A satellite dish off its mast, face up in the lane.
   *
   * The Stack's barrier. A dish is a CONCAVE shape, and nothing else in the
   * game is: every other barrier is a solid you read as a mass, and this one
   * is read as a bowl with a shadow in it. On a zone with three floors that
   * matters more than usual, because she is often looking at the road from
   * above and a dish seen from overhead is still unmistakably a dish.
   */
  dish(b, pal, x, z, s) {
    const shell = shade(pal.kerb, 0.92);
    const r = s.w * 0.44;
    // the bowl: an outer rim and an inner face set below it
    b.cyl('toon', x, s.h * 0.3, z, r, r * 0.86, s.h * 0.4, 12, shell);
    b.cyl('toon', x, s.h * 0.24, z, r * 0.84, r * 0.3, s.h * 0.3, 12, shade(pal.kerb, 0.6));
    b.cyl('chrome', x, s.h * 0.7 - 0.08, z, r * 1.04, r * 1.04, 0.1, 12, shade(pal.chrome, 1.0));
    // the feed horn on its tripod, leaning where it bent
    b.box('chrome', x + s.w * 0.06, s.h * 0.4, z, 0.09, s.h * 0.42, 0.09, shade(pal.chrome, 0.85));
    b.box('toon', x + s.w * 0.06, s.h * 0.82, z, 0.26, s.h * 0.18, 0.26, shade(pal.deck, 1.2));
    b.box('emissive', x + s.w * 0.06, s.h * 0.86, z + 0.14, 0.16, 0.1, 0.05, shade(pal.accent, 1.0));
    // the broken mount and its footing, tipped over behind
    b.box('toon', x - s.w * 0.4, 0, z - s.d * 0.4, s.w * 0.3, s.h * 0.34, s.d * 0.9, shade(pal.deck, 1.0));
    b.box('chrome', x - s.w * 0.4, s.h * 0.34, z - s.d * 0.4, s.w * 0.22, 0.1, s.d * 0.7, shade(pal.chrome, 0.8));
    // torn coax, and a lit strip on the rim so it reads from the deck above
    for (const [dx, len] of [[0.42, 0.4], [0.5, 0.26]]) {
      b.box('chrome', x + s.w * dx, s.h * 0.16, z + s.d * 0.4, len, 0.06, 0.06, shade(pal.chrome, 0.7));
    }
    b.cyl('emissive', x, s.h * 0.7 - 0.02, z, r * 1.02, r * 1.02, 0.05, 12, shade(pal.accentGlow, 0.85));
  },

  /**
   * An arcade cabinet on its face, control panel towards you.
   *
   * The Arcade's own family. The zone ran on the Ring's fence, gantry and
   * pillar — the same three forms as the tutorial, in different colours — so
   * the loudest zone in the game was furnished by the quietest one.
   *
   * On its FACE, not on its side: a cabinet lying on its side is a box, and a
   * cabinet lying face-down puts the control panel and the coin door towards
   * her at an angle, which is the one arrangement that names the object.
   */
  cabinet(b, pal, x, z, s) {
    const body = pal.facades[1];
    b.at(x, 0, z, -0.09, 1, 1, 1);
    b.box('toon', 0, 0, 0, s.w * 0.86, s.h * 0.5, s.d * 1.5, shade(body, 1.1));
    // the canted control panel, which is the profile that says arcade
    b.quad('toon', [-s.w * 0.43, s.h * 0.5, -s.d * 0.75], [s.w * 0.43, s.h * 0.5, -s.d * 0.75],
      [s.w * 0.43, s.h * 0.86, s.d * 0.1], [-s.w * 0.43, s.h * 0.86, s.d * 0.1], shade(body, 1.4));
    for (const side of [-1, 1]) {
      b.tri('toon', [side * s.w * 0.43, s.h * 0.5, -s.d * 0.75], [side * s.w * 0.43, s.h * 0.5, s.d * 0.1],
        [side * s.w * 0.43, s.h * 0.86, s.d * 0.1], shade(body, 0.85));
    }
    // buttons and a stick, the detail that carries even at speed
    for (let i = 0; i < 4; i++) {
      b.cyl('emissive', -s.w * 0.28 + i * s.w * 0.17, s.h * 0.78, -s.d * 0.1, 0.09, 0.09, 0.06, 7,
        shade(i % 2 ? pal.accent : pal.accentGlow, 1.1));
    }
    b.cyl('chrome', s.w * 0.34, s.h * 0.8, -s.d * 0.1, 0.05, 0.04, 0.16, 6, shade(pal.chrome, 0.9));
    // Ball top at s.h exactly. At 0.96 it cleared the hitbox by 2.8 cm, which
    // is the "visible thing you jump straight through" fault, at knob scale.
    b.dome('emissive', s.w * 0.34, s.h - 0.09, -s.d * 0.1, 0.1, 0.09, 6, 2, shade(pal.accent, 1.2));
    // the dead screen, and the coin door hanging open
    b.box('glass', 0, s.h * 0.2, s.d * 0.76, s.w * 0.6, s.h * 0.3, 0.06, shade(pal.deck, 0.7));
    b.box('chrome', 0, s.h * 0.06, s.d * 0.72, s.w * 0.34, 0.16, 0.16, shade(pal.chrome, 0.95));
    b.box('emissive', 0, s.h * 0.5 - 0.06, s.d * 0.78, s.w * 0.66, 0.08, 0.05, shade(pal.edge, 0.8));
    // spilled tokens at its foot
    for (const [dx, dz] of [[-0.7, 0.42], [0.66, -0.3], [0.34, 0.6]]) {
      b.cyl('emissive', dx, 0.02, dz, 0.11, 0.11, 0.04, 7, shade(pal.accentGlow, 0.75));
    }
    b.pop();
  },

  /**
   * A wind-carved ridge of sand, crust broken along the crest.
   *
   * The Sugar Flats had the Shore's rocks, which is a sea boulder standing in
   * a desert: the single loudest sign a zone is a repaint. A dune reads from a
   * long unbroken CREST with ripples running off it, where a boulder reads
   * from stacked lumps, so the two are opposite silhouettes even though both
   * are made of the same low-poly language.
   */
  ridge(b, pal, x, z, s) {
    const sand = shade(pal.deck, 1.0);
    // A DUNE IS A SURFACE, NOT A PROFILE.
    //
    // The first pass was five quads sharing one crest line: correct in outline
    // and dead in the middle, because a dune's whole character is the way the
    // windward face curves away under itself. This samples a grid instead —
    // nine across, four deep — so the face has interior shape, catches light
    // unevenly, and the crest wanders instead of running straight across the
    // lane.
    const NX = 9, NZ = 4;
    const front = z + s.d * 1.15, back = z - s.d * 0.55;
    // crest height and its along-lane wander, both deterministic
    const crestH = (i) => {
      const u = i / (NX - 1) - 0.5;
      return s.h * (1.0 - u * u * 2.6 - Math.sin(i * 1.9) * 0.045);
    };
    const crestZ = (i) => z + Math.sin(i * 2.3) * s.d * 0.16;
    // windward profile: shallow at the toe, steepening to the crest
    const prof = (t) => Math.pow(t, 1.7);
    const px = (i) => x - s.w / 2 + (s.w / (NX - 1)) * i;
    const pt = (i, j) => {
      const t = j / NZ;
      const h = Math.max(0, crestH(i));
      return [px(i), h * prof(t), front + (crestZ(i) - front) * t];
    };
    for (let i = 0; i < NX - 1; i++) {
      for (let j = 0; j < NZ; j++) {
        // brightness rises up the face, so the crest reads as the lit edge
        const tint = 0.86 + (j / NZ) * 0.42 + ((i % 3) - 1) * 0.03;
        b.quad('toon', pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1), shade(sand, tint));
      }
      // slip face: short, steep, and slumped at the toe
      const hA = Math.max(0, crestH(i)), hB = Math.max(0, crestH(i + 1));
      const toe = 0.18;
      b.quad('toon', [px(i), hA, crestZ(i)], [px(i + 1), hB, crestZ(i + 1)],
        [px(i + 1), hB * toe, back + 0.3], [px(i), hA * toe, back + 0.3], shade(sand, 0.72));
      b.quad('toon', [px(i), hA * toe, back + 0.3], [px(i + 1), hB * toe, back + 0.3],
        [px(i + 1), 0, back], [px(i), 0, back], shade(sand, 0.62));
    }
    // the two ends, closed so the ridge is a solid and not a sheet
    for (const [i, side] of [[0, -1], [NX - 1, 1]]) {
      const h = Math.max(0, crestH(i));
      for (let j = 0; j < NZ; j++) {
        b.tri('toon', pt(i, j), pt(i, j + 1), [px(i), 0, front], shade(sand, 0.8 + side * 0.06));
      }
      b.tri('toon', [px(i), h, crestZ(i)], [px(i), 0, back], [px(i), 0, front], shade(sand, 0.76));
    }
    // Ripples: real raised prisms running ACROSS the windward face, following
    // its curve. Painted-on boxes floated; these are built from the same
    // surface samples, so they sit in it.
    for (const j of [1, 2, 3]) {
      for (let i = 0; i < NX - 1; i++) {
        const a = pt(i, j), c = pt(i + 1, j);
        const lift = 0.055 + (j % 2) * 0.02;
        b.quad('toon', a, c, [c[0], c[1] + lift, c[2] - 0.16], [a[0], a[1] + lift, a[2] - 0.16],
          shade(sand, 1.38));
        b.quad('toon', [a[0], a[1] + lift, a[2] - 0.16], [c[0], c[1] + lift, c[2] - 0.16],
          [c[0], c[1], c[2] - 0.32], [a[0], a[1], a[2] - 0.32], shade(sand, 0.7));
      }
    }
    // Sugar crust along the crest: short lit segments that follow the wander,
    // broken rather than one bar, because an unbroken line reads as a painted
    // stripe and this is meant to be catching the light.
    for (let i = 0; i < NX - 1; i += 2) {
      const h = Math.max(0, crestH(i));
      if (h < s.h * 0.4) continue;
      b.quad('emissive', [px(i), h, crestZ(i)], [px(i + 1), Math.max(0, crestH(i + 1)), crestZ(i + 1)],
        [px(i + 1), Math.max(0, crestH(i + 1)) - 0.05, crestZ(i + 1) + 0.12],
        [px(i), h - 0.05, crestZ(i) + 0.12], shade(pal.lane, 0.62));
    }
    // Faceted grit, not pebbles. Domes read as bubbles at this scale; these are
    // four-sided chips with a flat top, which is what broken crust looks like.
    for (const [dx, dz, r, hh] of [[-0.86, 0.5, 0.2, 0.13], [0.78, 0.36, 0.15, 0.1],
      [0.34, 0.72, 0.12, 0.08], [-0.44, 0.66, 0.1, 0.07]]) {
      b.taper('toon', x + dx, 0, z + dz * s.d, r * 2, hh, r * 1.6, r * 0.7, shade(sand, 1.2));
    }
  },

  /**
   * A snapped suspension cable, coiled where it fell, still on its anchor.
   *
   * The Heights is a bridge, so its obstacles are bridge. It had been running
   * the Ring's fence and the Docks' crane beam, and on a zone whose whole
   * palette is white the crane's pale load was the object the code itself
   * calls the ugliest in the game.
   *
   * A coil is the point: loops are a shape nothing else here has, and against
   * a white sky a stack of rings still reads as an outline when a flat panel
   * has already disappeared.
   */
  cable(b, pal, x, z, s) {
    const steel = shade(pal.chrome, 0.72);
    // the anchor it tore out of, sitting proud of the deck
    b.taper('toon', x - s.w * 0.36, 0, z, s.w * 0.34, s.h * 0.62, s.d * 1.2, 0.1, shade(pal.deck, 1.2));
    b.box('chrome', x - s.w * 0.36, s.h * 0.62, z, s.w * 0.3, 0.1, s.d * 1.1, shade(pal.chrome, 1.0));
    // Three loops of cable, each a ring of short boxes. Built from boxes and
    // not from a cyl inside an at(): the matrix stack only turns around Y, so
    // a cylinder asked to lie flat stands up instead.
    for (let loop = 0; loop < 3; loop++) {
      const cx = x + (loop - 0.6) * s.w * 0.3;
      const r = s.h * (0.40 - loop * 0.05);
      // Each loop RESTS on the road: centring them all at one height put the
      // largest a quarter of a metre under it, drawing geometry nobody sees
      // and costing the coil its contact with the ground.
      const y = r + 0.03;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        b.box('chrome', cx + Math.cos(a) * r * 0.9, y + Math.sin(a) * r, z + (loop - 1) * 0.12,
          0.22, 0.13, 0.13, shade(steel, 0.85 + (i % 3) * 0.1));
      }
    }
    // the frayed end, splayed where it parted
    for (const [dx, dy] of [[0.42, 0.1], [0.5, 0.24], [0.46, -0.04]]) {
      b.box('chrome', x + s.w * dx, s.h * (0.3 + dy), z + 0.2, s.w * 0.22, 0.06, 0.06, shade(steel, 1.1));
    }
    // a hazard lamp clipped to the anchor, the one warm thing on a white zone
    b.box('emissive', x - s.w * 0.36, s.h * 0.72 - 0.14, z + s.d * 0.5, s.w * 0.2, 0.14, 0.06,
      shade(pal.accentGlow, 1.2));
    b.box('emissive', x, 0.03, z + s.d * 0.6, s.w * 0.9, 0.05, 0.12, shade(pal.accent, 0.55));
  },

  /**
   * A run of racetrack kerb blocks, with a lit bollard standing on the apex.
   *
   * The bend family. Its silhouette is a SAWTOOTH — four wedges rising and
   * falling across the lane — and no other barrier has a broken top edge at
   * all: fences, planks, trunks and slabs are all one continuous line. On a
   * road that is turning, a serrated shape also reads as belonging to the
   * corner rather than as something dropped on it.
   */
  kerbstack(b, pal, x, z, s) {
    const teeth = 4;
    const tw = s.w / teeth;
    for (let i = 0; i < teeth; i++) {
      const tx = x - s.w / 2 + tw * (i + 0.5);
      const tall = i % 2 === 0;
      const h = s.h * (tall ? 0.62 : 0.4);
      // Each tooth is a wedge, not a block: high edge towards her, sloping
      // away, which is the shape that says "ride over this and it will hurt".
      b.quad('toon', [tx - tw * 0.46, 0, z + s.d * 0.5], [tx + tw * 0.46, 0, z + s.d * 0.5],
        [tx + tw * 0.46, h, z - s.d * 0.2], [tx - tw * 0.46, h, z - s.d * 0.2],
        shade(i % 2 ? pal.kerb : pal.accent, 1.0));
      b.box('toon', tx, 0, z - s.d * 0.35, tw * 0.92, h, s.d * 0.3,
        shade(i % 2 ? pal.kerb : pal.accent, 0.8));
      b.box('emissive', tx, h - 0.06, z - s.d * 0.2, tw * 0.8, 0.06, 0.1,
        shade(i % 2 ? pal.accentGlow : pal.lane, 0.7));
    }
    // The apex bollard, the tallest thing here and still inside the box.
    const bh = s.h - 0.14;
    b.cyl('toon', x + s.w * 0.12, 0, z, 0.15, 0.12, bh, 8, shade(pal.chrome, 0.9));
    b.cyl('emissive', x + s.w * 0.12, bh * 0.62, z, 0.17, 0.17, 0.16, 8, shade(pal.accent, 1.1));
    b.dome('emissive', x + s.w * 0.12, bh, z, 0.14, 0.14, 8, 3, shade(pal.accentGlow, 1.2));
  },

  /**
   * Three road barrels chained together, with a striped plank across them.
   *
   * The junction family. Every other barrier is a thing that belongs to its
   * zone — a fence, a rock, a fallen trunk. These are the things a road puts
   * out when it has stopped working, which is what the whole zone is about.
   *
   * Barrels rather than posts because no other barrier in the game has a round
   * silhouette repeated across the lane, and that repetition is what reads at
   * speed: three circles and a bar, nameable in one frame.
   */
  barrels(b, pal, x, z, s) {
    const drum = new THREE.Color('#e8622a');
    const r = s.w * 0.155;
    for (let i = 0; i < 3; i++) {
      const bx = x + (i - 1) * s.w * 0.33;
      const lean = (i - 1) * 0.06;                 // none of them stands straight
      const h = s.h * (0.78 - Math.abs(i - 1) * 0.05);
      b.cyl('toon', bx, 0, z + lean, r * 1.04, r * 0.92, h, 9, shade(drum, 0.95 + i * 0.06));
      // reflective bands, the thing that says road furniture
      for (const t of [0.34, 0.66]) {
        b.cyl('chrome', bx, h * t, z + lean, r * 1.07, r * 1.07, 0.12, 9, shade(pal.kerb, 1.0));
      }
      b.cyl('emissive', bx, h * 0.5, z + lean, r * 1.09, r * 1.09, 0.07, 9, shade(pal.accentGlow, 0.85));
      // a weighted foot, so they sit on the road instead of floating on it
      b.cyl('toon', bx, 0, z + lean, r * 1.22, r * 1.12, 0.08, 9, shade(drum, 0.6));
    }
    // The plank. Held at s.h - its own thickness so the top edge lands exactly
    // on the hitbox: this is a barrier, and nothing may stand above it.
    const plankH = 0.2;
    b.box('toon', x, s.h - plankH, z, s.w * 1.02, plankH, s.d * 0.34, shade(pal.kerb, 0.95));
    for (let i = 0; i < 5; i++) {
      b.box('emissive', x - s.w * 0.4 + i * s.w * 0.2, s.h - plankH + 0.02, z + s.d * 0.18,
        s.w * 0.11, plankH - 0.04, 0.05, shade(i % 2 ? pal.accent : pal.kerb, 0.7));
    }
    // the chain sagging between the drums, drawn as two dropped links
    for (const side of [-1, 1]) {
      b.box('chrome', x + side * s.w * 0.165, s.h * 0.46, z - 0.06, s.w * 0.3, 0.05, 0.05,
        shade(pal.chrome, 0.7));
    }
  },

  log(b, pal, x, z, s) {
    const bark = new THREE.Color('#6b4a2f');
    const r = s.h * 0.5;
    // faceted barrel, built from stacked slabs so it lies across the lane
    // The top slab sat at 0.82, which put the crown of the trunk 11 cm above
    // the hitbox: the barrier you can see was taller than the one you jump.
    for (const [dy, w] of [[0.16, 1.0], [0.5, 0.92], [0.71, 0.66]]) {
      b.box('toon', x, dy * s.h - 0.08, z, s.w * 1.02, s.h * 0.36, s.d * (0.55 + w * 0.5),
        shade(bark, 0.9 + dy * 0.35));
    }
    for (const side of [-1, 1]) {
      b.dome('toon', x + side * s.w * 0.5, s.h * 0.5, z, r * 0.95, side * 0.28, 8, 3, shade(bark, 1.15));
    }
    // moss and a couple of glowing caps along the top
    b.box('toon', x, s.h * 0.66, z, s.w * 0.9, s.h * 0.14, s.d * 0.72, shade(pal.edge, 0.9));
    // Caps sit in the moss rather than on top of it: at s.h * 1.02 they stood
    // 0.22 m clear of the hitbox and you jumped straight through them.
    b.dome('emissive', x - s.w * 0.22, s.h * 0.8, z, 0.22, 0.12, 6, 2, shade(pal.accentGlow, 1.2));
    b.dome('emissive', x + s.w * 0.26, s.h * 0.8, z + 0.1, 0.16, 0.1, 6, 2, shade(pal.accentGlow, 1.0));
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
    // The load used to be one untextured box. On The Heights, whose whole
    // palette is white, that is a blank white rectangle hanging over the road
    // — the single ugliest object in the game. It is now a strapped bale with
    // banding, a lit face and a corner cut off, so it reads even when its
    // colour and the sky's are the same.
    const w = s.w * 0.8, h = s.h * 0.55, d = s.d * 1.4;
    b.box('toon', x, s.base, z, w, h, d, shade(pal.deck, 1.35));
    b.box('toon', x, s.base + h * 0.18, z, w * 1.04, h * 0.42, d * 0.9, shade(pal.facades[0], 1.15));
    for (const side of [-1, 1]) {
      b.box('chrome', x + side * w * 0.28, s.base - 0.04, z, 0.14, h + 0.08, d + 0.06, shade(pal.chrome, 0.9));
    }
    b.box('chrome', x, s.base + h * 0.5, z, w + 0.1, 0.12, d + 0.08, shade(pal.chrome, 1.0));
    b.tri('toon', [x + w / 2, s.base + h, z - d / 2], [x + w / 2, s.base + h * 0.55, z - d / 2],
      [x + w * 0.18, s.base + h, z - d / 2], shade(pal.deck, 1.7));
    b.box('emissive', x, s.base + h * 0.26, z + d * 0.51, w * 0.6, h * 0.3, 0.05, shade(pal.accent, 0.6));
    b.box('chrome', x, s.base + s.h * 0.55, z, 0.16, -0.3, 0.16, shade(pal.chrome, 0.8));
    b.box('emissive', x, s.base - 0.12, z, s.w * 0.75, 0.12, s.d * 1.3, shade(pal.accentGlow, 1.25));
    b.box('emissive', x, s.base + s.h * 0.55, z, s.w + 3.4, 0.08, 0.66, shade(pal.edge, 0.8));
  },

  /**
   * A rack of monitors slung across the road, all of them showing snow.
   *
   * The Stack's gate. It is the only gate that is a GRID — a five-by-two block
   * of small lit squares — so it reads as one object from the road and as a
   * pattern from the deck above it, which is the view this zone spends a third
   * of its time in.
   *
   * The bottom row of screens is the clearance, and it stops on `s.base`.
   */
  monitors(b, pal, x, z, s) {
    for (const side of [-1, 1]) {
      b.box('chrome', x + side * (s.w / 2 + 0.2), 0, z, 0.2, s.base + s.h, 0.28, shade(pal.chrome, 0.8));
    }
    b.box('toon', x, s.base + s.h - 0.3, z, s.w + 0.8, 0.3, 0.42, shade(pal.deck, 1.15));
    // the frame the screens hang in, and the loom feeding them
    b.box('chrome', x, s.base, z - 0.16, s.w + 0.2, s.h * 0.92, 0.1, shade(pal.chrome, 0.7));
    for (let i = 0; i < 4; i++) {
      b.box('chrome', x - s.w * 0.36 + i * s.w * 0.24, s.base + s.h * 0.9, z - 0.2, 0.06, s.h * 0.1, 0.06,
        shade(pal.chrome, 0.6));
    }
    // Two rows of five. The lower row sits exactly on the clearance line: the
    // whole point of this zone is knowing which floor you are on, and a gate
    // that lies about where its bottom edge is would poison that.
    const sw = s.w * 0.17, sh = s.h * 0.38;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 5; i++) {
        const mx = x - s.w * 0.38 + i * s.w * 0.19;
        const my = s.base + row * (sh + 0.1);
        b.box('toon', mx, my, z, sw, sh, s.d * 0.6, shade(pal.deck, 1.3));
        // snow on most of them, one dead, one holding a colour bar
        const dead = (row * 5 + i) === 3;
        const bar = (row * 5 + i) === 7;
        b.box('emissive', mx, my + sh * 0.14, z + s.d * 0.32, sw * 0.78, sh * 0.6, 0.05,
          shade(dead ? pal.deck : bar ? pal.accent : pal.lane, dead ? 0.4 : bar ? 0.9 : 0.66));
        if (!dead) {
          // scanline, offset per screen so the wall never pulses as one thing
          b.box('emissive', mx, my + sh * (0.2 + ((i * 3 + row) % 4) * 0.12), z + s.d * 0.34,
            sw * 0.8, 0.05, 0.04, shade(pal.accentGlow, 1.0));
        }
      }
    }
    b.box('emissive', x, s.base, z, s.w * 0.96, 0.08, s.d * 0.7, shade(pal.accentGlow, 1.1));
  },

  /**
   * An arcade marquee slung on chains, letters still burning.
   *
   * The Arcade's gate. Unlike every other gate here it is HUNG rather than
   * built: two chains and a light box, so it hangs slightly unevenly and the
   * clearance line is the bottom lip of the box itself.
   */
  marquee(b, pal, x, z, s) {
    for (const side of [-1, 1]) {
      b.cyl('chrome', x + side * (s.w / 2 + 0.14), 0, z, 0.15, 0.12, s.base + s.h, 6, shade(pal.chrome, 0.8));
    }
    b.box('toon', x, s.base + s.h - 0.24, z, s.w + 0.7, 0.28, 0.34, shade(pal.deck, 1.15));
    // the chains, one shorter than the other so it hangs off level
    const drop = s.h * 0.42;
    for (const [side, d] of [[-1, drop], [1, drop * 0.86]]) {
      b.box('chrome', x + side * s.w * 0.34, s.base + s.h - 0.24 - d, z, 0.07, d, 0.07, shade(pal.chrome, 0.9));
    }
    // The light box. Its underside is the clearance, so it sits exactly on
    // `s.base` and nothing on this form goes below it.
    const boxH = s.h * 0.5;
    b.box('toon', x, s.base, z, s.w * 0.94, boxH, s.d * 0.7, shade(pal.deck, 1.4));
    b.box('chrome', x, s.base + boxH, z, s.w * 0.98, 0.08, s.d * 0.76, shade(pal.chrome, 1.0));
    b.box('chrome', x, s.base, z, s.w * 0.98, 0.08, s.d * 0.76, shade(pal.chrome, 0.9));
    // the lit face, and a row of chase bulbs around it
    b.box('emissive', x, s.base + boxH * 0.2, z + s.d * 0.36, s.w * 0.78, boxH * 0.56, 0.05,
      shade(pal.accent, 0.8));
    for (let i = 0; i < 6; i++) {
      const bx = x - s.w * 0.4 + i * s.w * 0.16;
      b.dome('emissive', bx, s.base + boxH * 0.9, z + s.d * 0.34, 0.08, 0.07, 6, 2,
        shade(i % 2 ? pal.accentGlow : pal.lane, 1.1));
    }
    // one bulb blown, because a sign with every lamp working is a new sign
    b.dome('toon', x + s.w * 0.24, s.base + boxH * 0.9, z + s.d * 0.34, 0.08, 0.07, 6, 2,
      shade(pal.deck, 0.6));
  },

  /**
   * A wind-eroded arch, worn thin where the sand got through.
   *
   * The Sugar Flats' gate, in place of the Shore's fishing net. The zone is a
   * landform, so its gate is one too: nothing here is manufactured, and the
   * span is thickest at the legs and thinnest overhead, which is the profile
   * erosion actually leaves and the opposite of a built beam.
   */
  archway(b, pal, x, z, s) {
    const sand = shade(pal.deck, 1.0);
    const half = s.w / 2 + 0.45;
    const rise = s.h * 0.92;

    // A TRUE ARCH, springing from the clearance line.
    //
    // The first version was a mass — fat legs, a haunch, a slab span — and it
    // read as a block. A block is the one thing a gate must never read as,
    // because the answer to a block is to change lane and the answer to a gate
    // is to slide, and she was arriving at it standing up. An arch is legible
    // as a HOLE: the thing you go through is the biggest thing in the outline.
    //
    // The band is THINNEST AT THE CROWN and thickest where it springs, which
    // is what erosion actually leaves and what tells the eye this was cut by
    // wind rather than built. A constant-thickness band is a drawn arc; a
    // varying one is a rock with an arch in it.
    const SEG = 14;
    const ang = (i) => (i / SEG) * Math.PI;
    const rIn = (t) => [x + Math.cos(t) * half, s.base + Math.sin(t) * rise];
    const band = (t) => 0.52 - Math.sin(t) * 0.26;              // fat at the feet
    const zf = s.d * 0.75;
    for (let i = 0; i < SEG; i++) {
      const t0 = ang(i), t1 = ang(i + 1);
      const [x0, y0] = rIn(t0), [x1, y1] = rIn(t1);
      const b0 = band(t0), b1 = band(t1);
      // the soffit is the face she reads on the approach, so it is the lightest
      const lit = 1.3 - Math.abs(i - SEG / 2) * 0.035;
      b.quad('toon', [x0, y0, z + zf], [x1, y1, z + zf], [x1, y1, z - zf], [x0, y0, z - zf],
        shade(sand, lit));
      // extrados, stepped outward per segment so the top edge is ragged
      const step = ((i * 7) % 3) * 0.05;
      b.quad('toon', [x0, y0 + b0 + step, z - zf], [x1, y1 + b1 + step, z - zf],
        [x1, y1 + b1 + step, z + zf], [x0, y0 + b0 + step, z + zf], shade(sand, 0.88));
      // both cheeks, and a shallow flute cut into each so the face is not flat
      for (const [dz, tint] of [[zf, 1.36], [-zf, 0.78]]) {
        const mz = z + dz * 0.72;
        b.quad('toon', [x0, y0, z + dz], [x1, y1, z + dz],
          [x1, y1 + b1 * 0.5, mz], [x0, y0 + b0 * 0.5, mz], shade(sand, tint));
        b.quad('toon', [x0, y0 + b0 * 0.5, mz], [x1, y1 + b1 * 0.5, mz],
          [x1, y1 + b1 + step, z + dz], [x0, y0 + b0 + step, z + dz], shade(sand, tint * 0.9));
      }
    }
    // Legs: four stacked strata, each narrower and slightly offset, with a
    // scoured waist. Two tapers read as a moulded pier; strata read as rock.
    for (const side of [-1, 1]) {
      const lx = x + side * half;
      const strata = [[0.00, 1.15, 0.30], [0.26, 0.94, 0.16], [0.44, 1.02, 0.24], [0.68, 0.86, 0.32]];
      for (const [t, w, h] of strata) {
        const y = s.base * t;
        b.taper('toon', lx + side * (t - 0.3) * 0.12, y, z, w, s.base * h, s.d * 1.5 * w * 0.9,
          0.1 + t * 0.1, shade(sand, 0.9 + t * 0.34));
        // the lip of each bed, catching light
        b.box('toon', lx + side * (t - 0.3) * 0.12, y + s.base * h - 0.05, z,
          w * 1.06, 0.06, s.d * 1.5 * w * 0.94, shade(sand, 1.42));
      }
      // wind scour at the foot and a drift of sand banked against it
      b.taper('toon', lx, 0, z + s.d * 0.55, 1.35, 0.16, s.d * 0.9, 0.4, shade(sand, 0.82));
      b.taper('toon', lx - side * 0.3, 0, z - s.d * 0.5, 0.9, 0.1, s.d * 0.6, 0.3, shade(sand, 0.76));
    }
    // The clearance, lit hard along the whole springing line. This is the edge
    // the whole zone is read from, so it gets the brightest thing on the object.
    b.box('emissive', x, s.base, z, s.w + 0.6, 0.11, s.d * 1.5, shade(pal.accentGlow, 1.2));
    for (const side of [-1, 1]) {
      b.box('emissive', x + side * half * 0.9, s.base + 0.06, z + s.d * 0.78,
        0.2, 0.5, 0.05, shade(pal.accent, 0.75));
    }
    // crust catching the sun along the crown, broken into three
    for (const dx of [-0.5, 0.05, 0.52]) {
      b.box('emissive', x + dx, s.base + rise + band(Math.PI / 2) - 0.05, z,
        s.w * 0.22, 0.06, s.d * 0.5, shade(pal.lane, 0.6));
    }
    // rubble that came out of the opening, angular and half-buried
    for (const [dx, dz, w2, h2] of [[-1.1, 0.6, 0.42, 0.2], [1.0, 0.44, 0.3, 0.14],
      [0.5, 0.8, 0.24, 0.1]]) {
      b.taper('toon', x + dx, 0, z + dz * s.d, w2, h2, w2 * 0.8, w2 * 0.35, shade(sand, 1.1));
    }
  },

  /**
   * A truss cross-brace of the bridge itself, passing overhead.
   *
   * The Heights' gate. The zone IS a bridge, and this is the bridge: an X of
   * structural steel between two verticals, which is the only gate in the game
   * made of diagonals. Diagonals are also what a white-on-white zone needs,
   * because a diagonal edge survives being the same colour as the sky in a way
   * a horizontal one does not.
   */
  strut(b, pal, x, z, s) {
    const steel = shade(pal.chrome, 0.8);
    const top = s.base + s.h;
    for (const side of [-1, 1]) {
      const lx = x + side * (s.w / 2 + 0.2);
      b.box('chrome', lx, 0, z, 0.26, top, 0.3, steel);
      b.box('chrome', lx, 0, z, 0.6, 0.14, 0.6, shade(pal.chrome, 1.0));
    }
    // The X, drawn as two long quads. Each stays above `s.base` at every point
    // across the clear span: the crossing sits at the middle of the gate, and
    // the low ends of the diagonals are out at the legs where she is not.
    const half = s.w / 2 + 0.2;
    const t = 0.16;
    for (const dir of [-1, 1]) {
      b.quad('chrome', [x - half, s.base + (dir > 0 ? 0.1 : s.h - 0.1), z - t],
        [x + half, s.base + (dir > 0 ? s.h - 0.1 : 0.1), z - t],
        [x + half, s.base + (dir > 0 ? s.h - 0.1 : 0.1) + 0.24, z - t],
        [x - half, s.base + (dir > 0 ? 0.1 : s.h - 0.1) + 0.24, z - t], steel);
      b.quad('chrome', [x - half, s.base + (dir > 0 ? 0.1 : s.h - 0.1), z + t],
        [x - half, s.base + (dir > 0 ? 0.1 : s.h - 0.1) + 0.24, z + t],
        [x + half, s.base + (dir > 0 ? s.h - 0.1 : 0.1) + 0.24, z + t],
        [x + half, s.base + (dir > 0 ? s.h - 0.1 : 0.1), z + t], shade(pal.chrome, 0.66));
    }
    // top chord and the gusset where the diagonals meet
    b.box('chrome', x, top - 0.2, z, s.w + 0.4, 0.2, 0.34, shade(pal.chrome, 0.95));
    b.box('chrome', x, s.base + s.h * 0.5 - 0.18, z, 0.5, 0.36, 0.4, shade(pal.chrome, 1.1));
    // The clearance line, flush with the base. Bolt heads along it, because a
    // bare white bar is exactly the object this zone already got wrong once.
    b.box('emissive', x, s.base, z, s.w * 0.94, 0.09, 0.08, shade(pal.accentGlow, 1.0));
    for (let i = 0; i < 5; i++) {
      b.dome('chrome', x - s.w * 0.4 + i * s.w * 0.2, s.base + 0.1, z + 0.18, 0.07, 0.05, 6, 2,
        shade(pal.chrome, 1.15));
    }
  },

  /**
   * A timing arch: a slim beam on two legs, camera pods, and a light curtain
   * hanging to exactly the height you have to be under.
   *
   * The bend family's gate. Every other gate is heavy — a sign bridge, a crane
   * beam, a pipe run, a torn walkway. This one is deliberately the lightest
   * object in the game that still blocks you: a bar barely thicker than its
   * own lit line, so on a road that is already swinging sideways it does not
   * add a second heavy shape for her to parse.
   *
   * The curtain is where the clearance is, drawn as a row of short teeth that
   * stop dead on `s.base`.
   */
  scanner(b, pal, x, z, s) {
    const armY = s.base + s.h * 0.5;
    for (const side of [-1, 1]) {
      // legs raked outwards, built from two boxes because the matrix stack
      // cannot roll a cylinder
      const lx = x + side * (s.w / 2 + 0.22);
      b.box('chrome', lx, 0, z, 0.16, armY * 0.62, 0.22, shade(pal.chrome, 0.8));
      b.box('chrome', lx - side * 0.1, armY * 0.62, z, 0.16, armY * 0.42, 0.22, shade(pal.chrome, 0.9));
      b.box('toon', lx, 0, z, 0.44, 0.12, 0.5, shade(pal.deck, 1.2));
    }
    b.box('chrome', x, armY, z, s.w + 0.7, 0.22, 0.26, shade(pal.chrome, 1.0));
    b.box('emissive', x, armY + 0.06, z + 0.15, s.w + 0.4, 0.1, 0.05, shade(pal.edge, 0.9));
    // camera pods, angled down the road
    for (const side of [-1, 1]) {
      const px = x + side * s.w * 0.26;
      b.box('toon', px, armY - 0.34, z, 0.3, 0.34, 0.42, shade(pal.deck, 1.1));
      b.box('emissive', px, armY - 0.26, z + 0.22, 0.2, 0.14, 0.05, shade(pal.accent, 0.8));
    }
    // The light curtain. Teeth, not a sheet: a solid bar of light across the
    // road at head height reads as something you must not touch, and this is
    // the line you are meant to pass under.
    for (let i = 0; i < 9; i++) {
      const tx = x - s.w / 2 + (s.w / 8) * i;
      b.box('emissive', tx, s.base, z, 0.05, 0.34, 0.05, shade(pal.accentGlow, 1.0));
    }
    b.box('emissive', x, s.base, z, s.w * 0.96, 0.07, 0.06, shade(pal.accentGlow, 1.2));
  },

  /**
   * A signal bridge with its heads hung low, all of them dark but one.
   *
   * The gate of the junction family. Its read is the opposite of every other
   * gate's: the others are a solid thing with a gap under it, and this is a
   * row of small objects you duck beneath, so the clearance is drawn by what
   * hangs rather than by what spans.
   *
   * The heads stop exactly at `s.base`. Every other gate in the game lets its
   * lit lip straddle the clearance by ten to twenty centimetres, which the
   * hitbox audit reports and which nobody has decided about; this one does not
   * need deciding, because nothing on it goes below the line at all.
   */
  signal(b, pal, x, z, s) {
    const mast = shade(pal.deck, 1.1);
    const armY = s.base + s.h * 0.72;
    for (const side of [-1, 1]) {
      b.cyl('toon', x + side * (s.w / 2 + 0.16), 0, z, 0.19, 0.15, armY + 0.3, 7, mast);
      // a bolted base plate, so the mast is planted and not stuck on
      b.box('chrome', x + side * (s.w / 2 + 0.16), 0, z, 0.5, 0.1, 0.5, shade(pal.chrome, 0.8));
    }
    b.box('toon', x, armY, z, s.w + 0.9, 0.26, 0.3, mast);
    b.box('chrome', x, armY + 0.26, z, s.w + 0.7, 0.08, 0.36, shade(pal.chrome, 0.9));
    // Three heads on short drops. The middle one is the only one still lit,
    // which is the whole story of the zone in one object.
    for (let i = 0; i < 3; i++) {
      const hx = x + (i - 1) * s.w * 0.34;
      const drop = armY - s.base - 0.62;
      b.box('chrome', hx, s.base + 0.62, z, 0.07, drop, 0.07, shade(pal.chrome, 0.75));
      b.box('toon', hx, s.base, z, 0.3, 0.62, 0.26, shade(pal.deck, 0.8));
      b.box('toon', hx, s.base + 0.62, z + 0.06, 0.34, 0.07, 0.3, shade(pal.deck, 1.3));
      for (let k = 0; k < 3; k++) {
        const lit = i === 1 && k === 2;
        b.cyl('emissive', hx, s.base + 0.1 + k * 0.19, z + 0.14, 0.09, 0.09, 0.04, 7,
          shade(lit ? pal.accent : pal.deck, lit ? 1.4 : 0.5));
      }
    }
    // The clearance line, flush with the base rather than hanging under it.
    b.box('emissive', x, s.base, z - 0.2, s.w * 0.94, 0.1, 0.06, shade(pal.accentGlow, 0.9));
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

  /**
   * A substation transformer, still live, in a cage that did not help.
   *
   * The Stack's block. Its silhouette is a stack of FINS with insulators on
   * top — a hard horizontal rhythm — which is the one thing that survives
   * being looked at from six metres up on the deck, where every other block
   * flattens into its own footprint.
   */
  transformer(b, pal, x, z, s) {
    const tank = pal.facades[3];
    b.taper('toon', x, 0, z, s.w * 0.98, 0.28, s.d * 1.3, 0.08, shade(pal.deck, 1.15));
    const body = s.h * 0.5;
    b.box('toon', x, 0.28, z, s.w * 0.62, body, s.d * 1.0, shade(tank, 1.1));
    // cooling fins down both flanks, the horizontal rhythm
    for (let i = 0; i < 7; i++) {
      const fy = 0.36 + i * body * 0.125;
      for (const side of [-1, 1]) {
        b.box('toon', x + side * s.w * 0.36, fy, z, s.w * 0.12, body * 0.08, s.d * 0.86,
          shade(tank, 0.8 + (i % 2) * 0.25));
      }
    }
    // the lid, and three insulators standing on it
    b.box('chrome', x, 0.28 + body, z, s.w * 0.68, 0.1, s.d * 1.06, shade(pal.chrome, 0.95));
    for (let i = 0; i < 3; i++) {
      const ix = x + (i - 1) * s.w * 0.22;
      const ih = s.h * 0.26;
      for (let k = 0; k < 4; k++) {
        b.cyl('glass', ix, 0.38 + body + k * ih * 0.25, z, 0.16 - k * 0.015, 0.14 - k * 0.015, ih * 0.22, 8,
          shade(pal.edge, 1.1 - k * 0.06));
      }
      b.cyl('chrome', ix, 0.38 + body + ih, z, 0.07, 0.06, 0.2, 6, shade(pal.chrome, 1.0));
      b.dome('emissive', ix, 0.38 + body + ih + 0.2, z, 0.1, 0.1, 6, 2, shade(pal.accent, 1.15));
    }
    // the cage, bent open on the side she passes
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        b.box('chrome', x + side * s.w * 0.5, 0.28, z - s.d * 0.5 + i * s.d * 0.25, 0.05, s.h * 0.62, 0.05,
          shade(pal.chrome, 0.65));
      }
    }
    b.box('chrome', x, 0.28 + s.h * 0.62, z, s.w * 1.02, 0.06, s.d * 1.04, shade(pal.chrome, 0.7));
    b.quad('chrome', [x + s.w * 0.5, 0.28, z + s.d * 0.5], [x + s.w * 0.86, 0.28, z + s.d * 0.9],
      [x + s.w * 0.86, 0.28 + s.h * 0.5, z + s.d * 0.9], [x + s.w * 0.5, 0.28 + s.h * 0.6, z + s.d * 0.5],
      shade(pal.chrome, 0.5));
    // the hazard plate, and the arc it is still throwing
    b.box('emissive', x, 0.28 + body * 0.4, z + s.d * 0.52, s.w * 0.3, 0.26, 0.05, shade(pal.accentGlow, 0.9));
    b.box('emissive', x - s.w * 0.22, 0.38 + body + s.h * 0.2, z, 0.05, 0.3, 0.05, shade(pal.lane, 1.3));
  },

  /**
   * A claw machine, prizes still inside, claw hanging.
   *
   * The Arcade's block. The zone turns most blocks into bumpers, so this one
   * is only ever seen where a bumper would be wrong — which is exactly why it
   * has to be worth seeing. A glass case full of lit shapes is the brightest
   * object the family has, and on a dark neon zone that is what a block needs
   * to be: the thing you notice one beat before you need to.
   */
  crane(b, pal, x, z, s) {
    const frame = pal.facades[2];
    b.at(x, 0, z, 0.1, 1, 1, 1);
    b.taper('toon', 0, 0, 0, s.w * 0.86, s.h * 0.3, s.d * 1.2, 0.08, shade(frame, 1.05));
    b.box('emissive', 0, s.h * 0.16, s.d * 0.62, s.w * 0.5, s.h * 0.1, 0.05, shade(pal.accent, 0.8));
    // the case: posts at the corners and glass between them
    const cy = s.h * 0.3, ch = s.h * 0.52, cw = s.w * 0.78, cd = s.d * 1.06;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.box('chrome', sx * cw * 0.5, cy, sz * cd * 0.5, 0.1, ch, 0.1, shade(pal.chrome, 0.95));
    }
    b.box('glass', 0, cy, 0, cw, ch, cd, shade(pal.edge, 1.05));
    // prizes heaped in the bottom
    for (let i = 0; i < 7; i++) {
      const a = (i * 2.1) % (Math.PI * 2);
      b.dome('emissive', Math.cos(a) * cw * 0.28, cy + 0.06 + (i % 3) * 0.14, Math.sin(a) * cd * 0.26,
        0.2, 0.17, 6, 2, shade(i % 2 ? pal.accent : pal.accentGlow, 0.7));
    }
    // the claw, hung off its rail near the top of the case
    b.box('chrome', 0, cy + ch - 0.12, 0, cw * 0.9, 0.08, 0.1, shade(pal.chrome, 1.0));
    b.box('chrome', s.w * 0.1, cy + ch * 0.62, 0, 0.05, ch * 0.34, 0.05, shade(pal.chrome, 0.85));
    for (const [dx, dz] of [[-1, 0], [0.5, 0.86], [0.5, -0.86]]) {
      b.box('chrome', s.w * 0.1 + dx * 0.12, cy + ch * 0.56, dz * 0.12, 0.06, 0.22, 0.06,
        shade(pal.chrome, 1.1));
    }
    // crown, marquee and the coin door
    b.box('toon', 0, cy + ch, 0, cw * 1.1, s.h * 0.14, cd * 1.1, shade(frame, 1.3));
    b.box('emissive', 0, cy + ch + s.h * 0.03, cd * 0.56, cw * 0.8, s.h * 0.08, 0.05, shade(pal.lane, 0.85));
    b.dome('emissive', 0, cy + ch + s.h * 0.14, 0, 0.22, 0.26, 8, 3, shade(pal.accent, 1.1));
    b.pop();
  },

  /**
   * A sugar spire: a wind-cut column with a capstone it cannot lose.
   *
   * The Sugar Flats' block, in place of the Shore's half-sunk hull, which was
   * a shipwreck standing in a desert. A hoodoo is banded and waisted — wide,
   * pinched, wide again — where every other block in the game grows straight
   * or tapers once, so it is the only column here with a WAIST.
   */
  spire(b, pal, x, z, s) {
    const sand = shade(pal.deck, 1.0);
    // A HOODOO IS A STACK OF BEDS THAT DO NOT LINE UP.
    //
    // Six tapers on one axis gave a smooth waisted cone: the right outline and
    // no surface. Rock erodes bed by bed, so each one here is its own width,
    // its own height and its own small offset in x and z, with a hard lip
    // where it overhangs the softer bed under it. The wander is what makes it
    // look weathered rather than turned on a lathe, and it is authored, not
    // random — the same spire every run.
    const beds = [
      // t,    width, tint, dx,    dz
      [0.00, 0.94, 1.00, 0.00, 0.00],
      [0.11, 0.72, 0.88, 0.04, -0.03],
      [0.21, 0.80, 1.14, -0.03, 0.04],
      [0.32, 0.58, 0.82, 0.05, 0.02],
      [0.44, 0.50, 1.06, 0.02, -0.05],
      [0.55, 0.62, 0.92, -0.05, 0.01],
      [0.66, 0.46, 1.18, 0.03, 0.04],
      [0.74, 0.54, 0.86, -0.02, -0.02],
    ];
    for (let i = 0; i < beds.length; i++) {
      const [t, w, tint, dx, dz] = beds[i];
      const t1 = i + 1 < beds.length ? beds[i + 1][0] : 0.80;
      const w1 = i + 1 < beds.length ? beds[i + 1][1] : 0.5;
      const bx = x + dx * s.w, bz = z + dz * s.d;
      const y = s.h * t, h = s.h * (t1 - t);
      b.taper('toon', bx, y, bz, s.w * w, h * 0.82, s.d * w * 0.9, (w - w1) * s.w * 0.5,
        shade(sand, tint));
      // the overhanging lip: a hard bed of rock sitting on a soft one, which is
      // the single detail that says hoodoo rather than column
      const lipW = s.w * Math.max(w, w1) * 1.08;
      b.taper('toon', bx, y + h * 0.82, bz, lipW, h * 0.18, s.d * Math.max(w, w1) * 1.0,
        -(lipW - s.w * w1) * 0.5, shade(sand, tint * 1.3));
      // undercut shadow under each lip, so the strata separate at any distance
      b.box('toon', bx, y + h * 0.78, bz, s.w * w * 0.99, h * 0.06, s.d * w * 0.94,
        shade(sand, tint * 0.6));
    }
    // The capstone: wider than the neck, tipped, with a corner gone.
    const capY = s.h * 0.80;
    b.taper('toon', x + 0.04, capY, z, s.w * 0.82, s.h * 0.09, s.d * 0.74, -0.14, shade(sand, 1.3));
    b.box('toon', x + 0.04, capY + s.h * 0.09, z, s.w * 0.9, s.h * 0.05, s.d * 0.82, shade(sand, 1.46));
    b.taper('toon', x + 0.02, capY + s.h * 0.14, z, s.w * 0.8, s.h * 0.06, s.d * 0.72, 0.22,
      shade(sand, 1.22));
    // the broken corner, and the block that came off it lying at the foot
    b.tri('toon', [x - s.w * 0.45, capY + s.h * 0.14, z - s.d * 0.4],
      [x - s.w * 0.1, capY + s.h * 0.14, z - s.d * 0.4],
      [x - s.w * 0.45, capY + s.h * 0.02, z - s.d * 0.4], shade(sand, 0.7));
    // vertical fluting down the tallest beds: rain cuts channels, and channels
    // are what stop a taper from reading as a moulded object
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const r = s.w * 0.26;
      b.box('toon', x + Math.cos(a) * r, s.h * 0.1, z + Math.sin(a) * r * 0.9,
        0.09, s.h * 0.6, 0.09, shade(sand, 0.74));
    }
    // strata catching the light, on the lips rather than painted across the face
    for (const [t, w] of [[0.21, 0.8], [0.44, 0.5], [0.66, 0.46]]) {
      b.box('emissive', x, s.h * t + s.h * 0.09, z, s.w * w * 1.09, 0.05, s.d * w * 1.0,
        shade(pal.accentGlow, 0.38));
    }
    b.box('emissive', x + 0.04, capY + s.h * 0.135, z, s.w * 0.5, 0.05, s.d * 0.5,
      shade(pal.lane, 0.55));
    // Talus: angular blocks, biggest nearest the base, half-buried in a drift.
    b.taper('toon', x, 0, z, s.w * 1.5, 0.14, s.d * 1.7, 0.5, shade(sand, 0.86));
    for (const [dx, dz, w2, h2, rot] of [[-0.92, 0.42, 0.52, 0.34, 0.3], [0.86, -0.3, 0.44, 0.26, -0.2],
      [0.5, 0.78, 0.34, 0.2, 0.5], [-0.6, -0.62, 0.3, 0.16, -0.4], [1.0, 0.6, 0.22, 0.12, 0.1]]) {
      b.at(x + dx, 0, z + dz * s.d, rot, 1, 1, 1);
      b.taper('toon', 0, 0, 0, w2, h2, w2 * 0.8, w2 * 0.3, shade(sand, 1.06));
      b.box('toon', 0, h2, 0, w2 * 0.7, h2 * 0.22, w2 * 0.56, shade(sand, 1.24));
      b.pop();
    }
  },

  /**
   * A suspension pylon with its stays fanning out of frame.
   *
   * The Heights' block, and the object that explains the zone: you have been
   * running on a bridge the whole time, and this is what is holding it up. Its
   * read is the FAN — six cables leaving one point at six angles — which no
   * other block has, and which stays legible against a white sky because a
   * line of stays crosses whatever is behind it.
   */
  pylon(b, pal, x, z, s) {
    const steel = shade(pal.chrome, 0.85);
    const legs = s.h * 0.46;
    // an A-frame: two legs drawing together into a single mast
    for (const side of [-1, 1]) {
      b.quad('chrome', [x + side * s.w * 0.42, 0, z - 0.18], [x + side * s.w * 0.42, 0, z + 0.18],
        [x + side * s.w * 0.12, legs, z + 0.16], [x + side * s.w * 0.12, legs, z - 0.16], steel);
      b.quad('chrome', [x + side * s.w * 0.42, 0, z + 0.18], [x + side * (s.w * 0.42 - 0.22), 0, z + 0.18],
        [x + side * (s.w * 0.12 - 0.18), legs, z + 0.16], [x + side * s.w * 0.12, legs, z + 0.16],
        shade(pal.chrome, 0.6));
      b.box('toon', x + side * s.w * 0.42, 0, z, 0.6, 0.2, 0.7, shade(pal.deck, 1.2));
    }
    // the cross beam where the legs meet, then the mast
    b.box('chrome', x, legs, z, s.w * 0.4, 0.26, 0.44, shade(pal.chrome, 1.05));
    b.box('chrome', x, legs + 0.26, z, s.w * 0.2, s.h * 0.4, 0.34, steel);
    b.taper('toon', x, legs + 0.26 + s.h * 0.4, z, s.w * 0.22, s.h * 0.12, 0.36, 0.06, shade(pal.deck, 1.35));
    // The fan. Six stays leaving the mast head at six angles, cut off at the
    // road: they run to a deck that is off in the fog, and drawing them all
    // the way would put geometry across the lane she is in.
    const headY = legs + 0.26 + s.h * 0.34;
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      const spread = 0.34 + Math.floor(i / 2) * 0.26;
      b.quad('chrome',
        [x, headY, z - 0.05], [x, headY, z + 0.05],
        [x + side * s.w * spread * 1.5, headY - s.h * (0.34 + Math.floor(i / 2) * 0.1), z + 0.05],
        [x + side * s.w * spread * 1.5, headY - s.h * (0.34 + Math.floor(i / 2) * 0.1), z - 0.05],
        shade(pal.chrome, 0.72 + i * 0.04));
    }
    // aircraft warning lights, the one saturated thing on a white zone
    b.dome('emissive', x, legs + 0.26 + s.h * 0.52, z, 0.16, 0.18, 7, 3, shade(pal.accent, 1.25));
    b.box('emissive', x, legs - 0.1, z, s.w * 0.44, 0.08, 0.46, shade(pal.accentGlow, 0.7));
  },

  /**
   * A street-sized gumball machine: a glass globe of capsules on a chrome
   * stalk, with a cracked dome.
   *
   * The bend family's block, and the only SPHERE in the game. Every other
   * block is a vertical prism of some kind — column, tower, can, trunk, press,
   * mast — so a ball on a stem is the one silhouette that cannot be confused
   * with any of them at any distance, which is the entire job of a block: you
   * do not jump it or slide it, you only have to notice it in time.
   *
   * It is also the most on-brief object in the zone, which is not an accident.
   * A bubblegum road should be furnished by the thing it is named after.
   */
  gumball(b, pal, x, z, s) {
    const r = s.w * 0.42;
    const stalkH = s.h * 0.42;
    // pedestal, then the stalk, both narrower than the globe so it overhangs
    b.taper('toon', x, 0, z, s.w * 0.56, 0.34, s.d * 0.9, 0.14, shade(pal.deck, 1.25));
    b.cyl('chrome', x, 0.34, z, s.w * 0.17, s.w * 0.13, stalkH, 10, shade(pal.chrome, 0.95));
    b.cyl('chrome', x, 0.34 + stalkH, z, s.w * 0.24, s.w * 0.24, 0.12, 10, shade(pal.chrome, 1.05));
    // the globe, built as two domes so it is a ball and not a bulge
    const gy = 0.34 + stalkH + 0.12;
    b.dome('glass', x, gy, z, r, r * 0.98, 14, 6, shade(pal.edge, 1.15));
    b.dome('glass', x, gy, z, r, -r * 0.72, 14, 5, shade(pal.edge, 0.95));
    // the capsules inside, lit, in a ring so the glass has something to hold
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const rr = r * 0.52;
      b.dome('emissive', x + Math.cos(a) * rr, gy + r * (0.16 + (i % 3) * 0.16), z + Math.sin(a) * rr,
        r * 0.2, r * 0.18, 6, 2, shade(i % 2 ? pal.accent : pal.accentGlow, 0.66));
    }
    // the crown, cracked open on one side
    b.cyl('chrome', x, gy + r * 0.9, z, r * 0.42, r * 0.3, 0.16, 10, shade(pal.chrome, 1.0));
    b.tri('toon', [x - r * 0.4, gy + r * 1.06, z], [x + r * 0.34, gy + r * 1.06, z - r * 0.2],
      [x - r * 0.06, gy + r * 1.3, z], shade(pal.chrome, 0.85));
    // the coin slot and the chute, at the height a hand would be
    b.box('chrome', x, gy - r * 0.55, z + r * 0.86, s.w * 0.2, 0.22, 0.08, shade(pal.chrome, 0.9));
    b.box('emissive', x, gy - r * 0.5, z + r * 0.9, s.w * 0.12, 0.06, 0.04, shade(pal.accent, 0.9));
    // capsules that got out, on the road at its foot
    for (const [dx, dz] of [[-0.62, 0.5], [0.7, -0.3], [0.4, 0.66]]) {
      b.dome('emissive', x + dx, 0.02, z + dz, 0.16, 0.14, 6, 2, shade(pal.accentGlow, 0.8));
    }
  },

  /**
   * The junction's control cabin, still standing in the lane.
   *
   * The block of the junction family. Every other block is a structure — a
   * column, a mast, a press, a stack. This is a small BUILDING, with a door
   * and a window and a light left on, and that is the only one in the game.
   * At speed the read is the lit window: a rectangle of colour at head height
   * that no other obstacle has.
   */
  booth(b, pal, x, z, s) {
    const wall = pal.facades[0];
    b.at(x, 0, z, 0.13, 1, 1, 1);
    // plinth, a step wider than the cabin so it reads as founded
    b.taper('toon', 0, 0, 0, s.w * 0.92, 0.3, s.d * 1.5, 0.06, shade(pal.deck, 1.2));
    const w = s.w * 0.7, h = s.h * 0.66, d = s.d * 1.25;
    b.box('toon', 0, 0.3, 0, w, h, d, shade(wall, 1.15));
    // corner posts, which is what stops a box from reading as a box
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.box('chrome', sx * w * 0.48, 0.3, sz * d * 0.48, 0.11, h, 0.11, shade(pal.chrome, 0.85));
    }
    // the window band, and the light still on behind it
    b.box('glass', 0, 0.3 + h * 0.52, d * 0.5, w * 0.82, h * 0.34, 0.06, shade(pal.edge, 1.1));
    b.box('emissive', 0, 0.3 + h * 0.52, d * 0.47, w * 0.74, h * 0.28, 0.05, shade(pal.accent, 0.72));
    b.box('chrome', 0, 0.3 + h * 0.34, d * 0.5, w * 0.86, 0.07, 0.1, shade(pal.chrome, 0.95));
    // the door, hanging open on the side you pass
    b.box('toon', -w * 0.5, 0.3, -d * 0.16, 0.06, h * 0.72, d * 0.42, shade(wall, 0.8));
    b.quad('toon', [-w * 0.5, 0.3, -d * 0.37], [-w * 0.86, 0.3, -d * 0.6],
      [-w * 0.86, 0.3 + h * 0.72, -d * 0.6], [-w * 0.5, 0.3 + h * 0.72, -d * 0.37], shade(wall, 0.65));
    // roof with an overhang, the aerial, and the beacon
    b.box('toon', 0, 0.3 + h, 0, w * 1.16, s.h * 0.09, d * 1.16, shade(pal.deck, 1.45));
    b.box('chrome', 0, 0.3 + h + s.h * 0.09, 0, w * 0.9, 0.06, d * 0.9, shade(pal.chrome, 0.9));
    b.cyl('chrome', w * 0.3, 0.3 + h + s.h * 0.09, d * 0.2, 0.045, 0.03, s.h * 0.2, 5, shade(pal.chrome, 0.8));
    b.cyl('toon', 0, 0.3 + h + s.h * 0.11, 0, 0.17, 0.15, s.h * 0.1, 8, shade(pal.deck, 0.9));
    b.dome('emissive', 0, 0.3 + h + s.h * 0.21, 0, 0.17, 0.2, 8, 3, shade(pal.accentGlow, 1.35));
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

// ---------- divider: the wall that makes a fork a decision -----------------

/**
 * The central island of a fork, drawn along z rather than across it.
 *
 * Every other obstacle in the game is a thing you get past. This one is a
 * thing you have to be on one side of, and it is the only obstacle whose
 * length is authored per instance: `s.d` is the whole island, eighteen to
 * twenty metres of it.
 *
 * The nose is a low wedge and the wall rises behind it. Full height from the
 * first metre would hide the branch you are not in at exactly the moment you
 * are choosing between them; this way you see both roads over the nose, and by
 * the time the wall is tall the choice is already made. That is the shape of
 * the decision, built.
 */
function divider(b, pal, x, z, s) {
  const half = s.d / 2;
  const w = s.w * 0.62;
  const nose = Math.min(6.5, s.d * 0.34);
  const zNose = z + half;              // the end she meets first

  // The wedge: a point on the road that lifts into the wall behind it.
  b.tri('toon', [x, 0.02, zNose], [x - w / 2, s.h * 0.3, zNose - nose],
    [x + w / 2, s.h * 0.3, zNose - nose], shade(pal.kerb, 0.9));
  for (const side of [-1, 1]) {
    b.quad('toon', [x, 0.02, zNose], [x + side * w / 2, s.h * 0.3, zNose - nose],
      [x + side * w / 2, 0.02, zNose - nose], [x, 0.02, zNose], shade(pal.kerb, 0.7));
  }
  // The wall, in two steps so the rise reads as a rise and not as a cut.
  b.box('toon', x, 0, z - nose * 0.5, w, s.h * 0.55, s.d - nose, shade(pal.deck, 1.15));
  b.box('toon', x, s.h * 0.55, z - nose * 0.5, w * 0.8, s.h * 0.45, s.d - nose, shade(pal.deck, 0.95));
  b.box('chrome', x, s.h * 0.55, z - nose * 0.5, w + 0.14, 0.12, s.d - nose, shade(pal.chrome, 0.95));

  // The nose light is the whole reading. It is the first thing on the road
  // that says the road is about to stop being one road.
  b.box('emissive', x, s.h * 0.3, zNose - nose, w * 0.9, 0.22, 0.12, shade(pal.accentGlow, 1.3));
  b.cyl('emissive', x, 0.03, zNose + 0.4, 0.5, 0.42, 0.05, 12, shade(pal.accent, 0.7));
  // Chevrons down both faces, pointing at the branch on that side.
  for (let i = 0; i < Math.floor((s.d - nose) / 3.2); i++) {
    const cz = z + half - nose - 1.6 - i * 3.2;
    for (const side of [-1, 1]) {
      b.box('emissive', x + side * (w / 2 + 0.02), s.h * 0.34, cz, 0.05, 0.5, 0.9,
        shade(side < 0 ? pal.accent : pal.edge, 0.62));
    }
  }
}

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
  // `top` is the tall corner of the panel, so it is the thing that has to stay
  // inside the box: at 1.05 it stood 5 cm above it.
  const w = s.w * 0.5, top = s.h, lean = s.d * 0.55;
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
    b.box('chrome', x + side * (s.w * 0.5 + 0.2), y + s.h * 0.62, z, 0.1, 0.28, s.d, shade(pal.chrome, 0.9));
    b.box('chrome', x + side * (s.w * 0.5 + 0.2), y + s.h * 0.9, z, 0.16, 0.1, s.d, shade(pal.chrome, 1.0));
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
  if (o.t === 'divider') return divider(b, pal, x, z, spec);
  if (o.t === 'panel') return panel(b, pal, x, z, spec);
  if (o.t === 'hedge') return hedge(b, pal, x, z, spec);
  if (o.t === 'bumper') return bumper(b, pal, x, z, spec);
  if (o.t === 'drift') return drift(b, pal, x, z, spec);
  const form = (kit && kit[o.t]) || DEFAULTS[o.t];
  const table = o.t === 'barrier' ? BARRIERS : o.t === 'gate' ? GATES : BLOCKS;
  (table[form] || table[DEFAULTS[o.t]])(b, pal, x, z, spec);
}
