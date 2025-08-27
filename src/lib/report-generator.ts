/**
 * Advanced Reporting & Export System
 * Generates comprehensive reports with PDF export capabilities
 */

export interface ReportData {
  type: 'project' | 'invoice' | 'analytics' | 'cost-tracking' | 'milestone' | 'summary'
  title: string
  subtitle?: string
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  data: any
  metadata?: {
    generatedBy: string
    generatedAt: Date
    version: string
    projectId?: string
  }
}

export interface ReportConfig {
  format: 'pdf' | 'csv' | 'xlsx' | 'json'
  template: 'standard' | 'detailed' | 'executive' | 'financial'
  includeCharts: boolean
  includeTables: boolean
  includeDetails: boolean
  orientation?: 'portrait' | 'landscape'
  pageSize?: 'A4' | 'letter' | 'legal'
  branding?: {
    logo?: string
    companyName?: string
    colors?: {
      primary: string
      secondary: string
    }
  }
}

export interface ProjectReportData {
  project: {
    id: string
    name: string
    description?: string
    status: string
    budget: number
    currency: string
    startDate?: string
    endDate?: string
    progress: number
  }
  summary: {
    totalBudget: number
    budgetUsed: number
    budgetRemaining: number
    budgetUsedPercent: number
    isOverBudget: boolean
    totalTrades: number
    totalInvoices: number
    totalMilestones: number
    completedMilestones: number
    healthScore: number
  }
  trades?: Array<{
    id: string
    name: string
    budget: number
    actualCost: number
    variance: number
    status: string
  }>
  milestones?: Array<{
    id: string
    name: string
    targetDate: string
    completionDate?: string
    status: string
    paymentAmount: number
    percentComplete: number
  }>
  invoices?: Array<{
    id: string
    supplier: string
    amount: number
    date: string
    status: string
    description?: string
  }>
  analytics?: {
    costTrends: Array<{
      date: string
      budgetUsed: number
      invoiceTotal: number
    }>
    tradePerformance: Array<{
      trade: string
      budget: number
      actual: number
      variance: number
      efficiency: number
    }>
  }
}

export interface InvoiceReportData {
  summary: {
    totalInvoices: number
    totalAmount: number
    pendingAmount: number
    approvedAmount: number
    paidAmount: number
    averageInvoiceValue: number
  }
  invoices: Array<{
    id: string
    supplier: string
    amount: number
    date: string
    status: string
    project: string
    description?: string
    lineItems?: Array<{
      description: string
      quantity: number
      unitPrice: number
      totalPrice: number
    }>
  }>
  byStatus: {
    pending: number
    approved: number
    paid: number
  }
  bySupplier: Array<{
    supplier: string
    totalAmount: number
    invoiceCount: number
    averageValue: number
  }>
  trends?: Array<{
    month: string
    totalAmount: number
    invoiceCount: number
    averageValue: number
  }>
}

export class ReportGenerator {
  private apiEndpoint = '/api/reports'
  
  /**
   * Generate a comprehensive project report
   */
  async generateProjectReport(
    projectId: string,
    config: ReportConfig = this.getDefaultConfig()
  ): Promise<{ success: boolean; data?: Blob; url?: string; error?: string }> {
    try {
      const reportData = await this.fetchProjectReportData(projectId)
      
      if (!reportData) {
        return { success: false, error: 'Failed to fetch project data' }
      }

      const report: ReportData = {
        type: 'project',
        title: `Project Report - ${reportData.project.name}`,
        subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        dateRange: reportData.project.startDate && reportData.project.endDate ? {
          startDate: new Date(reportData.project.startDate),
          endDate: new Date(reportData.project.endDate)
        } : undefined,
        data: reportData,
        metadata: {
          generatedBy: 'BuildTrack System',
          generatedAt: new Date(),
          version: '1.0.0',
          projectId
        }
      }

      return await this.generateReport(report, config)
    } catch (error) {
      console.error('Error generating project report:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Generate an invoice summary report
   */
  async generateInvoiceReport(
    filters?: {
      projectId?: string
      dateFrom?: string
      dateTo?: string
      status?: string
      supplier?: string
    },
    config: ReportConfig = this.getDefaultConfig()
  ): Promise<{ success: boolean; data?: Blob; url?: string; error?: string }> {
    try {
      const reportData = await this.fetchInvoiceReportData(filters)
      
      if (!reportData) {
        return { success: false, error: 'Failed to fetch invoice data' }
      }

      const report: ReportData = {
        type: 'invoice',
        title: 'Invoice Summary Report',
        subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        dateRange: filters?.dateFrom && filters?.dateTo ? {
          startDate: new Date(filters.dateFrom),
          endDate: new Date(filters.dateTo)
        } : undefined,
        data: reportData,
        metadata: {
          generatedBy: 'BuildTrack System',
          generatedAt: new Date(),
          version: '1.0.0'
        }
      }

      return await this.generateReport(report, config)
    } catch (error) {
      console.error('Error generating invoice report:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Generate analytics report
   */
  async generateAnalyticsReport(
    projectId: string,
    timeRange: string = '90d',
    config: ReportConfig = this.getDefaultConfig()
  ): Promise<{ success: boolean; data?: Blob; url?: string; error?: string }> {
    try {
      const analyticsData = await this.fetchAnalyticsData(projectId, timeRange)
      
      if (!analyticsData) {
        return { success: false, error: 'Failed to fetch analytics data' }
      }

      const report: ReportData = {
        type: 'analytics',
        title: `Analytics Report - ${analyticsData.project?.name || 'Project'}`,
        subtitle: `${timeRange} Analysis - Generated on ${new Date().toLocaleDateString()}`,
        data: analyticsData,
        metadata: {
          generatedBy: 'BuildTrack System',
          generatedAt: new Date(),
          version: '1.0.0',
          projectId
        }
      }

      return await this.generateReport(report, config)
    } catch (error) {
      console.error('Error generating analytics report:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Generate cost tracking report
   */
  async generateCostTrackingReport(
    projectId: string,
    config: ReportConfig = this.getDefaultConfig()
  ): Promise<{ success: boolean; data?: Blob; url?: string; error?: string }> {
    try {
      const costData = await this.fetchCostTrackingData(projectId)
      
      if (!costData) {
        return { success: false, error: 'Failed to fetch cost tracking data' }
      }

      const report: ReportData = {
        type: 'cost-tracking',
        title: `Cost Tracking Report - ${costData.project?.name || 'Project'}`,
        subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        data: costData,
        metadata: {
          generatedBy: 'BuildTrack System',
          generatedAt: new Date(),
          version: '1.0.0',
          projectId
        }
      }

      return await this.generateReport(report, config)
    } catch (error) {
      console.error('Error generating cost tracking report:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(
    projectIds?: string[],
    config: ReportConfig = { ...this.getDefaultConfig(), template: 'executive' }
  ): Promise<{ success: boolean; data?: Blob; url?: string; error?: string }> {
    try {
      const summaryData = await this.fetchExecutiveSummaryData(projectIds)
      
      if (!summaryData) {
        return { success: false, error: 'Failed to fetch executive summary data' }
      }

      const report: ReportData = {
        type: 'summary',
        title: 'Executive Summary',
        subtitle: `Portfolio Overview - Generated on ${new Date().toLocaleDateString()}`,
        data: summaryData,
        metadata: {
          generatedBy: 'BuildTrack System',
          generatedAt: new Date(),
          version: '1.0.0'
        }
      }

      return await this.generateReport(report, config)
    } catch (error) {
      console.error('Error generating executive summary:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Core report generation method
   */
  private async generateReport(
    reportData: ReportData, 
    config: ReportConfig
  ): Promise<{ success: boolean; data?: Blob; url?: string; error?: string }> {
    try {
      if (config.format === 'json') {
        // Return JSON data directly
        const jsonBlob = new Blob([JSON.stringify(reportData, null, 2)], {
          type: 'application/json'
        })
        
        const url = URL.createObjectURL(jsonBlob)
        return { success: true, data: jsonBlob, url }
      }

      if (config.format === 'csv') {
        return await this.generateCSVReport(reportData, config)
      }

      if (config.format === 'pdf') {
        return await this.generatePDFReport(reportData, config)
      }

      if (config.format === 'xlsx') {
        return await this.generateExcelReport(reportData, config)
      }

      return { success: false, error: `Unsupported format: ${config.format}` }
    } catch (error) {
      console.error('Error in generateReport:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Generate PDF report using browser APIs
   */
  private async generatePDFReport(
    reportData: ReportData,
    config: ReportConfig
  ): Promise<{ success: boolean; data?: Blob; url?: string; error?: string }> {
    try {
      // Create HTML content for PDF generation
      const htmlContent = await this.generateHTMLReport(reportData, config)
      
      // For now, we'll create a PDF using the browser's print functionality
      // In a production environment, you might want to use a service like Puppeteer or jsPDF
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('Could not open print window')
      }

      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      // Trigger print dialog
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 1000)

      // For this demo, we'll return success but no blob since we used print
      return { success: true }
    } catch (error) {
      console.error('Error generating PDF:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'PDF generation failed' 
      }
    }
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(
    reportData: ReportData,
    config: ReportConfig
  ): Promise<{ success: boolean; data?: Blob; url?: string; error?: string }> {
    try {
      let csvContent = ''

      if (reportData.type === 'project' && reportData.data) {
        csvContent = this.projectDataToCSV(reportData.data)
      } else if (reportData.type === 'invoice' && reportData.data) {
        csvContent = this.invoiceDataToCSV(reportData.data)
      } else {
        // Generic CSV export
        csvContent = this.genericDataToCSV(reportData.data)
      }

      const csvBlob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(csvBlob)

      return { success: true, data: csvBlob, url }
    } catch (error) {
      console.error('Error generating CSV:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'CSV generation failed' 
      }
    }
  }

  /**
   * Generate Excel report (placeholder - would need a library like exceljs)
   */
  private async generateExcelReport(
    reportData: ReportData,
    config: ReportConfig
  ): Promise<{ success: boolean; data?: Blob; url?: string; error?: string }> {
    // For now, fallback to CSV
    return await this.generateCSVReport(reportData, config)
  }

  /**
   * Generate HTML content for reports
   */
  private async generateHTMLReport(reportData: ReportData, config: ReportConfig): Promise<string> {
    const styles = this.getReportStyles(config)
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${reportData.title}</title>
        <style>${styles}</style>
    </head>
    <body>
        <div class="report-container">
            <header class="report-header">
                ${config.branding?.companyName ? `<h1>${config.branding.companyName}</h1>` : ''}
                <h2>${reportData.title}</h2>
                ${reportData.subtitle ? `<p class="subtitle">${reportData.subtitle}</p>` : ''}
                <div class="metadata">
                    <p>Generated: ${reportData.metadata?.generatedAt?.toLocaleString()}</p>
                    ${reportData.dateRange ? `
                        <p>Report Period: ${reportData.dateRange.startDate.toLocaleDateString()} - ${reportData.dateRange.endDate.toLocaleDateString()}</p>
                    ` : ''}
                </div>
            </header>
            
            <main class="report-content">
                ${await this.generateReportContent(reportData, config)}
            </main>
            
            <footer class="report-footer">
                <p>Generated by BuildTrack - Construction Project Management System</p>
                <p>Page 1 of 1</p>
            </footer>
        </div>
    </body>
    </html>
    `
  }

  /**
   * Generate report-specific content
   */
  private async generateReportContent(reportData: ReportData, config: ReportConfig): Promise<string> {
    switch (reportData.type) {
      case 'project':
        return this.generateProjectReportContent(reportData.data, config)
      case 'invoice':
        return this.generateInvoiceReportContent(reportData.data, config)
      case 'analytics':
        return this.generateAnalyticsReportContent(reportData.data, config)
      case 'cost-tracking':
        return this.generateCostTrackingReportContent(reportData.data, config)
      case 'summary':
        return this.generateSummaryReportContent(reportData.data, config)
      default:
        return '<p>Report content not available</p>'
    }
  }

  /**
   * Generate project report content
   */
  private generateProjectReportContent(data: ProjectReportData, config: ReportConfig): string {
    return `
    <section class="project-overview">
        <h3>Project Overview</h3>
        <div class="overview-grid">
            <div class="overview-item">
                <label>Project Name:</label>
                <span>${data.project.name}</span>
            </div>
            <div class="overview-item">
                <label>Status:</label>
                <span class="status-${data.project.status.toLowerCase()}">${data.project.status}</span>
            </div>
            <div class="overview-item">
                <label>Total Budget:</label>
                <span class="currency">${this.formatCurrency(data.project.budget, data.project.currency)}</span>
            </div>
            <div class="overview-item">
                <label>Budget Used:</label>
                <span class="currency">${this.formatCurrency(data.summary.budgetUsed, data.project.currency)} (${data.summary.budgetUsedPercent.toFixed(1)}%)</span>
            </div>
            <div class="overview-item">
                <label>Progress:</label>
                <span>${data.project.progress}%</span>
            </div>
            <div class="overview-item">
                <label>Health Score:</label>
                <span class="health-score">${data.summary.healthScore}%</span>
            </div>
        </div>
    </section>

    ${config.includeTables && data.trades ? `
    <section class="trades-section">
        <h3>Trade Breakdown</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Trade</th>
                    <th>Budget</th>
                    <th>Actual Cost</th>
                    <th>Variance</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.trades.map(trade => `
                <tr>
                    <td>${trade.name}</td>
                    <td class="currency">${this.formatCurrency(trade.budget, data.project.currency)}</td>
                    <td class="currency">${this.formatCurrency(trade.actualCost, data.project.currency)}</td>
                    <td class="variance ${trade.variance < 0 ? 'negative' : 'positive'}">
                        ${this.formatCurrency(Math.abs(trade.variance), data.project.currency)}
                        ${trade.variance < 0 ? ' over' : ' under'}
                    </td>
                    <td class="status-${trade.status.toLowerCase()}">${trade.status}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </section>
    ` : ''}

    ${config.includeTables && data.milestones ? `
    <section class="milestones-section">
        <h3>Milestones</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Milestone</th>
                    <th>Target Date</th>
                    <th>Completion Date</th>
                    <th>Payment Amount</th>
                    <th>Progress</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.milestones.map(milestone => `
                <tr>
                    <td>${milestone.name}</td>
                    <td>${new Date(milestone.targetDate).toLocaleDateString()}</td>
                    <td>${milestone.completionDate ? new Date(milestone.completionDate).toLocaleDateString() : 'Pending'}</td>
                    <td class="currency">${this.formatCurrency(milestone.paymentAmount, data.project.currency)}</td>
                    <td>${milestone.percentComplete}%</td>
                    <td class="status-${milestone.status.toLowerCase()}">${milestone.status}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </section>
    ` : ''}
    `
  }

  /**
   * Generate invoice report content
   */
  private generateInvoiceReportContent(data: InvoiceReportData, config: ReportConfig): string {
    return `
    <section class="invoice-summary">
        <h3>Invoice Summary</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <label>Total Invoices:</label>
                <span>${data.summary.totalInvoices}</span>
            </div>
            <div class="summary-item">
                <label>Total Amount:</label>
                <span class="currency">${this.formatCurrency(data.summary.totalAmount)}</span>
            </div>
            <div class="summary-item">
                <label>Pending:</label>
                <span class="currency">${this.formatCurrency(data.summary.pendingAmount)}</span>
            </div>
            <div class="summary-item">
                <label>Paid:</label>
                <span class="currency">${this.formatCurrency(data.summary.paidAmount)}</span>
            </div>
        </div>
    </section>

    ${config.includeTables ? `
    <section class="invoices-section">
        <h3>Invoice Details</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Amount</th>
                    <th>Project</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.invoices.slice(0, 50).map(invoice => `
                <tr>
                    <td>${new Date(invoice.date).toLocaleDateString()}</td>
                    <td>${invoice.supplier}</td>
                    <td class="currency">${this.formatCurrency(invoice.amount)}</td>
                    <td>${invoice.project}</td>
                    <td class="status-${invoice.status.toLowerCase()}">${invoice.status}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ${data.invoices.length > 50 ? `<p class="note">Showing first 50 of ${data.invoices.length} invoices</p>` : ''}
    </section>
    ` : ''}
    `
  }

  /**
   * Generate analytics report content
   */
  private generateAnalyticsReportContent(data: any, config: ReportConfig): string {
    return `
    <section class="analytics-summary">
        <h3>Analytics Summary</h3>
        <p>Detailed analytics content would be generated here based on the data structure.</p>
        ${config.includeCharts ? '<div class="charts-placeholder">[Charts would be rendered here]</div>' : ''}
    </section>
    `
  }

  /**
   * Generate cost tracking report content
   */
  private generateCostTrackingReportContent(data: any, config: ReportConfig): string {
    return `
    <section class="cost-tracking-summary">
        <h3>Cost Tracking Summary</h3>
        <p>Detailed cost tracking content would be generated here based on the data structure.</p>
    </section>
    `
  }

  /**
   * Generate summary report content
   */
  private generateSummaryReportContent(data: any, config: ReportConfig): string {
    return `
    <section class="executive-summary">
        <h3>Executive Summary</h3>
        <p>High-level summary content would be generated here based on the data structure.</p>
    </section>
    `
  }

  /**
   * Convert project data to CSV format
   */
  private projectDataToCSV(data: ProjectReportData): string {
    const headers = ['Project Name', 'Status', 'Total Budget', 'Budget Used', 'Budget Used %', 'Progress %', 'Health Score']
    const projectRow = [
      data.project.name,
      data.project.status,
      data.project.budget,
      data.summary.budgetUsed,
      data.summary.budgetUsedPercent.toFixed(1),
      data.project.progress,
      data.summary.healthScore
    ]

    let csv = headers.join(',') + '\n'
    csv += projectRow.join(',') + '\n\n'

    if (data.trades) {
      csv += 'Trade Breakdown\n'
      csv += 'Trade,Budget,Actual Cost,Variance,Status\n'
      data.trades.forEach(trade => {
        csv += `${trade.name},${trade.budget},${trade.actualCost},${trade.variance},${trade.status}\n`
      })
    }

    return csv
  }

  /**
   * Convert invoice data to CSV format
   */
  private invoiceDataToCSV(data: InvoiceReportData): string {
    const headers = ['Date', 'Supplier', 'Amount', 'Project', 'Status']
    let csv = headers.join(',') + '\n'

    data.invoices.forEach(invoice => {
      csv += `${invoice.date},${invoice.supplier},${invoice.amount},${invoice.project},${invoice.status}\n`
    })

    return csv
  }

  /**
   * Generic data to CSV conversion
   */
  private genericDataToCSV(data: any): string {
    if (!data || typeof data !== 'object') {
      return 'No data available'
    }

    const keys = Object.keys(data)
    const headers = keys.join(',')
    const values = keys.map(key => String(data[key])).join(',')

    return headers + '\n' + values
  }

  /**
   * Get default report configuration
   */
  private getDefaultConfig(): ReportConfig {
    return {
      format: 'pdf',
      template: 'standard',
      includeCharts: true,
      includeTables: true,
      includeDetails: true,
      orientation: 'portrait',
      pageSize: 'A4',
      branding: {
        companyName: 'BuildTrack',
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b'
        }
      }
    }
  }

  /**
   * Get report styles
   */
  private getReportStyles(config: ReportConfig): string {
    const primaryColor = config.branding?.colors?.primary || '#3b82f6'
    const secondaryColor = config.branding?.colors?.secondary || '#64748b'

    return `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #334155;
        background: white;
    }
    
    .report-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
    }
    
    .report-header {
        border-bottom: 3px solid ${primaryColor};
        padding-bottom: 20px;
        margin-bottom: 30px;
    }
    
    .report-header h1 {
        color: ${primaryColor};
        font-size: 24px;
        margin-bottom: 10px;
    }
    
    .report-header h2 {
        color: #1e293b;
        font-size: 20px;
        margin-bottom: 5px;
    }
    
    .subtitle {
        color: ${secondaryColor};
        font-size: 14px;
        margin-bottom: 10px;
    }
    
    .metadata p {
        color: ${secondaryColor};
        font-size: 12px;
        margin-bottom: 3px;
    }
    
    .report-content section {
        margin-bottom: 30px;
    }
    
    .report-content h3 {
        color: ${primaryColor};
        font-size: 18px;
        margin-bottom: 15px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 5px;
    }
    
    .overview-grid, .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin-bottom: 20px;
    }
    
    .overview-item, .summary-item {
        display: flex;
        flex-direction: column;
        padding: 10px;
        background: #f8fafc;
        border-radius: 4px;
    }
    
    .overview-item label, .summary-item label {
        font-weight: 600;
        color: ${secondaryColor};
        font-size: 12px;
        margin-bottom: 5px;
    }
    
    .overview-item span, .summary-item span {
        font-weight: 500;
        color: #1e293b;
    }
    
    .currency {
        color: ${primaryColor};
        font-weight: 600;
    }
    
    .status-planning { color: #6b7280; }
    .status-in_progress { color: ${primaryColor}; }
    .status-on_hold { color: #f59e0b; }
    .status-completed { color: #10b981; }
    .status-cancelled { color: #ef4444; }
    
    .health-score {
        font-weight: 600;
    }
    
    .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    }
    
    .data-table th {
        background: ${primaryColor};
        color: white;
        padding: 12px;
        text-align: left;
        font-weight: 600;
        font-size: 14px;
    }
    
    .data-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 14px;
    }
    
    .data-table tbody tr:hover {
        background: #f8fafc;
    }
    
    .variance.negative {
        color: #ef4444;
        font-weight: 600;
    }
    
    .variance.positive {
        color: #10b981;
        font-weight: 600;
    }
    
    .note {
        color: ${secondaryColor};
        font-size: 12px;
        font-style: italic;
    }
    
    .charts-placeholder {
        background: #f1f5f9;
        border: 2px dashed #cbd5e1;
        padding: 40px;
        text-align: center;
        color: ${secondaryColor};
        margin: 20px 0;
    }
    
    .report-footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        color: ${secondaryColor};
        font-size: 12px;
    }
    
    @media print {
        .report-container {
            margin: 0;
            padding: 20px;
        }
        
        body {
            -webkit-print-color-adjust: exact;
        }
    }
    `
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number, currency: string = 'NZD'): string {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  /**
   * Data fetching methods
   */
  private async fetchProjectReportData(projectId: string): Promise<ProjectReportData | null> {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error)
      }

      // Transform the API response to match our ProjectReportData interface
      const project = data.data
      return {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          budget: project.totalBudget || project.budget || 0,
          currency: project.currency || 'NZD',
          startDate: project.startDate,
          endDate: project.estimatedEndDate || project.endDate,
          progress: project.progress || 0
        },
        summary: {
          totalBudget: project.totalBudget || project.budget || 0,
          budgetUsed: project.stats?.budgetUsed || 0,
          budgetRemaining: project.stats?.budgetRemaining || project.totalBudget || 0,
          budgetUsedPercent: project.stats?.budgetUsedPercent || 0,
          isOverBudget: project.stats?.isOverBudget || false,
          totalTrades: project.stats?.totalTrades || 0,
          totalInvoices: project.stats?.totalInvoices || 0,
          totalMilestones: project.stats?.totalMilestones || 0,
          completedMilestones: project.stats?.completedMilestones || 0,
          healthScore: this.calculateHealthScore(project)
        }
      }
    } catch (error) {
      console.error('Error fetching project report data:', error)
      return null
    }
  }

  private async fetchInvoiceReportData(filters?: any): Promise<InvoiceReportData | null> {
    try {
      const queryParams = new URLSearchParams()
      if (filters) {
        Object.keys(filters).forEach(key => {
          if (filters[key]) {
            queryParams.append(key, filters[key])
          }
        })
      }

      const response = await fetch(`/api/invoices?${queryParams.toString()}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error)
      }

      const invoices = data.invoices || []
      
      // Calculate summary statistics
      const totalAmount = invoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
      const pendingAmount = invoices.filter((inv: any) => inv.status === 'PENDING').reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
      const approvedAmount = invoices.filter((inv: any) => inv.status === 'APPROVED').reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
      const paidAmount = invoices.filter((inv: any) => inv.status === 'PAID').reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)

      return {
        summary: {
          totalInvoices: invoices.length,
          totalAmount,
          pendingAmount,
          approvedAmount,
          paidAmount,
          averageInvoiceValue: invoices.length > 0 ? totalAmount / invoices.length : 0
        },
        invoices: invoices.map((inv: any) => ({
          id: inv.id,
          supplier: inv.vendor || inv.supplier || 'Unknown',
          amount: inv.totalAmount || 0,
          date: inv.invoiceDate || inv.createdAt,
          status: inv.status,
          project: inv.project?.name || 'Unknown',
          description: inv.description
        })),
        byStatus: {
          pending: invoices.filter((inv: any) => inv.status === 'PENDING').length,
          approved: invoices.filter((inv: any) => inv.status === 'APPROVED').length,
          paid: invoices.filter((inv: any) => inv.status === 'PAID').length
        },
        bySupplier: []
      }
    } catch (error) {
      console.error('Error fetching invoice report data:', error)
      return null
    }
  }

  private async fetchAnalyticsData(projectId: string, timeRange: string): Promise<any> {
    try {
      const response = await fetch(`/api/projects/${projectId}/analytics?timeRange=${timeRange}`)
      const data = await response.json()
      return data.success ? data.data : null
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      return null
    }
  }

  private async fetchCostTrackingData(projectId: string): Promise<any> {
    try {
      const response = await fetch(`/api/projects/${projectId}/cost-tracking`)
      const data = await response.json()
      return data.success ? data.data : null
    } catch (error) {
      console.error('Error fetching cost tracking data:', error)
      return null
    }
  }

  private async fetchExecutiveSummaryData(projectIds?: string[]): Promise<any> {
    try {
      const params = projectIds ? `?projects=${projectIds.join(',')}` : ''
      const response = await fetch(`/api/reports/executive-summary${params}`)
      const data = await response.json()
      return data.success ? data.data : null
    } catch (error) {
      console.error('Error fetching executive summary data:', error)
      return null
    }
  }

  private calculateHealthScore(project: any): number {
    let score = 100
    
    if (project.stats?.isOverBudget) {
      score -= 40
    } else if ((project.stats?.budgetUsedPercent || 0) > 85) {
      score -= 20
    }
    
    if (project.status === 'ON_HOLD') {
      score -= 30
    }
    
    return Math.max(0, score)
  }
}

// Export singleton instance
export const reportGenerator = new ReportGenerator()