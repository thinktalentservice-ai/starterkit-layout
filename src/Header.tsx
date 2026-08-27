"use client";
import type { ReactNode } from "react";
import {
  Navbar,
  Nav,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
import SimpleBar from "simplebar-react";
import { motion } from "motion/react";
import { IconButton } from "./IconButton";
import { MenuIcon } from "./icons";
import { DEFAULT_MOBILE_SIDEBAR_ID, DEFAULT_DROPDOWN_SCROLL_HEIGHT } from "./constants";
import type { HeaderDropdownSlot, ProfileSlot } from "./types";

const buildNavItemVariants = (stagger: number) => ({
  hidden: stagger > 0 ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition:
      stagger > 0
        ? { delay: i * stagger, duration: 0.25, ease: "easeOut" as const }
        : { duration: 0 },
  }),
});

export interface HeaderProps {
  /** Slides the topbar out of flow and marks it inert. */
  headerHidden?: boolean;
  /** Drives the logo column width at lg and up. */
  miniSidebar?: boolean;
  /** Drives the hamburger's aria-expanded. */
  mobileSidebarOpen?: boolean;
  onToggleMini?: () => void;
  onToggleMobile?: () => void;
  /** `aria-controls` target for the mobile hamburger. */
  mobileSidebarId?: string;

  /** Desktop brand lockup. */
  favicon?: ReactNode;
  /** Sub-lg brand mark. */
  logo?: ReactNode;
  /** Dropdowns between the hamburger and the right cluster. */
  headerDropdowns?: HeaderDropdownSlot[];
  /** Rendered after the dropdowns. */
  headerCenterSlot?: ReactNode;
  /*
   * There is no `search` slot. The package used to ship a styled <input
   * type="search"> that reported keystrokes through `onSearch` and searched
   * NOTHING — every consumer had to replace it, and until they did the topbar
   * offered a control that silently did nothing. A shell package has no data to
   * search. Render your own into `headerCenterSlot` or `headerActionsSlot`;
   * `SearchIcon` is still exported for it.
   */
  /** Theme control. No default — this package has no MUI dependency. */
  themeToggle?: ReactNode;
  /**
   * Rendered in the right cluster, directly after the theme toggle.
   *
   * For an action that belongs beside the theme control rather than in the
   * centre — a notification bell whose panel is too big for `headerDropdowns`,
   * a help button. `headerEndSlot` is the other end of the same cluster: it
   * renders AFTER the profile avatar.
   */
  headerActionsSlot?: ReactNode;
  /** A string renders inside the pill; a node replaces it. */
  roleBadge?: ReactNode;
  /** Avatar and its menu. Nothing renders when absent. */
  profile?: ProfileSlot;
  /** Rendered last in the right cluster. */
  headerEndSlot?: ReactNode;

  className?: string;
  /** Per-item entry stagger, in seconds. 0 disables. */
  staggerDelay?: number;
}

/**
 * The topbar chrome. Every piece of content is a slot — the source hard-coded a
 * "Candidate" role badge, a "JD" avatar and a logout link to `/auth/login`, none
 * of which a shell package can decide for its consumers.
 */
export function Header({
  headerHidden = false,
  miniSidebar = false,
  mobileSidebarOpen = false,
  onToggleMini,
  onToggleMobile,
  mobileSidebarId = DEFAULT_MOBILE_SIDEBAR_ID,
  favicon,
  logo,
  headerDropdowns = [],
  headerCenterSlot,
  themeToggle,
  headerActionsSlot,
  roleBadge,
  profile,
  headerEndSlot,
  className = "",
  staggerDelay = 0.07,
}: HeaderProps) {
  const variants = buildNavItemVariants(staggerDelay);
  let seat = 0;
  const next = () => seat++;

  return (
    <Navbar
      className={`il-topbar ${headerHidden ? "il-topbar-hidden" : ""} ${className}`
        .replace(/\s+/g, " ")
        .trim()}
      expand="lg"
      /* Off-screen controls must leave the tab order, or focus lands somewhere the user
         cannot see. useHeaderAutoHide refuses to hide while focus is inside the header,
         so this never fires on the focused element itself. */
      inert={headerHidden || undefined}
    >
      {/* ── Left: brand + hamburgers ──
          `il-topbar-lead` is what lets the lg+ block in styles.css size this cluster to
          the sidebar's own width and push the mini toggle onto its trailing edge. The
          class carries no styling below lg, where the sidebar is a drawer and there is
          no edge to line up with. */}
      <div className="d-flex align-items-center il-topbar-lead">
        {favicon && <div className="d-none d-lg-flex align-items-center il-logo-space">{favicon}</div>}
        <IconButton
          className="d-none d-lg-flex"
          onClick={onToggleMini}
          aria-label="Toggle sidebar"
          aria-pressed={miniSidebar}
        >
          <MenuIcon />
        </IconButton>
        {/* `d-block`/`d-flex`, not `d-sm-*`: the sm tier starts at 576px, so on a real
            phone (≤575px) neither utility applied and both controls fell back to whatever
            display their own CSS happened to give them. */}
        {logo && <div className="d-block d-lg-none me-2">{logo}</div>}
        <IconButton
          className="d-flex d-lg-none"
          onClick={onToggleMobile}
          /* Stable name + aria-expanded for the state. Swapping the label to "Close menu"
             instead would leave screen readers announcing "Open menu, expanded". */
          aria-label="Toggle menu"
          aria-expanded={mobileSidebarOpen}
          aria-controls={mobileSidebarId}
        >
          <MenuIcon />
        </IconButton>
      </div>

      {/* ── Centre: consumer-supplied dropdowns ── */}
      {(headerDropdowns.length > 0 || headerCenterSlot) && (
        <Nav className="me-auto d-flex flex-row align-items-center ms-2" navbar>
          {headerDropdowns.map((dd) => {
            const mega = dd.width === "mega";
            const showHeader = dd.showHeader ?? !mega;
            const maxHeight = dd.scrollMaxHeight ?? DEFAULT_DROPDOWN_SCROLL_HEIGHT;
            const body =
              maxHeight === false ? (
                dd.content
              ) : (
                <SimpleBar style={{ maxHeight: `${maxHeight}px` }}>{dd.content}</SimpleBar>
              );

            return (
              <motion.li
                key={dd.id}
                className="nav-item"
                custom={next()}
                variants={variants}
                initial="hidden"
                animate="visible"
              >
                <UncontrolledDropdown className={mega ? "il-mega mx-1" : "mx-1"}>
                  <DropdownToggle tag="button" type="button" className="il-icon-btn" aria-label={dd.label}>
                    {dd.icon}
                  </DropdownToggle>
                  <DropdownMenu
                    /* `il-dd` on BOTH shapes. The mega menu used to carry no class at
                       all, inheriting Bootstrap's dropdown surface — which does not
                       follow the colour scheme, so in light mode its 30px frame stayed
                       dark around a light panel. Only the width class is mega-specific. */
                    className={
                      mega
                        ? "il-dd"
                        : `il-dd il-dd-width ${dd.align === "end" ? "il-dd-end" : ""}`.trim()
                    }
                    end={dd.align === "end"}
                  >
                    {showHeader && (
                      <DropdownItem header className="il-dd-header">
                        {dd.label}
                      </DropdownItem>
                    )}
                    {body}
                  </DropdownMenu>
                </UncontrolledDropdown>
              </motion.li>
            );
          })}
          {headerCenterSlot && <li className="nav-item">{headerCenterSlot}</li>}
        </Nav>
      )}

      {/* ── Right: theme, actions, role, profile ── */}
      <div className="d-flex align-items-center gap-2 ms-auto">
        {themeToggle && (
          <motion.div custom={next()} variants={variants} initial="hidden" animate="visible">
            {themeToggle}
          </motion.div>
        )}

        {headerActionsSlot && (
          <motion.div custom={next()} variants={variants} initial="hidden" animate="visible">
            {headerActionsSlot}
          </motion.div>
        )}

        {roleBadge && (
          <motion.div custom={next()} variants={variants} initial="hidden" animate="visible">
            {typeof roleBadge === "string" ? (
              <span className="il-role-badge">{roleBadge}</span>
            ) : (
              roleBadge
            )}
          </motion.div>
        )}

        {profile && (
          <motion.div custom={next()} variants={variants} initial="hidden" animate="visible">
            <UncontrolledDropdown>
              <DropdownToggle
                tag="button"
                type="button"
                className="il-avatar-btn"
                aria-label={profile.label ?? "Profile"}
              >
                {profile.avatar ?? <div className="il-avatar">{profile.initials ?? ""}</div>}
              </DropdownToggle>
              {profile.menu && (
                <DropdownMenu className="il-dd il-dd-width il-dd-end" end>
                  {profile.menu}
                </DropdownMenu>
              )}
            </UncontrolledDropdown>
          </motion.div>
        )}

        {headerEndSlot}
      </div>
    </Navbar>
  );
}
