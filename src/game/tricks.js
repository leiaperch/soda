/**
 * Tricks.
 *
 * CLEAN and NEAR MISS used to hand out 2.0 and 1.2 charge. That is noise: it
 * is below the resolution a player can feel, so doing things stylishly paid
 * nothing and the game was only ever about not dying.
 *
 * Here the same events are worth nothing on their own. They are LINKS in a
 * chain. Each one adds points and refreshes a short window; the multiplier is
 * how many links you have going. When the window closes the chain is BANKED
 * as charge, all at once, and that is a real number. Crash and the chain is
 * lost unbanked.
 *
 * So the risk is legible: a long chain is worth a lot and you are carrying it
 * through obstacles. Cash out early and safe, or keep it alive and pay for it.
 */

export const TRICKS = {
  ollie:    { label: 'OLLIE', value: 40 },
  slide:    { label: 'SLIDE', value: 40 },
  grab:     { label: 'GRAB', value: 90 },
  bigAir:   { label: 'BIG AIR', value: 130 },
  close:    { label: 'CLOSE ONE', value: 70 },
  clean:    { label: 'CLEAN', value: 60 },
  grind:    { label: 'GRIND', value: 55 },
  surf:     { label: 'SURF', value: 150 },
  thread:   { label: 'THREAD', value: 150 },
  bump:     { label: 'BUMP', value: 100 },
  boing:    { label: 'BOING', value: 110 },
  carried:  { label: 'CARRIED', value: 70 },
};

const WINDOW = 2.7;        // seconds a chain survives without a new link
const MAX_MULT = 8;
const CHARGE_PER_POINT = 1 / 70;
const MAX_BANK = 24;       // charge, so a monster chain cannot trivialise a zone

export class TrickChain {
  constructor() { this.reset(); }

  reset() {
    this.score = 0;        // points in the chain currently running
    this.links = 0;
    this.timer = 0;
    this.total = 0;        // banked style points for the whole run
    this.best = 0;         // longest single chain this run
    this.last = null;      // label of the most recent link, for the HUD
  }

  get multiplier() { return Math.min(MAX_MULT, Math.max(1, this.links)); }
  get active() { return this.timer > 0; }

  /**
   * Add a link. Repeating the same trick back to back still scores but does
   * not raise the multiplier, so mashing one input is not a strategy.
   */
  add(key) {
    const def = TRICKS[key];
    if (!def) return null;
    const repeated = this.last === def.label;
    if (!repeated) this.links++;
    this.score += Math.round(def.value * this.multiplier);
    this.timer = WINDOW;
    this.last = def.label;
    return def;
  }

  /** Grinding pays while you stay on the rail rather than once on landing. */
  addContinuous(key, dt) {
    const def = TRICKS[key];
    if (!def) return;
    if (this.last !== def.label) { this.links++; this.last = def.label; }
    this.score += def.value * dt;
    this.timer = WINDOW;
  }

  /**
   * @returns {{score:number, links:number, charge:number}|null} the banked
   * chain, on the frame the window closes.
   */
  update(dt) {
    if (this.timer <= 0) return null;
    this.timer -= dt;
    if (this.timer > 0) return null;
    const score = Math.round(this.score);
    const links = this.links;
    const charge = Math.min(MAX_BANK, score * CHARGE_PER_POINT);
    this.total += score;
    this.best = Math.max(this.best, score);
    this.score = 0;
    this.links = 0;
    this.last = null;
    this.timer = 0;
    return { score, links, charge };
  }

  /** Crashing costs the chain. Nothing is banked. */
  drop() {
    const lost = Math.round(this.score);
    this.score = 0;
    this.links = 0;
    this.timer = 0;
    this.last = null;
    return lost;
  }
}
