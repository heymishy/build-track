/**
 * Simple deployment test endpoint
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: '🚀 DEPLOYMENT TEST: Enhanced logging is LIVE',
    timestamp: new Date().toISOString(),
    commit: 'de4d79b', // Latest commit with enhanced logging
  })
}
