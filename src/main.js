import * as THREE from 'three';
import { createStage } from './render/stage.js';
import { createInput } from './core/input.js';
import { createHud } from './ui/hud.js';
import { createAudio } from './game/audio.js';
import { createSfx } from './game/sfx.js';
import { keepAwake, createPauser, describeViewport } from './core/device.js';
import { createBackButton, exitApp } from './core/backbutton.js';
import { Game } from './game/game.js';
import { records } from './game/records.js';
import { ZONES } from './world/zones.js';

const canvas = document.getElementById('stage');
const stage = createStage(canvas);
const hud = createHud().init();
const audio = createAudio();
const sfx = createSfx(audio);
const game = new Game(stage, hud, 1, audio, sfx);

const input = createInput(canvas);
input.on((intent) => game.intent(intent));

const openZones = () => { hud.showZones(ZONES, records); back.trap(); };
const backToTitle = () => { hud.showTitle(); back.release(); };

hud.bindNav({
  openZones,
  backToTitle,
  retry: () => { game.start(); back.trap(); },
  pickZone: (zone) => { game.start(zone); back.trap(); },
  pause: () => game.pause(),
  resume: () => game.resume(),
});

/**
 * Back means "up one level": a run pauses, a paused run drops to the zone
 * list, the zone list drops to the title, and only the title exits.
 */
const back = createBackButton({
  onBack() {
    const screen = hud.current();
    if (screen === 'run') return game.pause();
    if (screen === 'pause' || screen === 'over' || screen === 'clear') { openZones(); return true; }
    if (screen === 'zones') { hud.showTitle(); return false; }
    return false;
  },
  onExit: exitApp,
});
hud.bindMute(audio);

// `?hero` (ou `?embed`) : mode vitrine embarqué (hero de portfolio). On saute
// l'écran titre et la liste des zones, et on démarre directement une course
// jouable dans The Ring.
const HERO = (() => {
  const p = new URLSearchParams(location.search);
  return p.has('hero') || p.has('embed');
})();

if (HERO) {
  game.start();
} else {
  hud.showTitle();
  // Browsers refuse to start audio before a real gesture, so the menu track is
  // queued now and released by whichever interaction happens first.
  audio.playMenu();
}
for (const evt of ['pointerdown', 'touchstart', 'keydown']) {
  window.addEventListener(evt, () => { audio.unlock(); sfx.unlock(); }, { once: true });
}

// Phone plumbing: keep the screen alive during a run, and freeze rather than
// fast-forward when a notification steals the tab.
keepAwake();
let last = performance.now();
const pauser = createPauser(() => { last = performance.now(); });

function frame(now) {
  requestAnimationFrame(frame);
  if (pauser.paused) { last = now; return; }
  // Clamp dt: a slow first shader compile must never teleport the player
  // through an obstacle.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  stage.render();
}
requestAnimationFrame(frame);

// Expose the running scene for debugging captures. `capture` forces a fixed
// viewport, steps the simulation deterministically and POSTs a PNG to the dev
// server, because reading a live WebGL canvas over the automation bridge stalls.
window.__soda = {
  stage, game, audio, sfx, THREE, describeViewport,
  async capture(name, { w = 900, h = 1600, steps = 0, dt = 1 / 60 } = {}) {
    const canvas = stage.renderer.domElement;
    stage.renderer.setPixelRatio(1);
    stage.renderer.setSize(w, h, false);
    stage.composer.setSize(w, h);
    stage.camera.aspect = w / h;
    stage.camera.fov = h > w ? 74 : 58;
    stage.camera.updateProjectionMatrix();
    for (let i = 0; i < steps; i++) game.update(dt);
    stage.render();
    const data = canvas.toDataURL('image/png');
    await fetch('/__shot', { method: 'POST', body: `${name}|${data}` });
    return `${name} ${w}x${h}`;
  },
};
