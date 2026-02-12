import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  reactStrictMode: true,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    unoptimized: true,
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Experimental performance features
  experimental: {
    optimizeCss: true,
  },

  // Proxy /api requests to the Go backend
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
