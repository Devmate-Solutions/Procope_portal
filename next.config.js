/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,

  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript checking during build (optional)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Webpack configuration for handling specific module imports
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false
    };
    return config;
  },

  // Experimental features (optional)
  experimental: {
    // Add any experimental features if needed
  }
}

module.exports = nextConfig 