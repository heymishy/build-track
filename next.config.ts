import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even if there are TypeScript errors
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Handle canvas for react-pdf
    if (isServer) {
      config.resolve.alias.canvas = false
    }
    
    // Handle pdfjs-dist worker
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js',
    }
    
    return config
  },
  // Disable static optimization for pages that use browser-only features
  experimental: {
    esmExternals: 'loose',
  },
}

export default nextConfig
