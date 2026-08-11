"use client";

/* The two glyphs the shell chrome needs, inline.
   The source imported these from lucide-react, which would have made a whole
   icon library a peer dependency of this package for two 18px shapes. Consumers
   pass their own icons for everything else via slots. */

export interface IconProps {
  size?: number;
  className?: string;
}

export function MenuIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function SearchIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
