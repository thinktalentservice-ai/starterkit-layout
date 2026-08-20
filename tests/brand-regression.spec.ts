import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* ═══════════════════════════════════════════════════════════════════════════
   Regression coverage for the --il-t-* alias contract declared on
   :is(.il-shell, .il-brand) in styles.css:

     --il-t-topbar-bg: var(--topbar-bg, rgba(7, 8, 15, 0.85));

   A CSS fallback applies only to an ABSENT custom property, so a host token
   wins wherever it is defined and the vendored default renders the shell
   where it is not — with no @layer and no load-order rule to get wrong.
   jsdom (this repo's vitest suite) cannot cascade custom properties or
   resolve var() chains at all, so it cannot tell "the fallback resolves"
   from "the fallback is dead code with the right string next to it". Only a
   real browser engine reading *computed* style proves the mechanism, which
   is what every test below does — not the source, the result.
   ═══════════════════════════════════════════════════════════════════════════ */

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STYLES_CSS = readFileSync(join(ROOT, "styles.css"), "utf8");

const SHELL_MARKUP = `
  <div class="il-shell">
    <div class="il-topbar" id="topbar"></div>
    <div class="il-sidebar-area">
      <div class="il-sidebar-box">
        <div class="il-sidebar" id="sidebar"></div>
      </div>
    </div>
    <div class="il-brand">
      <div class="il-brand-text">
        <div class="il-brand-name" id="brand-name">Name</div>
      </div>
    </div>
    <div class="il-avatar" id="avatar">JD</div>
  </div>
`;

const STANDALONE_BRAND_MARKUP = `
  <div class="il-brand">
    <div class="il-brand-text">
      <div class="il-brand-name" id="standalone-brand-name">Name</div>
    </div>
  </div>
`;

type PageHtmlOptions = {
  /** Sets data-mui-color-scheme on <html>. Omit to leave the attribute off. */
  scheme?: "dark" | "light";
  /** Sets data-theme on <html>. Omit to leave the attribute off. */
  theme?: "dark" | "light";
  /** Extra <style> markup inserted BEFORE the package sheet in <head>. */
  headBefore?: string;
  /** Extra <style> markup inserted AFTER the package sheet in <head>. */
  headAfter?: string;
  /** Body markup; defaults to a full shell with topbar/sidebar/brand/avatar. */
  body?: string;
};

function pageHtml(opts: PageHtmlOptions = {}): string {
  const attrs: string[] = [];
  if (opts.scheme) attrs.push(`data-mui-color-scheme="${opts.scheme}"`);
  if (opts.theme) attrs.push(`data-theme="${opts.theme}"`);
  const htmlTag = attrs.length ? `<html ${attrs.join(" ")}>` : "<html>";
  const body = opts.body ?? SHELL_MARKUP;
  return (
    `<!doctype html>${htmlTag}<head>` +
    `<style>html, body { margin: 0; padding: 0; }</style>` +
    `${opts.headBefore ?? ""}` +
    `<style>${STYLES_CSS}</style>` +
    `${opts.headAfter ?? ""}` +
    `</head><body>${body}</body></html>`
  );
}

test.describe("vendored default token contract", () => {
  test("vendored default renders standalone with no host tokens defined", async ({ page }) => {
    // Bug this keeps fixed: a consumer not on the design system defines NONE of
    // --topbar-bg/--fg1/etc. If the vendored `<value>` half of `var(--x, <value>)`
    // were ever dropped or malformed, this is the only thing that would notice —
    // jsdom parses the declaration text fine either way and never resolves it.
    await page.setContent(pageHtml({ scheme: "dark" }));
    const bg = await page.locator("#topbar").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgba(7, 8, 15, 0.85)");
  });

  test("host token injected AFTER the package sheet wins over the vendored default", async ({ page }) => {
    // The core of the contract: a host's own --topbar-bg must beat the vendored
    // fallback. This is the ordering an SSR-delivered <style id="brand-vars">
    // block actually uses — appended to <head>, after this package's own sheet.
    await page.setContent(
      pageHtml({ scheme: "dark", headAfter: `<style>:root { --topbar-bg: rgb(1, 2, 3); }</style>` }),
    );
    const bg = await page.locator("#topbar").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(1, 2, 3)");
  });

  test("host token injected BEFORE the package sheet still wins — priority is not load order", async ({ page }) => {
    // Proves priority falls out of the var(--x, fallback) mechanism itself, not
    // out of which <style> tag happens to land later in <head>. If a future
    // rewrite ever moved the aliases onto a real :root block or added an
    // @layer, this is the test that would catch the ordering dependency it
    // introduced.
    await page.setContent(
      pageHtml({ scheme: "dark", headBefore: `<style>:root { --topbar-bg: rgb(1, 2, 3); }</style>` }),
    );
    const bg = await page.locator("#topbar").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(1, 2, 3)");
  });

  test("a transitive vendored default resolves standalone (--il-t-gradient-avatar's own var() chain)", async ({
    page,
  }) => {
    // --il-t-gradient-avatar's fallback is itself `linear-gradient(..., var(--gradient-avatar-from,
    // #8576ff), var(--accent-solid, #22d3ee))` — a var() nested inside the vendored value of
    // another var(). Proves the nested fallback also resolves with zero host tokens,
    // not just the outer one.
    await page.setContent(pageHtml({ scheme: "dark" }));
    const bgImage = await page.locator("#avatar").evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bgImage).not.toBe("none");
    expect(bgImage.toLowerCase()).toContain("gradient");
  });
});

test.describe("scheme selectors", () => {
  test("[data-mui-color-scheme=light] flips fg1 / topbar-bg / sidebar-bg to the light defaults", async ({
    page,
  }) => {
    await page.setContent(pageHtml({ scheme: "light" }));
    const topbarBg = await page.locator("#topbar").evaluate((el) => getComputedStyle(el).backgroundColor);
    const sidebarBg = await page.locator("#sidebar").evaluate((el) => getComputedStyle(el).backgroundColor);
    const fg1 = await page.locator("#brand-name").evaluate((el) => getComputedStyle(el).color);
    expect(topbarBg).toBe("rgba(255, 255, 255, 0.92)");
    expect(sidebarBg).toBe("rgb(238, 240, 248)");
    expect(fg1).toBe("rgb(26, 29, 46)");
  });

  test("[data-theme=light] (the non-MUI host alias) flips the same tokens", async ({ page }) => {
    // A host not on MUI's CssVarsProvider stamps data-theme instead of
    // data-mui-color-scheme; the alias block must key off either.
    await page.setContent(pageHtml({ theme: "light" }));
    const topbarBg = await page.locator("#topbar").evaluate((el) => getComputedStyle(el).backgroundColor);
    const sidebarBg = await page.locator("#sidebar").evaluate((el) => getComputedStyle(el).backgroundColor);
    const fg1 = await page.locator("#brand-name").evaluate((el) => getComputedStyle(el).color);
    expect(topbarBg).toBe("rgba(255, 255, 255, 0.92)");
    expect(sidebarBg).toBe("rgb(238, 240, 248)");
    expect(fg1).toBe("rgb(26, 29, 46)");
  });

  test("prefers-color-scheme:light fires only for a root carrying neither scheme attribute", async ({
    browser,
  }) => {
    // The regression this guards: the fallback block is scoped to
    // `:root:not([data-mui-color-scheme]):not([data-theme])`. Without that
    // guard, a host running dark mode on a light-preference OS/browser would
    // have its explicit choice silently overridden. Needs a real browser
    // context with colorScheme set — jsdom has no concept of this media
    // feature at all.
    const lightContext = await browser.newContext({ colorScheme: "light" });
    try {
      const barePage = await lightContext.newPage();
      await barePage.setContent(pageHtml());
      const bareBg = await barePage.locator("#topbar").evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bareBg, "bare root under prefers-color-scheme:light must flip to the light default").toBe(
        "rgba(255, 255, 255, 0.92)",
      );

      const themedPage = await lightContext.newPage();
      await themedPage.setContent(pageHtml({ theme: "dark" }));
      const themedBg = await themedPage
        .locator("#topbar")
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(themedBg, "data-theme=dark must NOT be overridden by prefers-color-scheme:light").toBe(
        "rgba(7, 8, 15, 0.85)",
      );
    } finally {
      await lightContext.close();
    }
  });
});

test.describe("second token scope", () => {
  test(".il-brand resolves the alias block on its own, with no .il-shell ancestor", async ({ page }) => {
    // AuthLogo renders .il-brand on the login page, entirely outside .il-shell —
    // that is the reason the alias block is scoped to :is(.il-shell, .il-brand)
    // rather than .il-shell alone. Prove the second scope actually works, not
    // just that it parses.
    await page.setContent(pageHtml({ scheme: "dark", body: STANDALONE_BRAND_MARKUP }));
    const fg1 = await page
      .locator("#standalone-brand-name")
      .evaluate((el) => getComputedStyle(el).color);
    expect(fg1).toBe("rgb(240, 242, 255)");
  });
});
