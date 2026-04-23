import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "abs.twimg.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack: (config) => {
    // Required for @solana/web3.js and Light Protocol in Next.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
