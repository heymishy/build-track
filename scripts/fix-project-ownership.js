/**
 * Script to fix project ownership issues
 * Usage: node scripts/fix-project-ownership.js <projectId> <userId>
 */

const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function fixProjectOwnership(projectId, userId) {
  try {
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    })

    if (!project) {
      console.log('❌ Project not found')
      return
    }

    console.log('📋 Project:', project.name)
    console.log('👥 Current users:')
    project.users.forEach(u => {
      console.log(`  - ${u.user.email} (${u.role})`)
    })

    // Check if user already has access
    const existingAccess = project.users.find(u => u.userId === userId)

    if (existingAccess) {
      if (existingAccess.role === 'OWNER') {
        console.log('✅ User already has OWNER access')
        return
      } else {
        // Update existing access to OWNER
        await prisma.projectUser.update({
          where: {
            id: existingAccess.id,
          },
          data: {
            role: 'OWNER',
          },
        })
        console.log(`✅ Updated user role from ${existingAccess.role} to OWNER`)
      }
    } else {
      // Add user as OWNER
      await prisma.projectUser.create({
        data: {
          userId: userId,
          projectId: projectId,
          role: 'OWNER',
        },
      })
      console.log('✅ Added user as OWNER')
    }

    // Verify the change
    const updatedProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    })

    console.log('👥 Updated users:')
    updatedProject.users.forEach(u => {
      console.log(`  - ${u.user.email} (${u.role})`)
    })
  } catch (error) {
    console.error('❌ Error fixing project ownership:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get arguments
const projectId = process.argv[2]
const userId = process.argv[3]

if (!projectId || !userId) {
  console.log('Usage: node scripts/fix-project-ownership.js <projectId> <userId>')
  console.log(
    'Example: node scripts/fix-project-ownership.js cmekxod5p00034pq9vzq2he1r cmeixes7f00004ptbn5hsgshv'
  )
  process.exit(1)
}

fixProjectOwnership(projectId, userId)
