import type { NextConfig } from "next";

/**
 * Same-origin /api/v1 rewrite → Coolify API (avoids browser mixed-content issues).
 *
 * - Explicit API_PROXY_TARGET always wins.
 * - Otherwise only Vercel production uses the default (not previews/forks).
 * - Local: use NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
 */
const DEFAULT_API_PROXY_TARGET =
  "https://ycfqy2f20ak12p32hyc32t6n.locimind.org";

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
