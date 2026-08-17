import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-scripts.com https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' *.googleapis.com",
  "img-src 'self' data: blob: *.unsplash.com *.cloudinary.com https://www.facebook.com https://*.facebook.com https://www.googletagmanager.com https://www.google-analytics.com https://stats.g.doubleclick.net",
  "media-src 'self' data: blob: *.cloudinary.com",
  "font-src 'self' *.googleapis.com *.gstatic.com",
  "connect-src 'self' *.vercel.app *.houselink.co.zw https://www.facebook.com https://*.facebook.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com",
  "frame-src 'self' *.youtube.com *.vimeo.com",
].join("; ");

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
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/marketing/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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
        has: [{ type: "host", value: "houselinkzim.co.zw" }],
        destination: "https://www.houselink.co.zw/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.houselinkzim.co.zw" }],
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
    "/api/v1/library/downloads/[id]": ["./public/uploads/**/*"],
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
