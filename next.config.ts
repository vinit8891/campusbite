import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://api.razorpay.com",
      "connect-src 'self' https://api.razorpay.com https://*.onrender.com https://campusbite-backend123.onrender.com",
      "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
      "img-src 'self' data: blob: https: http:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
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
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/restaurant-owner/:path*",
        destination: "/restaurant/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;