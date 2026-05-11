import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile all @cognitive-forge/* workspace packages so Next.js can
  // process their TypeScript source directly (no pre-build step required).
  transpilePackages: [
    "@cognitive-forge/core",
    "@cognitive-forge/casepack",
    "@cognitive-forge/domain-packs",
    "@cognitive-forge/runtime",
    "@cognitive-forge/bridge",
    "@cognitive-forge/ui-forge",
    "@cognitive-forge/validation",
  ],
};

export default nextConfig;
