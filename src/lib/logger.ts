/**
 * Structured Logging System
 * Production-ready logging with levels, contexts, and structured output
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogContext {
  userId?: string
  requestId?: string
  projectId?: string
  component?: string
  function?: string
  duration?: number
  metadata?: Record<string, any>
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private readonly logLevel: LogLevel
  private readonly isDevelopment: boolean

  constructor() {
    // Set log level based on environment
    this.isDevelopment = process.env.NODE_ENV === 'development'

    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase()
    switch (envLogLevel) {
      case 'ERROR':
        this.logLevel = LogLevel.ERROR
        break
      case 'WARN':
        this.logLevel = LogLevel.WARN
        break
      case 'INFO':
        this.logLevel = LogLevel.INFO
        break
      case 'DEBUG':
        this.logLevel = LogLevel.DEBUG
        break
      default:
        // Default to INFO in production, DEBUG in development
        this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  private formatLogEntry(
    level: string,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    }

    if (context) {
      entry.context = { ...context }
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      }
    }

    return entry
  }

  private output(entry: LogEntry): void {
    if (this.isDevelopment) {
      // Pretty formatting for development
      const contextStr = entry.context
        ? ` [${Object.entries(entry.context)
            .filter(([_, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${k}:${v}`)
            .join(' ')}]`
        : ''

      const prefix = `[${entry.level}]${contextStr}`

      switch (entry.level) {
        case 'ERROR':
          console.error(`${prefix} ${entry.message}`, entry.error || '')
          break
        case 'WARN':
          console.warn(`${prefix} ${entry.message}`)
          break
        case 'INFO':
          console.info(`${prefix} ${entry.message}`)
          break
        case 'DEBUG':
          console.log(`${prefix} ${entry.message}`)
          break
      }
    } else {
      // Structured JSON for production
      console.log(JSON.stringify(entry))
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.formatLogEntry('ERROR', message, context, error)
      this.output(entry)
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.formatLogEntry('WARN', message, context)
      this.output(entry)
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.formatLogEntry('INFO', message, context)
      this.output(entry)
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.formatLogEntry('DEBUG', message, context)
      this.output(entry)
    }
  }

  /**
   * Log API request/response
   */
  apiLog(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level =
      statusCode >= 400 ? LogLevel.ERROR : statusCode >= 300 ? LogLevel.WARN : LogLevel.INFO

    if (this.shouldLog(level)) {
      const message = `${method} ${path} - ${statusCode} (${duration}ms)`
      const logContext: LogContext = {
        ...context,
        component: 'API',
        duration,
        metadata: {
          method,
          path,
          statusCode,
        },
      }

      const levelString =
        level === LogLevel.ERROR ? 'ERROR' : level === LogLevel.WARN ? 'WARN' : 'INFO'
      const entry = this.formatLogEntry(levelString, message, logContext)
      this.output(entry)
    }
  }

  /**
   * Log authentication events
   */
  authLog(event: string, success: boolean, context?: LogContext): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN

    if (this.shouldLog(level)) {
      const message = `Auth ${event}: ${success ? 'SUCCESS' : 'FAILED'}`
      const logContext: LogContext = {
        ...context,
        component: 'AUTH',
        metadata: {
          event,
          success,
        },
      }

      const entry = this.formatLogEntry(success ? 'INFO' : 'WARN', message, logContext)
      this.output(entry)
    }
  }

  /**
   * Log database operations
   */
  dbLog(operation: string, table: string, duration: number, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const message = `DB ${operation} on ${table} (${duration}ms)`
      const logContext: LogContext = {
        ...context,
        component: 'DATABASE',
        duration,
        metadata: {
          operation,
          table,
        },
      }

      const entry = this.formatLogEntry('DEBUG', message, logContext)
      this.output(entry)
    }
  }

  /**
   * Log file operations
   */
  fileLog(operation: string, filename: string, size?: number, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const message = `File ${operation}: ${filename}${size ? ` (${Math.round(size / 1024)}KB)` : ''}`
      const logContext: LogContext = {
        ...context,
        component: 'FILE_STORAGE',
        metadata: {
          operation,
          filename,
          size,
        },
      }

      const entry = this.formatLogEntry('INFO', message, logContext)
      this.output(entry)
    }
  }

  /**
   * Log AI/LLM operations
   */
  aiLog(
    operation: string,
    model: string,
    tokens?: number,
    cost?: number,
    context?: LogContext
  ): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const message = `AI ${operation} with ${model}${tokens ? ` (${tokens} tokens)` : ''}${cost ? ` ($${cost.toFixed(4)})` : ''}`
      const logContext: LogContext = {
        ...context,
        component: 'AI_SERVICE',
        metadata: {
          operation,
          model,
          tokens,
          cost,
        },
      }

      const entry = this.formatLogEntry('INFO', message, logContext)
      this.output(entry)
    }
  }

  /**
   * Performance timing utility
   */
  timer(name: string): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.debug(`Timer ${name}: ${duration}ms`, {
        component: 'PERFORMANCE',
        duration,
        metadata: { timer: name },
      })
    }
  }

  /**
   * Create a child logger with context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger()
    // Override methods to include parent context
    const originalMethods = {
      error: childLogger.error.bind(childLogger),
      warn: childLogger.warn.bind(childLogger),
      info: childLogger.info.bind(childLogger),
      debug: childLogger.debug.bind(childLogger),
    }

    childLogger.error = (message: string, childContext?: LogContext, error?: Error) => {
      originalMethods.error(message, { ...context, ...childContext }, error)
    }

    childLogger.warn = (message: string, childContext?: LogContext) => {
      originalMethods.warn(message, { ...context, ...childContext })
    }

    childLogger.info = (message: string, childContext?: LogContext) => {
      originalMethods.info(message, { ...context, ...childContext })
    }

    childLogger.debug = (message: string, childContext?: LogContext) => {
      originalMethods.debug(message, { ...context, ...childContext })
    }

    return childLogger
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience function for request-scoped logging
export function createRequestLogger(requestId: string, userId?: string): Logger {
  return logger.child({
    requestId,
    userId,
  })
}

// Export type for external use
export type { Logger as LoggerType }
