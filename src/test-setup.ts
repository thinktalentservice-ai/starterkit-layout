import "@testing-library/jest-dom/vitest";

/**
 * jsdom implements no `matchMedia`. `useIsDesktop` calls it in an effect on
 * every mount, so without this stub every single component test in this package
 * throws before it asserts anything.
 *
 * The stub is settable: `setMatchMedia(false)` makes the shell believe it is
 * below the lg breakpoint, which is the only way to exercise the off-canvas
 * drawer, the `inert` matrix and the overlay — i.e. most of what is worth
 * testing here.
 */
type Listener = (e: MediaQueryListEvent) => void;

const listeners = new Set<Listener>();
let matches = true;

export function setMatchMedia(next: boolean): void {
  if (next === matches) return;
  matches = next;
  for (const fn of listeners) fn({ matches } as MediaQueryListEvent);
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, fn: Listener) => void listeners.add(fn),
    removeEventListener: (_: string, fn: Listener) => void listeners.delete(fn),
    // Deprecated pair, still called by some libraries.
    addListener: (fn: Listener) => void listeners.add(fn),
    removeListener: (fn: Listener) => void listeners.delete(fn),
    dispatchEvent: () => false,
  }),
});

beforeEach(() => {
  matches = true;
  listeners.clear();
});
