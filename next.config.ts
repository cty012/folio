import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.FOLIO_MODE === "cms" ? {} : { output: "export" }),
  // CMS routes are never part of the static route tree or client bundles.
  pageExtensions: process.env.FOLIO_MODE === "cms"
    ? ["cms.tsx", "cms.ts"]
    : ["public.tsx"],
  distDir: process.env.FOLIO_DIST_DIR || (process.env.FOLIO_MODE === "cms" ? ".next-cms" : ".next"),
  trailingSlash: true,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
