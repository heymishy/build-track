/**
 * Debug endpoint to test database operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getDatabase } from '@/lib/db-pool'

export async function GET(request: NextRequest) {
  try {
    console.log('Debug: Starting database tests...')
    
    // Test 1: Direct Prisma client
    console.log('Test 1: Direct Prisma client')
    const directClient = new PrismaClient()
    try {
      const directResult = await directClient.$queryRaw`SELECT 1 as direct_test`
      console.log('Direct client success:', directResult)
      await directClient.$disconnect()
    } catch (directError) {
      console.error('Direct client error:', directError)
    }

    // Test 2: Database pool
    console.log('Test 2: Database pool')
    try {
      const poolClient = await getDatabase()
      const poolResult = await poolClient.$queryRaw`SELECT 1 as pool_test`
      console.log('Pool client success:', poolResult)
    } catch (poolError) {
      console.error('Pool client error:', poolError)
    }

    // Test 3: User table query
    console.log('Test 3: User table query')
    try {
      const poolClient = await getDatabase()
      const userCount = await poolClient.user.count()
      console.log('User count:', userCount)
    } catch (userError) {
      console.error('User query error:', userError)
    }

    return NextResponse.json({
      success: true,
      message: 'Debug tests completed - check server logs',
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}