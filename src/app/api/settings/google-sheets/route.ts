/**
 * API Route: /api/settings/google-sheets
 * Handles Google Sheets integration configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { googleSheetsService } from '@/lib/google-sheets'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Configuration file path
const CONFIG_PATH = join(process.cwd(), '.env.local')

interface GoogleSheetsConfig {
  serviceAccountKey?: string
  clientEmail?: string
  privateKey?: string
  method: 'json' | 'individual'
}

async function GET(request: NextRequest, user: AuthUser) {
  try {
    // Check if Google Sheets is currently configured
    const isConfigured = googleSheetsService.isAvailable()
    
    return NextResponse.json({
      success: true,
      isConfigured,
      hasServiceAccountKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasIndividualCredentials: !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY),
    })
  } catch (error) {
    console.error('Failed to get Google Sheets config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get configuration' },
      { status: 500 }
    )
  }
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const config: GoogleSheetsConfig = await request.json()
    
    // Validate the configuration
    if (!config.method) {
      return NextResponse.json(
        { success: false, error: 'Configuration method is required' },
        { status: 400 }
      )
    }

    if (config.method === 'json') {
      if (!config.serviceAccountKey) {
        return NextResponse.json(
          { success: false, error: 'Service account key is required' },
          { status: 400 }
        )
      }
      
      // Validate JSON format
      try {
        JSON.parse(config.serviceAccountKey)
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON format for service account key' },
          { status: 400 }
        )
      }
    } else if (config.method === 'individual') {
      if (!config.clientEmail || !config.privateKey) {
        return NextResponse.json(
          { success: false, error: 'Client email and private key are required' },
          { status: 400 }
        )
      }
    }

    // Read current .env.local file
    let envContent = ''
    if (existsSync(CONFIG_PATH)) {
      envContent = readFileSync(CONFIG_PATH, 'utf8')
    }

    // Remove existing Google Sheets configuration
    const envLines = envContent.split('\n').filter(line => 
      !line.startsWith('GOOGLE_SERVICE_ACCOUNT_KEY=') &&
      !line.startsWith('GOOGLE_CLIENT_EMAIL=') &&
      !line.startsWith('GOOGLE_PRIVATE_KEY=')
    )

    // Add new configuration
    if (config.method === 'json') {
      envLines.push(`GOOGLE_SERVICE_ACCOUNT_KEY='${config.serviceAccountKey}'`)
    } else {
      envLines.push(`GOOGLE_CLIENT_EMAIL='${config.clientEmail}'`)
      envLines.push(`GOOGLE_PRIVATE_KEY='${config.privateKey?.replace(/\n/g, '\\n')}'`)
    }

    // Write updated configuration
    writeFileSync(CONFIG_PATH, envLines.join('\n') + '\n')

    // Update process.env immediately (for current process)
    if (config.method === 'json') {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = config.serviceAccountKey
      delete process.env.GOOGLE_CLIENT_EMAIL
      delete process.env.GOOGLE_PRIVATE_KEY
    } else {
      process.env.GOOGLE_CLIENT_EMAIL = config.clientEmail
      process.env.GOOGLE_PRIVATE_KEY = config.privateKey
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    }

    return NextResponse.json({
      success: true,
      message: 'Google Sheets configuration saved successfully',
      requiresRestart: true, // Environment variables require server restart
    })

  } catch (error) {
    console.error('Failed to save Google Sheets config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    )
  }
}

async function DELETE(request: NextRequest, user: AuthUser) {
  try {
    // Read current .env.local file
    let envContent = ''
    if (existsSync(CONFIG_PATH)) {
      envContent = readFileSync(CONFIG_PATH, 'utf8')
    }

    // Remove Google Sheets configuration
    const envLines = envContent.split('\n').filter(line => 
      !line.startsWith('GOOGLE_SERVICE_ACCOUNT_KEY=') &&
      !line.startsWith('GOOGLE_CLIENT_EMAIL=') &&
      !line.startsWith('GOOGLE_PRIVATE_KEY=')
    )

    // Write updated configuration
    writeFileSync(CONFIG_PATH, envLines.join('\n'))

    // Clear from process.env
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    delete process.env.GOOGLE_CLIENT_EMAIL
    delete process.env.GOOGLE_PRIVATE_KEY

    return NextResponse.json({
      success: true,
      message: 'Google Sheets configuration removed successfully'
    })

  } catch (error) {
    console.error('Failed to remove Google Sheets config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove configuration' },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'settings',
  action: 'read',
  requireAuth: true,
})

const protectedPOST = withAuth(POST, {
  resource: 'settings',
  action: 'write',
  requireAuth: true,
})

const protectedDELETE = withAuth(DELETE, {
  resource: 'settings',
  action: 'delete',
  requireAuth: true,
})

export { protectedGET as GET, protectedPOST as POST, protectedDELETE as DELETE }