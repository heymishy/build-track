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
  private auth: JWT | any
  private authType: 'service_account' | 'oauth2'

  constructor(serviceAccountKey?: any, oauth2Tokens?: any) {
    // Determine authentication method
    if (oauth2Tokens) {
      this.authType = 'oauth2'
      this.setupOAuth2Auth(oauth2Tokens)
    } else {
      this.authType = 'service_account'
      this.setupServiceAccountAuth(serviceAccountKey)
    }
  }

  private setupServiceAccountAuth(serviceAccountKey?: any) {
    // Try user-provided key first, then fall back to environment
    let credentials: any = serviceAccountKey

    if (!credentials) {
      try {
        if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
          credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
        }
      } catch (error) {
        console.error('Error parsing Google service account key from environment:', error)
      }
    }

    if (!credentials) {
      throw new Error(
        'Google service account key not configured - please configure in user settings'
      )
    }

    this.auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key?.replace(/\\n/g, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
      ],
    })

    this.drive = google.drive({ version: 'v3', auth: this.auth })
  }

  private setupOAuth2Auth(oauth2Tokens: any) {
    // Create OAuth2 client with tokens
    this.auth = {
      getAccessToken: async () => {
        // Check if token is expired and refresh if needed
        if (oauth2Tokens.expiryDate && Date.now() >= oauth2Tokens.expiryDate) {
          throw new Error('OAuth2 token expired - please re-authenticate')
        }
        return { token: oauth2Tokens.accessToken }
      },
    }

    // Create drive instance with OAuth2 auth
    this.drive = google.drive({
      version: 'v3',
      auth: new google.auth.OAuth2(),
    })

    // Set credentials
    ;(this.drive as any).auth.setCredentials({
      access_token: oauth2Tokens.accessToken,
      refresh_token: oauth2Tokens.refreshToken,
      expiry_date: oauth2Tokens.expiryDate,
    })
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
   * List PDF files in a folder (recursively searches subfolders)
   */
  async listPdfFilesInFolder(folderId: string): Promise<GoogleDriveFile[]> {
    try {
      console.log(`🔍 Listing PDF files in folder: ${folderId}`)

      // Get all items in current folder
      const allFilesResponse = await this.drive.files.list({
        q: `'${folderId}' in parents`,
        fields: 'files(id,name,mimeType,size,webViewLink)',
      })

      console.log(`📁 All files in folder (${allFilesResponse.data.files?.length || 0}):`)
      allFilesResponse.data.files?.forEach(file => {
        console.log(`  - ${file.name} (${file.mimeType})`)
      })

      const allPdfs: GoogleDriveFile[] = []

      // Search for PDFs in current folder
      const pdfResponse = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/pdf'`,
        fields: 'files(id,name,mimeType,size,webViewLink)',
      })

      console.log(`📄 PDF files found in current folder: ${pdfResponse.data.files?.length || 0}`)

      // Add PDFs from current folder
      if (pdfResponse.data.files && pdfResponse.data.files.length > 0) {
        const currentFolderPdfs = pdfResponse.data.files
          .filter(file => file.id && file.name)
          .map(file => ({
            id: file.id!,
            name: file.name!,
            mimeType: file.mimeType || 'application/pdf',
            size: file.size || '0',
            webViewLink: file.webViewLink || undefined,
          }))

        currentFolderPdfs.forEach(file => console.log(`  - ${file.name}`))
        allPdfs.push(...currentFolderPdfs)
      }

      // Find subfolders and search them recursively
      const subfolders =
        allFilesResponse.data.files?.filter(
          file => file.mimeType === 'application/vnd.google-apps.folder'
        ) || []

      console.log(`📁 Found ${subfolders.length} subfolders to search`)

      for (const subfolder of subfolders) {
        if (subfolder.id && subfolder.name) {
          console.log(`🔍 Searching subfolder: ${subfolder.name}`)
          const subfolderPdfs = await this.listPdfFilesInFolder(subfolder.id)

          // Prefix subfolder PDFs with folder name for clarity
          const prefixedPdfs = subfolderPdfs.map(pdf => ({
            ...pdf,
            name: `${subfolder.name}/${pdf.name}`,
          }))

          allPdfs.push(...prefixedPdfs)
        }
      }

      // If still no PDFs found, try broader search in current folder
      if (allPdfs.length === 0) {
        const broadPdfResponse = await this.drive.files.list({
          q: `'${folderId}' in parents and (mimeType='application/pdf' or name contains '.pdf')`,
          fields: 'files(id,name,mimeType,size,webViewLink)',
        })

        console.log(`🔍 Broad PDF search found: ${broadPdfResponse.data.files?.length || 0}`)
        if (broadPdfResponse.data.files && broadPdfResponse.data.files.length > 0) {
          const broadPdfs = broadPdfResponse.data.files
            .filter(file => file.id && file.name)
            .map(file => ({
              id: file.id!,
              name: file.name!,
              mimeType: file.mimeType || 'application/pdf',
              size: file.size || '0',
              webViewLink: file.webViewLink || undefined,
            }))
          allPdfs.push(...broadPdfs)
        }
      }

      console.log(`🎯 Total PDFs found (including subfolders): ${allPdfs.length}`)

      return allPdfs
    } catch (error) {
      console.error('Error listing files in folder:', error)
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack?.slice(0, 500),
        })
      }
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

// Factory function to create service with user-specific credentials
export function getGoogleDriveService(
  serviceAccountKey?: any,
  oauth2Tokens?: any
): GoogleDriveService {
  return new GoogleDriveService(serviceAccountKey, oauth2Tokens)
}

// Helper function to create service based on user settings
export async function createGoogleDriveServiceForUser(
  userId: string,
  preferOAuth2: boolean = false
): Promise<GoogleDriveService> {
  const { SettingsService } = await import('@/lib/settings-service')
  const settingsService = new SettingsService(userId)

  if (preferOAuth2) {
    // Try OAuth2 first
    const oauth2Tokens = await settingsService.getGoogleOAuth2Tokens()
    if (oauth2Tokens) {
      return new GoogleDriveService(undefined, oauth2Tokens)
    }
  }

  // Fall back to service account
  const serviceAccountKey = await settingsService.getGoogleServiceAccountKey()
  return new GoogleDriveService(serviceAccountKey)
}
