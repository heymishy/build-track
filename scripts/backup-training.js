/**
 * Training Data Backup Utility
 * Backs up and restores training data to prevent loss during development
 */

const fs = require('fs')
const path = require('path')

const BACKUP_FILE = path.join(__dirname, '../training-backup.json')

async function backupTrainingData() {
  try {
    // Dynamic import for ES modules
    const { prisma } = await import('../src/lib/prisma.js')
    
    console.log('🔄 Backing up training data...')
    
    // Get all training records
    const trainingRecords = await prisma.invoice.findMany({
      where: {
        supplierName: 'Training Data'
      },
      include: {
        lineItems: true
      }
    })

    const backup = {
      timestamp: new Date().toISOString(),
      records: trainingRecords,
      count: trainingRecords.length
    }

    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2))
    console.log(`✅ Backed up ${backup.count} training records to ${BACKUP_FILE}`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Backup failed:', error)
    process.exit(1)
  }
}

async function restoreTrainingData() {
  try {
    if (!fs.existsSync(BACKUP_FILE)) {
      console.log('📋 No backup file found')
      return
    }

    const { prisma } = await import('../src/lib/prisma.js')
    
    console.log('🔄 Restoring training data...')
    
    const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'))
    console.log(`📅 Backup from: ${backup.timestamp}`)
    
    // Clear existing training data
    await prisma.invoice.deleteMany({
      where: {
        supplierName: 'Training Data'
      }
    })

    // Restore records
    for (const record of backup.records) {
      const { lineItems, ...invoiceData } = record
      
      await prisma.invoice.create({
        data: {
          ...invoiceData,
          lineItems: {
            create: lineItems
          }
        }
      })
    }

    console.log(`✅ Restored ${backup.count} training records`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Restore failed:', error)
    process.exit(1)
  }
}

// CLI interface
const command = process.argv[2]

if (command === 'backup') {
  backupTrainingData()
} else if (command === 'restore') {
  restoreTrainingData()
} else {
  console.log('Usage: node backup-training.js [backup|restore]')
}