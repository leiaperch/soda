import * as THREE from 'three';
import { Builder, disposeGroup } from '../core/builder.js';
import { PALETTE } from '../render/materials.js';
import { LANE_X, ALT_Y } from '../world/layout.js';
import { hillAt } from '../render/materials.js';
import { loadCourier } from './courier.js';
import { Animator, loadClips } from './animator.js';

/** The export faces +Z, which is straight at the chase camera. Half a turn
 *  puts her back to us and her nose down the track. */
const MODEL_FACING = Math.PI;

export const GRAVITY = -34;
export const JUMP_V = 11.4;
const SLIDE_TIME = 0.58;
/** How long the stand-up flourish runs after a slide ends. */
const SLIDE_RECOVER = 0.36;

/**
 * Trick poses, layered on top of whatever clip is playing.
 *
 * There is no Mixamo clip for an ollie or a grab, and there does not need to
 * be: a trick reads almost entirely from the body's rotation. `pitch`, `roll`
 * and `spin` are the peak offsets, reached fast and decaying over `time`, so
 * each one is a snap rather than a slow lean.
 */
const POSES = {
  ollie: { time: 0.42, pitch: -0.55, roll: 0.1, spin: 0 },
  grab: { time: 0.5, pitch: 0.95, roll: -0.3, spin: 0 },
  bigAir: { time: 0.75, pitch: -0.2, roll: 0, spin: Math.PI * 2 },
  // A spin has to be a whole turn: the pose ends by releasing the offset, so
  // half a turn would pop her back round by 180 degrees on the last frame.
  boing: { time: 0.6, pitch: -0.35, roll: 0, spin: -Math.PI * 2 },
};
const LANE_SPEED = 12;

export const PLAYER = {
  radius: 0.52,
  standHeight: 1.78,
  slideHeight: 0.9,
  /** Flying she is tucked, so her body is shorter than when she stands. */
  flightHeight: 1.3,
};

/** How fast she settles onto a new altitude. Slower than a lane change: the
 *  climb has to be readable as a move you committed to. */
const ALT_SPEED = 7;

const _c = new THREE.Color();
const shade = (color, m) => _c.copy(color).multiplyScalar(m).clone();

/**
 * The courier. Chrome jacket, oversized headphones, delivery pack, hover
 * rollers. She glides rather than runs, so no leg cycle is needed: the read
 * comes from lean, tuck and the thruster glow under the skates.
 */
function buildCourier(materials) {
  const b = new Builder();
  const skin = new THREE.Color('#ffcfae');
  const hair = new THREE.Color('#ff5fb0');
  const jacket = PALETTE.cream;
  const pants = new THREE.Color('#5b3fa8');

  // hover rollers
  for (const s of [-1, 1]) {
    b.box('chrome', s * 0.26, 0.12, 0, 0.34, 0.2, 1.05, shade(PALETTE.cream, 0.95));
    b.box('emissive', s * 0.26, 0.02, 0, 0.26, 0.07, 0.9, shade(PALETTE.mint, 1.5));
    b.box('toon', s * 0.26, 0.3, -0.02, 0.36, 0.34, 0.72, shade(jacket, 0.9));
    // shins
    b.box('toon', s * 0.24, 0.6, 0, 0.28, 0.46, 0.3, shade(pants, 1.0));
  }

  // legs and hips
  b.taper('toon', 0, 1.02, 0, 0.66, 0.28, 0.42, 0.04, shade(pants, 1.1));
  for (const s of [-1, 1]) b.box('toon', s * 0.2, 0.98, 0, 0.3, 0.14, 0.34, shade(pants, 0.9));

  // torso: tapered jacket with a chrome collar
  b.taper('toon', 0, 1.16, 0, 0.78, 0.62, 0.5, 0.06, shade(jacket, 1.0));
  b.box('emissive', 0, 1.3, 0.26, 0.42, 0.2, 0.06, shade(PALETTE.pink, 1.3));
  b.box('chrome', 0, 1.76, 0, 0.62, 0.12, 0.44, shade(PALETTE.cream, 1.0));

  // delivery pack
  b.taper('toon', 0, 1.22, -0.36, 0.62, 0.6, 0.36, 0.05, shade(PALETTE.pink, 1.0));
  b.box('emissive', 0, 1.5, -0.55, 0.34, 0.16, 0.04, shade(PALETTE.mint, 1.4));
  b.box('chrome', 0, 1.5, -0.36, 0.66, 0.08, 0.4, shade(PALETTE.cream, 0.95));

  // arms
  for (const s of [-1, 1]) {
    b.at(s * 0.44, 1.66, 0, 0, 1, 1, 1);
    b.box('toon', 0, -0.44, 0.06, 0.24, 0.5, 0.26, shade(jacket, 0.92));
    b.box('toon', 0, -0.72, 0.16, 0.22, 0.3, 0.24, shade(skin, 1.0));
    b.pop();
  }

  // head, hair and the headphones that make the silhouette readable at speed
  b.box('toon', 0, 1.88, 0, 0.42, 0.42, 0.42, shade(skin, 1.0));
  b.box('toon', 0, 2.12, -0.02, 0.5, 0.2, 0.5, shade(hair, 1.0));
  b.box('toon', 0, 1.94, -0.24, 0.42, 0.36, 0.16, shade(hair, 0.92));
  b.box('emissive', 0, 1.94, 0.21, 0.3, 0.06, 0.03, shade(PALETTE.mint, 1.3));
  for (const s of [-1, 1]) {
    b.cyl('chrome', s * 0.26, 1.82, 0, 0.14, 0.14, 0.16, 8, shade(PALETTE.cream, 1.0));
    b.box('emissive', s * 0.33, 1.86, 0, 0.04, 0.07, 0.07, shade(PALETTE.pink, 1.4));
  }
  b.arch('chrome', 0, 1.9, 0, 0.3, 0.05, 10, 5, shade(PALETTE.cream, 1.0), Math.PI * 0.8, Math.PI * 0.1);

  const group = b.toGroup(materials);

  // Inverted-hull outline: cheap, and it is what keeps her legible against a
  // pastel city that is almost the same value as she is.
  for (const mesh of [...group.children]) {
    if (mesh.material !== materials.toon) continue;
    const outline = new THREE.Mesh(mesh.geometry, materials.outline);
    outline.scale.setScalar(1.09);
    outline.position.y = -0.07;
    outline.frustumCulled = false;
    group.add(outline);
  }
  return group;
}

export class Player {
  constructor(scene, materials) {
    this.root = new THREE.Group();
    this.tilt = new THREE.Group();
    this.mesh = buildCourier(materials);
    this.mesh.scale.setScalar(1.12);
    this.tilt.add(this.mesh);
    this.root.add(this.tilt);
    scene.add(this.root);
    this.reset();

    // The authored model arrives asynchronously; the procedural courier holds
    // the frame until it does, so the game is playable from the first frame.
    // FIZZ shell. Additive and unlit so it reads as a bubble around her
    // rather than as a solid ball she is trapped in.
    // Values well under 1: the material is additive AND double sided, so the
    // front and back of the sphere both contribute and the bloom takes it from
    // there. At full brightness this was a white blob with her invisible in it.
    this.shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.62, 1), materials.beam);
    this.shell.geometry.setAttribute('color', new THREE.Float32BufferAttribute(
      new Array(this.shell.geometry.attributes.position.count * 3).fill(0).map((_, i) =>
        [0.07, 0.20, 0.17][i % 3]), 3));
    this.shell.position.y = 1.05;
    this.shell.frustumCulled = false;
    this.shell.visible = false;
    this.root.add(this.shell);
    this.shielded = false;

    this.animator = new Animator();
    this.animated = false;
    // Overridden per zone: low gravity on The Docks, crosswind on The Heights.
    this.physics = { gravity: GRAVITY, jump: JUMP_V, wind: 0 };
    this.hill = 0;

    loadCourier(materials).then(async (rig) => {
      if (!rig) return;
      this.tilt.remove(this.mesh);
      disposeGroup(this.mesh);
      rig.rotation.y = MODEL_FACING;
      this.mesh = rig;
      this.tilt.add(rig);

      // Only worth fetching the clips if there is a skeleton to drive.
      const clips = await loadClips();
      this.animated = this.animator.attach(rig, clips);
    });
  }

  reset() {
    this.lane = 1;
    this.alt = 0;
    this.x = LANE_X[1];
    this.y = this.flying ? ALT_Y[0] : 0;
    this.z = 0;
    this.vy = 0;
    this.airborne = false;
    this.sliding = 0;
    this.stunned = 0;
    this.grinding = null;
    this.slideRecover = 0;
    this.wasSliding = false;
    this.pose = null;
    this.poseT = 0;
    this.wind = 0;
    this.root.position.set(this.x, 0, 0);
    this.tilt.rotation.set(0, 0, 0);
    this.tilt.scale.set(1, 1, 1);
  }

  intent(kind) {
    if (this.stunned > 0) return;
    if (kind === 'left' && this.lane > 0) this.lane--;
    else if (kind === 'right' && this.lane < LANE_X.length - 1) this.lane++;
    else if (this.flying) {
      // Up and down change altitude instead of jumping and sliding: same two
      // gestures, second axis.
      if (kind === 'jump' && this.alt < ALT_Y.length - 1) this.alt++;
      else if (kind === 'slide' && this.alt > 0) this.alt--;
    } else if (kind === 'jump' && (!this.airborne || this.grinding)) {
      // Hopping off a rail is a jump, not a fall.
      this.grinding = null;
      this.airborne = true;
      this.sliding = 0;
      this.vy = this.physics.jump;
    } else if (kind === 'slide' && !this.airborne) {
      this.sliding = SLIDE_TIME;
    } else if (kind === 'slide' && this.airborne) {
      this.vy = Math.min(this.vy, -14); // fast-fall, feels great and is free
    }
  }

  /**
   * The stand-up after a slide: she unwinds past upright, bobs up and shakes
   * it off, all damped back to neutral. Returns the extra pitch to add to the
   * tuck target; the pop, roll and stretch are applied here.
   *
   * A damped overshoot rather than a lerp, because the whole point is that
   * recovering is a move she performs, not a state that stops being true.
   */
  /**
   * A held lean while grinding. Sustained rather than a snap, because a grind
   * is a pose you are holding, not a moment you hit.
   */
  _grindLean() {
    const want = this.grinding ? -0.22 : 0;
    this.grindLean = THREE.MathUtils.lerp(this.grindLean || 0, want, 0.12);
    return this.grinding ? 0.12 : 0;
  }

  /** Fired by the game when a trick lands. Unknown keys are ignored. */
  playPose(key) {
    if (!POSES[key]) return;
    this.pose = POSES[key];
    this.poseT = 0;
  }

  /**
   * Applies the current trick pose. Returns the pitch to add; roll and spin
   * are applied here. Snaps in over the first fifth of its life and decays
   * out, so it lands on the beat of the input rather than easing into it.
   */
  _trickPose(dt) {
    this.poseRoll = 0;
    this.poseSpin = 0;
    if (!this.pose) return 0;
    this.poseT += dt;
    const t = this.poseT / this.pose.time;
    if (t >= 1) { this.pose = null; return 0; }
    const attack = Math.min(1, t / 0.18);
    const decay = 1 - Math.pow(t, 1.7);
    const k = attack * decay;
    this.poseRoll = this.pose.roll * k;
    // A spin runs once through the whole pose rather than decaying, or it
    // would unwind halfway round and read as a stumble. Stored as an offset
    // rather than added to the rotation: adding it every frame while the lean
    // lerp reads the same channel makes it accumulate without bound.
    if (this.pose.spin) this.poseSpin = this.pose.spin * Math.min(1, t * 1.15);
    return this.pose.pitch * k;
  }

  _slideFlourish() {
    if (this.slideRecover <= 0) return 0;
    const t = 1 - this.slideRecover / SLIDE_RECOVER;   // 0 at the start
    const decay = Math.exp(-t * 4.2);
    this.tilt.position.y += 0.17 * Math.sin(t * Math.PI) * (1 - t * 0.35);
    this.tilt.rotation.z += 0.17 * Math.sin(t * Math.PI * 3.2) * decay;
    this.tilt.scale.y *= 1 + 0.13 * Math.sin(t * Math.PI * 1.4) * decay;
    return -0.5 * Math.sin(t * Math.PI * 2.3) * decay;
  }

  get height() {
    if (this.flying) return PLAYER.flightHeight;
    return this.sliding > 0 ? PLAYER.slideHeight : PLAYER.standHeight;
  }

  update(dt, speed, time) {
    this.stunned = Math.max(0, this.stunned - dt);
    this.z -= speed * dt;

    // Crosswind shifts the target off the lane centre rather than nudging x
    // directly, so the drift is something you steer against instead of a
    // stutter you cannot read. Collision uses x, so it genuinely costs you.
    this.wind = this.physics.wind
      ? (Math.sin(time * 0.42) + Math.sin(time * 1.13) * 0.32) * this.physics.wind
      : 0;
    const targetX = LANE_X[this.lane] + this.wind;
    const dx = targetX - this.x;
    this.x += dx * Math.min(1, LANE_SPEED * dt);

    if (this.flying) {
      // No gravity, no ground: she settles onto the chosen altitude and stays.
      this.y += (ALT_Y[this.alt] - this.y) * Math.min(1, ALT_SPEED * dt);
      this.vy = 0;
      this.airborne = false;
      this.sliding = 0;
      this.grinding = null;
    } else if (this.grinding) {
      // Locked to the rail: no gravity, no fall, until the rail runs out or a
      // lane change takes her off it.
      this.y = this.grinding.y;
      this.vy = 0;
      this.airborne = true;
      if (this.z < this.grinding.endZ || this.lane !== this.grinding.lane) {
        this.grinding = null;
        this.vy = 0;
      }
    } else if (this.airborne) {
      this.vy += this.physics.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.airborne = false; this.landedAt = time; }
    }
    if (this.sliding > 0) this.sliding = Math.max(0, this.sliding - dt);

    // Coming out of a slide used to be a plain lerp back to standing, which
    // read as the pose simply switching off. Catching the moment it ends lets
    // the stand-up be an action of its own.
    const slidingNow = this.sliding > 0;
    if (this.wasSliding && !slidingNow) this.slideRecover = SLIDE_RECOVER;
    this.wasSliding = slidingNow;
    if (this.slideRecover > 0) this.slideRecover = Math.max(0, this.slideRecover - dt);

    // The shader lifts the world onto the hill; she has to ride the same curve
    // or she walks straight through it. Collision stays in flat space, where
    // she and every obstacle share the offset anyway.
    this.root.position.set(this.x, this.y + hillAt(this.z, this.hill), this.z);

    this.shell.visible = this.shielded;
    if (this.shielded) {
      const wobble = 1 + Math.sin(time * 7) * 0.05;
      this.shell.scale.set(wobble, 1 + Math.sin(time * 9 + 1) * 0.05, wobble);
      this.shell.rotation.y = time * 0.8;
    }

    // Lean into the lane change, tuck into the slide, squash on landing.
    // Skeletal clips own the jump and the crash when they are available, so
    // only the lean survives in that case: doubling them up looks drunk.
    // The lean is lerped on its own scalars, then every offset is added on top
    // when the rotation is written. Lerping the rotation channel itself while
    // also adding an offset to it makes the offset accumulate every frame.
    const lean = THREE.MathUtils.clamp(dx * 0.5, -0.55, 0.55);
    this.leanZ = THREE.MathUtils.lerp(this.leanZ || 0, -lean, 0.2);
    this.leanY = THREE.MathUtils.lerp(this.leanY || 0, lean * 0.6, 0.2);
    this.tilt.rotation.z = this.leanZ;
    this.tilt.rotation.y = this.leanY;

    if (this.flying) {
      // bank into the turn and pitch with the climb, which is all a flying
      // silhouette needs to read as flying rather than as floating
      const climb = (ALT_Y[this.alt] - this.y);
      this.tilt.rotation.x = THREE.MathUtils.lerp(this.tilt.rotation.x, -climb * 0.16, 0.15);
      this.tilt.rotation.z = THREE.MathUtils.lerp(this.tilt.rotation.z, -lean * 1.5, 0.2);
      this.tilt.position.y = 0;
      this.tilt.scale.y = 1;
      if (this.animated) { this.animator.syncTo(this); this.animator.update(dt); }
      return;
    }

    if (this.animated) {
      this.animator.syncTo(this);
      this.animator.update(dt);
      // The slide has no clip of its own; keep the tuck and the stand-up.
      const tuckOnly = this.sliding > 0 ? 1 : 0;
      this.tilt.position.y = tuckOnly ? 0.32 : 0;
      this.tilt.scale.y = 1;
      const kickA = this._slideFlourish() + this._trickPose(dt) + this._grindLean();
      this.tilt.rotation.x = THREE.MathUtils.lerp(this.tilt.rotation.x, tuckOnly * 1.15 + kickA, 0.35);
      this.tilt.rotation.z = this.leanZ + this.poseRoll + this.grindLean;
      this.tilt.rotation.y = this.leanY + this.poseSpin;
      return;
    }

    const tuck = this.sliding > 0 ? 1 : 0;
    const squash = this.landedAt && time - this.landedAt < 0.16 ? 0.82 : 1;
    this.tilt.scale.y = THREE.MathUtils.lerp(this.tilt.scale.y, squash, 0.4);
    this.tilt.position.y = tuck ? 0.32 : 0;
    const kick = this._slideFlourish() + this._trickPose(dt) + this._grindLean();
    this.tilt.rotation.x = THREE.MathUtils.lerp(this.tilt.rotation.x, tuck * 1.15 + kick, 0.35);
    this.tilt.rotation.z = this.leanZ + this.poseRoll + this.grindLean;
    this.tilt.rotation.y = this.leanY + this.poseSpin;
    if (!this.airborne && !tuck) this.root.position.y += Math.sin(time * 9) * 0.05;
  }
}
