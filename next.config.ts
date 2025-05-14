import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [new URL('https://example.com/**'), new URL('https://img.clerk.com/**'), new URL('https://picsum.photos/**')],
  },
};

export default nextConfig;
