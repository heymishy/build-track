/**
 * Custom Error Types and Classes
 * Standardized error handling for the BuildTrack application
 */

import { logger } from './logger'

// Base error interface
export interface ErrorInfo {
  code: string
  message: string
  statusCode?: number
  context?: Record<string, unknown>
  originalError?: Error
}

// Application-specific error codes
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // Resource Management
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  // Database Operations
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_CONSTRAINT_ERROR = 'DATABASE_CONSTRAINT_ERROR',

  // File Operations
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',

  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  API_RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',

  // Business Logic
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',

  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

// Base application error class
export abstract class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly context?: Record<string, unknown>
  public readonly isOperational: boolean = true
  public readonly originalError?: Error

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.context = context
    this.originalError = originalError

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)

    // Log the error creation
    logger.debug('Error created', {
      component: 'ERROR_HANDLER',
      metadata: {
        errorClass: this.name,
        code: this.code,
        statusCode: this.statusCode,
        message: this.message,
      },
    })
  }

  public toJSON(): ErrorInfo {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: process.env.NODE_ENV === 'development' ? this.originalError.stack : undefined,
          }
        : undefined,
    } as ErrorInfo
  }
}

// Authentication & Authorization Errors
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, ErrorCode.UNAUTHORIZED, 401, context)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', context?: Record<string, unknown>) {
    super(message, ErrorCode.FORBIDDEN, 403, context)
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message: string = 'Invalid credentials', context?: Record<string, unknown>) {
    super(message, ErrorCode.INVALID_CREDENTIALS, 401, context)
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = 'Token has expired', context?: Record<string, unknown>) {
    super(message, ErrorCode.TOKEN_EXPIRED, 401, context)
  }
}

// Validation Errors
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, originalError?: Error) {
    super(message, ErrorCode.VALIDATION_ERROR, 422, context, originalError)
  }
}

export class RequiredFieldError extends AppError {
  constructor(fieldName: string, context?: Record<string, unknown>) {
    super(`Field '${fieldName}' is required`, ErrorCode.REQUIRED_FIELD_MISSING, 422, {
      ...context,
      field: fieldName,
    })
  }
}

export class InvalidFormatError extends AppError {
  constructor(fieldName: string, expectedFormat: string, context?: Record<string, unknown>) {
    super(
      `Field '${fieldName}' has invalid format. Expected: ${expectedFormat}`,
      ErrorCode.INVALID_INPUT_FORMAT,
      422,
      {
        ...context,
        field: fieldName,
        expectedFormat,
      }
    )
  }
}

export class DuplicateEntryError extends AppError {
  constructor(resource: string, identifier: string, context?: Record<string, unknown>) {
    super(
      `${resource} with identifier '${identifier}' already exists`,
      ErrorCode.DUPLICATE_ENTRY,
      409,
      {
        ...context,
        resource,
        identifier,
      }
    )
  }
}

// Resource Errors
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string, context?: Record<string, unknown>) {
    const message = identifier
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`

    super(message, ErrorCode.RESOURCE_NOT_FOUND, 404, {
      ...context,
      resource,
      identifier,
    })
  }
}

export class ResourceConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.RESOURCE_CONFLICT, 409, context)
  }
}

export class ResourceLockedError extends AppError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super(
      `${resource} is currently locked and cannot be modified`,
      ErrorCode.RESOURCE_LOCKED,
      423,
      {
        ...context,
        resource,
      }
    )
  }
}

// Database Errors
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
    super(message, ErrorCode.DATABASE_QUERY_ERROR, 500, context, originalError)
  }
}

export class DatabaseConnectionError extends AppError {
  constructor(message: string = 'Database connection failed', originalError?: Error) {
    super(message, ErrorCode.DATABASE_CONNECTION_ERROR, 500, undefined, originalError)
  }
}

export class DatabaseConstraintError extends AppError {
  constructor(constraint: string, context?: Record<string, unknown>, originalError?: Error) {
    super(
      `Database constraint violation: ${constraint}`,
      ErrorCode.DATABASE_CONSTRAINT_ERROR,
      400,
      { ...context, constraint },
      originalError
    )
  }
}

// File Operation Errors
export class FileNotFoundError extends AppError {
  constructor(filename: string, context?: Record<string, unknown>) {
    super(`File '${filename}' not found`, ErrorCode.FILE_NOT_FOUND, 404, {
      ...context,
      filename,
    })
  }
}

export class FileTooLargeError extends AppError {
  constructor(filename: string, size: number, maxSize: number, context?: Record<string, unknown>) {
    super(
      `File '${filename}' is too large (${size} bytes). Maximum allowed: ${maxSize} bytes`,
      ErrorCode.FILE_TOO_LARGE,
      413,
      {
        ...context,
        filename,
        size,
        maxSize,
      }
    )
  }
}

export class InvalidFileTypeError extends AppError {
  constructor(
    filename: string,
    fileType: string,
    allowedTypes: string[],
    context?: Record<string, unknown>
  ) {
    super(
      `File '${filename}' has invalid type '${fileType}'. Allowed types: ${allowedTypes.join(', ')}`,
      ErrorCode.INVALID_FILE_TYPE,
      415,
      {
        ...context,
        filename,
        fileType,
        allowedTypes,
      }
    )
  }
}

export class FileUploadError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, originalError?: Error) {
    super(message, ErrorCode.FILE_UPLOAD_FAILED, 500, context, originalError)
  }
}

// External Service Errors
export class ExternalServiceError extends AppError {
  constructor(
    serviceName: string,
    operation: string,
    message: string,
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(
      `${serviceName} service error during ${operation}: ${message}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      502,
      {
        ...context,
        serviceName,
        operation,
      },
      originalError
    )
  }
}

export class RateLimitError extends AppError {
  constructor(service: string, resetTime?: Date, context?: Record<string, unknown>) {
    const message = resetTime
      ? `Rate limit exceeded for ${service}. Resets at ${resetTime.toISOString()}`
      : `Rate limit exceeded for ${service}`

    super(message, ErrorCode.API_RATE_LIMIT_EXCEEDED, 429, {
      ...context,
      service,
      resetTime: resetTime?.toISOString(),
    })
  }
}

// Business Logic Errors
export class InsufficientPermissionsError extends AppError {
  constructor(operation: string, requiredRole?: string, context?: Record<string, unknown>) {
    const message = requiredRole
      ? `Insufficient permissions for ${operation}. Required role: ${requiredRole}`
      : `Insufficient permissions for ${operation}`

    super(message, ErrorCode.INSUFFICIENT_PERMISSIONS, 403, {
      ...context,
      operation,
      requiredRole,
    })
  }
}

export class OperationNotAllowedError extends AppError {
  constructor(operation: string, reason: string, context?: Record<string, unknown>) {
    super(
      `Operation '${operation}' is not allowed: ${reason}`,
      ErrorCode.OPERATION_NOT_ALLOWED,
      403,
      {
        ...context,
        operation,
        reason,
      }
    )
  }
}

export class BusinessRuleViolationError extends AppError {
  constructor(rule: string, context?: Record<string, unknown>) {
    super(`Business rule violation: ${rule}`, ErrorCode.BUSINESS_RULE_VIOLATION, 400, {
      ...context,
      rule,
    })
  }
}

// System Errors
export class ConfigurationError extends AppError {
  constructor(setting: string, context?: Record<string, unknown>) {
    super(
      `Configuration error: ${setting} is not properly configured`,
      ErrorCode.CONFIGURATION_ERROR,
      500,
      {
        ...context,
        setting,
      }
    )
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string, context?: Record<string, unknown>) {
    super(`Service '${service}' is temporarily unavailable`, ErrorCode.SERVICE_UNAVAILABLE, 503, {
      ...context,
      service,
    })
  }
}

// Error classification utility
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function isClientError(error: AppError): boolean {
  return error.statusCode >= 400 && error.statusCode < 500
}

export function isServerError(error: AppError): boolean {
  return error.statusCode >= 500
}

// Error factory function
export function createError(
  code: ErrorCode,
  message: string,
  statusCode?: number,
  context?: Record<string, unknown>,
  originalError?: Error
): AppError {
  // Create appropriate error subclass based on code
  switch (code) {
    case ErrorCode.UNAUTHORIZED:
      return new UnauthorizedError(message, context)
    case ErrorCode.FORBIDDEN:
      return new ForbiddenError(message, context)
    case ErrorCode.INVALID_CREDENTIALS:
      return new InvalidCredentialsError(message, context)
    case ErrorCode.TOKEN_EXPIRED:
      return new TokenExpiredError(message, context)
    case ErrorCode.VALIDATION_ERROR:
      return new ValidationError(message, context, originalError)
    case ErrorCode.RESOURCE_NOT_FOUND:
      return new NotFoundError('Resource', undefined, context)
    case ErrorCode.DUPLICATE_ENTRY:
      return new DuplicateEntryError('Resource', 'unknown', context)
    case ErrorCode.DATABASE_CONNECTION_ERROR:
      return new DatabaseConnectionError(message, originalError)
    case ErrorCode.DATABASE_QUERY_ERROR:
      return new DatabaseError(message, originalError, context)
    case ErrorCode.FILE_UPLOAD_FAILED:
      return new FileUploadError(message, context, originalError)
    case ErrorCode.EXTERNAL_SERVICE_ERROR:
      return new ExternalServiceError('Unknown', 'unknown', message, context, originalError)
    case ErrorCode.API_RATE_LIMIT_EXCEEDED:
      return new RateLimitError('Unknown', undefined, context)
    default:
      // Fallback to generic AppError
      return new (class extends AppError {})(
        message,
        code,
        statusCode || 500,
        context,
        originalError
      )
  }
}
