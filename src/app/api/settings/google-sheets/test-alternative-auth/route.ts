/**
 * API Route: /api/settings/google-sheets/test-alternative-auth
 * Test Google Sheets with alternative authentication methods
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const { serviceAccountKey, clientEmail, privateKey, method } = await request.json()

    // Store original env
    const originalEnv = {
      GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    }

    const testResults = []

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
      }

      const { GoogleAuth } = await import('google-auth-library')
      const { google } = await import('googleapis')

      let credentials: any
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
      } else {
        credentials = {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          type: 'service_account',
        }
      }

      // Test 1: Try with explicit project ID
      try {
        console.log('Test 1: Explicit project ID approach')

        const auth = new GoogleAuth({
          credentials,
          projectId: credentials.project_id || 'plucky-hue-452808-s5',
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })

        const authClient = await auth.getClient()
        const sheets = google.sheets({ version: 'v4', auth: authClient })

        const testSpreadsheet = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: 'BuildTrack Test 1 - Explicit ProjectId',
            },
          },
        })

        // Clean up
        if (testSpreadsheet.data.spreadsheetId) {
          const drive = google.drive({ version: 'v3', auth: authClient })
          await drive.files.delete({ fileId: testSpreadsheet.data.spreadsheetId })
        }

        testResults.push({
          test: 'Explicit Project ID',
          status: 'SUCCESS',
          spreadsheetId: testSpreadsheet.data.spreadsheetId,
        })
      } catch (error: any) {
        testResults.push({
          test: 'Explicit Project ID',
          status: 'FAILED',
          error: error.message,
          code: error.code,
        })
      }

      // Test 2: Try with quota project
      try {
        console.log('Test 2: Quota project approach')

        const auth = new GoogleAuth({
          credentials,
          quotaProjectId: credentials.project_id || 'plucky-hue-452808-s5',
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })

        const authClient = await auth.getClient()
        const sheets = google.sheets({ version: 'v4', auth: authClient })

        const testSpreadsheet = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: 'BuildTrack Test 2 - Quota Project',
            },
          },
        })

        // Clean up
        if (testSpreadsheet.data.spreadsheetId) {
          const drive = google.drive({ version: 'v3', auth: authClient })
          await drive.files.delete({ fileId: testSpreadsheet.data.spreadsheetId })
        }

        testResults.push({
          test: 'Quota Project ID',
          status: 'SUCCESS',
          spreadsheetId: testSpreadsheet.data.spreadsheetId,
        })
      } catch (error: any) {
        testResults.push({
          test: 'Quota Project ID',
          status: 'FAILED',
          error: error.message,
          code: error.code,
        })
      }

      // Test 3: Try with cloud-platform scope (very broad)
      try {
        console.log('Test 3: Cloud platform scope')

        const auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        })

        const authClient = await auth.getClient()
        const sheets = google.sheets({ version: 'v4', auth: authClient })

        const testSpreadsheet = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: 'BuildTrack Test 3 - Cloud Platform Scope',
            },
          },
        })

        // Clean up
        if (testSpreadsheet.data.spreadsheetId) {
          const drive = google.drive({ version: 'v3', auth: authClient })
          await drive.files.delete({ fileId: testSpreadsheet.data.spreadsheetId })
        }

        testResults.push({
          test: 'Cloud Platform Scope',
          status: 'SUCCESS',
          spreadsheetId: testSpreadsheet.data.spreadsheetId,
        })
      } catch (error: any) {
        testResults.push({
          test: 'Cloud Platform Scope',
          status: 'FAILED',
          error: error.message,
          code: error.code,
        })
      }

      // Test 4: Try minimal approach with different auth config
      try {
        console.log('Test 4: Minimal auth config')

        const authClient = new google.auth.JWT(
          credentials.client_email,
          undefined,
          credentials.private_key,
          ['https://www.googleapis.com/auth/spreadsheets'],
          undefined,
          credentials.project_id || 'plucky-hue-452808-s5'
        )

        await authClient.authorize()

        const sheets = google.sheets({ version: 'v4', auth: authClient })

        const testSpreadsheet = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: 'BuildTrack Test 4 - JWT Direct',
            },
          },
        })

        // Clean up
        if (testSpreadsheet.data.spreadsheetId) {
          const drive = google.drive({ version: 'v3', auth: authClient })
          await drive.files.delete({ fileId: testSpreadsheet.data.spreadsheetId })
        }

        testResults.push({
          test: 'JWT Direct Auth',
          status: 'SUCCESS',
          spreadsheetId: testSpreadsheet.data.spreadsheetId,
        })
      } catch (error: any) {
        testResults.push({
          test: 'JWT Direct Auth',
          status: 'FAILED',
          error: error.message,
          code: error.code,
        })
      }

      const successCount = testResults.filter(r => r.status === 'SUCCESS').length
      const failureCount = testResults.filter(r => r.status === 'FAILED').length

      return NextResponse.json({
        success: successCount > 0,
        message: `Alternative auth tests: ${successCount} successful, ${failureCount} failed`,
        results: testResults,
        recommendation:
          successCount > 0
            ? 'At least one authentication method worked! Check results for working approach.'
            : 'All authentication methods failed. This suggests organization policy restrictions or API quotas.',
        details: {
          projectId: credentials.project_id,
          clientEmail: credentials.client_email,
          successfulMethods: testResults.filter(r => r.status === 'SUCCESS').map(r => r.test),
        },
      })
    } finally {
      // Restore original environment variables
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = originalEnv.GOOGLE_SERVICE_ACCOUNT_KEY
      process.env.GOOGLE_CLIENT_EMAIL = originalEnv.GOOGLE_CLIENT_EMAIL
      process.env.GOOGLE_PRIVATE_KEY = originalEnv.GOOGLE_PRIVATE_KEY
    }
  } catch (error) {
    console.error('Alternative auth test failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Alternative auth test failed to run',
        details: error instanceof Error ? error.message : 'Unknown error',
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
