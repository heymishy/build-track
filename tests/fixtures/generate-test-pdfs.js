/**
 * Generate test PDF invoices for E2E testing
 * This script creates realistic PDF invoices using jsPDF
 */

const { jsPDF } = require('jspdf')
const fs = require('fs')
const path = require('path')

function createTestInvoice() {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text('INVOICE', 105, 20, { align: 'center' })

  // Company info
  doc.setFontSize(12)
  doc.text('ABC Construction Ltd', 20, 40)
  doc.text('123 Builder Street', 20, 50)
  doc.text('Auckland, NZ 1010', 20, 60)
  doc.text('GST: 123-456-789', 20, 70)

  // Invoice details
  doc.text('Invoice Number: INV-2024-001', 120, 40)
  doc.text('Date: 2024-01-15', 120, 50)
  doc.text('Due Date: 2024-02-15', 120, 60)

  // Bill to
  doc.text('Bill To:', 20, 90)
  doc.text('John Smith', 20, 100)
  doc.text('456 Home Avenue', 20, 110)
  doc.text('Auckland, NZ 1020', 20, 120)

  // Line items header
  doc.text('Description', 20, 140)
  doc.text('Qty', 120, 140)
  doc.text('Unit Price', 140, 140)
  doc.text('Total', 170, 140)

  // Line items
  doc.text('Concrete foundation work', 20, 155)
  doc.text('1', 120, 155)
  doc.text('$800.00', 140, 155)
  doc.text('$800.00', 170, 155)

  doc.text('Steel reinforcement', 20, 170)
  doc.text('2', 120, 170)
  doc.text('$200.00', 140, 170)
  doc.text('$400.00', 170, 170)

  // Totals
  doc.text('Subtotal: $1,200.00', 140, 200)
  doc.text('GST (15%): $180.00', 140, 210)
  doc.text('Total: $1,380.00', 140, 220)

  return doc
}

function createMultiInvoicePDF() {
  const doc = new jsPDF()

  // First invoice
  doc.setFontSize(16)
  doc.text('INVOICE #1', 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text('Invoice Number: INV-2024-001', 20, 40)
  doc.text('Vendor: ABC Construction', 20, 50)
  doc.text('Total: $1,250.00', 20, 60)
  doc.text('Date: 2024-01-15', 20, 70)

  // Second page - second invoice
  doc.addPage()
  doc.setFontSize(16)
  doc.text('INVOICE #2', 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text('Invoice Number: INV-2024-002', 20, 40)
  doc.text('Vendor: XYZ Supplies', 20, 50)
  doc.text('Total: $850.50', 20, 60)
  doc.text('Date: 2024-01-20', 20, 70)

  return doc
}

function createPoorQualityInvoice() {
  const doc = new jsPDF()

  // Intentionally poor formatting to test confidence detection
  doc.setFontSize(8)
  doc.text('invoice', 20, 20) // lowercase, small font
  doc.text('numb3r: 1NV-20Z4-00X', 20, 30) // mixed characters
  doc.text('vend0r: 4BC C0nstruct10n', 20, 40) // mixed characters
  doc.text('t0t4l: $1,Z50.0O', 20, 50) // mixed characters
  doc.text('d4te: Z0Z4-O1-15', 20, 60) // mixed characters

  return doc
}

function createKnownInvoice() {
  const doc = new jsPDF()

  // Known good values for validation testing
  doc.setFontSize(16)
  doc.text('INVOICE', 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text('Invoice Number: INV-2024-001', 20, 40)
  doc.text('Vendor: ABC Construction', 20, 50)
  doc.text('Total: $1,250.00', 20, 60)
  doc.text('Date: 2024-01-15', 20, 70)
  doc.text('Description: Foundation and concrete work', 20, 80)

  return doc
}

// Generate test PDFs
async function generateTestPDFs() {
  try {
    const fixturesDir = __dirname

    // Generate test invoice
    const testInvoice = createTestInvoice()
    fs.writeFileSync(
      path.join(fixturesDir, 'test-invoice.pdf'),
      Buffer.from(testInvoice.output('arraybuffer'))
    )

    // Generate multi-invoice PDF
    const multiInvoice = createMultiInvoicePDF()
    fs.writeFileSync(
      path.join(fixturesDir, 'multi-invoice.pdf'),
      Buffer.from(multiInvoice.output('arraybuffer'))
    )

    // Generate poor quality invoice
    const poorQuality = createPoorQualityInvoice()
    fs.writeFileSync(
      path.join(fixturesDir, 'poor-quality-invoice.pdf'),
      Buffer.from(poorQuality.output('arraybuffer'))
    )

    // Generate known invoice
    const knownInvoice = createKnownInvoice()
    fs.writeFileSync(
      path.join(fixturesDir, 'known-invoice.pdf'),
      Buffer.from(knownInvoice.output('arraybuffer'))
    )

    // Copy known invoice as other test files
    fs.copyFileSync(
      path.join(fixturesDir, 'known-invoice.pdf'),
      path.join(fixturesDir, 'large-invoice.pdf')
    )
    fs.copyFileSync(
      path.join(fixturesDir, 'known-invoice.pdf'),
      path.join(fixturesDir, 'training-invoice.pdf')
    )

    // Create a corrupted PDF (just some invalid content)
    fs.writeFileSync(path.join(fixturesDir, 'corrupted-file.pdf'), 'This is not a valid PDF file')

    console.log('Test PDF fixtures generated successfully!')
  } catch (error) {
    console.error('Error generating test PDFs:', error)
  }
}

// Run if called directly
if (require.main === module) {
  generateTestPDFs()
}

module.exports = { generateTestPDFs }
