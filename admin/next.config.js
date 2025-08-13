/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'xxaqztdwdjgrkdyfnjvr.supabase.co', // Supabase storage domain
      'smart-queue-admin.vercel.app', // Your admin domain
      'smart-queue-customer.vercel.app' // Your customer domain  
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },

  // Output configuration for static export if needed
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Add headers for better caching control
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        // Apply cache control to static assets
        source: '/(.*)\\.(ico|png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  // Only disable caching for static chunks during development
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config, { dev }) => {
      if (dev) {
        config.cache = false;
      }
      return config;
    },
  }),
}

module.exports = nextConfig
