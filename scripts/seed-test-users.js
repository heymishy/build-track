const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding test users for BDD tests...')

  // Test users defined in test-data.ts
  const testUsers = [
    {
      email: 'admin@buildtrack.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'ADMIN',
    },
    {
      email: 'user@buildtrack.com',
      password: 'user123',
      name: 'Project Manager',
      role: 'USER',
    },
    {
      email: 'viewer@buildtrack.com',
      password: 'viewer123',
      name: 'Viewer User',
      role: 'VIEWER',
    },
  ]

  for (const userData of testUsers) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      if (existingUser) {
        console.log(`✅ User ${userData.email} already exists`)
        continue
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10)

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
        },
      })

      console.log(`✅ Created user: ${user.email} (${user.role})`)
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.email}:`, error.message)
    }
  }

  console.log('🎉 Test user seeding completed!')
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
