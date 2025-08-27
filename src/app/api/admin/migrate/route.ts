/**
 * Database Migration API Endpoint
 * Only run this ONCE to set up the database schema
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Simple Prisma instance for migration
const prisma = new PrismaClient()

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

    // If no tables exist, run the migration
    if (Array.isArray(tables) && tables.length === 0) {
      console.log('No tables found, running database migration...')
      
      // Import the database migration logic
      const { execSync } = require('child_process')
      
      try {
        // Run prisma db push to create all tables
        console.log('Running prisma db push...')
        execSync('npx prisma db push --accept-data-loss', { 
          stdio: 'pipe',
          env: process.env,
          timeout: 30000 // 30 second timeout
        })
        
        // Check tables again
        const newTables = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `
        
        console.log('Migration completed, new tables:', newTables)
        
        return NextResponse.json({
          success: true,
          message: 'Database migration completed successfully',
          tables_before: tables,
          tables_after: newTables,
          test_query: result,
        })
        
      } catch (migrationError) {
        console.error('Migration failed:', migrationError)
        return NextResponse.json({
          success: false,
          error: 'Database migration failed',
          migration_error: migrationError instanceof Error ? migrationError.message : String(migrationError),
          tables,
          test_query: result,
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful - tables already exist',
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
