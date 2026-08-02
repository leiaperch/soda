import * as THREE from 'three';

/**
 * Power-ups.
 *
 * Three, deliberately. A runner's pickups only work if the player can tell
 * which one they grabbed from its colour alone, at speed, without reading
 * anything — so three strongly separated colours and three effects you feel
 * within half a second.
 *
 * Each one leans on a system the game already has rather than inventing a
 * parallel one: MAGNET moves CELLS, FIZZ intercepts the crash, DOUBLE scales
 * the charge a CELL is worth.
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
