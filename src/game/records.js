const KEY = 'soda.records.v3';

const EMPTY_ZONE = {
  bestDistance: 0,
  bestClearTime: 0,   // 0 means never cleared
  bestCells: 0,
  bestStyle: 0,       // best total trick score in a single run
  cleared: false,
  cleanRun: false,
};

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { runs: 0, zones: {}, ...raw };
  } catch {
    return { runs: 0, zones: {} };
  }
}

function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* private mode, ignore */ }
}

/**
 * Records are the whole meta loop of SODA: there is no power progression, so
 * the only things that grow between runs are the numbers on the board and the
 * set of zones you are allowed into.
 *
 * Zones unlock by CLEARING the previous one, not by racking up distance. A
 * distance threshold can be ground out by replaying zone one; finishing
 * cannot, so it actually means you learned something.
 */
export const records = {
  get all() { return read(); },

  zone(id) {
    return { ...EMPTY_ZONE, ...(read().zones[id] || {}) };
  },

  bestOverall() {
    const data = read();
    return Object.values(data.zones).reduce((m, z) => Math.max(m, z.bestDistance || 0), 0);
  },

  /** @param {Array} zones - the full ordered zone list. */
  isUnlocked(zone, zones) {
    if (!zone.built) return false;
    const built = zones.filter((z) => z.built);
    const index = built.indexOf(zone);
    if (index <= 0) return true;
    return this.zone(built[index - 1].id).cleared;
  },

  /** Returns which records the finished run beat, for the end screen. */
  submit(zoneId, run) {
    const data = read();
    const z = { ...EMPTY_ZONE, ...(data.zones[zoneId] || {}) };
    const beat = { distance: false, time: false, cells: false, style: false, firstClear: false };

    if (run.distance > z.bestDistance) { z.bestDistance = run.distance; beat.distance = true; }
    if (run.cells > z.bestCells) { z.bestCells = run.cells; beat.cells = true; }
    if ((run.style || 0) > z.bestStyle) { z.bestStyle = run.style; beat.style = true; }
    if (run.cleared) {
      if (!z.cleared) { z.cleared = true; beat.firstClear = true; }
      // Fastest clear, so this one is a minimum.
      if (z.bestClearTime === 0 || run.time < z.bestClearTime) {
        z.bestClearTime = run.time;
        beat.time = true;
      }
      if (run.clean) z.cleanRun = true;
    }

    data.zones[zoneId] = z;
    data.runs = (data.runs || 0) + 1;
    write(data);
    return beat;
  },
};

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
