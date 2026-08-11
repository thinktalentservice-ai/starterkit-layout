# @devopsnext/starterkit-layout

The Obsidian dashboard shell — `FullLayout`, `Header` chrome, vertical `Sidebar`, and the brand
marks — extracted so a fork of the starter kit stops copy-pasting `layouts/` and re-deriving the
same bugs.

Token-driven, **controlled**, and slot-based: the package holds the shell mechanics, you keep your
data, your store and your content.

```bash
pnpm add @devopsnext/starterkit-layout
```

```jsx
import { FullLayout } from "@devopsnext/starterkit-layout";
import "@devopsnext/starterkit-layout/styles.css"; // once, at the app root

<FullLayout
  navItems={navItems}
  miniSidebar={miniSidebar}
  mobileSidebarOpen={drawerOpen}
  onToggleMini={() => setMini((v) => !v)}
  onToggleMobile={() => setDrawer((v) => !v)}
  onCloseMobile={() => setDrawer(false)}
  sidebarUser={{ initials: "AB", name: "Ada Byron" }}
  roleBadge="Reviewer"
  profile={{ initials: "AB", menu: <YourProfileMenu /> }}
>
  {children}
</FullLayout>
```

## Prerequisites

Two, and both are real:

1. **Bootstrap 5.3 utility CSS must be loaded by the host.** This package emits Bootstrap utility
   class names (`d-flex`, `d-lg-none`, `me-auto`, `gap-2`, `p-4`) and deliberately does not depend
   on Bootstrap — declaring it would warn on every consumer that already has it transitively via
   reactstrap. Without a utility layer the shell renders as a broken vertical stack **and nothing
   errors**. This is the package's one silent failure mode; removing it is v2 scope.
2. **`simplebar-react` needs its own stylesheet** (`simplebar-react/dist/simplebar.min.css`). The
   package cannot `@import` it — see the token contract below.

Fonts are **not** requested. The type tokens carry family names only and fall back to `system-ui`.
Load Outfit and Plus Jakarta Sans yourself (`next/font` is self-hosted and CSP-safe).

## Peer dependencies

`react`, `react-dom`, `next`, `reactstrap`, `motion`, `simplebar-react`. `dependencies` is empty.

They are peers rather than dependencies because every one of them carries identity: two copies of
`motion` means two `AnimatePresence` contexts and exit animations that never fire; two of
`reactstrap` breaks the Bootstrap CSS contract its dropdowns rely on; two Reacts is an
`Invalid hook call`.

> **Do not consume this package via `link:` during development.** It vendors its own
> react/react-dom/next in devDependencies so it can build and test itself, and a linked package
> resolves from its own directory first — identical version numbers do not save you, because React
> identity is per module instance. Use a packed tarball instead, which behaves exactly like a
> registry install:
>
> ```bash
> pnpm build && pnpm pack
> cd ../your-app && pnpm add ./../starterkit-layout/devopsnext-starterkit-layout-0.1.0.tgz
> ```
>
> A tarball also tests **what actually ships** (`dist/` + `styles.css`), which a `link:` never does.

## Entry points

| Import | Contains | Runtime imports |
|---|---|---|
| `@devopsnext/starterkit-layout` | the shell, sidebar, header, hooks, all brand marks | the peers above |
| `@devopsnext/starterkit-layout/brand` | `BrandMark`, `LogoIcon`, `AuthLogo` | **`react/jsx-runtime` only** |
| `@devopsnext/starterkit-layout/styles.css` | the entire visual definition | — |

`./brand` exists so an auth page — which renders outside the dashboard shell — can show the brand
without pulling reactstrap, simplebar and the router into that route's bundle. `Logo` is
deliberately **not** there: it needs `motion` for its collapse animation.

## The package is stateless

There is no store, no context, no data fetching. `FullLayout` takes values and callbacks:

| Prop | |
|---|---|
| `navItems` | **required.** `NavItem[]` — the package has no data source of its own |
| `miniSidebar` `mobileSidebarOpen` `isRTL` `isTopbarFixed` `isSidebarFixed` | controlled booleans |
| `onToggleMini` `onToggleMobile` `onCloseMobile` | callbacks. `onCloseMobile` must be **idempotent** — it fires for overlay click, Escape, route change and crossing up into desktop, including on already-closed transitions |
| `pathname` | defaults to `usePathname()`; pass it to render without a mounted App Router |
| `t` | `(key) => string`, applied to nav titles and captions. Defaults to identity, so i18n is opt-in |
| `geometry` | `{ sidebarWidth, miniSidebarWidth, topbarHeight }` |

Chrome is slots — `brand`, `brandCompact`, `headerDropdowns[]`, `search`, `themeToggle`,
`roleBadge`, `profile`, `headerEndSlot`, `sidebarHeader`, `sidebarUser`, `sidebarFooter`. There is
**no** default profile menu and no default logout link; a shell package does not get to decide
those.

### `NavItem`

```ts
{ navigationId?, title?, href?, icon?, caption?, children?, suffix?, suffixColor? }
```

Exactly one of three kinds: `caption` → section heading; `children` → collapsible group (one level);
otherwise a leaf link. `icon` is usually a **class-name string** (`"bi bi-house"`) rendered as
`<i className={icon} />`, matching what a navigation API returns; a ReactNode also works.

## Brand

Nothing about the brand is hard-coded. `Logo`, `LogoIcon` and `AuthLogo` all take:

| Prop | |
|---|---|
| `brandName` | the wordmark. Defaults to the exported `DEFAULT_BRAND_NAME` placeholder — compare against it to tell "nobody set this" from "someone chose this" |
| `mark` | **any element** rendered in the gradient box: a `lucide-react` icon, an MUI icon, an inline `<svg>`, an `<img>`, text |
| `markSrc` / `markAlt` | convenience for an image mark — renders an `<img>` sized to the glyph box |
| `size` | box size in px; radius, glyph and glow all derive from it |
| `tagline` | `AuthLogo` only. `null` removes it |

```jsx
import { Rocket } from "lucide-react";

<Logo brandName="Northwind" mark={<Rocket />} />
<AuthLogo brandName="Northwind" markSrc="/logo.svg" tagline={null} />
```

A direct `<svg>` or `<img>` child is sized to the glyph box and inherits white, so
`currentColor` icon sets (lucide strokes with it, MUI fills with it) and a supplied logo file
all land correctly without you doing arithmetic against `size`. An `<img>` uses
`object-fit: contain`, so a non-square logo fits rather than stretching.

`markAlt` defaults to `""` because the wordmark beside the mark already names the brand. On
`LogoIcon` there is no wordmark, so give it a real label.

## Token contract

The package declares **nothing** on `:root`. Every token it reads is aliased onto its own scope as

```css
:is(.il-shell, .il-brand) {
  --il-t-fg2: var(--fg2, #8b93b5);
}
```

A CSS fallback applies only to an *absent* custom property, so your `--fg2` wins wherever you define
it and the vendored value renders the shell where you do not. Priority falls out of the mechanism —
no load-order rule to get wrong, and no `@layer`. Rules are deliberately unlayered so they beat
unlayered global resets.

26 tokens are consumed; the alias block is generated by `pnpm sync:tokens` from the live design-system
sheet and `pnpm sync:tokens:check` fails CI when the vendored copy drifts.

**The remote sheet is never `@import`ed.** An `@import` is all-or-nothing — it would also ship a
`body` background, a Google Fonts request and a pile of component classes, and would need a CSP
allowance from every consumer.

### Geometry is `--il-*`, not `--il-t-*`

`--il-sidebar-width` (240px), `--il-mini-sidebar-width` (80px), `--il-topbar-height` (59px) are **not**
design tokens — they are absent from the token sheet. They are declared on `.il-shell` and the
one-dash difference is what keeps the codegen's `--il-t-*` scraper off them. Override them on
`.il-shell` or via the `geometry` prop.

## RTL

The package flips only its **own** shell geometry, keyed off `[dir="rtl"]` (which `FullLayout` sets).
Flipping Bootstrap's own utilities is the host's job — shipping a second copy of that sweep would
fight whatever you already load.

## Accessibility

- The off-canvas drawer is marked `inert` below `lg` while closed. Without it, a keyboard user tabs
  into a menu parked off-screen.
- The hamburger keeps a **stable** accessible name and moves `aria-expanded` — swapping the label to
  "Close menu" would announce "Open menu, expanded".
- Submenu toggles are real `<button>`s with `aria-expanded`/`aria-controls`.
- The overlay is a `<button>` with an accessible name, not a `<div>`.
- Auto-hide never fires while focus is inside the header, because hiding marks it `inert` and that
  would drop focus to `<body>`.

## Development

```bash
pnpm verify           # typecheck → tests → build
pnpm test             # vitest + jsdom + axe
pnpm test:brand       # Playwright: var() cascade and real layout maths
pnpm storybook
pnpm sync:tokens      # regenerate the alias block
```

There is no ESLint, on purpose — the version pinned in the consuming starter kit is broken, and a
second lint config that disagrees with it is worse than none.

## Not in v1

No horizontal layout, no breadcrumbs, no customizer panel, no dropdown *content* (the four panels in
the reference app render product data, not shell chrome — they are slots). No redux, no i18n, no data
fetching, ever.

## License

MIT
