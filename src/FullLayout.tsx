"use client";
import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Container } from "reactstrap";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "./Header";
import { Sidebar } from "./sidebar/Sidebar";
import { Favicon } from "./brand/Favicon";
import { Logo } from "./brand/Logo";
import { useHeaderAutoHide } from "./hooks/useHeaderAutoHide";
import { useIsDesktop } from "./hooks/useIsDesktop";
import { useDrawerChrome } from "./hooks/useDrawerChrome";
import { DEFAULT_MOBILE_SIDEBAR_ID } from "./constants";
import type { HeaderProps } from "./Header";
import type {
  NavItem,
  ShellGeometry,
  SidebarUser,
  Translate,
} from "./types";

const px = (v: number | string | undefined) =>
  v === undefined ? undefined : typeof v === "number" ? `${v}px` : v;

export interface FullLayoutProps
  extends Pick<
    HeaderProps,
    | "headerDropdowns"
    | "headerCenterSlot"
    | "search"
    | "onSearch"
    | "searchPlaceholder"
    | "themeToggle"
    | "headerActionsSlot"
    | "roleBadge"
    | "profile"
    | "headerEndSlot"
  > {
  children?: ReactNode;

  /** Sidebar rows. Required — this package has no data source of its own. */
  navItems: NavItem[];

  /* ── controlled state ─────────────────────────────────────────────────── */
  miniSidebar?: boolean;
  mobileSidebarOpen?: boolean;
  isRTL?: boolean;
  isTopbarFixed?: boolean;
  isSidebarFixed?: boolean;

  /* ── callbacks ────────────────────────────────────────────────────────── */
  onToggleMini?: () => void;
  onToggleMobile?: () => void;
  /**
   * Every dismissal path the shell owns: overlay click, Escape, route change,
   * and crossing up into desktop. Must be idempotent — it fires on
   * already-closed transitions too.
   */
  onCloseMobile?: () => void;

  /** Current path. Defaults to `usePathname()`; pass it to render without a router. */
  pathname?: string;

  /* ── brand ────────────────────────────────────────────────────────────── */
  /** Desktop brand lockup. Defaults to `<Favicon miniSidebar={miniSidebar} />`. */
  favicon?: ReactNode;
  /** Sub-lg brand mark — the `/rest/client/logo/<id>` artwork. Defaults to `<Logo />`. */
  logo?: ReactNode;

  /* ── sidebar slots ────────────────────────────────────────────────────── */
  sidebarHeader?: ReactNode | null;
  sidebarUser?: SidebarUser;
  sidebarFooter?: ReactNode;

  /* ── behaviour ────────────────────────────────────────────────────────── */
  autoHideHeader?: boolean;
  /** Wrap children in a fluid Container. Default true. */
  container?: boolean;
  containerClassName?: string;
  geometry?: ShellGeometry;
  t?: Translate;
  mobileSidebarId?: string;
  className?: string;
  contentClassName?: string;
}

export function FullLayout({
  children,
  navItems,
  miniSidebar = false,
  mobileSidebarOpen = false,
  isRTL = false,
  isTopbarFixed = false,
  isSidebarFixed = false,
  onToggleMini,
  onToggleMobile,
  onCloseMobile,
  pathname,
  favicon,
  logo,
  sidebarHeader,
  sidebarUser,
  sidebarFooter,
  autoHideHeader = true,
  container = true,
  containerClassName = "p-4",
  geometry,
  t,
  mobileSidebarId = DEFAULT_MOBILE_SIDEBAR_ID,
  className = "",
  contentClassName = "",
  ...headerSlots
}: FullLayoutProps) {
  const routerPath = usePathname();
  const location = pathname ?? routerPath;

  /* The shell element carries the geometry custom properties, so the hook must
     measure from here rather than from documentElement — this package declares
     nothing on :root. */
  const shellRef = useRef<HTMLDivElement | null>(null);
  const { hidden: headerHidden, topbarHeight } = useHeaderAutoHide({
    shellRef,
    enabled: autoHideHeader,
  });

  const isDesktop = useIsDesktop();

  const close = onCloseMobile ?? (() => {});
  useDrawerChrome({
    open: mobileSidebarOpen,
    onClose: close,
    pathname: location,
    isDesktop,
  });

  /* Off-canvas is a visual state only: the drawer's ~10 nav links stay in the tab
     order while parked off-screen, so a keyboard user tabs into a menu they cannot
     see. Only applied below lg, where the sidebar is actually a drawer. */
  const sidebarInert = !isDesktop && !mobileSidebarOpen;

  const geometryVars = {
    "--il-sidebar-width": px(geometry?.sidebarWidth),
    "--il-mini-sidebar-width": px(geometry?.miniSidebarWidth),
    "--il-topbar-height": px(geometry?.topbarHeight),
  } as CSSProperties;

  return (
    <main>
      <div dir={isRTL ? "rtl" : "ltr"}>
        <div
          ref={shellRef}
          style={geometryVars}
          className={`il-shell d-md-block d-lg-flex ${miniSidebar ? "il-is-mini" : ""} ${
            headerHidden ? "il-header-hidden" : ""
          } ${className}`
            .replace(/\s+/g, " ")
            .trim()}
        >
          <aside
            id={mobileSidebarId}
            className={`il-sidebar-area ${mobileSidebarOpen ? "il-show-sidebar" : ""}`.trim()}
            inert={sidebarInert || undefined}
          >
            <Sidebar
              navItems={navItems}
              pathname={location}
              isFixed={isSidebarFixed}
              headerHidden={headerHidden}
              topbarHeight={topbarHeight}
              sidebarHeader={sidebarHeader}
              sidebarUser={sidebarUser}
              sidebarFooter={sidebarFooter}
              {...(t ? { t } : {})}
            />
          </aside>

          {/* Sibling of .il-content-area, not a child of the padded Container inside it:
              the overlay is a shell-level scrim, and nesting it in the content column
              made its stacking order depend on whatever that column happens to contain. */}
          <AnimatePresence>
            {mobileSidebarOpen && (
              <motion.button
                type="button"
                className="il-sidebar-overlay"
                aria-label="Close menu"
                onClick={close}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </AnimatePresence>

          <div
            className={`il-content-area ${isTopbarFixed ? "il-fixed-topbar" : ""} ${contentClassName}`
              .replace(/\s+/g, " ")
              .trim()}
          >
            <Header
              headerHidden={headerHidden}
              miniSidebar={miniSidebar}
              mobileSidebarOpen={mobileSidebarOpen}
              {...(onToggleMini ? { onToggleMini } : {})}
              {...(onToggleMobile ? { onToggleMobile } : {})}
              mobileSidebarId={mobileSidebarId}
              favicon={favicon ?? <Favicon miniSidebar={miniSidebar} />}
              logo={logo ?? <Logo />}
              {...headerSlots}
            />
            {container ? (
              <Container fluid className={containerClassName}>
                <div>{children}</div>
              </Container>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
