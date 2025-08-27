/**
 * Collaboration System
 * Handles comments, mentions, notifications, and activity feeds
 */

export interface Comment {
  id: string
  content: string
  authorId: string
  authorName: string
  authorEmail: string
  targetType: 'project' | 'invoice' | 'milestone' | 'task' | 'estimate'
  targetId: string
  parentId?: string // For threaded comments
  mentions: string[] // User IDs mentioned in the comment
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
    size: number
  }>
  createdAt: Date
  updatedAt: Date
  editHistory?: Array<{
    content: string
    editedAt: Date
    editedBy: string
  }>
  reactions?: Array<{
    type: 'like' | 'dislike' | 'heart' | 'thumbs_up' | 'thumbs_down'
    userId: string
    userName: string
    createdAt: Date
  }>
  resolved?: boolean
  resolvedBy?: string
  resolvedAt?: Date
}

export interface Notification {
  id: string
  userId: string
  type: 'comment' | 'mention' | 'assignment' | 'due_date' | 'status_change' | 'invoice_approval'
  title: string
  message: string
  targetType: 'project' | 'invoice' | 'milestone' | 'task' | 'estimate'
  targetId: string
  targetName: string
  actionUrl: string
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: Date
  createdBy?: string
  metadata?: Record<string, any>
}

export interface ActivityItem {
  id: string
  type:
    | 'comment'
    | 'status_change'
    | 'assignment'
    | 'file_upload'
    | 'milestone_completion'
    | 'budget_update'
  title: string
  description: string
  userId: string
  userName: string
  userEmail: string
  targetType: 'project' | 'invoice' | 'milestone' | 'task' | 'estimate'
  targetId: string
  targetName: string
  createdAt: Date
  metadata?: Record<string, any>
  changes?: Array<{
    field: string
    oldValue: any
    newValue: any
  }>
}

export class CollaborationService {
  private apiEndpoint = '/api/collaboration'
  private wsConnection: WebSocket | null = null
  private listeners: Map<string, Function[]> = new Map()

  constructor() {
    this.initializeWebSocket()
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  private initializeWebSocket() {
    if (typeof window === 'undefined') return

    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      this.wsConnection = new WebSocket(wsUrl)

      this.wsConnection.onopen = () => {
        console.log('WebSocket connected for collaboration')
      }

      this.wsConnection.onmessage = event => {
        try {
          const data = JSON.parse(event.data)
          this.handleRealtimeUpdate(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...')
        setTimeout(() => this.initializeWebSocket(), 5000)
      }

      this.wsConnection.onerror = error => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
    }
  }

  /**
   * Handle real-time updates from WebSocket
   */
  private handleRealtimeUpdate(data: any) {
    const { type, payload } = data

    switch (type) {
      case 'new_comment':
        this.notifyListeners('comment_added', payload)
        break
      case 'comment_updated':
        this.notifyListeners('comment_updated', payload)
        break
      case 'comment_deleted':
        this.notifyListeners('comment_deleted', payload)
        break
      case 'new_notification':
        this.notifyListeners('notification_received', payload)
        break
      case 'activity_update':
        this.notifyListeners('activity_added', payload)
        break
      default:
        console.warn('Unknown WebSocket message type:', type)
    }
  }

  /**
   * Subscribe to real-time collaboration events
   */
  subscribe(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  /**
   * Add a comment
   */
  async addComment(
    targetType: string,
    targetId: string,
    content: string,
    parentId?: string,
    attachments?: File[]
  ): Promise<{ success: boolean; data?: Comment; error?: string }> {
    try {
      const formData = new FormData()
      formData.append('targetType', targetType)
      formData.append('targetId', targetId)
      formData.append('content', content)

      if (parentId) {
        formData.append('parentId', parentId)
      }

      // Add file attachments
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file)
        })
      }

      const response = await fetch(`${this.apiEndpoint}/comments`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error adding comment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add comment',
      }
    }
  }

  /**
   * Get comments for a target
   */
  async getComments(
    targetType: string,
    targetId: string
  ): Promise<{ success: boolean; data?: Comment[]; error?: string }> {
    try {
      const response = await fetch(
        `${this.apiEndpoint}/comments?targetType=${targetType}&targetId=${targetId}`
      )
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error fetching comments:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch comments',
      }
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    content: string
  ): Promise<{ success: boolean; data?: Comment; error?: string }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error updating comment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update comment',
      }
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/comments/${commentId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error deleting comment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete comment',
      }
    }
  }

  /**
   * Add reaction to a comment
   */
  async addReaction(
    commentId: string,
    reactionType: 'like' | 'dislike' | 'heart' | 'thumbs_up' | 'thumbs_down'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: reactionType }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error adding reaction:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add reaction',
      }
    }
  }

  /**
   * Resolve a comment thread
   */
  async resolveComment(commentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/comments/${commentId}/resolve`, {
        method: 'POST',
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error resolving comment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve comment',
      }
    }
  }

  /**
   * Get notifications for current user
   */
  async getNotifications(): Promise<{ success: boolean; data?: Notification[]; error?: string }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/notifications`)
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
      }
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(
    notificationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/notifications/${notificationId}/read`, {
        method: 'PUT',
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark notification as read',
      }
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/notifications/read-all`, {
        method: 'PUT',
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
      }
    }
  }

  /**
   * Get activity feed for a target
   */
  async getActivityFeed(
    targetType: string,
    targetId: string,
    limit: number = 50
  ): Promise<{ success: boolean; data?: ActivityItem[]; error?: string }> {
    try {
      const response = await fetch(
        `${this.apiEndpoint}/activity?targetType=${targetType}&targetId=${targetId}&limit=${limit}`
      )
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error fetching activity feed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch activity feed',
      }
    }
  }

  /**
   * Search for users to mention
   */
  async searchUsers(query: string): Promise<{
    success: boolean
    data?: Array<{ id: string; name: string; email: string }>
    error?: string
  }> {
    try {
      const response = await fetch(
        `${this.apiEndpoint}/users/search?q=${encodeURIComponent(query)}`
      )
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error searching users:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search users',
      }
    }
  }

  /**
   * Parse mentions from text content
   */
  parseMentions(content: string): string[] {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: string[] = []
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[2]) // Extract user ID from @[Name](userId) format
    }

    return mentions
  }

  /**
   * Format mentions in text content
   */
  formatMentions(content: string, users: Array<{ id: string; name: string }>): string {
    let formattedContent = content

    users.forEach(user => {
      const mentionRegex = new RegExp(`@\\[${user.name}\\]\\(${user.id}\\)`, 'g')
      formattedContent = formattedContent.replace(
        mentionRegex,
        `<span class="mention" data-user-id="${user.id}">@${user.name}</span>`
      )
    })

    return formattedContent
  }

  /**
   * Create notification
   */
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    targetType: string,
    targetId: string,
    targetName: string,
    actionUrl: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type,
          title,
          message,
          targetType,
          targetId,
          targetName,
          actionUrl,
          priority,
          metadata,
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error creating notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification',
      }
    }
  }

  /**
   * Log activity
   */
  async logActivity(
    type: string,
    title: string,
    description: string,
    targetType: string,
    targetId: string,
    targetName: string,
    metadata?: Record<string, any>,
    changes?: Array<{ field: string; oldValue: any; newValue: any }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          title,
          description,
          targetType,
          targetId,
          targetName,
          metadata,
          changes,
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error logging activity:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log activity',
      }
    }
  }

  /**
   * Cleanup WebSocket connection
   */
  disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close()
      this.wsConnection = null
    }
    this.listeners.clear()
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService()

// Hook for React components
export function useCollaboration() {
  return {
    service: collaborationService,
    addComment: collaborationService.addComment.bind(collaborationService),
    getComments: collaborationService.getComments.bind(collaborationService),
    updateComment: collaborationService.updateComment.bind(collaborationService),
    deleteComment: collaborationService.deleteComment.bind(collaborationService),
    addReaction: collaborationService.addReaction.bind(collaborationService),
    resolveComment: collaborationService.resolveComment.bind(collaborationService),
    getNotifications: collaborationService.getNotifications.bind(collaborationService),
    markNotificationRead: collaborationService.markNotificationRead.bind(collaborationService),
    markAllNotificationsRead:
      collaborationService.markAllNotificationsRead.bind(collaborationService),
    getActivityFeed: collaborationService.getActivityFeed.bind(collaborationService),
    searchUsers: collaborationService.searchUsers.bind(collaborationService),
    subscribe: collaborationService.subscribe.bind(collaborationService),
  }
}
