import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "auto",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    '.space.chatglm.site',
    '.space.z.ai',
  ],
};

export default nextConfig;
