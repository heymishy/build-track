/**
 * Debug User Settings API
 * GET /api/debug/user-settings - Shows current user settings for debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { SettingsService } from '@/lib/settings-service'

export const GET = withAuth(
  async (request: NextRequest, user: AuthUser) => {
    try {
      // Get raw settings from database
      const rawSettings = await prisma.userSettings.findMany({
        where: { userId: user.id },
        orderBy: { key: 'asc' },
      })

      // Get processed settings via service
      const settingsService = new SettingsService(user.id)
      const processedSettings = await settingsService.getSettings()

      return NextResponse.json({
        success: true,
        debug: {
          userId: user.id,
          rawSettingsCount: rawSettings.length,
          rawSettings: rawSettings.map(s => ({
            key: s.key,
            value: s.value,
            encrypted: s.encrypted,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          })),
          processedSettings,
          databaseProvider: process.env.NODE_ENV === 'production' ? 'postgresql' : 'sqlite',
          databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
        },
      })
    } catch (error) {
      console.error('Debug user settings error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to debug user settings',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  },
  {
    resource: 'debug',
    action: 'read',
    requireAuth: true,
  }
)