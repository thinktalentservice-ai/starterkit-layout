/* Test/Storybook stub for `next/link`.
   The real one needs a mounted App Router; jsdom and Storybook have neither.
   Deliberately dumb — an <a> that forwards its ref, which is all the sidebar
   needs, and all `motion.create(Link)` needs to wrap. */
import { forwardRef } from "react";
import type { AnchorHTMLAttributes, Ref } from "react";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

const Link = forwardRef(function Link(
  { href, children, ...rest }: LinkProps,
  ref: Ref<HTMLAnchorElement>,
) {
  return (
    <a ref={ref} href={href} {...rest}>
      {children}
    </a>
  );
});

export default Link;
