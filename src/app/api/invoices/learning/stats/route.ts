/**
 * API Route: /api/invoices/learning/stats
 * Get learning analytics and pattern statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { InvoiceLearningService } from '@/lib/invoice-learning-service'

// GET /api/invoices/learning/stats - Get learning statistics
async function GET(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    const learningService = new InvoiceLearningService(user.id, projectId || undefined)
    const stats = await learningService.getLearningStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Learning stats API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'invoices',
  action: 'read',
  requireAuth: true,
})

export { protectedGET as GET }
