"use client";
import type { ElementType, ReactNode } from "react";
import { NavItem } from "reactstrap";
import { motion } from "motion/react";
import { NavIcon } from "./NavIcon";
import { runNavEvent } from "./runNavEvent";
import type { NavItemType } from "../types";

const iconVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.2, transition: { type: "spring" as const, stiffness: 400, damping: 15 } },
};

const labelVariants = {
  rest: { x: 0 },
  hover: { x: 4, transition: { type: "spring" as const, stiffness: 400, damping: 20 } },
};

export interface NavItemContainerProps {
  /**
   * Target href. Optional only because a `"CLICK"` row has no destination at
   * all; a LINK row with nothing here renders "/", which is what Sidebar has
   * always substituted.
   */
  to?: string;
  title?: string;
  icon?: string | ReactNode;
  suffix?: ReactNode;
  /** Extra class on the badge, e.g. "bg-danger". */
  suffixColor?: string;
  /**
   * Class on the wrapping item. `Sidebar` sets "il-active-link" here on whichever
   * row matches the current URL; pass your own for anything else.
   */
  className?: string;
  /**
   * Renamed from the source's `toggle`, which described nothing. Sits on the
   * WRAPPER, not on the row, so it fires for both row kinds — including after a
   * CLICK row's own `event`, which bubbles into it.
   */
  onClick?: () => void;
  /**
   * The ROW's kind, not the button's `type` attribute. `"CLICK"` renders a
   * `<button type="button">` running `event`; anything else renders `<a href>`.
   */
  type?: NavItemType;
  /** JavaScript source run when a `"CLICK"` row is activated. See runNavEvent. */
  event?: string;
  /**
   * Element for the wrapper. Defaults to `"li"` so the component is correct on
   * its own inside a list.
   *
   * `Sidebar` overrides it to `"div"` because it supplies its own animated
   * `<li>`: a `<ul>` may only contain `<li>` children, and the source nested
   * `ul > div > li`, which axe reports as a serious WCAG 1.3.1 failure and
   * which costs screen-reader users the list semantics entirely.
   */
  tag?: ElementType;
}

/** A single leaf row in the sidebar — a link, or a button that runs `event`. */
export function NavItemContainer({
  to = "/",
  icon,
  title,
  onClick,
  className,
  suffix,
  suffixColor,
  type = "LINK",
  event,
  tag = "li" as ElementType,
}: NavItemContainerProps) {
  /* Built once and handed to whichever element wins below. The two branches
     differ in the element and its handler and in NOTHING else, and writing the
     subtree twice is precisely how the source ended up with a badge on a leaf,
     no badge on a submenu child, and no way to notice. */
  const body = (
    <>
      <motion.span variants={iconVariants} className="il-nav-icon d-flex align-items-center">
        <NavIcon icon={icon} />
      </motion.span>
      <motion.span variants={labelVariants} className="il-hide-mini w-100">
        <div className="d-flex align-items-center">
          <span>{title}</span>
          {/* Rendered only when there is something to show. The source emitted an
              empty `.badge` on every row, which reserved padding and, worse, gave
              every nav link a stray empty element in its accessible name. */}
          {suffix !== undefined && suffix !== null && suffix !== "" && (
            <span className={`badge ms-auto ${suffixColor ?? ""}`.trim()}>{suffix}</span>
          )}
        </div>
      </motion.span>
    </>
  );

  /* Identical class list, identical variants, identical motion states, so a
     CLICK row is the same box as a LINK row down to the pixel. What a UA
     stylesheet does to a <button> on top of that — cursor, background, borders,
     line-height, fit-content width — is undone by `.il-sidebar-area
     button.nav-link` in styles.css, not here. */
  const rowProps = {
    className: "nav-link mb-2",
    initial: "rest",
    whileHover: "hover",
    animate: "rest",
  } as const;

  return (
    <NavItem tag={tag} onClick={onClick} className={className}>
      {type === "CLICK" ? (
        /* A real <button>, not the source's `NavLink tag="a"` with an onClick and
           no href. An anchor without a real href is not in the tab order and does
           not respond to Enter or Space, so that row was unreachable by keyboard
           and announced as a link to nowhere. Same call NavSubMenu's toggle
           already makes. `=== "CLICK"`, not `!== "LINK"`: see NavItem.type. */
        <motion.button type="button" {...rowProps} onClick={() => runNavEvent(event, title)}>
          {body}
        </motion.button>
      ) : (
        /* A plain <a>, not next/link: nav rows point at absolute URLs in sibling
           apps, which a router cannot client-navigate or prefetch anyway. Keeping
           Link only bought this package a framework peer dependency. */
        <motion.a href={to} {...rowProps}>
          {body}
        </motion.a>
      )}
    </NavItem>
  );
}
