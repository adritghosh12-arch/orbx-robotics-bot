/** @type {import('next').NextConfig} */
// Vercel deployment fix - updated 2026-05-15
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  // Optimize for Vercel deployment
  experimental: {
    // Enable app directory features if needed
    serverComponentsExternalPackages: ['pg'],
  },
  // Webpack configuration for better Vercel compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle database packages on the client
      config.externals.push('pg', 'pg-native');
    }
    return config;
  },
  // Output standalone for better performance
  output: 'standalone',
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
