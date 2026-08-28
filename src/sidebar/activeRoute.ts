"use client";
import { useSyncExternalStore } from "react";

/**
 * An href reduced to `origin + pathname`, or "" when it cannot be resolved.
 *
 * Absolute stays absolute, everything else resolves against `origin` — the rule
 * the nav data actually needs, since rows point at sibling apps by full URL and
 * at this app by path. Query and hash are dropped: "/reports?page=2" is still
 * the "/reports" row, which is what a nav means by it.
 *
 * `origin` is a parameter rather than a read of `window.location` so the whole
 * matching rule stays a pure function — testable against a cross-app origin
 * without booting a DOM on that host.
 */
export function toRouteKey(href: string | undefined, origin: string): string {
  if (!href || !origin) return "";
  try {
    const url = new URL(href, origin);
    /* "/apps" and "/apps/" are the same row. Root stays "/" so `isUnder` can
       recognise it and hold it to an exact match. */
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    return url.origin + path;
  } catch {
    return "";
  }
}

/** True when `current` is `key` itself or sits underneath it. */
export function isUnder(key: string, current: string): boolean {
  if (!key || !current) return false;
  if (key === current) return true;
  /* After toRouteKey only the root key ends in "/". Root must match exactly, or
     a "/" row lights up on every page in the app. */
  if (key.endsWith("/")) return false;
  // The appended "/" is load-bearing: without it "/apps" matches "/apps-2/chat".
  return current.startsWith(`${key}/`);
}

/* Rows navigate with plain <a>, so every navigation is a document load and the
   route is fixed for the life of the page. These two listeners only cover the
   cases where it is not: back/forward, and an in-page hash jump. */
const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("hashchange", onChange);
  };
};

/* origin + pathname, not next/navigation's usePathname(): that one strips the
   basePath, which is exactly the "/landing-user" segment the hrefs carry and the
   reason the old comparison could never be true. */
const getSnapshot = () => window.location.origin + window.location.pathname;

/* "" on the server and on hydration's first pass. Every row key carries a
   non-empty origin, so nothing matches "" — no row is wrongly marked, and the
   highlight simply arrives one commit later. Guessing a route here instead would
   mark the wrong row AND mismatch the server HTML. */
const getServerSnapshot = () => "";

/** Current `origin + pathname`. "" while server-rendering. */
export function useCurrentRoute(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
