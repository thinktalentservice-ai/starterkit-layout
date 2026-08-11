"use client";
import { useEffect, useState } from "react";
import { LG_QUERY } from "../constants";

/**
 * True at Bootstrap's `lg` and up, i.e. where the sidebar stops being an
 * off-canvas drawer and becomes an in-flow column.
 *
 * Seeds `true` so the server render and the first client paint agree on the
 * desktop layout — the same assumption the `d-lg-flex` default markup already
 * makes. A `false` seed would mark the sidebar `inert` for one frame on desktop,
 * which is a real (if brief) keyboard trap.
 */
export function useIsDesktop(query: string = LG_QUERY): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);

  return isDesktop;
}
