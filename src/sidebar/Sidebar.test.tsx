import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Sidebar } from "./Sidebar";
import { NavSubMenu } from "./NavSubMenu";
import { isUnder, toRouteKey } from "./activeRoute";
import type { NavItem } from "../types";

/* Moves window.location.pathname in jsdom. Must run BEFORE render — the route
   hook listens for popstate, which pushState deliberately does not fire. */
const goTo = (path: string) => window.history.pushState({}, "", path);

const items: NavItem[] = [
  { caption: "Main" },
  { navigationId: 1, title: "Home", href: "/home", icon: "bi bi-house" },
  { navigationId: 2, title: "Reports", href: "/reports", suffix: "3", suffixColor: "bg-danger" },
  {
    navigationId: 3,
    title: "Apps",
    href: "/apps",
    children: [
      { navigationId: 31, title: "Chat", href: "/apps/chat" },
      { navigationId: 32, title: "Mail", href: "/apps/mail" },
    ],
  },
];

async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

// Every test starts from a known route, and leaves one behind.
afterEach(() => goTo("/"));

describe("Sidebar", () => {
  it("renders a caption as a heading, not a link", () => {
    const { container } = render(<Sidebar navItems={items} />);
    const caption = container.querySelector(".il-nav-caption");
    expect(caption).toHaveTextContent("Main");
    expect(caption?.querySelector("a")).toBeNull();
  });

  it("falls back to '/' for a leaf with no href", () => {
    render(<Sidebar navItems={[{ title: "Orphan" }]} />);
    expect(screen.getByRole("link", { name: /Orphan/ })).toHaveAttribute("href", "/");
  });

  /* The reason next/link is gone. Rows point at sibling apps on the same host,
     which no router can client-navigate, and a Link would have rewritten or
     prefetched a URL it does not own. A plain <a> hands the string to the
     browser untouched. */
  it("renders an absolute cross-app href verbatim", () => {
    const href = "https://nextv3.thinktalent.info/landing-user/user/task-list";
    render(<Sidebar navItems={[{ navigationId: 1, title: "Tasks", href }]} />);
    expect(screen.getByRole("link", { name: /Tasks/ })).toHaveAttribute("href", href);
  });

  it("renders a string icon as a class name, and a node as itself", () => {
    const { container } = render(
      <Sidebar
        navItems={[
          { navigationId: 1, title: "A", href: "/a", icon: "bi bi-house" },
          { navigationId: 2, title: "B", href: "/b", icon: <span data-testid="node-icon" /> },
        ]}
      />,
    );
    expect(container.querySelector("i.bi.bi-house")).toBeInTheDocument();
    expect(screen.getByTestId("node-icon")).toBeInTheDocument();
  });

  it("renders the suffix badge only when there is one", () => {
    const { container } = render(<Sidebar navItems={items} />);
    const badges = container.querySelectorAll(".badge");
    // Only "Reports" carries a suffix; the source emitted an empty badge on every row.
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent("3");
    expect(badges[0]).toHaveClass("bg-danger");
  });

  it("applies `t` to titles and captions, and defaults to identity", () => {
    const { rerender, container } = render(<Sidebar navItems={items} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    rerender(<Sidebar navItems={items} t={(k) => k.toUpperCase()} />);
    expect(screen.getByText("HOME")).toBeInTheDocument();
    expect(container.querySelector(".il-nav-caption")).toHaveTextContent("MAIN");
  });

  it("renders an empty nav without throwing", () => {
    const { container } = render(<Sidebar navItems={[]} />);
    expect(container.querySelector(".il-sidebar-box")).toBeInTheDocument();
  });

  it("takes the user block as props, with no hard-coded identity", () => {
    const { container } = render(
      <Sidebar navItems={items} sidebarUser={{ initials: "AB", name: "Ada B" }} />,
    );
    expect(container.querySelector(".il-sidebar-avatar")).toHaveTextContent("AB");
    expect(container.querySelector(".il-sidebar-username")).toHaveTextContent("Ada B");
    // The source hard-coded "JD" / "John Deo" into the markup.
    expect(container.textContent).not.toContain("John Deo");
  });

  it("removes the user block when sidebarHeader is null", () => {
    const { container } = render(<Sidebar navItems={items} sidebarHeader={null} />);
    expect(container.querySelector(".il-sidebar-user")).toBeNull();
  });

  describe("fixed-variant offset", () => {
    /* motion writes `animate` values to inline style asynchronously — `initial`
       lands synchronously, the rest arrives on a later frame. So these assert
       through waitFor rather than reading style straight after render.

       The unmeasured case is the exception and must NOT use waitFor: proving a
       value never appears is not something waitFor can do, so it asserts the
       negative after giving the same number of frames a chance to write it. */
    const boxOf = (c: HTMLElement) => c.querySelector(".il-sidebar-box") as HTMLElement;

    it("omits `top` entirely while topbarHeight is unmeasured", async () => {
      /* null must not become 0 — animating up from zero on first paint is the
         bug this three-state prop exists to avoid. */
      const { container } = render(<Sidebar navItems={items} isFixed topbarHeight={null} />);
      await new Promise((r) => setTimeout(r, 60));
      expect(boxOf(container).style.top).toBe("");
    });

    it("docks to the measured height when fixed", async () => {
      const { container } = render(<Sidebar navItems={items} isFixed topbarHeight={59} />);
      await waitFor(() => expect(boxOf(container).style.top).toBe("59px"));
    });

    it("collapses to 0 when the header is hidden", async () => {
      const { container } = render(
        <Sidebar navItems={items} isFixed topbarHeight={59} headerHidden />,
      );
      await waitFor(() => expect(boxOf(container).style.top).toBe("0px"));
    });

    it("still emits top:0 for the in-flow variant, so a stale inline offset cannot linger", async () => {
      const { container } = render(<Sidebar navItems={items} isFixed={false} topbarHeight={59} />);
      await waitFor(() => expect(boxOf(container).style.top).toBe("0px"));
      expect(container.querySelector(".il-fixed-sidebar")).toBeNull();
    });
  });

  it("has no axe violations", async () => {
    const { container } = render(<Sidebar navItems={items} />);
    await expectNoViolations(container);
  });
});

/* Pure functions, so the cross-app origin is just an argument — no need to boot
   a DOM on nextv3.thinktalent.info to prove the matching rule. */
describe("route matching", () => {
  const HOST = "https://nextv3.thinktalent.info";

  it("leaves an href that carries a scheme alone, and resolves one that does not", () => {
    expect(toRouteKey(`${HOST}/landing-user/user/task-list`, "http://localhost:3000")).toBe(
      `${HOST}/landing-user/user/task-list`,
    );
    expect(toRouteKey("/user/landing", HOST)).toBe(`${HOST}/user/landing`);
  });

  it("drops query and hash, and normalises a trailing slash", () => {
    // "/reports?page=2" is still the "/reports" row.
    expect(toRouteKey("/reports?page=2#top", HOST)).toBe(`${HOST}/reports`);
    expect(toRouteKey("/apps/", HOST)).toBe(`${HOST}/apps`);
  });

  it("returns '' for an unresolvable href rather than throwing", () => {
    expect(toRouteKey(undefined, HOST)).toBe("");
    expect(toRouteKey("/x", "")).toBe("");
    expect(toRouteKey("http://[", HOST)).toBe("");
  });

  it("matches a route and its descendants, but not a sibling sharing its prefix", () => {
    const key = `${HOST}/apps`;
    expect(isUnder(key, `${HOST}/apps`)).toBe(true);
    expect(isUnder(key, `${HOST}/apps/chat`)).toBe(true);
    // Without the "/" appended to the key, this one passes and lights the wrong row.
    expect(isUnder(key, `${HOST}/apps-2/chat`)).toBe(false);
    expect(isUnder(key, `${HOST}/other`)).toBe(false);
  });

  it("holds root to an exact match, so a '/' row does not light on every page", () => {
    expect(isUnder(`${HOST}/`, `${HOST}/`)).toBe(true);
    expect(isUnder(`${HOST}/`, `${HOST}/apps`)).toBe(false);
  });

  it("does not match across origins", () => {
    expect(isUnder(`${HOST}/apps`, "http://localhost:3000/apps")).toBe(false);
  });

  it("never matches the empty server-render route", () => {
    expect(isUnder(`${HOST}/apps`, "")).toBe(false);
    expect(isUnder("", `${HOST}/apps`)).toBe(false);
  });
});

describe("active link", () => {
  it("lights the deepest matching row on a detail route, and only that one", () => {
    goTo("/user/task-list/123");
    const { container } = render(
      <Sidebar
        navItems={[
          { navigationId: 1, title: "User", href: "/user" },
          { navigationId: 2, title: "Task list", href: "/user/task-list" },
        ]}
      />,
    );
    const active = container.querySelectorAll(".il-active-link");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent("Task list");
  });

  it("does not light the '/' row on a deeper route", () => {
    goTo("/user");
    const { container } = render(
      <Sidebar
        navItems={[
          { navigationId: 1, title: "Home", href: "/" },
          { navigationId: 2, title: "User", href: "/user" },
        ]}
      />,
    );
    const active = container.querySelectorAll(".il-active-link");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent("User");
  });

  it("does not light a sibling row that merely shares a prefix", () => {
    goTo("/apps-2/chat");
    const { container } = render(
      <Sidebar navItems={[{ navigationId: 1, title: "Apps", href: "/apps" }]} />,
    );
    expect(container.querySelector(".il-active-link")).toBeNull();
  });

  it("lights nothing when no row matches", () => {
    goTo("/somewhere-else");
    const { container } = render(<Sidebar navItems={items} />);
    expect(container.querySelector(".il-active-link")).toBeNull();
  });
});

describe("CLICK rows", () => {
  /* The event is a STRING of source, so a test cannot hand it a spy — it can only
     observe a side effect on a global, which is the only scope the compiled
     function can reach. Setting a counter is the whole of the dangerous code. */
  type Probe = { __navHit?: unknown };
  const probe = () => globalThis as unknown as Probe;
  const hit = () => probe().__navHit;
  const HIT = "globalThis.__navHit = (globalThis.__navHit ?? 0) + 1";

  /* SimpleBar console.errors on mount under jsdom, which has no
     getComputedStyle for it — so a bare `toHaveBeenCalled` on the spy asserts
     that noise, not ours. Only this package's own messages count. */
  const navErrors = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].startsWith("[starterkit-layout]"),
    );

  afterEach(() => {
    delete probe().__navHit;
  });

  const clickRow: NavItem = {
    navigationId: 43,
    title: "Help",
    href: "#",
    icon: "mdi mdi-help-circle",
    type: "CLICK",
    event: HIT,
  };

  it("renders a CLICK row as a button, never as a link", () => {
    render(<Sidebar navItems={[clickRow]} />);
    expect(screen.getByRole("button", { name: /Help/ })).toHaveAttribute("type", "button");
    // The source rendered an <a> with no href: not focusable, deaf to Enter and Space.
    expect(screen.queryByRole("link", { name: /Help/ })).toBeNull();
  });

  it("defaults to LINK when type is absent", () => {
    render(<Sidebar navItems={[{ navigationId: 1, title: "Home", href: "/home" }]} />);
    expect(screen.getByRole("link", { name: /Home/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Home/ })).toBeNull();
  });

  it("runs the row's own event, once per click", async () => {
    const user = userEvent.setup();
    render(<Sidebar navItems={[clickRow]} />);
    const button = screen.getByRole("button", { name: /Help/ });

    await user.click(button);
    expect(hit()).toBe(1);
    // Compiled per click, not latched to a one-shot.
    await user.click(button);
    expect(hit()).toBe(2);
  });

  it("catches a throwing event and leaves the rest of the nav working", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Sidebar
        navItems={[
          { navigationId: 1, title: "Boom", type: "CLICK", event: "throw new Error('boom')" },
          { navigationId: 2, title: "Help", type: "CLICK", event: HIT },
          { navigationId: 3, title: "Home", href: "/home" },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Boom/ }));
    const logged = navErrors(spy);
    expect(logged).toHaveLength(1);
    // The message must name the row; "SyntaxError" alone is unactionable at 40 rows.
    expect(String(logged[0]?.[0])).toContain("Boom");

    await user.click(screen.getByRole("button", { name: /Help/ }));
    expect(hit()).toBe(1);
    expect(screen.getByRole("link", { name: /Home/ })).toBeInTheDocument();
    spy.mockRestore();
  });

  it("is silent when the event is empty or absent", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Sidebar
        navItems={[
          { navigationId: 1, title: "Empty", type: "CLICK", event: "  " },
          { navigationId: 2, title: "Missing", type: "CLICK" },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Empty/ }));
    await user.click(screen.getByRole("button", { name: /Missing/ }));
    expect(hit()).toBeUndefined();
    // An unfilled event column is a no-op, not an error worth logging.
    expect(navErrors(spy)).toEqual([]);
    spy.mockRestore();
  });

  it("is the same box as a LINK row — same classes, icon and badge", () => {
    const { container } = render(
      <Sidebar navItems={[{ ...clickRow, suffix: "2", suffixColor: "bg-danger" }]} />,
    );
    const button = container.querySelector("button.nav-link.mb-2");
    expect(button).toBeInTheDocument();
    expect(button?.querySelector(".il-nav-icon i.mdi.mdi-help-circle")).toBeInTheDocument();
    expect(button?.querySelector(".badge")).toHaveTextContent("2");
  });

  /* toRouteKey('#', origin) reduces to the origin root, so without the exclusion
     every CLICK row in the nav lights up on '/'. */
  it("never lights a CLICK row, even at the site root", () => {
    goTo("/");
    const { container } = render(
      <Sidebar navItems={[{ navigationId: 1, title: "Home", href: "/" }, clickRow]} />,
    );
    const active = container.querySelectorAll(".il-active-link");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent("Home");
  });

  /* The case keeping CLICK rows out of the resolver does NOT cover: two rows can
     carry the same href string, so the winner must be re-checked at the row. */
  it("never lights a CLICK row that shares the active row's href", () => {
    goTo("/reports");
    const { container } = render(
      <Sidebar
        navItems={[
          { navigationId: 1, title: "Reports", href: "/reports" },
          { navigationId: 2, title: "Export", href: "/reports", type: "CLICK", event: HIT },
        ]}
      />,
    );
    const active = container.querySelectorAll(".il-active-link");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent("Reports");
  });

  describe("inside a group", () => {
    const group: NavItem[] = [
      {
        navigationId: 9,
        title: "Support",
        // The parent says CLICK and carries an event. Both must be ignored.
        type: "CLICK",
        event: "globalThis.__navHit = 'parent'",
        defaultOpen: true,
        children: [
          {
            navigationId: 91,
            title: "Chat",
            type: "CLICK",
            event: "globalThis.__navHit = 'child'",
          },
          { navigationId: 92, title: "Docs", href: "/docs" },
        ],
      },
    ];

    /* The source passed the PARENT's type and event to every child, so one CLICK
       group turned all its children into buttons running the parent's string. */
    it("runs the child's own event, not the parent's", async () => {
      const user = userEvent.setup();
      render(<Sidebar navItems={group} />);
      await user.click(screen.getByRole("button", { name: /Chat/ }));
      expect(hit()).toBe("child");
      // And a LINK sibling is untouched by the parent's CLICK.
      expect(screen.getByRole("link", { name: /Docs/ })).toHaveAttribute("href", "/docs");
    });

    it("keeps the group row a toggle even when it says CLICK", async () => {
      const user = userEvent.setup();
      render(<Sidebar navItems={group} />);
      const toggle = screen.getByRole("button", { name: /Support/ });
      expect(toggle).toHaveAttribute("aria-expanded", "true");

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(hit()).toBeUndefined();
    });

    it("never lights a CLICK child", () => {
      goTo("/apps/chat");
      const { container } = render(
        <Sidebar
          navItems={[
            { navigationId: 1, title: "Chat page", href: "/apps/chat" },
            {
              navigationId: 9,
              title: "Support",
              defaultOpen: true,
              children: [
                { navigationId: 91, title: "Chat", href: "/apps/chat", type: "CLICK", event: HIT },
              ],
            },
          ]}
        />,
      );
      const active = container.querySelectorAll(".il-active-link");
      expect(active).toHaveLength(1);
      expect(active[0]).toHaveTextContent("Chat page");
    });
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Sidebar
        navItems={[
          clickRow,
          {
            navigationId: 9,
            title: "Support",
            defaultOpen: true,
            children: [{ navigationId: 91, title: "Chat", type: "CLICK", event: HIT }],
          },
        ]}
      />,
    );
    await expectNoViolations(container);
  });
});

describe("NavSubMenu open state", () => {
  /* The shell used to derive this from the current path. It cannot any more —
     an href is an absolute URL into a sibling app, so there is nothing to
     compare it against — and the decision now travels on the item itself. */
  it("seeds a group open from the item's own defaultOpen", () => {
    const { container } = render(
      <Sidebar
        navItems={[
          {
            navigationId: 3,
            title: "Apps",
            href: "/apps",
            defaultOpen: true,
            children: [{ navigationId: 31, title: "Chat", href: "/apps/chat" }],
          },
        ]}
      />,
    );
    expect(container.querySelector(".il-active-parent")).toBeInTheDocument();
  });

  it("leaves a group closed when nothing asks for it", () => {
    goTo("/somewhere-else");
    const { container } = render(<Sidebar navItems={items} />);
    expect(container.querySelector(".il-active-parent")).toBeNull();
  });

  it("opens a group whose child is the current route, and lights that child", () => {
    goTo("/apps/chat");
    const { container } = render(<Sidebar navItems={items} />);
    expect(container.querySelector(".il-active-parent")).toBeInTheDocument();
    const active = container.querySelectorAll(".il-active-link");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent("Chat");
  });

  it("opens the group from a route BELOW the child, not just an exact hit", () => {
    goTo("/apps/chat/42");
    const { container } = render(<Sidebar navItems={items} />);
    expect(container.querySelector(".il-active-parent")).toBeInTheDocument();
    expect(container.querySelector(".il-active-link")).toHaveTextContent("Chat");
  });

  /* The group's own href is a toggle, not a destination. If it competed for the
     highlight it would beat its children on a route like /apps/chat. */
  it("does not treat a group's own href as a candidate", () => {
    goTo("/apps");
    const { container } = render(<Sidebar navItems={items} />);
    expect(container.querySelector(".il-active-link")).toBeNull();
    expect(container.querySelector(".il-active-parent")).toBeNull();
  });

  /* The reason the seeding effect is latched rather than mount-only. Under SSR
     the route is unknowable, so Sidebar hands down defaultOpen=false and only
     flips it true one commit after hydration — by which time a `[]` effect has
     already run and the group would never open. */
  it("opens when defaultOpen turns true after the first render", () => {
    const kids: NavItem[] = [{ navigationId: 1, title: "Chat", href: "/apps/chat" }];
    const { rerender, container } = render(
      <NavSubMenu title="Apps" items={kids} defaultOpen={false} />,
    );
    expect(container.querySelector(".il-active-parent")).toBeNull();

    rerender(<NavSubMenu title="Apps" items={kids} defaultOpen />);
    expect(container.querySelector(".il-active-parent")).toBeInTheDocument();
  });

  it("ignores later defaultOpen changes, so a rerender cannot reopen a collapsed group", async () => {
    const user = userEvent.setup();
    const kids: NavItem[] = [{ navigationId: 1, title: "Chat", href: "/apps/chat" }];
    const { rerender, container } = render(<NavSubMenu title="Apps" items={kids} defaultOpen />);
    expect(container.querySelector(".il-active-parent")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Apps/ }));
    expect(container.querySelector(".il-active-parent")).toBeNull();

    rerender(<NavSubMenu title="Apps" items={kids} defaultOpen />);
    expect(container.querySelector(".il-active-parent")).toBeNull();
  });

  it("exposes the toggle as a real button wired to the panel", async () => {
    const user = userEvent.setup();
    const kids: NavItem[] = [{ navigationId: 1, title: "Chat", href: "/apps/chat" }];
    render(<NavSubMenu title="Apps" items={kids} />);

    const toggle = screen.getByRole("button", { name: /Apps/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
