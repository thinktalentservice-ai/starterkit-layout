"use client";
import type { ElementType, ReactNode } from "react";
import { NavItem } from "reactstrap";
import Link from "next/link";
import { motion } from "motion/react";
import { NavIcon } from "./NavIcon";

/* motion.create() must be called once, at module scope — calling it during
   render returns a new component type every time, which unmounts and remounts
   the link (and its animation state) on every parent render. */
const MotionLink = motion.create(Link);

const iconVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.2, transition: { type: "spring" as const, stiffness: 400, damping: 15 } },
};

const labelVariants = {
  rest: { x: 0 },
  hover: { x: 4, transition: { type: "spring" as const, stiffness: 400, damping: 20 } },
};

export interface NavItemContainerProps {
  /** Target href. */
  to: string;
  title?: string;
  icon?: string | ReactNode;
  suffix?: ReactNode;
  /** Extra class on the badge, e.g. "bg-danger". */
  suffixColor?: string;
  /** Class on the wrapping item — the shell passes "il-active-link". */
  className?: string;
  /** Renamed from the source's `toggle`, which described nothing. */
  onClick?: () => void;
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

/** A single leaf row in the sidebar. */
export function NavItemContainer({
  to,
  icon,
  title,
  onClick,
  className,
  suffix,
  suffixColor,
  tag = "li" as ElementType,
}: NavItemContainerProps) {
  return (
    <NavItem tag={tag} onClick={onClick} className={className}>
      <MotionLink
        href={to}
        className="nav-link mb-2"
        initial="rest"
        whileHover="hover"
        animate="rest"
      >
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
      </MotionLink>
    </NavItem>
  );
}
