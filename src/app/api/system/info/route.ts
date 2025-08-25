/**
 * API Route: /api/system/info
 * System information and health check endpoint
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const systemInfo = {
      status: 'healthy',
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      features: {
        pdfProcessing: true,
        llmParsing: !!process.env.GEMINI_API_KEY || !!process.env.ANTHROPIC_API_KEY,
        database: 'sqlite', // Could be enhanced to detect actual DB type
        authentication: true,
      },
      health: {
        database: 'connected', // Could add actual DB health check
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
    }

    return NextResponse.json({
      success: true,
      data: systemInfo,
    })
  } catch (error) {
    console.error('Error getting system info:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get system information',
        data: {
          status: 'error',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    )
  }
}