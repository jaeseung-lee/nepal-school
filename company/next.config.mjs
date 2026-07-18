import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repository root has a small package only for Husky. Keep Next's file
  // tracing rooted at this application so the two lockfiles are unambiguous.
  outputFileTracingRoot: fileURLToPath(new URL("./", import.meta.url)),
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "company-iota-murex.vercel.app" }],
        destination: "https://www.joongwoohrd.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "joongwoohrd.com" }],
        destination: "https://www.joongwoohrd.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/downloads/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, noarchive, nosnippet" },
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
