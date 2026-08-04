import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/**
 * Skeletal animation layer for the courier.
 *
 * The three Mixamo clips are "without skin" exports: 34 `mixamorig:` bones and
 * no geometry. They can only drive a model that carries a compatible skeleton.
 * The courier glTF currently has none (`skins: 0`), so `attach()` refuses and
 * the caller falls back to the procedural lean/tuck/bob, which is why the game
 * still looks correct today.
 *
 * The moment a rigged courier is dropped in, this wires itself up with no
 * other change: retargeting works because both sides use Mixamo bone names.
 */

const CLIPS = {
  skate: 'anim/skate.fbx',
  jump: 'anim/jump.fbx',
  knocked: 'anim/knocked.fbx',
  fly: 'anim/fly.fbx',
  // Trick clips. These are played over the top of the state machine for a
  // fixed length and then hand control straight back.
  flip: 'anim/flip.fbx',
  runflip: 'anim/runflip.fbx',
  evade: 'anim/evade.fbx',
  victory: 'anim/victory.fbx',
};

/**
 * Clips trimmed to the part that is actually the move, `[start, end]` in
 * seconds.
 *
 * A Mixamo export is authored out of and back into an idle, so a "3.67 s
 * dodge" is mostly standing still. Played whole it has to be crushed to fit an
 * airborne moment, which is what made the first pass read as a twitch.
 *
 * Measured rather than guessed: summing per-bone quaternion deltas across each
 * clip gives its motion envelope. EVADE ramps up to 0.5 s, peaks between 1.5
 * and 2.5 s and has decayed by 2.8 s. RUNFLIP is flat after 1.8 s. FLIP is at
 * full energy from its first frame to its last, so it is not trimmed at all.
 */
const TRIM = {
  evade: [1.10, 2.50],
  runflip: [0, 1.80],
};

/**
 * Which tricks get a real clip.
 *
 * Only the two slow ones. A clip has to be squeezed into the airtime it is
 * given, and the tap tricks do not have enough of it: the flip ran at 5x and
 * the 3.67 s evade at 7x, which is a twitch, not a trick. Everything fast is
 * back on the procedural spin — she turns on herself on her skates, which is
 * readable at any speed because it is authored at the speed it plays.
 */
const TRICK_CLIPS = {
  bigAir: 'flip',
  boing: 'runflip',
  dodge: 'evade',
};

/** Past this the clip stops reading as a move and starts reading as a stutter. */
const MAX_TRICK_SPEED = 2;

const FADE = 0.18;

function findSkinned(root) {
  let found = null;
  root.traverse((o) => { if (!found && o.isSkinnedMesh) found = o; });
  return found;
}

/**
 * Cut a clip down to `[start, end]` seconds. `AnimationUtils.subclip` works in
 * frames, so the sample rate is read off the clip rather than assumed to be
 * Mixamo's 30: an export at another rate would otherwise be trimmed to the
 * wrong window without any error to notice.
 */
function trim(clip, [start, end]) {
  const times = clip.tracks[0] && clip.tracks[0].times;
  if (!times || times.length < 2) return clip;
  const fps = 1 / (times[1] - times[0]);
  const cut = THREE.AnimationUtils.subclip(clip, clip.name, Math.round(start * fps), Math.round(end * fps), fps);
  cut.name = clip.name;
  return cut;
}

export async function loadClips() {
  const loader = new FBXLoader();
  const entries = await Promise.all(Object.entries(CLIPS).map(async ([name, url]) => {
    try {
      const fbx = await loader.loadAsync(url);
      const clip = fbx.animations && fbx.animations[0];
      if (!clip) return null;
      clip.name = name;
      // Mixamo bakes forward travel into the hips. The track moves the world,
      // so root motion has to go or she drifts out of her lane.
      clip.tracks = clip.tracks.filter((t) => !/mixamorig:?Hips\.position$/i.test(t.name));
      return [name, TRIM[name] ? trim(clip, TRIM[name]) : clip];
    } catch (err) {
      console.warn(`[soda] clip ${name} failed to load`, err);
      return null;
    }
  }));
  return Object.fromEntries(entries.filter(Boolean));
}

export class Animator {
  constructor() {
    this.mixer = null;
    this.actions = {};
    this.current = null;
    this.ready = false;
    /** Seconds a trick clip still owns the body. Zero means the state machine. */
    this.trickT = 0;
    this.trickAir = false;
  }

  /**
   * @returns {boolean} true when the model can actually be animated. False
   * means the caller must keep its own procedural motion.
   */
  attach(model, clips) {
    const skinned = findSkinned(model);
    if (!skinned || !skinned.skeleton) {
      console.info('[soda] courier has no skeleton, keeping procedural motion');
      return false;
    }
    const names = Object.keys(clips);
    if (names.length === 0) return false;

    this.mixer = new THREE.AnimationMixer(model);
    for (const name of names) {
      const action = this.mixer.clipAction(clips[name]);
      action.enabled = true;
      this.actions[name] = action;
    }
    if (this.actions.jump) {
      this.actions.jump.setLoop(THREE.LoopOnce, 1);
      this.actions.jump.clampWhenFinished = true;
    }
    if (this.actions.knocked) {
      this.actions.knocked.setLoop(THREE.LoopOnce, 1);
      this.actions.knocked.clampWhenFinished = true;
    }
    for (const name of ['flip', 'runflip', 'victory']) {
      if (!this.actions[name]) continue;
      this.actions[name].setLoop(THREE.LoopOnce, 1);
      this.actions[name].clampWhenFinished = true;
    }
    this.ready = true;
    this.play('skate');
    return true;
  }

  play(name, { restart = false } = {}) {
    if (!this.ready) return;
    const next = this.actions[name];
    if (!next || (this.current === next && !restart)) return;
    next.reset().fadeIn(FADE).play();
    if (this.current && this.current !== next) this.current.fadeOut(FADE);
    this.current = next;
  }

  /**
   * Hand the body to a trick clip for the length of the trick.
   *
   * @param {string} key trick key, e.g. `spin720`
   * @param {number} window seconds the trick should last — the pose duration
   *   for a spin, the remaining airtime for a flip. The clip is retimed to fit
   *   it, because a 2 s Mixamo flip inside a 0.67 s jump lands her upside down.
   * @param {boolean} inAir true if landing should cut the clip short
   * @returns {boolean} false when there is no clip, so the caller falls back
   *   to its procedural pose.
   */
  playTrick(key, window, inAir) {
    const name = TRICK_CLIPS[key];
    const action = this.ready && name && this.actions[name];
    if (!action) return false;
    // Refuse rather than cram. Below this the clip cannot finish before she
    // lands even at full speed, and a flip cut off halfway is worse than the
    // procedural pose it would have replaced.
    if (action.getClip().duration / MAX_TRICK_SPEED > window * 1.15) return false;
    // Floor as well as ceiling: stretched much under 1x a trimmed clip stops
    // reading as a snap and starts reading as slow motion.
    action.timeScale = THREE.MathUtils.clamp(action.getClip().duration / window, 0.85, MAX_TRICK_SPEED);
    this.trickT = window;
    this.trickAir = inAir;
    this.play(name, { restart: true });
    return true;
  }

  /** The finish line. Plays out and holds; nothing interrupts it. */
  celebrate() {
    if (!this.ready || !this.actions.victory) return false;
    this.actions.victory.timeScale = 1;
    this.trickT = 99;
    this.trickAir = false;
    this.play('victory', { restart: true });
    return true;
  }

  /**
   * Stretch the jump clip over the jump actually being made.
   *
   * The clip is 0.83 s and clamps on its last frame. A zone with low gravity,
   * or a spring pad, buys well over a second of air, so she reached the top of
   * the clip and hung there in a frozen high-jump pose until she landed.
   * Timing the clip to the arc means it always lands when she does.
   */
  _fitJump(player) {
    const jump = this.actions.jump;
    if (!jump || this._fitted) return;
    this._fitted = true;
    const g = player.physics.gravity;
    const air = g < 0 ? (2 * Math.max(player.vy, 1)) / -g : 0.67;
    jump.timeScale = THREE.MathUtils.clamp(jump.getClip().duration / air, 0.45, 1.6);
  }

  /** Drive state straight off the player's physics rather than duplicating it. */
  syncTo(player) {
    if (!this.ready) return;
    // Re-fit on the next take-off, not every frame: vy falls through the arc.
    if (!player.airborne || player.grinding) this._fitted = false;
    // A crash outranks a trick; landing ends an air trick early so she is
    // never still flipping with her skates on the road.
    if (player.stunned > 0) this.trickT = 0;
    else if (this.trickAir && !player.airborne) this.trickT = 0;
    else if (this.trickT > 0) return;

    if (player.stunned > 0) this.play('knocked');
    else if (player.flying) this.play('fly');
    // A grind sets `airborne` because her feet are off the road, but it is a
    // ride, not a jump. The jump clip is LoopOnce and clamps, so playing it
    // here froze her on the last frame of a high jump for the whole rail.
    else if (player.grinding) this.play('skate');
    else if (player.airborne) { this._fitJump(player); this.play('jump'); }
    else this.play('skate');
  }

  update(dt) {
    if (this.trickT > 0) this.trickT = Math.max(0, this.trickT - dt);
    if (this.mixer) this.mixer.update(dt);
  }
}
