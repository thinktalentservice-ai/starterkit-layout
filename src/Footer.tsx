"use client";
import type { ReactNode } from "react";

export interface FooterProps {
  /**
   * Copyright year. Defaults to the current year.
   *
   * Pass it explicitly when the page is statically exported: the default is read
   * at render, so a build cut on 31 December and served after midnight would
   * hydrate against a different year than the HTML it ships. The default is
   * rendered with `suppressHydrationWarning` for that case, but a host that
   * cares which year it prints should say so.
   */
  year?: number | string;
  /** Site / company name, rendered as the link text after the `©`. */
  siteName?: ReactNode;
  /** Where `siteName` points. Without it the name renders as plain text. */
  siteHref?: string;
  /** Leading column. Empty by default; it still reserves its half so the centre stays centred. */
  startSlot?: ReactNode;
  /** Trailing column — the place a language picker or a version string goes. */
  endSlot?: ReactNode;
  /**
   * Replaces the centre content entirely (`© year | siteName`). For a footer whose
   * centre is not a copyright line — legal links, a status badge.
   */
  children?: ReactNode;
  className?: string;
}

/**
 * The page footer. Pass it to `FullLayout`'s `footer` slot, or render it yourself
 * at the bottom of a hand-assembled shell.
 *
 * Content is entirely props and slots — the source read `footer.site.*` from
 * i18next and a `displayLang` property, neither of which a shell package can
 * know. Translate in the host and hand over the string.
 *
 * The source also carried a language `<select>`. It was hidden by a flag that
 * was `false` in every environment (`!false` → `d-none`), and its handler called
 * `this.setState` from a function component, so it could never have worked. It
 * was dropped rather than ported; `endSlot` is where a working one belongs.
 */
export function Footer({
  year,
  siteName,
  siteHref,
  startSlot,
  endSlot,
  children,
  className = "",
}: FooterProps) {
  const hasName = siteName !== undefined && siteName !== null && siteName !== "";

  return (
    <footer className={`il-footer ${className}`.trim()}>
      <div className="il-footer-start">{startSlot}</div>
      <div className="il-footer-center">
        {children ?? (
          <>
            <span suppressHydrationWarning>
              &copy; {year ?? new Date().getFullYear()}
            </span>
            {hasName && (
              <>
                <span className="il-footer-sep" aria-hidden="true">
                  |
                </span>
                {siteHref ? (
                  <a
                    className="il-footer-link"
                    href={siteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {siteName}
                  </a>
                ) : (
                  <span>{siteName}</span>
                )}
              </>
            )}
          </>
        )}
      </div>
      <div className="il-footer-end">{endSlot}</div>
    </footer>
  );
}
