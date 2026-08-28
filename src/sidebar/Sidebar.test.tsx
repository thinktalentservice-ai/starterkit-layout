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
