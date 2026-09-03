import * as THREE from 'three';

/**
 * The drinks.
 *
 * SIX IN THE GAME, NEVER MORE THAN THREE IN A ZONE, and that distinction is
 * the whole design. A runner's pickups only work if the player can tell which
 * one she grabbed from its colour alone, at speed, without reading anything,
 * and six cans on one road is six colours to learn while dodging. So the
 * roster is six and `props.powers` decides which three a zone may spawn:
 * variety across the game, legibility inside a run.
 *
 * Each one leans on a system the game already has rather than inventing a
 * parallel one, and no two lean on the same one:
 *   MAGNET moves CELLS · DOUBLE scales what a CELL pays · FIZZ intercepts the
 *   crash · SYRUP is the clock · STATIC is the trick chain · CREAM is the bar.
 *
 * A drink that is only "more of a good thing" would not earn a sixth colour.
 */
export const POWERUPS = {
  magnet: {
    label: 'MAGNET',
    duration: 8,
    colour: new THREE.Color('#ff2e93'),
    /** Cells inside this radius are dragged to her. */
    radius: 10,
    pull: 26,
  },
  fizz: {
    label: 'FIZZ',
    duration: 6.5,
    colour: new THREE.Color('#6ff0d4'),
    /** Obstacles burst instead of stopping you, and you run hot. */
    speed: 1.16,
  },
  double: {
    label: 'DOUBLE',
    duration: 11,
    colour: new THREE.Color('#ffd84a'),
    multiplier: 2,
  },
  /**
   * SLOW MOTION, and nothing cleverer than that.
   *
   * The first version scaled how fast the world arrived but left the drain at
   * full rate, on the theory that reading time should cost clock. In the hand
   * that is not a trade, it is a punishment you cannot see: the screen goes
   * slow and the bar keeps falling at the old speed, and the player concludes
   * the can was bad. The drain is scaled by the same figure now, so SYRUP is
   * exactly what it looks like — everything slows, you get your bearings, and
   * the only cost is the distance you did not cover.
   */
  syrup: {
    label: 'SYRUP',
    duration: 5,
    colour: new THREE.Color('#ff6a1a'),
    speed: 0.62,
  },
  /**
   * THE CHAIN NEVER CLOSES while it runs.
   *
   * It used to mean "the chain survives a crash", which is a rule you only
   * ever learn by crashing at exactly the wrong moment — invisible, and
   * indistinguishable from having been lucky. Holding the window open is the
   * same idea said out loud: the chain counter simply stays up and keeps
   * climbing, so the drink is legible in the one place the player is already
   * looking when she is chaining.
   */
  static: {
    label: 'STATIC',
    duration: 9,
    colour: new THREE.Color('#9dff2e'),
  },
  /**
   * The bar refills while it lasts. Deliberately weak per second: it is a
   * rolling RELAY, not a free one, so it changes whether you can afford the
   * long way round rather than removing the clock.
   */
  cream: {
    label: 'CREAM',
    duration: 7,
    colour: new THREE.Color('#cfe4ff'),
    regen: 9,
  },
};

export const POWER_KEYS = Object.keys(POWERUPS);

/**
 * Tracks which power-ups are running and for how long.
 *
 * Grabbing one you already have refreshes it rather than stacking, because a
 * stack you cannot see the size of is a stack the player cannot reason about.
 */
export class PowerState {
  constructor() {
    this.active = new Map();
  }

  reset() { this.active.clear(); }

  grant(key) {
    const def = POWERUPS[key];
    if (!def) return null;
    this.active.set(key, def.duration);
    return def;
  }

  has(key) { return this.active.has(key); }

  /** 0..1 of the time left, for the HUD chip. */
  remaining(key) {
    const left = this.active.get(key);
    return left === undefined ? 0 : left / POWERUPS[key].duration;
  }

  update(dt) {
    const expired = [];
    for (const [key, left] of this.active) {
      const next = left - dt;
      if (next <= 0) { this.active.delete(key); expired.push(key); }
      else this.active.set(key, next);
    }
    return expired;
  }

  /**
   * What the run speed is scaled by. FIZZ and SYRUP pull opposite ways and are
   * multiplied rather than picked between, so holding both is a wash — which
   * is the honest answer to "what happens if I drink them together".
   */
  speedFactor() {
    let f = 1;
    if (this.has('fizz')) f *= POWERUPS.fizz.speed;
    if (this.has('syrup')) f *= POWERUPS.syrup.speed;
    return f;
  }

  /** Charge per second CREAM is putting back. */
  regen() {
    return this.has('cream') ? POWERUPS.cream.regen : 0;
  }

  /** Multiplier a CELL is worth right now. */
  cellFactor() {
    return this.has('double') ? POWERUPS.double.multiplier : 1;
  }

  /** Drags loose CELLS towards the player while MAGNET is up. */
  attract(cells, player, dt) {
    if (!this.has('magnet')) return;
    const { radius, pull } = POWERUPS.magnet;
    for (const c of cells) {
      const dz = c.z - player.z;
      if (dz > 2 || dz < -radius) continue;
      const dx = player.x - c.x;
      const dy = (player.y + 0.9) - c.y;
      const dist = Math.hypot(dx, dy, dz) || 1;
      if (dist > radius) continue;
      const step = Math.min(1, (pull / dist) * dt);
      c.x += dx * step;
      c.y += dy * step;
      c.z += (player.z - c.z) * step * 0.5;
    }
  }
}
