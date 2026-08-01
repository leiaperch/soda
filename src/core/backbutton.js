/**
 * Android's back button, and the browser's.
 *
 * Left alone, back closes the app mid-run. That is the single fastest way to
 * earn a one-star review, and Play reviewers check it. Here it means "go up
 * one level" and only exits from the title screen.
 *
 * The mechanism is the same on both: keep one dummy history entry pushed
 * whenever we are deeper than the title, so the platform's back gesture fires
 * `popstate` instead of leaving the page, then re-push it after handling.
 */
export function createBackButton({ onBack, onExit }) {
  let trapped = false;

  const trap = () => {
    if (trapped) return;
    try { history.pushState({ soda: 1 }, ''); trapped = true; } catch { /* no history */ }
  };

  const handle = () => {
    trapped = false;
    // onBack returns false when there is nowhere left to go up to.
    if (onBack()) trap();
    else if (onExit) onExit();
  };

  window.addEventListener('popstate', handle);

  // Inside a Capacitor shell the hardware button is its own event, and it does
  // not always surface as popstate.
  if (window.Capacitor) {
    import('@capacitor/app')
      .then(({ App }) => App.addListener('backButton', handle))
      .catch(() => { /* plugin absent, popstate still covers it */ });
  }

  return { trap, release() { trapped = false; } };
}

/** Closes the app when running in a Capacitor shell; a no-op on the web. */
export function exitApp() {
  if (!window.Capacitor) return;
  import('@capacitor/app').then(({ App }) => App.exitApp()).catch(() => {});
}
