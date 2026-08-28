"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { Collapse, NavItem, NavLink } from "reactstrap";
import { motion } from "motion/react";
import { NavIcon } from "./NavIcon";
import type { NavItem as NavItemModel, Translate } from "../types";

const iconVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.2, transition: { type: "spring" as const, stiffness: 400, damping: 15 } },
};

const labelVariants = {
  rest: { x: 0 },
  hover: { x: 4, transition: { type: "spring" as const, stiffness: 400, damping: 20 } },
};

const identity: Translate = (key) => key;

export interface NavSubMenuProps {
  title?: string;
  icon?: string | ReactNode;
  items: NavItemModel[];
  /**
   * Seeds the group open. Latched on the FIRST truthy value, then never acted on
   * again — so a group the user collapsed is not reopened underneath them.
   *
   * Not a mount-only read, because the value it carries is unknowable during SSR:
   * `Sidebar` derives it from the browser's route, which only exists one commit
   * after hydration. A `[]` effect would run before it ever turned true.
   *
   * Renamed from the source's `isUrl`, which named its input rather than its effect.
   */
  defaultOpen?: boolean;
  /**
   * Raw href of the row `Sidebar` resolved as current, compared by identity.
   * Resolution lives entirely in Sidebar so this component holds no URL logic.
   */
  activeHref?: string;
  suffix?: ReactNode;
  suffixColor?: string;
  /** Applied to child titles. Defaults to identity. */
  t?: Translate;
  /**
   * Element for the wrapper. Defaults to `"li"`. `Sidebar` overrides it to
   * `"div"` because it supplies its own animated `<li>` — see NavItemContainer.
   */
  tag?: ElementType;
}

/** A collapsible group of sidebar rows. One level deep — children of children are ignored. */
export function NavSubMenu({
  icon,
  title,
  items,
  defaultOpen = false,
  activeHref,
  suffixColor,
  suffix,
  t = identity,
  tag = "li" as ElementType,
}: NavSubMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const seeded = useRef(false);

  // Opens on the first truthy defaultOpen, whenever it arrives, and never again
  // — see the prop's docs for why "whenever" and not "on mount".
  useEffect(() => {
    if (defaultOpen && !seeded.current) {
      seeded.current = true;
      setOpen(true);
    }
  }, [defaultOpen]);

  return (
    <NavItem tag={tag} className={open ? "il-active-parent" : ""}>
      <motion.div initial="rest" whileHover="hover" animate="rest">
        {/* A real <button>, not the source's bare <a>-shaped NavLink. A control that
            expands a region has to be reachable by keyboard and announce its state;
            an anchor with no href is neither focusable nor operable by Enter/Space. */}
        <NavLink
          tag="button"
          type="button"
          className="il-submenu-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <motion.span variants={iconVariants} className="il-nav-icon d-flex align-items-center">
            <NavIcon icon={icon} />
          </motion.span>
          <motion.span variants={labelVariants} className="il-hide-mini w-100">
            <div className="d-flex align-items-center">
              <span className="d-block">{title}</span>
              <span className="ms-auto d-flex align-items-center">
                {suffix !== undefined && suffix !== null && suffix !== "" && (
                  <span className={`badge me-2 ${suffixColor ?? ""}`.trim()}>{suffix}</span>
                )}
                {/* Inline SVG rather than the source's `bi bi-chevron-right`. Bootstrap
                    Icons is a separate font package this library does not depend on, so
                    that class rendered an empty box for anyone who had not also
                    installed it — silently, since a missing glyph is just blank. */}
                <motion.svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  focusable="false"
                  animate={{ rotate: open ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </span>
            </div>
          </motion.span>
        </NavLink>
      </motion.div>

      <Collapse isOpen={open} navbar tag="ul" className="il-submenu" id={panelId}>
        {items.map((item, i) => (
          <NavItem
            /* Keyed on identity, not on the translated title the source used — a
               key that changes with the active language remounts every row on a
               language switch, discarding focus and animation state. */
            key={item.navigationId ?? item.href ?? `${item.title}-${i}`}
            /* The `!== undefined` guard is not redundant: a child with no href
               would otherwise compare equal to an unresolved activeHref. */
            className={`il-hide-mini ${
              item.href !== undefined && item.href === activeHref ? "il-active-link" : ""
            }`.trim()}
          >
            <motion.a
              href={item.href ?? "/"}
              className="nav-link"
              initial="rest"
              whileHover="hover"
              animate="rest"
            >
              <motion.span variants={iconVariants} className="il-nav-icon">
                <NavIcon icon={item.icon} />
              </motion.span>
              <motion.span variants={labelVariants} className="il-hide-mini">
                <span>{t(item.title ?? "")}</span>
              </motion.span>
            </motion.a>
          </NavItem>
        ))}
      </Collapse>
    </NavItem>
  );
}
