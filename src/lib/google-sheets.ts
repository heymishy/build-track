/**
 * Google Sheets API Integration
 * Direct integration for invoice export
 */

import { GoogleAuth } from 'google-auth-library'

interface InvoiceExportData {
  supplier: string
  invoiceNo: string
  date: string
  customerReference: string
  description: string
  quantity: number
  unitPrice: number
  totalAmount: number
  taxableAmount: number
  plusGST: number
  total: number
}

interface ExportOptions {
  projectId?: string
  status?: string[]
  dateFrom?: Date
  dateTo?: Date
  includeAll?: boolean
}

class GoogleSheetsService {
  private auth: GoogleAuth | null = null
  private isConfigured = false

  constructor() {
    this.initializeAuth()
  }

  private async initializeAuth() {
    try {
      // Check if Google Sheets credentials are configured
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
      const privateKey = process.env.GOOGLE_PRIVATE_KEY

      if (!serviceAccountKey && !clientEmail && !privateKey) {
        console.warn('Google Sheets API not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY or individual credentials.')
        return
      }

      let credentials
      if (serviceAccountKey) {
        // Use complete service account key JSON
        credentials = JSON.parse(serviceAccountKey)
      } else if (clientEmail && privateKey) {
        // Use individual credentials
        credentials = {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        }
      } else {
        throw new Error('Incomplete Google Sheets credentials')
      }

      this.auth = new GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ],
      })

      this.isConfigured = true
      console.log('Google Sheets API initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Google Sheets API:', error)
      this.isConfigured = false
    }
  }

  async createSpreadsheet(title: string): Promise<string | null> {
    if (!this.isConfigured) {
      throw new Error('Google Sheets API not configured')
    }

    try {
      const sheets = await this.getSheetsClient()
      
      const response = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title,
          },
          sheets: [{
            properties: {
              title: 'Invoice Export',
            },
          }],
        },
      })

      const spreadsheetId = response.data.spreadsheetId
      if (!spreadsheetId) {
        throw new Error('Failed to create spreadsheet')
      }

      // Make the spreadsheet publicly viewable
      await this.setSpreadsheetPermissions(spreadsheetId)

      return spreadsheetId
    } catch (error: any) {
      console.error('Error creating spreadsheet:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      
      if (error.code === 403) {
        // Log additional diagnostic info
        console.error('403 Error Details:', {
          message: error.message,
          code: error.code,
          status: error.status,
          statusText: error.statusText,
          config: error.config ? {
            url: error.config.url,
            method: error.config.method,
            headers: error.config.headers ? Object.keys(error.config.headers) : 'none'
          } : 'no config',
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : 'no response'
        })
        
        const permissionError = new Error(
          'Permission denied. Despite Owner role and enabled APIs, spreadsheet creation failed.\n\n' +
          'Possible causes:\n' +
          '1. API propagation delay (wait 5-10 minutes after enabling)\n' +
          '2. Organization policy restrictions\n' +
          '3. Service account needs domain-wide delegation\n' +
          '4. Google Workspace domain restrictions\n' +
          '5. Billing account not properly configured\n\n' +
          'Project: plucky-hue-452808-s5\n' +
          'Service Account: build-track-sheets@plucky-hue-452808-s5.iam.gserviceaccount.com\n\n' +
          'Original error: ' + error.message
        )
        permissionError.name = 'PermissionError'
        throw permissionError
      }
      
      throw error
    }
  }

  async exportInvoicesToSheet(
    spreadsheetId: string, 
    invoices: InvoiceExportData[],
    sheetName: string = 'Invoice Export'
  ): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Google Sheets API not configured')
    }

    try {
      const sheets = await this.getSheetsClient()

      // Prepare header row
      const headers = [
        'Supplier',
        'Invoice No.',
        'Date',
        'Customer Reference',
        'Description',
        'Quantity',
        'Unit Price',
        'Total Amount',
        'Taxable Amount',
        'Plus GST',
        'Total'
      ]

      // Prepare data rows
      const rows = invoices.map(invoice => [
        invoice.supplier,
        invoice.invoiceNo,
        invoice.date,
        invoice.customerReference,
        invoice.description,
        invoice.quantity,
        `$${invoice.unitPrice.toFixed(2)}`,
        `$${invoice.totalAmount.toFixed(2)}`,
        `$${invoice.taxableAmount.toFixed(2)}`,
        `$${invoice.plusGST.toFixed(2)}`,
        `$${invoice.total.toFixed(2)}`,
      ])

      // Clear existing content and add new data
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
      })

      // Add headers and data
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...rows],
        },
      })

      // Format the header row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.9,
                      green: 0.9,
                      blue: 0.9,
                    },
                    textFormat: {
                      bold: true,
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: headers.length,
                },
              },
            },
          ],
        },
      })

      console.log(`Successfully exported ${invoices.length} invoices to Google Sheets`)
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error)
      throw error
    }
  }

  async getSpreadsheetUrl(spreadsheetId: string): Promise<string> {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  }

  private async getSheetsClient() {
    if (!this.auth) {
      throw new Error('Google Sheets authentication not initialized')
    }

    const authClient = await this.auth.getClient()
    const { google } = await import('googleapis')
    
    return google.sheets({ 
      version: 'v4', 
      auth: authClient as any 
    })
  }

  private async setSpreadsheetPermissions(spreadsheetId: string) {
    try {
      const authClient = await this.auth!.getClient()
      const { google } = await import('googleapis')
      
      const drive = google.drive({ 
        version: 'v3', 
        auth: authClient as any 
      })

      // Make the spreadsheet publicly viewable (anyone with link can view)
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      })

      console.log('Spreadsheet permissions set to public viewable')
    } catch (error) {
      console.warn('Could not set spreadsheet permissions:', error)
      // Continue without failing, as the spreadsheet may still be accessible
    }
  }

  isAvailable(): boolean {
    return this.isConfigured
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService()

// Helper function to transform invoice data for export
export function formatInvoiceForExport(invoice: any): InvoiceExportData {
  const taxableAmount = Number(invoice.totalAmount) - Number(invoice.gstAmount || 0)
  const gstAmount = Number(invoice.gstAmount || 0)

  return {
    supplier: invoice.supplierName || 'Unknown Supplier',
    invoiceNo: invoice.invoiceNumber || '',
    date: new Date(invoice.invoiceDate).toLocaleDateString('en-NZ'),
    customerReference: invoice.project?.name || invoice.notes || '',
    description: invoice.lineItems?.[0]?.description || 'Invoice',
    quantity: Number(invoice.lineItems?.[0]?.quantity || 1),
    unitPrice: Number(invoice.lineItems?.[0]?.unitPrice || invoice.totalAmount),
    totalAmount: Number(invoice.totalAmount),
    taxableAmount,
    plusGST: gstAmount,
    total: Number(invoice.totalAmount),
  }
}

// Helper function to expand line items for detailed export
export function expandInvoiceLineItems(invoice: any): InvoiceExportData[] {
  if (!invoice.lineItems || invoice.lineItems.length === 0) {
    return [formatInvoiceForExport(invoice)]
  }

  return invoice.lineItems.map((lineItem: any) => ({
    supplier: invoice.supplierName || 'Unknown Supplier',
    invoiceNo: invoice.invoiceNumber || '',
    date: new Date(invoice.invoiceDate).toLocaleDateString('en-NZ'),
    customerReference: invoice.project?.name || invoice.notes || '',
    description: lineItem.description || 'Line Item',
    quantity: Number(lineItem.quantity || 1),
    unitPrice: Number(lineItem.unitPrice || 0),
    totalAmount: Number(lineItem.totalPrice || 0),
    taxableAmount: Number(lineItem.totalPrice || 0), // Simplified - line items don't separate GST
    plusGST: 0, // GST is typically at invoice level
    total: Number(lineItem.totalPrice || 0),
  }))
}