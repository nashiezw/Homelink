import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "houselink.co.zw" }],
        destination: "https://www.houselink.co.zw/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "homelinkzim.co.zw" }],
        destination: "https://www.houselink.co.zw/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.homelinkzim.co.zw" }],
        destination: "https://www.houselink.co.zw/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "homelink-zimbabwe-7lplsgomb-homelink1.vercel.app" }],
        destination: "https://www.houselink.co.zw/:path*",
        permanent: true,
      },
    ];
  },
  outputFileTracingIncludes: {
    "/api/v1/academy/files/[...path]": ["./public/uploads/academy/**/*"],
    "/api/v1/academy/documents/[id]/download": ["./public/uploads/academy/**/*"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
