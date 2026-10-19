import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  experimental: { serverActions: { bodySizeLimit: "50mb" } },
  // pg loads pg-cloudflare only on Workers, so Next's file tracing misses it.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pg-cloudflare/**/*"],
  },
};

export default nextConfig;
