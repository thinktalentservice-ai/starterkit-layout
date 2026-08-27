"use client";
import type { ReactNode, CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BrandMark, DEFAULT_BRAND_NAME } from "./BrandMark";

export interface FaviconProps {
  /** Collapses the wordmark to zero width. Drive it from the same state as the sidebar. */
  miniSidebar?: boolean;
  /** Wordmark. Default "Executive Insight". Ignored when `wordmarkSrc` is set. */
  brandName?: ReactNode;
  /**
   * Renders the wordmark as an IMAGE instead of text — a supplied logo file.
   *
   * Separate from `markSrc`, which is the small square mark beside it. A tenant
   * typically has both: a favicon-shaped mark and a full logo, at two different
   * endpoints, and setting one must not silently change the other.
   */
  wordmarkSrc?: string;
  /**
   * Alt text for `wordmarkSrc`. Defaults to `brandName` when that is a plain
   * string — unlike the mark, the wordmark image IS the brand name, so leaving
   * it decorative would remove the only text identifying the brand.
   */
  wordmarkAlt?: string;
  /** Replaces the mark's glyph with any element — a lucide/MUI icon, an <svg>, an <img>. */
  mark?: ReactNode;
  /** Convenience for an image mark: renders an <img> sized to the glyph box. */
  markSrc?: string;
  /** Alt text for `markSrc`. Defaults to "" (decorative — the wordmark names the brand). */
  markAlt?: string;
  /**
   * Renders the mark as the supplied artwork alone — no gradient box, no glow,
   * glyph at full size. Use with `markSrc` when the logo file already carries
   * its own shape.
   */
  bare?: boolean;
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
export function Favicon({
  miniSidebar = false,
  brandName = DEFAULT_BRAND_NAME,
  wordmarkSrc,
  wordmarkAlt,
  mark,
  markSrc,
  markAlt,
  bare = false,
  size = 32,
  className = "",
}: FaviconProps) {
  return (
    <motion.span
      className={`il-brand ${className}`.trim()}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <BrandMark size={size} bare={bare} {...(markSrc ? { src: markSrc, alt: markAlt ?? "" } : {})}>
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
            {wordmarkSrc ? (
              <img
                className="il-brand-wordmark-img"
                src={wordmarkSrc}
                alt={wordmarkAlt ?? (typeof brandName === "string" ? brandName : "")}
              />
            ) : (
              <span className="il-brand-name" style={{ "--il-brand-name-size": "16px" } as CSSProperties}>
                {brandName}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.span>
  );
}
