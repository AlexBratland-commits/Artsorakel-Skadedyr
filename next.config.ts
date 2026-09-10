import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    '192.168.10.68',
    '*.local-ip.co'
  ],
};

export default nextConfig;