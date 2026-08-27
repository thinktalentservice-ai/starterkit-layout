"use client";
import type { ReactNode, CSSProperties } from "react";

/**
 * The placeholder wordmark. Exported rather than buried as an inline default so
 * a consumer can see what they are overriding — and so "did anyone set this?" is
 * answerable by comparing against a value instead of grepping for a string.
 */
export const DEFAULT_BRAND_NAME = "Executive Insight";

export interface BrandMarkProps {
  /** Box size in px. Drives radius (0.3×), glyph (0.5×) and glow blur (0.5×). */
  size?: number;
  /**
   * The glyph inside the gradient box. Any element works — a lucide-react icon,
   * an MUI icon, an inline `<svg>`, an `<img>`, or text.
   *
   * A direct `<svg>` or `<img>` child is sized to the glyph box and inherits
   * white, so `currentColor`-based icon sets (lucide, MUI) and stroke-based ones
   * both land correctly without the caller doing arithmetic against `size`.
   */
  children?: ReactNode;
  /** Convenience for an image mark: renders an `<img>` sized to the glyph box. */
  src?: string;
  /**
   * Alt text for `src`. Defaults to `""` — decorative, because the wordmark
   * beside it already names the brand and a second announcement is noise. Pass a
   * real string when the mark is used ALONE (e.g. `Logo` with no wordmark).
   */
  alt?: string;
  /**
   * Drops the brand furniture: no gradient fill, no glow, no corner radius, and
   * the glyph fills the whole box instead of half of it.
   *
   * For the common case where the mark IS the supplied artwork — a favicon or a
   * logo file that already carries its own shape and background. Painting our
   * gradient behind it renders someone else's logo in a box they did not ask
   * for, at half the size they supplied. `color` reverts to `inherit` here
   * because a `currentColor` glyph is no longer sitting on a brand-coloured
   * fill; on a light surface white-on-white is invisible.
   */
  bare?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * The gradient square with a glyph in it — the brand furniture shared by Favicon,
 * Logo and AuthLogo, which in the source were three copies of the same SVG
 * at three sizes.
 *
 * Geometry is inline because it is genuinely per-instance; colour is not, and
 * lives in styles.css so it resolves through the --il-t-* aliases. An inline
 * `background: var(--gradient-secondary)` — what the source did — reads the host
 * token directly and therefore ships no vendored fallback at all.
 */
export function BrandMark({
  size = 32,
  children,
  src,
  alt = "",
  bare = false,
  className = "",
  style,
}: BrandMarkProps) {
  const half = Math.round(size * 0.5);
  const glyph = bare ? size : half;

  return (
    <div
      className={`il-brand-mark${bare ? " il-brand-mark--bare" : ""} ${className}`.trim()}
      style={
        {
          "--il-mark-size": `${size}px`,
          "--il-mark-radius": `${Math.round(size * 0.3)}px`,
          "--il-mark-glow": `${half}px`,
          "--il-mark-glyph": `${glyph}px`,
          ...style,
        } as CSSProperties
      }
    >
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        children ?? (
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
            <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M1 6l7 4 7-4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )
      )}
    </div>
  );
}
