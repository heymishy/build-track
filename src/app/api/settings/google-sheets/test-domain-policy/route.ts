/**
 * API Route: /api/settings/google-sheets/test-domain-policy
 * Test for domain policy restrictions by checking different API endpoints
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

      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })

      const authClient = await auth.getClient()

      // Test 1: Check service account info
      try {
        console.log('Test 1: Service account info check')
        
        const iam = google.iam({ version: 'v1', auth: authClient })
        const serviceAccountName = `projects/${credentials.project_id}/serviceAccounts/${credentials.client_email}`
        
        const serviceAccountInfo = await iam.projects.serviceAccounts.get({
          name: serviceAccountName
        })

        testResults.push({
          test: 'Service Account Info',
          status: 'SUCCESS',
          data: {
            email: serviceAccountInfo.data.email,
            disabled: serviceAccountInfo.data.disabled,
            oauth2ClientId: serviceAccountInfo.data.oauth2ClientId
          }
        })

      } catch (error: any) {
        testResults.push({
          test: 'Service Account Info',
          status: 'FAILED',
          error: error.message,
          code: error.code,
          suggestion: error.code === 403 ? 'IAM API access restricted' : 'Service account access issue'
        })
      }

      // Test 2: Check service account keys
      try {
        console.log('Test 2: Service account keys check')
        
        const iam = google.iam({ version: 'v1', auth: authClient })
        const serviceAccountName = `projects/${credentials.project_id}/serviceAccounts/${credentials.client_email}`
        
        const keys = await iam.projects.serviceAccounts.keys.list({
          name: serviceAccountName
        })

        const activeKeys = keys.data.keys?.filter(key => key.validAfterTime && key.validBeforeTime) || []

        testResults.push({
          test: 'Service Account Keys',
          status: 'SUCCESS',
          data: {
            totalKeys: keys.data.keys?.length || 0,
            activeKeys: activeKeys.length,
            keyTypes: [...new Set(keys.data.keys?.map(k => k.keyType) || [])]
          }
        })

      } catch (error: any) {
        testResults.push({
          test: 'Service Account Keys',
          status: 'FAILED', 
          error: error.message,
          code: error.code,
          suggestion: error.code === 403 ? 'Key management restricted' : 'Key access issue'
        })
      }

      // Test 3: Check project IAM policy
      try {
        console.log('Test 3: Project IAM policy check')
        
        const cloudresourcemanager = google.cloudresourcemanager({ version: 'v1', auth: authClient })
        
        const policy = await cloudresourcemanager.projects.getIamPolicy({
          resource: credentials.project_id
        })

        const serviceAccountBindings = policy.data.bindings?.filter(binding => 
          binding.members?.some(member => member.includes(credentials.client_email))
        ) || []

        const roles = serviceAccountBindings.flatMap(binding => binding.role || [])

        testResults.push({
          test: 'Project IAM Policy',
          status: 'SUCCESS',
          data: {
            serviceAccountRoles: roles,
            hasOwnerRole: roles.includes('roles/owner'),
            hasEditorRole: roles.includes('roles/editor'),
            totalBindings: serviceAccountBindings.length
          }
        })

      } catch (error: any) {
        testResults.push({
          test: 'Project IAM Policy',
          status: 'FAILED',
          error: error.message,
          code: error.code,
          suggestion: error.code === 403 ? 'IAM policy access restricted by organization' : 'Policy access issue'
        })
      }

      // Test 4: Simple API capability test (no actual resource creation)
      try {
        console.log('Test 4: API capability test')
        
        // Test if we can at least access the Sheets API discovery document
        const sheets = google.sheets({ version: 'v4', auth: authClient })
        
        // This shouldn't create anything, just test API access
        const discoveryDoc = await sheets.spreadsheets.get({
          spreadsheetId: '1mNHuLgDhH9dWlhWLMLTHD7LBOIBRGIqR8_hVdoUxTEE', // Public test spreadsheet
          ranges: ['A1:A1'],
          includeGridData: false
        })

        testResults.push({
          test: 'API Capability',
          status: 'SUCCESS',
          data: {
            canAccessSheetsAPI: true,
            testSpreadsheetAccess: true
          }
        })

      } catch (error: any) {
        testResults.push({
          test: 'API Capability', 
          status: 'FAILED',
          error: error.message,
          code: error.code,
          suggestion: error.code === 403 ? 'Sheets API blocked by domain policy' : 
                     error.code === 404 ? 'Test spreadsheet not accessible' : 'API access issue'
        })
      }

      const successCount = testResults.filter(r => r.status === 'SUCCESS').length
      const failureCount = testResults.filter(r => r.status === 'FAILED').length

      // Analyze patterns
      const domainPolicyIndicators = testResults.filter(r => 
        r.status === 'FAILED' && 
        (r.suggestion?.includes('organization') || r.suggestion?.includes('domain policy'))
      )

      const recommendation = domainPolicyIndicators.length > 0 ? 
        'Domain policy restrictions detected. Contact your Google Workspace admin to allow service account API access.' :
        successCount > 2 ? 
          'Service account has good access rights. Issue likely with specific Sheets API permissions.' :
          'Multiple access restrictions found. May need fresh service account or admin intervention.'

      return NextResponse.json({
        success: successCount > failureCount,
        message: `Domain policy tests: ${successCount} successful, ${failureCount} failed`,
        results: testResults,
        analysis: {
          domainPolicyRestrictions: domainPolicyIndicators.length,
          accessLevel: successCount > 2 ? 'HIGH' : successCount > 0 ? 'PARTIAL' : 'BLOCKED',
          likelyIssue: domainPolicyIndicators.length > 0 ? 'DOMAIN_POLICY' : 
                      successCount === 0 ? 'FULL_RESTRICTION' : 'API_SPECIFIC'
        },
        recommendation,
        details: {
          projectId: credentials.project_id,
          clientEmail: credentials.client_email,
          testsWithDomainIssues: domainPolicyIndicators.map(r => r.test)
        }
      })

    } finally {
      // Restore original environment variables
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = originalEnv.GOOGLE_SERVICE_ACCOUNT_KEY
      process.env.GOOGLE_CLIENT_EMAIL = originalEnv.GOOGLE_CLIENT_EMAIL  
      process.env.GOOGLE_PRIVATE_KEY = originalEnv.GOOGLE_PRIVATE_KEY
    }

  } catch (error) {
    console.error('Domain policy test failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Domain policy test failed to run',
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