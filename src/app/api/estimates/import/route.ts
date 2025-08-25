/**
 * API Route: /api/estimates/import
 * Import project estimates from CSV, XLSX, or PDF files
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import {
  parseEstimateFromCSV,
  parseEstimateFromXLSX,
  parseEstimateFromPDF,
  ParsedEstimate,
} from '@/lib/estimate-parser'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
]

async function POST(request: NextRequest, user: AuthUser) {
  try {
    console.log('Estimate import API called')

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const createNewProject = formData.get('createNewProject') === 'true'
    const projectName = formData.get('projectName') as string

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file uploaded',
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only CSV, Excel (.xlsx, .xls), and PDF files are allowed.',
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large. Maximum size is 10MB.',
        },
        { status: 413 }
      )
    }

    // Validate project parameters
    if (!createNewProject && !projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required when not creating a new project',
        },
        { status: 400 }
      )
    }

    if (createNewProject && !projectName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project name is required when creating a new project',
        },
        { status: 400 }
      )
    }

    // Verify user has access to existing project (if not creating new)
    if (!createNewProject && user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
        },
      })

      if (!projectAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have access to this project',
          },
          { status: 403 }
        )
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse estimate based on file type
    let parsedEstimate: ParsedEstimate
    try {
      if (file.type === 'text/csv') {
        const csvContent = buffer.toString('utf-8')
        parsedEstimate = await parseEstimateFromCSV(csvContent, file.name)
      } else if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
        parsedEstimate = await parseEstimateFromXLSX(buffer, file.name)
      } else if (file.type === 'application/pdf') {
        parsedEstimate = await parseEstimateFromPDF(buffer, file.name, user.id)
      } else {
        throw new Error('Unsupported file type')
      }
    } catch (error) {
      console.error('Estimate parsing error:', error)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse estimate file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 500 }
      )
    }

    // Create or update project
    let targetProjectId: string
    let project: any

    if (createNewProject) {
      // Create new project with estimate data
      project = await prisma.project.create({
        data: {
          name: projectName,
          description: `Project created from estimate import: ${file.name}`,
          totalBudget: parsedEstimate.totalBudget,
          currency: parsedEstimate.currency,
          status: 'PLANNING',
          users: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
        include: {
          users: true,
        },
      })
      targetProjectId = project.id
    } else {
      // Update existing project budget
      project = await prisma.project.update({
        where: { id: projectId },
        data: {
          totalBudget: parsedEstimate.totalBudget,
          currency: parsedEstimate.currency,
        },
        include: {
          users: true,
          trades: {
            include: {
              lineItems: true,
            },
          },
        },
      })
      targetProjectId = projectId
    }

    // Create trades and line items
    const createdTrades = []
    const errors = []

    for (const tradeData of parsedEstimate.trades) {
      try {
        // Check if trade already exists
        let trade = await prisma.trade.findFirst({
          where: {
            projectId: targetProjectId,
            name: tradeData.name,
          },
        })

        if (!trade) {
          // Create new trade
          trade = await prisma.trade.create({
            data: {
              projectId: targetProjectId,
              name: tradeData.name,
              description: tradeData.description,
              sortOrder: tradeData.sortOrder || 0,
            },
          })
        }

        // Create line items for this trade
        const lineItemsData = tradeData.lineItems.map((item, index) => ({
          tradeId: trade.id,
          itemCode: item.itemCode,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          materialCostEst: item.materialCost,
          laborCostEst: item.laborCost,
          equipmentCostEst: item.equipmentCost,
          markupPercent: item.markupPercent || 0,
          overheadPercent: item.overheadPercent || 0,
          sortOrder: index,
        }))

        // Delete existing line items for this trade (if updating)
        if (!createNewProject) {
          await prisma.lineItem.deleteMany({
            where: { tradeId: trade.id },
          })
        }

        // Create new line items
        const createdLineItems = await prisma.lineItem.createMany({
          data: lineItemsData,
        })

        createdTrades.push({
          id: trade.id,
          name: trade.name,
          lineItemsCount: createdLineItems.count,
          totalCost: tradeData.totalCost,
        })
      } catch (error) {
        console.error(`Error creating trade ${tradeData.name}:`, error)
        errors.push({
          tradeName: tradeData.name,
          error: 'Failed to create trade and line items',
        })
      }
    }

    // Calculate final totals
    const summary = {
      projectId: targetProjectId,
      projectName: project.name,
      totalBudget: parsedEstimate.totalBudget,
      tradesCreated: createdTrades.length,
      totalLineItems: parsedEstimate.summary.totalLineItems,
      materialCost: parsedEstimate.summary.totalMaterialCost,
      laborCost: parsedEstimate.summary.totalLaborCost,
      equipmentCost: parsedEstimate.summary.totalEquipmentCost,
      errors: errors.length,
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        totalBudget: project.totalBudget,
        currency: project.currency,
      },
      estimate: parsedEstimate,
      createdTrades,
      errors,
      summary,
    })
  } catch (error) {
    console.error('Estimate import API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to upload an estimate file.',
    },
    { status: 405 }
  )
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'projects',
  action: 'create',
  requireAuth: true,
})

export { protectedPOST as POST }
