import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));
const canonicalAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://app.ship365.co";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typedRoutes: true,
  outputFileTracingRoot: workspaceRoot,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "ship365.co" }],
        destination: `${canonicalAppUrl}/:path*`,
        permanent: false
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.ship365.co" }],
        destination: `${canonicalAppUrl}/:path*`,
        permanent: false
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "dispatcher365-production.up.railway.app" }],
        destination: `${canonicalAppUrl}/:path*`,
        permanent: false
      }
    ];
  }
};

export default nextConfig;
