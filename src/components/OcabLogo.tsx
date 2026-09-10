"use client";

import { useState } from "react";

/**
 * Legg den ekte logoen som /public/icons/ocab-logo.svg, så brukes den automatisk.
 * Finnes den ikke, faller vi tilbake til et rent tekstmerke i Ocab-blå, slik
 * at appen aldri viser et ødelagt bilde.
 */
export default function OcabLogo({
  className = "",
  height = 28,
}: {
  className?: string;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/icons/ocab-logo.svg"
        alt="Ocab"
        height={height}
        style={{ height }}
        className={`w-auto dark:brightness-0 dark:invert ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-baseline font-extrabold tracking-[-0.04em] text-ocab-900 dark:text-white ${className}`}
      style={{ fontSize: height * 0.9, lineHeight: 1 }}
      aria-label="Ocab"
    >
      OCAB
      <span
        aria-hidden
        className="ml-1 inline-block bg-signal-500"
        style={{ width: height * 0.16, height: height * 0.16, borderRadius: 2 }}
      />
    </span>
  );
}