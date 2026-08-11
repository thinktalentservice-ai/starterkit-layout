"use client";
import { useEffect } from "react";

export interface UseDrawerChromeOptions {
  /** Whether the off-canvas drawer is open. */
  open: boolean;
  /** Called for every dismissal path. Must be idempotent — it fires on already-closed transitions. */
  onClose: () => void;
  /** Current route. A change closes the drawer. */
  pathname?: string;
  /** True at lg and up. Crossing into desktop closes the drawer. */
  isDesktop: boolean;
}

/**
 * The three ways an off-canvas drawer has to be able to close, none of which are
 * the drawer's own markup.
 *
 * Every one of these is a bug that was found and fixed in the app this was
 * extracted from, so they travel together rather than being left to each
 * consumer to rediscover.
 */
export function useDrawerChrome({ open, onClose, pathname, isDesktop }: UseDrawerChromeOptions) {
  // Crossing into desktop with the drawer still "open" leaves the state true, which
  // keeps the overlay painted over an in-flow sidebar and the scroll lock below
  // engaged — with no visible control to undo either, because the mobile hamburger
  // is d-lg-none.
  useEffect(() => {
    if (isDesktop) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop]);

  // A nav tap navigates but leaves the drawer covering the page the user just asked for.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    // Without this the page behind the overlay scrolls under the drawer, which also
    // feeds useHeaderAutoHide and hides the topbar out from under an open menu.
    // The previous value is saved and restored rather than blanked — a host that sets
    // its own body overflow would otherwise lose it the first time a drawer opened.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
