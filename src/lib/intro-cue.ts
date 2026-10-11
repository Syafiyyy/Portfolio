// Tiny one-shot signal: the intro fires "portrait" at the end of its timeline;
// the hero portrait waits for it before running its scan reveal. If there is
// no intro this load, it fires at once.
let fired = false;
const listeners = new Set<() => void>();

export function firePortraitCue() {
  if (fired) return;
  fired = true;
  listeners.forEach((fn) => fn());
  listeners.clear();
}

export function onPortraitCue(fn: () => void) {
  if (fired) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
}
