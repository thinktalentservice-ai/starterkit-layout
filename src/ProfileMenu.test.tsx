import { render, screen, fireEvent } from "@testing-library/react";
import axe from "axe-core";
import { ProfileMenu, initialsFrom } from "./ProfileMenu";

/** axe with colour-contrast off — jsdom does no layout, so it cannot measure it. */
async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

describe("initialsFrom", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(initialsFrom("ada lovelace")).toBe("AL");
    expect(initialsFrom("Ada Byron King Lovelace")).toBe("AB");
  });

  it("survives the inputs the naive split() version threw on", () => {
    // `"".split(" ")` is `[""]`, so `w[0]` reads index 0 of an empty string.
    expect(initialsFrom("")).toBe("");
    expect(initialsFrom("  ")).toBe("");
    expect(initialsFrom(undefined)).toBe("");
    expect(initialsFrom(null)).toBe("");
    // Double space yielded "Aundefined" before the filter(Boolean).
    expect(initialsFrom("Ada  Lovelace")).toBe("AL");
  });
});

describe("ProfileMenu", () => {
  it("renders the photo when one is supplied", () => {
    const { container } = render(
      <ProfileMenu name="Ada Lovelace" email="ada@example.com" photoSrc="blob:x" />
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("blob:x");
    expect(container.querySelector(".il-profile-initials")).toBeNull();
  });

  it("falls back to initials, decoratively", () => {
    const { container } = render(<ProfileMenu name="Ada Lovelace" />);
    const chip = container.querySelector(".il-profile-initials") as HTMLElement;
    expect(chip.textContent).toBe("AL");
    // The name is rendered as text beside it, so announcing the initials is a
    // duplicate reading. Never role="img".
    expect(chip.getAttribute("aria-hidden")).toBe("true");
    expect(chip.getAttribute("role")).toBeNull();
  });

  it("falls back to initials when the photo fails to load, and retries a new URL", () => {
    // The host's photo endpoint 401s for any user with no photo on file — the
    // NORMAL case — so a broken <img> where the initials belong is the failure
    // this component produces most often.
    const { container, rerender } = render(<ProfileMenu name="Ada Lovelace" photoSrc="blob:bad" />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".il-profile-initials")?.textContent).toBe("AL");

    // A different URL is not the failed one, so it is tried without an effect
    // having to clear anything.
    rerender(<ProfileMenu name="Ada Lovelace" photoSrc="blob:good" />);
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("announces the initials when they are the ONLY identity on screen", () => {
    // With a name beside them the initials are a duplicate reading and stay
    // hidden; with no name, hiding them puts nothing in the accessibility tree.
    const { container, rerender } = render(<ProfileMenu initials="AL" />);
    const chip = container.querySelector(".il-profile-initials") as HTMLElement;
    expect(chip.getAttribute("aria-hidden")).toBeNull();
    expect(screen.getByRole("img", { name: "AL" })).toBe(chip);

    rerender(<ProfileMenu name="Ada Lovelace" initials="AL" />);
    const hidden = container.querySelector(".il-profile-initials") as HTMLElement;
    expect(hidden.getAttribute("aria-hidden")).toBe("true");
    expect(hidden.getAttribute("role")).toBeNull();
  });

  it("ships no placeholder identity", () => {
    const { container } = render(<ProfileMenu />);
    expect(container.querySelector(".il-profile-name")?.textContent).toBe("");
    expect(container.querySelector(".il-profile-email")?.textContent).toBe("");
    expect(container.querySelector("img")).toBeNull();
  });

  it("caps the email's character count but keeps the full address in the title", () => {
    const email = `${"a".repeat(60)}@example.com`;
    const { container } = render(<ProfileMenu name="Ada" email={email} />);
    const el = container.querySelector(".il-profile-email") as HTMLElement;
    expect(el.textContent).toHaveLength(31); // 30 + the ellipsis
    expect(el.getAttribute("title")).toBe(email);
  });

  it("renders logout only when given an href", () => {
    const { container, rerender } = render(<ProfileMenu name="Ada" />);
    expect(container.querySelector(".il-profile-logout")).toBeNull();

    rerender(<ProfileMenu name="Ada" logoutHref="/auth/login" />);
    const link = screen.getByRole("link", { name: "Logout" });
    expect(link).toHaveAttribute("href", "/auth/login");
  });

  it("paints through classes, never inline colour", () => {
    // Same reasoning as the brand marks: an inline `var(--x)` reads the HOST
    // token directly, resolves no --il-t-* alias and so has no vendored fallback.
    const { container } = render(<ProfileMenu name="Ada" logoutHref="/auth/login" />);
    const chip = container.querySelector(".il-profile-initials") as HTMLElement;
    const link = container.querySelector(".il-profile-logout") as HTMLElement;
    expect(chip.style.background).toBe("");
    expect(chip.style.color).toBe("");
    expect(link.style.background).toBe("");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <ProfileMenu name="Ada Lovelace" email="ada@example.com" logoutHref="/auth/login" />
    );
    await expectNoViolations(container);
  });
});
