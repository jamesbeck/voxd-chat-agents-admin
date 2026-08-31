import type { NextConfig } from "next";
import { adminRoutePrefixes } from "./lib/adminRoutes";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["knex"],
  images: {
    remotePatterns: [
      new URL("https://s3.eu-west-1.wasabisys.com/voxd/**"),
      new URL("https://voxd.s3.eu-west-1.wasabisys.com/**"),
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // cacheComponents: true,
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/",
        permanent: true,
      },
      {
        source: "/admin/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: adminRoutePrefixes.map((prefix) => ({
        source: `${prefix}/:path*`,
        destination: `/admin${prefix}/:path*`,
      })),
    };
  },
  async headers() {
    return [
      {
        // Allow iframe embedding for /iframes/* routes
        source: "/iframes/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
      {
        // Prevent iframe embedding for all other routes
        source: "/((?!iframes).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
