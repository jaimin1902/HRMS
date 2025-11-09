import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable strict route checking if it's causing false positives
  experimental: {
    // This might help with route group detection
  },
};

export default nextConfig;
