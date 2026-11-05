import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { Footer } from "./Footer";

async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

describe("Footer", () => {
  it("renders © year | linked site name, opening safely in a new tab", () => {
    render(<Footer year={2026} siteName="Think Talent" siteHref="https://example.com" />);
    const link = screen.getByRole("link", { name: "Think Talent" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026");
  });

  it("defaults the year to the current one", () => {
    render(<Footer siteName="X" />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(`© ${new Date().getFullYear()}`);
  });

  it("renders the name as plain text when no href is given, and no separator without a name", () => {
    const { container, rerender } = render(<Footer year={2026} siteName="Acme" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector(".il-footer-sep")).not.toBeNull();

    rerender(<Footer year={2026} />);
    expect(container.querySelector(".il-footer-sep")).toBeNull();
  });

  it("keeps both side columns in the DOM so the centre stays centred", () => {
    const { container } = render(<Footer year={2026} siteName="Acme" />);
    expect(container.querySelector(".il-footer-start")).not.toBeNull();
    expect(container.querySelector(".il-footer-end")).not.toBeNull();
  });

  it("renders start/end slots", () => {
    render(<Footer startSlot={<span>left</span>} endSlot={<span>right</span>} />);
    expect(screen.getByText("left")).toBeInTheDocument();
    expect(screen.getByText("right")).toBeInTheDocument();
  });

  it("children replace the centre content", () => {
    render(
      <Footer year={2026} siteName="Acme">
        <span>custom</span>
      </Footer>,
    );
    expect(screen.getByText("custom")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent("© 2026");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Footer year={2026} siteName="Acme" siteHref="https://example.com" />,
    );
    await expectNoViolations(container);
  });
});
