// Tiny one-shot signal: the intro fires "car" at its car label; the hero car
// waits for it before rising. If there is no intro this load, it fires at once.
let fired = false;
const listeners = new Set<() => void>();

export function fireCarCue() {
  if (fired) return;
  fired = true;
  listeners.forEach((fn) => fn());
  listeners.clear();
}

export function onCarCue(fn: () => void) {
  if (fired) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
}
