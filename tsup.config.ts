import { defineConfig } from "tsup";

export default defineConfig({
  /* Two entries, not one. `./brand` exists so a consumer's auth pages — which
     live outside the dashboard route group — can import AuthLogo without
     dragging reactstrap and simplebar into that bundle. AuthLogo is pure SVG
     with zero imports today; splitting the entry is what keeps that true after
     packaging. Checkpoint: dist/brand.js must contain no reference to
     reactstrap or simplebar-react. */
  entry: ["src/index.ts", "src/brand.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // NOT `treeshake: true`. That option post-processes the bundle through rollup,
  // which strips module-level directives — it silently removed the "use client"
  // banner below and shipped a build Next would treat as a server component.
  // esbuild already tree-shakes when bundling, so the option bought nothing.
  target: "es2020",
  /* Every peer is external, and the regex is load-bearing: the source imports
     `motion/react`, never bare `motion`, so listing only "motion" leaves the
     real specifier unmatched and esbuild inlines a second copy. Two copies of
     motion means two AnimatePresence contexts and exit animations that never
     fire. Two copies of reactstrap breaks the Bootstrap CSS contract its
     dropdowns depend on. */
  external: [
    "react",
    "react-dom",
    "reactstrap",
    "motion",
    /^motion\//,
    "simplebar-react",
  ],
  // esbuild strips top-of-file directives, so "use client" is re-attached to
  // every output chunk. Every component here uses hooks or context, so a chunk
  // that loses the directive fails at import time under the RSC compiler.
  banner: { js: '"use client";' },
  /* Off deliberately. The two entries share only the three brand components
     (~80 lines). Splitting would emit a chunk-*.js that the exports map does
     not name, so anything deep-importing dist/ breaks on the next rename —
     for less than a kilobyte of dedupe. */
  splitting: false,
  outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".js" }),
});
