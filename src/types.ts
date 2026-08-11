import type { ReactNode } from "react";

/**
 * One row in the sidebar.
 *
 * Shaped by what NavItemContainer/NavSubMenu actually consume — deliberately NOT
 * by the host's navigation API response, which this package never sees. A
 * consumer maps its own rows onto this.
 *
 * A row is exactly one of three kinds, discriminated by which field is present:
 *   `caption` present   → section heading, not a link
 *   `children` present  → collapsible group
 *   otherwise           → leaf link
 */
export interface NavItem {
  /** Stable React key. Falls back to `title` when absent. */
  navigationId?: string | number;
  title?: string;
  /** Leaf/group href. A leaf with no href renders as "/", matching the source. */
  href?: string;
  /**
   * Usually a CSS class name (`"bi bi-house"`, `"mdi mdi-home"`) rendered as
   * `<i className={icon} />` — that is what the reference host's navigation API
   * supplies, and what the source component actually did with it. Its PropTypes
   * claimed `node`, which was simply wrong. A ReactNode is also accepted and
   * rendered as-is, because an icon component is the more obvious thing to pass
   * when you are not driving this from an API.
   */
  icon?: string | ReactNode;
  /** Section heading. When set, every other field is ignored. */
  caption?: string | null;
  /** Collapsible group children. One level only — sub-children are not rendered. */
  children?: NavItem[] | null;
  /** Trailing badge content. */
  suffix?: ReactNode;
  /** Extra class on the badge, e.g. "bg-danger". */
  suffixColor?: string;
}

/**
 * A header dropdown the consumer fills. The package owns the toggle and the
 * panel chrome; the content is entirely yours.
 */
export interface HeaderDropdownSlot {
  /** Stable key, and the base for the panel's generated aria ids. */
  id: string;
  /** Toggle glyph. */
  icon: ReactNode;
  /** Accessible name for the toggle, and the panel's header row text. */
  label: string;
  /** Panel body, rendered inside the scroller. */
  content: ReactNode;
  /** `"panel"` = the 300px panel. `"mega"` = the full-bleed mega menu. */
  width?: "panel" | "mega";
  /** Max height of the scroller in px. `false` disables scrolling. Default 350. */
  scrollMaxHeight?: number | false;
  /** Render the `label` row above the content. Defaults true for panel, false for mega. */
  showHeader?: boolean;
  /** Menu alignment. Default "start". */
  align?: "start" | "end";
}

/** The profile control at the far right of the header. */
export interface ProfileSlot {
  /** Text inside the gradient circle, e.g. "JD". Ignored when `avatar` is set. */
  initials?: string;
  /** Full replacement for the circle. */
  avatar?: ReactNode;
  /** Accessible name for the toggle. Default "Profile". */
  label?: string;
  /**
   * Menu body. Nothing renders when absent — there is deliberately no default
   * menu and no default logout link. The source hard-coded both, which is
   * exactly the sort of app-specific content a shell package must not decide.
   */
  menu?: ReactNode;
}

/** Identity of the person the sidebar header describes. */
export interface SidebarUser {
  /** Text inside the gradient circle, e.g. "JD". Ignored when `avatar` is set. */
  initials?: string;
  name?: string;
  avatar?: ReactNode;
}

/**
 * Translator, applied to nav `title` and `caption` only. Defaults to identity,
 * so i18n is opt-in and this package takes no i18n dependency.
 */
export type Translate = (key: string) => string;

/**
 * Shell geometry overrides, emitted as inline custom properties on the shell
 * root. Numbers are treated as px.
 *
 * These are NOT design tokens — they are absent from the design system's token
 * sheet and are owned by this package. See the geometry block in styles.css.
 */
export interface ShellGeometry {
  /** Default 240. */
  sidebarWidth?: number | string;
  /** Default 80. */
  miniSidebarWidth?: number | string;
  /** Default 59. */
  topbarHeight?: number | string;
}
