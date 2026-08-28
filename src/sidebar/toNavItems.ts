import type { ReactNode } from "react";
import type { NavItem, Translate } from "../types";

/**
 * One row of the reference host's navigation API — the camelCase form of the
 * `navigation` table it selects from.
 *
 * Every field is optional because this is a wire shape, not a domain model: the
 * mapper's job is to survive a row that is missing whatever the API decided to
 * omit today, not to assert a contract it cannot enforce.
 *
 * `status` and `userType` are deliberately absent. Filtering rows by status or
 * by role is an authorization decision, and a shell package that silently drops
 * rows is a shell package that hides a bug in someone's ACL. Filter before you
 * call this.
 */
export interface NavigationRow {
  navigationId?: string | number | null;
  /** An i18n KEY, not display text — run it through `t` or through Sidebar's. */
  navigationName?: string | null;
  navigationPath?: string | null;
  navigationOrder?: number | null;
  /** Icon-font class name, e.g. "mdi mdi-help-circle". */
  navigationIcon?: string | null;
  /** Submenu bucket. Also an i18n key. Empty or absent means "no group". */
  navigationGroup?: string | null;
  /**
   * `"LINK"` | `"CLICK"`, typed as a plain string because the column is an enum
   * a DBA can extend and the API is free to hand back null or lowercase. Only an
   * exact, case-insensitive `"CLICK"` produces an action row.
   */
  navigationType?: string | null;
  navigationEvent?: string | null;
}

export interface ToNavItemsOptions {
  /**
   * Applied to `navigationName` and to the group key.
   *
   * DO NOT pass this here AND to `Sidebar`/`FullLayout`. Both default to
   * identity and both translate titles, so setting both calls `t(t(key))` — with
   * most i18n runtimes that is invisible (a missing key returns the key) right
   * up until one of them returns something else. Pick one place. Passing it to
   * `Sidebar` is the zero-config path and also covers captions, which this
   * mapper never produces.
   */
  t?: Translate;
  /**
   * Icon for the synthetic group parents this builds. Default: none.
   *
   * The old mapper hardcoded `"mdi mdi-account-circle"` on every group, which
   * needed an icon font this package does not depend on and painted an "account"
   * glyph on a group named "Reports". There is no icon that is right for a bucket
   * whose name the package has never seen, so it draws none — NavIcon still emits
   * its empty `<i>`, which reserves the icon column, so an iconless parent stays
   * aligned with the rows around it. Supply one if your groups should have one.
   */
  groupIcon?: string | ReactNode;
}

const identity: Translate = (key) => key;

/* A row with no order sorts AFTER every ordered row, in input order, rather than
   ahead of them. `?? 0` would float every unordered row to the top of the nav,
   which is the most visible possible place to put "we did not know". */
const UNORDERED = Number.MAX_SAFE_INTEGER;

const orderOf = (row: NavigationRow): number =>
  typeof row.navigationOrder === "number" && Number.isFinite(row.navigationOrder)
    ? row.navigationOrder
    : UNORDERED;

/* Case-insensitive and exact. The source tested `type === 'LINK'` and treated
   everything else as an action, so a null or lowercase value executed a string;
   here everything that is not "CLICK" is a link, and the failure direction is a
   row that navigates instead of a row that evaluates. */
const isClick = (row: NavigationRow): boolean =>
  (row.navigationType ?? "").trim().toUpperCase() === "CLICK";

function toLeaf(row: NavigationRow, t: Translate): NavItem {
  /* Built by assignment rather than by object literal so absent values produce
     an ABSENT KEY, not `key: undefined`. The output is compared in tests and
     read in devtools; a row of undefineds hides the two fields that matter. */
  const item: NavItem = { title: t(row.navigationName ?? "") };

  if (row.navigationId !== undefined && row.navigationId !== null) {
    item.navigationId = row.navigationId;
  }
  if (row.navigationIcon) item.icon = row.navigationIcon;

  if (isClick(row)) {
    item.type = "CLICK";
    /* NAVIGATION_PATH is '#' on every CLICK row in the reference data, and '#'
       resolves to the site root — which would light the row on '/' and hand a
       CLICK row a destination it does not have. Dropped, not translated. */
    if (row.navigationEvent) item.event = row.navigationEvent;
  } else {
    const path = row.navigationPath?.trim();
    /* A LINK row's path is kept verbatim, '#' included. Substituting anything
       would change where a link the host authored actually goes. */
    if (path) item.href = path;
  }

  return item;
}

/**
 * Raw navigation rows → sorted `NavItem[]`, with one collapsible group per
 * distinct `navigationGroup`.
 *
 * Pure. No fetching, no state, no memoisation, no lodash — call it inside your
 * own `useMemo` on the rows you already have.
 *
 * The group parent lands at its MINIMUM child order because the rows are sorted
 * ONCE up front and a parent is appended the first time its group is seen. The
 * old mapper computed the parent's order with `_.minBy`, which returns the whole
 * ROW rather than the number, so `navigationOrder` came out as an object and the
 * second sort silently did nothing. There is no second sort here to get wrong.
 */
export function toNavItems(
  rows: readonly NavigationRow[] | null | undefined,
  options: ToNavItemsOptions = {},
): NavItem[] {
  const { t = identity, groupIcon } = options;
  if (!rows || rows.length === 0) return [];

  /* Copied before sorting. Sorting the caller's array in place would reorder
     state they still hold, and `Array.prototype.sort` has been stable since
     ES2019 — which is what keeps equal orders in input order without a
     tiebreaker index. */
  const sorted = [...rows].sort((a, b) => orderOf(a) - orderOf(b));

  const out: NavItem[] = [];
  /* Keyed on the RAW group string, never the translated one: two groups can
     translate to the same label in one language and not in another, which would
     merge and unmerge buckets as the user switches language. */
  const buckets = new Map<string, NavItem[]>();

  for (const row of sorted) {
    const group = row.navigationGroup?.trim();

    if (!group) {
      out.push(toLeaf(row, t));
      continue;
    }

    let children = buckets.get(group);
    if (!children) {
      children = [];
      const parent: NavItem = {
        /* Synthetic and raw-keyed, for the same reason as the Map key: Sidebar
           uses this as a React key, and one that changes with the language
           remounts the whole group on a language switch. */
        navigationId: `group:${group}`,
        title: t(group),
        children,
      };
      if (groupIcon !== undefined) parent.icon = groupIcon;
      buckets.set(group, children);
      out.push(parent);
    }
    children.push(toLeaf(row, t));
  }

  return out;
}
