import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* ═══════════════════════════════════════════════════════════════════════════
   Regression coverage for the shell's layout maths — the geometry custom
   properties (--il-sidebar-width, --il-shell-top, --il-sidebar-width-neg) and
   the responsive rules built on top of them in styles.css.

   Three of these bugs produced NO error anywhere — no console warning, no
   failed assertion in the 52-test vitest suite, nothing but a wrong pixel:
   a transition shorthand silently matching `all` and dropping a named
   transition, an invalid `-var()` that browsers discard rather than reject,
   and a sidebar box quietly 5px short of the viewport. jsdom cannot lay
   anything out at all, so none of these are reachable from vitest — only a
   real Chromium computing real boxes proves any of them fixed.
   ═══════════════════════════════════════════════════════════════════════════ */

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STYLES_CSS = readFileSync(join(ROOT, "styles.css"), "utf8");

const BOOTSTRAP_CSS_PATH = join(
  "C:\\",
  "github",
  "template",
  "template-starterkit-nextjs",
  "node_modules",
  "bootstrap",
  "dist",
  "css",
  "bootstrap.min.css",
);
const BOOTSTRAP_CSS = existsSync(BOOTSTRAP_CSS_PATH) ? readFileSync(BOOTSTRAP_CSS_PATH, "utf8") : null;

const SHELL_MARKUP = `
  <div class="il-shell" id="shell">
    <button class="il-sidebar-overlay" id="overlay" aria-label="Close sidebar"></button>
    <div class="il-sidebar-area" id="sidebar-area">
      <div class="il-sidebar-box" id="sidebar-box"></div>
    </div>
    <div class="il-content-area il-fixed-topbar" id="content-area">
      <div class="il-topbar" id="topbar"></div>
    </div>
  </div>
`;

/* What Sidebar.tsx renders inside the box, reduced to the parts that carry
   geometry: the scroller wrapper that used to hold the `p-3` gutter, reactstrap's
   `Nav vertical` (ul.nav.flex-column), and one active row.

   The `ul.nav` reset is spelled out rather than inherited from Bootstrap: the UA
   default puts 40px of padding-left on any <ul>, which would shift every row and
   make this test measure the browser's list styling instead of the package's. The
   host always loads Bootstrap — but BOOTSTRAP_CSS above is read from one
   developer's absolute path and is null on any machine without it, so relying on
   it here would make the assertion machine-dependent. */
const NAV_RESET_CSS = `ul.nav { padding-left: 0; margin: 0; list-style: none; }`;

const NAV_MARKUP = `
  <div class="il-sidebar-nav pt-1 mt-2">
    <ul class="nav flex-column">
      <li>
        <div class="nav-item il-active-link">
          <a class="gap-3 nav-link mb-2" id="active-row" href="#"><span>My Tasks</span></a>
        </div>
      </li>
    </ul>
  </div>
`;

function shellHtml(extraCssBefore?: string, sidebarBoxInner?: string): string {
  const before = extraCssBefore ? `<style>${extraCssBefore}</style>` : "";
  const markup = sidebarBoxInner
    ? SHELL_MARKUP.replace(
        `<div class="il-sidebar-box" id="sidebar-box"></div>`,
        `<div class="il-sidebar-box" id="sidebar-box">${sidebarBoxInner}</div>`,
      )
    : SHELL_MARKUP;
  return (
    `<!doctype html><html><head>` +
    `<style>html, body { margin: 0; padding: 0; }</style>` +
    `${before}` +
    `<style>${STYLES_CSS}</style>` +
    `</head><body>${markup}</body></html>`
  );
}

async function addShellClass(page: import("@playwright/test").Page, className: string): Promise<void> {
  await page.evaluate((cls) => document.getElementById("shell")!.classList.add(cls), className);
}

test("desktop: .il-sidebar-box tracks --il-sidebar-width, collapses in mini mode, expands again on hover", async ({
  page,
}) => {
  // Mini-mode collapse and hover-expand both key off .il-is-mini on the shell —
  // a typo in either selector silently leaves the box at the wrong width with
  // no error anywhere.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(shellHtml());
  const box = page.locator("#sidebar-box");

  await expect.poll(async () => (await box.boundingBox())!.width).toBeCloseTo(240, 0);

  await addShellClass(page, "il-is-mini");
  await expect.poll(async () => (await box.boundingBox())!.width).toBeCloseTo(80, 0);

  await box.hover();
  await expect.poll(async () => (await box.boundingBox())!.width).toBeCloseTo(240, 0);
});

test(".il-sidebar-box height reserves the topbar offset, and fills the viewport when the header is hidden", async ({
  page,
}) => {
  // Height is driven by --il-shell-top, not a hard-coded 59: .il-header-hidden
  // on the shell flips --il-shell-top to 0px and the box must grow to match.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(shellHtml());
  const box = page.locator("#sidebar-box");

  await expect.poll(async () => (await box.boundingBox())!.height).toBeCloseTo(900 - 59, 0);

  await addShellClass(page, "il-header-hidden");
  await expect.poll(async () => (await box.boundingBox())!.height).toBeCloseTo(900, 0);
});

for (const width of [375, 768, 1280] as const) {
  test(`5px-gap regression: .il-sidebar-box bottom reaches the viewport bottom exactly at ${width}px`, async ({
    page,
  }) => {
    // A prior version subtracted an extra hard-coded 5px below 768px, leaving
    // the sidebar box permanently 5px short of calc(100dvh - var(--il-shell-top))
    // — a visible gap at the bottom of the nav on small screens. Exact
    // tolerance (0.5px), not toBeCloseTo(*, 0): the whole point of this test
    // is that the gap is gone, not merely small.
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(shellHtml());
    const box = page.locator("#sidebar-box");

    await expect
      .poll(async () => {
        const bb = (await box.boundingBox())!;
        return bb.y + bb.height;
      })
      .toBeGreaterThan(899.5);

    const bb = (await box.boundingBox())!;
    const bottom = bb.y + bb.height;
    expect(Math.abs(bottom - 900)).toBeLessThanOrEqual(0.5);
  });
}

test("transition regression: the below-lg shorthand must not collapse to `all` and drop margin-top", async ({
  page,
}) => {
  // A bare `transition: 0.2s ease-in` shorthand matches the `all` property and
  // silently drops the named margin-top transition declared earlier in the
  // cascade for the header-autohide offset. jsdom cannot compute
  // transitionProperty at all — this is the highest-value test in the file.
  await page.setViewportSize({ width: 500, height: 900 });
  await page.setContent(shellHtml());
  const transitionProperty = await page
    .locator("#sidebar-area")
    .evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(transitionProperty).toContain("margin-top");
  expect(transitionProperty).toContain("margin-left");
});

test("invalid -var() regression: the closed drawer sits fully off-screen below lg, and slides to 0 when opened", async ({
  page,
}) => {
  // A negated Sass var once compiled to the literal `-var(--sidebar-width)` —
  // invalid CSS every browser drops silently, with no build error and no
  // console warning — which left margin-left unset and the drawer permanently
  // over the page at every width below lg.
  await page.setViewportSize({ width: 500, height: 900 });
  await page.setContent(shellHtml());
  const area = page.locator("#sidebar-area");

  await expect
    .poll(async () => {
      const bb = (await area.boundingBox())!;
      return bb.x + bb.width;
    })
    .toBeLessThanOrEqual(0.5);

  await page.evaluate(() => document.getElementById("sidebar-area")!.classList.add("il-show-sidebar"));
  await expect.poll(async () => (await area.boundingBox())!.x).toBeCloseTo(0, 0);
});

test(".il-fixed-topbar.il-content-area keeps its 59px padding-top even when the header auto-hides", async ({
  page,
}) => {
  // Deliberately the raw --il-topbar-height token, not --il-shell-top: this
  // padding reserves the scroll offset. Collapsing it when .il-header-hidden
  // is set on the shell would yank page content up 59px mid-scroll.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(shellHtml());
  const contentArea = page.locator("#content-area");

  const paddingTop = await contentArea.evaluate((el) => getComputedStyle(el).paddingTop);
  expect(paddingTop).toBe("59px");

  await addShellClass(page, "il-header-hidden");
  const paddingTopHidden = await contentArea.evaluate((el) => getComputedStyle(el).paddingTop);
  expect(paddingTopHidden).toBe("59px");
});

test("stacking order keeps the fixed topbar above the open drawer above its own dismiss overlay", async ({
  page,
}) => {
  // The topbar must stay clickable while the drawer is open, because its
  // hamburger is one of the ways out of the drawer: overlay (1) < sidebar
  // below lg (2) < fixed topbar (9).
  await page.setViewportSize({ width: 500, height: 900 });
  await page.setContent(shellHtml());
  const overlayZ = await page.locator("#overlay").evaluate((el) => getComputedStyle(el).zIndex);
  const sidebarAreaZ = await page.locator("#sidebar-area").evaluate((el) => getComputedStyle(el).zIndex);
  const topbarZ = await page.locator("#topbar").evaluate((el) => getComputedStyle(el).zIndex);

  expect(Number(overlayZ)).toBe(1);
  expect(Number(sidebarAreaZ)).toBe(2);
  expect(Number(topbarZ)).toBe(9);
});

test("geometry override: --il-sidebar-width set inline on .il-shell resizes the sidebar", async ({ page }) => {
  // Proves the override mechanism the `geometry` prop relies on: re-declaring
  // the custom property on .il-shell (inline or via a class) is all it takes.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(shellHtml());
  await page.evaluate(() => {
    document.getElementById("shell")!.style.setProperty("--il-sidebar-width", "320px");
  });
  const box = page.locator("#sidebar-box");
  await expect.poll(async () => (await box.boundingBox())!.width).toBeCloseTo(320, 0);
});

test("bootstrap-collision: the package's unlayered rules still win against a real Bootstrap 5.3 reset", async ({
  page,
}) => {
  // The whole point of leaving component rules UNLAYERED (see styles.css's
  // header comment) is that an unlayered class-plus-descendant selector beats
  // an unlayered global reset on specificity alone. Re-runs the desktop width
  // and height assertions above with Bootstrap loaded BEFORE styles.css.
  test.skip(!BOOTSTRAP_CSS, `bootstrap.min.css not found at ${BOOTSTRAP_CSS_PATH}`);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(shellHtml(BOOTSTRAP_CSS ?? undefined));
  const box = page.locator("#sidebar-box");

  await expect.poll(async () => (await box.boundingBox())!.width).toBeCloseTo(240, 0);
  await expect.poll(async () => (await box.boundingBox())!.height).toBeCloseTo(900 - 59, 0);
});

test("full-bleed nav rows: the active row spans the sidebar edge to edge, with square corners", async ({
  page,
}) => {
  /* The reported bug, pinned. `p-3` on the nav wrapper in Sidebar.tsx put a 16px
     gutter down both sides of every row, so the active row's background and its
     3px accent bar stopped 16px short of the sidebar's own edges. Nothing errored
     — jsdom cannot lay this out and the 52-case vitest suite could not see it.
     Only a real Chromium measuring two boxes can.

     Tolerance is 0.5px, not toBeCloseTo(*, 0): the assertion is that the gutter
     is GONE, not that it is small. */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(shellHtml(NAV_RESET_CSS, NAV_MARKUP));

  const boxBB = (await page.locator("#sidebar-box").boundingBox())!;
  const rowBB = (await page.locator("#active-row").boundingBox())!;

  expect(Math.abs(rowBB.x - boxBB.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(rowBB.x + rowBB.width - (boxBB.x + boxBB.width))).toBeLessThanOrEqual(0.5);
  expect(rowBB.width).toBeCloseTo(240, 0);

  const radius = await page
    .locator("#active-row")
    .evaluate((el) => getComputedStyle(el).borderRadius);
  expect(radius).toBe("0px");
});

test("full-bleed nav rows: the label keeps its 16px inset once the wrapper gutter is gone", async ({
  page,
}) => {
  /* The other half of the fix, and the one a careless revert would break: the row
     went full-bleed by moving the gutter onto .nav-link's padding, NOT by
     deleting it. If the padding is ever dropped the row is still edge-to-edge and
     this file's other assertion still passes, while the label sits jammed against
     the sidebar border. */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(shellHtml(NAV_RESET_CSS, NAV_MARKUP));

  const rowBB = (await page.locator("#active-row").boundingBox())!;
  const labelBB = (await page.locator("#active-row span").boundingBox())!;

  // 16px of padding, plus the 3px transparent border-left that the active state
  // repaints as the accent bar.
  expect(labelBB.x - rowBB.x).toBeCloseTo(19, 0);
});

test("keyboard focus is visible on a sidebar row, and its ring is drawn inside the row", async ({
  page,
}) => {
  /* Before this release the package had no focus style on its primary navigation
     at all. Real Tab focus, not element.focus(), because :focus-visible is
     precisely the distinction between the two. `outline-offset` must stay
     negative: on an edge-to-edge row a ring drawn outside the border box has its
     left edge under the sidebar border and its right edge off the column. */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setContent(shellHtml(NAV_RESET_CSS, NAV_MARKUP));

  // Twice: the overlay button precedes the sidebar in SHELL_MARKUP and takes the
  // first stop, exactly as it does in the real shell.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  const focused = await page.evaluate(() => document.activeElement?.id);
  expect(focused).toBe("active-row");

  const outline = await page.locator("#active-row").evaluate((el) => {
    const cs = getComputedStyle(el);
    return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset };
  });
  expect(outline.style).toBe("solid");
  expect(outline.width).toBe("2px");
  expect(parseFloat(outline.offset)).toBeLessThan(0);
});
