/**
 * Error Reporting Service
 * Centralizes error handling and reporting for the application
 */

import { logger } from './logger'

export interface ErrorReport {
  error: Error
  context?: {
    userId?: string
    requestId?: string
    projectId?: string
    component?: string
    action?: string
    metadata?: Record<string, any>
  }
  severity?: 'low' | 'medium' | 'high' | 'critical'
  tags?: string[]
}

export interface ErrorReportingConfig {
  enableSentry?: boolean
  enableSlack?: boolean
  enableEmail?: boolean
  sentryDsn?: string
  slackWebhookUrl?: string
  emailEndpoint?: string
}

class ErrorReporter {
  private config: ErrorReportingConfig
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.config = {
      enableSentry: !!process.env.SENTRY_DSN,
      enableSlack: !!process.env.SLACK_WEBHOOK_URL,
      enableEmail: !!process.env.ERROR_EMAIL_ENDPOINT,
      sentryDsn: process.env.SENTRY_DSN,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      emailEndpoint: process.env.ERROR_EMAIL_ENDPOINT,
    }
  }

  /**
   * Report an error to configured services
   */
  async reportError(report: ErrorReport): Promise<void> {
    const { error, context, severity = 'medium', tags = [] } = report

    // Always log errors locally
    logger.error(
      error.message,
      {
        ...context,
        component: context?.component || 'ERROR_REPORTER',
        metadata: {
          ...context?.metadata,
          severity,
          tags,
          errorName: error.name,
          stack: error.stack,
        },
      },
      error
    )

    // In development, just log to console - don't send external notifications
    if (this.isDevelopment) {
      console.group('🚨 Error Report (Development)')
      console.error('Error:', error.message)
      console.error('Stack:', error.stack)
      if (context) console.log('Context:', context)
      console.log('Severity:', severity)
      if (tags.length) console.log('Tags:', tags)
      console.groupEnd()
      return
    }

    // Send to external services in production
    const promises: Promise<void>[] = []

    if (this.config.enableSentry) {
      promises.push(this.sendToSentry(report))
    }

    if (this.config.enableSlack && severity === 'critical') {
      promises.push(this.sendToSlack(report))
    }

    if (this.config.enableEmail && ['high', 'critical'].includes(severity)) {
      promises.push(this.sendToEmail(report))
    }

    // Don't await all promises - fire and forget for performance
    Promise.allSettled(promises).catch(reportingError => {
      logger.error(
        'Failed to send error reports',
        {
          component: 'ERROR_REPORTER',
          metadata: { originalError: error.message },
        },
        reportingError
      )
    })
  }

  /**
   * Send error to Sentry
   */
  private async sendToSentry(report: ErrorReport): Promise<void> {
    if (!this.config.sentryDsn) return

    try {
      // TODO: Implement Sentry integration
      // const Sentry = require('@sentry/node')
      // Sentry.captureException(report.error, {
      //   tags: report.tags,
      //   level: this.mapSeverityToSentryLevel(report.severity),
      //   contexts: {
      //     user: { id: report.context?.userId },
      //     request: { id: report.context?.requestId },
      //   },
      //   extra: report.context?.metadata,
      // })

      logger.debug('Would send error to Sentry', {
        component: 'ERROR_REPORTER',
        metadata: { service: 'sentry', error: report.error.message },
      })
    } catch (error) {
      logger.error(
        'Failed to send error to Sentry',
        {
          component: 'ERROR_REPORTER',
        },
        error as Error
      )
    }
  }

  /**
   * Send error to Slack
   */
  private async sendToSlack(report: ErrorReport): Promise<void> {
    if (!this.config.slackWebhookUrl) return

    try {
      const payload = {
        text: `🚨 Critical Error in BuildTrack`,
        attachments: [
          {
            color: 'danger',
            fields: [
              {
                title: 'Error',
                value: report.error.message,
                short: false,
              },
              {
                title: 'Component',
                value: report.context?.component || 'Unknown',
                short: true,
              },
              {
                title: 'User',
                value: report.context?.userId || 'Anonymous',
                short: true,
              },
              {
                title: 'Project',
                value: report.context?.projectId || 'N/A',
                short: true,
              },
              {
                title: 'Environment',
                value: process.env.NODE_ENV || 'unknown',
                short: true,
              },
            ],
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }

      const response = await fetch(this.config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Slack API returned ${response.status}`)
      }

      logger.debug('Error sent to Slack', {
        component: 'ERROR_REPORTER',
        metadata: { service: 'slack', error: report.error.message },
      })
    } catch (error) {
      logger.error(
        'Failed to send error to Slack',
        {
          component: 'ERROR_REPORTER',
        },
        error as Error
      )
    }
  }

  /**
   * Send error to email service
   */
  private async sendToEmail(report: ErrorReport): Promise<void> {
    if (!this.config.emailEndpoint) return

    try {
      const payload = {
        to: ['admin@buildtrack.com'], // TODO: Make configurable
        subject: `[BuildTrack] ${report.severity?.toUpperCase()} Error: ${report.error.message}`,
        html: this.generateEmailTemplate(report),
      }

      const response = await fetch(this.config.emailEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Email service returned ${response.status}`)
      }

      logger.debug('Error sent to email', {
        component: 'ERROR_REPORTER',
        metadata: { service: 'email', error: report.error.message },
      })
    } catch (error) {
      logger.error(
        'Failed to send error email',
        {
          component: 'ERROR_REPORTER',
        },
        error as Error
      )
    }
  }

  /**
   * Generate HTML email template
   */
  private generateEmailTemplate(report: ErrorReport): string {
    return `
      <h2>BuildTrack Error Report</h2>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr>
          <td><strong>Severity:</strong></td>
          <td>${report.severity}</td>
        </tr>
        <tr>
          <td><strong>Error:</strong></td>
          <td>${report.error.message}</td>
        </tr>
        <tr>
          <td><strong>Component:</strong></td>
          <td>${report.context?.component || 'Unknown'}</td>
        </tr>
        <tr>
          <td><strong>User ID:</strong></td>
          <td>${report.context?.userId || 'Anonymous'}</td>
        </tr>
        <tr>
          <td><strong>Project ID:</strong></td>
          <td>${report.context?.projectId || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>Time:</strong></td>
          <td>${new Date().toISOString()}</td>
        </tr>
        ${
          report.tags?.length
            ? `
        <tr>
          <td><strong>Tags:</strong></td>
          <td>${report.tags.join(', ')}</td>
        </tr>
        `
            : ''
        }
      </table>
      
      ${
        report.error.stack
          ? `
      <h3>Stack Trace</h3>
      <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;">
${report.error.stack}
      </pre>
      `
          : ''
      }

      ${
        report.context?.metadata
          ? `
      <h3>Context</h3>
      <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;">
${JSON.stringify(report.context.metadata, null, 2)}
      </pre>
      `
          : ''
      }
    `
  }

  /**
   * Convenience method for API errors
   */
  async reportApiError(
    error: Error,
    request: {
      method: string
      url: string
      userId?: string
      body?: any
    }
  ): Promise<void> {
    await this.reportError({
      error,
      context: {
        userId: request.userId,
        component: 'API',
        action: `${request.method} ${request.url}`,
        metadata: {
          method: request.method,
          url: request.url,
          body: request.body,
        },
      },
      severity: 'high',
      tags: ['api', 'server-error'],
    })
  }

  /**
   * Convenience method for authentication errors
   */
  async reportAuthError(
    error: Error,
    context: {
      userId?: string
      email?: string
      action: string
    }
  ): Promise<void> {
    await this.reportError({
      error,
      context: {
        userId: context.userId,
        component: 'AUTH',
        action: context.action,
        metadata: {
          email: context.email,
        },
      },
      severity: 'medium',
      tags: ['auth', 'security'],
    })
  }

  /**
   * Convenience method for file operation errors
   */
  async reportFileError(
    error: Error,
    context: {
      userId?: string
      operation: string
      filename: string
      size?: number
    }
  ): Promise<void> {
    await this.reportError({
      error,
      context: {
        userId: context.userId,
        component: 'FILE_STORAGE',
        action: `${context.operation} ${context.filename}`,
        metadata: {
          operation: context.operation,
          filename: context.filename,
          size: context.size,
        },
      },
      severity: 'medium',
      tags: ['file-storage'],
    })
  }
}

// Export singleton instance
export const errorReporter = new ErrorReporter()

// Export error boundary hook for React components
export function useErrorReporting() {
  return {
    reportError: errorReporter.reportError.bind(errorReporter),
    reportApiError: errorReporter.reportApiError.bind(errorReporter),
    reportAuthError: errorReporter.reportAuthError.bind(errorReporter),
    reportFileError: errorReporter.reportFileError.bind(errorReporter),
  }
}
