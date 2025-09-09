#!/usr/bin/env node

/**
 * Seed test data for E2E tests
 * Creates test users, projects, and basic data structure
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...')

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10)
    const adminPassword = await bcrypt.hash('admin123', 10)

    // Test user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'USER',
      },
    })

    // Admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        password: adminPassword,
        name: 'Admin User',
        role: 'ADMIN',
      },
    })

    // Create test project
    const project = await prisma.project.upsert({
      where: { id: 'test-project-1' },
      update: {},
      create: {
        id: 'test-project-1',
        name: 'Test Construction Project',
        description: 'A test project for E2E testing',
        totalBudget: 100000,
        status: 'IN_PROGRESS',
        startDate: new Date(),
        estimatedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        users: {
          create: [
            {
              userId: testUser.id,
              role: 'OWNER',
            },
            {
              userId: adminUser.id,
              role: 'CONTRACTOR',
            },
          ],
        },
      },
    })

    // Create test supplier access
    await prisma.supplierAccess.upsert({
      where: { email: 'supplier@example.com' },
      update: {},
      create: {
        email: 'supplier@example.com',
        name: 'Test Supplier Company',
        type: 'SUPPLIER',
        isActive: true,
        createdBy: adminUser.id,
      },
    })

    // Create test trade
    const trade = await prisma.trade.upsert({
      where: { id: 'test-trade-1' },
      update: {},
      create: {
        id: 'test-trade-1',
        projectId: project.id,
        name: 'Electrical Work',
        description: 'Electrical installation and wiring',
        sortOrder: 1,
      },
    })

    // Create test line items
    await prisma.lineItem.upsert({
      where: { id: 'test-lineitem-1' },
      update: {},
      create: {
        id: 'test-lineitem-1',
        tradeId: trade.id,
        description: 'Electrical outlets installation',
        quantity: 20,
        unit: 'each',
        materialCostEst: 100,
        laborCostEst: 50,
        sortOrder: 1,
      },
    })

    // Create test milestone
    await prisma.milestone.upsert({
      where: { id: 'test-milestone-1' },
      update: {},
      create: {
        id: 'test-milestone-1',
        projectId: project.id,
        name: 'Foundation Complete',
        description: 'Foundation work completed and ready for framing',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        paymentAmount: 25000,
        percentComplete: 75,
        status: 'IN_PROGRESS',
      },
    })

    console.log('✅ Test data seeded successfully!')
    console.log(`👤 Test User: test@example.com / password123`)
    console.log(`👤 Admin User: admin@example.com / admin123`)
    console.log(`🏗️  Test Project: ${project.name} (ID: ${project.id})`)
  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Only run if called directly
if (require.main === module) {
  seedTestData()
}

module.exports = { seedTestData }
