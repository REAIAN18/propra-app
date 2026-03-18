import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type checking is done separately via `tsc --noEmit`; skip during build to prevent hangs
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint is run separately; skip during build
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    // Disable persistent filesystem cache to avoid filling disk on space-constrained machines
    config.cache = false;
    return config;
  },
};

export default nextConfig;
