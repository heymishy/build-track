/**
 * Google OAuth2 Callback Handler
 * Handles the OAuth2 flow completion and token exchange
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { SettingsService } from '@/lib/settings-service'

export const GET = withAuth(
  async (request: NextRequest, user: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url)
      const code = searchParams.get('code')
      const _state = searchParams.get('state') // OAuth state parameter (unused but required for security)
      const error = searchParams.get('error')

      if (error) {
        console.error('Google OAuth2 error:', error)
        return NextResponse.redirect(
          `${request.headers.get('origin')}/settings?google_oauth_error=${encodeURIComponent(error)}`
        )
      }

      if (!code) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authorization code not provided',
          },
          { status: 400 }
        )
      }

      const settingsService = new SettingsService(user.id)
      const oauth2Config = await settingsService.getGoogleOAuth2Config()

      if (!oauth2Config) {
        return NextResponse.json(
          {
            success: false,
            error: 'OAuth2 configuration not found. Please configure Google OAuth2 settings first.',
          },
          { status: 400 }
        )
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: oauth2Config.clientId,
          client_secret: oauth2Config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri:
            oauth2Config.redirectUri || `${request.headers.get('origin')}/api/auth/google/callback`,
        }),
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        console.error('Token exchange failed:', errorData)
        return NextResponse.redirect(
          `${request.headers.get('origin')}/settings?google_oauth_error=${encodeURIComponent('Token exchange failed')}`
        )
      }

      const tokens = await tokenResponse.json()

      // Save tokens to user settings
      await settingsService.setGoogleOAuth2Tokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
        scope: tokens.scope,
      })

      // Redirect back to settings with success
      return NextResponse.redirect(
        `${request.headers.get('origin')}/settings?google_oauth_success=1`
      )
    } catch (error) {
      console.error('Google OAuth2 callback error:', error)
      return NextResponse.redirect(
        `${request.headers.get('origin')}/settings?google_oauth_error=${encodeURIComponent('Authentication failed')}`
      )
    }
  },
  {
    resource: 'settings',
    action: 'write',
    requireAuth: true,
  }
)
