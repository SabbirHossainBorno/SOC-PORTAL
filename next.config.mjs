/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Remove user_dp cache headers since we're serving via API now
        source: '/storage/((?!user_dp).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Add cache control for API storage routes
        source: '/api/storage/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
  images: {
    domains: ['localhost', '167.88.38.114'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '167.88.38.114',
        port: '5001',
        pathname: '/api/storage/**', // Updated path
      },
    ],
    unoptimized: true,
  },
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;