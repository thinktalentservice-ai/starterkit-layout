"use client";
import type { ReactNode } from "react";
import { Nav } from "reactstrap";
import { usePathname } from "next/navigation";
import SimpleBar from "simplebar-react";
import { motion } from "motion/react";
import { NavItemContainer } from "./NavItemContainer";
import { NavSubMenu } from "./NavSubMenu";
import type { NavItem as NavItemModel, SidebarUser, Translate } from "../types";

// Matches the topbar's own slide, so header and sidebar move as one.
const SHELL_EASE = [0.4, 0, 0.2, 1] as const;
const SHELL_DURATION = 0.3;

const identity: Translate = (key) => key;

/* Built per-render from `staggerDelay` rather than fixed at 0.04, so the prop is
   real. At 0 the rows resolve to their visible state with no transition at all,
   which is what a long nav wants — 40 rows at 0.04s each is a 1.6s cascade. */
const buildVariants = (stagger: number) => ({
  hidden: stagger > 0 ? { opacity: 0, x: -12 } : { opacity: 1, x: 0 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition:
      stagger > 0
        ? { delay: i * stagger, duration: 0.2, ease: "easeOut" as const }
        : { duration: 0 },
  }),
});

export interface SidebarProps {
  /** Rows to render. Required — this package has no data source of its own. */
  navItems: NavItemModel[];
  /** Active-link matching. Defaults to `usePathname()`. */
  pathname?: string;
  /** `position: fixed`, top/bottom anchored, rather than in-flow. */
  isFixed?: boolean;
  /** The topbar is hidden — collapses the docked offset to 0. */
  headerHidden?: boolean;
  /**
   * Measured topbar height in px, or `null` while unmeasured.
   *
   * `null` omits motion's `top` key entirely so the box starts from its CSS
   * resting value instead of animating up from zero on first paint.
   */
  topbarHeight?: number | null;
  /** Replaces the default user block. `null` removes it. */
  sidebarHeader?: ReactNode | null;
  /** Fills the default user block. Ignored when `sidebarHeader` is given. */
  sidebarUser?: SidebarUser;
  /** Rendered after the nav, inside the scroller. */
  sidebarFooter?: ReactNode;
  /** Applied to nav titles and captions. Defaults to identity. */
  t?: Translate;
  className?: string;
  /** Per-row entry stagger, in seconds. 0 disables. */
  staggerDelay?: number;
}

export function Sidebar({
  navItems,
  pathname,
  isFixed = false,
  headerHidden = false,
  topbarHeight = null,
  sidebarHeader,
  sidebarUser,
  sidebarFooter,
  t = identity,
  className = "",
  staggerDelay = 0.04,
}: SidebarProps) {
  const routerPath = usePathname();
  const location = pathname ?? routerPath;
  /* The source's parent-segment rule, preserved exactly: for "/apps/chat" this
     yields "/apps", so a group only ever auto-opens when its own href is the
     parent segment of the current route. It is subtle and easy to "improve"
     into something that behaves differently — a test pins it. */
  const currentURL = location.slice(0, location.lastIndexOf("/"));

  /* Only the fixed sidebar is offset here; the in-flow variant is positioned by its
     parent's margin (--il-shell-top in styles.css). It still animates to `top: 0`
     rather than dropping the key — a `position: relative` box is unaffected by
     top:0, and omitting it would leave motion's last inline `top: 59px` behind when
     the user turns the fixed-sidebar option off, double-offsetting the sidebar. */
  const dockedOffset = headerHidden ? 0 : topbarHeight;
  const shellOffset = topbarHeight === null ? null : isFixed ? dockedOffset : 0;

  const variants = buildVariants(staggerDelay);

  return (
    <motion.div
      className={`il-sidebar-box il-sidebar ${isFixed ? "il-fixed-sidebar" : ""} ${className}`
        .replace(/\s+/g, " ")
        .trim()}
      initial={{ x: -20, opacity: 0 }}
      animate={{
        x: 0,
        opacity: 1,
        ...(shellOffset === null ? {} : { top: shellOffset }),
      }}
      transition={{ duration: SHELL_DURATION, ease: SHELL_EASE }}
    >
      <SimpleBar style={{ height: "100%" }}>
        {sidebarHeader === undefined ? (
          <div className="il-sidebar-user">
            {sidebarUser?.avatar ?? (
              <div className="il-sidebar-avatar">{sidebarUser?.initials ?? ""}</div>
            )}
            <div className="il-sidebar-username">{sidebarUser?.name ?? ""}</div>
          </div>
        ) : (
          sidebarHeader
        )}

        {/* No `p-3`. That utility put a 16px gutter down both sides of every row,
            which is layout the package owns and Bootstrap should never have been
            holding: it inset the active row's background and its accent bar from
            the sidebar's own edges, so the highlight floated in the middle of the
            column instead of reading as part of it. The gutter now lives on
            .il-sidebar-nav in styles.css, and the row's horizontal padding moved
            onto .nav-link — same text position, full-bleed background. */}
        <div className="il-sidebar-nav pt-1 mt-2">
          <Nav vertical>
            {navItems.map((navi, index) => {
              const common = {
                custom: index,
                variants,
                initial: "hidden" as const,
                animate: "visible" as const,
              };

              /* motion.li, not motion.div, and the children render as `div`.
                 `Nav vertical` is a <ul>, and a <ul> may only contain <li>. The
                 source nested `ul > div > li`, which axe reports as a serious
                 WCAG 1.3.1 failure and which drops the list semantics — a screen
                 reader stops announcing "list, N items" and the row count with
                 it. Caught by the axe sweep in Sidebar.test.tsx. */
              if (navi.caption) {
                return (
                  <motion.li
                    key={`caption-${navi.caption}`}
                    {...common}
                    className="il-nav-caption"
                  >
                    {t(navi.caption)}
                  </motion.li>
                );
              }

              if (navi.children) {
                return (
                  <motion.li key={`submenu-${navi.navigationId ?? navi.title}`} {...common}>
                    <NavSubMenu
                      tag="div"
                      icon={navi.icon}
                      title={t(navi.title ?? "")}
                      items={navi.children}
                      suffix={navi.suffix}
                      suffixColor={navi.suffixColor}
                      defaultOpen={currentURL === navi.href}
                      pathname={location}
                      t={t}
                    />
                  </motion.li>
                );
              }

              return (
                <motion.li key={navi.navigationId ?? navi.title} {...common}>
                  <NavItemContainer
                    tag="div"
                    className={location === navi.href ? "il-active-link" : ""}
                    to={navi.href || "/"}
                    title={t(navi.title ?? "")}
                    suffix={navi.suffix}
                    suffixColor={navi.suffixColor}
                    icon={navi.icon}
                  />
                </motion.li>
              );
            })}
          </Nav>
        </div>

        {sidebarFooter}
      </SimpleBar>
    </motion.div>
  );
}
