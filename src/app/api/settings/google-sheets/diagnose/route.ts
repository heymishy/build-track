/**
 * API Route: /api/settings/google-sheets/diagnose
 * Comprehensive Google Sheets diagnostic tool
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

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      method,
      tests: [],
      summary: { passed: 0, failed: 0, warnings: 0 }
    }

    try {
      // Set test credentials
      if (method === 'json' && serviceAccountKey) {
        const parsed = JSON.parse(serviceAccountKey)
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY = serviceAccountKey
        delete process.env.GOOGLE_CLIENT_EMAIL
        delete process.env.GOOGLE_PRIVATE_KEY
        
        diagnostics.serviceAccount = {
          email: parsed.client_email,
          projectId: parsed.project_id,
          keyId: parsed.private_key_id?.substring(0, 8) + '...',
          type: parsed.type
        }
      } else if (method === 'individual' && clientEmail && privateKey) {
        process.env.GOOGLE_CLIENT_EMAIL = clientEmail
        process.env.GOOGLE_PRIVATE_KEY = privateKey
        delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
        
        const projectId = clientEmail.split('@')[1].split('.')[0]
        diagnostics.serviceAccount = {
          email: clientEmail,
          projectId: projectId,
          keyId: 'individual',
          type: 'service_account'
        }
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
          project_id: process.env.GOOGLE_CLIENT_EMAIL?.split('@')[1].split('.')[0]
        }
      }

      // Test 1: Basic Authentication
      try {
        const auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        })
        const authClient = await auth.getClient()
        const tokenResponse = await authClient.getAccessToken()
        
        diagnostics.tests.push({
          name: 'Basic Authentication',
          status: 'PASS',
          details: {
            hasToken: !!tokenResponse.token,
            tokenType: tokenResponse.token ? 'Bearer' : 'None'
          }
        })
        diagnostics.summary.passed++
      } catch (error: any) {
        diagnostics.tests.push({
          name: 'Basic Authentication',
          status: 'FAIL',
          error: error.message,
          details: { step: 'token_acquisition' }
        })
        diagnostics.summary.failed++
      }

      // Test 2: Project Info
      try {
        const auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        })
        const authClient = await auth.getClient()
        
        const cloudresourcemanager = google.cloudresourcemanager({ version: 'v1', auth: authClient })
        const projectInfo = await cloudresourcemanager.projects.get({
          projectId: credentials.project_id
        })
        
        diagnostics.tests.push({
          name: 'Project Access',
          status: 'PASS',
          details: {
            projectId: projectInfo.data.projectId,
            projectName: projectInfo.data.name,
            projectNumber: projectInfo.data.projectNumber,
            lifecycleState: projectInfo.data.lifecycleState
          }
        })
        diagnostics.summary.passed++
      } catch (error: any) {
        diagnostics.tests.push({
          name: 'Project Access',
          status: 'FAIL',
          error: error.message,
          details: { 
            attempted_project: credentials.project_id,
            suggestion: 'Service account might be from different project'
          }
        })
        diagnostics.summary.failed++
      }

      // Test 3: API Enablement Check
      try {
        const auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/service.management.readonly']
        })
        const authClient = await auth.getClient()
        
        const serviceusage = google.serviceusage({ version: 'v1', auth: authClient })
        
        const requiredApis = [
          'sheets.googleapis.com',
          'drive.googleapis.com'
        ]
        
        const apiStatus = []
        for (const api of requiredApis) {
          try {
            const service = await serviceusage.projects.services.get({
              name: `projects/${credentials.project_id}/services/${api}`
            })
            apiStatus.push({
              api,
              enabled: service.data.state === 'ENABLED',
              state: service.data.state
            })
          } catch (apiError: any) {
            apiStatus.push({
              api,
              enabled: false,
              error: apiError.message
            })
          }
        }
        
        const allEnabled = apiStatus.every(api => api.enabled)
        diagnostics.tests.push({
          name: 'API Enablement',
          status: allEnabled ? 'PASS' : 'FAIL',
          details: { apis: apiStatus }
        })
        
        if (allEnabled) {
          diagnostics.summary.passed++
        } else {
          diagnostics.summary.failed++
        }
      } catch (error: any) {
        diagnostics.tests.push({
          name: 'API Enablement',
          status: 'WARNING',
          error: error.message,
          details: { note: 'Could not check API status - might be permissions issue' }
        })
        diagnostics.summary.warnings++
      }

      // Test 4: Drive API Basic Access
      try {
        const auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive.readonly']
        })
        const authClient = await auth.getClient()
        const drive = google.drive({ version: 'v3', auth: authClient })
        
        const response = await drive.files.list({
          pageSize: 1,
          fields: 'files(id, name)'
        })
        
        diagnostics.tests.push({
          name: 'Drive API Read Access',
          status: 'PASS',
          details: {
            canListFiles: true,
            filesFound: response.data.files?.length || 0
          }
        })
        diagnostics.summary.passed++
      } catch (error: any) {
        diagnostics.tests.push({
          name: 'Drive API Read Access',
          status: 'FAIL',
          error: error.message,
          details: { 
            code: error.code,
            suggestion: error.code === 403 ? 'Drive API not enabled or insufficient permissions' : 'API access issue'
          }
        })
        diagnostics.summary.failed++
      }

      // Test 5: Drive API Write Access
      try {
        const auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive']
        })
        const authClient = await auth.getClient()
        const drive = google.drive({ version: 'v3', auth: authClient })
        
        // Try to create a test folder (less invasive than spreadsheet)
        const testFolder = await drive.files.create({
          requestBody: {
            name: 'BuildTrack Test Folder - Safe to Delete',
            mimeType: 'application/vnd.google-apps.folder'
          }
        })
        
        // Clean up immediately
        if (testFolder.data.id) {
          await drive.files.delete({ fileId: testFolder.data.id })
        }
        
        diagnostics.tests.push({
          name: 'Drive API Write Access',
          status: 'PASS',
          details: {
            canCreateFiles: true,
            testFileCreated: !!testFolder.data.id,
            testFileDeleted: true
          }
        })
        diagnostics.summary.passed++
      } catch (error: any) {
        diagnostics.tests.push({
          name: 'Drive API Write Access',
          status: 'FAIL',
          error: error.message,
          details: { 
            code: error.code,
            suggestion: error.code === 403 ? 'Drive API write permissions missing' : 'API access issue'
          }
        })
        diagnostics.summary.failed++
      }

      // Test 6: Sheets API Access
      try {
        const auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        })
        const authClient = await auth.getClient()
        const sheets = google.sheets({ version: 'v4', auth: authClient })
        
        // Try to create a test spreadsheet
        const testSpreadsheet = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: 'BuildTrack API Test - Safe to Delete'
            }
          }
        })
        
        const spreadsheetId = testSpreadsheet.data.spreadsheetId
        
        // Clean up immediately
        if (spreadsheetId) {
          const drive = google.drive({ version: 'v3', auth: authClient })
          await drive.files.delete({ fileId: spreadsheetId })
        }
        
        diagnostics.tests.push({
          name: 'Sheets API Create Access',
          status: 'PASS',
          details: {
            canCreateSpreadsheets: true,
            testSpreadsheetCreated: !!spreadsheetId,
            testSpreadsheetDeleted: true
          }
        })
        diagnostics.summary.passed++
      } catch (error: any) {
        diagnostics.tests.push({
          name: 'Sheets API Create Access',
          status: 'FAIL',
          error: error.message,
          details: { 
            code: error.code,
            suggestion: error.code === 403 ? 'Sheets API not enabled or insufficient permissions' : 'API access issue'
          }
        })
        diagnostics.summary.failed++
      }

      // Generate recommendations
      const recommendations = []
      const failedTests = diagnostics.tests.filter((t: any) => t.status === 'FAIL')
      
      if (failedTests.some((t: any) => t.name === 'Basic Authentication')) {
        recommendations.push('🔑 Service account key appears to be invalid or corrupted. Generate a new key.')
      }
      
      if (failedTests.some((t: any) => t.name === 'Project Access')) {
        recommendations.push('🏗️ Service account may be from wrong project. Ensure key matches your Google Cloud project.')
      }
      
      if (failedTests.some((t: any) => t.name.includes('API'))) {
        recommendations.push('🔧 Enable required APIs: Google Sheets API and Google Drive API in Google Cloud Console.')
      }
      
      if (failedTests.some((t: any) => t.error?.includes('permission'))) {
        recommendations.push('👤 Service account needs proper IAM roles. Assign "Editor" or "Owner" role in IAM console.')
      }

      if (recommendations.length === 0) {
        recommendations.push('✅ All tests passed! The issue might be intermittent or related to API propagation.')
      }

      diagnostics.recommendations = recommendations
      diagnostics.nextSteps = [
        'Visit Google Cloud Console: https://console.cloud.google.com',
        'Check IAM & Admin → Service Accounts',
        'Verify APIs & Services → Library (enable Sheets + Drive APIs)',
        'Generate new service account key if authentication fails'
      ]

      return NextResponse.json({
        success: diagnostics.summary.failed === 0,
        diagnostics,
        message: `Diagnostic complete: ${diagnostics.summary.passed} passed, ${diagnostics.summary.failed} failed, ${diagnostics.summary.warnings} warnings`
      })

    } finally {
      // Restore original environment variables
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = originalEnv.GOOGLE_SERVICE_ACCOUNT_KEY
      process.env.GOOGLE_CLIENT_EMAIL = originalEnv.GOOGLE_CLIENT_EMAIL
      process.env.GOOGLE_PRIVATE_KEY = originalEnv.GOOGLE_PRIVATE_KEY
    }

  } catch (error) {
    console.error('Google Sheets diagnostic failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Diagnostic failed to run',
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