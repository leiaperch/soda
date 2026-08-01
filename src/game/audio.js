const KEY = 'soda.muted.v1';

/**
 * Music. Two <audio> elements crossfading between them, rather than the Web
 * Audio API: these are full-length streamed tracks, so decoding them into
 * AudioBuffers would cost tens of megabytes of RAM on a phone for no gain.
 *
 * Autoplay is blocked until the player touches the screen, which is why
 * nothing starts on load and `unlock()` is wired to the first gesture.
 */

const TRACKS = {
  menu: 'audio/neon-glitch.mp3',
  // Every zone owns a theme now, so this bag is only a safety net for a zone
  // that forgets to declare one.
  run: [
    'audio/neon-tides.mp3',
    'audio/electronicore-finale.mp3',
    'audio/sugar-crash-core.mp3',
  ],
};

const FADE_MS = 700;
const MENU_VOLUME = 0.42;
const RUN_VOLUME = 0.72;

export function createAudio() {
  const decks = [makeDeck(), makeDeck()];
  let active = 0;
  let unlocked = false;
  let pending = null;
  let muted = readMuted();
  let order = [];
  const listeners = new Set();

  function makeDeck() {
    const el = new Audio();
    el.loop = true;
    el.preload = 'none';
    el.volume = 0;
    // The track plays at its own tempo, always. Tying playbackRate to the run
    // speed was a neat trick for ten seconds and exhausting after a minute:
    // the pitch climb never resolves, so it reads as the song going wrong.
    // Speed is sold by the camera and the world, not by detuning the music.
    return el;
  }

  function readMuted() {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  }

  function fade(el, to, ms, onDone) {
    if (el._fade) clearInterval(el._fade);
    const from = el.volume;
    const start = performance.now();
    el._fade = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * t));
      if (t >= 1) {
        clearInterval(el._fade);
        el._fade = null;
        if (onDone) onDone();
      }
    }, 33);
  }

  /** Fisher-Yates over the run pool so the same track never repeats twice in
   *  a row across a session, unlike picking at random each time. */
  function nextRunTrack() {
    if (order.length === 0) {
      order = TRACKS.run.slice();
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    return order.pop();
  }

  function crossfadeTo(src, volume) {
    if (!unlocked) { pending = { src, volume }; return; }
    const current = decks[active];
    const next = decks[1 - active];
    if (current.src && current.src.endsWith(src) && !current.paused) {
      fade(current, muted ? 0 : volume, FADE_MS);
      return;
    }
    next.src = src;
    next.currentTime = 0;
    next.volume = 0;
    const play = next.play();
    if (play && play.catch) play.catch(() => { /* still gesture-locked */ });
    fade(next, muted ? 0 : volume, FADE_MS);
    fade(current, 0, FADE_MS, () => { current.pause(); });
    active = 1 - active;
  }

  const api = {
    /** Call from the first real user gesture. Safe to call repeatedly. */
    unlock() {
      if (unlocked) return;
      unlocked = true;
      if (pending) {
        const { src, volume } = pending;
        pending = null;
        crossfadeTo(src, volume);
      }
    },

    playMenu() { crossfadeTo(TRACKS.menu, MENU_VOLUME); },

    /** A zone may own its theme; otherwise it gets one from the shuffled bag. */
    playRun(zone) {
      crossfadeTo(zone && zone.track ? zone.track : nextRunTrack(), RUN_VOLUME);
    },

    /** Drop the music back without stopping it, for the end screens. */
    duck() { fade(decks[active], muted ? 0 : MENU_VOLUME * 0.6, FADE_MS); },


    get muted() { return muted; },

    toggleMute() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* private mode */ }
      fade(decks[active], muted ? 0 : RUN_VOLUME, 220);
      for (const fn of listeners) fn(muted);
      return muted;
    },

    onMuteChange(fn) { listeners.add(fn); fn(muted); },

    /** Debug read-out: which deck is live, on what track, at what volume. */
    state() {
      return {
        unlocked,
        muted,
        queued: pending ? pending.src : null,
        decks: decks.map((d, i) => ({
          active: i === active,
          track: d.src ? d.src.split('/').pop() : null,
          playing: !d.paused,
          volume: +d.volume.toFixed(2),
          at: +d.currentTime.toFixed(1),
        })),
      };
    },
  };

  return api;
}
