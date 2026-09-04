import type { NextConfig } from "next";

/**
 * When the browser is on HTTPS (Vercel) but the API is HTTP (Coolify),
 * rewrite same-origin /api/v1 → the HTTP backend so mixed content is avoided.
 *
 * - Explicit API_PROXY_TARGET always wins.
 * - Otherwise only Vercel production uses the Coolify default (not previews/forks).
 * - Local / preview: set API_PROXY_TARGET yourself, or use NEXT_PUBLIC_API_URL
 *   pointing at localhost (no rewrite needed).
 */
const DEFAULT_API_PROXY_TARGET =
  "http://ycfqy2f20ak12p32hyc32t6n.80.241.213.233.sslip.io";

const apiProxyTarget = (
  process.env.API_PROXY_TARGET?.trim() ||
  (process.env.VERCEL_ENV === "production" ? DEFAULT_API_PROXY_TARGET : "")
).replace(/\/+$/, "");

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
