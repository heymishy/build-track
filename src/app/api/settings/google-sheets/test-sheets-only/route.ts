/**
 * API Route: /api/settings/google-sheets/test-sheets-only
 * Test creating spreadsheet using only Sheets API (no Drive API)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'

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

      const { GoogleAuth } = await import('google-auth-library')
      const { google } = await import('googleapis')
      
      let credentials
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
      } else {
        credentials = {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }
      }

      // Test with ONLY Sheets API scope
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      })

      const authClient = await auth.getClient()
      const sheets = google.sheets({ version: 'v4', auth: authClient })

      try {
        // Try to create spreadsheet using ONLY Sheets API
        console.log('Attempting to create spreadsheet with Sheets API only...')
        
        const response = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: 'BuildTrack Sheets-Only Test - Safe to Delete'
            }
          }
        })

        const spreadsheetId = response.data.spreadsheetId
        console.log('Spreadsheet created successfully:', spreadsheetId)

        // Try to clean up using Sheets API
        try {
          // We can't delete via Sheets API, but we can clear it
          await sheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheetId!,
            range: 'A:Z'
          })
          console.log('Spreadsheet cleared (cannot delete via Sheets API)')
        } catch (cleanupError) {
          console.log('Cleanup failed (expected):', cleanupError)
        }

        return NextResponse.json({
          success: true,
          message: 'Sheets API works! Spreadsheet creation successful ✅',
          details: {
            spreadsheetId,
            method,
            clientEmail: credentials.client_email,
            apiUsed: 'Sheets API only',
            note: 'Drive API might not be needed for basic functionality',
            url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
          }
        })

      } catch (sheetsError: any) {
        console.error('Sheets API error:', sheetsError)
        
        return NextResponse.json({
          success: false,
          error: 'Sheets API failed even with minimal scope',
          details: {
            method,
            clientEmail: credentials.client_email,
            errorCode: sheetsError.code,
            errorMessage: sheetsError.message,
            suggestion: sheetsError.code === 403 ? 'Billing account or organization policy issue' : 'API configuration issue'
          }
        })
      }

    } finally {
      // Restore original environment variables
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = originalEnv.GOOGLE_SERVICE_ACCOUNT_KEY
      process.env.GOOGLE_CLIENT_EMAIL = originalEnv.GOOGLE_CLIENT_EMAIL
      process.env.GOOGLE_PRIVATE_KEY = originalEnv.GOOGLE_PRIVATE_KEY
    }

  } catch (error) {
    console.error('Sheets-only test failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed to run',
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