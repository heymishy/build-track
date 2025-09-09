/**
 * File Storage Service
 * Handles file uploads to Vercel Blob with fallback for development
 */

import { put, del } from '@vercel/blob'

export interface FileUploadResult {
  url: string
  size: number
  pathname: string
}

export interface FileUploadOptions {
  access?: 'public' | 'private'
  contentType?: string
  addRandomSuffix?: boolean
}

/**
 * Upload a file to storage
 * Uses Vercel Blob in production, local storage in development
 */
export async function uploadFile(
  file: File | Buffer,
  filename: string,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  const { access = 'private', contentType, addRandomSuffix = true } = options

  // In development, simulate file upload
  if (process.env.NODE_ENV === 'development' && !process.env.BLOB_READ_WRITE_TOKEN) {
    const timestamp = Date.now()
    const safeName = addRandomSuffix ? `${timestamp}-${filename}` : filename

    return {
      url: `/uploads/${safeName}`,
      size: file instanceof File ? file.size : file.length,
      pathname: safeName,
    }
  }

  try {
    // Convert File to Buffer if needed
    let fileData: Buffer
    let fileSize: number
    let fileContentType: string

    if (file instanceof File) {
      fileData = Buffer.from(await file.arrayBuffer())
      fileSize = file.size
      fileContentType = file.type
    } else {
      fileData = file
      fileSize = file.length
      fileContentType = contentType || 'application/octet-stream'
    }

    // Upload to Vercel Blob
    const blob = await put(filename, fileData, {
      access,
      contentType: fileContentType,
      addRandomSuffix,
    })

    return {
      url: blob.url,
      size: fileSize,
      pathname: blob.pathname,
    }
  } catch (error) {
    console.error('File upload failed:', error)
    throw new Error(
      `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(url: string): Promise<boolean> {
  // Skip deletion in development with local files
  if (process.env.NODE_ENV === 'development' && url.startsWith('/uploads/')) {
    console.log(`Development: Would delete file ${url}`)
    return true
  }

  try {
    await del(url)
    return true
  } catch (error) {
    console.error('File deletion failed:', error)
    return false
  }
}

/**
 * Generate a secure filename for uploads
 */
export function generateSecureFilename(originalName: string, prefix?: string): string {
  // Extract file extension
  const extension = originalName.split('.').pop() || ''
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')

  // Sanitize filename
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .toLowerCase()
    .substring(0, 50) // Limit length

  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)

  const prefixPart = prefix ? `${prefix}_` : ''
  return `${prefixPart}${timestamp}_${random}_${sanitized}.${extension}`
}

/**
 * Validate file type and size
 */
export interface FileValidationOptions {
  allowedTypes?: string[]
  maxSizeBytes?: number
  minSizeBytes?: number
}

export interface FileValidationResult {
  valid: boolean
  errors: string[]
}

export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    allowedTypes = ['application/pdf'],
    maxSizeBytes = 10 * 1024 * 1024, // 10MB default
    minSizeBytes = 1024, // 1KB minimum
  } = options

  const errors: string[] = []

  // Check file type
  if (!allowedTypes.some(type => file.type === type || file.type.includes(type.split('/')[1]))) {
    errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / (1024 * 1024))
    errors.push(
      `File size ${Math.round(file.size / (1024 * 1024))}MB exceeds maximum of ${maxMB}MB`
    )
  }

  if (file.size < minSizeBytes) {
    errors.push(`File size ${file.size} bytes is below minimum of ${minSizeBytes} bytes`)
  }

  // Check filename
  if (!file.name || file.name.length > 255) {
    errors.push('Invalid filename')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get file URL for display (handles both Vercel Blob and local files)
 */
export function getFileDisplayUrl(fileUrl: string): string {
  // Local development files
  if (fileUrl.startsWith('/uploads/')) {
    return fileUrl
  }

  // Vercel Blob URLs are already public
  return fileUrl
}
