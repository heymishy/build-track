/**
 * Database Health Check API
 * Quick endpoint to test database connectivity
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db-pool'

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    
    // Test basic database connectivity
    const result = await db.$queryRaw`SELECT 1 as connected`
    
    // Test if User table exists and is accessible
    const userCount = await db.user.count()
    
    return NextResponse.json({
      success: true,
      status: 'healthy',
      connection: !!result,
      userTableExists: true,
      userCount,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    }, { status: 200 })
    
  } catch (error) {
    console.error('[Health] Database check failed:', error)
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: Date.now(),
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    }, { status: 500 })
  }
}