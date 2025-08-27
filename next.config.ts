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
  // Performance Optimizations
  experimental: {
    // Enable modern build features
    optimizePackageImports: ['@headlessui/react', 'lucide-react', 'date-fns'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  // Compression and optimization
  compress: true,
  poweredByHeader: false,
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Static assets caching
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API routes headers for performance
      {
        source: '/api/(.*)',
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
      // Security headers for all routes
      {
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
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  // Bundle analysis and optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Handle canvas for react-pdf
    if (isServer) {
      config.resolve.alias.canvas = false
    }

    // Handle pdfjs-dist worker
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js',
    }

    // Service worker handling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }

    // Performance optimizations
    if (!dev && !isServer) {
      // Split vendor chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              chunks: 'all',
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              chunks: 'all',
              reuseExistingChunk: true,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 20,
              chunks: 'all',
            },
            ui: {
              test: /[\\/]node_modules[\\/](@headlessui|lucide-react)[\\/]/,
              name: 'ui',
              priority: 15,
              chunks: 'all',
            },
          },
        },
      }

      // Bundle analyzer (only in production with ANALYZE=true)
      if (process.env.ANALYZE === 'true') {
        const BundleAnalyzerPlugin = require('@next/bundle-analyzer')({
          enabled: true,
        })
        config.plugins.push(BundleAnalyzerPlugin)
      }
    }

    // Progress plugin for better build feedback
    if (!dev) {
      config.plugins.push(
        new webpack.ProgressPlugin((percentage, message, ...args) => {
          if (percentage === 1) {
            console.log('✅ Webpack build completed')
          }
        })
      )
    }

    return config
  },

  // Environment variables for performance
  env: {
    PERFORMANCE_MONITORING: process.env.NODE_ENV === 'production' ? 'true' : 'false',
    BUNDLE_ANALYZE: process.env.ANALYZE || 'false',
  },

  // Output configuration
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Generate static exports for better performance (if needed)
  // trailingSlash: true,
  // generateBuildId: async () => {
  //   return `build-${Date.now()}`
  // },
}

export default nextConfig
