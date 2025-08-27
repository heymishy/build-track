#!/usr/bin/env node

/**
 * Production Setup Script
 * Helps verify and set up production environment
 */

const requiredEnvVars = {
  DATABASE_URL: 'PostgreSQL connection string (should be auto-configured by Vercel)',
  JWT_SECRET: 'Secure random string for JWT token signing (generate with: openssl rand -base64 32)',
  NEXTAUTH_SECRET: 'Secure random string for NextAuth (generate with: openssl rand -base64 32)',
  NEXTAUTH_URL: 'Your production URL (https://build-track-omega.vercel.app)',
}

const optionalEnvVars = {
  GEMINI_API_KEY: 'Google Gemini API key for LLM features (optional)',
  ANTHROPIC_API_KEY: 'Anthropic API key as fallback LLM (optional)',
  ERROR_WEBHOOK_URL: 'Slack webhook URL for error notifications (optional)',
  ADMIN_EMAIL: 'Admin email for notifications (optional)',
}

console.log('🚀 BuildTrack Production Setup Guide\n')

console.log('📋 Required Environment Variables:')
Object.entries(requiredEnvVars).forEach(([key, description]) => {
  console.log(`  ${key}: ${description}`)
})

console.log('\n🔧 Optional Environment Variables:')
Object.entries(optionalEnvVars).forEach(([key, description]) => {
  console.log(`  ${key}: ${description}`)
})

console.log('\n🔑 To generate secure secrets, run:')
console.log('  openssl rand -base64 32')
console.log('  # Run this twice to get JWT_SECRET and NEXTAUTH_SECRET')

console.log('\n📝 Steps after setting up Vercel PostgreSQL:')
console.log(
  '  1. Add the environment variables above in Vercel Dashboard → Settings → Environment Variables'
)
console.log('  2. Redeploy your app to apply the new variables')
console.log('  3. Run database migration: npm run db:migrate:prod')
console.log('  4. Test with: https://build-track-omega.vercel.app/api/health/database')

console.log('\n✅ Once complete, try registering a user again!')
