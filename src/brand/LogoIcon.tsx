"use client";
import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

export interface LogoIconProps {
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
  className?: string;
}

/** The mark alone, no wordmark — what the header shows below the lg breakpoint. */
export function LogoIcon({ size = 32, mark, markSrc, markAlt, className }: LogoIconProps) {
  return (
    <BrandMark
      size={size}
      className={className}
      {...(markSrc ? { src: markSrc, alt: markAlt ?? "" } : {})}
    >
      {mark}
    </BrandMark>
  );
}
