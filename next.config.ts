import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.yummytummyaarthi.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "www.liveeatlearn.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "eastindianrecipes.net",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "media.foodiaq.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;