"use client";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

const SHOW_ABOVE = 60; // near the top of the page the header is always visible
const FLIP_THRESHOLD = 6; // px of travel before a direction change counts

// useLayoutEffect has no server counterpart, and App Router still renders client
// components on the server — fall back to useEffect there to keep the console clean.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface UseHeaderAutoHideOptions {
  /**
   * The shell element the geometry custom properties are declared on.
   *
   * REQUIRED for the height measurement, and this is the one API difference from
   * the host hook this was ported from. That version read
   * `--topbar-height` off `document.documentElement`, which worked only because
   * the app's own `_variables.scss` happened to declare it on `:root`. This
   * package declares nothing on `:root` by contract, so the same read would
   * return an empty string and leave `topbarHeight` null forever — the sidebar
   * would never dock.
   */
  shellRef?: RefObject<HTMLElement | null>;
  /** Selector for "focus is inside the header". Default ".il-topbar". */
  headerSelector?: string;
  /** Disable entirely — `hidden` stays false. */
  enabled?: boolean;
}

export interface UseHeaderAutoHideResult {
  hidden: boolean;
  /** Measured topbar height in px, or null while unmeasured. */
  topbarHeight: number | null;
}

/**
 * Tracks scroll direction and reports whether the topbar should be hidden.
 *
 * Owned by the layout rather than by Header: the hidden state also drives the
 * sidebar offset, and the sidebar is a sibling of the header's container — no
 * CSS selector can reach it from inside the header.
 *
 * Also returns the measured topbar height so the sidebar can animate its offset
 * with motion. Read from CSS rather than hardcoded, so `--il-topbar-height`
 * stays the single source of truth and motion still gets a number to interpolate.
 */
export function useHeaderAutoHide({
  shellRef,
  headerSelector = ".il-topbar",
  enabled = true,
}: UseHeaderAutoHideOptions = {}): UseHeaderAutoHideResult {
  const [hidden, setHidden] = useState(false);
  const [topbarHeight, setTopbarHeight] = useState<number | null>(null);
  const lastY = useRef(0);

  useIsomorphicLayoutEffect(() => {
    /* Falls back to documentElement so the hook still measures something for a
       consumer that has not wired the ref — a host which does declare the token
       globally keeps working, rather than silently reporting null. */
    const el = shellRef?.current ?? document.documentElement;
    const raw = getComputedStyle(el).getPropertyValue("--il-topbar-height");
    const px = Number.parseFloat(raw);
    if (!Number.isNaN(px)) setTopbarHeight(px);
  }, [shellRef]);

  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return undefined;
    }

    // Seed from the real position: on a restored scroll, lastY of 0 would read the
    // first upward move as a downward one and hide the header on the way up.
    lastY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      if (y < SHOW_ABOVE) {
        setHidden(false);
        lastY.current = y;
        return;
      }

      // Never hide while keyboard focus sits inside the header. Hiding marks it inert,
      // and making the focused element inert drops focus to <body> — the user loses
      // their place mid-scroll with no way back. Matched by selector rather than a ref
      // because reactstrap's Navbar leaks an unknown `innerRef` prop to the DOM.
      if (document.activeElement?.closest(headerSelector)) {
        lastY.current = y;
        return;
      }

      const delta = y - lastY.current;
      // Sub-threshold jitter would otherwise flip the whole shell on trackpad noise.
      if (Math.abs(delta) < FLIP_THRESHOLD) return;
      setHidden(delta > 0);
      lastY.current = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headerSelector, enabled]);

  return { hidden, topbarHeight };
}
