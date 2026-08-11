"use client";
import type { ReactNode, CSSProperties } from "react";

export interface BrandMarkProps {
  /** Box size in px. Drives radius (0.3×), glyph (0.5×) and glow blur (0.5×). */
  size?: number;
  /** Replaces the default envelope glyph. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * The gradient square with a glyph in it — the one piece of brand furniture
 * shared by Logo, LogoIcon and AuthLogo, which in the source were three copies
 * of the same SVG at three sizes.
 *
 * Geometry is inline because it is genuinely per-instance; colour is not, and
 * lives in styles.css so it resolves through the --il-t-* aliases. An inline
 * `background: var(--gradient-secondary)` — what the source did — reads the host
 * token directly and therefore ships no vendored fallback at all.
 */
export function BrandMark({ size = 32, children, className = "", style }: BrandMarkProps) {
  return (
    <div
      className={`il-brand-mark ${className}`.trim()}
      style={
        {
          "--il-mark-size": `${size}px`,
          "--il-mark-radius": `${Math.round(size * 0.3)}px`,
          "--il-mark-glow": `${Math.round(size * 0.5)}px`,
          ...style,
        } as CSSProperties
      }
    >
      {children ?? (
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <rect x="1" y="3" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" />
          <path d="M1 6l7 4 7-4" stroke="white" strokeWidth="1.5" />
        </svg>
      )}
    </div>
  );
}
