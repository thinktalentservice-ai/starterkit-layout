import type { ReactNode } from "react";

/**
 * What activating a leaf row does. Mirrors `NAVIGATION_TYPE` in the navigation
 * table this models, so a database row, a `NavItem` and the props it becomes all
 * read the same word.
 *
 * Exported because a consumer writing its own mapper instead of using
 * `toNavItems` needs to name the value it is producing.
 */
export type NavItemType = "LINK" | "CLICK";

/**
 * One row in the sidebar.
 *
 * Shaped by what NavItemContainer/NavSubMenu actually consume — deliberately NOT
 * by the host's navigation API response, which this package never sees. A
 * consumer maps its own rows onto this; `toNavItems` is one such mapper, for the
 * row shape the reference host serves.
 *
 * A row is exactly one of three kinds, discriminated by which field is present:
 *   `caption` present   → section heading, not a link
 *   `children` present  → collapsible group
 *   otherwise           → leaf, which `type` splits into a link or an action
 *
 * Deliberately ONE interface of optional fields and not a discriminated union.
 * A union would let `type: "CLICK"` carry `href?: never`, which reads well and
 * costs three things: `NavItem` stops being an `interface`, so a consumer's
 * `interface Row extends NavItem` breaks on a minor version; `href?: never` is
 * unassignable from any mapper whose output is `string | undefined`, so
 * `toNavItems` would need a cast at exactly the point the union existed to
 * check; and it would make ONE of the four kinds type-safe while caption and
 * children stay prose, reading as though all four were checked. The kinds are
 * enforced where they are decided — in Sidebar's dispatch — and stated here.
 */
export interface NavItem {
  /** Stable React key. Falls back to `title` when absent. */
  navigationId?: string | number;
  title?: string;
  /**
   * Leaf/group href. A leaf with no href renders as "/", matching the source.
   *
   * Mutually exclusive with `event` in practice and not enforced by the type —
   * see the union note above. A row carrying both is resolved by `type`, which
   * wins outright: a CLICK row ignores `href` completely rather than
   * half-honouring it as a fallback destination.
   */
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
  /**
   * Forces a group open regardless of the route. Group rows only.
   *
   * An override, not the usual mechanism: left unset, a group opens by itself
   * when one of its children matches the current URL.
   */
  defaultOpen?: boolean;
  /** Trailing badge content. */
  suffix?: ReactNode;
  /** Extra class on the badge, e.g. "bg-danger". */
  suffixColor?: string;
  /**
   * Leaf behaviour. Defaults to `"LINK"`.
   *
   * `"LINK"` renders `<a href>`. `"CLICK"` renders `<button type="button">` that
   * runs `event` and navigates nowhere — the shape of a row whose job is to open
   * something the host already put on `window` (a support widget, a chat bubble)
   * and which therefore has no URL to point at.
   *
   * The test is `=== "CLICK"`, never `!== "LINK"`. The source compared the other
   * way round, so a row whose type arrived null, lowercase, or as a value added
   * to the enum later fell through to *executing a string* — the wrong side of a
   * typo to land on. Anything that is not exactly `"CLICK"` is a link.
   *
   * Ignored on a `caption` or `children` row. A group row toggles its own panel;
   * it is neither a destination nor an action, which is the one thing the source
   * had right and the reason its groups were never clickable.
   *
   * A CLICK row never takes `.il-active-link`, even at the site root — see the
   * resolver in Sidebar.
   */
  type?: NavItemType;
  /**
   * JavaScript source for a `"CLICK"` row, compiled with `new Function(event)`
   * and called with no arguments — so it runs in GLOBAL scope and can see
   * `window` and nothing else. Not a callback and not a function: this models a
   * `varchar(600)` an administrator edits, so a string is the only thing that
   * survives the trip through the API.
   *
   * Requires `script-src 'unsafe-eval'`; see the README. Absent or empty is a
   * silent no-op, not an error — a CLICK row whose event has not been filled in
   * yet renders an inert button rather than a link to nowhere.
   */
  event?: string;
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
