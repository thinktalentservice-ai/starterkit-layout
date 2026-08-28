"use client";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Nav } from "reactstrap";
import SimpleBar from "simplebar-react";
import { motion } from "motion/react";
import { NavItemContainer } from "./NavItemContainer";
import { NavSubMenu } from "./NavSubMenu";
import { isUnder, toRouteKey, useCurrentRoute } from "./activeRoute";
import type { NavItem as NavItemModel, SidebarUser, Translate } from "../types";

// Matches the topbar's own slide, so header and sidebar move as one.
const SHELL_EASE = [0.4, 0, 0.2, 1] as const;
const SHELL_DURATION = 0.3;

const identity: Translate = (key) => key;

/* A CLICK row is an action, not a destination. Its href is '#' or absent, and
   toRouteKey('#', origin) reduces to origin + '/', which isUnder holds to an
   exact match — so every CLICK row in the nav would light up on the site root,
   and one carrying the same string as a real row could tie with it anywhere.
   Excluded from the candidate set AND from the comparisons that use the winner. */
const isAction = (item: NavItemModel) => item.type === "CLICK";

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
  const current = useCurrentRoute();

  /* Which row is current cannot be decided one row at a time: several can match
     at once ("/user" and "/user/task-list" both contain "/user/task-list/42"),
     and only the deepest should light. So every candidate is resolved in one
     pass here and the winner travels down as its own raw href string — which
     keeps NavSubMenu free of any URL logic, comparing by identity instead.

     A group's own href is a toggle, not a destination, so only leaves and
     submenu children compete. `current` being non-empty means we are past
     hydration and on the client, which is what makes window.location.origin
     safe to read. */
  const activeHref = useMemo(() => {
    if (!current) return undefined;
    const { origin } = window.location;
    let bestHref: string | undefined;
    let bestLength = -1;

    const consider = (href: string) => {
      const key = toRouteKey(href, origin);
      if (isUnder(key, current) && key.length > bestLength) {
        bestLength = key.length;
        bestHref = href;
      }
    };

    for (const navi of navItems) {
      if (navi.caption) continue;
      if (navi.children) {
        navi.children.forEach((child) => {
          if (!isAction(child) && child.href) consider(child.href);
        });
      } else if (!isAction(navi)) {
        consider(navi.href || "/");
      }
    }
    return bestHref;
  }, [navItems, current]);

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
                      /* The `!== undefined` guard is not redundant: a child with
                         no href would otherwise compare equal to an unresolved
                         activeHref and open every group during SSR. */
                      defaultOpen={
                        navi.defaultOpen ??
                        (activeHref !== undefined &&
                          navi.children.some((c) => !isAction(c) && c.href === activeHref))
                      }
                      activeHref={activeHref}
                      t={t}
                    />
                  </motion.li>
                );
              }

              return (
                <motion.li key={navi.navigationId ?? navi.title} {...common}>
                  <NavItemContainer
                    tag="div"
                    className={
                      !isAction(navi) &&
                      activeHref !== undefined &&
                      (navi.href || "/") === activeHref
                        ? "il-active-link"
                        : ""
                    }
                    to={navi.href || "/"}
                    title={t(navi.title ?? "")}
                    suffix={navi.suffix}
                    suffixColor={navi.suffixColor}
                    icon={navi.icon}
                    /* Passed straight through, undefined and all — both props have
                       a default parameter on the other side, which is what a
                       default parameter is for. */
                    type={navi.type}
                    event={navi.event}
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
