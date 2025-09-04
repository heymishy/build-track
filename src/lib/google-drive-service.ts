/**
 * Google Drive API Service
 * Handles file uploads and downloads from Google Drive
 */

import { google, drive_v3 } from 'googleapis'
import { JWT } from 'google-auth-library'

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size: string
  downloadUrl?: string
  webViewLink?: string
}

export class GoogleDriveService {
  private drive: drive_v3.Drive
  private auth: JWT

  constructor() {
    // Initialize with service account from environment
    let serviceAccountKey: any = null

    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
      }
    } catch (error) {
      console.error('Error parsing Google service account key:', error)
    }

    if (!serviceAccountKey) {
      throw new Error('Google service account key not configured')
    }

    this.auth = new JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key?.replace(/\\n/g, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
      ],
    })

    this.drive = google.drive({ version: 'v3', auth: this.auth })
  }

  /**
   * Get file metadata from Google Drive
   */
  async getFile(fileId: string): Promise<GoogleDriveFile | null> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size,webViewLink',
      })

      const file = response.data
      if (!file.id || !file.name) {
        return null
      }

      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size || '0',
        webViewLink: file.webViewLink || undefined,
      }
    } catch (error) {
      console.error('Error getting file from Google Drive:', error)
      return null
    }
  }

  /**
   * Download file content from Google Drive
   */
  async downloadFile(fileId: string): Promise<Buffer | null> {
    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media',
      })

      if (!response.data) {
        return null
      }

      // Convert response data to Buffer
      if (Buffer.isBuffer(response.data)) {
        return response.data
      }

      if (typeof response.data === 'string') {
        return Buffer.from(response.data, 'binary')
      }

      // Handle stream or other data types
      return Buffer.from(JSON.stringify(response.data))
    } catch (error) {
      console.error('Error downloading file from Google Drive:', error)
      return null
    }
  }

  /**
   * Get file download URL (for direct downloads)
   */
  async getDownloadUrl(fileId: string): Promise<string | null> {
    try {
      // For PDFs and other files, we can use the export or direct download
      const file = await this.getFile(fileId)
      if (!file) return null

      // Generate a signed URL or use the webViewLink for viewing
      return `https://drive.google.com/uc?export=download&id=${fileId}`
    } catch (error) {
      console.error('Error generating download URL:', error)
      return null
    }
  }

  /**
   * Validate that we can access a Google Drive file
   */
  async validateFileAccess(fileId: string): Promise<boolean> {
    try {
      const file = await this.getFile(fileId)
      return file !== null
    } catch (error) {
      console.error('Error validating file access:', error)
      return false
    }
  }

  /**
   * Check if ID represents a folder
   */
  async isFolder(fileId: string): Promise<boolean> {
    try {
      const file = await this.getFile(fileId)
      return file?.mimeType === 'application/vnd.google-apps.folder'
    } catch (error) {
      return false
    }
  }

  /**
   * List PDF files in a folder
   */
  async listPdfFilesInFolder(folderId: string): Promise<GoogleDriveFile[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/pdf'`,
        fields: 'files(id,name,mimeType,size,webViewLink)',
      })

      if (!response.data.files) {
        return []
      }

      return response.data.files
        .filter(file => file.id && file.name)
        .map(file => ({
          id: file.id!,
          name: file.name!,
          mimeType: file.mimeType || 'application/pdf',
          size: file.size || '0',
          webViewLink: file.webViewLink || undefined,
        }))
    } catch (error) {
      console.error('Error listing files in folder:', error)
      return []
    }
  }

  /**
   * Extract file ID from various Google Drive URL formats
   */
  static extractFileId(url: string): string | null {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/, // https://drive.google.com/file/d/FILE_ID/view
      /\/folders\/([a-zA-Z0-9-_]+)/, // https://drive.google.com/drive/folders/FOLDER_ID
      /id=([a-zA-Z0-9-_]+)/, // https://drive.google.com/open?id=FILE_ID
      /\/d\/([a-zA-Z0-9-_]+)/, // https://docs.google.com/document/d/FILE_ID/edit
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    // If it's already just a file ID
    if (/^[a-zA-Z0-9-_]+$/.test(url) && url.length > 10) {
      return url
    }

    return null
  }

  /**
   * Check if URL is a valid Google Drive URL
   */
  static isGoogleDriveUrl(url: string): boolean {
    return /^https:\/\/(drive|docs)\.google\.com/.test(url) || this.extractFileId(url) !== null
  }
}

// Singleton instance
let driveService: GoogleDriveService | null = null

export function getGoogleDriveService(): GoogleDriveService {
  if (!driveService) {
    driveService = new GoogleDriveService()
  }
  return driveService
}
