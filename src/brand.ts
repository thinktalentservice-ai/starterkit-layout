/**
 * `@devopsnext/starterkit-layout/brand` — the brand marks, and nothing else.
 *
 * This entry exists so an auth page (which renders outside the dashboard shell)
 * can show the brand without pulling reactstrap, simplebar-react, motion or the
 * Next router into that route's bundle. Everything exported here has zero
 * runtime imports beyond React itself, and a build checkpoint asserts the
 * emitted chunk stays that way.
 *
 * `Logo` is NOT here — it needs `motion` for its collapse animation. It is on
 * the main entry, where motion is unavoidable anyway.
 */
export { BrandMark, DEFAULT_BRAND_NAME } from "./brand/BrandMark";
export { LogoIcon } from "./brand/LogoIcon";
export { AuthLogo } from "./brand/AuthLogo";

export type { BrandMarkProps } from "./brand/BrandMark";
export type { LogoIconProps } from "./brand/LogoIcon";
export type { AuthLogoProps } from "./brand/AuthLogo";
