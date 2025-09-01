/**
 * API Route: /api/settings/google-sheets/test
 * Tests Google Sheets connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { googleSheetsService } from '@/lib/google-sheets'

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const { serviceAccountKey, clientEmail, privateKey, method } = await request.json()

    // Temporarily set environment variables for testing
    const originalEnv = {
      GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    }

    try {
      // Set test credentials
      if (method === 'json' && serviceAccountKey) {
        // Validate JSON first
        JSON.parse(serviceAccountKey)
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY = serviceAccountKey
        delete process.env.GOOGLE_CLIENT_EMAIL
        delete process.env.GOOGLE_PRIVATE_KEY
      } else if (method === 'individual' && clientEmail && privateKey) {
        process.env.GOOGLE_CLIENT_EMAIL = clientEmail
        process.env.GOOGLE_PRIVATE_KEY = privateKey
        delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid configuration provided for testing' },
          { status: 400 }
        )
      }

      // Test the connection by creating a new service instance
      const { GoogleAuth } = await import('google-auth-library')
      
      let credentials
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
      } else {
        credentials = {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }
      }

      const auth = new GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ],
      })

      // Test authentication
      const authClient = await auth.getClient()
      
      // Try to get access token to verify credentials work
      const tokenResponse = await authClient.getAccessToken()
      
      if (!tokenResponse.token) {
        throw new Error('Failed to obtain access token')
      }

      // Additional check: Try to verify the service account
      let serviceAccountInfo = 'Unknown'
      try {
        const { google } = await import('googleapis')
        const service = google.serviceusage({ version: 'v1', auth: authClient })
        const projectId = credentials.project_id || credentials.client_email.split('@')[1].split('.')[0]
        serviceAccountInfo = `Project: ${projectId}`
      } catch (e) {
        // Service usage API might not be enabled, but that's OK for testing
        serviceAccountInfo = 'Service account valid (limited API access)'
      }

      return NextResponse.json({
        success: true,
        message: 'Google Sheets authentication successful! ✅',
        details: {
          method,
          clientEmail: credentials.client_email,
          hasToken: !!tokenResponse.token,
          serviceAccount: serviceAccountInfo,
          apiNote: 'Note: You may need to enable Google Sheets API in Cloud Console for full functionality'
        }
      })

    } finally {
      // Restore original environment variables
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = originalEnv.GOOGLE_SERVICE_ACCOUNT_KEY
      process.env.GOOGLE_CLIENT_EMAIL = originalEnv.GOOGLE_CLIENT_EMAIL
      process.env.GOOGLE_PRIVATE_KEY = originalEnv.GOOGLE_PRIVATE_KEY
    }

  } catch (error) {
    console.error('Google Sheets connection test failed:', error)
    
    let errorMessage = 'Connection test failed'
    if (error instanceof Error) {
      if (error.message.includes('JSON')) {
        errorMessage = 'Invalid JSON format in service account key'
      } else if (error.message.includes('client_email')) {
        errorMessage = 'Invalid client email in credentials'
      } else if (error.message.includes('private_key')) {
        errorMessage = 'Invalid private key in credentials'
      } else if (error.message.includes('access token')) {
        errorMessage = 'Failed to authenticate - check your credentials'
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    )
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'settings',
  action: 'write',
  requireAuth: true,
})

export { protectedPOST as POST }