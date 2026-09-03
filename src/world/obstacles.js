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
    // A GUARD FENCE IS A FRAME WITH INFILL, NOT A SLAB.
    //
    // Three boxes and two posts gave the city default a solid panel, which is
    // the one thing a guard fence never is: you can see the road through it.
    // Built as posts with base plates, a top rail with a returned lip, a
    // bottom rail, and a run of vertical pales between them, so the light and
    // the road behind come through and the object has an inside.
    //
    // The cap is INSET, not stacked. Sat at `s.h` it put 0.16 m of visible
    // rail above the hitbox, so a jump the game scored as clean passed through
    // the bar you can see. See the note above BARRIERS.
    const railTop = s.h - 0.16;
    const post = (px, tall) => {
      b.box('chrome', px, 0, z, 0.16, tall, s.d * 0.5, shade(pal.chrome, 0.9));
      b.box('chrome', px, 0, z, 0.34, 0.06, s.d * 0.9, shade(pal.chrome, 1.05));
      b.box('chrome', px, tall - 0.06, z, 0.22, 0.06, s.d * 0.6, shade(pal.chrome, 1.15));
      for (const dz of [-0.16, 0.16]) {
        b.cyl('chrome', px, 0.02, z + dz * s.d, 0.045, 0.04, 0.1, 6, shade(pal.chrome, 0.75));
      }
    };
    for (const side of [-1, 1]) post(x + side * s.w / 2, railTop);
    post(x, railTop - 0.04);
    // rails: a channel section top and bottom, so each has a visible lip
    for (const [ry, rh] of [[railTop - 0.18, 0.18], [0.16, 0.13]]) {
      b.box('toon', x, ry, z, s.w, rh, s.d * 0.42, shade(pal.accent, 0.9));
      b.box('toon', x, ry + rh - 0.04, z + s.d * 0.22, s.w, 0.05, 0.06, shade(pal.accent, 1.3));
      b.box('toon', x, ry, z - s.d * 0.22, s.w, 0.05, 0.06, shade(pal.accent, 0.62));
    }
    // pales, one of them bent out of line where something clipped it
    for (let i = 0; i < 11; i++) {
      const px = x - s.w * 0.46 + i * s.w * 0.092;
      const bent = i === 7;
      b.box('toon', px + (bent ? 0.05 : 0), 0.2, z + (bent ? s.d * 0.12 : 0), 0.05,
        railTop - 0.36, 0.05, shade(pal.accent, bent ? 1.35 : 0.78 + (i % 3) * 0.12));
    }
    // the chrome cap that gives it its outline, and the lit strip on the face
    b.box('chrome', x, railTop, z, s.w + 0.16, 0.16, s.d + 0.16, shade(pal.chrome, 0.95));
    b.box('chrome', x, railTop + 0.12, z, s.w + 0.2, 0.04, s.d + 0.2, shade(pal.chrome, 1.2));
    b.box('emissive', x, s.h * 0.55, z + s.d * 0.28, s.w * 0.8, 0.14, 0.05, shade(pal.accentGlow, 1.3));
    b.box('emissive', x, 0.04, z + s.d * 0.3, s.w * 0.9, 0.05, 0.08, shade(pal.accent, 0.5));
  },

  /** Wet rock cluster breaking the surface. */
  rock(b, pal, x, z, s) {
    const stone = new THREE.Color('#6b7f86');
    // ROCK IS BEDDED, AND BEDDING IS WHAT MAKES STONE LOOK LIKE STONE.
    //
    // Three smooth domes read as boulders made of clay. Sea rock is laid down
    // in beds and broken across them, so each mass here is a short stack of
    // slabs of decreasing width, each one turned a little from the last and
    // each with a hard lip. That stepped, tilted stack is the whole read, and
    // it is also what catches the light in the bands that say "wet".
    const mass = (mx, mz, w, h, turn, tint) => {
      const beds = [[0.00, 1.00], [0.26, 0.88], [0.48, 0.94], [0.68, 0.72], [0.86, 0.5]];
      for (let i = 0; i < beds.length - 1; i++) {
        const [t0, w0] = beds[i];
        const [t1, w1] = beds[i + 1];
        b.at(mx + (t0 - 0.3) * 0.1, 0, mz, turn + t0 * 0.5, 1, 1, 1);
        b.taper('toon', 0, h * t0, 0, w * w0, h * (t1 - t0) * 0.82, w * w0 * 0.86,
          (w0 - w1) * w * 0.5, shade(stone, tint + i * 0.09));
        // the lip of each bed, which is where the light sits
        b.box('toon', 0, h * t0 + h * (t1 - t0) * 0.78, 0, w * w0 * 1.04, h * 0.03, w * w0 * 0.9,
          shade(stone, tint + 0.32));
        b.pop();
      }
      b.at(mx, 0, mz, turn, 1, 1, 1);
      b.dome('toon', 0, h * 0.86, 0, w * 0.26, h * 0.14, 7, 2, shade(stone, tint + 0.4));
      b.pop();
    };
    mass(x, z, s.w * 0.5, s.h, 0.2, 0.9);
    mass(x - s.w * 0.32, z + 0.22, s.w * 0.3, s.h * 0.72, -0.5, 0.76);
    mass(x + s.w * 0.34, z - 0.16, s.w * 0.27, s.h * 0.6, 0.9, 0.98);
    // the wet apron the sea leaves round the base, and loose shingle in it
    b.dome('toon', x, 0, z, s.w * 0.66, 0.09, 10, 2, shade(pal.lane, 0.72));
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const rr = s.w * (0.4 + (i % 3) * 0.12);
      b.taper('toon', x + Math.cos(a) * rr, 0, z + Math.sin(a) * rr * 0.7,
        0.2 - (i % 3) * 0.04, 0.1, 0.16, 0.06, shade(stone, 0.8 + (i % 4) * 0.12));
    }
    // weed in the joints, and the wet line the swell keeps painting on it
    for (const [dx, dz, w2] of [[-0.28, 0.3, 0.3], [0.34, 0.2, 0.22], [0.02, -0.34, 0.18]]) {
      b.dome('toon', x + dx, s.h * 0.12, z + dz, w2, 0.1, 6, 2, shade(pal.edge, 0.5));
    }
    b.box('emissive', x, s.h * 0.86, z, s.w * 0.44, 0.06, s.d * 0.6, shade(pal.lane, 0.6));
    b.box('emissive', x, 0.05, z + s.d * 0.5, s.w * 0.8, 0.05, 0.1, shade(pal.edge, 0.42));
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
    // A CRATE IS SLATS AND A PALLET IS PLANKS, SO BOTH ARE BUILT FROM THEM.
    //
    // The read still comes from the pieces NOT lining up — three aligned boxes
    // are one box with seams — but a crate drawn as a box has no grain, no
    // gaps and no corner battens, and at speed it is a coloured brick. Every
    // face here is slats with daylight between them and a batten at each
    // corner, which is also what makes the split one obviously split.
    const slatBox = (cx, cy, cz, w, h, d, tint, open) => {
      const n = 4;
      for (let i = 0; i < n; i++) {
        const sy = cy + (h / n) * i;
        b.box('toon', cx, sy, cz, w, h / n * 0.82, d, shade(col, tint + (i % 2) * 0.14));
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        b.box('toon', cx + sx * w * 0.48, cy, cz + sz * d * 0.48, w * 0.08, h, d * 0.08,
          shade(col, tint * 0.72));
      }
      if (!open) b.box('toon', cx, cy + h - 0.04, cz, w * 1.02, 0.05, d * 1.02, shade(col, tint + 0.3));
    };
    // the pallet: bearers, deck boards and blocks
    for (let i = 0; i < 3; i++) {
      b.box('toon', -s.w * 0.4 + i * s.w * 0.38, 0, 0, 0.11, 0.11, s.d * 1.14, shade(pal.deck, 0.86));
      for (const dz of [-0.42, 0, 0.42]) {
        b.box('toon', -s.w * 0.4 + i * s.w * 0.38, 0.03, dz * s.d, 0.13, 0.05, 0.13,
          shade(pal.deck, 0.7));
      }
    }
    for (let i = 0; i < 6; i++) {
      b.box('toon', 0, 0.11, -s.d * 0.5 + i * s.d * 0.2, s.w * 1.04, 0.055, s.d * 0.15,
        shade(pal.deck, 1.1 + (i % 2) * 0.2));
    }
    // the intact one, square on, with banding round it
    slatBox(-s.w * 0.2, 0.165, 0, s.w * 0.5, s.h * 0.62, s.d * 0.92, 1.15, false);
    b.box('chrome', -s.w * 0.2, 0.165 + s.h * 0.3, 0, s.w * 0.54, 0.06, s.d * 0.96,
      shade(pal.chrome, 0.9));
    b.box('chrome', -s.w * 0.2, 0.165, s.d * 0.47, s.w * 0.52, s.h * 0.62, 0.05,
      shade(pal.chrome, 0.5));
    // the split one: lid levered up, contents showing through the gap
    const cx = s.w * 0.26, cy = 0.165, cw = s.w * 0.46, ch = s.h * 0.46, cd = s.d * 0.86;
    slatBox(cx, cy, 0, cw, ch, cd, 0.95, true);
    b.quad('toon', [cx - cw / 2, cy + ch, -cd / 2], [cx + cw / 2, cy + ch, -cd / 2],
      [cx + cw / 2, cy + ch * 1.5, cd / 2], [cx - cw / 2, cy + ch * 1.5, cd / 2], shade(col, 1.5));
    for (const sx of [-1, 1]) {
      b.tri('toon', [cx + sx * cw / 2, cy + ch, -cd / 2], [cx + sx * cw / 2, cy + ch * 1.5, cd / 2],
        [cx + sx * cw / 2, cy + ch, cd / 2], shade(col, 1.1));
    }
    b.box('emissive', cx, cy + ch * 0.62, 0, cw * 0.6, 0.2, cd * 0.5, shade(pal.accentGlow, 0.6));
    // one that slid off and landed short, plus loose straw
    slatBox(-s.w * 0.52, 0.03, s.d * 0.5, s.w * 0.34, s.h * 0.3, s.d * 0.6, 0.8, false);
    for (const [dx, dz, r2] of [[0.62, 0.6, 0.09], [-0.8, -0.3, 0.07], [0.2, 0.8, 0.06]]) {
      b.box('toon', dx, 0.02, dz, r2 * 3, 0.04, r2, shade(pal.deck, 1.25));
    }
    // strapping over the top, and the lit label on the near face
    b.box('chrome', -s.w * 0.2, 0.165 + s.h * 0.62, 0, s.w * 0.56, 0.06, 0.16, shade(pal.chrome, 1.0));
    b.box('emissive', -s.w * 0.2, 0.165 + s.h * 0.3, s.d * 0.47, s.w * 0.3, 0.13, 0.05,
      shade(pal.accent, 0.62));
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
    // Nothing may stand above the collision box. A first pass reached 1.57 on
    // a hitbox topping out at 1.05, which is the "visible post you pass
    // through" failure this project has already shipped five times.
    const lo = 0.06, hi = s.h * 0.9;
    const P = (dx, y, dz) => [x + dx, y, z + dz];
    const face = shade(pal.road, 2.4);
    // BROKEN CONCRETE HAS A THICKNESS AND AN AGGREGATE EDGE.
    //
    // Free points, not a taper: the plate is levered up on one edge and sits
    // at an angle, with the hole it came out of open behind it. A symmetrical
    // taper reads as a moulded object placed on the road, which is the
    // opposite of the idea — this is the road, broken. What was missing was
    // the slab's own DEPTH: it was a sheet of paper, so it had no broken edge
    // to show, and the broken edge is the only part of a smashed slab anyone
    // looks at.
    const T = 0.14;
    const top = [P(-w, lo, d), P(w, lo * 1.6, d), P(w * 0.86, hi, -d * 0.5), P(-w * 0.86, hi * 0.82, -d * 0.5)];
    const bot = top.map(([px, py, pz]) => [px, py - T, pz]);
    b.quad('toon', top[0], top[1], top[2], top[3], face);
    b.quad('toon', bot[0], bot[3], bot[2], bot[1], shade(pal.road, 1.4));
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      // the fracture face, ragged: two quads with the mid point pushed out
      const mid = [(top[i][0] + top[j][0]) / 2 + (i % 2 ? 0.06 : -0.05),
        (top[i][1] + top[j][1]) / 2 - T * 0.5, (top[i][2] + top[j][2]) / 2 + (i % 2 ? -0.05 : 0.06)];
      b.quad('toon', top[i], mid, [mid[0], mid[1] - T * 0.4, mid[2]], bot[i], shade(pal.road, 1.9));
      b.quad('toon', mid, top[j], bot[j], [mid[0], mid[1] - T * 0.4, mid[2]], shade(pal.road, 2.1));
    }
    // aggregate: chips standing proud of the fracture
    for (let i = 0; i < 9; i++) {
      const t = i / 9;
      b.taper('toon', x - w + t * w * 2, lo + t * hi * 0.5 - T * 0.5, z + d - t * d * 1.4,
        0.11, 0.07, 0.09, 0.03, shade(pal.road, 2.8));
    }
    // the hole it came out of, with a lip and a lit floor
    b.box('toon', x, -0.3, z - d * 0.8, s.w * 1.3, 0.3, s.d * 0.9, shade(pal.road, 1.1));
    b.box('toon', x, 0, z - d * 1.25, s.w * 1.3, 0.1, 0.16, shade(pal.road, 2.2));
    b.box('emissive', x, 0.02, z - d * 0.75, s.w * 1.2, 0.05, s.d * 0.8, shade(pal.accentGlow, 0.72));
    b.box('emissive', x, hi * 0.9, z - d * 0.5, s.w * 0.9, 0.1, 0.12, shade(pal.edge, 0.66));
    // rebar out of the break, bent, with the mesh it came off
    for (const [dx, h2, bend] of [[-0.55, 0.2, 0.1], [0.1, 0.26, -0.14], [0.62, 0.14, 0.06]]) {
      b.box('chrome', x + dx, hi * 0.6, z - d * 0.45, 0.06, h2, 0.06, shade(pal.chrome, 0.85));
      b.box('chrome', x + dx + bend, hi * 0.6 + h2, z - d * 0.45, 0.14, 0.05, 0.05,
        shade(pal.chrome, 1.05));
    }
    for (let i = 0; i < 4; i++) {
      b.box('chrome', x - 0.6 + i * 0.42, hi * 0.5, z - d * 0.62, 0.05, 0.05, s.d * 0.5,
        shade(pal.chrome, 0.6));
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
    const r = s.w * 0.46;
    // A DISH IS A BOWL, AND A BOWL IS RINGS.
    //
    // Two cylinders and a cone gave the outline of a dish and the surface of a
    // bucket. This is built as five concentric rings stepping down into a
    // throat, so the face actually dishes: each ring catches the light at a
    // different angle and the shadow pools in the middle, which is the only
    // reason a concave object reads as concave at all.
    const RINGS = 5, SEG = 16;
    const ringR = (i) => r * (1 - i / RINGS * 0.86);
    const ringY = (i) => s.h * (0.72 - Math.pow(i / RINGS, 1.7) * 0.52);
    for (let i = 0; i < RINGS; i++) {
      const r0 = ringR(i), r1 = ringR(i + 1);
      const y0 = ringY(i), y1 = ringY(i + 1);
      for (let k = 0; k < SEG; k++) {
        const a0 = (k / SEG) * Math.PI * 2, a1 = ((k + 1) / SEG) * Math.PI * 2;
        // the dished face, lit brighter towards the rim
        b.quad('toon',
          [x + Math.cos(a0) * r0, y0, z + Math.sin(a0) * r0 * 0.8],
          [x + Math.cos(a1) * r0, y0, z + Math.sin(a1) * r0 * 0.8],
          [x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1 * 0.8],
          [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1 * 0.8],
          shade(shell, 1.28 - i * 0.13 + (k % 2) * 0.03));
        // panel seams: a real dish is petals bolted together
        if (i === 0 && k % 2 === 0) {
          b.box('chrome', x + Math.cos(a0) * r0 * 0.94, y0 - 0.03, z + Math.sin(a0) * r0 * 0.75,
            0.05, 0.05, 0.05, shade(pal.chrome, 1.0));
        }
      }
    }
    // rim, and the back ribs that stop it being a sticker seen from behind
    b.cyl('chrome', x, s.h * 0.72 - 0.06, z, r * 1.03, r * 1.03, 0.12, SEG, shade(pal.chrome, 1.0));
    b.cyl('emissive', x, s.h * 0.72, z, r * 1.01, r * 1.01, 0.05, SEG, shade(pal.accentGlow, 0.9));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      b.box('chrome', x + Math.cos(a) * r * 0.5, s.h * 0.24, z + Math.sin(a) * r * 0.4,
        r * 0.9, 0.07, 0.07, shade(pal.chrome, 0.62));
    }
    // the feed on its tripod, bent where it came down
    // The feed sits low enough that its beacon lands ON the box: at 0.36 the
    // whole assembly stood 8 cm proud of the hitbox.
    const fy = s.h * 0.18;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.6;
      b.quad('chrome',
        [x + Math.cos(a) * r * 0.66, s.h * 0.34, z + Math.sin(a) * r * 0.52],
        [x + Math.cos(a) * r * 0.66 + 0.05, s.h * 0.34, z + Math.sin(a) * r * 0.52],
        [x + s.w * 0.07 + 0.05, fy + s.h * 0.42, z], [x + s.w * 0.07, fy + s.h * 0.42, z],
        shade(pal.chrome, 0.78 + k * 0.08));
    }
    b.cyl('toon', x + s.w * 0.07, fy + s.h * 0.42, z, 0.16, 0.13, s.h * 0.2, 8, shade(pal.deck, 1.2));
    b.dome('emissive', x + s.w * 0.07, s.h - 0.1, z, 0.11, 0.1, 7, 2, shade(pal.accent, 1.2));
    // the mount it tore out of, and the bolts still in the road
    b.taper('toon', x - s.w * 0.44, 0, z - s.d * 0.2, s.w * 0.36, s.h * 0.4, s.d * 1.1, 0.12,
      shade(pal.deck, 1.0));
    b.box('chrome', x - s.w * 0.44, s.h * 0.4, z - s.d * 0.2, s.w * 0.3, 0.09, s.d * 0.9,
      shade(pal.chrome, 0.95));
    for (const dx of [-0.58, -0.3]) {
      b.cyl('chrome', x + s.w * dx, 0.02, z + s.d * 0.45, 0.07, 0.06, 0.16, 6, shade(pal.chrome, 0.8));
    }
    // torn coax, and the warning strip that carries from another floor
    for (const [dx, dz, len] of [[0.44, 0.42, 0.5], [0.52, 0.2, 0.32], [0.34, 0.6, 0.26]]) {
      b.box('chrome', x + s.w * dx, s.h * 0.1, z + s.d * dz, len, 0.06, 0.06, shade(pal.chrome, 0.7));
    }
    b.box('emissive', x, 0.03, z + s.d * 0.62, s.w * 0.95, 0.05, 0.14, shade(pal.accent, 0.6));
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
    // AN ARCADE CABINET IS A PROFILE, NOT A BOX.
    //
    // The first pass was a box with a slanted lid stuck on it. A cabinet is
    // read from its SIDE: a tall back, a kicked-out base, the shelf of the
    // control panel and the overhang above the screen, all in one silhouette.
    // Face down in the lane, that profile is what she is looking at, so it is
    // built as a genuine section swept across the width rather than as a stack.
    const W = s.w * 0.86;
    const sect = [
      [-0.75, 0.00], [-0.75, 0.34], [-0.34, 0.44],   // base and its kick
      [-0.10, 0.86], [0.34, 0.98], [0.52, 0.72],     // panel shelf, then the brow
      [0.78, 0.60], [0.78, 0.12], [0.30, 0.00],
    ];
    for (let i = 0; i < sect.length; i++) {
      const [z0, y0] = sect[i];
      const [z1, y1] = sect[(i + 1) % sect.length];
      const t = 0.72 + Math.abs(y0 + y1) * 0.42;
      b.quad('toon', [-W / 2, y0 * s.h, z0 * s.d * 1.5], [W / 2, y0 * s.h, z0 * s.d * 1.5],
        [W / 2, y1 * s.h, z1 * s.d * 1.5], [-W / 2, y1 * s.h, z1 * s.d * 1.5], shade(body, t));
      // the side panels, which is where the art would be
      for (const side of [-1, 1]) {
        b.tri('toon', [side * W / 2, 0, 0], [side * W / 2, y0 * s.h, z0 * s.d * 1.5],
          [side * W / 2, y1 * s.h, z1 * s.d * 1.5], shade(body, side < 0 ? 1.28 : 0.66));
      }
    }
    // T-moulding along both edges of the profile: the chrome trim is most of
    // what says arcade rather than furniture.
    for (let i = 0; i < sect.length; i++) {
      const [z0, y0] = sect[i];
      const [z1, y1] = sect[(i + 1) % sect.length];
      for (const side of [-1, 1]) {
        b.quad('chrome', [side * (W / 2 + 0.04), y0 * s.h, z0 * s.d * 1.5],
          [side * (W / 2 + 0.04), y1 * s.h, z1 * s.d * 1.5],
          [side * (W / 2 - 0.02), y1 * s.h, z1 * s.d * 1.5],
          [side * (W / 2 - 0.02), y0 * s.h, z0 * s.d * 1.5], shade(pal.chrome, 0.9));
      }
    }
    // The control panel: two clusters of buttons and a stick each, because a
    // cabinet with one set of controls is a cabinet nobody argued over.
    for (const side of [-1, 1]) {
      const cx = side * W * 0.22;
      for (let i = 0; i < 3; i++) {
        for (let r2 = 0; r2 < 2; r2++) {
          b.cyl('emissive', cx + (i - 1) * 0.17, s.h * 0.93 - r2 * 0.02, s.d * (0.2 + r2 * 0.24),
            0.075, 0.075, 0.05, 8, shade(i % 2 ? pal.accent : pal.accentGlow, 1.15));
        }
      }
      // Shaft and ball sized so the ball's crown lands ON the hitbox: at 0.92
      // plus its own length the stick stood 9.6 cm clear of it.
      b.cyl('chrome', cx - 0.34, s.h * 0.78, s.d * 0.3, 0.09, 0.05, s.h * 0.13, 8, shade(pal.chrome, 0.9));
      b.dome('emissive', cx - 0.34, s.h - 0.09, s.d * 0.3, 0.1, 0.09, 7, 2, shade(pal.accent, 1.25));
      b.cyl('chrome', cx - 0.34, s.h * 0.76, s.d * 0.3, 0.14, 0.13, 0.04, 10, shade(pal.chrome, 1.1));
    }
    // the screen behind its bezel, dead, and the coin door hanging open
    b.box('toon', 0, s.h * 0.3, s.d * 1.1, W * 0.9, s.h * 0.4, 0.1, shade(body, 1.35));
    b.box('glass', 0, s.h * 0.32, s.d * 1.14, W * 0.66, s.h * 0.32, 0.05, shade(pal.deck, 0.75));
    b.box('emissive', 0, s.h * 0.34, s.d * 1.15, W * 0.6, 0.05, 0.04, shade(pal.edge, 0.9));
    b.box('chrome', 0, s.h * 0.08, s.d * 1.06, W * 0.34, 0.18, 0.16, shade(pal.chrome, 0.95));
    b.box('chrome', -W * 0.1, s.h * 0.06, s.d * 1.2, 0.3, 0.24, 0.05, shade(pal.chrome, 1.15));
    // the marquee strip along the top edge, still lit
    b.box('emissive', 0, s.h - 0.06, -s.d * 0.1, W * 0.86, 0.06, s.d * 0.5, shade(pal.lane, 0.85));
    // tokens spilled where it went over
    for (const [dx, dz] of [[-0.7, 0.42], [0.66, -0.3], [0.34, 0.6], [-0.2, 0.8]]) {
      b.cyl('emissive', dx, 0.02, dz, 0.11, 0.11, 0.04, 8, shade(pal.accentGlow, 0.8));
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
    // A CABLE IS A BUNDLE, AND A BUNDLE IS STRANDS.
    //
    // Rings of little boxes gave a coil made of bricks. A structural cable is
    // strands laid up in a helix, so each loop here is drawn as three ribbons
    // spiralling around its own section: the lay catches light in bands and
    // the outline stops being a clean circle, which is the whole difference
    // between a rope and a hoop.
    for (let loop = 0; loop < 3; loop++) {
      const cx = x + (loop - 0.6) * s.w * 0.3;
      const r = s.h * (0.40 - loop * 0.05);
      const y = r + 0.03;
      const zc = z + (loop - 1) * 0.14;
      const SEG = 14;
      for (let i = 0; i < SEG; i++) {
        const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
        for (let strand = 0; strand < 3; strand++) {
          const ph = strand * 2.09;
          const o0 = 0.055 * Math.cos(a0 * 4 + ph), p0 = 0.055 * Math.sin(a0 * 4 + ph);
          const o1 = 0.055 * Math.cos(a1 * 4 + ph), p1 = 0.055 * Math.sin(a1 * 4 + ph);
          const R0 = r + o0, R1 = r + o1;
          b.quad('chrome',
            [cx + Math.cos(a0) * R0, y + Math.sin(a0) * R0, zc + p0 - 0.05],
            [cx + Math.cos(a1) * R1, y + Math.sin(a1) * R1, zc + p1 - 0.05],
            [cx + Math.cos(a1) * R1, y + Math.sin(a1) * R1, zc + p1 + 0.05],
            [cx + Math.cos(a0) * R0, y + Math.sin(a0) * R0, zc + p0 + 0.05],
            shade(steel, 0.7 + Math.abs(Math.sin(a0 * 4 + ph)) * 0.55));
        }
      }
    }
    // The anchor it tore out of: a socket, a splayed collar, and its bolts.
    const ax = x - s.w * 0.4;
    b.taper('toon', ax, 0, z, s.w * 0.38, s.h * 0.34, s.d * 1.3, 0.1, shade(pal.deck, 1.1));
    b.box('chrome', ax, s.h * 0.34, z, s.w * 0.32, 0.1, s.d * 1.1, shade(pal.chrome, 0.95));
    b.taper('chrome', ax + 0.1, s.h * 0.44, z, 0.5, s.h * 0.26, 0.5, -0.2, shade(pal.chrome, 0.85));
    b.cyl('chrome', ax + 0.1, s.h * 0.7, z, 0.3, 0.26, 0.12, 10, shade(pal.chrome, 1.05));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.cyl('chrome', ax + Math.cos(a) * s.w * 0.17, 0.02, z + Math.sin(a) * s.d * 0.5,
        0.06, 0.05, 0.14, 6, shade(pal.chrome, 0.9));
    }
    // the frayed end, strands springing apart where it parted
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const len = 0.28 + (i % 3) * 0.14;
      b.box('chrome', x + s.w * 0.46 + len * 0.4, s.h * 0.3 + Math.sin(a) * 0.16,
        z + 0.2 + Math.cos(a) * 0.14, len, 0.05, 0.05, shade(steel, 1.0 + (i % 2) * 0.2));
    }
    b.cyl('chrome', x + s.w * 0.42, s.h * 0.3, z + 0.2, 0.14, 0.12, 0.16, 8, shade(pal.chrome, 1.1));
    // a hazard lamp on the anchor, and the scuff the cable left dragging
    b.box('emissive', ax, s.h * 0.4, z + s.d * 0.55, s.w * 0.18, 0.13, 0.06, shade(pal.accentGlow, 1.25));
    b.box('emissive', x, 0.03, z + s.d * 0.62, s.w * 0.9, 0.05, 0.13, shade(pal.accent, 0.55));
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
    // A KERB IS A CAST BLOCK, AND THE SAWTOOTH IS ITS TOP EDGE.
    //
    // Four wedges gave the right outline and a surface made of two triangles.
    // Real racetrack kerbing is heavy cast sections with a rounded nose, a
    // ribbed face and a joint you can see between every block, and here that
    // joint is what makes the sawtooth read as objects rather than as a zigzag
    // painted on the road.
    const teeth = 5;
    const tw = s.w / teeth;
    for (let i = 0; i < teeth; i++) {
      const tx = x - s.w / 2 + tw * (i + 0.5);
      const tall = i % 2 === 0;
      const h = s.h * (tall ? 0.58 : 0.36);
      const col = shade(tall ? pal.accent : pal.kerb, 1.0);
      const dark = shade(tall ? pal.accent : pal.kerb, 0.66);
      const z0 = z + s.d * 0.55, z1 = z - s.d * 0.35;
      const w2 = tw * 0.44;
      // the ramped face, in two steps so it is a curve and not a plane
      b.quad('toon', [tx - w2, 0, z0], [tx + w2, 0, z0],
        [tx + w2, h * 0.6, z + s.d * 0.14], [tx - w2, h * 0.6, z + s.d * 0.14], shade(col, 1.08));
      b.quad('toon', [tx - w2, h * 0.6, z + s.d * 0.14], [tx + w2, h * 0.6, z + s.d * 0.14],
        [tx + w2, h, z - s.d * 0.05], [tx - w2, h, z - s.d * 0.05], shade(col, 1.3));
      // the flat top and the square back
      b.quad('toon', [tx - w2, h, z - s.d * 0.05], [tx + w2, h, z - s.d * 0.05],
        [tx + w2, h, z1], [tx - w2, h, z1], shade(col, 1.45));
      b.quad('toon', [tx - w2, h, z1], [tx + w2, h, z1], [tx + w2, 0, z1], [tx - w2, 0, z1], dark);
      // the cheeks, and the visible joint between this block and the next
      for (const side of [-1, 1]) {
        b.quad('toon', [tx + side * w2, 0, z0], [tx + side * w2, h * 0.6, z + s.d * 0.14],
          [tx + side * w2, h, z1], [tx + side * w2, 0, z1], shade(col, side < 0 ? 0.9 : 0.74));
        b.box('toon', tx + side * (w2 + 0.02), 0, z + s.d * 0.1, 0.04, h * 0.9, s.d * 0.8, dark);
      }
      // ribs across the ramp: the thing that makes a kerb rattle a car
      for (let r2 = 0; r2 < 3; r2++) {
        b.box('toon', tx, h * (0.18 + r2 * 0.2), z + s.d * (0.36 - r2 * 0.14),
          w2 * 1.9, 0.04, 0.09, shade(col, 1.55));
      }
      b.box('emissive', tx, h - 0.05, z - s.d * 0.05, w2 * 1.7, 0.05, 0.1,
        shade(tall ? pal.accentGlow : pal.lane, 0.75));
    }
    // The apex bollard: a weighted base, a flexible sleeve and a lit band, and
    // it leans, because a bollard on an apex has been hit.
    const bh = s.h - 0.16;
    const bx = x + s.w * 0.12;
    b.cyl('toon', bx, 0, z, 0.24, 0.2, 0.1, 10, shade(pal.deck, 1.1));
    b.cyl('toon', bx, 0.1, z, 0.16, 0.13, bh * 0.5, 10, shade(pal.chrome, 0.9));
    b.cyl('toon', bx + 0.05, 0.1 + bh * 0.5, z + 0.03, 0.13, 0.11, bh * 0.42, 10,
      shade(pal.chrome, 1.0));
    b.cyl('emissive', bx + 0.02, bh * 0.5, z + 0.01, 0.15, 0.15, 0.14, 10, shade(pal.accent, 1.1));
    b.cyl('emissive', bx + 0.05, bh * 0.78, z + 0.03, 0.13, 0.13, 0.1, 10, shade(pal.lane, 0.9));
    b.dome('emissive', bx + 0.05, bh, z + 0.03, 0.12, 0.12, 8, 3, shade(pal.accentGlow, 1.2));
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
    // A ROAD BARREL IS RIBBED, AND IT IS THE RIBS THAT NAME IT.
    //
    // Three smooth cylinders with two chrome bands read as bollards. A real
    // one is a moulded drum: a flared foot, three or four raised hoops, a
    // tapered shoulder and a lid, and it is dented. Each drum here is built as
    // stacked sections of alternating radius so the profile steps in and out,
    // which is what catches the light in the rings that make it legible.
    for (let i = 0; i < 3; i++) {
      const bx = x + (i - 1) * s.w * 0.33;
      const lean = (i - 1) * 0.07;
      const h = s.h * (0.76 - Math.abs(i - 1) * 0.05);
      const bz = z + lean;
      // ballast foot, wider than the drum
      b.taper('toon', bx, 0, bz, r * 2.5, 0.1, r * 2.2, r * 0.5, shade(drum, 0.6));
      const bands = [[0.00, 1.00], [0.14, 1.10], [0.24, 1.00], [0.40, 1.10],
                     [0.50, 1.00], [0.66, 1.10], [0.76, 1.00], [0.90, 0.86]];
      for (let k = 0; k < bands.length - 1; k++) {
        const [t0, w0] = bands[k];
        const [t1, w1] = bands[k + 1];
        // dented on one drum only, because three identical drums is a texture
        const dent = (i === 1 && k === 3) ? 0.82 : 1;
        b.taper('toon', bx, h * t0, bz, r * 2 * w0 * dent, h * (t1 - t0), r * 1.9 * w0,
          (w0 - w1) * r, shade(drum, 0.88 + (k % 2) * 0.3));
      }
      // reflective sleeves, set into the grooves rather than stuck on the face
      for (const t of [0.29, 0.55]) {
        b.cyl('chrome', bx, h * t, bz, r * 2.02, r * 2.02, h * 0.1, 12, shade(pal.kerb, 1.0));
      }
      b.cyl('emissive', bx, h * 0.42, bz, r * 2.04, r * 2.04, 0.06, 12, shade(pal.accentGlow, 0.9));
      // lid with a lifting eye
      b.taper('toon', bx, h * 0.9, bz, r * 1.75, h * 0.08, r * 1.7, r * 0.3, shade(drum, 1.25));
      b.cyl('chrome', bx, h * 0.96, bz, 0.05, 0.05, 0.09, 6, shade(pal.chrome, 0.9));
    }
    // The plank, on brackets, its top edge exactly on the hitbox.
    const plankH = 0.2;
    for (const side of [-1, 1]) {
      b.box('chrome', x + side * s.w * 0.33, s.h - plankH - 0.06, z, 0.08, 0.24, s.d * 0.4,
        shade(pal.chrome, 0.85));
    }
    b.box('toon', x, s.h - plankH, z, s.w * 1.04, plankH, s.d * 0.3, shade(pal.kerb, 0.95));
    b.box('toon', x, s.h - plankH, z - s.d * 0.16, s.w * 1.04, plankH * 0.5, 0.05,
      shade(pal.kerb, 0.66));
    for (let i = 0; i < 6; i++) {
      b.box('emissive', x - s.w * 0.44 + i * s.w * 0.176, s.h - plankH + 0.02, z + s.d * 0.16,
        s.w * 0.1, plankH - 0.05, 0.05, shade(i % 2 ? pal.accent : pal.kerb, 0.75));
    }
    // chain between the drums, sagging in real links
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const t = (k + 0.5) / 4;
        const cx = x + side * s.w * 0.165 + (t - 0.5) * s.w * 0.3 * side;
        const sag = Math.sin(t * Math.PI) * 0.09;
        b.box('chrome', cx, s.h * 0.44 - sag, z - 0.07, 0.09, 0.05, 0.05,
          shade(pal.chrome, k % 2 ? 0.9 : 0.66));
      }
    }
  },

  log(b, pal, x, z, s) {
    // Same reason as the wreck: a literal brown cannot know how bright its
    // zone is, and this one lies on a lit road.
    const bark = shade(pal.deck, 0.7);
    // A TRUNK IS A ROUND BAR WITH END GRAIN, AND BARK IS RIDGES.
    //
    // Boxes and domes, never a `cyl()` inside an `at()`: the matrix stack only
    // rotates around Y, so the cylinder this used to use stood on end as a
    // three-metre stump you then jumped through at one metre. The barrel is
    // therefore built as a fan of long facets around the axis, which gives a
    // genuinely round silhouette, and the two ends get concentric rings — end
    // grain is the single most recognisable thing about a felled trunk.
    const r = s.h * 0.42;
    const cy = r + 0.04;
    const SEG = 10;
    for (let i = 0; i < SEG; i++) {
      const a0 = Math.PI * (i / SEG), a1 = Math.PI * ((i + 1) / SEG);
      const y0 = cy + Math.sin(a0) * r, y1 = cy + Math.sin(a1) * r;
      const z0 = z + Math.cos(a0) * r * 0.9, z1 = z + Math.cos(a1) * r * 0.9;
      for (const sgn of [1, -1]) {
        b.quad('toon', [x - s.w * 0.52, y0, z0 * 1], [x + s.w * 0.52, y0, z0],
          [x + s.w * 0.52, y1, z1], [x - s.w * 0.52, y1, z1],
          shade(bark, 0.72 + Math.sin(a0) * 0.55));
        if (sgn === -1) break;
      }
      // bark ridges running the length, one facet in three
      if (i % 3 === 0) {
        b.box('toon', x, y0 + 0.02, z0, s.w * 1.0, 0.05, 0.07, shade(bark, 1.35));
      }
    }
    // underside, flattened where it sits on the road
    b.box('toon', x, 0.02, z, s.w * 1.02, 0.06, r * 1.2, shade(bark, 0.6));
    // end grain: concentric rings, plus a split running out of the centre
    for (const side of [-1, 1]) {
      const ex = x + side * s.w * 0.53;
      for (let k = 5; k >= 1; k--) {
        b.cyl('toon', ex, cy - r * (k / 5) * 0.98, z, 0.001, r * (k / 5) * 0.95, 0.001, 12,
          shade(bark, 0.9 + k * 0.12));
      }
      b.dome('toon', ex, cy, z, r * 0.98, side * 0.16, 12, 3, shade(bark, 1.25));
      for (let k = 0; k < 4; k++) {
        b.box('toon', ex + side * 0.02, cy - r * 0.5 + k * r * 0.3, z, 0.03, 0.05, r * 1.5,
          shade(bark, 0.7));
      }
    }
    // branch stubs, sawn and snapped
    b.cyl('toon', x - s.w * 0.2, cy + r * 0.5, z, 0.11, 0.09, 0.26, 7, shade(bark, 1.1));
    b.box('toon', x + s.w * 0.28, cy + r * 0.4, z - r * 0.5, 0.12, 0.12, 0.3, shade(bark, 0.95));
    // Moss on top, and the caps sitting IN it: at s.h * 1.02 they stood 0.22 m
    // clear of the hitbox and you jumped straight through them.
    for (let i = 0; i < 5; i++) {
      const mx = x - s.w * 0.4 + i * s.w * 0.2;
      b.dome('toon', mx, cy + r * 0.86, z + ((i % 2) - 0.5) * 0.16, s.w * 0.18, s.h * 0.1, 7, 2,
        shade(pal.edge, 0.78 + (i % 3) * 0.12));
    }
    b.dome('emissive', x - s.w * 0.22, s.h * 0.8, z, 0.2, 0.12, 7, 2, shade(pal.accentGlow, 1.2));
    b.dome('emissive', x + s.w * 0.26, s.h * 0.8, z + 0.1, 0.15, 0.1, 6, 2, shade(pal.accentGlow, 1.0));
    for (const [dx, dz] of [[-0.7, 0.5], [0.66, 0.42]]) {
      b.taper('toon', x + dx, 0, z + dz, 0.22, 0.09, 0.18, 0.06, shade(bark, 0.8));
    }
  },
};

// ---------- gates: high, slide under them ----------------------------------

const GATES = {
  /** Overhead sign gantry. The city default. */
  gantry(b, pal, x, z, s) {
    // A SIGN GANTRY IS A BOX GIRDER ON TWO COLUMNS, AND IT IS BOLTED.
    //
    // Four boxes gave the city's default gate a slab on two pipes. What a
    // gantry actually shows is the joint: a flanged column on a base plate
    // with holding-down bolts, a bracket where the girder lands, stiffeners
    // down the beam and a walkway with a handrail along the back. All of it is
    // shallow, and all of it is what turns one shape into a made thing.
    for (const side of [-1, 1]) {
      const cx = x + side * (s.w / 2 + 0.1);
      // an I-column: two flanges and a web, so it has a section
      b.box('chrome', cx, 0, z, 0.34, s.base + s.h, 0.1, shade(pal.chrome, 0.95));
      b.box('chrome', cx, 0, z + 0.16, 0.12, s.base + s.h, 0.34, shade(pal.chrome, 0.78));
      b.box('chrome', cx, 0, z - 0.16, 0.12, s.base + s.h, 0.34, shade(pal.chrome, 0.68));
      // base plate, grout pad and four bolts
      b.box('toon', cx, 0, z, 0.8, 0.1, 0.8, shade(pal.deck, 1.15));
      b.box('chrome', cx, 0.1, z, 0.62, 0.06, 0.62, shade(pal.chrome, 1.0));
      for (let i = 0; i < 4; i++) {
        b.cyl('chrome', cx + Math.cos(i * 1.57) * 0.24, 0.16, z + Math.sin(i * 1.57) * 0.24,
          0.05, 0.045, 0.1, 6, shade(pal.chrome, 1.15));
      }
      // the haunch where the girder lands
      b.tri('toon', [cx, s.base - 0.5, z + 0.18], [cx, s.base, z + 0.18],
        [cx - side * 0.5, s.base, z + 0.18], shade(pal.deck, 1.0));
      b.tri('toon', [cx, s.base - 0.5, z - 0.18], [cx, s.base, z - 0.18],
        [cx - side * 0.5, s.base, z - 0.18], shade(pal.deck, 0.8));
    }
    // the girder: top and bottom flange, web, and stiffeners at intervals
    b.box('toon', x, s.base + s.h - 0.16, z, s.w + 0.1, 0.16, s.d + 0.24, shade(pal.deck, 1.35));
    b.box('toon', x, s.base + 0.16, z, s.w + 0.1, s.h - 0.32, s.d, shade(pal.deck, 1.12));
    for (let i = -3; i <= 3; i++) {
      b.box('toon', x + i * s.w * 0.15, s.base + 0.16, z + s.d * 0.52, 0.07, s.h - 0.32, 0.05,
        shade(pal.deck, 0.82));
    }
    // the sign face itself, set into the girder with a lit border
    b.box('toon', x, s.base + s.h * 0.28, z + s.d * 0.54, s.w * 0.88, s.h * 0.5, 0.06,
      shade(pal.deck, 1.5));
    b.box('emissive', x, s.base + s.h * 0.32, z + s.d * 0.58, s.w * 0.8, s.h * 0.36, 0.04,
      shade(pal.lane, 0.5));
    for (let i = 0; i < 4; i++) {
      b.box('emissive', x - s.w * 0.3 + i * s.w * 0.2, s.base + s.h * 0.4, z + s.d * 0.6,
        s.w * 0.11, s.h * 0.16, 0.03, shade(pal.accent, 0.8));
    }
    // maintenance walkway and handrail along the back
    b.box('chrome', x, s.base + s.h - 0.02, z - s.d * 0.62, s.w, 0.05, 0.42, shade(pal.chrome, 0.8));
    for (let i = -3; i <= 3; i++) {
      b.box('chrome', x + i * s.w * 0.16, s.base + s.h + 0.03, z - s.d * 0.78, 0.04, 0.34, 0.04,
        shade(pal.chrome, 0.9));
    }
    b.box('chrome', x, s.base + s.h + 0.36, z - s.d * 0.78, s.w, 0.05, 0.05, shade(pal.chrome, 1.05));
    // THE CLEARANCE. Flush with `s.base`, and the brightest thing on the form,
    // with lamp housings on it rather than a bare stripe.
    b.box('chrome', x, s.base, z, s.w + 0.2, 0.14, s.d + 0.2, shade(pal.chrome, 0.95));
    b.box('emissive', x, s.base + 0.02, z + s.d * 0.4, s.w * 0.9, 0.1, 0.05, shade(pal.edge, 1.35));
    for (let i = 0; i < 5; i++) {
      b.box('toon', x - s.w * 0.36 + i * s.w * 0.18, s.base + 0.14, z + s.d * 0.32, 0.2, 0.1, 0.16,
        shade(pal.deck, 0.9));
    }
  },

  /** Fishing net slung between two posts, floats along the bottom edge. */
  net(b, pal, x, z, s) {
    const rope = new THREE.Color('#c9a86a');
    // A NET IS A MESH, AND A MESH IS DIAMONDS, NOT A GRID.
    //
    // Seven verticals crossed by four horizontals is a window frame. Netting
    // hangs on the bias, so it is built here as two crossed diagonal families
    // — which is also what makes it read as fabric rather than as joinery —
    // with the mesh sagging away from the headrope towards the middle.
    for (const side of [-1, 1]) {
      const px = x + side * (s.w / 2 + 0.1);
      // posts: lashed timber, so a wrap of rope every so often
      b.cyl('toon', px, 0, z, 0.21, 0.16, s.base + s.h, 9, shade(rope, 0.8));
      for (let i = 0; i < 5; i++) {
        b.cyl('toon', px, (s.base + s.h) * (0.15 + i * 0.18), z, 0.23, 0.23, 0.07, 9,
          shade(rope, 1.25));
      }
      // On the open sea a base plate is a gold cone floating on the water. The
      // post is simply driven into it instead, with a wash collar round it.
      if (s.sea) {
        b.cyl('toon', px, 0.02, z, 0.34, 0.28, 0.1, 10, shade(pal.lane, 0.8));
        b.dome('toon', px, 0.0, z, 0.44, 0.06, 10, 2, shade(pal.lane, 0.62));
      } else {
        b.taper('toon', px, 0, z, 0.7, 0.12, 0.7, 0.16, shade(pal.deck, 1.05));
      }
    }
    // headrope and footrope, both with a visible lay
    for (const [ry, r2] of [[s.base + s.h - 0.2, 0.13], [s.base, 0.1]]) {
      b.box('toon', x, ry, z, s.w + 0.4, r2 * 2, r2 * 2, shade(rope, 1.0));
      for (let i = 0; i < 14; i++) {
        b.box('toon', x - s.w * 0.5 + i * s.w * 0.077, ry + r2 * 0.6, z, 0.05, r2, r2 * 2.2,
          shade(rope, 0.75 + (i % 2) * 0.4));
      }
    }
    // the mesh: two diagonal families, sagging in the middle
    const H = s.h - 0.2;
    for (const dir of [-1, 1]) {
      for (let i = -6; i <= 6; i++) {
        const x0 = x + i * s.w * 0.11;
        const x1 = x0 + dir * H * 0.5;
        const sag = 0.12;
        b.quad('toon', [x0, s.base + H, z + sag], [x0 + 0.05, s.base + H, z + sag],
          [x1 + 0.05, s.base, z], [x1, s.base, z], shade(rope, dir > 0 ? 1.0 : 0.72));
      }
    }
    // floats along the bottom edge, threaded ON the footrope
    for (let i = 0; i < 5; i++) {
      const fx = x - s.w * 0.34 + i * s.w * 0.17;
      b.cyl('toon', fx, s.base + 0.04, z, 0.14, 0.14, 0.26, 9, shade(pal.accent, 1.0));
      b.cyl('toon', fx, s.base + 0.14, z, 0.16, 0.16, 0.06, 9, shade(pal.accent, 1.3));
    }
    // weed caught in the mesh, and the lit clearance flush with the base
    for (const [dx, dy] of [[-0.5, 0.3], [0.4, 0.5], [0.1, 0.2]]) {
      b.dome('toon', x + s.w * dx, s.base + H * dy, z + 0.06, 0.2, 0.12, 6, 2, shade(pal.edge, 0.55));
    }
    b.box('emissive', x, s.base, z, s.w * 0.9, 0.12, 0.18, shade(pal.accentGlow, 1.2));
  },

  /** Crane beam with a slung load. */
  beam(b, pal, x, z, s) {
    // A CRANE BEAM IS A LATTICE JIB AND A SLUNG LOAD ON REAL FALLS.
    //
    // A solid bar with a box under it was a shelf. A jib is chords and
    // bracing, the load hangs from a block on two falls, and the load itself
    // is a bale with banding — it used to be one untextured box, and on The
    // Heights, whose whole palette is white, that is a blank white rectangle
    // hanging over the road, the single ugliest object in the game.
    const jibY = s.base + s.h * 0.55;
    const span = s.w + 3.4;
    for (const dy of [-0.24, 0.24]) {
      b.box('chrome', x, jibY + dy, z, span, 0.12, 0.16, shade(pal.chrome, dy > 0 ? 1.0 : 0.8));
    }
    for (let i = 0; i < 14; i++) {
      const x0 = x - span / 2 + i * span / 14;
      const x1 = x0 + span / 14;
      const up = i % 2 === 0;
      b.quad('chrome', [x0, jibY - 0.18 + (up ? 0 : 0.36), z], [x1, jibY - 0.18 + (up ? 0.36 : 0), z],
        [x1, jibY - 0.12 + (up ? 0.36 : 0), z], [x0, jibY - 0.12 + (up ? 0 : 0.36), z],
        shade(pal.chrome, 0.66));
      if (i % 3 === 0) {
        b.box('chrome', x0, jibY - 0.24, z, 0.07, 0.48, 0.2, shade(pal.chrome, 0.9));
      }
    }
    b.box('emissive', x, jibY + 0.3, z, span, 0.06, 0.5, shade(pal.edge, 0.8));
    // trolley, block and two falls of rope
    b.box('chrome', x, jibY - 0.36, z, 0.5, 0.16, 0.4, shade(pal.chrome, 1.1));
    for (const dx of [-0.14, 0.14]) {
      b.box('chrome', x + dx, s.base + s.h * 0.42, z, 0.045, jibY - 0.36 - (s.base + s.h * 0.42),
        0.045, shade(pal.chrome, 0.85));
    }
    b.box('chrome', x, s.base + s.h * 0.36, z, 0.3, 0.14, 0.22, shade(pal.chrome, 1.0));
    b.cyl('chrome', x, s.base + s.h * 0.3, z, 0.09, 0.07, 0.1, 8, shade(pal.chrome, 1.15));
    // The load: a strapped bale with banding, a lit face and a corner cut off,
    // so it reads even when its colour and the sky's are the same.
    const w = s.w * 0.8, h = s.h * 0.55, d = s.d * 1.4;
    b.box('toon', x, s.base, z, w, h, d, shade(pal.deck, 1.35));
    b.box('toon', x, s.base + h * 0.18, z, w * 1.04, h * 0.42, d * 0.9, shade(pal.facades[0], 1.15));
    for (const side of [-1, 1]) {
      b.box('chrome', x + side * w * 0.28, s.base, z, 0.14, h + 0.06, d + 0.06, shade(pal.chrome, 0.9));
      b.box('chrome', x + side * w * 0.28, s.base + h + 0.02, z, 0.2, 0.06, 0.2,
        shade(pal.chrome, 1.15));
    }
    b.box('chrome', x, s.base + h * 0.5, z, w + 0.1, 0.12, d + 0.08, shade(pal.chrome, 1.0));
    b.tri('toon', [x + w / 2, s.base + h, z - d / 2], [x + w / 2, s.base + h * 0.55, z - d / 2],
      [x + w * 0.18, s.base + h, z - d / 2], shade(pal.deck, 1.7));
    b.box('emissive', x, s.base + h * 0.26, z + d * 0.51, w * 0.6, h * 0.3, 0.05,
      shade(pal.accent, 0.6));
    // the clearance, flush with the base
    b.box('emissive', x, s.base, z, s.w * 0.75, 0.12, s.d * 1.3, shade(pal.accentGlow, 1.25));
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
    // A WALL OF SCREENS IS READ FROM ITS BEZELS.
    //
    // The first pass was ten flat boxes with a lit rectangle stuck on each,
    // which at any distance is a grid of dashes. A CRT is deep, its glass is
    // proud of its case and its case tapers away behind it, so every screen
    // here is four parts: a tapered shell, a bezel, a bulged face and its own
    // shadow gap. That depth is what makes the wall read as objects rather
    // than as a texture, and it is also what catches the light unevenly enough
    // to look like it is flickering when it is not.
    for (const side of [-1, 1]) {
      const px = x + side * (s.w / 2 + 0.24);
      b.box('chrome', px, 0, z, 0.22, s.base + s.h, 0.3, shade(pal.chrome, 0.78));
      b.box('chrome', px, 0, z, 0.56, 0.12, 0.6, shade(pal.chrome, 0.95));
      // cable trays climbing the posts
      for (let i = 0; i < 5; i++) {
        b.box('chrome', px, 0.4 + i * (s.base + s.h) * 0.19, z + 0.2, 0.3, 0.06, 0.1,
          shade(pal.chrome, 0.6));
      }
    }
    // the truss the rack hangs off
    b.box('toon', x, s.base + s.h - 0.34, z, s.w + 0.9, 0.34, 0.5, shade(pal.deck, 1.15));
    b.box('chrome', x, s.base + s.h, z, s.w + 0.7, 0.1, 0.56, shade(pal.chrome, 0.95));
    for (let i = -2; i <= 2; i++) {
      b.box('chrome', x + i * s.w * 0.22, s.base + s.h * 0.86, z, 0.07, s.h * 0.16, 0.07,
        shade(pal.chrome, 0.7));
    }
    // The screens. Two rows of five, and the bottom row's glass sits exactly
    // on the clearance line: this zone is about knowing which floor you are on
    // and a gate that lies about its own bottom edge would poison that.
    const sw = s.w * 0.17, sh = s.h * 0.38, dep = s.d * 0.7;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 5; i++) {
        const mx = x - s.w * 0.38 + i * s.w * 0.19;
        const my = s.base + row * (sh + 0.12);
        const n = row * 5 + i;
        // case: tapers away from the viewer, which is the CRT profile
        b.taper('toon', mx, my, z - dep * 0.1, sw * 0.94, sh, dep * 0.9, sw * 0.34,
          shade(pal.deck, 1.06 + (n % 3) * 0.08));
        // bezel, proud of the case on all four sides
        b.box('toon', mx, my + sh * 0.06, z + dep * 0.34, sw, sh * 0.86, 0.1,
          shade(pal.deck, 1.42));
        b.box('toon', mx, my + sh * 0.06, z + dep * 0.3, sw * 1.06, sh * 0.9, 0.06,
          shade(pal.deck, 0.72));
        const dead = n === 3, bar = n === 7;
        // the glass, bulged: a middle panel proud of two chamfers
        const gw = sw * 0.74, gh = sh * 0.6, gy = my + sh * 0.16;
        const tint = dead ? pal.deck : bar ? pal.accent : pal.lane;
        const lit = dead ? 0.32 : bar ? 0.95 : 0.7;
        b.box('emissive', mx, gy, z + dep * 0.44, gw, gh, 0.04, shade(tint, lit));
        for (const sx of [-1, 1]) {
          b.quad('emissive',
            [mx + sx * gw * 0.5, gy, z + dep * 0.44], [mx + sx * gw * 0.62, gy, z + dep * 0.38],
            [mx + sx * gw * 0.62, gy + gh, z + dep * 0.38], [mx + sx * gw * 0.5, gy + gh, z + dep * 0.44],
            shade(tint, lit * 0.7));
        }
        b.quad('emissive', [mx - gw * 0.5, gy + gh, z + dep * 0.44], [mx + gw * 0.5, gy + gh, z + dep * 0.44],
          [mx + gw * 0.5, gy + gh * 1.12, z + dep * 0.38], [mx - gw * 0.5, gy + gh * 1.12, z + dep * 0.38],
          shade(tint, lit * 0.55));
        if (!dead) {
          // one bright scanline per screen, at its own height
          b.box('emissive', mx, gy + gh * (0.15 + ((i * 3 + row) % 4) * 0.2), z + dep * 0.47,
            gw * 0.96, 0.05, 0.03, shade(pal.accentGlow, 1.15));
        }
        // a knob and a vent slot, the details that say hardware
        b.cyl('chrome', mx + sw * 0.3, my + sh * 0.1, z + dep * 0.42, 0.04, 0.04, 0.05, 6,
          shade(pal.chrome, 0.9));
        for (let v = 0; v < 3; v++) {
          b.box('toon', mx, my + sh * 0.86 + v * 0.05, z - dep * 0.1, sw * 0.5, 0.02, dep * 0.5,
            shade(pal.deck, 0.7));
        }
      }
    }
    b.box('emissive', x, s.base, z, s.w * 0.96, 0.08, s.d * 0.75, shade(pal.accentGlow, 1.15));
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
      const px = x + side * (s.w / 2 + 0.14);
      b.cyl('chrome', px, 0, z, 0.15, 0.12, s.base + s.h, 8, shade(pal.chrome, 0.8));
      b.cyl('chrome', px, 0, z, 0.28, 0.24, 0.14, 10, shade(pal.chrome, 0.95));
      for (let i = 0; i < 4; i++) {
        b.box('chrome', px, (s.base + s.h) * (0.2 + i * 0.2), z, 0.24, 0.06, 0.24,
          shade(pal.chrome, 1.05));
      }
    }
    b.box('toon', x, s.base + s.h - 0.24, z, s.w + 0.7, 0.28, 0.34, shade(pal.deck, 1.15));
    // Real chain, not two dropped bars: alternating links, and one side hangs
    // shorter so the whole sign is off level.
    const drop = s.h * 0.4;
    for (const [side, d] of [[-1, drop], [1, drop * 0.84]]) {
      const cx = x + side * s.w * 0.34;
      const links = 7;
      for (let i = 0; i < links; i++) {
        const ly = s.base + s.h - 0.24 - (i + 0.5) * (d / links);
        const horiz = i % 2 === 0;
        b.box('chrome', cx, ly, z, horiz ? 0.13 : 0.05, d / links * 0.9, horiz ? 0.05 : 0.13,
          shade(pal.chrome, horiz ? 1.0 : 0.78));
      }
    }
    // THE LIGHT BOX, WITH A REAL BEZEL. Its underside is the clearance, so it
    // sits exactly on `s.base` and nothing on this form goes below it.
    const boxH = s.h * 0.5;
    b.box('toon', x, s.base, z, s.w * 0.94, boxH, s.d * 0.7, shade(pal.deck, 1.4));
    b.taper('toon', x, s.base + boxH, z, s.w * 0.98, 0.14, s.d * 0.76, -0.06, shade(pal.deck, 1.6));
    // The lower lip sits ON the clearance, not under it. Every other gate in
    // the game lets its trim straddle that line; this one must not, because it
    // is the line.
    b.taper('toon', x, s.base, z, s.w * 0.98, 0.14, s.d * 0.76, 0.06, shade(pal.deck, 1.2));
    b.box('chrome', x, s.base + boxH + 0.12, z, s.w * 1.0, 0.07, s.d * 0.8, shade(pal.chrome, 1.0));
    b.box('chrome', x, s.base + 0.01, z, s.w * 1.0, 0.07, s.d * 0.8, shade(pal.chrome, 0.9));
    // the lit face, and the letter blocks standing proud of it
    b.box('emissive', x, s.base + boxH * 0.18, z + s.d * 0.36, s.w * 0.8, boxH * 0.6, 0.05,
      shade(pal.accent, 0.85));
    for (let i = 0; i < 5; i++) {
      const lx = x - s.w * 0.32 + i * s.w * 0.16;
      b.box('toon', lx, s.base + boxH * 0.24, z + s.d * 0.38, s.w * 0.1, boxH * 0.44, 0.05,
        shade(pal.deck, 1.8));
      b.box('emissive', lx, s.base + boxH * 0.26, z + s.d * 0.4, s.w * 0.07, boxH * 0.38, 0.04,
        shade(pal.lane, 1.05));
    }
    // Chase bulbs in holders, all the way round the frame — the detail that
    // makes a marquee a marquee, and one of them blown.
    const ring = [];
    for (let i = 0; i < 7; i++) ring.push([x - s.w * 0.42 + i * s.w * 0.14, s.base + boxH + 0.06]);
    for (let i = 0; i < 7; i++) ring.push([x - s.w * 0.42 + i * s.w * 0.14, s.base + 0.12]);
    ring.forEach(([bx, by], i) => {
      b.cyl('chrome', bx, by - 0.03, z + s.d * 0.34, 0.055, 0.05, 0.06, 6, shade(pal.chrome, 0.95));
      const dead = i === 4;
      b.dome(dead ? 'toon' : 'emissive', bx, by + 0.02, z + s.d * 0.34, 0.075, 0.07, 7, 2,
        shade(dead ? pal.deck : (i % 2 ? pal.accentGlow : pal.lane), dead ? 0.6 : 1.15));
    });
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
    const half = s.w / 2 + 0.2;
    // A TRUSS IS AN OPEN FRAME, SO EVERY MEMBER IS ANGLE IRON.
    //
    // Two flat quads for the X read as crosses painted on the sky. Real
    // bracing is L-section: two thin webs meeting at a right angle, which
    // guarantees one face always catches the light differently from the
    // other. On a zone whose whole palette is white, that self-shading is the
    // only thing keeping the shape alive.
    const angle = (x0, y0, z0, x1, y1, z1, w, tint) => {
      b.quad('chrome', [x0, y0, z0 - w], [x1, y1, z1 - w],
        [x1, y1 + w * 2, z1 - w], [x0, y0 + w * 2, z0 - w], shade(steel, tint));
      b.quad('chrome', [x0, y0, z0 - w], [x1, y1, z1 - w],
        [x1, y1, z1 + w], [x0, y0, z0 + w], shade(steel, tint * 0.72));
    };
    for (const side of [-1, 1]) {
      const lx = x + side * half;
      for (const dz of [-0.16, 0.16]) {
        b.box('chrome', lx, 0, z + dz, 0.16, top, 0.07, shade(steel, dz < 0 ? 1.0 : 0.72));
        b.box('chrome', lx + side * 0.055, 0, z + dz, 0.05, top, 0.2, shade(steel, 0.86));
      }
      for (let i = 0; i < 6; i++) {
        b.box('chrome', lx, 0.4 + i * top * 0.16, z, 0.2, 0.09, 0.42, shade(pal.chrome, 1.0));
      }
      b.box('toon', lx, 0, z, 0.66, 0.16, 0.7, shade(pal.deck, 1.2));
      for (const dz of [-0.22, 0.22]) {
        b.cyl('chrome', lx + side * 0.2, 0.02, z + dz, 0.05, 0.045, 0.16, 6, shade(pal.chrome, 0.95));
      }
    }
    for (const dir of [-1, 1]) {
      const y0 = s.base + (dir > 0 ? 0.12 : s.h - 0.12);
      const y1 = s.base + (dir > 0 ? s.h - 0.12 : 0.12);
      angle(x - half, y0, z + dir * 0.1, x + half, y1, z + dir * 0.1, 0.12, dir > 0 ? 1.0 : 0.66);
    }
    b.box('chrome', x, top - 0.24, z, s.w + 0.4, 0.14, 0.36, shade(pal.chrome, 0.95));
    b.box('chrome', x, top - 0.1, z, s.w + 0.4, 0.1, 0.5, shade(pal.chrome, 1.12));
    // the gusset where the diagonals cross, plated both sides and bolted
    b.box('chrome', x, s.base + s.h * 0.5 - 0.26, z - 0.24, 0.7, 0.52, 0.06, shade(pal.chrome, 1.15));
    b.box('chrome', x, s.base + s.h * 0.5 - 0.26, z + 0.24, 0.7, 0.52, 0.06, shade(pal.chrome, 0.7));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.7;
      b.cyl('chrome', x + Math.cos(a) * 0.2, s.base + s.h * 0.5 + Math.sin(a) * 0.14, z + 0.28,
        0.05, 0.05, 0.05, 6, shade(pal.chrome, 1.3));
    }
    // The clearance, flush with the base, bolted rather than painted: the one
    // bar she has to read must never be a plain white stripe on a white sky.
    b.box('emissive', x, s.base, z, s.w * 0.94, 0.09, 0.1, shade(pal.accentGlow, 1.05));
    for (let i = 0; i < 7; i++) {
      b.cyl('chrome', x - s.w * 0.42 + i * s.w * 0.14, s.base + 0.1, z + 0.2, 0.05, 0.04, 0.05, 6,
        shade(pal.chrome, 1.2));
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
    // THE LIGHTEST THING IN THE GAME THAT STILL STOPS YOU.
    //
    // Every other gate is heavy — a sign bridge, a crane beam, a pipe run. On
    // a road that is already swinging sideways a second heavy shape is one too
    // many to parse, so this one is a truss so slim it is mostly air: a top
    // and bottom chord with zigzag webbing between them, which is stiff in
    // reality and nearly transparent on screen.
    const half = s.w / 2 + 0.24;
    for (const side of [-1, 1]) {
      const lx = x + side * half;
      // raked legs, built as stacked boxes because the matrix stack cannot roll
      for (let i = 0; i < 4; i++) {
        const t = i / 4;
        b.box('chrome', lx - side * t * 0.16, armY * t, z, 0.13, armY * 0.26, 0.18,
          shade(pal.chrome, 0.78 + i * 0.07));
      }
      b.taper('toon', lx, 0, z, 0.6, 0.12, 0.66, 0.12, shade(pal.deck, 1.2));
      for (const dz of [-0.2, 0.2]) {
        b.cyl('chrome', lx, 0.02, z + dz, 0.05, 0.04, 0.14, 6, shade(pal.chrome, 0.95));
      }
      // a stay back to the deck, which is what a mast this thin would need
      b.quad('chrome', [lx, armY * 0.9, z], [lx, armY * 0.86, z],
        [lx + side * 0.5, 0.1, z + 0.5], [lx + side * 0.5, 0.14, z + 0.5], shade(pal.chrome, 0.7));
    }
    // chords and webbing
    b.box('chrome', x, armY + 0.16, z, s.w + 0.8, 0.08, 0.16, shade(pal.chrome, 1.05));
    b.box('chrome', x, armY - 0.1, z, s.w + 0.8, 0.08, 0.16, shade(pal.chrome, 0.85));
    for (let i = 0; i < 10; i++) {
      const x0 = x - (s.w + 0.8) / 2 + i * (s.w + 0.8) / 10;
      const x1 = x0 + (s.w + 0.8) / 10;
      const up = i % 2 === 0;
      b.quad('chrome', [x0, armY - 0.02 + (up ? 0 : 0.18), z - 0.05],
        [x1, armY - 0.02 + (up ? 0.18 : 0), z - 0.05],
        [x1, armY + 0.04 + (up ? 0.18 : 0), z - 0.05],
        [x0, armY + 0.04 + (up ? 0 : 0.18), z - 0.05], shade(pal.chrome, 0.66));
    }
    b.box('emissive', x, armY + 0.24, z + 0.1, s.w + 0.5, 0.06, 0.04, shade(pal.edge, 0.95));
    // camera pods on yokes, aimed down the road
    for (const side of [-1, 1]) {
      const px = x + side * s.w * 0.28;
      b.box('chrome', px, armY - 0.28, z, 0.07, 0.2, 0.07, shade(pal.chrome, 0.8));
      b.taper('toon', px, armY - 0.5, z, 0.28, 0.24, 0.4, -0.06, shade(pal.deck, 1.1));
      b.cyl('glass', px, armY - 0.44, z + 0.22, 0.09, 0.08, 0.06, 8, shade(pal.edge, 1.1));
      b.box('emissive', px, armY - 0.38, z + 0.24, 0.14, 0.05, 0.04, shade(pal.accent, 0.9));
      b.box('toon', px, armY - 0.26, z - 0.06, 0.3, 0.06, 0.3, shade(pal.deck, 1.35));
    }
    // THE LIGHT CURTAIN. Teeth rather than a sheet: a solid bar of light at
    // head height reads as something not to touch, and this is the line she is
    // meant to pass under. Each tooth gets its own emitter so the row has
    // structure instead of being a comb of identical sticks.
    for (let i = 0; i < 9; i++) {
      const tx = x - s.w / 2 + (s.w / 8) * i;
      b.box('chrome', tx, s.base + 0.34, z, 0.06, 0.08, 0.06, shade(pal.chrome, 0.9));
      b.box('emissive', tx, s.base, z, 0.05, 0.34, 0.05, shade(pal.accentGlow, 1.0));
      // Domed UPWARD. Pointing it down put the brightest thing on the gate 5 cm
      // under the line it exists to draw, which is the one place nothing may be.
      b.dome('emissive', tx, s.base + 0.02, z, 0.05, 0.05, 6, 2, shade(pal.accentGlow, 1.3));
    }
    b.box('emissive', x, s.base, z, s.w * 0.96, 0.06, 0.05, shade(pal.accentGlow, 1.2));
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
    // A SIGNAL HEAD IS A STACK OF HOODED LENSES.
    //
    // Flat boxes with three coloured discs on the front read as dominoes. The
    // shape that says traffic signal is the HOOD over each lens — a half tube
    // sticking out — plus the back box being deeper than it is wide. Both are
    // built here, because at speed the hoods are the only part with a
    // silhouette of their own.
    for (const side of [-1, 1]) {
      const mx = x + side * (s.w / 2 + 0.16);
      b.cyl('toon', mx, 0, z, 0.21, 0.16, armY + 0.3, 8, mast);
      b.taper('toon', mx, 0, z, 0.68, 0.16, 0.68, 0.14, shade(pal.deck, 1.3));
      b.box('chrome', mx, 0.16, z, 0.52, 0.06, 0.52, shade(pal.chrome, 0.8));
      for (let i = 0; i < 4; i++) {
        b.cyl('chrome', mx + Math.cos(i * 1.57) * 0.2, 0.02, z + Math.sin(i * 1.57) * 0.2,
          0.05, 0.04, 0.13, 6, shade(pal.chrome, 0.95));
      }
      // a cable dropping down the mast into a junction box
      b.box('chrome', mx + side * 0.19, armY * 0.3, z, 0.05, armY * 0.6, 0.05, shade(pal.chrome, 0.7));
      b.box('toon', mx + side * 0.22, armY * 0.24, z, 0.16, 0.3, 0.22, shade(pal.deck, 1.25));
    }
    b.box('toon', x, armY, z, s.w + 0.9, 0.24, 0.28, mast);
    b.box('chrome', x, armY + 0.24, z, s.w + 0.7, 0.08, 0.34, shade(pal.chrome, 0.9));
    for (let i = -2; i <= 2; i++) {
      b.box('chrome', x + i * s.w * 0.22, armY - 0.1, z, 0.06, 0.1, 0.2, shade(pal.chrome, 0.75));
    }
    // Three heads. The middle one still burns, which is the whole story of the
    // zone in one object.
    for (let i = 0; i < 3; i++) {
      const hx = x + (i - 1) * s.w * 0.34;
      const drop = armY - s.base - 0.66;
      b.box('chrome', hx, s.base + 0.66, z, 0.06, drop, 0.06, shade(pal.chrome, 0.75));
      b.cyl('chrome', hx, s.base + 0.6, z, 0.09, 0.07, 0.08, 8, shade(pal.chrome, 0.95));
      // the back box, deeper than wide, with a lid
      b.box('toon', hx, s.base, z, 0.3, 0.66, 0.3, shade(pal.deck, 0.82));
      b.box('toon', hx, s.base + 0.66, z, 0.34, 0.06, 0.34, shade(pal.deck, 1.3));
      for (let k = 0; k < 3; k++) {
        const ly = s.base + 0.09 + k * 0.2;
        const lit = i === 1 && k === 2;
        // the hood: a half tube standing off the face
        for (let seg = 0; seg < 5; seg++) {
          const a0 = Math.PI * (seg / 5), a1 = Math.PI * ((seg + 1) / 5);
          b.quad('toon',
            [hx + Math.cos(a0) * 0.11, ly + 0.03 + Math.sin(a0) * 0.11, z + 0.1],
            [hx + Math.cos(a1) * 0.11, ly + 0.03 + Math.sin(a1) * 0.11, z + 0.1],
            [hx + Math.cos(a1) * 0.11, ly + 0.03 + Math.sin(a1) * 0.11, z + 0.22],
            [hx + Math.cos(a0) * 0.11, ly + 0.03 + Math.sin(a0) * 0.11, z + 0.22],
            shade(pal.deck, 0.7 + seg * 0.12));
        }
        b.cyl('toon', hx, ly, z + 0.1, 0.1, 0.1, 0.04, 10, shade(pal.deck, 1.15));
        b.cyl('emissive', hx, ly + 0.01, z + 0.13, 0.08, 0.08, 0.04, 10,
          shade(lit ? pal.accent : pal.deck, lit ? 1.5 : 0.5));
      }
    }
    // The clearance line, flush with the base rather than hanging under it.
    b.box('emissive', x, s.base, z - 0.22, s.w * 0.94, 0.1, 0.06, shade(pal.accentGlow, 0.95));
  },

  /** Curtain of hanging vines. */
  vine(b, pal, x, z, s) {
    const bark = shade(pal.deck, 0.7);
    // A CURTAIN OF VINES IS LEAVES, AND LEAVES ARE THE WHOLE SILHOUETTE.
    //
    // Nine boxes with a dome on the end is a bead curtain. Each strand here is
    // a stem that kinks as it falls, with leaves alternating off it and a
    // heavier cluster at the tip, so the edge of the curtain is ragged — which
    // is the only thing that separates hanging growth from hanging rope.
    //
    // Nothing hangs below `s.base`: this is a gate, and its clearance is the
    // line she slides under.
    const beamY = s.base + s.h - 0.2;
    // The crossbeam is a BOX. A cyl() here stood on end as a five-metre post
    // through the middle of the gate: `Builder.at()` only rotates around Y, so
    // a cylinder can never be laid down, which is the trap this file has
    // already documented twice.
    b.box('toon', x, beamY, z, s.w + 0.8, 0.3, 0.5, shade(bark, 1.0));
    b.box('toon', x, beamY + 0.3, z, s.w + 0.6, 0.08, 0.6, shade(bark, 1.3));
    for (let i = 0; i < 5; i++) {
      b.cyl('toon', x - s.w * 0.4 + i * s.w * 0.2, beamY + 0.28, z, 0.07, 0.05, 0.16, 6,
        shade(bark, 1.25));
    }
    for (let i = 0; i < 9; i++) {
      const vx = x - s.w / 2 + (s.w / 8) * i;
      // Clamped so the longest strand stops ON the clearance. A curtain that
      // hangs through the line she slides under is the one thing a gate may
      // never do, however soft the thing hanging is.
      const len = (beamY - s.base) * (0.6 + ((i * 37) % 10) / 42);
      const kink = ((i % 3) - 1) * 0.06;
      // the stem, in three kinked sections
      for (let k = 0; k < 3; k++) {
        const t0 = k / 3, t1 = (k + 1) / 3;
        b.quad('toon', [vx + kink * k, beamY - len * t0, z - 0.05],
          [vx + kink * (k + 1), beamY - len * t1, z - 0.05],
          [vx + kink * (k + 1) + 0.07, beamY - len * t1, z + 0.05],
          [vx + kink * k + 0.07, beamY - len * t0, z + 0.05],
          shade(pal.edge, 0.62 + k * 0.16));
      }
      // leaves, alternating, angled and of two sizes
      for (let k = 0; k < 5; k++) {
        const t = 0.14 + k * 0.18;
        const side = k % 2 ? 1 : -1;
        const ly = beamY - len * t;
        const lw = 0.2 + (k % 3) * 0.06;
        b.quad('toon', [vx + kink * t * 3, ly, z], [vx + kink * t * 3 + side * lw, ly + lw * 0.5, z + 0.06],
          [vx + kink * t * 3 + side * lw * 1.5, ly - lw * 0.2, z], [vx + kink * t * 3, ly - lw * 0.3, z - 0.04],
          shade(pal.edge, 0.7 + (i % 3) * 0.16 + k * 0.05));
      }
      // the heavier tip
      b.dome('toon', vx + kink * 3, beamY - len, z, 0.26, -0.3, 7, 2, shade(pal.edge, 1.05));
      b.dome('emissive', vx + kink * 3, beamY - len + 0.06, z + 0.06, 0.1, -0.1, 6, 2,
        shade(pal.accentGlow, 0.7));
    }
    // the clearance, flush with the base
    b.box('emissive', x, s.base, z, s.w * 0.9, 0.1, 0.2, shade(pal.accentGlow, 1.1));
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
    // A PIPE IS ROUND, SO IT IS BUILT ROUND.
    //
    // Boxes, because `Builder.at()` only rotates around Y and the `cyl()` this
    // once used stood up as a 5.6 m column planted in the lane while the
    // collision stayed overhead. Three stacked slabs faked the profile and
    // read as a flat bar with wheels on it; this is a ten-sided barrel swept
    // along x, which is genuinely round from any angle the camera can reach.
    const R = 0.62, SEG = 10;
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
      b.quad('chrome',
        [x - run / 2, y + Math.sin(a0) * R, z + Math.cos(a0) * R],
        [x + run / 2, y + Math.sin(a0) * R, z + Math.cos(a0) * R],
        [x + run / 2, y + Math.sin(a1) * R, z + Math.cos(a1) * R],
        [x - run / 2, y + Math.sin(a1) * R, z + Math.cos(a1) * R],
        shade(pal.chrome, 0.62 + (Math.sin(a0) + 1) * 0.34));
    }
    // Flanges: a raised ring with bolts round it. Joints are what give a pipe
    // its rhythm, and bolts are what stop a ring being a painted stripe.
    for (let i = -2; i <= 2; i++) {
      const fx = x + i * (run / 5);
      for (let k = 0; k < SEG; k++) {
        const a0 = (k / SEG) * Math.PI * 2, a1 = ((k + 1) / SEG) * Math.PI * 2;
        b.quad('chrome',
          [fx - 0.11, y + Math.sin(a0) * R * 1.16, z + Math.cos(a0) * R * 1.16],
          [fx + 0.11, y + Math.sin(a0) * R * 1.16, z + Math.cos(a0) * R * 1.16],
          [fx + 0.11, y + Math.sin(a1) * R * 1.16, z + Math.cos(a1) * R * 1.16],
          [fx - 0.11, y + Math.sin(a1) * R * 1.16, z + Math.cos(a1) * R * 1.16],
          shade(pal.chrome, 1.0));
        if (k % 2 === 0) {
          b.cyl('chrome', fx + 0.12, y + Math.sin(a0) * R * 1.16, z + Math.cos(a0) * R * 1.16,
            0.05, 0.05, 0.05, 6, shade(pal.chrome, 1.25));
        }
      }
      b.box('emissive', fx, y - 0.44, z + R * 1.2, 0.16, 0.5, 0.05, shade(pal.accentGlow, 0.5));
    }
    // hangers with turnbuckles, so it is carried rather than floating
    for (const side of [-1, 1]) {
      const hx = x + side * run * 0.3;
      b.box('chrome', hx, y + 0.5, z, 0.1, 1.5, 0.1, shade(pal.chrome, 0.7));
      b.cyl('chrome', hx, y + 0.9, z, 0.09, 0.09, 0.24, 6, shade(pal.chrome, 1.0));
      for (let k = 0; k < SEG / 2; k++) {
        const a = Math.PI * (k / (SEG / 2)) + Math.PI;
        b.box('chrome', hx, y + Math.sin(a) * R * 1.1, z + Math.cos(a) * R * 1.1, 0.09, 0.09, 0.09,
          shade(pal.chrome, 0.9));
      }
    }
    // valve wheels out at the ends, with real spokes
    for (const side of [-1, 1]) {
      const vx = x + side * (run * 0.42);
      b.cyl('chrome', vx, y + 0.62, z, 0.1, 0.09, 0.34, 6, shade(pal.chrome, 0.8));
      b.cyl('chrome', vx, y + 0.96, z, 0.4, 0.4, 0.08, 12, shade(pal.chrome, 1.0));
      for (let k = 0; k < 4; k++) {
        b.box('chrome', vx, y + 1.0, z, 0.8 * Math.abs(Math.cos(k * 0.79)), 0.04,
          0.8 * Math.abs(Math.sin(k * 0.79)) + 0.04, shade(pal.chrome, 1.15));
      }
    }
    // the load it carries, and the lit lip marking the clearance, flush
    b.taper('toon', x, s.base, z, s.w * 0.85, s.h * 0.42, s.d, 0.08, shade(pal.road, 2.2));
    b.box('emissive', x, s.base, z, s.w * 0.88, 0.14, s.d + 0.08, shade(pal.accentGlow, 0.8));
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
    // A COLUMN IS BASE, SHAFT, CAPITAL — AND THE FLUTES ARE HOLLOWS.
    //
    // The old one was a tapered box with four stripes on it, which is the
    // shape a placeholder has. A column reads from a base wider than the
    // shaft, flutes breaking the round silhouette, and a cap that overhangs;
    // the break at the top is what stops three in a row looking stamped. What
    // was still missing is that flutes are CUT IN, not stuck on: eight ribs
    // standing proud read as a bundle of pipes, so the shaft is now a
    // sixteen-sided drum with every other facet pushed inward.
    const r = s.w * 0.36;
    const SEG = 16;
    const shaftY = 0.42, shaftH = s.h * 0.78;
    // stepped base: plinth, torus, scotia
    b.taper('toon', x, 0, z, s.w * 1.04, 0.2, s.d * 1.04, 0.06, shade(pal.deck, 1.15));
    b.taper('toon', x, 0.2, z, s.w * 0.94, 0.12, s.d * 0.94, 0.08, shade(pal.deck, 1.35));
    b.cyl('toon', x, 0.32, z, r * 1.2, r * 1.1, 0.1, SEG, shade(pal.deck, 1.5));
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
      const inA = i % 2 === 0;
      const r0 = inA ? r * 0.88 : r, r1 = inA ? r : r * 0.88;
      // the flute wall, and its floor: two quads make a hollow, one makes a rib
      b.quad('toon', [x + Math.cos(a0) * r0, shaftY, z + Math.sin(a0) * r0],
        [x + Math.cos(a1) * r1, shaftY, z + Math.sin(a1) * r1],
        [x + Math.cos(a1) * r1 * 0.86, shaftY + shaftH, z + Math.sin(a1) * r1 * 0.86],
        [x + Math.cos(a0) * r0 * 0.86, shaftY + shaftH, z + Math.sin(a0) * r0 * 0.86],
        shade(pal.accentGlow, inA ? 0.5 : 0.78));
    }
    // the lit bands, set into the flutes rather than wrapped over them
    for (const t of [0.06, 0.52, 0.9]) {
      b.cyl('emissive', x, shaftY + shaftH * t, z, r * 0.95, r * 0.95, 0.09, SEG,
        shade(pal.lane, 0.55));
    }
    // capital: echinus, abacus, then the snapped top
    const capY = shaftY + shaftH;
    b.cyl('chrome', x, capY, z, r * 0.9, r * 1.16, 0.18, SEG, shade(pal.chrome, 0.95));
    b.taper('toon', x, capY + 0.18, z, s.w * 0.98, s.h * 0.1, s.d * 0.98, -0.06, shade(pal.deck, 1.4));
    b.box('toon', x, capY + 0.18 + s.h * 0.1, z, s.w * 1.02, 0.1, s.d * 1.02, shade(pal.deck, 1.6));
    b.tri('toon', [x - s.w * 0.5, s.h * 1.0, z], [x + s.w * 0.5, s.h * 1.0, z],
      [x, s.h * 1.1, z - s.d * 0.4], shade(pal.deck, 1.75));
    b.tri('toon', [x - s.w * 0.5, s.h * 1.0, z], [x, s.h * 1.1, z - s.d * 0.4],
      [x - s.w * 0.2, s.h * 0.92, z + s.d * 0.4], shade(pal.deck, 1.2));
    // spalled chunks at the foot, from whatever broke the top
    for (const [dx, dz, w2] of [[-0.8, 0.5, 0.24], [0.72, -0.4, 0.18], [0.4, 0.7, 0.14]]) {
      b.taper('toon', x + dx, 0, z + dz, w2 * 2, w2, w2 * 1.6, w2 * 0.6, shade(pal.deck, 1.05));
    }
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
    // A SIGN STACK IS BOARDS ON BRACKETS, AND THE BRACKETS ARE THE READ.
    //
    // The Market used the Ring's `pillar` and The Core's arches, so from the
    // road the three zones met in the middle. This is what The Market has that
    // nothing else does: signage wider at the top than the bottom, the
    // opposite silhouette to every other block. Boards floating on a mast read
    // as decals, so each one now hangs off a real bracket arm with a stay
    // under it, and the mast is a lattice rather than a pole.
    b.at(x, 0, z, 0.14, 1, 1, 1);
    b.taper('toon', 0, 0, 0, s.w * 0.56, 0.24, s.d * 0.86, 0.08, shade(pal.deck, 1.3));
    b.box('chrome', 0, 0.24, 0, s.w * 0.4, 0.06, s.d * 0.6, shade(pal.chrome, 0.9));
    // lattice mast: four legs with collars
    const mh = s.h * 0.92;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      b.box('chrome', sx * 0.13, 0.3, sz * 0.13, 0.05, mh, 0.05, shade(pal.chrome, 0.85));
    }
    for (let i = 0; i < 9; i++) {
      const y = 0.3 + i * mh * 0.11;
      b.box('chrome', 0, y, 0, 0.32, 0.04, 0.32, shade(pal.chrome, 1.0));
      const d = i % 2 ? 1 : -1;
      b.quad('chrome', [-0.13 * d, y, 0.13], [-0.13 * d + 0.04, y, 0.13],
        [0.13 * d + 0.04, y + mh * 0.11, -0.13], [0.13 * d, y + mh * 0.11, -0.13],
        shade(pal.chrome, 0.7));
    }
    const boards = [
      [0.30, 0.62, -1], [0.52, 0.78, 1], [0.72, 0.66, -1], [0.88, 0.9, 1],
    ];
    for (const [t, wide, side] of boards) {
      const y = 0.3 + t * s.h * 0.72;
      const w = s.w * wide;
      const bx = side * w * 0.18;
      // bracket arm and its stay
      b.box('chrome', bx * 0.5, y + s.h * 0.075, 0, Math.abs(bx) + 0.2, 0.05, 0.09,
        shade(pal.chrome, 0.95));
      b.quad('chrome', [0, y, 0], [0.05, y, 0], [bx + 0.05, y + s.h * 0.06, 0], [bx, y + s.h * 0.06, 0],
        shade(pal.chrome, 0.7));
      // the board: a frame, a face and a lit panel set into it
      b.box('toon', bx, y, 0, w, s.h * 0.15, s.d * 0.34, shade(pal.facades[1], 1.5));
      b.box('toon', bx, y, 0, w * 1.03, s.h * 0.03, s.d * 0.38, shade(pal.facades[1], 1.0));
      b.box('toon', bx, y + s.h * 0.12, 0, w * 1.03, s.h * 0.03, s.d * 0.38, shade(pal.facades[1], 1.0));
      b.box('emissive', bx, y + s.h * 0.02, s.d * 0.18, w * 0.86, s.h * 0.09, 0.05,
        shade(side > 0 ? pal.accent : pal.accentGlow, 0.62));
      // three little characters on the face, so it is a sign and not a lamp
      for (let k = 0; k < 3; k++) {
        b.box('emissive', bx - w * 0.24 + k * w * 0.24, y + s.h * 0.04, s.d * 0.2,
          w * 0.1, s.h * 0.05, 0.03, shade(pal.lane, 0.9));
      }
      // a tube on top, on its own standoffs
      for (const sx of [-1, 1]) {
        b.box('chrome', bx + sx * w * 0.4, y + s.h * 0.15, 0, 0.04, 0.06, 0.04,
          shade(pal.chrome, 0.9));
      }
      b.cyl('emissive', bx, y + s.h * 0.19, 0, 0.04, 0.04, w * 0.9, 6, shade(pal.lane, 0.8));
    }
    b.dome('emissive', 0, s.h * 0.98, 0, 0.2, 0.24, 7, 3, shade(pal.accent, 0.7));
    b.pop();
  },

  /** Half-sunk hull, listing. */
  wreck(b, pal, x, z, s) {
    // Hull from the PALETTE, not a literal. #8a6a52 is a perfectly good brown
    // and the toon ramp took it to near black against a bright sea, which is
    // the fault that once put grey slabs in every pastel zone in the game: a
    // hardcoded colour cannot know how bright the zone it landed in is.
    const hull = shade(pal.deck, 0.92);
    // IT HAS TO LIST, AND IT HAS TO HAVE A MAST.
    //
    // The previous pass built a correct little boat and it did not read: on
    // The Shore everything is horizontal — the sea, the swell, the horizon —
    // and a low hull lying flat among all that is one more horizontal line.
    // Two changes fix it and neither is detail. It ROLLS, so its deck line
    // cuts across every other line in the frame; and it carries a mast with a
    // spar, because a vertical against a flat horizon is visible from as far
    // away as the fog allows.
    //
    // The roll is baked into the points rather than asked of the matrix stack,
    // which only turns around Y.
    const ROLL = 0.42;
    const ca = Math.cos(ROLL), sa = Math.sin(ROLL);
    const YAW = 0.22;
    const cy2 = Math.cos(YAW), sy2 = Math.sin(YAW);
    // local (across, up, along) -> world, rolled then yawed
    const P = (u, v, w) => {
      const ru = u * ca - v * sa, rv = u * sa + v * ca;
      return [x + ru * cy2 - w * sy2, rv, z + ru * sy2 + w * cy2];
    };
    const L = s.d * 1.9, W = s.w * 1.0, H = s.h * 0.5;
    // keel
    b.quad('toon', P(-0.08, 0, -L / 2), P(0.08, 0, -L / 2), P(0.08, 0.34, L / 2), P(-0.08, 0.34, L / 2),
      shade(hull, 0.62));
    // strakes: five bands a side, narrowing to the bow
    for (let i = 0; i < 5; i++) {
      const t0 = i / 5, t1 = (i + 1) / 5;
      for (const side of [-1, 1]) {
        const w0 = side * W * 0.5 * (0.45 + t0 * 0.55), w1 = side * W * 0.5 * (0.45 + t1 * 0.55);
        const b0 = side * W * 0.14 * (0.45 + t0 * 0.55), b1 = side * W * 0.14 * (0.45 + t1 * 0.55);
        b.quad('toon', P(w0, H * t0, -L / 2), P(w1, H * t1, -L / 2),
          P(b1, H * t1 * 0.9 + 0.3, L / 2), P(b0, H * t0 * 0.9 + 0.3, L / 2),
          shade(hull, 0.9 + i * 0.13 + (side < 0 ? 0.16 : 0)));
        b.quad('toon', P(w1 * 0.97, H * t1, -L / 2), P(w1, H * t1, -L / 2),
          P(b1, H * t1 * 0.9 + 0.3, L / 2), P(b1 * 0.97, H * t1 * 0.9 + 0.3, L / 2),
          shade(hull, 1.45));
      }
    }
    // frames showing where planking has gone, on the high side
    for (let i = -2; i <= 2; i++) {
      b.quad('toon', P(-W * 0.5, H * 0.5, i * L * 0.16), P(-W * 0.5, H * 0.5, i * L * 0.16 + 0.09),
        P(-W * 0.1, H * 0.95, i * L * 0.16 + 0.09), P(-W * 0.1, H * 0.95, i * L * 0.16),
        shade(hull, 1.5));
    }
    // deck, transom and a wheelhouse tipped with the roll
    b.quad('toon', P(-W * 0.44, H * 0.98, -L * 0.4), P(W * 0.44, H * 0.98, -L * 0.4),
      P(W * 0.14, H * 0.9, L * 0.42), P(-W * 0.14, H * 0.9, L * 0.42), shade(hull, 1.3));
    b.quad('toon', P(-W * 0.44, 0, -L / 2), P(W * 0.44, 0, -L / 2),
      P(W * 0.44, H, -L / 2), P(-W * 0.44, H, -L / 2), shade(hull, 1.1));
    for (const [du, dv] of [[-0.3, 0], [0.3, 0], [-0.3, 0.5], [0.3, 0.5]]) {
      b.quad('toon', P(W * du, H * (0.98 + dv * 0.5), -L * 0.1), P(W * (du + 0.25), H * (0.98 + dv * 0.5), -L * 0.1),
        P(W * (du + 0.25), H * (0.98 + dv * 0.5), L * 0.16), P(W * du, H * (0.98 + dv * 0.5), L * 0.16),
        shade(hull, 1.35));
    }
    b.quad('glass', P(-W * 0.28, H * 1.3, L * 0.16), P(W * 0.28, H * 1.3, L * 0.16),
      P(W * 0.28, H * 1.6, L * 0.16), P(-W * 0.28, H * 1.6, L * 0.16), shade(pal.edge, 1.1));
    // THE MAST. A raked spar with a crosstree, stays, and a lamp at the head:
    // the vertical is the whole reason the thing is visible at distance.
    const MH = s.h * 2.6;
    for (const d of [-0.06, 0.06]) {
      b.quad('toon', P(W * 0.06 + d, H * 1.0, -L * 0.06), P(W * 0.06 + d + 0.1, H * 1.0, -L * 0.06),
        P(W * 0.06 + d + 0.08, MH, -L * 0.2), P(W * 0.06 + d, MH, -L * 0.2), shade(hull, 1.2));
    }
    b.quad('toon', P(-W * 0.5, MH * 0.72, -L * 0.14), P(-W * 0.5, MH * 0.72, -L * 0.14 + 0.1),
      P(W * 0.6, MH * 0.72, -L * 0.14 + 0.1), P(W * 0.6, MH * 0.72, -L * 0.14), shade(hull, 1.4));
    for (const side of [-1, 1]) {
      b.quad('chrome', P(W * 0.08, MH * 0.96, -L * 0.19), P(W * 0.08 + 0.05, MH * 0.96, -L * 0.19),
        P(side * W * 0.5 + 0.05, H * 0.9, L * (side > 0 ? 0.36 : -0.4)),
        P(side * W * 0.5, H * 0.9, L * (side > 0 ? 0.36 : -0.4)), shade(pal.chrome, 0.75));
    }
    const head = P(W * 0.08, MH, -L * 0.2);
    b.dome('emissive', head[0], head[1], head[2], 0.26, 0.3, 8, 3, shade(pal.accentGlow, 1.4));
    // a torn sail still on the spar, and the lit nameboard on the transom
    b.quad('toon', P(W * 0.08, MH * 0.7, -L * 0.14), P(W * 0.52, MH * 0.68, -L * 0.16),
      P(W * 0.4, MH * 0.34, -L * 0.1), P(W * 0.1, MH * 0.4, -L * 0.08), shade(pal.kerb, 1.1));
    b.quad('emissive', P(-W * 0.3, H * 0.5, -L * 0.51), P(W * 0.3, H * 0.5, -L * 0.51),
      P(W * 0.3, H * 0.72, -L * 0.51), P(-W * 0.3, H * 0.72, -L * 0.51), shade(pal.accentGlow, 1.25));
    // Foam where it sits in the water, and a slick behind it. On land it gets
    // a wet apron instead, because a hull in a street is aground.
    if (s.sea) {
      for (let i = 0; i < 9; i++) {
        const a2 = i * 0.7;
        b.dome('toon', x + Math.cos(a2) * s.w * (0.5 + (i % 3) * 0.14), 0.02,
          z + Math.sin(a2) * s.d * (0.7 + (i % 3) * 0.2), 0.32 - (i % 3) * 0.06, 0.1, 7, 2,
          shade(pal.lane, 0.95));
      }
      b.dome('emissive', x, 0.03, z, s.w * 0.9, 0.05, 12, 2, shade(pal.lane, 0.34));
    } else {
      b.dome('toon', x, 0, z, s.w * 0.82, 0.11, 10, 2, shade(pal.lane, 0.75));
    }
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
    // CORRUGATION IS A PROFILE, NOT A SET OF STICKS.
    //
    // Laid flat it was a box with stripes, indistinguishable from every other
    // block at speed. On end it is tall and narrow with a clear top edge, and
    // the open doors break the outline on one side only. The ribs used to be
    // thin boxes glued to a flat wall; a shipping can's wall IS the
    // corrugation, so each face is now a folded sheet — alternating panels set
    // in and out — which is what gives it that hard vertical sparkle at speed.
    const W = s.w * 0.78, D = s.d * 0.82, H = s.h * 0.92;
    const N = 9;
    for (const sz of [-1, 1]) {
      for (let i = 0; i < N; i++) {
        const x0 = -W / 2 + (W / N) * i, x1 = x0 + W / N;
        const out = i % 2 === 0 ? D / 2 : D / 2 - 0.09;
        const out2 = i % 2 === 0 ? D / 2 - 0.09 : D / 2;
        b.quad('toon', [x0, 0, sz * out], [x1, 0, sz * out2], [x1, H, sz * out2], [x0, H, sz * out],
          shade(col, sz > 0 ? 1.2 + (i % 2) * 0.25 : 0.86 + (i % 2) * 0.2));
      }
    }
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const z0 = -D / 2 + (D / 5) * i, z1 = z0 + D / 5;
        const out = i % 2 === 0 ? W / 2 : W / 2 - 0.09;
        const out2 = i % 2 === 0 ? W / 2 - 0.09 : W / 2;
        b.quad('toon', [sx * out, 0, z0], [sx * out2, 0, z1], [sx * out2, H, z1], [sx * out, H, z0],
          shade(col, sx > 0 ? 1.05 : 0.78));
      }
    }
    b.box('toon', 0, H, 0, W, 0.1, D, shade(col, 1.45));
    // top and bottom rails, and the corner castings with their holes
    for (const y of [0, H - 0.16]) {
      b.box('toon', 0, y, 0, W + 0.06, 0.16, D + 0.06, shade(col, 0.92));
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (const y of [0, H * 0.96]) {
        b.box('chrome', sx * W * 0.47, y, sz * D * 0.47, 0.26, 0.22, 0.26, shade(pal.chrome, 0.92));
        b.box('toon', sx * W * 0.47, y + 0.06, sz * (D * 0.47 + 0.13), 0.13, 0.1, 0.04,
          shade(col, 0.5));
      }
    }
    // the doors: two leaves swung open, with locking bars and hinges
    for (const leaf of [0, 1]) {
      const sgn = leaf ? 1 : 0.55;
      b.quad('toon', [W * 0.38, 0.1, D * 0.5], [W * (0.38 + 0.48 * sgn), 0.1, D * (0.5 + 0.4 * sgn)],
        [W * (0.38 + 0.48 * sgn), H * (0.6 + 0.1 * leaf), D * (0.5 + 0.4 * sgn)],
        [W * 0.38, H * 0.72, D * 0.5], shade(col, leaf ? 0.8 : 0.62));
      for (let k = 0; k < 2; k++) {
        b.box('chrome', W * (0.5 + 0.2 * sgn), H * 0.36, D * (0.55 + 0.2 * sgn), 0.05, H * 0.6, 0.05,
          shade(pal.chrome, 1.0));
      }
    }
    // the dent in the top corner, and the lit placard
    b.tri('toon', [-W * 0.5, H, -D * 0.5], [-W * 0.5, H * 0.76, D * 0.5], [-W * 0.12, H, D * 0.5],
      shade(col, 1.6));
    b.box('emissive', 0, H * 0.5, D * 0.53, W * 0.42, 0.26, 0.05, shade(pal.accentGlow, 0.6));
    b.box('emissive', 0, H * 0.96, 0, W * 0.8, 0.08, D * 0.9, shade(pal.accent, 0.5));
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
    // A TRANSFORMER IS FINS, AND FINS ARE GAPS.
    //
    // Seven thin boxes stuck on the flanks of a bigger box read as stripes.
    // Real radiator banks stand OFF the tank on headers, with daylight between
    // every fin, and that gap is the whole silhouette: from another floor the
    // thing is a comb, and a comb is nameable where a striped box is not.
    b.taper('toon', x, 0, z, s.w * 1.0, 0.3, s.d * 1.35, 0.08, shade(pal.deck, 1.15));
    b.box('chrome', x, 0.3, z, s.w * 0.94, 0.1, s.d * 1.25, shade(pal.chrome, 0.7));
    const body = s.h * 0.46, y0 = 0.4;
    b.box('toon', x, y0, z, s.w * 0.5, body, s.d * 0.9, shade(tank, 1.12));
    // corrugation on the tank itself, so it is not a plain slab behind the fins
    for (let i = -2; i <= 2; i++) {
      b.box('toon', x + i * s.w * 0.09, y0 + 0.05, z + s.d * 0.45, 0.05, body * 0.9, 0.06,
        shade(tank, 1.34));
    }
    // radiator banks: headers top and bottom, free-standing fins between them
    for (const side of [-1, 1]) {
      const hx = x + side * s.w * 0.34;
      b.box('chrome', hx, y0 + 0.06, z, 0.16, 0.12, s.d * 0.86, shade(pal.chrome, 0.85));
      b.box('chrome', hx, y0 + body - 0.16, z, 0.16, 0.12, s.d * 0.86, shade(pal.chrome, 0.85));
      for (let i = 0; i < 6; i++) {
        const fz = z - s.d * 0.36 + i * s.d * 0.145;
        b.box('toon', hx, y0 + 0.16, fz, 0.3, body - 0.32, 0.07, shade(tank, 0.82 + (i % 2) * 0.3));
        b.box('chrome', hx + side * 0.15, y0 + 0.16, fz, 0.04, body - 0.32, 0.075,
          shade(pal.chrome, 0.6));
      }
    }
    // the lid, its gasket bolts, and the conservator drum lying across the back
    b.box('chrome', x, y0 + body, z, s.w * 0.58, 0.1, s.d * 0.96, shade(pal.chrome, 0.95));
    for (let i = -2; i <= 2; i++) {
      b.cyl('chrome', x + i * s.w * 0.11, y0 + body + 0.1, z + s.d * 0.4, 0.04, 0.04, 0.06, 6,
        shade(pal.chrome, 1.1));
    }
    b.cyl('toon', x - s.w * 0.3, y0 + body + 0.28, z, 0.2, 0.2, s.w * 0.6, 8, shade(tank, 0.9));
    // Bushings: stacked petticoats, wide at the bottom, and that stepped
    // profile is what says high voltage rather than "three little towers".
    for (let i = 0; i < 3; i++) {
      const ix = x + (i - 1) * s.w * 0.19;
      const ih = s.h * 0.3;
      const base = y0 + body + 0.1;
      b.cyl('chrome', ix, base, z, 0.13, 0.11, 0.1, 8, shade(pal.chrome, 1.0));
      for (let k = 0; k < 6; k++) {
        const t = k / 6;
        b.cyl('glass', ix, base + 0.1 + t * ih * 0.86, z, 0.17 - t * 0.05, 0.11 - t * 0.03,
          ih * 0.09, 8, shade(pal.edge, 1.15 - t * 0.1));
        b.cyl('glass', ix, base + 0.1 + t * ih * 0.86 + ih * 0.09, z, 0.1 - t * 0.02,
          0.1 - t * 0.02, ih * 0.06, 8, shade(pal.edge, 0.9));
      }
      b.cyl('chrome', ix, base + 0.1 + ih, z, 0.06, 0.05, 0.16, 6, shade(pal.chrome, 1.05));
      b.dome('emissive', ix, base + 0.28 + ih, z, 0.09, 0.09, 6, 2, shade(pal.accent, 1.2));
      // the line it used to carry, snapped and hanging
      if (i !== 1) {
        b.box('chrome', ix, base + 0.2 + ih, z + (i - 1) * 0.3, 0.05, 0.05, s.d * 0.5,
          shade(pal.chrome, 0.7));
      }
    }
    // cage: uprights, a rail, and the panel bent open where something got in
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        b.box('chrome', x + side * s.w * 0.52, 0.3, z - s.d * 0.5 + i * s.d * 0.25, 0.05,
          s.h * 0.58, 0.05, shade(pal.chrome, 0.6));
      }
    }
    b.box('chrome', x, 0.3 + s.h * 0.58, z, s.w * 1.06, 0.05, s.d * 1.06, shade(pal.chrome, 0.66));
    b.quad('chrome', [x + s.w * 0.52, 0.3, z + s.d * 0.5], [x + s.w * 0.9, 0.3, z + s.d * 0.95],
      [x + s.w * 0.9, 0.3 + s.h * 0.46, z + s.d * 0.95], [x + s.w * 0.52, 0.3 + s.h * 0.56, z + s.d * 0.5],
      shade(pal.chrome, 0.5));
    // hazard plate and the arc it is still throwing between two bushings
    b.box('emissive', x, y0 + body * 0.4, z + s.d * 0.5, s.w * 0.26, 0.24, 0.05,
      shade(pal.accentGlow, 0.95));
    for (const [dx, dy] of [[-0.1, 0.06], [0.04, 0.14], [-0.02, 0.22]]) {
      b.box('emissive', x + s.w * dx, y0 + body + s.h * (0.34 + dy), z, 0.04, 0.12, 0.04,
        shade(pal.lane, 1.35));
    }
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
    // A CLAW MACHINE IS A GLASS BOX ON A CABINET, AND THE GLASS IS THE POINT.
    //
    // The first pass put a solid glass block on a plinth and dropped a few
    // domes inside. A real one has a deep base with a prize chute, a frame of
    // slim posts with the panes SET INSIDE them, and a gantry the claw rides
    // on. The read at speed is the lit heap behind glass, so everything else
    // is built to stay out of its way.
    b.taper('toon', 0, 0, 0, s.w * 0.9, s.h * 0.26, s.d * 1.25, 0.06, shade(frame, 1.0));
    b.box('toon', 0, s.h * 0.26, 0, s.w * 0.84, s.h * 0.06, s.d * 1.2, shade(frame, 1.3));
    // the chute and its flap, on the face she passes
    b.box('toon', 0, s.h * 0.06, s.d * 0.62, s.w * 0.36, s.h * 0.16, 0.08, shade(frame, 0.7));
    b.box('emissive', 0, s.h * 0.1, s.d * 0.66, s.w * 0.3, s.h * 0.08, 0.04, shade(pal.accent, 0.85));
    b.box('chrome', -s.w * 0.26, s.h * 0.14, s.d * 0.64, 0.12, 0.2, 0.06, shade(pal.chrome, 1.0));
    const cy = s.h * 0.32, ch = s.h * 0.5, cw = s.w * 0.76, cd = s.d * 1.04;
    // posts at the corners, and slim mullions between them
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.box('chrome', sx * cw * 0.5, cy, sz * cd * 0.5, 0.1, ch, 0.1, shade(pal.chrome, 1.0));
    }
    for (const sz of [-1, 1]) {
      b.box('chrome', 0, cy, sz * cd * 0.5, 0.05, ch, 0.06, shade(pal.chrome, 0.8));
    }
    b.box('chrome', 0, cy, 0, cw + 0.06, 0.07, cd + 0.06, shade(pal.chrome, 0.9));
    b.box('chrome', 0, cy + ch, 0, cw + 0.06, 0.07, cd + 0.06, shade(pal.chrome, 0.9));
    // the panes, set inside the frame so the posts read in front of them
    b.box('glass', 0, cy + 0.05, 0, cw - 0.08, ch - 0.1, cd - 0.08, shade(pal.edge, 1.05));
    // The heap: a mound rather than a ring, biggest at the bottom, with a few
    // shapes that are not spheres so it does not read as a bag of marbles.
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4;
      const rr = cw * 0.3 * (1 - i / 16);
      const py = cy + 0.1 + (i % 4) * 0.11;
      const c = shade(i % 3 === 0 ? pal.accent : i % 3 === 1 ? pal.accentGlow : pal.lane, 0.72);
      if (i % 4 === 3) b.box('emissive', Math.cos(a) * rr, py, Math.sin(a) * rr * 0.8, 0.24, 0.2, 0.24, c);
      else b.dome('emissive', Math.cos(a) * rr, py, Math.sin(a) * rr * 0.8, 0.18, 0.16, 7, 2, c);
    }
    // The gantry: two rails, a carriage, and the claw hanging open on its cord.
    b.box('chrome', 0, cy + ch - 0.14, -cd * 0.3, cw * 0.9, 0.06, 0.07, shade(pal.chrome, 1.05));
    b.box('chrome', 0, cy + ch - 0.14, cd * 0.3, cw * 0.9, 0.06, 0.07, shade(pal.chrome, 1.05));
    const clx = s.w * 0.1;
    b.box('chrome', clx, cy + ch - 0.2, 0, 0.2, 0.1, cd * 0.7, shade(pal.chrome, 1.15));
    b.box('chrome', clx, cy + ch * 0.62, 0, 0.04, ch * 0.36, 0.04, shade(pal.chrome, 0.85));
    b.cyl('chrome', clx, cy + ch * 0.6, 0, 0.11, 0.09, 0.1, 8, shade(pal.chrome, 1.1));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      b.box('chrome', clx + Math.cos(a) * 0.11, cy + ch * 0.5, Math.sin(a) * 0.11,
        0.05, 0.2, 0.05, shade(pal.chrome, 1.2));
      b.box('chrome', clx + Math.cos(a) * 0.16, cy + ch * 0.42, Math.sin(a) * 0.16,
        0.05, 0.1, 0.05, shade(pal.chrome, 1.0));
    }
    // crown, marquee and the beacon
    b.box('toon', 0, cy + ch + 0.07, 0, cw * 1.12, s.h * 0.13, cd * 1.12, shade(frame, 1.3));
    b.taper('toon', 0, cy + ch + 0.07 + s.h * 0.13, 0, cw * 1.06, s.h * 0.05, cd * 1.06, 0.14,
      shade(frame, 1.55));
    b.box('emissive', 0, cy + ch + s.h * 0.11, cd * 0.57, cw * 0.78, s.h * 0.08, 0.05,
      shade(pal.lane, 0.9));
    b.dome('emissive', 0, cy + ch + s.h * 0.2, 0, 0.2, 0.24, 8, 3, shade(pal.accent, 1.15));
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
    const legs = s.h * 0.44;
    // A PYLON IS A LATTICE, AND A LATTICE IS READ FROM ITS HOLES.
    //
    // Two flat quads per leg gave a pair of tapered planks. This is four
    // chords drawn as crossed webs, with a collar and a diagonal in every bay,
    // so the tower is mostly gaps — which is also what keeps it legible
    // against a sky the same value as the steel.
    const BAYS = 5;
    const legAt = (sx, sz, t) => [
      x + sx * s.w * (0.42 - t * 0.3),
      t * legs,
      z + sz * (0.34 - t * 0.22),
    ];
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      for (let i = 0; i < BAYS; i++) {
        const p0 = legAt(sx, sz, i / BAYS), p1 = legAt(sx, sz, (i + 1) / BAYS);
        b.quad('chrome', [p0[0] - 0.07, p0[1], p0[2]], [p0[0] + 0.07, p0[1], p0[2]],
          [p1[0] + 0.07, p1[1], p1[2]], [p1[0] - 0.07, p1[1], p1[2]], shade(steel, 0.8 + i * 0.07));
        b.quad('chrome', [p0[0], p0[1], p0[2] - 0.07], [p0[0], p0[1], p0[2] + 0.07],
          [p1[0], p1[1], p1[2] + 0.07], [p1[0], p1[1], p1[2] - 0.07], shade(steel, 0.6 + i * 0.06));
      }
      const foot = legAt(sx, sz, 0);
      b.box('toon', foot[0], 0, foot[2], 0.5, 0.18, 0.5, shade(pal.deck, 1.2));
    }
    for (let i = 0; i <= BAYS; i++) {
      const c = legAt(1, 1, i / BAYS);
      const w = (c[0] - x) * 2, d = (c[2] - z) * 2;
      b.box('chrome', x, c[1], z, w + 0.12, 0.07, 0.09, shade(pal.chrome, 1.0));
      b.box('chrome', x, c[1], z, 0.09, 0.07, d + 0.12, shade(pal.chrome, 0.82));
      if (i < BAYS) {
        const c1 = legAt(1, 1, (i + 1) / BAYS);
        const dir = i % 2 ? 1 : -1;
        b.quad('chrome', [x - dir * (w / 2), c[1], z + d / 2],
          [x - dir * (w / 2) + 0.09, c[1], z + d / 2],
          [x + dir * (c1[0] - x) + 0.09, c1[1], z + (c1[2] - z)],
          [x + dir * (c1[0] - x), c1[1], z + (c1[2] - z)], shade(steel, 0.66));
      }
    }
    // the head: crossbeam, a tapering mast, and the saddles the stays sit in
    b.box('chrome', x, legs, z, s.w * 0.34, 0.22, 0.42, shade(pal.chrome, 1.05));
    for (let i = 0; i < 4; i++) {
      b.box('chrome', x, legs + 0.22 + i * s.h * 0.09, z, s.w * (0.2 - i * 0.02), 0.06, 0.3,
        shade(pal.chrome, 0.95));
      b.box('chrome', x, legs + 0.28 + i * s.h * 0.09, z, 0.08, s.h * 0.08, 0.08, steel);
    }
    const headY = legs + 0.22 + s.h * 0.38;
    b.taper('toon', x, headY, z, s.w * 0.2, s.h * 0.1, 0.34, 0.06, shade(pal.deck, 1.35));
    // The fan: six stays, each a pair of webs so it is a bar and not a ribbon.
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      const step = Math.floor(i / 2);
      const ex = x + side * s.w * (0.5 + step * 0.4);
      const ey = headY - s.h * (0.3 + step * 0.1);
      for (const dz of [-0.05, 0.05]) {
        b.quad('chrome', [x, headY, z + dz], [x, headY - 0.1, z + dz],
          [ex, ey - 0.1, z + dz], [ex, ey, z + dz], shade(pal.chrome, dz < 0 ? 0.9 : 0.62));
      }
      b.cyl('chrome', x + side * 0.14, headY - 0.06, z, 0.06, 0.05, 0.12, 6, shade(pal.chrome, 1.15));
    }
    b.dome('emissive', x, headY + s.h * 0.1, z, 0.15, 0.17, 7, 3, shade(pal.accent, 1.25));
    b.box('emissive', x, legs + 0.1, z, s.w * 0.36, 0.07, 0.44, shade(pal.accentGlow, 0.75));
    b.cyl('emissive', x, 0.03, z, s.w * 0.6, s.w * 0.54, 0.05, 16, shade(pal.accentGlow, 0.45));
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
    const stalkH = s.h * 0.4;
    // THE ONLY SPHERE IN THE GAME, so the sphere has to be a sphere.
    //
    // Two domes back to back gave a bulge with a seam across its middle. This
    // is a proper globe of stacked rings, with a chrome equator band that
    // hides the joint and gives the glass something to reflect, plus a cast
    // base with mouldings — the object is a piece of street furniture, not a
    // ball on a stick.
    b.taper('toon', x, 0, z, s.w * 0.62, 0.22, s.d * 0.95, 0.1, shade(pal.deck, 1.15));
    b.taper('toon', x, 0.22, z, s.w * 0.46, 0.14, s.d * 0.72, 0.06, shade(pal.deck, 1.35));
    b.cyl('chrome', x, 0.36, z, s.w * 0.19, s.w * 0.14, stalkH, 12, shade(pal.chrome, 0.95));
    for (let i = 0; i < 3; i++) {
      b.cyl('chrome', x, 0.42 + i * stalkH * 0.3, z, s.w * 0.2 - i * 0.01, s.w * 0.19 - i * 0.01,
        0.06, 12, shade(pal.chrome, 1.15));
    }
    b.cyl('chrome', x, 0.36 + stalkH, z, s.w * 0.28, s.w * 0.26, 0.14, 12, shade(pal.chrome, 1.05));
    // The globe: rings of latitude, so it is round from every angle.
    const gy = 0.36 + stalkH + 0.14 + r;
    const LAT = 7, LON = 14;
    for (let i = 0; i < LAT; i++) {
      const t0 = (i / LAT) * Math.PI, t1 = ((i + 1) / LAT) * Math.PI;
      const r0 = Math.sin(t0) * r, r1 = Math.sin(t1) * r;
      const y0 = gy - Math.cos(t0) * r, y1 = gy - Math.cos(t1) * r;
      for (let k = 0; k < LON; k++) {
        const a0 = (k / LON) * Math.PI * 2, a1 = ((k + 1) / LON) * Math.PI * 2;
        b.quad('glass',
          [x + Math.cos(a0) * r0, y0, z + Math.sin(a0) * r0],
          [x + Math.cos(a1) * r0, y0, z + Math.sin(a1) * r0],
          [x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1],
          [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1],
          shade(pal.edge, 1.0 + Math.sin(t0) * 0.24));
      }
    }
    b.cyl('chrome', x, gy - 0.06, z, r * 1.02, r * 1.02, 0.12, LON, shade(pal.chrome, 1.1));
    // the capsules inside, heaped rather than ringed, and a few different sizes
    for (let i = 0; i < 13; i++) {
      const a = i * 2.4;
      const rr = r * 0.56 * (1 - i / 22);
      const cy2 = gy - r * 0.5 + (i % 5) * r * 0.24;
      const sz = r * (0.16 + (i % 3) * 0.05);
      b.dome('emissive', x + Math.cos(a) * rr, cy2, z + Math.sin(a) * rr, sz, sz * 0.9, 7, 2,
        shade(i % 3 === 0 ? pal.accent : i % 3 === 1 ? pal.accentGlow : pal.lane, 0.7));
    }
    // the crown, cracked open, with the lid tipped off one side
    b.cyl('chrome', x, gy + r * 0.86, z, r * 0.44, r * 0.3, 0.16, 12, shade(pal.chrome, 1.0));
    b.taper('toon', x - r * 0.1, gy + r * 1.02, z + r * 0.06, r * 0.5, r * 0.2, r * 0.5, r * 0.16,
      shade(pal.chrome, 0.85));
    b.tri('toon', [x + r * 0.3, gy + r * 1.0, z], [x + r * 0.62, gy + r * 0.78, z - r * 0.2],
      [x + r * 0.26, gy + r * 0.7, z], shade(pal.chrome, 0.7));
    // coin mech, chute and the handle you turn
    b.box('chrome', x, gy - r * 1.0, z + r * 0.78, s.w * 0.22, 0.26, 0.1, shade(pal.chrome, 0.9));
    b.cyl('chrome', x + s.w * 0.11, gy - r * 0.98, z + r * 0.8, 0.07, 0.07, 0.12, 8,
      shade(pal.chrome, 1.15));
    b.box('emissive', x, gy - r * 0.92, z + r * 0.84, s.w * 0.14, 0.06, 0.04, shade(pal.accent, 0.95));
    b.box('toon', x, 0.36 + stalkH * 0.4, z + s.w * 0.2, s.w * 0.2, 0.16, 0.08, shade(pal.deck, 1.4));
    // capsules that got out
    for (const [dx, dz, sz] of [[-0.62, 0.5, 0.16], [0.7, -0.3, 0.13], [0.4, 0.66, 0.1], [-0.3, 0.8, 0.12]]) {
      b.dome('emissive', x + dx, 0.02, z + dz, sz, sz * 0.85, 7, 2, shade(pal.accentGlow, 0.8));
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
    // THE ONLY BUILDING IN THE GAME, so it is built like one.
    //
    // A box with a window band on it is a box. A cabin reads from its parts: a
    // plinth it stands on, a plinth course above that, corner posts, a window
    // with a sill and a head, a door in a frame, a roof with an overhang and a
    // fascia, and a parapet. All of them are here, and all of them are shallow
    // — the depth of each is what casts the small shadows that say "made of
    // pieces" instead of "one shape".
    b.taper('toon', 0, 0, 0, s.w * 0.96, 0.26, s.d * 1.55, 0.05, shade(pal.deck, 1.15));
    b.box('toon', 0, 0.26, 0, s.w * 0.86, 0.1, s.d * 1.42, shade(pal.deck, 1.4));
    const w = s.w * 0.7, h = s.h * 0.62, d = s.d * 1.25, y0 = 0.36;
    b.box('toon', 0, y0, 0, w, h, d, shade(wall, 1.12));
    // plinth course and a string course, both proud of the wall
    b.box('toon', 0, y0, 0, w * 1.05, h * 0.1, d * 1.04, shade(wall, 0.8));
    b.box('toon', 0, y0 + h * 0.74, 0, w * 1.04, h * 0.05, d * 1.03, shade(wall, 1.35));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.box('chrome', sx * w * 0.49, y0, sz * d * 0.49, 0.12, h, 0.12, shade(pal.chrome, 0.88));
      b.box('chrome', sx * w * 0.49, y0 + h * 0.5, sz * d * 0.49, 0.16, 0.06, 0.16,
        shade(pal.chrome, 1.1));
    }
    // The window: reveal, sill, head and a mullion, with the light behind it.
    const gy = y0 + h * 0.46, gh = h * 0.3, gw = w * 0.8;
    b.box('toon', 0, gy - 0.06, d * 0.47, gw + 0.12, gh + 0.14, 0.07, shade(wall, 0.72));
    b.box('glass', 0, gy, d * 0.5, gw, gh, 0.05, shade(pal.edge, 1.1));
    b.box('emissive', 0, gy + 0.02, d * 0.47, gw * 0.9, gh * 0.8, 0.04, shade(pal.accent, 0.75));
    b.box('chrome', 0, gy, d * 0.52, 0.05, gh, 0.04, shade(pal.chrome, 1.0));
    b.box('chrome', 0, gy - 0.1, d * 0.52, gw + 0.2, 0.08, 0.14, shade(pal.chrome, 0.95));
    b.box('toon', 0, gy + gh, d * 0.5, gw + 0.16, 0.07, 0.12, shade(wall, 1.5));
    // the door, in its frame, hanging open on the side she passes
    b.box('toon', -w * 0.5, y0 + 0.06, -d * 0.16, 0.06, h * 0.7, d * 0.46, shade(wall, 0.7));
    b.box('chrome', -w * 0.52, y0 + h * 0.76, -d * 0.16, 0.05, 0.06, d * 0.5, shade(pal.chrome, 0.9));
    b.quad('toon', [-w * 0.5, y0 + 0.06, -d * 0.38], [-w * 0.88, y0 + 0.06, -d * 0.62],
      [-w * 0.88, y0 + h * 0.72, -d * 0.62], [-w * 0.5, y0 + h * 0.72, -d * 0.38], shade(wall, 0.6));
    b.cyl('chrome', -w * 0.82, y0 + h * 0.38, -d * 0.56, 0.04, 0.04, 0.16, 6, shade(pal.chrome, 1.1));
    // roof: overhang, fascia, parapet, then the plant on top
    b.box('toon', 0, y0 + h, 0, w * 1.2, s.h * 0.06, d * 1.2, shade(pal.deck, 1.5));
    b.box('toon', 0, y0 + h - 0.05, 0, w * 1.24, 0.06, d * 1.24, shade(pal.deck, 1.1));
    for (const sx of [-1, 1]) {
      b.box('toon', sx * w * 0.58, y0 + h + s.h * 0.06, 0, 0.08, s.h * 0.07, d * 1.14,
        shade(pal.deck, 1.35));
    }
    b.box('chrome', 0, y0 + h + s.h * 0.06, 0, w * 0.86, 0.05, d * 0.86, shade(pal.chrome, 0.9));
    b.cyl('chrome', w * 0.3, y0 + h + s.h * 0.08, d * 0.2, 0.05, 0.03, s.h * 0.22, 6,
      shade(pal.chrome, 0.85));
    b.box('toon', -w * 0.24, y0 + h + s.h * 0.07, -d * 0.2, w * 0.3, s.h * 0.08, d * 0.4,
      shade(pal.deck, 1.2));
    b.cyl('toon', 0, y0 + h + s.h * 0.09, 0, 0.18, 0.16, s.h * 0.09, 10, shade(pal.deck, 0.95));
    b.dome('emissive', 0, y0 + h + s.h * 0.19, 0, 0.17, 0.2, 8, 3, shade(pal.accentGlow, 1.35));
    b.pop();
  },

  /** Overgrown trunk with a canopy that hides the top. */
  tree(b, pal, x, z, s) {
    const bark = shade(pal.deck, 0.62);
    // A TREE IS A TRUNK THAT DIVIDES, AND FOLIAGE THAT CLUMPS.
    //
    // A cylinder with three domes on it is a lollipop. What reads as a tree is
    // the taper of the bole, the fork where it splits, limbs going out to meet
    // the canopy, and foliage in separate masses with sky between them. Every
    // one of those is cheap; none of them was there.
    const boleH = s.h * 0.48;
    const R = s.w * 0.3;
    // buttressed root flare, then the bole in three tapering sections
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.taper('toon', x + Math.cos(a) * R * 0.7, 0, z + Math.sin(a) * R * 0.6,
        R * 0.7, s.h * 0.09, R * 0.6, R * 0.3, shade(bark, 0.85 + (i % 3) * 0.1));
    }
    b.cyl('toon', x, 0, z, R * 1.1, R * 0.86, boleH * 0.5, 9, shade(bark, 1.0));
    b.cyl('toon', x + 0.06, boleH * 0.5, z, R * 0.86, R * 0.72, boleH * 0.5, 9, shade(bark, 1.12));
    // the fork: two limbs leaving the bole, built as quads so they can lean
    const limbs = [[-1, 0.4], [1, -0.3], [0.2, 1]];
    for (const [lx, lz] of limbs) {
      b.quad('toon', [x - 0.1, boleH, z], [x + 0.1, boleH, z],
        [x + lx * s.w * 0.32 + 0.08, boleH + s.h * 0.26, z + lz * s.w * 0.24],
        [x + lx * s.w * 0.32 - 0.08, boleH + s.h * 0.26, z + lz * s.w * 0.24],
        shade(bark, 1.05));
      b.quad('toon', [x, boleH, z - 0.1], [x, boleH, z + 0.1],
        [x + lx * s.w * 0.32, boleH + s.h * 0.26, z + lz * s.w * 0.24 + 0.08],
        [x + lx * s.w * 0.32, boleH + s.h * 0.26, z + lz * s.w * 0.24 - 0.08],
        shade(bark, 0.8));
    }
    // canopy: five masses, each built from two overlapping domes so the
    // outline is lumpy rather than spherical
    const clumps = [[-0.34, 0.62, 0.5, 0.86], [0.36, 0.7, -0.3, 0.78], [0.0, 0.86, 0.2, 0.9],
      [-0.2, 0.9, -0.4, 0.64], [0.28, 0.96, 0.34, 0.56]];
    clumps.forEach(([dx, t, dz, sc], i) => {
      const cx = x + dx * s.w, cy = s.h * t, cz = z + dz * s.w * 0.5;
      b.dome('toon', cx, cy, cz, s.w * 0.4 * sc, s.w * 0.34 * sc, 9, 3,
        shade(pal.edge, 0.72 + i * 0.09));
      b.dome('toon', cx + s.w * 0.1 * sc, cy + s.w * 0.06 * sc, cz - s.w * 0.08 * sc,
        s.w * 0.28 * sc, s.w * 0.24 * sc, 8, 3, shade(pal.edge, 0.86 + i * 0.08));
      b.dome('toon', cx - s.w * 0.12 * sc, cy - s.w * 0.02 * sc, cz + s.w * 0.06 * sc,
        s.w * 0.22 * sc, s.w * 0.18 * sc, 7, 2, shade(pal.edge, 0.62 + i * 0.07));
    });
    // fruit, and a couple of leaves on the road under it
    for (const [dx, t, dz] of [[0.0, 0.98, 0.0], [-0.3, 0.86, 0.3], [0.34, 0.9, -0.2]]) {
      b.dome('emissive', x + dx * s.w, s.h * t, z + dz * s.w, 0.2, 0.22, 7, 2,
        shade(pal.accentGlow, 1.15));
    }
    for (const [dx, dz] of [[-0.8, 0.6], [0.7, 0.5], [0.3, 0.9]]) {
      b.box('toon', x + dx, 0.02, z + dz, 0.26, 0.03, 0.18, shade(pal.edge, 0.7));
    }
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
    // A PRESS IS READ FROM THE GAP, AND FROM THE PLUMBING ROUND IT.
    //
    // The old one was three boxes and a cylinder in a vertical line, the same
    // silhouette as a pillar with a bulge. A press is read from the gap
    // between the ram and the bed — so the gap is built, and lit, even though
    // nothing passes through it. What it still lacked was everything that
    // makes a machine a machine: guide columns with real collars, hydraulic
    // hoses looping off the crown, a control box on a stalk, and a bolster
    // with slots cut in it.
    // bed and bolster
    b.taper('toon', x, 0, z, s.w * 1.05, s.h * 0.16, s.d * 1.3, 0.1, shade(pal.road, 2.2));
    b.box('chrome', x, s.h * 0.16, z, s.w * 0.86, 0.1, s.d * 1.05, shade(pal.chrome, 0.8));
    for (let i = -2; i <= 2; i++) {
      b.box('toon', x + i * s.w * 0.17, s.h * 0.2, z, 0.09, 0.04, s.d * 0.9, shade(pal.road, 1.4));
    }
    // guide columns, outside the ram so the gap reads, with collars and wipers
    for (const side of [-1, 1]) {
      const cx = x + side * s.w * 0.46;
      b.cyl('chrome', cx, s.h * 0.2, z, 0.15, 0.13, s.h * 0.72, 9, shade(pal.chrome, 0.9));
      for (const t of [0.3, 0.62]) {
        b.cyl('chrome', cx, s.h * (0.2 + 0.72 * t), z, 0.19, 0.19, 0.1, 9, shade(pal.chrome, 1.15));
      }
      b.box('chrome', cx, s.h * 0.5, z, 0.3, 0.1, 0.3, shade(pal.chrome, 1.05));
      b.box('toon', cx, s.h * 0.16, z, 0.36, 0.08, 0.36, shade(pal.deck, 1.2));
    }
    // crown, and the ram slung under it on a ram head
    b.box('toon', x, s.h * 0.86, z, s.w * 1.15, s.h * 0.16, s.d * 1.15, shade(pal.road, 2.8));
    b.box('chrome', x, s.h * 0.86 + s.h * 0.16, z, s.w * 0.9, 0.08, s.d * 0.9, shade(pal.chrome, 0.9));
    b.cyl('chrome', x, s.h * 0.7, z, 0.26, 0.22, s.h * 0.16, 10, shade(pal.chrome, 1.0));
    b.taper('toon', x, s.h * 0.56, z, s.w * 0.62, s.h * 0.16, s.d * 0.7, -0.08, shade(pal.deck, 1.8));
    b.box('chrome', x, s.h * 0.5, z, s.w * 0.68, 0.1, s.d * 0.76, shade(pal.chrome, 1.0));
    // hydraulic hoses looping from the crown down to a manifold
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const t = k / 4;
        const yy = s.h * (0.86 - t * 0.4);
        b.box('toon', x + side * s.w * (0.5 + Math.sin(t * 3) * 0.1), yy, z - s.d * 0.5,
          0.08, s.h * 0.12, 0.08, shade(pal.deck, 0.85));
      }
      b.box('toon', x + side * s.w * 0.5, s.h * 0.44, z - s.d * 0.5, 0.24, 0.16, 0.2,
        shade(pal.deck, 1.3));
    }
    // control box on a stalk, with a lit panel
    b.box('chrome', x + s.w * 0.6, s.h * 0.2, z + s.d * 0.4, 0.07, s.h * 0.3, 0.07,
      shade(pal.chrome, 0.85));
    b.box('toon', x + s.w * 0.6, s.h * 0.5, z + s.d * 0.4, 0.3, s.h * 0.16, 0.2,
      shade(pal.deck, 1.35));
    b.box('emissive', x + s.w * 0.6, s.h * 0.54, z + s.d * 0.5, 0.24, s.h * 0.08, 0.04,
      shade(pal.lane, 0.9));
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
  const zNose = z + half;
  // THE WALL THAT MAKES A FORK A DECISION.
  //
  // Every other obstacle is a thing you get past. This is a thing you have
  // to be on one side of, and it is the only obstacle whose length is
  // authored per instance: `s.d` is the whole island.
  //
  // The nose is a low wedge and the wall rises behind it. Full height from
  // the first metre would hide the branch you are not in at exactly the
  // moment you are choosing between them; this way you see both roads over
  // the nose, and by the time the wall is tall the choice is already made.
  // That is the shape of the decision, built.
  //
  // What it lacked was construction: a concrete barrier is cast in sections
  // with a splayed foot and a visible joint every few metres, and without
  // those it was a long grey box.
  b.tri('toon', [x, 0.02, zNose], [x - w / 2, s.h * 0.3, zNose - nose],
    [x + w / 2, s.h * 0.3, zNose - nose], shade(pal.kerb, 0.9));
  for (const side of [-1, 1]) {
    b.quad('toon', [x, 0.02, zNose], [x + side * w / 2, s.h * 0.3, zNose - nose],
      [x + side * w / 2, 0.02, zNose - nose], [x, 0.02, zNose], shade(pal.kerb, 0.7));
  }
  // the wall, in cast sections with a splayed foot and a joint between each
  const runZ = zNose - nose;
  const segs = Math.max(2, Math.round((s.d - nose) / 4));
  for (let i = 0; i < segs; i++) {
    const len = (s.d - nose) / segs;
    const cz = runZ - len * (i + 0.5);
    b.taper('toon', x, 0, cz, w * 1.18, s.h * 0.22, len * 0.98, w * 0.14, shade(pal.deck, 1.25));
    b.box('toon', x, s.h * 0.22, cz, w, s.h * 0.36, len * 0.98, shade(pal.deck, 1.12));
    b.box('toon', x, s.h * 0.58, cz, w * 0.84, s.h * 0.42, len * 0.98, shade(pal.deck, 0.94));
    // the joint: a shadow gap between sections
    b.box('toon', x, s.h * 0.1, cz - len * 0.49, w * 1.02, s.h * 0.85, 0.05, shade(pal.deck, 0.62));
    // coping and its drip
    b.box('chrome', x, s.h * 0.99, cz, w * 0.92, 0.07, len * 0.98, shade(pal.chrome, 0.95));
    b.box('toon', x, s.h * 0.94, cz, w * 0.96, 0.05, len * 0.98, shade(pal.deck, 0.72));
  }
  // The nose light is the whole reading: the first thing on the road that
  // says the road is about to stop being one road.
  b.box('emissive', x, s.h * 0.3, zNose - nose, w * 0.9, 0.22, 0.12, shade(pal.accentGlow, 1.3));
  b.cyl('emissive', x, 0.03, zNose + 0.4, 0.5, 0.42, 0.05, 12, shade(pal.accent, 0.7));
  b.taper('chrome', x, s.h * 0.3, zNose - nose, w * 0.4, s.h * 0.3, 0.4, w * 0.16,
    shade(pal.chrome, 1.0));
  // Chevrons down both faces, in reflector housings, pointing at the branch
  // on that side.
  for (let i = 0; i < Math.floor((s.d - nose) / 3.2); i++) {
    const cz = zNose - nose - 1.6 - i * 3.2;
    for (const side of [-1, 1]) {
      b.box('toon', x + side * (w / 2 + 0.01), s.h * 0.34, cz, 0.06, 0.6, 1.0,
        shade(pal.deck, 0.7));
      b.box('emissive', x + side * (w / 2 + 0.04), s.h * 0.34, cz, 0.05, 0.5, 0.9,
        shade(side < 0 ? pal.accent : pal.edge, 0.62));
    }
  }
}

// ---------- hedge: spans everything, only a bloom pad clears it ------------

function hedge(b, pal, x, z, s) {
  const dark = new THREE.Color('#2f5a34');
  // A HEDGE IS A MASS OF FOLIAGE ON A THICKET OF STEMS.
  //
  // A box with five domes on top is a sofa. What reads as hedge is a body
  // built from overlapping clumps with no straight edge anywhere, stems
  // showing in the gaps at the bottom, and thorns catching the light along
  // the top. It spans every lane and is taller than a jump apex, so there is
  // no way over it except off a bloom pad — which is the entire point, and
  // the reason it has to look impenetrable rather than merely tall.
  // the woody base and the stems in it
  b.box('toon', x, 0, z, s.w, s.h * 0.2, s.d * 0.8, shade(dark, 0.72));
  for (let i = 0; i < 12; i++) {
    const sx = x - s.w * 0.46 + i * s.w * 0.084;
    b.box('toon', sx, 0.05, z + ((i % 3) - 1) * s.d * 0.2, 0.07, s.h * 0.4, 0.07,
      shade(dark, 0.9 + (i % 3) * 0.14));
  }
  // the body: three rows of clumps, offset, so nothing lines up
  for (let row = 0; row < 3; row++) {
    const n = 6 - row;
    for (let i = 0; i < n; i++) {
      const cx = x - s.w * 0.42 + (i + (row % 2) * 0.5) * (s.w * 0.84 / (n - 1 + 0.5));
      const cy = s.h * (0.22 + row * 0.23);
      const cz = z + ((i + row) % 3 - 1) * s.d * 0.24;
      const r = s.w * (0.3 - row * 0.03) * (0.85 + ((i * 7) % 5) / 12);
      b.dome('toon', cx, cy, cz, r, s.h * (0.3 - row * 0.04), 8, 3,
        shade(pal.edge, 0.5 + row * 0.16 + ((i % 3) * 0.1)));
      b.dome('toon', cx + r * 0.3, cy + s.h * 0.06, cz - r * 0.25, r * 0.6,
        s.h * (0.2 - row * 0.03), 7, 2, shade(pal.edge, 0.62 + row * 0.16));
    }
  }
  // the crown: a broken line of tips, never a flat top
  for (let i = 0; i < 8; i++) {
    const cx = x - s.w * 0.4 + i * s.w * 0.114;
    b.dome('toon', cx, s.h * (0.78 + ((i * 5) % 4) * 0.04), z + ((i % 2) - 0.5) * s.d * 0.3,
      s.w * 0.16, s.h * 0.18, 7, 2, shade(pal.edge, 0.9 + (i % 3) * 0.12));
  }
  // thorn tips, so it never reads as something soft you could push through
  for (let i = 0; i < 9; i++) {
    const tx = x - s.w * 0.42 + i * s.w * 0.105;
    b.cyl('toon', tx, s.h * (0.82 + (i % 3) * 0.05), z + ((i % 3) - 1) * s.d * 0.2,
      0.07, 0.005, s.h * 0.2, 5, shade(dark, 0.66));
  }
  // dead wood low down, and the lit kerb strip that marks its footprint
  for (const [dx, t] of [[-0.3, 0.3], [0.36, 0.24]]) {
    b.box('toon', x + dx * s.w, s.h * t, z + s.d * 0.36, s.w * 0.2, 0.05, 0.05,
      shade(dark, 1.25));
  }
  b.box('emissive', x, 0.12, z + s.d * 0.5, s.w * 0.9, 0.1, 0.06, shade(pal.accentGlow, 0.9));
}

// ---------- panel: blocks one cell of a flight grid ------------------------

function panel(b, pal, x, z, s) {
  const y = s.base;
  // A CLOSED CELL OF THE FLIGHT GRID: a shutter in a frame, not a slab.
  //
  // The hazard bars used to stand 0.42 m above the panel, and on the middle
  // altitude that put them 2 cm into the cell she flies through above it —
  // which the hitbox audit catches and nothing else would. They are inside
  // the frame now. The rest is what a shutter actually is: guide channels
  // down both sides, a run of slats, a bottom rail with a rubber seal, and a
  // motor box, so a closed cell reads as CLOSED rather than as filled in.
  for (const side of [-1, 1]) {
    const gx = x + side * (s.w / 2 + 0.08);
    b.box('chrome', gx, y, z, 0.16, s.h, 0.34, shade(pal.chrome, 0.75));
    b.box('chrome', gx, y, z + 0.12, 0.2, s.h, 0.08, shade(pal.chrome, 0.95));
  }
  // slats: alternating in and out so the face has a profile
  const N = 7;
  for (let i = 0; i < N; i++) {
    const sy = y + (s.h / N) * i;
    const out = i % 2 ? 0.04 : 0;
    b.box('toon', x, sy, z + out, s.w, (s.h / N) * 0.86, s.d * (0.9 + out),
      shade(pal.road, 1.7 + (i % 2) * 0.5));
    b.box('toon', x, sy + (s.h / N) * 0.86, z + out, s.w * 1.005, (s.h / N) * 0.1, s.d * 0.94,
      shade(pal.road, 1.1));
  }
  // head box with the motor, and the bottom rail
  b.box('toon', x, y + s.h - 0.2, z, s.w + 0.16, 0.22, s.d + 0.16, shade(pal.deck, 1.2));
  b.box('chrome', x, y + s.h - 0.24, z, s.w + 0.2, 0.06, s.d + 0.2, shade(pal.chrome, 0.9));
  b.box('toon', x + s.w * 0.4, y + s.h - 0.16, z - s.d * 0.4, 0.3, 0.2, 0.3, shade(pal.deck, 1.4));
  b.box('chrome', x, y, z, s.w + 0.14, 0.16, s.d + 0.14, shade(pal.chrome, 0.85));
  // Flush with the cell floor. Two centimetres under it is two centimetres
  // inside the cell below, which is somewhere she flies.
  b.box('toon', x, y, z, s.w + 0.1, 0.06, s.d + 0.1, shade(pal.deck, 0.7));
  // hazard bars, INSIDE the frame, angled so they read as closed rather than
  // as a wall texture
  for (let i = 0; i < 5; i++) {
    b.box('emissive', x - s.w * 0.36 + i * (s.w * 0.18), y + s.h * 0.5, z + s.d * 0.5,
      0.22, s.h * 0.7, 0.06, shade(pal.accentGlow, 1.1));
  }
  b.box('emissive', x, y + 0.08, z + s.d * 0.5, s.w * 0.9, 0.07, 0.05, shade(pal.accent, 0.9));
  b.box('emissive', x, y + s.h - 0.3, z + s.d * 0.5, s.w * 0.9, 0.07, 0.05, shade(pal.accent, 0.9));
}

// ---------- bumper: the only obstacle you are meant to hit ----------------

function bumper(b, pal, x, z, s) {
  const r = s.w * 0.5;
  // A BUMPER IS A SPRUNG MUSHROOM, AND ITS SKIRT IS WHAT SELLS THE BOUNCE.
  //
  // Two cylinders and a dome is a bollard with a hat. A pinball bumper has a
  // wide sprung skirt at the bottom, a ribbed column, a lit collar and a cap
  // that overhangs it — the overhang is the part that says it will throw you
  // rather than stop you. Hitting one is not a crash: it throws you sideways
  // and pays out, and it is tall enough that jumping it is not the answer.
  const SEG = 16;
  // sprung skirt: a wide flared ring, with a shadow gap under it
  b.cyl('toon', x, 0, z, r * 1.3, r * 1.22, 0.12, SEG, shade(pal.accent, 0.62));
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    b.quad('toon', [x + Math.cos(a0) * r * 1.22, 0.12, z + Math.sin(a0) * r * 1.22],
      [x + Math.cos(a1) * r * 1.22, 0.12, z + Math.sin(a1) * r * 1.22],
      [x + Math.cos(a1) * r * 0.96, 0.34, z + Math.sin(a1) * r * 0.96],
      [x + Math.cos(a0) * r * 0.96, 0.34, z + Math.sin(a0) * r * 0.96],
      shade(pal.accent, 0.8 + (i % 2) * 0.3));
  }
  // ribbed column
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    const rr = i % 2 ? r * 0.94 : r;
    const rr1 = i % 2 ? r : r * 0.94;
    b.quad('chrome', [x + Math.cos(a0) * rr, 0.34, z + Math.sin(a0) * rr],
      [x + Math.cos(a1) * rr1, 0.34, z + Math.sin(a1) * rr1],
      [x + Math.cos(a1) * rr1 * 0.92, 0.34 + s.h * 0.5, z + Math.sin(a1) * rr1 * 0.92],
      [x + Math.cos(a0) * rr * 0.92, 0.34 + s.h * 0.5, z + Math.sin(a0) * rr * 0.92],
      shade(pal.chrome, 0.82 + (i % 2) * 0.3));
  }
  // lit rings, set in grooves, brightest at the bottom
  for (let i = 0; i < 3; i++) {
    b.cyl('emissive', x, 0.5 + i * 0.42, z, r * 1.0, r * 1.0, 0.11, SEG,
      shade(pal.edge, 1.05 - i * 0.16));
  }
  // the cap: overhanging, with a lip under it and a beacon on top
  const capY = 0.34 + s.h * 0.5;
  b.cyl('chrome', x, capY, z, r * 1.08, r * 1.04, 0.1, SEG, shade(pal.chrome, 1.15));
  b.dome('toon', x, capY + 0.1, z, r * 1.02, r * 0.82, SEG, 5, shade(pal.accentGlow, 0.95));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.box('emissive', x + Math.cos(a) * r * 0.72, capY + 0.42, z + Math.sin(a) * r * 0.72,
      0.12, 0.06, 0.12, shade(pal.lane, 1.0));
  }
  b.cyl('chrome', x, capY + r * 0.82 + 0.06, z, 0.16, 0.13, 0.14, 10, shade(pal.chrome, 1.0));
  b.dome('emissive', x, capY + r * 0.82 + 0.2, z, 0.28, 0.24, 8, 3, shade(pal.lane, 1.15));
  // the anchor ring painted on the road
  b.cyl('emissive', x, 0.03, z, r * 1.5, r * 1.36, 0.04, SEG, shade(pal.accent, 0.5));
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
  // A leaning panel, not a stack of boxes. The face is free points, so it
  // tilts back along z and its top corner is cut away — an outline you can
  // name at a glance. A box, however it is shaded, only ever reads as a box.
  //
  // What it was missing is that a hoarding is a SHEET ON A FRAME: it has a
  // thickness of nothing and a skeleton of everything, so the frame is now
  // built out — rails, stiles and diagonal bracing behind — and the face
  // carries the torn edge that says the wind had it.
  const w = s.w * 0.5, top = s.h, lean = s.d * 0.55;
  const P = (dx, y, dz) => [x + dx, y, z + dz];
  const face = shade(pal.kerb, 1.0);
  const back = shade(pal.kerb, 0.62);
  const cut = w * 0.35;
  b.quad('toon', P(-w, 0.06, lean), P(w, 0.06, lean), P(w, top * 0.62, -lean), P(-w, top, -lean), face);
  b.quad('toon', P(-w, 0.06, lean + 0.14), P(-w, top, -lean + 0.14), P(w, top * 0.62, -lean + 0.14),
    P(w, 0.06, lean + 0.14), back);
  // the torn edge: three ragged strips off the tall side
  for (let i = 0; i < 3; i++) {
    const t0 = i / 3, t1 = (i + 1) / 3;
    b.tri('toon', P(-w + cut * t0, top * (1 - t0 * 0.3), -lean),
      P(-w + cut * t1, top * (1 - t1 * 0.42), -lean),
      P(-w + cut * (t0 + 0.4), top * (0.62 - t0 * 0.2), -lean), shade(pal.kerb, 1.15 - i * 0.14));
  }
  // frame behind: stiles, rails and a diagonal, all in section
  for (const dx of [-w * 0.94, 0, w * 0.94]) {
    b.quad('chrome', P(dx - 0.05, 0.06, lean + 0.16), P(dx + 0.05, 0.06, lean + 0.16),
      P(dx + 0.05, top * (dx < 0 ? 0.98 : 0.66), -lean + 0.16),
      P(dx - 0.05, top * (dx < 0 ? 0.98 : 0.66), -lean + 0.16), shade(pal.chrome, 0.7));
  }
  for (const t of [0.3, 0.62]) {
    b.box('chrome', x, top * t, z + lean * (1 - t * 2) + 0.18, s.w * 0.98, 0.07, 0.07,
      shade(pal.chrome, 0.8));
  }
  b.quad('chrome', P(-w, 0.1, lean + 0.2), P(-w + 0.07, 0.1, lean + 0.2),
    P(w + 0.07, top * 0.6, -lean + 0.2), P(w, top * 0.6, -lean + 0.2), shade(pal.chrome, 0.6));
  // ground rail and the two feet it is still bolted to
  b.box('chrome', x, 0.06, z + lean, s.w + 0.12, 0.14, 0.16, shade(pal.chrome, 0.9));
  for (const side of [-1, 1]) {
    b.cyl('chrome', x + side * (w + 0.06), 0, z + lean * 0.4, 0.09, 0.07, s.h * 0.8, 7,
      shade(pal.chrome, 0.85));
    b.box('toon', x + side * (w + 0.06), 0, z + lean * 0.4, 0.4, 0.1, 0.4, shade(pal.deck, 1.1));
  }
  // the ad still burning, with a lit border and a peeled corner
  b.quad('emissive', P(-w * 0.72, s.h * 0.3, lean * 0.2), P(w * 0.42, s.h * 0.26, lean * 0.2),
    P(w * 0.42, s.h * 0.66, -lean * 0.2), P(-w * 0.72, s.h * 0.74, -lean * 0.2),
    shade(pal.accent, 0.66));
  b.tri('toon', P(w * 0.42, s.h * 0.26, lean * 0.2), P(w * 0.42, s.h * 0.66, -lean * 0.2),
    P(w * 0.62, s.h * 0.5, -lean * 0.5), shade(pal.kerb, 1.3));
  b.box('emissive', x - w * 0.2, top * 0.86, z - lean, s.w * 0.5, 0.1, 0.14,
    shade(pal.accentGlow, 0.58));
}

/** Gate: a service walkway sheared off its building and jammed overhead. */
function skywalk(b, pal, x, z, s) {
  stormMark(b, pal, x, z, s);
  const y = s.base;
  // A WALKWAY IS A FLOOR, TWO GLAZED SIDES AND A CURVED ROOF, TORN OFF.
  //
  // Three boxes and a rail read as a plank. What says "people used to walk
  // through this" is the section: a floor plate on edge beams, glazing bars
  // up both sides with panes between them, and a shallow barrel roof. The
  // tear is then legible because the section stops mid-way.
  b.box('toon', x, y + s.h * 0.16, z, s.w + 0.5, 0.18, s.d, shade(pal.deck, 1.4));
  b.box('toon', x, y + s.h * 0.1, z, s.w + 0.34, 0.14, s.d * 0.9, shade(pal.kerb, 0.8));
  for (let i = -3; i <= 3; i++) {
    b.box('toon', x + i * s.w * 0.16, y + s.h * 0.05, z, 0.08, 0.12, s.d * 0.9,
      shade(pal.deck, 0.9));
  }
  // glazing: bars with panes set between them, one pane gone
  for (const side of [-1, 1]) {
    const gx = x + side * (s.w * 0.5 + 0.24);
    for (let i = -2; i <= 2; i++) {
      b.box('chrome', gx, y + s.h * 0.34, z + i * s.d * 0.22, 0.09, s.h * 0.5, 0.09,
        shade(pal.chrome, 0.95));
      if (!(side < 0 && i === 1)) {
        b.box('glass', gx, y + s.h * 0.36, z + i * s.d * 0.22 + s.d * 0.11, 0.05, s.h * 0.44,
          s.d * 0.2, shade(pal.edge, 1.05));
      }
    }
    b.box('chrome', gx, y + s.h * 0.84, z, 0.14, 0.1, s.d, shade(pal.chrome, 1.1));
    b.box('chrome', gx, y + s.h * 0.3, z, 0.12, 0.08, s.d, shade(pal.chrome, 0.85));
  }
  // the barrel roof, in five facets
  for (let i = 0; i < 5; i++) {
    const a0 = Math.PI * (i / 5), a1 = Math.PI * ((i + 1) / 5);
    const R = s.w * 0.56;
    b.quad('toon', [x + Math.cos(a0) * R, y + s.h * 0.84 + Math.sin(a0) * R * 0.42, z - s.d * 0.5],
      [x + Math.cos(a1) * R, y + s.h * 0.84 + Math.sin(a1) * R * 0.42, z - s.d * 0.5],
      [x + Math.cos(a1) * R, y + s.h * 0.84 + Math.sin(a1) * R * 0.42, z + s.d * 0.5],
      [x + Math.cos(a0) * R, y + s.h * 0.84 + Math.sin(a0) * R * 0.42, z + s.d * 0.5],
      shade(pal.deck, 1.0 + Math.sin(a0) * 0.5));
  }
  // the torn end: a ragged floor edge and cabling hanging into the gap, but
  // never below the clearance line
  for (let i = -2; i <= 2; i++) {
    b.tri('toon', [x + i * s.w * 0.2, y + s.h * 0.16, z + s.d * 0.5],
      [x + (i + 1) * s.w * 0.2, y + s.h * 0.16, z + s.d * 0.5],
      [x + (i + 0.5) * s.w * 0.2, y + s.h * 0.16, z + s.d * (0.5 + (i % 2 ? 0.3 : 0.16))],
      shade(pal.deck, 1.5));
  }
  for (let i = -1; i <= 1; i++) {
    b.box('chrome', x + i * s.w * 0.3, y + 0.04, z + s.d * (0.5 + (i % 2) * 0.14), 0.05, 0.3, 0.05,
      shade(pal.deck, 0.8));
  }
  // The underside is the edge she has to read, so it is the brightest thing
  // on the form, and it sits ON the line.
  b.box('emissive', x, y, z, s.w * 0.95, 0.14, s.d * 0.9, shade(pal.accentGlow, 0.9));
  b.box('emissive', x, y + s.h * 0.6, z, s.w + 0.5, 0.1, s.d * 0.9, shade(pal.accent, 0.5));
}

/** Block: a comms mast down in the lane, dish and all. */
function mast(b, pal, x, z, s) {
  stormMark(b, pal, x, z, s);
  b.at(x, 0, z, -0.22, 1, 1, 1);
  // A MAST IS A TRUSS, AND A TRUSS IS READ FROM ITS GAPS.
  //
  // The old version was five stacked plates and read as a pile of crates. It
  // is now four legs drawing in as they rise with bracing between them —
  // and, this pass, each leg is an ANGLE rather than a ribbon, every bay has
  // both a diagonal and a horizontal, and the dish is dished. A comms mast
  // has more metal in its bracing than in its legs; that is what it looks
  // like from a distance.
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const rad = (t) => 0.62 - t * 0.34;
  const steps = 6;
  for (const [sx, sz] of legs) {
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const y0 = 0.1 + t0 * s.h * 0.82, y1 = 0.1 + t1 * s.h * 0.82;
      const r0 = rad(t0), r1 = rad(t1);
      b.quad('chrome', [sx * r0 - 0.05, y0, sz * r0], [sx * r0 + 0.05, y0, sz * r0],
        [sx * r1 + 0.05, y1, sz * r1], [sx * r1 - 0.05, y1, sz * r1],
        shade(pal.chrome, 0.8 + t0 * 0.3));
      b.quad('chrome', [sx * r0, y0, sz * r0 - 0.05], [sx * r0, y0, sz * r0 + 0.05],
        [sx * r1, y1, sz * r1 + 0.05], [sx * r1, y1, sz * r1 - 0.05],
        shade(pal.chrome, 0.6 + t0 * 0.25));
    }
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, y = 0.1 + t * s.h * 0.82, r = rad(t);
    b.box('chrome', 0, y, 0, r * 2, 0.07, 0.07, shade(pal.chrome, 1.0));
    b.box('chrome', 0, y, 0, 0.07, 0.07, r * 2, shade(pal.chrome, 0.86));
    if (i < steps) {
      const t1 = (i + 1) / steps, y1 = 0.1 + t1 * s.h * 0.82, r1 = rad(t1);
      for (const face of [-1, 1]) {
        const dir = (i + (face > 0 ? 0 : 1)) % 2 ? 1 : -1;
        b.quad('chrome', [-r * dir, y, face * r], [-r * dir + 0.06, y, face * r],
          [r1 * dir + 0.06, y1, face * r1], [r1 * dir, y1, face * r1], shade(pal.chrome, 0.7));
      }
    }
    if (i % 2 === 0) b.box('emissive', 0, y, 0, r * 2.05, 0.05, r * 2.05, shade(pal.accentGlow, 0.46));
  }
  // base plate with holding-down bolts
  b.taper('toon', 0, 0, 0, s.w * 0.62, 0.22, s.d * 0.9, 0.12, shade(pal.deck, 1.3));
  for (let i = 0; i < 4; i++) {
    b.cyl('chrome', Math.cos(i * 1.57) * 0.5, 0.22, Math.sin(i * 1.57) * 0.5, 0.06, 0.05, 0.12, 6,
      shade(pal.chrome, 1.0));
  }
  // the dish: rings stepping into a throat, on a real mount, plus panel antennas
  const dr = 0.62, DR = 5;
  for (let i = 0; i < DR; i++) {
    const r0 = dr * (1 - i / DR * 0.86), r1 = dr * (1 - (i + 1) / DR * 0.86);
    const y0 = s.h * 0.66 + (i / DR) * 0.1, y1 = s.h * 0.66 + ((i + 1) / DR) * 0.1;
    for (let k = 0; k < 12; k++) {
      const a0 = (k / 12) * Math.PI * 2, a1 = ((k + 1) / 12) * Math.PI * 2;
      b.quad('toon', [0.42 + Math.cos(a0) * r0 * 0.4, y0 + Math.sin(a0) * r0, 0],
        [0.42 + Math.cos(a1) * r0 * 0.4, y0 + Math.sin(a1) * r0, 0],
        [0.42 + Math.cos(a1) * r1 * 0.4, y1 + Math.sin(a1) * r1, 0],
        [0.42 + Math.cos(a0) * r1 * 0.4, y1 + Math.sin(a0) * r1, 0],
        shade(pal.kerb, 1.05 - i * 0.1));
    }
  }
  b.cyl('chrome', 0.2, s.h * 0.66, 0, 0.07, 0.06, 0.5, 6, shade(pal.chrome, 0.9));
  b.box('chrome', 0.3, s.h * 0.66, 0, 0.3, 0.09, 0.09, shade(pal.chrome, 1.0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.box('toon', Math.cos(a) * 0.3, s.h * 0.44, Math.sin(a) * 0.3, 0.14, s.h * 0.14, 0.07,
      shade(pal.kerb, 0.9));
  }
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
  // and the first version was dark violet debris in it: invisible until it
  // was too late, which in a zone entirely about reading one object ahead of
  // time is not a look, it is a broken level.
  //
  // TORN DECKING HAS A SECTION AND A BROKEN EDGE. It was a stack of boxes
  // with a bar under it; a slab of road ripped out of the world shows its
  // build-up — surface, screed, structure — and its edges are jagged. Both
  // are here now, and the jagged edge is what stops a floating rectangle
  // reading as a floating rectangle.
  const body = pal.kerb;
  b.at(x, y + s.h * 0.5, z, 0.34, 1, 1, 1);
  const W = s.w, D = s.d, T = s.h * 0.34;
  b.box('toon', 0, 0, 0, W, T * 0.4, D, shade(body, 1.0));
  b.box('toon', 0, -T * 0.4, 0, W * 0.98, T * 0.3, D * 0.98, shade(body, 0.72));
  b.box('chrome', 0, -T * 0.7, 0, W * 0.9, T * 0.3, D * 0.94, shade(pal.chrome, 0.8));
  // ragged edges: teeth along all four sides
  for (let i = 0; i < 6; i++) {
    const t = -0.5 + i / 5;
    for (const sz of [-1, 1]) {
      b.tri('toon', [W * t, T * 0.4, sz * D * 0.5], [W * (t + 0.16), T * 0.4, sz * D * 0.5],
        [W * (t + 0.08), T * 0.4, sz * D * (0.5 + (i % 2 ? 0.16 : 0.08))], shade(body, 1.3));
    }
    for (const sx of [-1, 1]) {
      b.tri('toon', [sx * W * 0.5, T * 0.4, D * t], [sx * W * 0.5, T * 0.4, D * (t + 0.16)],
        [sx * W * (0.5 + (i % 2 ? 0.12 : 0.06)), T * 0.4, D * (t + 0.08)], shade(body, 0.86));
    }
  }
  // markings still on the surface, cut off by the break
  b.box('emissive', -W * 0.1, T * 0.4 + 0.02, 0, W * 0.1, 0.04, D * 0.7, shade(pal.lane, 0.6));
  // the piece of kerb still attached, and the torn rail
  b.box('toon', -W * 0.18, T * 0.5, 0.1, W * 0.55, s.h * 0.28, D * 0.8, shade(body, 0.78));
  for (const side of [-1, 1]) {
    b.cyl('chrome', side * W * 0.42, s.h * 0.42, 0, 0.1, 0.07, s.h * 0.5, 7, shade(pal.chrome, 0.8));
    b.box('chrome', side * W * 0.42, s.h * 0.72, 0, 0.1, 0.08, D * 0.5, shade(pal.chrome, 1.0));
  }
  // reinforcement hanging out of the underside
  for (let i = 0; i < 4; i++) {
    b.box('chrome', -W * 0.3 + i * W * 0.2, -T, D * (0.2 - i * 0.12), 0.05, T * 0.5, 0.05,
      shade(pal.chrome, 0.7));
  }
  // Hazard chevrons on the underside, because underneath is the face you see
  // on the approach. Kept dim so a row cannot bloom into a bar.
  for (let i = -1; i <= 1; i++) {
    b.box('emissive', i * W * 0.3, -T * 0.86, 0, W * 0.2, 0.1, D * 0.85, shade(pal.accent, 0.55));
  }
  b.box('emissive', 0, -T * 0.8, D * 0.5, W * 0.7, 0.14, 0.07, shade(pal.accentGlow, 0.6));
  b.pop();
  // Ground marker: a thin ring, not a disc. At disc size it reads as a pad
  // you are meant to hit, the opposite of what it means, and it is the
  // brightest thing on the road at the moment you are looking down.
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
  // A copy, with the one piece of world state a form legitimately needs.
  //
  // Forms are pure functions of their gabarit, which is what keeps them
  // reusable across zones — but a few of them stand on the ground, and on The
  // Shore there is no ground. `sea` is passed rather than the whole props
  // object precisely so it cannot grow into a back door: a form may know it is
  // in water and nothing else. The spec itself is a shared constant and must
  // never be written to.
  const spec = { ...(o.spec || OBSTACLE[o.t]), sea: !!o.sea };
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
