import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Sidebar } from "./Sidebar";
import { NavSubMenu } from "./NavSubMenu";
import type { NavItem } from "../types";

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

describe("Sidebar", () => {
  it("renders a caption as a heading, not a link", () => {
    const { container } = render(<Sidebar navItems={items} pathname="/home" />);
    const caption = container.querySelector(".il-nav-caption");
    expect(caption).toHaveTextContent("Main");
    expect(caption?.querySelector("a")).toBeNull();
  });

  it("marks the exact-match row active", () => {
    const { container } = render(<Sidebar navItems={items} pathname="/home" />);
    const active = container.querySelectorAll(".il-active-link");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent("Home");
  });

  it("falls back to '/' for a leaf with no href", () => {
    render(<Sidebar navItems={[{ title: "Orphan" }]} pathname="/x" />);
    expect(screen.getByRole("link", { name: /Orphan/ })).toHaveAttribute("href", "/");
  });

  it("renders a string icon as a class name, and a node as itself", () => {
    const { container } = render(
      <Sidebar
        navItems={[
          { navigationId: 1, title: "A", href: "/a", icon: "bi bi-house" },
          { navigationId: 2, title: "B", href: "/b", icon: <span data-testid="node-icon" /> },
        ]}
        pathname="/"
      />,
    );
    expect(container.querySelector("i.bi.bi-house")).toBeInTheDocument();
    expect(screen.getByTestId("node-icon")).toBeInTheDocument();
  });

  it("renders the suffix badge only when there is one", () => {
    const { container } = render(<Sidebar navItems={items} pathname="/" />);
    const badges = container.querySelectorAll(".badge");
    // Only "Reports" carries a suffix; the source emitted an empty badge on every row.
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent("3");
    expect(badges[0]).toHaveClass("bg-danger");
  });

  it("applies `t` to titles and captions, and defaults to identity", () => {
    const { rerender, container } = render(<Sidebar navItems={items} pathname="/" />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    rerender(<Sidebar navItems={items} pathname="/" t={(k) => k.toUpperCase()} />);
    expect(screen.getByText("HOME")).toBeInTheDocument();
    expect(container.querySelector(".il-nav-caption")).toHaveTextContent("MAIN");
  });

  it("renders an empty nav without throwing", () => {
    const { container } = render(<Sidebar navItems={[]} pathname="/" />);
    expect(container.querySelector(".il-sidebar-box")).toBeInTheDocument();
  });

  it("takes the user block as props, with no hard-coded identity", () => {
    const { container } = render(
      <Sidebar navItems={items} pathname="/" sidebarUser={{ initials: "AB", name: "Ada B" }} />,
    );
    expect(container.querySelector(".il-sidebar-avatar")).toHaveTextContent("AB");
    expect(container.querySelector(".il-sidebar-username")).toHaveTextContent("Ada B");
    // The source hard-coded "JD" / "John Deo" into the markup.
    expect(container.textContent).not.toContain("John Deo");
  });

  it("removes the user block when sidebarHeader is null", () => {
    const { container } = render(
      <Sidebar navItems={items} pathname="/" sidebarHeader={null} />,
    );
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
      const { container } = render(
        <Sidebar navItems={items} pathname="/" isFixed topbarHeight={null} />,
      );
      await new Promise((r) => setTimeout(r, 60));
      expect(boxOf(container).style.top).toBe("");
    });

    it("docks to the measured height when fixed", async () => {
      const { container } = render(
        <Sidebar navItems={items} pathname="/" isFixed topbarHeight={59} />,
      );
      await waitFor(() => expect(boxOf(container).style.top).toBe("59px"));
    });

    it("collapses to 0 when the header is hidden", async () => {
      const { container } = render(
        <Sidebar navItems={items} pathname="/" isFixed topbarHeight={59} headerHidden />,
      );
      await waitFor(() => expect(boxOf(container).style.top).toBe("0px"));
    });

    it("still emits top:0 for the in-flow variant, so a stale inline offset cannot linger", async () => {
      const { container } = render(
        <Sidebar navItems={items} pathname="/" isFixed={false} topbarHeight={59} />,
      );
      await waitFor(() => expect(boxOf(container).style.top).toBe("0px"));
      expect(container.querySelector(".il-fixed-sidebar")).toBeNull();
    });
  });

  it("has no axe violations", async () => {
    const { container } = render(<Sidebar navItems={items} pathname="/home" />);
    await expectNoViolations(container);
  });
});

describe("NavSubMenu defaultOpen derivation", () => {
  /* The source's rule, preserved verbatim:
       currentURL = location.slice(0, location.lastIndexOf("/"))
     and a group opens when currentURL === its own href. For "/apps/chat" that
     is "/apps", so a group auto-opens only when its href is the PARENT segment.
     Pinned because it is subtle and a plausible "fix" (startsWith, includes)
     changes which groups open. */
  it("opens the group whose href is the parent segment of the route", () => {
    const { container } = render(<Sidebar navItems={items} pathname="/apps/chat" />);
    expect(container.querySelector(".il-active-parent")).toBeInTheDocument();
  });

  it("does NOT open it when the route is the group's own href", () => {
    // "/apps".slice(0, lastIndexOf("/")) === "" — which matches no href.
    const { container } = render(<Sidebar navItems={items} pathname="/apps" />);
    expect(container.querySelector(".il-active-parent")).toBeNull();
  });

  it("does not open it for a deeper route", () => {
    // "/apps/chat/42" → "/apps/chat", which is not the group's href.
    const { container } = render(<Sidebar navItems={items} pathname="/apps/chat/42" />);
    expect(container.querySelector(".il-active-parent")).toBeNull();
  });

  it("ignores later defaultOpen changes, so navigating cannot reopen a collapsed group", async () => {
    const user = userEvent.setup();
    const kids: NavItem[] = [{ navigationId: 1, title: "Chat", href: "/apps/chat" }];
    const { rerender, container } = render(
      <NavSubMenu title="Apps" items={kids} defaultOpen pathname="/apps/chat" />,
    );
    expect(container.querySelector(".il-active-parent")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Apps/ }));
    expect(container.querySelector(".il-active-parent")).toBeNull();

    rerender(<NavSubMenu title="Apps" items={kids} defaultOpen pathname="/apps/mail" />);
    expect(container.querySelector(".il-active-parent")).toBeNull();
  });

  it("exposes the toggle as a real button wired to the panel", async () => {
    const user = userEvent.setup();
    const kids: NavItem[] = [{ navigationId: 1, title: "Chat", href: "/apps/chat" }];
    render(<NavSubMenu title="Apps" items={kids} pathname="/" />);

    const toggle = screen.getByRole("button", { name: /Apps/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
