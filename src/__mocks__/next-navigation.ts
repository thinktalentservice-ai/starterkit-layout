/* Test/Storybook stub for `next/navigation`.
   `usePathname` is the only export this package touches. It returns a value the
   test sets, so a component that falls back to the hook is still drivable.

   Most tests should pass `pathname` as a prop instead — every component that
   reads the router accepts one precisely so it can render without a router at
   all. This stub exists for the default path, so that "no prop given" is also
   covered rather than merely unreachable. */

let current = "/";

/** Set the value `usePathname()` will return. Test-only. */
export function __setPathname(next: string): void {
  current = next;
}

export function usePathname(): string {
  return current;
}
