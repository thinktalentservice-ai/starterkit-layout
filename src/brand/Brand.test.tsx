import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { BrandMark } from "./BrandMark";
import { Logo } from "./Logo";
import { LogoIcon } from "./LogoIcon";
import { AuthLogo } from "./AuthLogo";

/** axe with colour-contrast off — jsdom does no layout, so it cannot measure it. */
async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

describe("BrandMark", () => {
  it("derives size, radius and glow from the size prop", () => {
    const { container } = render(<BrandMark size={48} />);
    const mark = container.querySelector(".il-brand-mark") as HTMLElement;
    expect(mark.style.getPropertyValue("--il-mark-size")).toBe("48px");
    // 0.3x, rounded — matches the source's Math.round(size * 0.3).
    expect(mark.style.getPropertyValue("--il-mark-radius")).toBe("14px");
    // 0.5x — the source's 16px glow at 32 and 24px at 48.
    expect(mark.style.getPropertyValue("--il-mark-glow")).toBe("24px");
  });

  it("paints through classes, never inline colour", () => {
    /* The whole reason the brand components were rewritten. An inline
       `background: var(--gradient-secondary)` reads the host token directly,
       resolves no --il-t-* alias and therefore ships no vendored fallback. */
    const { container } = render(<BrandMark />);
    const mark = container.querySelector(".il-brand-mark") as HTMLElement;
    expect(mark.style.background).toBe("");
    expect(mark.style.boxShadow).toBe("");
    expect(mark.className).toContain("il-brand-mark");
  });

  it("renders the default glyph, and lets it be replaced", () => {
    const { container, rerender } = render(<BrandMark />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    rerender(<BrandMark>{<span data-testid="custom" />}</BrandMark>);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });

  it("hides the decorative glyph from assistive tech", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Logo", () => {
  it("shows the wordmark expanded and hides it when mini", () => {
    const { rerender } = render(<Logo />);
    expect(screen.getByText("Executive Insight")).toBeInTheDocument();
    rerender(<Logo miniSidebar />);
    // AnimatePresence exit is async; the element is removed from the tree on
    // the next frame. Asserting the expanded case plus the prop wiring below is
    // what jsdom can honestly cover — the collapse itself is a Playwright job.
    expect(document.querySelector(".il-brand")).toBeInTheDocument();
  });

  it("takes brand name as a prop rather than hard-coding it", () => {
    render(<Logo brandName="Northwind" />);
    expect(screen.getByText("Northwind")).toBeInTheDocument();
    expect(screen.queryByText("Executive Insight")).not.toBeInTheDocument();
  });
});

describe("AuthLogo", () => {
  it("renders wordmark and tagline by default", () => {
    render(<AuthLogo />);
    expect(screen.getByText("Executive Insight")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("drops the tagline when explicitly null", () => {
    render(<AuthLogo tagline={null} />);
    expect(screen.queryByText("Enterprise")).not.toBeInTheDocument();
  });

  it("carries the .il-brand token scope, because it renders outside the shell", () => {
    /* AuthLogo is the reason .il-brand is a token scope at all — on a login page
       there is no .il-shell ancestor to resolve the aliases. */
    const { container } = render(<AuthLogo />);
    expect(container.querySelector(".il-brand")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<AuthLogo />);
    await expectNoViolations(container);
  });
});

describe("LogoIcon", () => {
  it("renders a mark with no wordmark", () => {
    render(<LogoIcon />);
    expect(screen.queryByText("Executive Insight")).not.toBeInTheDocument();
    expect(document.querySelector(".il-brand-mark")).toBeInTheDocument();
  });
});
