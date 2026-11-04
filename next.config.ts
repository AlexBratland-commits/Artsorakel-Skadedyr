import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const paVercel = process.env.VERCEL === "1";

/**
 * Sikkerhetsheadere (S9). CSP følger Next.js' oppskrift «uten nonce»
 * (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md):
 * 'unsafe-inline' for skript trengs fordi Next.js og temaskriptet i
 * layout.tsx bruker innebygde skript. CSP-en hindrer likevel at skript,
 * bilder og forbindelser hentes fra andre domener, og at siden rammes inn.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(paVercel ? ["upgrade-insecure-requests"] : []),
].join("; ");

const sikkerhetsheadere = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Kamera tillates for appen selv (bilde tas via filvelgeren); resten slås av.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(paVercel ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
  // Et internt verktøy med tilgangskode skal ikke vises i søkemotorer.
  ...(process.env.ARTSORAKEL_TILGANGSKODE ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    '192.168.10.68',
    '*.local-ip.co'
  ],
  // Skjul at appen er laget med Next.js (S9).
  poweredByHeader: false,
  // Appen bruker ikke next/image. Slår av bildeoptimaliseringen
  // (/_next/image), som har hatt flere kjente sårbarheter (S2).
  images: { unoptimized: true },
  async headers() {
    return [
      { source: "/(.*)", headers: sikkerhetsheadere },
      // API-svar skal aldri mellomlagres av nettleser eller CDN.
      { source: "/api/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
