import { defineConfig, devices } from "@playwright/test";

/* Two specs live here, and both exist because jsdom provably cannot do the job:
   it neither resolves CSS var() cascades nor lays anything out.

   - brand-regression.spec.ts proves the token contract: a vendored default
     renders standalone, a host token wins when present, and the light-scheme
     fallback fires only for a root carrying neither scheme attribute.
   - shell-geometry.spec.ts proves the layout maths, including three regressions
     that produce NO error anywhere and cannot be caught any other way: a
     transition shorthand silently matching `all` and dropping margin-top, an
     invalid `-var()` that browsers discard leaving the drawer visible, and a
     sidebar box overhanging the viewport by a few pixels.

   Both run headless against a data: URL built from styles.css — no dev server,
   no host app, so this stays runnable in CI. */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
