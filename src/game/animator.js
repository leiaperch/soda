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
};

const FADE = 0.18;

function findSkinned(root) {
  let found = null;
  root.traverse((o) => { if (!found && o.isSkinnedMesh) found = o; });
  return found;
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
      return [name, clip];
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
    if (this.mixer) this.mixer.update(dt);
  }
}
