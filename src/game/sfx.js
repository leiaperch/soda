/**
 * Sound effects, synthesised at runtime with the Web Audio API.
 *
 * No files on purpose. Every cue here is under half a second, so shipping
 * them as audio would add megabytes and a load order for sounds that are
 * cheaper to generate than to decode. It also means pitch can follow game
 * state (the CELL chime climbs with a pickup streak) without pre-baking
 * variants.
 *
 * The AudioContext is created lazily on the first cue: browsers refuse to
 * start one before a user gesture, exactly like the music decks.
 */

const MASTER = 0.5;

export function createSfx(audio) {
  let ctx = null;
  let master = null;
  let streak = 0;
  let lastCell = 0;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);
    return ctx;
  }

  const live = () => !(audio && audio.muted) && ensure();

  /** One oscillator with an exponential pitch slide and a percussive envelope. */
  function tone({ type = 'sine', from, to = from, dur = 0.12, gain = 0.3, delay = 0, curve = 'exp' }) {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(to, t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.015, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtered white noise, for impacts and spray. */
  function noise({ dur = 0.2, gain = 0.25, from = 2400, to = 300, q = 1, delay = 0 }) {
    const t0 = ctx.currentTime + delay;
    const frames = Math.ceil(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t0);
  }

  return {
    /** Safe to call from the first gesture, same as the music decks. */
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
    },

    jump() {
      if (!live()) return;
      tone({ type: 'triangle', from: 330, to: 760, dur: 0.14, gain: 0.22 });
      noise({ dur: 0.09, gain: 0.08, from: 900, to: 2600 });
    },

    land() {
      if (!live()) return;
      tone({ type: 'sine', from: 190, to: 80, dur: 0.13, gain: 0.3 });
      noise({ dur: 0.08, gain: 0.14, from: 1400, to: 240 });
    },

    slide() {
      if (!live()) return;
      noise({ dur: 0.34, gain: 0.16, from: 3200, to: 700, q: 3 });
    },

    /** A mid-air spin. Pitched up per step so the ladder is audible. */
    spin(step = 1) {
      if (!live()) return;
      const base = 520 * Math.pow(1.26, step - 1);
      noise({ dur: 0.2, gain: 0.13, from: 700, to: 3400, q: 2.5 });
      tone({ type: 'triangle', from: base, to: base * 1.9, dur: 0.16, gain: 0.16 });
    },

    /** Climbs with an uninterrupted pickup streak, then resets. */
    cell(now) {
      if (!live()) return;
      streak = now - lastCell < 1.2 ? Math.min(streak + 1, 11) : 0;
      lastCell = now;
      const base = 740 * Math.pow(2, streak / 12);
      tone({ type: 'triangle', from: base, dur: 0.07, gain: 0.18 });
      tone({ type: 'sine', from: base * 2, dur: 0.09, gain: 0.1, delay: 0.02 });
    },

    relay() {
      if (!live()) return;
      for (const [i, f] of [392, 523, 659, 784].entries()) {
        tone({ type: 'triangle', from: f, dur: 0.42 - i * 0.05, gain: 0.14, delay: i * 0.035 });
      }
      noise({ dur: 0.4, gain: 0.07, from: 400, to: 4200, q: 0.6 });
    },

    crash() {
      if (!live()) return;
      noise({ dur: 0.34, gain: 0.34, from: 2600, to: 120, q: 0.8 });
      tone({ type: 'sawtooth', from: 220, to: 55, dur: 0.32, gain: 0.2 });
    },

    clean() {
      if (!live()) return;
      tone({ type: 'sine', from: 1180, to: 1560, dur: 0.09, gain: 0.12 });
    },

    /** Surfing a swell on The Shore. */
    surf() {
      if (!live()) return;
      noise({ dur: 0.45, gain: 0.2, from: 600, to: 3600, q: 0.7 });
      tone({ type: 'sine', from: 300, to: 900, dur: 0.4, gain: 0.14 });
    },

    splash() {
      if (!live()) return;
      noise({ dur: 0.3, gain: 0.24, from: 3000, to: 500, q: 1.5 });
    },

    /** Landing on a rail in The Market: metal ring plus a sustained scrape. */
    grind() {
      if (!live()) return;
      tone({ type: 'square', from: 1300, to: 1700, dur: 0.1, gain: 0.1 });
      noise({ dur: 0.5, gain: 0.12, from: 2200, to: 2600, q: 8 });
    },

    finish() {
      if (!live()) return;
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.5, gain: 0.16, delay: i * 0.09 }));
      noise({ dur: 0.9, gain: 0.06, from: 500, to: 5000, q: 0.5, delay: 0.1 });
    },
  };
}
