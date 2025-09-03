#!/usr/bin/env node

/**
 * Script to check users and optionally create an admin user
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Checking existing users...\n')

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (users.length === 0) {
      console.log('❌ No users found in database')
      console.log('💡 You need to create an admin user first')
    } else {
      console.log(`✅ Found ${users.length} users:`)
      console.table(
        users.map(user => ({
          ID: user.id.substring(0, 8) + '...',
          Email: user.email,
          Name: user.name,
          Role: user.role,
          Created: user.createdAt.toISOString().split('T')[0],
        }))
      )

      const adminUsers = users.filter(u => u.role === 'ADMIN')
      console.log(`\n🔑 Admin users: ${adminUsers.length}`)

      if (adminUsers.length === 0) {
        console.log('⚠️  No ADMIN users found!')
        console.log('💡 You need an ADMIN user to manage suppliers')
      } else {
        console.log('✅ Admin users found - supplier management should work')
      }
    }

    // Check if we need to promote a user to admin
    if (users.length > 0 && !users.some(u => u.role === 'ADMIN')) {
      console.log('\n🔧 Would you like to promote a user to ADMIN? (Run with --promote flag)')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
