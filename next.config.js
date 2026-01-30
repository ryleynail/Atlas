/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Opt in to the new app router directory ("/app").
    appDir: true,
  },
  images: {
    // Allow serving Mapbox and other external domain images if needed.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;