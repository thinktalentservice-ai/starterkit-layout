"use client";
import { isValidElement } from "react";
import type { ReactNode } from "react";

/**
 * Renders a NavItem's `icon`.
 *
 * The source always emitted `<i className={icon ?? ""} />`, because the host's
 * navigation API hands back icon-font class names. That stays the behaviour for
 * a string — including the empty `<i>` for a missing icon, which is load-bearing
 * layout rather than an oversight: it reserves the icon column so labels in a
 * list stay aligned whether or not a given row has an icon, and `.il-submenu`
 * hides it with `visibility: hidden` (not `display: none`) for the same reason.
 *
 * A ReactNode is rendered as-is, which is what you want when you are not driving
 * this from an API.
 */
export function NavIcon({ icon }: { icon?: string | ReactNode }) {
  if (icon === undefined || icon === null || typeof icon === "string") {
    return <i className={icon ?? ""} />;
  }
  return isValidElement(icon) ? icon : <>{icon}</>;
}
