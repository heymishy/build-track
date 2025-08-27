/**
 * Database Migration API Endpoint
 * Only run this ONCE to set up the database schema
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL,
    },
  },
})

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in production with a secret key
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.MIGRATION_SECRET || 'migration-secret-key'

    if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting database migration...')

    // Test basic connection first
    console.log('Testing database connection...')
    await prisma.$connect()
    console.log('Database connection successful')

    // Run a simple test query
    console.log('Running test query...')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('Test query successful:', result)

    // Check if tables exist
    console.log('Checking existing tables...')
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log('Existing tables:', tables)

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      tables,
      test_query: result,
    })
  } catch (error) {
    console.error('Migration failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
