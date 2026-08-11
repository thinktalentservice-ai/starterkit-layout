import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { FullLayout } from "./FullLayout";
import { setMatchMedia } from "./test-setup";
import type { NavItem } from "./types";

const navItems: NavItem[] = [
  { caption: "Main" },
  { navigationId: 1, title: "Home", href: "/home" },
  { navigationId: 2, title: "Reports", href: "/reports" },
];

const shell = (c: HTMLElement) => c.querySelector(".il-shell") as HTMLElement;
const aside = (c: HTMLElement) => c.querySelector("aside") as HTMLElement;

async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

describe("FullLayout", () => {
  it("renders children inside the content area", () => {
    const { container } = render(
      <FullLayout navItems={navItems} pathname="/home">
        <p>page body</p>
      </FullLayout>,
    );
    const content = container.querySelector(".il-content-area") as HTMLElement;
    expect(content).toContainElement(screen.getByText("page body"));
  });

  it("maps controlled state onto shell classes", () => {
    const { container, rerender } = render(<FullLayout navItems={navItems} pathname="/" />);
    expect(shell(container)).not.toHaveClass("il-is-mini");
    expect(aside(container)).not.toHaveClass("il-show-sidebar");

    rerender(<FullLayout navItems={navItems} pathname="/" miniSidebar mobileSidebarOpen />);
    expect(shell(container)).toHaveClass("il-is-mini");
    expect(aside(container)).toHaveClass("il-show-sidebar");
  });

  it("sets dir in both directions, not just rtl", () => {
    const { container, rerender } = render(<FullLayout navItems={navItems} pathname="/" />);
    expect(container.querySelector("[dir='ltr']")).toBeInTheDocument();
    rerender(<FullLayout navItems={navItems} pathname="/" isRTL />);
    expect(container.querySelector("[dir='rtl']")).toBeInTheDocument();
  });

  it("applies isTopbarFixed to the content column", () => {
    const { container } = render(<FullLayout navItems={navItems} pathname="/" isTopbarFixed />);
    expect(container.querySelector(".il-content-area")).toHaveClass("il-fixed-topbar");
  });

  it("emits geometry overrides as custom properties on the shell", () => {
    const { container } = render(
      <FullLayout
        navItems={navItems}
        pathname="/"
        geometry={{ sidebarWidth: 320, topbarHeight: "4rem" }}
      />,
    );
    const s = shell(container);
    expect(s.style.getPropertyValue("--il-sidebar-width")).toBe("320px");
    expect(s.style.getPropertyValue("--il-topbar-height")).toBe("4rem");
    // Unset keys must not emit an empty declaration that would override the sheet.
    expect(s.style.getPropertyValue("--il-mini-sidebar-width")).toBe("");
  });

  /* The highest-value test in this file. Off-canvas is a visual state only, so
     without `inert` a keyboard user tabs into a menu parked off-screen. All
     three cells matter and two of them are "must NOT be inert". */
  describe("the inert matrix", () => {
    it("is inert below lg while the drawer is closed", async () => {
      setMatchMedia(false);
      const { container } = render(<FullLayout navItems={navItems} pathname="/" />);
      await waitFor(() => expect(aside(container)).toHaveAttribute("inert"));
    });

    it("is NOT inert below lg once the drawer opens", async () => {
      setMatchMedia(false);
      const { container } = render(
        <FullLayout navItems={navItems} pathname="/" mobileSidebarOpen onCloseMobile={() => {}} />,
      );
      await waitFor(() => expect(aside(container)).not.toHaveAttribute("inert"));
    });

    it("is NOT inert on desktop", async () => {
      const { container } = render(<FullLayout navItems={navItems} pathname="/" />);
      await waitFor(() => expect(aside(container)).not.toHaveAttribute("inert"));
    });
  });

  describe("drawer dismissal", () => {
    it("closes on Escape, and unbinds once closed", async () => {
      const onCloseMobile = vi.fn();
      const { rerender } = render(
        <FullLayout navItems={navItems} pathname="/" mobileSidebarOpen onCloseMobile={onCloseMobile} />,
      );
      onCloseMobile.mockClear();

      await userEvent.keyboard("{Escape}");
      expect(onCloseMobile).toHaveBeenCalledTimes(1);

      rerender(
        <FullLayout
          navItems={navItems}
          pathname="/"
          mobileSidebarOpen={false}
          onCloseMobile={onCloseMobile}
        />,
      );
      onCloseMobile.mockClear();
      await userEvent.keyboard("{Escape}");
      expect(onCloseMobile).not.toHaveBeenCalled();
    });

    it("closes on overlay click, and the overlay is a named button", async () => {
      const onCloseMobile = vi.fn();
      render(
        <FullLayout navItems={navItems} pathname="/" mobileSidebarOpen onCloseMobile={onCloseMobile} />,
      );
      const overlay = screen.getByRole("button", { name: "Close menu" });
      onCloseMobile.mockClear();
      await userEvent.click(overlay);
      expect(onCloseMobile).toHaveBeenCalled();
    });

    it("closes on route change", () => {
      const onCloseMobile = vi.fn();
      const { rerender } = render(
        <FullLayout navItems={navItems} pathname="/a" mobileSidebarOpen onCloseMobile={onCloseMobile} />,
      );
      onCloseMobile.mockClear();
      rerender(
        <FullLayout navItems={navItems} pathname="/b" mobileSidebarOpen onCloseMobile={onCloseMobile} />,
      );
      expect(onCloseMobile).toHaveBeenCalled();
    });

    it("closes when crossing up into desktop", async () => {
      setMatchMedia(false);
      const onCloseMobile = vi.fn();
      render(
        <FullLayout navItems={navItems} pathname="/" mobileSidebarOpen onCloseMobile={onCloseMobile} />,
      );
      onCloseMobile.mockClear();
      setMatchMedia(true);
      await waitFor(() => expect(onCloseMobile).toHaveBeenCalled());
    });

    it("renders no overlay while closed", () => {
      render(<FullLayout navItems={navItems} pathname="/" />);
      expect(screen.queryByRole("button", { name: "Close menu" })).not.toBeInTheDocument();
    });
  });

  describe("body scroll lock", () => {
    afterEach(() => {
      document.body.style.overflow = "";
    });

    it("locks while open and RESTORES the previous value, not blank", async () => {
      /* A host that sets its own body overflow would otherwise lose it the first
         time a drawer opened — hence save/restore rather than clearing. */
      document.body.style.overflow = "auto";
      const { rerender } = render(
        <FullLayout navItems={navItems} pathname="/" mobileSidebarOpen onCloseMobile={() => {}} />,
      );
      expect(document.body.style.overflow).toBe("hidden");

      rerender(
        <FullLayout navItems={navItems} pathname="/" mobileSidebarOpen={false} onCloseMobile={() => {}} />,
      );
      await waitFor(() => expect(document.body.style.overflow).toBe("auto"));
    });
  });

  describe("chrome is slots, with no app content baked in", () => {
    it("renders none of the source's hard-coded content by default", () => {
      const { container } = render(<FullLayout navItems={navItems} pathname="/" />);
      const html = container.innerHTML;
      // The source hard-coded all three into the header markup.
      expect(html).not.toContain("Candidate");
      expect(html).not.toContain("/auth/login");
      expect(container.querySelector(".il-avatar-btn")).toBeNull();
      expect(container.querySelector(".il-role-badge")).toBeNull();
    });

    it("renders a role badge and profile when given", () => {
      const { container } = render(
        <FullLayout
          navItems={navItems}
          pathname="/"
          roleBadge="Reviewer"
          profile={{ initials: "AB", menu: <span>menu body</span> }}
        />,
      );
      expect(container.querySelector(".il-role-badge")).toHaveTextContent("Reviewer");
      expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
    });

    it("hides the search field when search={false}", () => {
      const { container, rerender } = render(<FullLayout navItems={navItems} pathname="/" />);
      expect(container.querySelector("input[type='search']")).toBeInTheDocument();
      rerender(<FullLayout navItems={navItems} pathname="/" search={false} />);
      expect(container.querySelector("input[type='search']")).not.toBeInTheDocument();
    });

    it("renders header dropdowns with their label as the accessible name", async () => {
      render(
        <FullLayout
          navItems={navItems}
          pathname="/"
          headerDropdowns={[
            { id: "n", icon: <span>i</span>, label: "Notifications", content: <p>nothing new</p> },
          ]}
        />,
      );
      const toggle = screen.getByRole("button", { name: "Notifications" });
      await userEvent.click(toggle);
      expect(screen.getByText("nothing new")).toBeInTheDocument();
    });
  });

  describe("hamburgers", () => {
    it("wires each hamburger to its own callback", async () => {
      const onToggleMini = vi.fn();
      const onToggleMobile = vi.fn();
      render(
        <FullLayout
          navItems={navItems}
          pathname="/"
          onToggleMini={onToggleMini}
          onToggleMobile={onToggleMobile}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));
      expect(onToggleMini).toHaveBeenCalledTimes(1);
      await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
      expect(onToggleMobile).toHaveBeenCalledTimes(1);
    });

    it("keeps a stable label and moves aria-expanded instead", () => {
      const { rerender } = render(<FullLayout navItems={navItems} pathname="/" />);
      const menu = () => screen.getByRole("button", { name: "Toggle menu" });
      expect(menu()).toHaveAttribute("aria-expanded", "false");
      expect(menu()).toHaveAttribute("aria-controls", "il-mobile-sidebar");

      rerender(
        <FullLayout navItems={navItems} pathname="/" mobileSidebarOpen onCloseMobile={() => {}} />,
      );
      // Same name — swapping it to "Close menu" would announce "Open menu, expanded".
      expect(menu()).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("has no axe violations on desktop", async () => {
    const { container } = render(
      <FullLayout navItems={navItems} pathname="/home" roleBadge="Reviewer" profile={{ initials: "AB" }}>
        <p>body</p>
      </FullLayout>,
    );
    await expectNoViolations(container);
  });

  it("has no axe violations with the drawer open", async () => {
    setMatchMedia(false);
    const { container } = render(
      <FullLayout navItems={navItems} pathname="/home" mobileSidebarOpen onCloseMobile={() => {}}>
        <p>body</p>
      </FullLayout>,
    );
    await expectNoViolations(container);
  });
});
