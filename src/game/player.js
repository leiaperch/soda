import * as THREE from 'three';
import { Builder, disposeGroup } from '../core/builder.js';
import { PALETTE } from '../render/materials.js';
import { LANE_X } from '../world/chunks.js';
import { loadCourier } from './courier.js';
import { Animator, loadClips } from './animator.js';

/** The export faces +Z, which is straight at the chase camera. Half a turn
 *  puts her back to us and her nose down the track. */
const MODEL_FACING = Math.PI;

const GRAVITY = -34;
const JUMP_V = 11.4;
const SLIDE_TIME = 0.58;
const LANE_SPEED = 12;

export const PLAYER = {
  radius: 0.52,
  standHeight: 1.78,
  slideHeight: 0.9,
};

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
    this.animator = new Animator();
    this.animated = false;

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
    this.x = LANE_X[1];
    this.y = 0;
    this.z = 0;
    this.vy = 0;
    this.airborne = false;
    this.sliding = 0;
    this.stunned = 0;
    this.grinding = null;
    this.root.position.set(this.x, 0, 0);
    this.tilt.rotation.set(0, 0, 0);
    this.tilt.scale.set(1, 1, 1);
  }

  intent(kind) {
    if (this.stunned > 0) return;
    if (kind === 'left' && this.lane > 0) this.lane--;
    else if (kind === 'right' && this.lane < LANE_X.length - 1) this.lane++;
    else if (kind === 'jump' && (!this.airborne || this.grinding)) {
      // Hopping off a rail is a jump, not a fall.
      this.grinding = null;
      this.airborne = true;
      this.sliding = 0;
      this.vy = JUMP_V;
    } else if (kind === 'slide' && !this.airborne) {
      this.sliding = SLIDE_TIME;
    } else if (kind === 'slide' && this.airborne) {
      this.vy = Math.min(this.vy, -14); // fast-fall, feels great and is free
    }
  }

  get height() { return this.sliding > 0 ? PLAYER.slideHeight : PLAYER.standHeight; }

  update(dt, speed, time) {
    this.stunned = Math.max(0, this.stunned - dt);
    this.z -= speed * dt;

    const targetX = LANE_X[this.lane];
    const dx = targetX - this.x;
    this.x += dx * Math.min(1, LANE_SPEED * dt);

    if (this.grinding) {
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
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.airborne = false; this.landedAt = time; }
    }
    if (this.sliding > 0) this.sliding = Math.max(0, this.sliding - dt);

    this.root.position.set(this.x, this.y, this.z);

    // Lean into the lane change, tuck into the slide, squash on landing.
    // Skeletal clips own the jump and the crash when they are available, so
    // only the lean survives in that case: doubling them up looks drunk.
    const lean = THREE.MathUtils.clamp(dx * 0.5, -0.55, 0.55);
    this.tilt.rotation.z = THREE.MathUtils.lerp(this.tilt.rotation.z, -lean, 0.2);
    this.tilt.rotation.y = THREE.MathUtils.lerp(this.tilt.rotation.y, lean * 0.6, 0.2);

    if (this.animated) {
      this.animator.syncTo(this);
      this.animator.update(dt);
      // The slide has no clip of its own; keep the tuck for it.
      const tuckOnly = this.sliding > 0 ? 1 : 0;
      this.tilt.rotation.x = THREE.MathUtils.lerp(this.tilt.rotation.x, tuckOnly * 1.15, 0.35);
      this.tilt.position.y = tuckOnly ? 0.32 : 0;
      return;
    }

    const tuck = this.sliding > 0 ? 1 : 0;
    this.tilt.rotation.x = THREE.MathUtils.lerp(this.tilt.rotation.x, tuck * 1.15, 0.35);
    const squash = this.landedAt && time - this.landedAt < 0.16 ? 0.82 : 1;
    this.tilt.scale.y = THREE.MathUtils.lerp(this.tilt.scale.y, squash, 0.4);
    this.tilt.position.y = tuck ? 0.32 : 0;
    if (!this.airborne && !tuck) this.root.position.y += Math.sin(time * 9) * 0.05;
  }
}
