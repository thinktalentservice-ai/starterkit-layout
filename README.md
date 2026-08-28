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

`react`, `react-dom`, `reactstrap`, `motion`, `simplebar-react`. `dependencies` is empty.

There is **no framework peer**. Nav rows render as plain `<a href>`, so the sidebar can point at
absolute URLs in sibling apps — which no router could client-navigate anyway. A row is a document
load. Nothing here imports `next`. The one exception is a `CLICK` row, which renders a
`<button type="button">` and runs a string instead of navigating — see below.

Active-row highlighting still works across those apps: an `href` already carrying a scheme is used
as-is, anything else resolves against `window.location.origin`, and the row whose path is the
longest prefix of the current one gets `.il-active-link`. A group containing that row opens itself.

They are peers rather than dependencies because every one of them carries identity: two copies of
`motion` means two `AnimatePresence` contexts and exit animations that never fire; two of
`reactstrap` breaks the Bootstrap CSS contract its dropdowns rely on; two Reacts is an
`Invalid hook call`.

> **Do not consume this package via `link:` during development.** It vendors its own
> react/react-dom in devDependencies so it can build and test itself, and a linked package
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
| `@devopsnext/starterkit-layout/brand` | `BrandMark`, `Logo`, `AuthLogo` | **`react/jsx-runtime` only** |
| `@devopsnext/starterkit-layout/styles.css` | the entire visual definition | — |

`./brand` exists so an auth page — which renders outside the dashboard shell — can show the brand
without pulling reactstrap, simplebar and the router into that route's bundle. `Favicon` is
deliberately **not** there: it needs `motion` for its collapse animation.

## The package is stateless

There is no store, no context, no data fetching. `FullLayout` takes values and callbacks:

| Prop | |
|---|---|
| `navItems` | **required.** `NavItem[]` — the package has no data source of its own |
| `miniSidebar` `mobileSidebarOpen` `isRTL` `isTopbarFixed` `isSidebarFixed` | controlled booleans |
| `onToggleMini` `onToggleMobile` `onCloseMobile` | callbacks. `onCloseMobile` must be **idempotent** — it fires for overlay click, Escape, route change and crossing up into desktop, including on already-closed transitions |
| `pathname` | optional. Only used to dismiss the mobile drawer on navigation — omit it if you never navigate client-side |
| `t` | `(key) => string`, applied to nav titles and captions. Defaults to identity, so i18n is opt-in |
| `geometry` | `{ sidebarWidth, miniSidebarWidth, topbarHeight }` |

Chrome is slots — `favicon`, `logo`, `headerDropdowns[]`, `themeToggle`,
`roleBadge`, `profile`, `headerEndSlot`, `sidebarHeader`, `sidebarUser`, `sidebarFooter`. There is
**no** default profile menu and no default logout link, and **no search field** — a shell package
does not get to decide those, and it has no data to search. The removed search input reported
keystrokes through an `onSearch` callback and searched nothing, so every consumer replaced it and
until they did the topbar offered a control that silently did nothing. Render your own into
`headerCenterSlot` or `headerActionsSlot`; `SearchIcon` is still exported.

### `NavItem`

```ts
{ navigationId?, title?, href?, icon?, caption?, children?, suffix?, suffixColor?, type?, event? }
```

Exactly one of three kinds: `caption` → section heading; `children` → collapsible group (one level);
otherwise a leaf. `icon` is usually a **class-name string** (`"bi bi-house"`) rendered as
`<i className={icon} />`, matching what a navigation API returns; a ReactNode also works.

`type` is `"LINK"` (the default) or `"CLICK"`. A `CLICK` row has no destination: it renders as a
`<button>` and runs `event`. Group and caption rows ignore both — a group row toggles its own panel
and is neither a destination nor an action.

### CLICK rows need `script-src 'unsafe-eval'`

A `CLICK` row's `event` is a **string of JavaScript**, compiled with `new Function(event)` and called
with no arguments. That is a Content-Security-Policy decision, so it is stated here rather than
discovered:

```
Content-Security-Policy: script-src 'self' 'unsafe-eval';
```

Without `'unsafe-eval'` the `Function` constructor throws `EvalError` on every CLICK row. The package
catches it and `console.error`s, so the row silently does nothing rather than breaking the page — but
it does nothing. If your CSP cannot carry `'unsafe-eval'`, do not emit `CLICK` rows; give the row an
`href` your app handles instead.

The compiled function runs in **global scope**. It sees `window` and nothing else — not React state,
not props, not this package. `FreshworksWidget('open')` works because the widget puts itself on
`window`; `setState(…)` never will.

Because the string is executed verbatim, **whoever can write the row can run script in the page.**
Keep the column administrator-only. Never populate it from anything an end user can set.

It is one module, `src/sidebar/runNavEvent.ts`, holding the package's only call to `new Function`. An
empty or absent `event` is a silent no-op and never reaches the compiler; a throwing one is caught,
logged with the row's title and the source it tried to run, and does not take the sidebar down.

A CLICK row is a real `<button>`, never `<a href="#">` — and it is never highlighted as the current
route, whatever `href` it happens to carry.

### `toNavItems` — raw API rows → `NavItem[]`

```jsx
import { toNavItems } from "@devopsnext/starterkit-layout";

const navItems = useMemo(() => toNavItems(rows), [rows]);
<FullLayout navItems={navItems} t={t} />
```

A pure function, and still no data fetching: it maps rows you already have. It takes
`{ navigationId, navigationName, navigationPath, navigationOrder, navigationIcon, navigationGroup,
navigationType, navigationEvent }`, sorts numerically by `navigationOrder`, builds one collapsible
group per distinct `navigationGroup` positioned at its **lowest** child order, and leaves ungrouped
rows as leaves. A row with no order sorts last, in input order.

It does **not** filter by status or role. Dropping rows is an authorization decision, and a shell
package that silently hides one hides a bug in your ACL. Filter first.

`toNavItems(rows, { t })` translates `navigationName` and the group key. **Pass `t` here or to
`FullLayout`/`Sidebar`, not both** — both translate titles, so both means `t(t(key))`. Passing it to
the layout is the simpler path and also covers captions, which this mapper never produces.

Group parents get **no icon** unless you pass `{ groupIcon }`. There is no glyph that is right for a
bucket whose name the package has never seen; the empty icon slot still reserves the column, so the
row stays aligned.

## Brand

Nothing about the brand is hard-coded. `Favicon`, `Logo` and `AuthLogo` all take:

| Prop | |
|---|---|
| `brandName` | the wordmark. Defaults to the exported `DEFAULT_BRAND_NAME` placeholder — compare against it to tell "nobody set this" from "someone chose this" |
| `mark` | **any element** rendered in the gradient box: a `lucide-react` icon, an MUI icon, an inline `<svg>`, an `<img>`, text |
| `markSrc` / `markAlt` | convenience for an image mark — renders an `<img>` sized to the glyph box |
| `wordmarkSrc` / `wordmarkAlt` | `Favicon` only. Renders the wordmark as an IMAGE instead of `brandName` text — a supplied logo file. Independent of `markSrc`: a tenant usually has a favicon-shaped mark AND a full logo at two different endpoints. Height-driven via `--il-brand-wordmark-height` (32px), capped by `--il-brand-wordmark-max-width` (180px). `wordmarkAlt` defaults to `brandName` — the image is the only thing naming the brand |
| `size` | box size in px; radius, glyph and glow all derive from it |
| `bare` | drops the gradient box, glow and radius, and shows the glyph at **full** size. `size` then means HEIGHT, not a box: the artwork keeps its own aspect ratio, capped at `--il-mark-max-width` (default `size × 5`). For a supplied favicon or logo file that already carries its own shape — the default boxes someone else's artwork and paints a 759×458 wordmark at 32×19 |
| `tagline` | `AuthLogo` only. `null` removes it |

```jsx
import { Rocket } from "lucide-react";

<Favicon brandName="Northwind" mark={<Rocket />} />
<Favicon brandName="Northwind" markSrc="/favicon.ico" bare />
<AuthLogo brandName="Northwind" markSrc="/logo.svg" tagline={null} />
```

A direct `<svg>` or `<img>` child is sized to the glyph box and inherits white, so
`currentColor` icon sets (lucide strokes with it, MUI fills with it) and a supplied logo file
all land correctly without you doing arithmetic against `size`. An `<img>` uses
`object-fit: contain`, so a non-square logo fits rather than stretching.

`markAlt` defaults to `""` because the wordmark beside the mark already names the brand. On
`Logo` there is no wordmark, so give it a real label.

## Profile menu

`ProfileMenu` is the identity block for the header's profile dropdown — photo or
initials, name, email, and a logout link. Pass it as `profile.menu`:

```jsx
import { ProfileMenu } from "@devopsnext/starterkit-layout";

<FullLayout
  profile={{
    initials: "AL",
    menu: (
      <ProfileMenu
        name="Ada Lovelace"
        email="ada@example.com"
        photoSrc={photoUrl}
        logoutHref="/auth/login"
      />
    ),
  }}
/>
```

| Prop | |
|---|---|
| `name` | display name. Also the source of the initials when `initials` is absent |
| `email` | shown under the name. Capped at 30 characters AND at the panel width; the full address stays in `title` |
| `photoSrc` | a plain URL — `https:`, `data:` or `blob:`. Absent **or failing to load** means the initials render; a later, different URL is retried |
| `photoAlt` | defaults to `""`: the name is rendered as text beside it, so the image is decorative. Give it a real value when you supply `initials` with no `name` |
| `initials` | overrides the two letters derived from `name` |
| `size` | avatar diameter in px. Default 46 |
| `logoutHref` | where logout points. **Nothing renders when absent** |
| `logoutLabel` | default `"Logout"` |

**It does not fetch the photo, and that is deliberate.** The reference host's
photo endpoint requires a bearer token, which an `<img src>` cannot send — the
request 401s and every user gets the placeholder. Fetch the bytes yourself and
hand over an object URL. `initialsFrom(name)` is exported for the same reason a
consumer might want it separately: it tolerates `""`, `null` and double spaces,
where the obvious `split(" ")` version renders `"undefined"`.

There is **no default identity**. An absent name renders empty, not "John Deo".

The initials chip is `aria-hidden` **only while a name is rendered beside it** —
then it is a duplicate reading. Supply `initials` with no `name` and it becomes
`role="img"` with the letters as its label, because it is then the only identity
on screen and hiding it would leave the accessibility tree with nothing.

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

**Specificity, honestly:** unlayered beats an unlayered reset only where this package's selector is
*more* specific. Against an EQUAL-specificity Bootstrap rule — `.navbar` vs `.il-topbar`,
`.dropdown` vs `.il-mega` — the cascade falls through to source order, and a host importing
Bootstrap after this sheet wins. Those cases are written as compound selectors
(`.il-topbar.navbar`, `.il-mega.dropdown`) so load order stops mattering. If you add a rule whose
class sits on an element that also carries a Bootstrap component class, do the same.

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

Three more are **derived** on `.il-shell` from those, and exist so the left column has one source of
truth instead of a scatter of literals:

| Custom property | Default | What it positions |
| --- | --- | --- |
| `--il-rail-center` | `calc(--il-mini-sidebar-width / 2)` → 40px | The icon rail. The topbar brand mark, the sidebar avatar and every nav icon are centred on this line, so the mark sits directly above the icon column and the column does not move when the sidebar collapses. |
| `--il-label-x` | `calc(--il-rail-center + 28px)` → 68px | Where every text column starts — nav labels, section captions, the sidebar username. Rows reach it with different gaps (a 32px avatar leaves less room than an 18px icon); the text column is the constant, the gaps are the slack. |
| `--il-toggle-clearance` | `40px` | How far past the sidebar's trailing edge the collapse toggle sits, in both states — 280px open, 120px mini. Not zero: once the mark is centred on the rail, an 80px mini column has 24px clear after it against a 36px `IconButton`, so pinning the toggle to the edge would put it on top of the mark. |

They are derived on `.il-shell` and not on `:root` on purpose. A custom property resolves its `var()`s
against the element it is **declared** on, and `.il-shell` is the element the `geometry` prop writes
`--il-mini-sidebar-width` onto — so a derived value declared on `:root` would freeze the default and
silently ignore the prop. Re-declare any of the three on `.il-shell` to override.

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
- A `CLICK` nav row is a real `<button type="button">`, not an `<a href="#">`. An anchor with no
  destination is not in the tab order and ignores Enter and Space, so the row it replaces was
  unreachable by keyboard and announced as a link to nowhere.
- `<button>`s carrying `.nav-link` get their UA cursor, background, border, alignment, line-height
  and fit-content width reset, so a control row is the same box as a link row rather than a form
  control parked in the nav.
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
fetching, ever — `toNavItems` maps rows you already hold and fetches nothing.

## License

MIT
