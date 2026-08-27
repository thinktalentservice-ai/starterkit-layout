"use client";
import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

export interface LogoProps {
  /** Mark size in px. Default 32. */
  size?: number;
  /** Replaces the mark's glyph with any element — a lucide/MUI icon, an <svg>, an <img>. */
  mark?: ReactNode;
  /** Convenience for an image mark: renders an <img> sized to the glyph box. */
  markSrc?: string;
  /**
   * Alt text for `markSrc`. Unlike Logo/AuthLogo this component renders NO
   * wordmark, so the mark is the only brand identifier on screen — give it a
   * real label rather than leaving it decorative.
   */
  markAlt?: string;
  /**
   * Renders the mark as the supplied artwork alone — no gradient box, no glow,
   * glyph at full size. Use with `markSrc` when the logo file already carries
   * its own shape.
   */
  bare?: boolean;
  className?: string;
}

/**
 * The mark alone, no wordmark — what the header shows below the lg breakpoint, and
 * what `/rest/client/logo/<id>` is fetched into.
 *
 * Named for that endpoint. The full lockup (mark + collapsing wordmark) is
 * `Favicon`, which is NOT on the `./brand` entry because it needs `motion`.
 */
export function Logo({ size = 32, mark, markSrc, markAlt, bare = false, className }: LogoProps) {
  return (
    <BrandMark
      size={size}
      bare={bare}
      className={className}
      {...(markSrc ? { src: markSrc, alt: markAlt ?? "" } : {})}
    >
      {mark}
    </BrandMark>
  );
}
