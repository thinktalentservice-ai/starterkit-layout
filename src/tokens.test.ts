/* Every design token styles.css reads must exist in @devopsnext/starterkit-theme.
 *
 * WHY: this package reaches the theme by CSS custom-property NAME only — no
 * import, no type. A token the theme renames or deletes does not error: the
 * vendored fallback silently paints instead, on a page that is supposed to be
 * branded. `isTokenName` is the theme's own oracle for its ABI (it rejects every
 * deleted legacy name and accepts every current one), so asking it is the only
 * check that fails when the two packages stop agreeing.
 *
 * Runs against the exact-pinned devDependency — the same version
 * `pnpm sync:tokens` vendors from.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isTokenName, ROOT_TOKEN_NAMES } from "@devopsnext/starterkit-theme";

const CSS = readFileSync(join(dirname(dirname(fileURLToPath(import.meta.url))), "styles.css"), "utf8")
  /* Prose names tokens too (`var(--x)`, `-var(--sidebar-width)` in comments);
     only rules count. */
  .replace(/\/\*[\s\S]*?\*\//g, " ");

/* Namespaces that are not theme tokens: this package's own (`--il-*`, which
   includes the `--il-t-*` aliases) and Bootstrap's (`--bs-*`). */
const NOT_THEME = /^--(il|bs)-/;

const read = [...new Set([...CSS.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]!))];
const themeTokens = read.filter((name) => !NOT_THEME.test(name)).sort();

describe("styles.css ↔ @devopsnext/starterkit-theme token contract", () => {
  it("reads at least the shell's core tokens (guards against a scraper that matches nothing)", () => {
    expect(themeTokens).toEqual(expect.arrayContaining(["--fg1", "--fg2", "--sidebar-bg", "--sidebar-fg1"]));
  });

  it("every token read is a current theme token", () => {
    expect(themeTokens.filter((name) => !isTokenName(name))).toEqual([]);
  });

  it("every --il-t-* alias names a theme token (alias = --il-t- + token name)", () => {
    const aliases = [...new Set([...CSS.matchAll(/(--il-t-[\w-]+)\s*:/g)].map((m) => m[1]!))];
    const unknown = aliases.map((a) => `--${a.slice("--il-t-".length)}`).filter((n) => !isTokenName(n));
    expect(unknown).toEqual([]);
  });

  it("the theme's ABI is the real one, not an empty stub", () => {
    expect(ROOT_TOKEN_NAMES.length).toBeGreaterThan(200);
  });
});
