/**
 * Phone-specific plumbing. None of this matters in a desktop browser, all of
 * it matters the first time you actually hold the game in your hand.
 */

/**
 * Keeps the screen on during a run.
 *
 * A phone dims and sleeps after about 30 seconds of no touch input, and this
 * game is played with the thumb barely moving. Without a wake lock the screen
 * dies mid-run, which reads as the game freezing.
 *
 * The lock is dropped by the browser whenever the tab is hidden, so it has to
 * be re-acquired on the way back rather than taken once.
 */
export function keepAwake() {
  if (!('wakeLock' in navigator)) return { release() {} };

  let lock = null;
  let wanted = true;

  const acquire = async () => {
    if (!wanted || lock || document.hidden) return;
    try {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } catch {
      // Denied on low battery, or not allowed in this context. Not fatal.
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) acquire();
  });
  acquire();

  return {
    release() {
      wanted = false;
      if (lock) { lock.release(); lock = null; }
    },
  };
}

/**
 * Freezes the game while the tab is hidden and reports when it comes back.
 *
 * A notification or an incoming call should not cost the player their run,
 * and resuming must not hand the loop a two-minute delta.
 */
export function createPauser(onResume) {
  let paused = document.hidden;
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused && onResume) onResume();
  });
  return { get paused() { return paused; } };
}

/** Which viewport we are actually on, for the record and for debugging. */
export function describeViewport() {
  return {
    css: [window.innerWidth, window.innerHeight],
    dpr: window.devicePixelRatio,
    standalone: window.matchMedia('(display-mode: fullscreen)').matches
      || window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true,
    touch: navigator.maxTouchPoints > 0,
    cores: navigator.hardwareConcurrency || null,
  };
}
