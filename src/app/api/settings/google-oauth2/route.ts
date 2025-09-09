/**
 * Google OAuth2 Integration Settings API
 * Manages user-specific Google OAuth2 credentials for Drive access
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { SettingsService } from '@/lib/settings-service'

export const GET = withAuth(
  async (request: NextRequest, user: any) => {
    try {
      const settingsService = new SettingsService(user.id)
      const oauth2Config = await settingsService.getGoogleOAuth2Config()
      const oauth2Tokens = await settingsService.getGoogleOAuth2Tokens()

      return NextResponse.json({
        success: true,
        config: {
          isConfigured: !!oauth2Config,
          hasTokens: !!oauth2Tokens,
          clientId: oauth2Config?.clientId || null,
          // Never return client secret or tokens for security
        },
      })
    } catch (error) {
      console.error('Get Google OAuth2 settings error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to load Google OAuth2 settings',
        },
        { status: 500 }
      )
    }
  },
  {
    resource: 'settings',
    action: 'read',
    requireAuth: true,
  }
)

export const POST = withAuth(
  async (request: NextRequest, user: any) => {
    try {
      const { clientId, clientSecret, action } = await request.json()

      const settingsService = new SettingsService(user.id)

      if (action === 'remove') {
        await settingsService.removeGoogleOAuth2Config()
        await settingsService.removeGoogleOAuth2Tokens()
        return NextResponse.json({
          success: true,
          message: 'Google OAuth2 configuration removed successfully',
        })
      }

      if (!clientId || !clientSecret) {
        return NextResponse.json(
          {
            success: false,
            error: 'Client ID and Client Secret are required',
          },
          { status: 400 }
        )
      }

      // Validate client ID format (should be a Google OAuth2 client ID)
      if (!clientId.endsWith('.googleusercontent.com')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid Google OAuth2 Client ID format',
          },
          { status: 400 }
        )
      }

      // Save the OAuth2 configuration
      await settingsService.setGoogleOAuth2Config({
        clientId,
        clientSecret,
        redirectUri: `${request.headers.get('origin')}/api/auth/google/callback`,
      })

      return NextResponse.json({
        success: true,
        message: 'Google OAuth2 configuration saved successfully',
        config: {
          isConfigured: true,
          clientId,
        },
      })
    } catch (error) {
      console.error('Save Google OAuth2 settings error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save Google OAuth2 settings',
        },
        { status: 500 }
      )
    }
  },
  {
    resource: 'settings',
    action: 'write',
    requireAuth: true,
  }
)
