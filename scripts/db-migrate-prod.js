#!/usr/bin/env node

/**
 * Production Database Migration Script
 * Safely migrates the database schema to production
 */

const { execSync } = require('child_process')

console.log('🗄️ BuildTrack Production Database Migration\n')

if (!process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL) {
  console.error('❌ Error: No database URL found!')
  console.error('Make sure DATABASE_URL or POSTGRES_PRISMA_URL is set in your environment.')
  console.error("If using Vercel PostgreSQL, make sure it's connected to your project.")
  process.exit(1)
}

const databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL

console.log('📊 Database URL configured:', databaseUrl ? '✅ Yes' : '❌ No')
console.log('🏗️ Running Prisma migrations...\n')

try {
  // Generate Prisma client
  console.log('1. Generating Prisma client...')
  execSync('npx prisma generate', { stdio: 'inherit' })

  // Push database schema
  console.log('\n2. Pushing database schema...')
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  })

  console.log('\n✅ Database migration completed successfully!')
  console.log('\n🧪 Test your database connection:')
  console.log('   https://build-track-omega.vercel.app/api/health/database')
} catch (error) {
  console.error('\n❌ Migration failed:', error.message)
  console.error('\nTroubleshooting:')
  console.error('1. Make sure your DATABASE_URL is correct')
  console.error('2. Check that your database is accessible')
  console.error('3. Verify your database permissions')
  process.exit(1)
}
