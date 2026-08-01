import { formatTime } from '../game/records.js';

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

  api.init = (doc = document) => {
    el.hud = doc.getElementById('hud');
    el.chargeFill = doc.getElementById('chargeFill');
    el.distance = doc.getElementById('statDistance');
    el.speed = doc.getElementById('statSpeed');
    el.best = doc.getElementById('hudBest');
    el.toasts = doc.getElementById('toasts');
    el.tplToast = doc.getElementById('tplToast');
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
    el.clearRelays = doc.getElementById('clearRelays');
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
    el.overRelays = doc.getElementById('overRelays');
    el.overRecord = doc.getElementById('overRecord');

    el.btnStart = doc.getElementById('btnStart');
    el.btnRetry = doc.getElementById('btnRetry');
    el.btnChangeZone = doc.getElementById('btnChangeZone');
    el.btnBackTitle = doc.getElementById('btnBackTitle');
    el.btnMute = doc.getElementById('btnMute');
    return api;
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
  };

  const only = (screen) => {
    for (const s of [el.screenTitle, el.screenZones, el.screenOver, el.screenClear]) {
      s.classList.toggle('is-hidden', s !== screen);
    }
    el.hud.classList.toggle('is-hidden', screen !== null);
  };

  api.showTitle = () => { only(el.screenTitle); };

  /** Rebuilt on every open so newly cleared unlocks show up immediately. */
  api.showZones = (zones, records) => {
    only(el.screenZones);
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
    el.best.textContent = zoneRecords.cleared
      ? `${zone.name} · BEST ${formatTime(zoneRecords.bestClearTime)}`
      : `${zone.name} · ${zone.length} M`;
  };

  api.showOver = (run, beat, zone) => {
    only(el.screenOver);
    el.vignette.classList.remove('vignette--low');
    el.overZone.textContent = zone.name;
    el.overDistance.textContent = String(Math.floor(run.distance));
    el.overTime.textContent = formatTime(run.time);
    el.overCells.textContent = String(run.cells);
    el.overRelays.textContent = String(run.relays);
    el.overRecord.classList.toggle('is-hidden', !(beat.distance || beat.time || beat.cells));
  };

  api.showClear = (run, beat, zone, next) => {
    only(el.screenClear);
    nextZone = next;
    el.vignette.classList.remove('vignette--low');
    el.clearZone.textContent = zone.name;
    el.clearTime.textContent = formatTime(run.time);
    el.clearCells.textContent = String(run.cells);
    el.clearRelays.textContent = String(run.relays);
    el.clearClean.textContent = run.clean ? 'YES' : 'NO';
    el.clearRecord.classList.toggle('is-hidden', !beat.time);
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
