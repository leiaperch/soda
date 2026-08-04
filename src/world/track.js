import { CHUNK_LEN, LANE_X, buildChunk, pickPattern } from './chunks.js';
import { CellPool, RelayPool, FinishGate, PowerPool } from './pickups.js';
import { disposeGroup } from '../core/builder.js';
import { POWERUPS, POWER_KEYS } from '../game/powerups.js';

const VARIANTS = 10;      // pre-built chunk meshes, recycled forever
const ACTIVE = 8;         // slots alive at once (~380 units of visible road)
const RELAY_EVERY = 3;    // one checkpoint every three chunks (~144 m)
const POWER_EVERY = 4;    // one power-up every four chunks (~192 m)

/**
 * Checkpoint spacing is the real difficulty dial.
 *
 * A RELAY refills to full, so any drain-based mechanic is only as sharp as
 * the distance between them: at 144 m a doubled drain is something a player
 * can simply eat. A zone whose mechanic IS the charge economy has to push
 * them apart or the decision is decorative.
 */
function relayEvery(zone) {
  return (zone && zone.props.relayEvery) || RELAY_EVERY;
}

/**
 * Streams a zone. Chunk geometry is built once per zone and then recycled by
 * repositioning, so a run never allocates geometry mid-flight and never
 * hitches. Changing zone throws the geometry away and rebuilds, which only
 * ever happens on the select screen.
 */
export class Track {
  constructor(scene, materials, rng) {
    this.scene = scene;
    this.materials = materials;
    this.rng = rng;
    this.variants = [];
    this.zone = null;

    this.cellPool = new CellPool(scene, materials);
    this.relayPool = new RelayPool(scene, materials, 5);
    this.finishGate = new FinishGate(scene, materials);
    this.powerPool = new PowerPool(scene, materials);
    this.finishZ = null;

    this.slots = [];
    this.cells = [];
    this.relays = [];
    this.powers = [];
    this.chunkIndex = 0;
    this.frontZ = 0;
  }

  setZone(zone) {
    if (this.zone && this.zone.id === zone.id) return;
    this.zone = zone;
    this._disposeVariants();
    for (let i = 0; i < VARIANTS; i++) {
      const pattern = pickPattern(this.rng, i < 4 ? 0 : 2, zone.props.flight, zone.props.storm);
      const chunk = buildChunk(this.rng, pattern, this.materials, zone);
      chunk.group.visible = false;
      this.scene.add(chunk.group);
      this.variants.push(chunk);
    }
    this.relayPool.setZone(zone);
    this.finishGate.setZone(zone);
    this.reset();
  }

  _disposeVariants() {
    for (const v of this.variants) {
      this.scene.remove(v.group);
      disposeGroup(v.group);
    }
    this.variants.length = 0;
    this.slots.length = 0;
    this.cells.length = 0;
    this.relays.length = 0;
  }

  reset() {
    for (const s of this.slots) {
      s.variant.group.visible = false;
      s.variant.inUse = false;
    }
    this.slots.length = 0;
    this.cells.length = 0;
    this.relays.length = 0;
    this.powers.length = 0;
    this.chunkIndex = 0;
    this.frontZ = CHUNK_LEN; // one chunk of runway behind the start line
    this.finishZ = this.zone && this.zone.length ? -this.zone.length : null;
    for (let i = 0; i < ACTIVE; i++) this._spawn(0);
  }

  _freeVariant(tier) {
    const pool = this.variants.filter((v) => !v.inUse && (tier >= 1 || this.variants.indexOf(v) < 4));
    const candidates = pool.length ? pool : this.variants.filter((v) => !v.inUse);
    return candidates[this.rng.int(0, candidates.length - 1)];
  }

  _spawn(tier) {
    const variant = this._freeVariant(tier);
    if (!variant) return;
    variant.inUse = true;
    variant.group.visible = true;

    const zStart = this.frontZ;
    this.frontZ -= CHUNK_LEN;
    variant.group.position.z = zStart;

    const index = this.chunkIndex++;
    const slot = { variant, zStart, index, obstacles: [], features: [] };

    // Skip obstacles on the very first chunk: nobody should die at t=0.
    if (index > 0) {
      for (const o of variant.obstacles) {
        slot.obstacles.push({ x: LANE_X[o.lane], z: zStart + o.z, spec: o.spec, type: o.type, hit: false });
      }
      for (const f of (variant.features || [])) {
        if (f.kind === 'swell') {
          slot.features.push({ kind: 'swell', z: zStart - f.z, done: false });
        } else if (f.kind === 'gap') {
          slot.features.push({ kind: 'gap', startZ: zStart - f.from, endZ: zStart - f.to, done: false });
        } else if (f.kind === 'spring') {
          slot.features.push({ kind: 'spring', lane: f.lane, x: LANE_X[f.lane], z: zStart - f.z, done: false });
        } else if (f.kind === 'ring') {
          slot.features.push({ kind: 'ring', lane: f.lane, mode: f.mode, alt: f.alt, z: zStart - f.z, done: false });
        } else if (f.kind === 'belt') {
          slot.features.push({ kind: 'belt', lane: f.lane, dir: f.dir, startZ: zStart - f.from, endZ: zStart - f.to });
        } else if (f.kind === 'hole') {
          slot.features.push({ kind: 'hole', lane: f.lane, startZ: zStart - f.from, endZ: zStart - f.to, done: false });
        } else {
          slot.features.push({ kind: 'rail', lane: f.lane, x: LANE_X[f.lane], startZ: zStart - f.from, endZ: zStart - f.to, hit: false });
        }
      }
      for (const c of variant.cells) {
        this.cells.push({ x: LANE_X[c.lane], y: c.y ?? 1.15, z: zStart + c.z, slot: index });
      }
    }
    // No checkpoint within sight of the finish line: the last stretch is meant
    // to be run on whatever charge you arrive with.
    const relayZ = zStart - CHUNK_LEN * 0.5;
    const clearOfFinish = this.finishZ === null || relayZ > this.finishZ + 90;
    if (index > 0 && index % relayEvery(this.zone) === 0 && clearOfFinish) {
      this.relays.push({ z: relayZ, slot: index, used: false });
    }

    // A power-up, offset from the RELAY so the two never land together and
    // steal each other's moment. A zone only spawns the kinds it has been
    // introduced to; an empty list means none at all, which is how The Ring
    // stays a clean lesson in the three base verbs.
    const allowed = this.zone.props.powers ?? POWER_KEYS;
    if (index > 1 && index % POWER_EVERY === 0 && allowed.length) {
      const key = allowed[this.rng.int(0, allowed.length - 1)];
      this.powers.push({
        key,
        colour: POWERUPS[key].colour,
        x: LANE_X[this.rng.int(0, 2)],
        y: this.zone.props.flight ? 2.8 : 1.5,
        z: zStart - CHUNK_LEN * 0.28,
        slot: index,
      });
    }
    this.slots.push(slot);
  }

  update(playerZ, tier, time) {
    while (this.slots.length && this.slots[0].zStart - CHUNK_LEN > playerZ + CHUNK_LEN) {
      const dead = this.slots.shift();
      dead.variant.inUse = false;
      dead.variant.group.visible = false;
      this.cells = this.cells.filter((c) => c.slot !== dead.index);
      this.relays = this.relays.filter((r) => r.slot !== dead.index);
      this.powers = this.powers.filter((p) => p.slot !== dead.index);
      this._spawn(tier);
    }
    this.cellPool.update(this.cells, time);
    this.relayPool.update(this.relays, time);
    this.powerPool.update(this.powers, time);
    this.finishGate.update(this.finishZ, playerZ, time);
  }

  /** Obstacles within a z window ahead of and around the player. */
  nearObstacles(playerZ, range = 12) {
    const out = [];
    for (const s of this.slots) {
      for (const o of s.obstacles) {
        if (Math.abs(o.z - playerZ) < range) out.push(o);
      }
    }
    return out;
  }

  /** Swells and rails within a z window around the player. */
  nearFeatures(playerZ, range = 40) {
    const out = [];
    for (const s of this.slots) {
      for (const f of s.features) {
        const z = f.z !== undefined ? f.z : f.startZ;
        if (Math.abs(z - playerZ) < range) out.push(f);
      }
    }
    return out;
  }

  dispose() { this._disposeVariants(); }
}
