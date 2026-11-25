"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Grace period for the pointer to cross the gap from the row onto the tooltip. */
const HIDE_DELAY_MS = 120;
/** Gap between the row's edge and the tooltip. */
const GAP_PX = 8;

interface TipState {
  x: number;
  y: number;
  rtl: boolean;
  host: HTMLElement;
}

/**
 * A nav row's label. Ellipsis-truncated by CSS when it is wider than the column,
 * and — only then — shows the full text in a tooltip beside the row.
 *
 * WHY NOT `title`. A native title tooltip appears on every row whether cut or not,
 * after a browser-chosen delay, never on keyboard focus, and cannot be styled or
 * dismissed. This one appears only when the ellipsis actually removed text, on
 * pointer hover AND keyboard focus, and meets WCAG 1.4.13: Escape dismisses it,
 * the pointer can move onto it without it vanishing, and it stays until the
 * pointer/focus leaves.
 *
 * TRUNCATION IS MEASURED ON EACH SHOW, NOT CACHED. The label's width changes with
 * mini/expanded, the mobile drawer, translation and late font loading; a value
 * measured at mount would be wrong after any of them.
 *
 * PORTALED INTO THE SHELL, NOT <body>. The sidebar scroller clips overflow, so the
 * tooltip has to leave it — but the `--il-t-*` token aliases are declared on
 * `:is(.il-shell, .il-brand)` only, so a tooltip on <body> would resolve every
 * colour to nothing. `.il-shell` carries no transform or filter, so
 * `position: fixed` inside it is still viewport-relative.
 *
 * The tooltip is `aria-hidden`: the full text is already the row's accessible
 * name (the ellipsis is visual only), so exposing it again would only make screen
 * readers announce it twice.
 */
export function NavLabel({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const [tip, setTip] = useState<TipState | null>(null);

  const cancelHide = useCallback(() => {
    if (hideTimer.current !== undefined) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    }
  }, []);

  const hide = useCallback(() => {
    cancelHide();
    setTip(null);
  }, [cancelHide]);

  /* Hide after a grace period UNLESS the pointer is on the tooltip by then.

     Asked of the DOM (`:hover`) when the timer fires, not tracked through an
     enter event, and that is the fix for a bug a headed run caught: React
     synthesises the tooltip's onMouseEnter while handling the `mouseout`, which
     the browser dispatches BEFORE the row's native `mouseleave`. So "cancel the
     hide" ran first, "schedule the hide" second, and the tooltip vanished under
     the pointer — WCAG 1.4.13 "hoverable" failed in a real browser while a jsdom
     test that fired the events in the order a person would guess passed. */
  const hideSoon = useCallback(() => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = undefined;
      if (tipRef.current?.matches(":hover")) return;
      setTip(null);
    }, HIDE_DELAY_MS);
  }, [cancelHide]);

  /** Where the tooltip goes for the row as it is NOW, or null if the row is no
   *  longer visible inside the sidebar's scroll viewport (or has no box at all). */
  const place = useCallback((): TipState | null => {
    const el = ref.current;
    if (!el) return null;
    const row = el.closest<HTMLElement>(".nav-link") ?? el;
    const r = row.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    const y = r.top + r.height / 2;
    const clip = row.closest<HTMLElement>(".simplebar-content-wrapper, .il-sidebar-area")?.getBoundingClientRect();
    const top = clip ? clip.top : 0;
    const bottom = clip ? clip.bottom : window.innerHeight;
    if (y < top || y > bottom) return null;
    const rtl = getComputedStyle(row).direction === "rtl";
    const host = row.closest<HTMLElement>(".il-shell, .il-brand") ?? document.body;
    return { x: rtl ? r.left - GAP_PX : r.right + GAP_PX, y, rtl, host };
  }, []);

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelHide();
    if (el.scrollWidth <= el.clientWidth) {
      setTip(null);
      return;
    }
    setTip(place());
  }, [cancelHide, place]);

  // The whole row is the hover/focus target, not just the text — the icon and the
  // padding are part of the same control.
  useEffect(() => {
    const row = ref.current?.closest<HTMLElement>(".nav-link");
    if (!row) return;
    row.addEventListener("mouseenter", show);
    row.addEventListener("mouseleave", hideSoon);
    row.addEventListener("focusin", show);
    row.addEventListener("focusout", hide);
    return () => {
      row.removeEventListener("mouseenter", show);
      row.removeEventListener("mouseleave", hideSoon);
      row.removeEventListener("focusin", show);
      row.removeEventListener("focusout", hide);
      cancelHide();
    };
  }, [show, hide, hideSoon, cancelHide]);

  // While open: Escape dismisses it first (captured and stopped, so the same key
  // does not also close the mobile drawer).
  //
  // Scroll and resize RE-PLACE it rather than hiding it. Hiding on any scroll was
  // the first version, and a headed run showed why it is wrong: reactstrap's
  // Collapse fires a burst of scroll events on .il-submenu for the whole open
  // animation (~15 events over ~280ms), so hovering a group child while its group
  // opened killed the tooltip — and so would any unrelated scroller on the page.
  // Following the row, and hiding only once it leaves the sidebar's visible
  // viewport, is the behaviour that cannot be fooled by either. One measurement
  // per frame, however many events arrive.
  const isOpen = tip !== null;
  useEffect(() => {
    if (!isOpen) return;
    let frame = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      hide();
    };
    const replace = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setTip(place());
      });
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", replace, true);
    window.addEventListener("resize", replace);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", replace, true);
      window.removeEventListener("resize", replace);
    };
  }, [isOpen, hide, place]);

  return (
    <>
      <span ref={ref} className="il-nav-label">
        {text}
      </span>
      {tip &&
        createPortal(
          <span
            ref={tipRef}
            className="il-nav-tip"
            aria-hidden="true"
            data-rtl={tip.rtl ? "" : undefined}
            style={{ top: tip.y, left: tip.x }}
            // hideSoon, not hide: React fires this when the pointer goes back onto
            // the row too (the row is the tooltip's React ancestor), and the row's
            // own mouseenter then cancels it via show().
            onMouseLeave={hideSoon}
          >
            {text}
          </span>,
          tip.host,
        )}
    </>
  );
}
