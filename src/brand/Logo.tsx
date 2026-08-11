"use client";
import type { ReactNode, CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BrandMark, DEFAULT_BRAND_NAME } from "./BrandMark";

export interface LogoProps {
  /** Collapses the wordmark to zero width. Drive it from the same state as the sidebar. */
  miniSidebar?: boolean;
  /** Wordmark. Default "Executive Insight". */
  brandName?: ReactNode;
  /** Replaces the mark's glyph with any element — a lucide/MUI icon, an <svg>, an <img>. */
  mark?: ReactNode;
  /** Convenience for an image mark: renders an <img> sized to the glyph box. */
  markSrc?: string;
  /** Alt text for `markSrc`. Defaults to "" (decorative — the wordmark names the brand). */
  markAlt?: string;
  /** Mark size in px. Default 32. */
  size?: number;
  className?: string;
}

/**
 * The full brand lockup: mark plus a wordmark that collapses when the sidebar
 * does.
 *
 * NOT exported from the `./brand` entry, deliberately. It is the only brand
 * component that needs `motion`, and the whole point of that entry is that an
 * auth page can import a brand mark without pulling a peer dependency in. Keep
 * this one on the main entry, where motion is already unavoidable.
 *
 * `miniSidebar` is a prop rather than a `useSelector` — the source read redux
 * directly here, which is what made the shell uncopyable between apps.
 */
export function Logo({
  miniSidebar = false,
  brandName = DEFAULT_BRAND_NAME,
  mark,
  markSrc,
  markAlt,
  size = 32,
  className = "",
}: LogoProps) {
  return (
    <motion.span
      className={`il-brand ${className}`.trim()}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <BrandMark size={size} {...(markSrc ? { src: markSrc, alt: markAlt ?? "" } : {})}>
        {mark}
      </BrandMark>
      <AnimatePresence>
        {!miniSidebar && (
          <motion.div
            className="il-brand-wordmark"
            initial={{ opacity: 0, x: -8, width: 0 }}
            animate={{ opacity: 1, x: 0, width: "auto" }}
            exit={{ opacity: 0, x: -8, width: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <span className="il-brand-name" style={{ "--il-brand-name-size": "16px" } as CSSProperties}>
              {brandName}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.span>
  );
}
