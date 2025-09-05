/**
 * Google Drive Integration Settings API
 * Manages user-specific Google service account credentials
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { SettingsService } from '@/lib/settings-service'

export const GET = withAuth(
  async (request: NextRequest, user: any) => {
    try {
      const settingsService = new SettingsService(user.id)
      const serviceAccountKey = await settingsService.getGoogleServiceAccountKey()
      
      return NextResponse.json({
        success: true,
        config: {
          isConfigured: !!serviceAccountKey,
          serviceAccountKey: serviceAccountKey ? 'CONFIGURED' : null,
        },
      })
    } catch (error) {
      console.error('Get Google Drive settings error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to load Google Drive settings',
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
      const { serviceAccountKey, action } = await request.json()

      const settingsService = new SettingsService(user.id)

      if (action === 'remove') {
        await settingsService.removeGoogleServiceAccountKey()
        return NextResponse.json({
          success: true,
          message: 'Google Drive credentials removed successfully',
        })
      }

      if (!serviceAccountKey) {
        return NextResponse.json(
          {
            success: false,
            error: 'Google service account key is required',
          },
          { status: 400 }
        )
      }

      // Validate JSON format
      let parsedKey
      try {
        parsedKey = typeof serviceAccountKey === 'string' 
          ? JSON.parse(serviceAccountKey) 
          : serviceAccountKey
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid JSON format for service account key',
          },
          { status: 400 }
        )
      }

      // Validate required fields
      const requiredFields = ['type', 'project_id', 'private_key', 'client_email']
      const missingFields = requiredFields.filter(field => !parsedKey[field])
      
      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required fields: ${missingFields.join(', ')}`,
          },
          { status: 400 }
        )
      }

      // Validate service account type
      if (parsedKey.type !== 'service_account') {
        return NextResponse.json(
          {
            success: false,
            error: 'Only service account keys are supported',
          },
          { status: 400 }
        )
      }

      // Save the credentials
      await settingsService.setGoogleServiceAccountKey(parsedKey)

      return NextResponse.json({
        success: true,
        message: 'Google Drive credentials saved successfully',
        config: {
          isConfigured: true,
          serviceAccountKey: 'CONFIGURED',
        },
      })
    } catch (error) {
      console.error('Save Google Drive settings error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save Google Drive settings',
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