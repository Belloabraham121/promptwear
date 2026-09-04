import type { NextConfig } from "next";

/**
 * When the browser is on HTTPS (Vercel) but the API is HTTP (Coolify),
 * rewrite same-origin /api/v1 → the HTTP backend so mixed content is avoided.
 *
 * Vercel env:
 *   NEXT_PUBLIC_API_URL=/api/v1
 *   API_PROXY_TARGET=http://your-coolify-host  (no /api/v1 suffix)
 */
const apiProxyTarget = process.env.API_PROXY_TARGET?.trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["fabric"],
  async rewrites() {
    if (!apiProxyTarget) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
