/**
 * Google OAuth2 Initiation Endpoint
 * Starts the OAuth2 flow for Google Drive access
 */

import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/lib/settings-service'

// For supplier portal, get supplier user ID
async function getSupplierUserId(email: string): Promise<string | null> {
  return `supplier:${email}`
}

export async function POST(request: NextRequest) {
  try {
    const { email, isSupplierPortal = true } = await request.json()

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required',
        },
        { status: 400 }
      )
    }

    let userId: string
    if (isSupplierPortal) {
      const supplierUserId = await getSupplierUserId(email)
      if (!supplierUserId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Supplier not found',
          },
          { status: 404 }
        )
      }
      userId = supplierUserId
    } else {
      // For authenticated users, we'd get userId from auth middleware
      // For now, this is supplier portal focused
      return NextResponse.json(
        {
          success: false,
          error: 'User authentication not implemented',
        },
        { status: 400 }
      )
    }

    // Check if user has OAuth2 configuration
    const settingsService = new SettingsService(userId)
    const oauth2Config = await settingsService.getGoogleOAuth2Config()

    if (!oauth2Config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google OAuth2 not configured. Please contact support.',
          requiresConfig: true,
        },
        { status: 400 }
      )
    }

    // Generate OAuth2 authorization URL
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ]

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', oauth2Config.clientId)
    authUrl.searchParams.set(
      'redirect_uri',
      oauth2Config.redirectUri || `${request.headers.get('origin')}/api/auth/google/callback`
    )
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes.join(' '))
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', btoa(JSON.stringify({ userId, email })))

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      message: 'Click the URL to connect your Google account',
    })
  } catch (error) {
    console.error('Google OAuth2 initiation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate Google authentication',
      },
      { status: 500 }
    )
  }
}
