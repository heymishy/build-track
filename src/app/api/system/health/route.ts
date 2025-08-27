/**
 * System Health Check API
 * Provides comprehensive health status for monitoring and alerting
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMonitoring } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    const monitoring = getMonitoring()
    const health = await monitoring.checkSystemHealth()

    // Determine HTTP status based on system health
    const statusCode =
      {
        healthy: 200,
        degraded: 200, // Still operational
        unhealthy: 503, // Service unavailable
      }[health.status] || 500

    return NextResponse.json(
      {
        success: true,
        ...health,
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        buildTime: process.env.BUILD_TIME || new Date().toISOString(),
        nodeVersion: process.version,
      },
      {
        status: statusCode,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (error) {
    console.error('[Health] Health check failed:', error)

    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: Date.now(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  }
}
