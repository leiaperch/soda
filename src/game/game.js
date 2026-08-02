import * as THREE from 'three';
import { Track } from '../world/track.js';
import { Player, PLAYER, GRAVITY, JUMP_V } from './player.js';
import { records } from './records.js';
import { bendUniforms, hillAt, slopeAt } from '../render/materials.js';
import { makeRng } from '../core/rng.js';
import { DEFAULT_ZONE, ZONES } from '../world/zones.js';
import { RAIL_H } from '../world/layout.js';
import { PowerState, POWERUPS } from './powerups.js';
import { TrickChain } from './tricks.js';

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
  bigAirTime: 0.62,   // seconds aloft before a landing counts as BIG AIR
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
  slopePull: 34,      // how hard a gradient drags or pushes
  bumperCharge: 6,
  bumperCut: 0.95,
  comboWindow: 2.6,
  beltPush: 1.09,     // conveyor running with you
  beltDrag: 0.94,     // conveyor running against you
  // Steep, because RELAYs refill to full: a gentle tax between checkpoints is
  // something a player can simply ignore, and then the lane choice is fake.
  beltDrainFactor: 3.4,
  springBoost: 1.55,  // bloom pads, relative to a normal jump
  springCharge: 3,
  ringBoost: 1.08,    // threading a hoop in The Vault
  ringCharge: 7,
  ringMiss: 0.93,
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
    this.power = new PowerState();
    this.tricks = new TrickChain();
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
    // Flight replaces the whole vertical model: no gravity, no ground, and up
    // and down become a second axis of lanes.
    this.player.flying = !!zone.props.flight;

    // Elevation. The shader displaces the world; this keeps the courier and
    // the camera on the same curve.
    this.hill = zone.props.hill || 0;
    this.player.hill = this.hill;
    bendUniforms.uHill.value = this.hill;
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
    this.run = { distance: 0, time: 0, cells: 0, relays: 0, clean: true, cleared: false, style: 0, bestChain: 0 };
    this.combo = 0;
    this.lastBump = -99;
    this.taught = new Set();
    this.power.reset();
    this.tricks.reset();
    this.hud.showRun(records.zone(this.zone.id), this.zone);
    this.hud.showZoneIntro(this.zone, ZONES.indexOf(this.zone) + 1);
    if (this.audio) { this.audio.unlock(); this.audio.playRun(this.zone); }
  }

  /** Cash any chain still running, so crossing the line never eats one. */
  _bankChain() {
    if (!this.tricks.active) return;
    this.tricks.timer = 0.0001;
    const banked = this.tricks.update(0.001);
    if (banked) this.charge = Math.min(TUNE.maxCharge, this.charge + banked.charge);
    this.run.style = this.tricks.total;
    this.run.bestChain = this.tricks.best;
  }

  _finish() {
    this._bankChain();
    this.state = 'clear';
    this.run.cleared = true;
    const beat = records.submit(this.zone.id, this.run);
    this.hud.showClear(this.run, beat, this.zone, this.nextZone());
    this.sfx.finish();
    if (this.audio) this.audio.duck();
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
    // FIZZ is the shield: the obstacle bursts and you keep your line. This is
    // the one power-up whose value has to be unmistakable the instant it saves
    // you, so it gets its own toast rather than silently swallowing the crash.
    if (this.power.has('fizz')) {
      this.hud.toast('SMASH', 'relay');
      this.sfx.relay();
      this.shake = 0.22;
      return;
    }
    this.charge += TUNE.hitCharge;
    this.speed = Math.max(this.pace.start * 0.85, this.speed * TUNE.hitSpeedCut);
    this.player.stunned = TUNE.hitStun;
    this.run.clean = false;
    this.shake = 0.55;
    // The chain dies unbanked. That is the whole tension of carrying a big one.
    const lost = this.tricks.drop();
    this.hud.toast(lost > 200 ? `CHAIN LOST ${lost}` : 'CRASH', 'warn');
    this.hud.showTrick(this.tricks, null);
    this.hud.flash();
    this.sfx.crash();
  }

  /**
   * A bumper is the one thing on the track you are supposed to run into. It
   * throws you into a neighbouring lane and pays charge instead of taking it,
   * which inverts the reflex the other zones spend their whole length
   * training. Speed is barely touched: this is a ricochet, not a stop.
   */
  _bounce(o) {
    const p = this.player;
    const away = p.lane === 0 ? 1 : p.lane === 2 ? -1 : (o.x <= p.x ? 1 : -1);
    p.lane = Math.max(0, Math.min(2, p.lane + away));

    // Chaining is the mechanic. One bumper is a nudge; a run of them is the
    // only thing that keeps the bar alive at this zone's drain rate, so you
    // steer INTO them and the ricochet lines up the next one.
    this.combo = (this.time - this.lastBump < TUNE.comboWindow) ? Math.min(this.combo + 1, 6) : 1;
    this.lastBump = this.time;
    // A lone bump pays almost nothing. Bumpers sit in your path, so incidental
    // hits are free and would sustain a player who never engages; only the
    // chain is worth anything, and a chain has to be steered for.
    const payout = TUNE.bumperCharge * (this.combo === 1 ? 0.3 : this.combo);
    this.charge = Math.min(TUNE.maxCharge, this.charge + payout);
    this.speed = Math.max(this.pace.start * 0.9, this.speed * TUNE.bumperCut);
    this.shake = 0.3;
    this._trick('bump');
    this.sfx.relay();
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
          if (o.type === 'bumper') this._bounce(o);
          else this._hit();
        }
      }

      // Score the pass once the player is safely beyond it.
      if (!o.scored && p.z < o.z - 1.2) {
        o.scored = true;
        if (!o.hit) {
          // Links in the chain, not charge. On their own they are worth
          // nothing; what they buy is the multiplier on everything after.
          if (dx < 1.4) { this._trick('clean'); this.sfx.clean(); }
          else if (dx < 3.8) this._trick('close');
        }
      }
    }

    // CELLS
    for (let i = this.track.cells.length - 1; i >= 0; i--) {
      const c = this.track.cells[i];
      if (Math.abs(c.z - p.z) < 1.1 && Math.abs(c.x - p.x) < 1.2 && Math.abs(c.y - (p.y + 0.9)) < 1.5) {
        this.track.cells.splice(i, 1);
        this.charge = Math.min(TUNE.maxCharge, this.charge + TUNE.cellCharge * this.power.cellFactor());
        this.run.cells++;
        this.sfx.cell(this.time);
      }
    }

    // POWER-UPS
    for (let i = this.track.powers.length - 1; i >= 0; i--) {
      const pu = this.track.powers[i];
      if (Math.abs(pu.z - p.z) < 1.4 && Math.abs(pu.x - p.x) < 1.5 && Math.abs(pu.y - (p.y + 0.9)) < 1.9) {
        this.track.powers.splice(i, 1);
        const def = this.power.grant(pu.key);
        this.hud.toast(def.label, 'relay');
        this.sfx.relay();
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

  /** Adds a link and shows it, so the chain is always visible as it builds. */
  _trick(key) {
    const def = this.tricks.add(key);
    if (!def) return;
    this.hud.showTrick(this.tricks, def.label);
    this.player.playPose(key);
  }

  /** Says a thing once per run, the first time it can possibly matter. */
  _teach(key, text) {
    if (this.taught.has(key)) return;
    this.taught.add(key);
    this.hud.toast(text, 'relay');
  }

  /**
   * Name the verb the first time its object comes into view. The zone card
   * states the rule; this states it again with the thing on screen, which is
   * the only moment it is actually legible.
   */
  _teachAhead() {
    const p = this.player;
    for (const f of this.track.nearFeatures(p.z, 70)) {
      const z = f.z !== undefined ? f.z : f.startZ;
      if (p.z - z < 12 || p.z - z > 60) continue;
      if (f.kind === 'swell') this._teach('swell', 'JUMP THE WAVE');
      else if (f.kind === 'spring') this._teach('spring', 'HIT THE BLOOM PAD');
      else if (f.kind === 'rail') this._teach('rail', 'LAND ON THE RAIL');
      else if (f.kind === 'gap') this._teach('gap', 'JUMP THE GAP');
      else if (f.kind === 'hole') this._teach('hole', 'NO DECK — SWITCH LANE');
      else if (f.kind === 'belt') this._teach('belt', 'RIDE THE MINT BELT');
      else if (f.kind === 'ring') {
        this._teach('ring', p.flying ? 'FLY THROUGH THE HOOP' : 'THREAD THE HOOP');
      }
    }
    if (this.zone.props.bumpers) {
      const b = this.track.nearObstacles(p.z, 60).find((o) => o.type === 'bumper' && p.z - o.z > 10);
      if (b) this._teach('bumper', 'CHAIN THE BUMPERS');
    }

    // A can the player has never seen deserves its name before they reach it,
    // not only once they have already run into it.
    const debut = this.zone.introduces;
    if (debut) {
      const can = this.track.powers.find((pu) => pu.key === debut && p.z - pu.z > 14 && p.z - pu.z < 70);
      if (can) this._teach(`power-${debut}`, `NEW · ${POWERUPS[debut].label}`);
    }
  }

  _features(dt) {
    const p = this.player;
    this.onBadBelt = false;
    this._teachAhead();

    // The Heights has no railings, and the gusts are strong enough to carry
    // the outer lane over the edge. Standing still is not a strategy.
    const edge = this.zone.props.edgeX;
    if (edge && p.stunned <= 0 && Math.abs(p.x) > edge) this._fall('BLOWN OFF');

    for (const f of this.track.nearFeatures(p.z, 44)) {
      if (f.kind === 'belt') {
        // Continuous while you stand on it, so the lane you pick is a
        // sustained decision rather than a one-off pickup. The wrong belt
        // also burns charge, which is what makes staying on it a real cost
        // rather than a mild slowdown you can ignore.
        const on = p.z <= f.startZ && p.z > f.endZ && p.lane === f.lane && !p.airborne;
        if (on) {
          const factor = f.dir > 0 ? TUNE.beltPush : TUNE.beltDrag;
          const target = this.pace.max * (f.dir > 0 ? 1.15 : 0.55);
          this.speed += (target - this.speed) * Math.min(1, Math.abs(1 - factor) * 12 * dt);
          if (f.dir < 0) this.onBadBelt = true;
          else if (!this.beltToast || this.time - this.beltToast > 2.5) {
            this.beltToast = this.time;
            this._trick('carried');
          }
        }
        continue;
      }

      if (f.kind === 'gap' || f.kind === 'hole') {
        const over = p.z <= f.startZ && p.z > f.endZ;
        const inIt = f.kind === 'gap' || p.lane === f.lane;
        if (over && inIt && !f.done && !p.grinding && p.y < 0.4) {
          f.done = true;
          this._fall(f.kind === 'gap' ? 'MISSED IT' : 'NO DECK');
        }
        continue;
      }

      if (f.kind === 'ring') {
        // Generous on purpose: the hoop's height teaches which verb it wants,
        // and being airborne or tucked at all is enough. Pixel-accurate hoops
        // in a runner are a punishment, not a skill.
        if (f.done || p.z > f.z - 0.1) continue;
        f.done = true;
        if (p.lane !== f.lane) continue;
        const threaded = f.alt !== undefined
          ? p.alt === f.alt
          : (f.mode === 'high' ? p.y > 1.15 : p.sliding > 0);
        if (threaded) {
          this.speed = Math.min(this.pace.max + 5, this.speed * TUNE.ringBoost);
          this.charge = Math.min(TUNE.maxCharge, this.charge + TUNE.ringCharge);
          this._trick('thread');
          this.sfx.clean();
        } else {
          this.speed = Math.max(this.pace.start * 0.85, this.speed * TUNE.ringMiss);
          this.hud.toast('CLIPPED', 'warn');
          this.sfx.splash();
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
          this._trick('boing');
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
          this._trick('surf');
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
        this._trick('grind');
        this.sfx.grind();
      } else if (!p.grinding && !f.hit && p.y < RAIL_H - 0.35) {
        f.hit = true;
        this._hit();
      }
    }
    if (p.grinding) {
      this.charge = Math.min(TUNE.maxCharge, this.charge + TUNE.grindCharge * dt);
      // A grind pays for every second you hold it, not once on landing.
      this.tricks.addContinuous('grind', dt);
    }
  }

  _camera(dt) {
    const cam = this.stage.camera;
    const p = this.player;
    const targetX = p.x * 0.55;
    // Flying, the camera has to track her altitude much more closely or she
    // leaves the frame the moment she climbs.
    // Sample the hill under the CAMERA, not under the player. The camera sits
    // eight metres back, and on a slope that difference is exactly enough to
    // bury it in the road or fling it into the air.
    const ground = hillAt(p.z + 7.8, this.hill);
    const targetY = ground + (p.flying ? 2.4 + p.y * 0.85 : 4.0 + p.y * 0.32);
    cam.position.x += (targetX - cam.position.x) * Math.min(1, 7 * dt);
    cam.position.y += (targetY - cam.position.y) * Math.min(1, 5 * dt);
    cam.position.z = p.z + 7.8;

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.8);
      cam.position.x += (Math.random() - 0.5) * this.shake * 1.4;
      cam.position.y += (Math.random() - 0.5) * this.shake * 1.0;
    }

    // Aim at the road 16 m ahead, at that road's height, so cresting a rise
    // actually shows you the far side instead of the sky.
    this._tmp.set(
      p.x * 0.3,
      hillAt(p.z - 16, this.hill) + (p.flying ? 0.9 + p.y * 0.8 : 1.7 + p.y * 0.28),
      p.z - 16,
    );
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
      const beltTax = this.onBadBelt ? TUNE.beltDrainFactor : 1;
      const zoneTax = this.zone.props.drain || 1;
      this.charge -= TUNE.drainBase * (1 + speedRatio * TUNE.drainSpeedFactor) * beltTax * zoneTax * dt;

      // Power-ups tick before movement so a magnet grabbed this frame already
      // pulls, and an expiring FIZZ stops shielding on the frame it ends.
      // Banking a chain is the payout, and it is a number you feel.
      const banked = this.tricks.update(dt);
      if (banked) {
        this.charge = Math.min(TUNE.maxCharge, this.charge + banked.charge);
        this.run.style = this.tricks.total;
        this.run.bestChain = this.tricks.best;
        this.hud.toast(`+${banked.score} STYLE`, 'relay');
        this.hud.showTrick(this.tricks, null);
        this.sfx.relay();
      }

      for (const key of this.power.update(dt)) this.hud.toast(`${POWERUPS[key].label} OUT`, 'warn');
      this.power.attract(this.track.cells, this.player, dt);
      if (this.power.has('fizz')) {
        this.speed = Math.min(this.pace.max * POWERUPS.fizz.speed, this.speed + 26 * dt);
      }
      this.player.shielded = this.power.has('fizz');

      this.player.update(dt, this.speed, this.time);

      // Gravity does the rest of the work on a slope: you bleed speed on the
      // way up and get it back on the way down. Nothing else needed to make a
      // hill felt rather than just seen.
      if (this.hill) {
        const slope = slopeAt(this.player.z, this.hill);
        this.speed = Math.max(
          this.pace.start * 0.6,
          Math.min(this.pace.max + 8, this.speed + slope * TUNE.slopePull * dt),
        );
      }

      this.run.distance = -this.player.z;
      this.run.time += dt;
      this._collisions();
      this._features(dt);

      // Landing is a state transition, not an event the player object emits.
      if (!this._wasAirborne && this.player.airborne) this._airFrom = this.time;
      if (this._wasAirborne && !this.player.airborne) {
        this.sfx.land();
        if (this.time - this._airFrom > TUNE.bigAirTime) this._trick('bigAir');
      }
      this._wasAirborne = this.player.airborne;

      if (this.zone.length && this.run.distance >= this.zone.length) {
        this.run.distance = this.zone.length;
        this._finish();
      } else if (this.charge <= 0) {
        this.charge = 0;
        this._bankChain();
        this.state = 'over';
        const beat = records.submit(this.zone.id, this.run);
        this.hud.showOver(this.run, beat, this.zone);
        if (this.audio) this.audio.duck();
      } else {
        this.hud.update(this.charge, TUNE.maxCharge, this.run.distance, this.speed, this.zone.length);
        this.hud.updatePowers(this.power);
        this.hud.tickTrick(this.tricks);
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

  /** A run can be suspended and picked back up without losing anything. */
  pause() {
    if (this.state !== 'running') return false;
    this.state = 'paused';
    this.hud.showPause(this.run, this.zone);
    if (this.audio) this.audio.duck();
    return true;
  }

  resume() {
    if (this.state !== 'paused') return false;
    this.state = 'running';
    // Not showRun(): that resets the progress bar and the best-distance label,
    // which would make resuming look like restarting.
    this.hud.hideOverlays();
    if (this.audio) this.audio.playRun(this.zone);
    return true;
  }

  intent(kind) {
    if (this.state !== 'running') return;
    const wasAirborne = this.player.airborne;
    const wasSliding = this.player.sliding > 0;
    const wasGrinding = !!this.player.grinding;
    this.player.intent(kind);
    if (this.player.flying) return;

    if (kind === 'jump' && (!wasAirborne || wasGrinding)) {
      this.sfx.jump();
      this._trick('ollie');
    } else if (kind === 'slide' && wasAirborne && !wasGrinding) {
      // Down in the air is a GRAB: worth more than an ollie, and it commits
      // you to a fast fall. Style you pay for with air control.
      this.sfx.slide();
      this._trick('grab');
    } else if (kind === 'slide' && !wasSliding && this.player.sliding > 0) {
      this.sfx.slide();
      this._trick('slide');
    }
  }
}

export { TUNE };
