/**
 * Settings API - Persistent storage for user settings
 * POST /api/settings - Update user settings
 * GET /api/settings - Retrieve user settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { SettingsService } from '@/lib/settings-service'

async function GET(request: NextRequest, user: AuthUser) {
  try {
    const service = new SettingsService(user.id)
    const settings = await service.getSettings()
    
    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error) {
    console.error('Error retrieving settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve settings'
      },
      { status: 500 }
    )
  }
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const { key, value } = body
    
    if (!key) {
      return NextResponse.json(
        {
          success: false,
          error: 'Setting key is required'
        },
        { status: 400 }
      )
    }

    const service = new SettingsService(user.id)
    await service.updateSetting(key, value)
    
    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully'
    })
  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update setting'
      },
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
  action: 'update',
  requireAuth: true,
})

export { protectedGET as GET, protectedPOST as POST }