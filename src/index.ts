/**
 * `@devopsnext/starterkit-layout` — the Obsidian dashboard shell.
 *
 * Remember the stylesheet, which is a separate import:
 *   import "@devopsnext/starterkit-layout/styles.css";
 */
export { FullLayout } from "./FullLayout";
export { Header } from "./Header";
export { Sidebar } from "./sidebar/Sidebar";
export { NavItemContainer } from "./sidebar/NavItemContainer";
export { NavSubMenu } from "./sidebar/NavSubMenu";
export { IconButton } from "./IconButton";
export { BrandMark, DEFAULT_BRAND_NAME } from "./brand/BrandMark";
export { Favicon } from "./brand/Favicon";
export { Logo } from "./brand/Logo";
export { AuthLogo } from "./brand/AuthLogo";

export { useHeaderAutoHide } from "./hooks/useHeaderAutoHide";
export { useIsDesktop } from "./hooks/useIsDesktop";
export { useDrawerChrome } from "./hooks/useDrawerChrome";
export { MenuIcon, SearchIcon } from "./icons";
export { LG_BREAKPOINT, LG_QUERY, DEFAULT_MOBILE_SIDEBAR_ID } from "./constants";

export type { FullLayoutProps } from "./FullLayout";
export type { HeaderProps } from "./Header";
export type { SidebarProps } from "./sidebar/Sidebar";
export type { NavItemContainerProps } from "./sidebar/NavItemContainer";
export type { NavSubMenuProps } from "./sidebar/NavSubMenu";
export type { IconButtonProps } from "./IconButton";
export type { BrandMarkProps } from "./brand/BrandMark";
export type { FaviconProps } from "./brand/Favicon";
export type { LogoProps } from "./brand/Logo";
export type { AuthLogoProps } from "./brand/AuthLogo";
export type {
  NavItem,
  HeaderDropdownSlot,
  ProfileSlot,
  SidebarUser,
  Translate,
  ShellGeometry,
} from "./types";
