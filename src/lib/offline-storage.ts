/**
 * Offline Storage Service for BuildTrack PWA
 * Handles IndexedDB operations, offline queuing, and sync management
 */

export interface OfflineAction {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'project' | 'invoice' | 'estimate' | 'milestone'
  entityId: string
  data: any
  url: string
  method: string
  headers: Record<string, string>
  body?: string
  timestamp: number
  retryCount: number
  maxRetries: number
  priority: number // 1 = high, 2 = normal, 3 = low
}

export interface CachedData {
  id: string
  entityType: string
  data: any
  timestamp: number
  expiry: number
  version: number
}

export interface SyncStatus {
  isOnline: boolean
  lastSync: number
  pendingActions: number
  failedActions: number
  syncInProgress: boolean
}

class OfflineStorageService {
  private dbName = 'BuildTrackOffline'
  private version = 1
  private db: IDBDatabase | null = null
  private syncStatus: SyncStatus = {
    isOnline: navigator?.onLine ?? true,
    lastSync: 0,
    pendingActions: 0,
    failedActions: 0,
    syncInProgress: false
  }

  // Store names
  private stores = {
    actions: 'offline-actions',
    cache: 'cached-data',
    settings: 'offline-settings'
  }

  constructor() {
    this.initDB()
    this.setupNetworkListeners()
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create offline actions store
        if (!db.objectStoreNames.contains(this.stores.actions)) {
          const actionsStore = db.createObjectStore(this.stores.actions, { keyPath: 'id' })
          actionsStore.createIndex('type', 'type', { unique: false })
          actionsStore.createIndex('entity', 'entity', { unique: false })
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false })
          actionsStore.createIndex('priority', 'priority', { unique: false })
        }

        // Create cached data store
        if (!db.objectStoreNames.contains(this.stores.cache)) {
          const cacheStore = db.createObjectStore(this.stores.cache, { keyPath: 'id' })
          cacheStore.createIndex('entityType', 'entityType', { unique: false })
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
          cacheStore.createIndex('expiry', 'expiry', { unique: false })
        }

        // Create settings store
        if (!db.objectStoreNames.contains(this.stores.settings)) {
          db.createObjectStore(this.stores.settings, { keyPath: 'key' })
        }

        console.log('IndexedDB schema updated')
      }
    })
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true
      this.processOfflineActions()
    })

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false
    })
  }

  /**
   * Queue an action for offline execution
   */
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    if (!this.db) await this.initDB()

    const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const fullAction: OfflineAction = {
      ...action,
      id: actionId,
      timestamp: Date.now(),
      retryCount: 0
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.actions], 'readwrite')
      const store = transaction.objectStore(this.stores.actions)
      const request = store.add(fullAction)

      request.onsuccess = () => {
        this.syncStatus.pendingActions++
        console.log('Action queued for offline sync:', actionId)
        
        // Try to process immediately if online
        if (this.syncStatus.isOnline) {
          this.processOfflineActions()
        }
        
        resolve(actionId)
      }

      request.onerror = () => {
        console.error('Failed to queue action:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Process queued offline actions
   */
  async processOfflineActions(): Promise<void> {
    if (!this.db || this.syncStatus.syncInProgress || !this.syncStatus.isOnline) {
      return
    }

    this.syncStatus.syncInProgress = true

    try {
      const actions = await this.getAllActions()
      const sortedActions = actions.sort((a, b) => {
        // Sort by priority (1 = high priority first), then by timestamp
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        return a.timestamp - b.timestamp
      })

      console.log(`Processing ${sortedActions.length} offline actions`)

      for (const action of sortedActions) {
        try {
          await this.executeAction(action)
          await this.removeAction(action.id)
          this.syncStatus.pendingActions--
        } catch (error) {
          console.error(`Failed to execute action ${action.id}:`, error)
          
          // Increment retry count
          action.retryCount++
          
          if (action.retryCount >= action.maxRetries) {
            console.error(`Action ${action.id} exceeded max retries, marking as failed`)
            this.syncStatus.failedActions++
            await this.removeAction(action.id)
          } else {
            // Update retry count in database
            await this.updateAction(action)
          }
        }
      }

      this.syncStatus.lastSync = Date.now()
    } finally {
      this.syncStatus.syncInProgress = false
    }
  }

  /**
   * Execute a single offline action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    const response = await fetch(action.url, {
      method: action.method,
      headers: action.headers,
      body: action.body
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    console.log(`Successfully executed action ${action.id}`)
  }

  /**
   * Cache data for offline access
   */
  async cacheData(entityType: string, id: string, data: any, ttlHours: number = 24): Promise<void> {
    if (!this.db) await this.initDB()

    const cachedData: CachedData = {
      id: `${entityType}-${id}`,
      entityType,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (ttlHours * 60 * 60 * 1000),
      version: 1
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.cache], 'readwrite')
      const store = transaction.objectStore(this.stores.cache)
      const request = store.put(cachedData)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Retrieve cached data
   */
  async getCachedData(entityType: string, id: string): Promise<any | null> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.cache], 'readonly')
      const store = transaction.objectStore(this.stores.cache)
      const request = store.get(`${entityType}-${id}`)

      request.onsuccess = () => {
        const result = request.result as CachedData
        
        if (!result) {
          resolve(null)
          return
        }

        // Check if data has expired
        if (Date.now() > result.expiry) {
          // Remove expired data
          this.removeCachedData(entityType, id)
          resolve(null)
          return
        }

        resolve(result.data)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove cached data
   */
  async removeCachedData(entityType: string, id: string): Promise<void> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.cache], 'readwrite')
      const store = transaction.objectStore(this.stores.cache)
      const request = store.delete(`${entityType}-${id}`)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all cached data by entity type
   */
  async getAllCachedData(entityType: string): Promise<any[]> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.cache], 'readonly')
      const store = transaction.objectStore(this.stores.cache)
      const index = store.index('entityType')
      const request = index.getAll(entityType)

      request.onsuccess = () => {
        const results = request.result as CachedData[]
        const currentTime = Date.now()
        
        // Filter out expired data and extract the data objects
        const validData = results
          .filter(item => currentTime <= item.expiry)
          .map(item => item.data)

        resolve(validData)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.cache], 'readwrite')
      const store = transaction.objectStore(this.stores.cache)
      const index = store.index('expiry')
      const range = IDBKeyRange.upperBound(Date.now())
      const request = index.openCursor(range)
      
      let deletedCount = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          console.log(`Cleared ${deletedCount} expired cache entries`)
          resolve(deletedCount)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * Get all pending actions
   */
  private async getAllActions(): Promise<OfflineAction[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.actions], 'readonly')
      const store = transaction.objectStore(this.stores.actions)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove an action
   */
  private async removeAction(actionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.actions], 'readwrite')
      const store = transaction.objectStore(this.stores.actions)
      const request = store.delete(actionId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update an action
   */
  private async updateAction(action: OfflineAction): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.actions], 'readwrite')
      const store = transaction.objectStore(this.stores.actions)
      const request = store.put(action)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.actions, this.stores.cache], 'readwrite')
      
      const actionsStore = transaction.objectStore(this.stores.actions)
      const cacheStore = transaction.objectStore(this.stores.cache)
      
      const clearActions = actionsStore.clear()
      const clearCache = cacheStore.clear()

      transaction.oncomplete = () => {
        this.syncStatus.pendingActions = 0
        this.syncStatus.failedActions = 0
        console.log('All offline data cleared')
        resolve()
      }

      transaction.onerror = () => {
        console.error('Failed to clear offline data:', transaction.error)
        reject(transaction.error)
      }
    })
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalActions: number
    totalCachedItems: number
    cacheSize: number
    oldestCacheEntry: number | null
    newestCacheEntry: number | null
  }> {
    if (!this.db) await this.initDB()

    const actions = await this.getAllActions()
    const allCache = await this.getAllCache()

    const cacheTimestamps = allCache.map(item => item.timestamp).filter(Boolean)
    
    return {
      totalActions: actions.length,
      totalCachedItems: allCache.length,
      cacheSize: this.calculateCacheSize(allCache),
      oldestCacheEntry: cacheTimestamps.length > 0 ? Math.min(...cacheTimestamps) : null,
      newestCacheEntry: cacheTimestamps.length > 0 ? Math.max(...cacheTimestamps) : null
    }
  }

  /**
   * Get all cached items
   */
  private async getAllCache(): Promise<CachedData[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction([this.stores.cache], 'readonly')
      const store = transaction.objectStore(this.stores.cache)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Calculate approximate cache size
   */
  private calculateCacheSize(items: CachedData[]): number {
    return items.reduce((total, item) => {
      return total + JSON.stringify(item).length
    }, 0)
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService()

// Utility functions for easy access
export const OfflineStorageUtils = {
  // Queue a project update
  queueProjectUpdate: (projectId: string, data: any) => {
    return offlineStorage.queueAction({
      type: 'UPDATE',
      entity: 'project',
      entityId: projectId,
      data,
      url: `/api/projects/${projectId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      maxRetries: 3,
      priority: 2
    })
  },

  // Queue an invoice creation
  queueInvoiceCreation: (data: any) => {
    return offlineStorage.queueAction({
      type: 'CREATE',
      entity: 'invoice',
      entityId: 'new',
      data,
      url: '/api/invoices',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      maxRetries: 3,
      priority: 1
    })
  },

  // Cache project data
  cacheProject: (projectId: string, data: any) => {
    return offlineStorage.cacheData('project', projectId, data, 24)
  },

  // Get cached project
  getCachedProject: (projectId: string) => {
    return offlineStorage.getCachedData('project', projectId)
  },

  // Cache invoice data
  cacheInvoice: (invoiceId: string, data: any) => {
    return offlineStorage.cacheData('invoice', invoiceId, data, 12)
  },

  // Get cached invoice
  getCachedInvoice: (invoiceId: string) => {
    return offlineStorage.getCachedData('invoice', invoiceId)
  }
}