/**
 * BuildTrack Service Worker
 * Provides offline capabilities, caching, and background sync
 */

const CACHE_VERSION = 'buildtrack-v1.0.0'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`
const API_CACHE = `${CACHE_VERSION}-api`

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/projects',
  '/invoices',
  '/settings',
  '/offline',
  '/manifest.json',
  // Add critical CSS and JS files here when built
]

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/projects',
  '/api/invoices',
  '/api/dashboard',
  '/api/analytics',
  '/api/settings'
]

// Maximum cache sizes
const MAX_DYNAMIC_CACHE_SIZE = 50
const MAX_API_CACHE_SIZE = 100
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Install event')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error)
      })
  )
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')
  
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => {
            return key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE
          }).map((key) => {
            console.log('[SW] Deleting old cache:', key)
            return caches.delete(key)
          })
        )
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim()
      })
  )
})

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests and cross-origin requests
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }
  
  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request))
})

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const isCacheableApi = CACHEABLE_APIS.some(api => url.pathname.startsWith(api))
  
  if (!isCacheableApi) {
    // For non-cacheable APIs, try network only with offline fallback
    try {
      return await fetch(request)
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline - this feature requires internet connection',
          offline: true 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE)
      const responseToCache = networkResponse.clone()
      
      // Add timestamp for expiry checking
      const responseWithTimestamp = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: {
          ...Object.fromEntries(responseToCache.headers),
          'sw-cached-at': Date.now().toString()
        }
      })
      
      await cache.put(request, responseWithTimestamp)
      await limitCacheSize(API_CACHE, MAX_API_CACHE_SIZE)
      
      return networkResponse
    }
    
    throw new Error('Network response not ok')
    
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache')
    
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      // Check if cached response is still valid
      const cachedAt = cachedResponse.headers.get('sw-cached-at')
      const isExpired = cachedAt && (Date.now() - parseInt(cachedAt)) > CACHE_EXPIRY_TIME
      
      if (!isExpired) {
        // Add offline indicator to cached response
        const cachedData = await cachedResponse.json()
        return new Response(
          JSON.stringify({
            ...cachedData,
            _offline: true,
            _cachedAt: cachedAt
          }),
          {
            status: cachedResponse.status,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }
    
    // No valid cache, return offline response
    return new Response(
      JSON.stringify({
        error: 'Data unavailable offline',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Handle static requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  // Check static cache first
  const cachedResponse = await caches.match(request, { cacheName: STATIC_CACHE })
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Check dynamic cache
  const dynamicCachedResponse = await caches.match(request, { cacheName: DYNAMIC_CACHE })
  if (dynamicCachedResponse) {
    return dynamicCachedResponse
  }
  
  try {
    // Try network
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses in dynamic cache
      const cache = await caches.open(DYNAMIC_CACHE)
      await cache.put(request, networkResponse.clone())
      await limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE)
    }
    
    return networkResponse
    
  } catch (error) {
    console.log('[SW] Network failed for static request')
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/offline')
      if (offlineResponse) {
        return offlineResponse
      }
    }
    
    // Return basic offline response
    return new Response(
      'You are offline. Please check your internet connection.',
      {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      }
    )
  }
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  
  if (keys.length > maxSize) {
    const keysToDelete = keys.slice(0, keys.length - maxSize)
    await Promise.all(keysToDelete.map(key => cache.delete(key)))
    console.log(`[SW] Cleaned ${keysToDelete.length} entries from ${cacheName}`)
  }
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'sync-invoices') {
    event.waitUntil(syncInvoices())
  } else if (event.tag === 'sync-projects') {
    event.waitUntil(syncProjects())
  }
})

/**
 * Sync offline invoice actions
 */
async function syncInvoices() {
  try {
    // Get pending invoice actions from IndexedDB
    const pendingActions = await getPendingActions('invoices')
    
    for (const action of pendingActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })
        
        if (response.ok) {
          await removePendingAction('invoices', action.id)
          console.log('[SW] Synced invoice action:', action.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync invoice action:', action.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Invoice sync failed:', error)
  }
}

/**
 * Sync offline project actions
 */
async function syncProjects() {
  try {
    // Get pending project actions from IndexedDB
    const pendingActions = await getPendingActions('projects')
    
    for (const action of pendingActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })
        
        if (response.ok) {
          await removePendingAction('projects', action.id)
          console.log('[SW] Synced project action:', action.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync project action:', action.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Project sync failed:', error)
  }
}

/**
 * Simple IndexedDB helper for pending actions
 */
async function getPendingActions(store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BuildTrackOffline', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction([store], 'readonly')
      const objectStore = transaction.objectStore(store)
      const getAllRequest = objectStore.getAll()
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || [])
      getAllRequest.onerror = () => resolve([])
    }
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('invoices')) {
        db.createObjectStore('invoices', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
    }
  })
}

/**
 * Remove pending action from IndexedDB
 */
async function removePendingAction(store, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BuildTrackOffline', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction([store], 'readwrite')
      const objectStore = transaction.objectStore(store)
      const deleteRequest = objectStore.delete(id)
      
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    }
  })
}

/**
 * Push notification handling
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.data,
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200]
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received')
  
  event.notification.close()
  
  const data = event.notification.data
  const action = event.action
  
  let url = '/'
  
  if (action === 'view-project' && data?.projectId) {
    url = `/projects/${data.projectId}`
  } else if (action === 'view-invoice' && data?.invoiceId) {
    url = `/invoices/${data.invoiceId}`
  } else if (data?.url) {
    url = data.url
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

/**
 * Message handling from main app
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION })
  } else if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then(cache => cache.addAll(urls))
        .then(() => event.ports[0].postMessage({ success: true }))
        .catch(error => event.ports[0].postMessage({ error: error.message }))
    )
  }
})