/**
 * Check project users and permissions
 */

const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function checkProjectUsers(projectId) {
  try {
    // Get all users for this project
    const projectUsers = await prisma.projectUser.findMany({
      where: {
        projectId: projectId,
      },
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
    })

    console.log(`📋 Project: ${projectId}`)
    console.log(`👥 Project Users (${projectUsers.length}):`)

    projectUsers.forEach((pu, index) => {
      console.log(`  ${index + 1}. User ID: ${pu.userId}`)
      console.log(`     Email: ${pu.user.email}`)
      console.log(`     Name: ${pu.user.name || 'N/A'}`)
      console.log(`     Global Role: ${pu.user.role}`)
      console.log(`     Project Role: ${pu.role}`)
      console.log(`     Created: ${pu.createdAt}`)
      console.log('')
    })

    // Also check the project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    })

    if (project) {
      console.log(`📋 Project Details:`)
      console.log(`   Name: ${project.name}`)
      console.log(`   Description: ${project.description}`)
      console.log(`   Created: ${project.createdAt}`)
    } else {
      console.log('❌ Project not found!')
    }

    // Check the specific user
    const targetUser = await prisma.user.findUnique({
      where: { id: 'cmeixes7f00004ptbn5hsgshv' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    console.log(`👤 Target User:`)
    if (targetUser) {
      console.log(`   ID: ${targetUser.id}`)
      console.log(`   Email: ${targetUser.email}`)
      console.log(`   Name: ${targetUser.name || 'N/A'}`)
      console.log(`   Global Role: ${targetUser.role}`)
    } else {
      console.log('   ❌ User not found!')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const projectId = process.argv[2] || 'cmekxod5p00034pq9vzq2he1r'
checkProjectUsers(projectId)
