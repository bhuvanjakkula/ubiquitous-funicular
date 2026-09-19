import type { NextConfig } from "next";
const config: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  serverExternalPackages: ["pdfkit", "fontkit", "iconv-lite", "restructure"],
};
export default config;
