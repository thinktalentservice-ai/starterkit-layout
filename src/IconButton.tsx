"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";

const motionVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.12 },
  tap: { scale: 0.9 },
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Hover/press spring. Default true. */
  animate?: boolean;
}

/**
 * Icon-only button — transparent background, hover highlight, motion spring.
 *
 * Ported into this package rather than left in the host because renaming
 * `.obsidian-icon-btn` to `.il-icon-btn` would otherwise have broken the host's
 * own IconButton and, transitively, its theme toggle. Shipping the component
 * next to the class that styles it means the host can re-export this one and
 * delete both copies.
 */
export function IconButton({ children, className = "", animate = true, ...rest }: IconButtonProps) {
  const btn = (
    <button type="button" className={`il-icon-btn ${className}`.trim()} {...rest}>
      {children}
    </button>
  );

  if (!animate) return btn;

  return (
    <motion.div
      variants={motionVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      style={{ display: "inline-flex" }}
    >
      {btn}
    </motion.div>
  );
}
