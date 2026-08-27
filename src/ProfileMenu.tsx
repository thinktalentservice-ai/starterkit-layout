"use client";
import { useState } from "react";
import type { CSSProperties } from "react";

/**
 * Up to two initials from a display name.
 *
 * Tolerant on purpose: the name reaching this component is user-supplied data
 * from a consumer's own API, so `""`, `"  "` and `"Ada  Lovelace"` all have to
 * produce a string rather than throw or render "undefined". A naive
 * `name.split(" ").slice(0, 2).map((w) => w[0]).join("")` does neither.
 */
export function initialsFrom(name: string | undefined | null): string {
  return String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/** Cap on the email's CHARACTER count. `.il-profile-email` caps its pixel width. */
const MAX_EMAIL_LENGTH = 30;

const truncate = (value: string, max = MAX_EMAIL_LENGTH) =>
  value.length > max ? `${value.slice(0, max)}…` : value;

export interface ProfileMenuProps {
  /** Display name. Also the source of the initials when `initials` is absent. */
  name?: string;
  /** Shown under the name, truncated by character count and by width. */
  email?: string;
  /**
   * The user's photo.
   *
   * A plain URL — `https:`, `data:` or `blob:`. This package deliberately does
   * not fetch it: the reference host's photo endpoint requires a bearer token,
   * which an `<img src>` cannot send, so the consumer fetches the bytes itself
   * and hands over an object URL. Absent — or failing to load — means the
   * initials render.
   */
  photoSrc?: string | null;
  /**
   * Alt text for the photo. Empty by default — the name is rendered beside it,
   * so the image is decorative. Give it a real value in the one case where it
   * is not: a consumer supplying `initials` with no `name`.
   */
  photoAlt?: string;
  /** Overrides the initials derived from `name`. */
  initials?: string;
  /** Avatar diameter in px. Default 46. */
  size?: number;
  /** Where the logout control points. Nothing renders when absent. */
  logoutHref?: string;
  /** Logout label. Default "Logout". */
  logoutLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The identity block for the header's profile dropdown — photo or initials,
 * name, email, and a logout link.
 *
 * IT IS PURELY PRESENTATIONAL, and that is the whole extraction. The host's
 * copy read local storage in an effect, decrypted a session record, ran an
 * authenticated photo fetch through React Query and minted an object URL. None
 * of that can live in a shell package: it is one app's auth scheme. What CAN
 * live here is the part every consumer rewrote identically — the avatar/name/
 * email/logout layout and its scheme-aware colours.
 *
 * NO --dd-* TOKENS. That palette is fixed-light by design, which is right for a
 * dropdown painting its own white panel edge to edge and wrong here: this
 * renders on `.il-dd`, whose surface follows the colour scheme, so a
 * `--dd-panel-bg` slab would sit white inside every dark theme. `--il-t-fg1`,
 * `--il-t-fg2` and `--il-t-border` flip with the scheme.
 *
 * NO DEFAULT IDENTITY. An absent name renders empty, not "John Deo" — the
 * source shipped a placeholder name, a placeholder email and a bundled stock
 * portrait in the one place on the page whose entire job is to say who you are.
 */
export function ProfileMenu({
  name = "",
  email = "",
  photoSrc = null,
  photoAlt = "",
  initials,
  size = 46,
  logoutHref,
  logoutLabel = "Logout",
  className = "",
  style,
}: ProfileMenuProps) {
  const chars = initials ?? initialsFrom(name);
  const avatarStyle: CSSProperties = {
    width: size,
    height: size,
    fontSize: `${Math.round(size * 0.36)}px`,
  };

  /* Which src FAILED, not a boolean "it failed".
     A boolean has to be cleared by an effect when `photoSrc` changes, which is a
     second render and a hook that exists only to undo state. Storing the URL
     makes the retry fall out of the comparison: a new URL simply is not the
     failed one, so it is tried. This is what makes the documented "absent OR
     failed means initials" contract true — the host's photo endpoint 401s for
     any user with no photo on file, which is the NORMAL case, and a broken
     <img> where the initials belong is the failure it produces most often. */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(photoSrc) && photoSrc !== failedSrc;

  /* Decorative ONLY because the name is rendered as text right beside it — with
     no name, the initials are the sole identity on screen and hiding them puts
     nothing at all in the accessibility tree. `role="img"` is what makes the
     label announce on a span; it is the pattern S6819 flags, and it is correct
     exactly here, where the element carries meaning no other node repeats. */
  const chipIsDecorative = Boolean(name);

  return (
    <div className={`il-profile ${className}`.trim()} style={style}>
      <div className="il-profile-id">
        {showPhoto ? (
          /* A plain <img>, not next/image: this package is renderer-agnostic
             about the URL it is handed, and next/image cannot express a
             blob: src at all. */
          /* eslint-disable-next-line @next/next/no-img-element -- reasoning above */
          <img
            className="il-profile-avatar"
            src={photoSrc as string}
            alt={photoAlt}
            width={size}
            height={size}
            decoding="async"
            onError={() => setFailedSrc(photoSrc as string)}
            style={avatarStyle}
          />
        ) : (
          /* Initials, NOT a stock silhouette: one shipped portrait makes every
             photo-less account look like the same person. */
          <span
            className="il-profile-avatar il-profile-initials"
            aria-hidden={chipIsDecorative || undefined}
            role={chipIsDecorative ? undefined : "img"}
            aria-label={chipIsDecorative ? undefined : chars || undefined}
            style={avatarStyle}
          >
            {chars}
          </span>
        )}

        {/* `min-width: 0` on .il-profile-text is what makes the ellipsis work: a
            flex item floors at its content's intrinsic width, so an unbroken
            email widens the panel instead of truncating. */}
        <div className="il-profile-text">
          <span className="il-profile-name">{name}</span>
          {/* Two truncations doing different jobs — `truncate` caps the
              character count so a 200-character address never reaches the DOM,
              and the CSS caps the pixel width, which no character count can
              predict across fonts. `title` carries the full address. */}
          <span className="il-profile-email" title={email}>
            {truncate(email)}
          </span>
        </div>
      </div>

      {logoutHref && (
        <div className="il-profile-actions">
          <a className="il-profile-logout" href={logoutHref}>
            {logoutLabel}
          </a>
        </div>
      )}
    </div>
  );
}
