import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  turbopack: { root: process.cwd() },
  images: { unoptimized: true },
  devIndicators: false,
};
export default config;
