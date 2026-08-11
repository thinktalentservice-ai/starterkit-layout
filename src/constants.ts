/**
 * Bootstrap's `lg` tier, in JS.
 *
 * A CSS custom property cannot be used inside a media query, so this number is
 * necessarily duplicated between here and styles.css rather than shared. The
 * source carried the same duplication against the Sass `$grid-breakpoints` map
 * and said so in a comment; the difference is that here a test asserts the two
 * agree, so they cannot drift silently.
 *
 * Exported because a consumer wiring its own responsive behaviour around the
 * shell needs the same number, and guessing it wrong is invisible until a
 * specific viewport width.
 */
export const LG_BREAKPOINT = 992;

/** `matchMedia` query for "desktop", i.e. Bootstrap lg and up. */
export const LG_QUERY = `(min-width: ${LG_BREAKPOINT}px)`;

/** Default `aria-controls` target for the header's mobile hamburger. */
export const DEFAULT_MOBILE_SIDEBAR_ID = "il-mobile-sidebar";

/** Default max height of a header dropdown's scroller, in px. */
export const DEFAULT_DROPDOWN_SCROLL_HEIGHT = 350;
