import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const stub = (file: string) => fileURLToPath(new URL(`./src/__mocks__/${file}`, import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    /* next/link and next/navigation are peer deps with a real runtime that
       requires an App Router context to be mounted. jsdom has none, so every
       render of anything in this package throws "invariant expected app router
       to be mounted" without these two stubs. This is the one place this
       package's test setup has to diverge from the sibling button package,
       which has no framework coupling at all.

       The stubs are deliberately dumb — Link renders an <a>, usePathname reads
       a value the test sets. Components take `pathname` as an overridable prop
       precisely so most tests never need the stub's own state. */
    alias: [
      { find: /^next\/link$/, replacement: stub("next-link.tsx") },
      { find: /^next\/navigation$/, replacement: stub("next-navigation.ts") },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
