/**
 * Input: keyboard for desktop, swipes for touch. Emits four intents only
 * (left / right / jump / slide) so the whole game stays one-thumb playable.
 */
const SWIPE_MIN = 26;      // px before a drag counts as a swipe
const TAP_MAX_MS = 260;    // a quick flick is a swipe even if short

export function createInput(target) {
  const listeners = new Set();
  let start = null;
  let fired = false;

  const emit = (intent) => { for (const fn of listeners) fn(intent); };

  const onKey = (e) => {
    const map = {
      ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', Space: 'jump',
      ArrowDown: 'slide', KeyS: 'slide',
    };
    const intent = map[e.code];
    if (!intent) return;
    e.preventDefault();
    emit(intent);
  };

  const onDown = (e) => {
    const t = e.touches ? e.touches[0] : e;
    start = { x: t.clientX, y: t.clientY, at: performance.now() };
    fired = false;
  };

  const onMove = (e) => {
    if (!start || fired) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
    fired = true;
    if (Math.abs(dx) > Math.abs(dy)) emit(dx > 0 ? 'right' : 'left');
    else emit(dy > 0 ? 'slide' : 'jump');
  };

  const onUp = (e) => {
    if (!start) return;
    const quick = performance.now() - start.at < TAP_MAX_MS;
    // A tap with no swipe still deserves a response: jump.
    if (!fired && quick) emit('jump');
    start = null;
  };

  window.addEventListener('keydown', onKey);
  target.addEventListener('touchstart', onDown, { passive: true });
  target.addEventListener('touchmove', onMove, { passive: true });
  target.addEventListener('touchend', onUp, { passive: true });
  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);

  return {
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    dispose() {
      window.removeEventListener('keydown', onKey);
      listeners.clear();
    },
  };
}
