import { formatTime } from '../game/records.js';
import { POWERUPS } from '../game/powerups.js';

/**
 * HUD and screens. All markup lives in index.html (cards come from a
 * <template>); this module only clones, toggles classes and writes
 * textContent, so there is no string-built DOM anywhere.
 */
export function createHud() {
  const el = {};
  const api = {};
  let lowCharge = false;
  let onPickZone = null;
  let nextZone = null;
  let powerSig = '';
  const powerChips = new Map();

  api.init = (doc = document) => {
    el.hud = doc.getElementById('hud');
    el.chargeFill = doc.getElementById('chargeFill');
    el.distance = doc.getElementById('statDistance');
    el.speed = doc.getElementById('statSpeed');
    el.best = doc.getElementById('hudBest');
    el.toasts = doc.getElementById('toasts');
    el.tplToast = doc.getElementById('tplToast');
    el.powers = doc.getElementById('powers');
    el.tplPower = doc.getElementById('tplPower');
    el.trick = doc.getElementById('trick');
    el.trickName = doc.getElementById('trickName');
    el.trickScore = doc.getElementById('trickScore');
    el.trickMult = doc.getElementById('trickMult');
    el.trickTimer = doc.getElementById('trickTimer');
    el.flash = doc.getElementById('flash');
    el.vignette = doc.getElementById('vignette');

    el.progressFill = doc.getElementById('progressFill');

    el.screenTitle = doc.getElementById('screenTitle');
    el.screenZones = doc.getElementById('screenZones');
    el.screenOver = doc.getElementById('screenOver');
    el.screenClear = doc.getElementById('screenClear');

    el.clearZone = doc.getElementById('clearZone');
    el.clearTime = doc.getElementById('clearTime');
    el.clearCells = doc.getElementById('clearCells');
    el.clearStyle = doc.getElementById('clearStyle');
    el.clearClean = doc.getElementById('clearClean');
    el.clearRecord = doc.getElementById('clearRecord');
    el.clearUnlock = doc.getElementById('clearUnlock');
    el.btnNextZone = doc.getElementById('btnNextZone');
    el.btnClearZones = doc.getElementById('btnClearZones');

    el.zoneList = doc.getElementById('zoneList');
    el.tplZone = doc.getElementById('tplZone');

    el.overZone = doc.getElementById('overZone');
    el.overDistance = doc.getElementById('overDistance');
    el.overTime = doc.getElementById('overTime');
    el.overCells = doc.getElementById('overCells');
    el.overStyle = doc.getElementById('overStyle');
    el.overRecord = doc.getElementById('overRecord');

    el.btnStart = doc.getElementById('btnStart');
    el.btnRetry = doc.getElementById('btnRetry');
    el.btnChangeZone = doc.getElementById('btnChangeZone');
    el.btnBackTitle = doc.getElementById('btnBackTitle');
    el.btnMute = doc.getElementById('btnMute');
    el.btnPause = doc.getElementById('btnPause');

    el.screenPause = doc.getElementById('screenPause');
    el.pauseZone = doc.getElementById('pauseZone');
    el.pauseDistance = doc.getElementById('pauseDistance');
    el.pauseCells = doc.getElementById('pauseCells');
    el.btnResume = doc.getElementById('btnResume');
    el.btnQuitRun = doc.getElementById('btnQuitRun');

    el.zoneCard = doc.getElementById('zoneCard');
    el.zoneCardNum = doc.getElementById('zoneCardNum');
    el.zoneCardName = doc.getElementById('zoneCardName');
    el.zoneCardSub = doc.getElementById('zoneCardSub');
    el.zoneCardMech = doc.getElementById('zoneCardMech');
    return api;
  };

  /**
   * The rules, in the zone, at the moment they start mattering. Telling a
   * player once on a select card and never again is how eleven distinct
   * mechanics turn into eleven confusing ones.
   */
  api.showZoneIntro = (zone, index) => {
    el.zoneCardNum.textContent = String(index);
    el.zoneCardName.textContent = zone.name;
    el.zoneCardSub.textContent = zone.subtitle;
    el.zoneCardMech.textContent = zone.mechanic;
    el.zoneCard.classList.remove('is-hidden');
    // restart the animation even if the last card is still on screen
    el.zoneCard.style.animation = 'none';
    void el.zoneCard.offsetWidth;
    el.zoneCard.style.animation = '';
    clearTimeout(el._cardTimer);
    el._cardTimer = setTimeout(() => el.zoneCard.classList.add('is-hidden'), 4200);
  };

  api.hideZoneIntro = () => {
    clearTimeout(el._cardTimer);
    el.zoneCard.classList.add('is-hidden');
  };

  api.bindMute = (audio) => {
    audio.onMuteChange((muted) => el.btnMute.classList.toggle('mute--off', muted));
    el.btnMute.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.toggleMute();
    });
  };

  /**
   * @param {object} handlers - openZones, backToTitle, retry, pickZone(zone)
   */
  api.bindNav = (handlers) => {
    onPickZone = handlers.pickZone;
    el.btnStart.addEventListener('click', handlers.openZones);
    el.btnChangeZone.addEventListener('click', handlers.openZones);
    el.btnClearZones.addEventListener('click', handlers.openZones);
    el.btnBackTitle.addEventListener('click', handlers.backToTitle);
    el.btnRetry.addEventListener('click', handlers.retry);
    el.btnNextZone.addEventListener('click', () => {
      if (nextZone) onPickZone(nextZone);
      else handlers.retry();
    });
    el.btnPause.addEventListener('click', (e) => { e.stopPropagation(); handlers.pause(); });
    el.btnResume.addEventListener('click', (e) => { e.stopPropagation(); handlers.resume(); });
    el.btnQuitRun.addEventListener('click', handlers.openZones);
  };

  const only = (screen) => {
    for (const s of [el.screenTitle, el.screenZones, el.screenOver, el.screenClear, el.screenPause]) {
      s.classList.toggle('is-hidden', s !== screen);
    }
    el.hud.classList.toggle('is-hidden', screen !== null);
    // The pause button belongs to a run, and a paused run still counts.
    el.btnPause.classList.toggle('is-hidden', screen !== null && screen !== el.screenPause);
  };

  /** Which screen is up, so navigation can decide what "back" means. */
  api.current = () => {
    if (!el.screenPause.classList.contains('is-hidden')) return 'pause';
    if (!el.screenZones.classList.contains('is-hidden')) return 'zones';
    if (!el.screenOver.classList.contains('is-hidden')) return 'over';
    if (!el.screenClear.classList.contains('is-hidden')) return 'clear';
    if (!el.screenTitle.classList.contains('is-hidden')) return 'title';
    return 'run';
  };

  /** Back to the run without touching any of its readouts. */
  api.hideOverlays = () => { only(null); };

  api.showPause = (run, zone) => {
    only(el.screenPause);
    api.hideZoneIntro();
    el.pauseZone.textContent = zone.name;
    el.pauseDistance.textContent = `${Math.floor(run.distance)} M`;
    el.pauseCells.textContent = String(run.cells);
  };

  api.showTitle = () => { only(el.screenTitle); };

  /** Rebuilt on every open so newly cleared unlocks show up immediately. */
  api.showZones = (zones, records) => {
    only(el.screenZones);
    api.hideZoneIntro();
    el.zoneList.replaceChildren();
    const built = zones.filter((z) => z.built);

    zones.forEach((zone, i) => {
      const card = el.tplZone.content.firstElementChild.cloneNode(true);
      const best = records.zone(zone.id);
      const mech = card.querySelector('.zone__mech');

      card.querySelector('.zone__num').textContent = String(i + 1);
      card.querySelector('.zone__name').textContent = zone.name;
      card.querySelector('.zone__sub').textContent = zone.subtitle;
      mech.textContent = `${zone.mechanic}  ·  ${zone.length} M`;

      const bestEl = card.querySelector('.zone__best');
      if (!zone.built) {
        card.classList.add('zone--locked', 'zone--soon');
        mech.textContent = `${zone.mechanic} — SOON`;
      } else if (!records.isUnlocked(zone, zones)) {
        card.classList.add('zone--locked');
        const previous = built[built.indexOf(zone) - 1];
        mech.textContent = `Clear ${previous.name} to unlock`;
      } else {
        bestEl.textContent = best.cleared ? formatTime(best.bestClearTime) : 'NEW';
        card.addEventListener('click', () => onPickZone && onPickZone(zone));
      }

      el.zoneList.appendChild(card);
    });
  };

  api.showRun = (zoneRecords, zone) => {
    only(null);
    el.vignette.classList.remove('vignette--low');
    lowCharge = false;
    el.progressFill.style.transform = 'scaleX(0)';
    el.powers.replaceChildren();
    powerChips.clear();
    powerSig = '';
    el.trick.classList.add('is-hidden');
    el.best.textContent = zoneRecords.cleared
      ? `${zone.name} · BEST ${formatTime(zoneRecords.bestClearTime)}`
      : `${zone.name} · ${zone.length} M`;
  };

  api.showOver = (run, beat, zone) => {
    only(el.screenOver);
    api.hideZoneIntro();
    el.vignette.classList.remove('vignette--low');
    el.overZone.textContent = zone.name;
    el.overDistance.textContent = String(Math.floor(run.distance));
    el.overTime.textContent = formatTime(run.time);
    el.overCells.textContent = String(run.cells);
    el.overStyle.textContent = String(run.style || 0);
    el.overRecord.classList.toggle('is-hidden', !(beat.distance || beat.time || beat.cells || beat.style));
  };

  api.showClear = (run, beat, zone, next) => {
    only(el.screenClear);
    api.hideZoneIntro();
    nextZone = next;
    el.vignette.classList.remove('vignette--low');
    el.clearZone.textContent = zone.name;
    el.clearTime.textContent = formatTime(run.time);
    el.clearCells.textContent = String(run.cells);
    el.clearStyle.textContent = String(run.style || 0);
    el.clearClean.textContent = run.clean ? 'YES' : 'NO';
    el.clearRecord.classList.toggle('is-hidden', !(beat.time || beat.style));
    el.clearUnlock.classList.toggle('is-hidden', !(beat.firstClear && next));
    if (beat.firstClear && next) el.clearUnlock.textContent = `${next.name} UNLOCKED`;
    el.btnNextZone.querySelector('.jelly__text').textContent = next ? 'NEXT ZONE' : 'RUN IT AGAIN';
  };

  api.update = (charge, maxCharge, distance, speed, zoneLength) => {
    const ratio = Math.max(0, charge / maxCharge);
    el.chargeFill.style.transform = `scaleX(${ratio})`;
    if (zoneLength) {
      el.progressFill.style.transform = `scaleX(${Math.min(1, distance / zoneLength)})`;
    }
    const low = ratio < 0.25;
    if (low !== lowCharge) {
      lowCharge = low;
      el.hud.classList.toggle('hud--low', low);
      el.vignette.classList.toggle('vignette--low', low);
    }
    el.distance.textContent = String(Math.floor(distance));
    el.speed.textContent = String(Math.round(speed * 3.6));
  };

  /**
   * One chip per running power-up, rebuilt only when the set changes so the
   * entry animation does not restart sixty times a second. The bar inside is
   * updated every frame.
   */
  api.updatePowers = (power) => {
    const keys = [...power.active.keys()];
    const signature = keys.join(',');
    if (signature !== powerSig) {
      powerSig = signature;
      el.powers.replaceChildren();
      powerChips.clear();
      for (const key of keys) {
        const def = POWERUPS[key];
        const chip = el.tplPower.content.firstElementChild.cloneNode(true);
        chip.style.setProperty('--power', `#${def.colour.getHexString()}`);
        chip.querySelector('.power__label').textContent = def.label;
        el.powers.appendChild(chip);
        powerChips.set(key, chip);
      }
    }
    for (const [key, chip] of powerChips) {
      const left = power.remaining(key);
      chip.querySelector('.power__fill').style.transform = `scaleX(${left})`;
      chip.classList.toggle('power--ending', left < 0.25);
    }
  };

  /**
   * The running chain. `label` is the trick just landed, or null to refresh
   * without re-triggering the pop animation (banking, crashing, ticking).
   */
  api.showTrick = (chain, label) => {
    if (!chain.active) { el.trick.classList.add('is-hidden'); return; }
    el.trick.classList.remove('is-hidden');
    if (label) {
      el.trickName.textContent = label;
      el.trick.style.animation = 'none';
      void el.trick.offsetWidth;
      el.trick.style.animation = '';
    }
    el.trickScore.textContent = String(Math.round(chain.score));
    el.trickMult.textContent = `x${chain.multiplier}`;
  };

  /** Every frame: just the countdown, so the chain's urgency is visible. */
  api.tickTrick = (chain) => {
    if (!chain.active) { el.trick.classList.add('is-hidden'); return; }
    el.trickTimer.style.transform = `scaleX(${Math.max(0, chain.timer / 2.7)})`;
    el.trickScore.textContent = String(Math.round(chain.score));
    el.trickMult.textContent = `x${chain.multiplier}`;
  };

  api.toast = (text, kind) => {
    const node = el.tplToast.content.firstElementChild.cloneNode(true);
    if (kind) node.classList.add(`toast--${kind}`);
    node.querySelector('.toast__text').textContent = text;
    el.toasts.appendChild(node);
    setTimeout(() => node.remove(), 1000);
  };

  /** Full-screen hit flash. Restarting the animation needs a reflow poke. */
  api.flash = () => {
    el.flash.classList.remove('flash--on');
    void el.flash.offsetWidth;
    el.flash.classList.add('flash--on');
  };

  return api;
}
