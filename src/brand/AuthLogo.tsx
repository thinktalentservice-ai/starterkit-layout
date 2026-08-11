"use client";
import type { ReactNode, CSSProperties } from "react";
import { BrandMark } from "./BrandMark";

export interface AuthLogoProps {
  /** Wordmark. Default "Executive Insight". */
  brandName?: ReactNode;
  /** The pill under the wordmark. Default "Enterprise". `null` removes it. */
  tagline?: ReactNode | null;
  /** Replaces the mark's glyph. */
  mark?: ReactNode;
  /** Mark size in px. Default 48. */
  size?: number;
  className?: string;
}

/**
 * The brand lockup for auth pages — bigger mark, wordmark plus a tagline pill.
 *
 * Reachable via the `@devopsnext/starterkit-layout/brand` entry point, which
 * exists for this component specifically: it renders on a login page, outside
 * the dashboard shell, and must not drag reactstrap, simplebar and the router
 * into that route's bundle. It has no imports beyond BrandMark, and a build
 * checkpoint asserts the emitted chunk keeps it that way.
 *
 * `.il-brand` is a token scope in its own right for the same reason — outside
 * `.il-shell`, nothing else would resolve the aliases.
 */
export function AuthLogo({
  brandName = "Executive Insight",
  tagline = "Enterprise",
  mark,
  size = 48,
  className = "",
}: AuthLogoProps) {
  return (
    <div className={`il-brand ${className}`.trim()} style={{ gap: 12 } as CSSProperties}>
      <BrandMark size={size}>{mark}</BrandMark>
      <div className="il-brand-text">
        <div className="il-brand-name" style={{ "--il-brand-name-size": "22px" } as CSSProperties}>
          {brandName}
        </div>
        {tagline !== null && tagline !== undefined && (
          <div className="il-brand-tagline">{tagline}</div>
        )}
      </div>
    </div>
  );
}
