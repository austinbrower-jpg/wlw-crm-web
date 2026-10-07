import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  basePath: process.env.RELAY_BASE_PATH ?? "",
  turbopack: { root: process.cwd() },
  images: { unoptimized: true },
  devIndicators: false,
};
export default config;
