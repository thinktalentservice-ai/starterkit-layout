"use client";
import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

export interface LogoIconProps {
  /** Mark size in px. Default 32. */
  size?: number;
  /** Replaces the mark's glyph. */
  mark?: ReactNode;
  className?: string;
}

/** The mark alone, no wordmark — what the header shows below the lg breakpoint. */
export function LogoIcon({ size = 32, mark, className }: LogoIconProps) {
  return (
    <BrandMark size={size} className={className}>
      {mark}
    </BrandMark>
  );
}
