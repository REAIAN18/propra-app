import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Type checking is done separately via `tsc --noEmit`; skip during build to prevent hangs
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint is run separately; skip during build
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Wave T — bundle the appraisal xlsx templates into the Excel export
  // serverless function so populate-excel.ts can read them at runtime.
  outputFileTracingIncludes: {
    "/api/dealscope/properties/[id]/export/excel": [
      "./src/lib/dealscope/exports/templates/**/*",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  webpack(config) {
    // Disable persistent filesystem cache to avoid filling disk on space-constrained machines
    config.cache = false;
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: "realhq",
  project: "realhq-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
