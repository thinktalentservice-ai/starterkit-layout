import { toNavItems } from "./toNavItems";
import type { NavigationRow } from "./toNavItems";

const row = (over: NavigationRow): NavigationRow => ({
  navigationName: "row",
  navigationPath: "/x",
  navigationOrder: 1,
  ...over,
});

describe("toNavItems", () => {
  it("returns [] for nothing to map", () => {
    expect(toNavItems(null)).toEqual([]);
    expect(toNavItems(undefined)).toEqual([]);
    expect(toNavItems([])).toEqual([]);
  });

  /* The trap a lexicographic sort falls into: "10" < "2" as a string. The column
     is an int and must be compared as one. */
  it("sorts by navigationOrder numerically, not lexicographically", () => {
    const out = toNavItems([
      row({ navigationName: "b", navigationOrder: 10 }),
      row({ navigationName: "c", navigationOrder: 2 }),
      row({ navigationName: "a", navigationOrder: 1 }),
    ]);
    expect(out.map((i) => i.title)).toEqual(["a", "c", "b"]);
  });

  /* `?? 0` would float these to the very top of the nav, which is the most
     visible possible place to put "we did not know". */
  it("sorts rows with no order last, in input order", () => {
    const out = toNavItems([
      row({ navigationName: "no-order-1", navigationOrder: null }),
      row({ navigationName: "ordered", navigationOrder: 5 }),
      row({ navigationName: "no-order-2", navigationOrder: undefined }),
    ]);
    expect(out.map((i) => i.title)).toEqual(["ordered", "no-order-1", "no-order-2"]);
  });

  it("does not sort the caller's array in place", () => {
    const rows = [
      row({ navigationName: "b", navigationOrder: 2 }),
      row({ navigationName: "a", navigationOrder: 1 }),
    ];
    const snapshot = [...rows];
    toNavItems(rows);
    expect(rows).toEqual(snapshot);
    expect(rows[0]).toBe(snapshot[0]);
  });

  it("leaves ungrouped rows as leaves", () => {
    const out = toNavItems([row({ navigationName: "a", navigationGroup: null })]);
    expect(out).toHaveLength(1);
    expect(out[0]).not.toHaveProperty("children");
  });

  it("builds one parent per group, positioned at its lowest child order", () => {
    const out = toNavItems([
      row({ navigationName: "one", navigationOrder: 1 }),
      row({ navigationName: "two", navigationOrder: 2, navigationGroup: "Reports" }),
      row({ navigationName: "three", navigationOrder: 3 }),
      row({ navigationName: "four", navigationOrder: 4, navigationGroup: "Reports" }),
    ]);
    expect(out.map((i) => i.title)).toEqual(["one", "Reports", "three"]);
    expect(out[1]?.children?.map((c) => c.title)).toEqual(["two", "four"]);
  });

  /* The old mapper set the parent's order from `_.minBy`, which returns the ROW
     rather than the number — so navigationOrder came out an object and the
     second sort silently did nothing. There is no second sort here, and the
     parent carries no order at all. */
  it("gives the group parent a string id and no navigationOrder", () => {
    const out = toNavItems([row({ navigationGroup: "Reports" })]);
    expect(out[0]?.navigationId).toBe("group:Reports");
    expect(out[0]).not.toHaveProperty("navigationOrder");
  });

  it("keys the group on the raw column value, not the translated label", () => {
    const out = toNavItems([row({ navigationGroup: "Reports" })], {
      t: (k) => k.toUpperCase(),
    });
    // Two groups can collide in one language and not another; the key must not move.
    expect(out[0]?.navigationId).toBe("group:Reports");
    expect(out[0]?.title).toBe("REPORTS");
  });

  it("keeps a one-child group a group", () => {
    const out = toNavItems([row({ navigationGroup: "Reports" })]);
    expect(out[0]?.children).toHaveLength(1);
  });

  describe("LINK vs CLICK", () => {
    it("maps a CLICK row to type + event, and drops its path", () => {
      const out = toNavItems([
        row({
          navigationName: "sidebar.freshdesk.help",
          navigationPath: "#",
          navigationIcon: "mdi mdi-help-circle",
          navigationType: "CLICK",
          navigationEvent: "FreshworksWidget('open')",
        }),
      ]);
      expect(out[0]).toEqual({
        title: "sidebar.freshdesk.help",
        icon: "mdi mdi-help-circle",
        type: "CLICK",
        event: "FreshworksWidget('open')",
      });
    });

    /* Not only when the path is '#'. A CLICK row has no destination whatever its
       column says, and keeping one would light it as the current route. */
    it("drops a CLICK row's path even when it is a real one", () => {
      const out = toNavItems([
        row({ navigationPath: "/reports", navigationType: "CLICK", navigationEvent: "x()" }),
      ]);
      expect(out[0]).not.toHaveProperty("href");
    });

    it("keeps a LINK row's path verbatim, '#' included", () => {
      const out = toNavItems([row({ navigationPath: "#", navigationType: "LINK" })]);
      expect(out[0]?.href).toBe("#");
    });

    /* The failure direction that matters. The source tested `=== 'LINK'`, so a
       null or unknown type fell through to EXECUTING a string. */
    it.each([[null], [undefined], ["BUTTON"], [""], ["  "]])(
      "treats navigationType %p as a link",
      (navigationType) => {
        const out = toNavItems([row({ navigationType, navigationEvent: "boom()" })]);
        expect(out[0]).not.toHaveProperty("type");
        expect(out[0]).not.toHaveProperty("event");
        expect(out[0]?.href).toBe("/x");
      },
    );

    it.each([["click"], [" Click "]])("accepts %p as CLICK", (navigationType) => {
      const out = toNavItems([row({ navigationType, navigationEvent: "x()" })]);
      expect(out[0]?.type).toBe("CLICK");
    });

    /* An inert button, not a downgrade to a link — sending the user to '#' or
       '/' is a wrong navigation, which is worse than a control that does nothing. */
    it("keeps a CLICK row with no event as a CLICK row", () => {
      const out = toNavItems([row({ navigationType: "CLICK", navigationEvent: null })]);
      expect(out[0]?.type).toBe("CLICK");
      expect(out[0]).not.toHaveProperty("event");
    });
  });

  it("applies `t` to the name and the group key, and defaults to identity", () => {
    expect(toNavItems([row({ navigationName: "a.b" })])[0]?.title).toBe("a.b");
    const out = toNavItems([row({ navigationName: "a.b", navigationGroup: "g" })], {
      t: (k) => k.toUpperCase(),
    });
    expect(out[0]?.title).toBe("G");
    expect(out[0]?.children?.[0]?.title).toBe("A.B");
  });

  /* The old mapper hardcoded "mdi mdi-account-circle", which needs a font this
     package does not depend on and paints an account glyph on "Reports". */
  it("gives a group parent no icon unless one is supplied", () => {
    expect(toNavItems([row({ navigationGroup: "g" })])[0]).not.toHaveProperty("icon");
    const out = toNavItems([row({ navigationGroup: "g" })], { groupIcon: "bi bi-folder" });
    expect(out[0]?.icon).toBe("bi bi-folder");
  });

  it("carries navigationId, and omits absent optional fields entirely", () => {
    const out = toNavItems([row({ navigationId: 43, navigationIcon: null })]);
    expect(out[0]?.navigationId).toBe(43);
    // An absent key, not `icon: undefined` — devtools and toEqual both read better.
    expect(out[0]).not.toHaveProperty("icon");
  });

  it("does not filter by anything — status and role are the host's call", () => {
    // No status/userType field exists on NavigationRow; every row passed in comes out.
    const out = toNavItems([row({ navigationName: "a" }), row({ navigationName: "b" })]);
    expect(out).toHaveLength(2);
  });
});
