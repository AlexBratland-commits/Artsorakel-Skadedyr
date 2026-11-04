import type { NextConfig } from "next";

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
};

export default nextConfig;
