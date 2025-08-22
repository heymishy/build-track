/**
 * Development Reset Script
 * Safely resets development data while preserving training data
 */

async function devReset() {
  try {
    console.log('🔄 Starting development reset...')
    
    const { prisma } = await import('../src/lib/prisma.js')
    
    // 1. Backup training data first
    console.log('📋 Backing up training data...')
    const trainingRecords = await prisma.invoice.findMany({
      where: {
        supplierName: 'Training Data'
      },
      include: {
        lineItems: true
      }
    })
    
    console.log(`💾 Found ${trainingRecords.length} training records`)
    
    // 2. Clear non-training data
    console.log('🧹 Clearing development data (preserving training)...')
    
    // Delete non-training invoices and their line items
    await prisma.invoice.deleteMany({
      where: {
        supplierName: {
          not: 'Training Data'
        }
      }
    })
    
    // Reset project data (optional - comment out if you want to keep projects)
    // await prisma.project.deleteMany()
    
    console.log('✅ Development reset complete!')
    console.log(`📊 Training data preserved: ${trainingRecords.length} records`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Reset failed:', error)
    process.exit(1)
  }
}

devReset()