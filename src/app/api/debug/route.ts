/**
 * Debug endpoint to test database operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getDatabase } from '@/lib/db-pool'

export async function GET(request: NextRequest) {
  const results: any = {
    directClient: null,
    poolClient: null,
    userTableTest: null,
    createUserTest: null,
  }

  try {
    console.log('Debug: Starting database tests...')

    // Test 1: Direct Prisma client
    console.log('Test 1: Direct Prisma client')
    try {
      const directClient = new PrismaClient()
      const directResult = await directClient.$queryRaw`SELECT 1 as direct_test`
      results.directClient = { success: true, result: directResult }
      console.log('Direct client success:', directResult)
      await directClient.$disconnect()
    } catch (directError) {
      results.directClient = {
        success: false,
        error: directError instanceof Error ? directError.message : 'Unknown error',
      }
      console.error('Direct client error:', directError)
    }

    // Test 2: Database pool
    console.log('Test 2: Database pool')
    try {
      const poolClient = await getDatabase()
      const poolResult = await poolClient.$queryRaw`SELECT 1 as pool_test`
      results.poolClient = { success: true, result: poolResult }
      console.log('Pool client success:', poolResult)
    } catch (poolError) {
      results.poolClient = {
        success: false,
        error: poolError instanceof Error ? poolError.message : 'Unknown error',
      }
      console.error('Pool client error:', poolError)
    }

    // Test 3: User table query
    console.log('Test 3: User table query')
    try {
      const poolClient = await getDatabase()
      const userCount = await poolClient.user.count()
      results.userTableTest = { success: true, userCount }
      console.log('User count:', userCount)
    } catch (userError) {
      results.userTableTest = {
        success: false,
        error: userError instanceof Error ? userError.message : 'Unknown error',
      }
      console.error('User query error:', userError)
    }

    // Test 4: Simulate user creation process
    console.log('Test 4: User creation simulation')
    try {
      const poolClient = await getDatabase()

      // Test if email already exists (should be safe to test)
      const testEmail = 'debug-test@example.com'
      const existingUser = await poolClient.user.findUnique({
        where: { email: testEmail },
      })

      results.createUserTest = {
        success: true,
        emailExists: !!existingUser,
        message: existingUser
          ? 'Test email already exists in database'
          : 'Test email not found - creation would be possible',
      }
      console.log('User creation test success:', results.createUserTest)
    } catch (createUserError) {
      results.createUserTest = {
        success: false,
        error: createUserError instanceof Error ? createUserError.message : 'Unknown error',
      }
      console.error('User creation test error:', createUserError)
    }

    return NextResponse.json({
      success: true,
      message: 'Debug tests completed',
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        results,
      },
      { status: 500 }
    )
  }
}
