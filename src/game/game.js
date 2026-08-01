import * as THREE from 'three';
import { Track } from '../world/track.js';
import { Player, PLAYER, GRAVITY, JUMP_V } from './player.js';
import { records } from './records.js';
import { bendUniforms } from '../render/materials.js';
import { makeRng } from '../core/rng.js';
import { DEFAULT_ZONE, ZONES } from '../world/zones.js';
import { RAIL_H } from '../world/layout.js';

/** Tuning lives in one block on purpose: this is the balance surface. */
const TUNE = {
  maxCharge: 100,
  startSpeed: 18,
  maxSpeed: 44,
  speedRamp: 0.22,        // units/s gained per second
  // Drain is set so a clean player arrives at a RELAY with roughly a quarter
  // of the bar left. Crashing costs charge twice over: the hit itself, and the
  // speed cut that makes the next RELAY take longer to reach.
  drainBase: 6.0,         // charge/s at start speed
  drainSpeedFactor: 0.75, // how much faster it drains at top speed
  cellCharge: 6,
  nearMissCharge: 1.2,
  cleanCharge: 2.0,
  hitCharge: -25,
  hitSpeedCut: 0.75,
  hitStun: 0.55,
  // zone verbs
  surfBoost: 1.12,
  surfCharge: 5,
  splashCut: 0.88,
  splashCharge: -6,
  grindCharge: 9,     // per second while on a rail
  fallCharge: -32,    // off the catwalk, or off the bridge
  springBoost: 1.55,  // bloom pads, relative to a normal jump
  springCharge: 3,
};

/** Lets the game run headless in tests without branching on `if (sfx)`. */
const SILENT_SFX = new Proxy({}, { get: () => () => {} });

export class Game {
  constructor(stage, hud, seed = 1, audio = null, sfx = null) {
    this.stage = stage;
    this.hud = hud;
    this.audio = audio;
    this.sfx = sfx || SILENT_SFX;
    this._wasAirborne = false;
    this.rng = makeRng(seed);
    this.track = new Track(stage.scene, stage.materials, this.rng);
    this.player = new Player(stage.scene, stage.materials);
    this.state = 'title';
    this.time = 0;
    this.shake = 0;
    this.speed = TUNE.startSpeed;
    this.charge = TUNE.maxCharge;
    this._tmp = new THREE.Vector3();

    // The menu sits on a live stretch of road, not on a still.
    this.zone = null;
    this.setZone(DEFAULT_ZONE);
    this.player.reset();
    this.run = { distance: 0, time: 0, cells: 0, relays: 0, clean: true };
  }

  /** Swap ambience and geometry together. Only ever called between runs. */
  setZone(zone) {
    if (this.zone && this.zone.id === zone.id) return;
    this.zone = zone;
    this.stage.applyZone(zone);
    this.track.setZone(zone);

    // A zone can bend the rules: gravity on The Docks, crosswind on The
    // Heights, the whole speed envelope on The Core.
    const ph = zone.physics || {};
    this.player.physics = {
      gravity: GRAVITY * (ph.gravityScale ?? 1),
      jump: JUMP_V * (ph.jumpScale ?? 1),
      wind: ph.wind ?? 0,
    };
    this.pace = {
      start: ph.startSpeed ?? TUNE.startSpeed,
      max: ph.maxSpeed ?? TUNE.maxSpeed,
      ramp: ph.speedRamp ?? TUNE.speedRamp,
    };
  }

  start(zone = this.zone || DEFAULT_ZONE) {
    this.setZone(zone);
    this.track.reset();
    this.player.reset();
    this.state = 'running';
    this.time = 0;
    this.shake = 0;
    this.speed = this.pace.start;
    this.charge = TUNE.maxCharge;
    this.run = { distance: 0, time: 0, cells: 0, relays: 0, clean: true, cleared: false };
    this.hud.showRun(records.zone(this.zone.id), this.zone);
    this.hud.toast('GO!');
    if (this.audio) { this.audio.unlock(); this.audio.resetRate(); this.audio.playRun(this.zone); }
  }

  _finish() {
    this.state = 'clear';
    this.run.cleared = true;
    const beat = records.submit(this.zone.id, this.run);
    this.hud.showClear(this.run, beat, this.zone, this.nextZone());
    this.sfx.finish();
    if (this.audio) { this.audio.resetRate(); this.audio.duck(); }
  }

  /** Next built zone after this one, or null at the end of what exists. */
  nextZone() {
    const built = ZONES.filter((z) => z.built);
    const i = built.indexOf(this.zone);
    return i >= 0 && i < built.length - 1 ? built[i + 1] : null;
  }

  get tier() {
    if (this.run.distance < 400) return 0;
    if (this.run.distance < 1200) return 1;
    return 2;
  }

  _hit() {
    this.charge += TUNE.hitCharge;
    this.speed = Math.max(this.pace.start * 0.85, this.speed * TUNE.hitSpeedCut);
    this.player.stunned = TUNE.hitStun;
    this.run.clean = false;
    this.shake = 0.55;
    this.hud.toast('CRASH', 'warn');
    this.hud.flash();
    this.sfx.crash();
  }

  _collisions() {
    const p = this.player;
    const pTop = p.y + p.height;
    for (const o of this.track.nearObstacles(p.z, 14)) {
      const dz = Math.abs(o.z - p.z);
      const dx = Math.abs(o.x - p.x);

      if (!o.hit && dz < o.spec.d / 2 + 0.55 && dx < o.spec.w / 2 + PLAYER.radius) {
        const oTop = o.spec.base + o.spec.h;
        if (p.y < oTop && pTop > o.spec.base) {
          o.hit = true;
          this._hit();
        }
      }

      // Score the pass once the player is safely beyond it.
      if (!o.scored && p.z < o.z - 1.2) {
        o.scored = true;
        if (!o.hit) {
          if (dx < 1.4) {
            this.charge = Math.min(TUNE.maxCharge, this.charge + TUNE.cleanCharge);
            this.hud.toast('CLEAN');
            this.sfx.clean();
          } else if (dx < 3.8) {
            this.charge = Math.min(TUNE.maxCharge, this.charge + TUNE.nearMissCharge);
            this.hud.toast('NEAR MISS');
          }
        }
      }
    }

    // CELLS
    for (let i = this.track.cells.length - 1; i >= 0; i--) {
      const c = this.track.cells[i];
      if (Math.abs(c.z - p.z) < 1.1 && Math.abs(c.x - p.x) < 1.2 && Math.abs(c.y - (p.y + 0.9)) < 1.5) {
        this.track.cells.splice(i, 1);
        this.charge = Math.min(TUNE.maxCharge, this.charge + TUNE.cellCharge);
        this.run.cells++;
        this.sfx.cell(this.time);
      }
    }

    // RELAYS
    for (const r of this.track.relays) {
      if (!r.used && p.z < r.z) {
        r.used = true;
        this.charge = TUNE.maxCharge;
        this.run.relays++;
        this.hud.toast('RELAY', 'relay');
        this.sfx.relay();
      }
    }
  }

  /**
   * Zone-specific verbs. Both are timing rewards rather than new obstacles:
   * the punishment for getting them wrong is losing tempo, not dying.
   */
  /**
   * Losing the deck. Not instant death, in keeping with the rest of the game:
   * it costs a chunk of charge, all your speed and your clean run, and hauls
   * you back to the middle lane.
   */
  _fall(label) {
    const p = this.player;
    this.charge += TUNE.fallCharge;
    this.speed = Math.max(this.pace.start * 0.8, this.speed * 0.55);
    p.stunned = 0.75;
    p.grinding = null;
    p.airborne = false;
    p.y = 0;
    p.vy = 0;
    p.lane = 1;
    p.x = 0;
    this.run.clean = false;
    this.shake = 0.75;
    this.hud.toast(label, 'warn');
    this.hud.flash();
    this.sfx.crash();
  }

  _features(dt) {
    const p = this.player;

    // The Heights has no railings, and the gusts are strong enough to carry
    // the outer lane over the edge. Standing still is not a strategy.
    const edge = this.zone.props.edgeX;
    if (edge && p.stunned <= 0 && Math.abs(p.x) > edge) this._fall('BLOWN OFF');

    for (const f of this.track.nearFeatures(p.z, 44)) {
      if (f.kind === 'gap' || f.kind === 'hole') {
        const over = p.z <= f.startZ && p.z > f.endZ;
        const inIt = f.kind === 'gap' || p.lane === f.lane;
        if (over && inIt && !f.done && !p.grinding && p.y < 0.4) {
          f.done = true;
          this._fall(f.kind === 'gap' ? 'MISSED IT' : 'NO DECK');
        }
        continue;
      }

      if (f.kind === 'spring') {
        // Fires you up whether you were running or already falling onto it,
        // which is what lets pads chain into a bounce instead of a stutter.
        if (f.done || p.z > f.z - 0.1 || p.lane !== f.lane) continue;
        f.done = true;
        if (p.y < 1.6) {
          p.grinding = null;
          p.airborne = true;
          p.sliding = 0;
          p.vy = Math.abs(p.physics.jump) * TUNE.springBoost;
          this.charge = Math.min(TUNE.maxCharge, this.charge + TUNE.springCharge);
          this.hud.toast('BOING', 'relay');
          this.sfx.jump();
        }
        continue;
      }

      if (f.kind === 'swell') {
        if (f.done || p.z > f.z - 0.1) continue;
        f.done = true;
        if (p.airborne) {
          this.speed = Math.min(this.pace.max + 6, this.speed * TUNE.surfBoost);
          this.charge = Math.min(TUNE.maxCharge, this.charge + TUNE.surfCharge);
          this.hud.toast('SURF!', 'relay');
          this.sfx.surf();
        } else {
          this.speed = Math.max(this.pace.start * 0.85, this.speed * TUNE.splashCut);
          this.charge += TUNE.splashCharge;
          this.hud.toast('SPLASH', 'warn');
          this.sfx.splash();
        }
        continue;
      }

      // Rail: land on it and you ride, run into it and it is a wall. That is
      // the whole bargain — it is only a shortcut if you commit to the jump.
      const onSpan = p.z <= f.startZ && p.z > f.endZ;
      if (!onSpan || p.lane !== f.lane) continue;

      if (!p.grinding && p.y > RAIL_H - 0.45 && p.vy <= 0) {
        p.grinding = { y: RAIL_H, endZ: f.endZ, lane: f.lane };
        this.hud.toast('GRIND', 'relay');
        this.sfx.grind();
      } else if (!p.grinding && !f.hit && p.y < RAIL_H - 0.35) {
        f.hit = true;
        this._hit();
      }
    }
    if (p.grinding) this.charge = Math.min(TUNE.maxCharge, this.charge + TUNE.grindCharge * dt);
  }

  _camera(dt) {
    const cam = this.stage.camera;
    const p = this.player;
    const targetX = p.x * 0.55;
    const targetY = 4.0 + p.y * 0.32;
    cam.position.x += (targetX - cam.position.x) * Math.min(1, 7 * dt);
    cam.position.y += (targetY - cam.position.y) * Math.min(1, 5 * dt);
    cam.position.z = p.z + 7.8;

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.8);
      cam.position.x += (Math.random() - 0.5) * this.shake * 1.4;
      cam.position.y += (Math.random() - 0.5) * this.shake * 1.0;
    }

    this._tmp.set(p.x * 0.3, 1.7 + p.y * 0.28, p.z - 16);
    cam.lookAt(this._tmp);

    // Speed sells itself through FOV, not through numbers.
    const t = (this.speed - this.pace.start) / (this.pace.max - this.pace.start);
    const base = window.innerHeight > window.innerWidth ? 74 : 58;
    const wanted = base + t * 10;
    if (Math.abs(cam.fov - wanted) > 0.05) {
      cam.fov += (wanted - cam.fov) * Math.min(1, 3 * dt);
      cam.updateProjectionMatrix();
    }
  }

  update(dt) {
    this.time += dt;
    bendUniforms.uTime.value = this.time;

    if (this.state === 'running') {
      this.speed = Math.min(this.pace.max, this.speed + this.pace.ramp * dt);
      const speedRatio = (this.speed - this.pace.start) / (this.pace.max - this.pace.start);
      this.charge -= TUNE.drainBase * (1 + speedRatio * TUNE.drainSpeedFactor) * dt;

      this.player.update(dt, this.speed, this.time);
      this.run.distance = -this.player.z;
      this.run.time += dt;
      this._collisions();
      this._features(dt);

      // Landing is a state transition, not an event the player object emits.
      if (this._wasAirborne && !this.player.airborne) this.sfx.land();
      this._wasAirborne = this.player.airborne;

      // The track climbs, and so does the music with it.
      if (this.audio) this.audio.setRate(1 + speedRatio * 0.34);

      if (this.zone.length && this.run.distance >= this.zone.length) {
        this.run.distance = this.zone.length;
        this._finish();
      } else if (this.charge <= 0) {
        this.charge = 0;
        this.state = 'over';
        const beat = records.submit(this.zone.id, this.run);
        this.hud.showOver(this.run, beat, this.zone);
        if (this.audio) { this.audio.resetRate(); this.audio.duck(); }
      } else {
        this.hud.update(this.charge, TUNE.maxCharge, this.run.distance, this.speed, this.zone.length);
      }
    } else if (this.state === 'title') {
      // Slow drift on the title screen so the city is alive before you press play.
      this.player.z -= 6 * dt;
      this.player.update(dt, 6, this.time);
    }

    bendUniforms.uPlayerZ.value = this.player.z;
    this.track.update(this.player.z, this.tier, this.time);
    this._camera(dt);
  }

  intent(kind) {
    if (this.state !== 'running') return;
    const wasAirborne = this.player.airborne;
    const wasSliding = this.player.sliding > 0;
    this.player.intent(kind);
    if (kind === 'jump' && !wasAirborne) this.sfx.jump();
    else if (kind === 'jump' && this.player.grinding === null && wasAirborne && this.player.vy > 0) this.sfx.jump();
    else if (kind === 'slide' && !wasSliding && this.player.sliding > 0) this.sfx.slide();
  }
}

export { TUNE };
