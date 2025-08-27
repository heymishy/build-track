/**
 * Redis Cache Service
 * High-performance caching layer for frequent queries and data
 */

export interface CacheConfig {
  redis: {
    host: string
    port: number
    password?: string
    db?: number
    maxRetriesPerRequest?: number
    retryDelayOnFailover?: number
    lazyConnect?: boolean
  }
  defaultTTL: number
  keyPrefix: string
  compression: {
    enabled: boolean
    threshold: number
  }
  serialization: {
    enabled: boolean
    method: 'json' | 'msgpack'
  }
}

export interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
  avgResponseTime: number
  memoryUsage: number
  hitRate: number
}

export interface CacheEntry<T = any> {
  data: T
  ttl: number
  timestamp: number
  compressed: boolean
  size: number
}

export interface CacheKey {
  prefix: string
  identifier: string
  version?: string
  tags?: string[]
}

// Cache implementation (can be Redis or in-memory for development)
class CacheService {
  private client: any
  private config: CacheConfig
  private metrics: CacheMetrics
  private connected: boolean = false
  private compressionThreshold: number

  constructor(config: CacheConfig) {
    this.config = config
    this.compressionThreshold = config.compression.threshold
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      hitRate: 0,
    }
    this.initializeClient()
  }

  private async initializeClient() {
    try {
      // For development, use a simple Map-based cache
      if (process.env.NODE_ENV === 'development') {
        this.client = new Map()
        this.connected = true
        console.log('[Cache] Using in-memory cache for development')
        return
      }

      // In production, use Redis
      const Redis = require('ioredis')
      this.client = new Redis(this.config.redis)

      this.client.on('connect', () => {
        this.connected = true
        console.log('[Cache] Connected to Redis')
      })

      this.client.on('error', (err: Error) => {
        this.metrics.errors++
        console.error('[Cache] Redis error:', err.message)
      })

      this.client.on('close', () => {
        this.connected = false
        console.log('[Cache] Redis connection closed')
      })
    } catch (error) {
      console.error('[Cache] Failed to initialize cache client:', error)
      // Fallback to in-memory cache
      this.client = new Map()
      this.connected = true
    }
  }

  private generateKey(key: CacheKey): string {
    const parts = [this.config.keyPrefix, key.prefix, key.identifier]

    if (key.version) {
      parts.push(key.version)
    }

    return parts.join(':')
  }

  private compress(data: string): string | Buffer {
    if (!this.config.compression.enabled || data.length < this.compressionThreshold) {
      return data
    }

    try {
      const zlib = require('zlib')
      return zlib.gzipSync(data)
    } catch (error) {
      console.warn('[Cache] Compression failed, storing uncompressed:', error)
      return data
    }
  }

  private decompress(data: string | Buffer): string {
    if (typeof data === 'string') {
      return data
    }

    try {
      const zlib = require('zlib')
      return zlib.gunzipSync(data).toString()
    } catch (error) {
      console.warn('[Cache] Decompression failed:', error)
      return data.toString()
    }
  }

  private serialize(data: any): string {
    if (!this.config.serialization.enabled) {
      return JSON.stringify(data)
    }

    switch (this.config.serialization.method) {
      case 'msgpack':
        try {
          const msgpack = require('msgpack')
          return msgpack.pack(data)
        } catch (error) {
          console.warn('[Cache] MessagePack serialization failed, using JSON:', error)
          return JSON.stringify(data)
        }
      case 'json':
      default:
        return JSON.stringify(data)
    }
  }

  private deserialize(data: string): any {
    if (!this.config.serialization.enabled) {
      return JSON.parse(data)
    }

    switch (this.config.serialization.method) {
      case 'msgpack':
        try {
          const msgpack = require('msgpack')
          return msgpack.unpack(Buffer.from(data))
        } catch (error) {
          console.warn('[Cache] MessagePack deserialization failed, using JSON:', error)
          return JSON.parse(data)
        }
      case 'json':
      default:
        return JSON.parse(data)
    }
  }

  private updateMetrics(operation: keyof CacheMetrics, value: number = 1) {
    this.metrics[operation] = (this.metrics[operation] as number) + value

    // Calculate hit rate
    const total = this.metrics.hits + this.metrics.misses
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0
  }

  async get<T = any>(key: CacheKey): Promise<T | null> {
    if (!this.connected) {
      return null
    }

    const startTime = Date.now()
    const cacheKey = this.generateKey(key)

    try {
      let result: any

      if (this.client instanceof Map) {
        // In-memory cache
        const entry = this.client.get(cacheKey)
        if (!entry) {
          this.updateMetrics('misses')
          return null
        }

        // Check TTL for in-memory cache
        if (entry.ttl > 0 && Date.now() > entry.timestamp + entry.ttl * 1000) {
          this.client.delete(cacheKey)
          this.updateMetrics('misses')
          return null
        }

        result = entry.data
      } else {
        // Redis cache
        result = await this.client.get(cacheKey)
        if (!result) {
          this.updateMetrics('misses')
          return null
        }

        result = this.decompress(result)
        result = this.deserialize(result)
      }

      this.updateMetrics('hits')
      this.updateMetrics('avgResponseTime', Date.now() - startTime)
      return result
    } catch (error) {
      console.error('[Cache] Get error:', error)
      this.updateMetrics('errors')
      return null
    }
  }

  async set<T = any>(
    key: CacheKey,
    data: T,
    ttl: number = this.config.defaultTTL
  ): Promise<boolean> {
    if (!this.connected) {
      return false
    }

    const startTime = Date.now()
    const cacheKey = this.generateKey(key)

    try {
      let serializedData = this.serialize(data)
      const originalSize = serializedData.length

      if (this.client instanceof Map) {
        // In-memory cache
        const entry: CacheEntry = {
          data,
          ttl,
          timestamp: Date.now(),
          compressed: false,
          size: originalSize,
        }
        this.client.set(cacheKey, entry)
      } else {
        // Redis cache
        const compressedData = this.compress(serializedData)

        if (ttl > 0) {
          await this.client.setex(cacheKey, ttl, compressedData)
        } else {
          await this.client.set(cacheKey, compressedData)
        }
      }

      this.updateMetrics('sets')
      this.updateMetrics('avgResponseTime', Date.now() - startTime)
      return true
    } catch (error) {
      console.error('[Cache] Set error:', error)
      this.updateMetrics('errors')
      return false
    }
  }

  async delete(key: CacheKey): Promise<boolean> {
    if (!this.connected) {
      return false
    }

    const cacheKey = this.generateKey(key)

    try {
      if (this.client instanceof Map) {
        const deleted = this.client.delete(cacheKey)
        if (deleted) {
          this.updateMetrics('deletes')
        }
        return deleted
      } else {
        const result = await this.client.del(cacheKey)
        if (result > 0) {
          this.updateMetrics('deletes')
        }
        return result > 0
      }
    } catch (error) {
      console.error('[Cache] Delete error:', error)
      this.updateMetrics('errors')
      return false
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.connected) {
      return 0
    }

    try {
      if (this.client instanceof Map) {
        let deleted = 0
        const regex = new RegExp(pattern.replace('*', '.*'))

        for (const key of this.client.keys()) {
          if (regex.test(key)) {
            this.client.delete(key)
            deleted++
          }
        }

        this.updateMetrics('deletes', deleted)
        return deleted
      } else {
        const keys = await this.client.keys(pattern)
        if (keys.length === 0) {
          return 0
        }

        const result = await this.client.del(...keys)
        this.updateMetrics('deletes', result)
        return result
      }
    } catch (error) {
      console.error('[Cache] Delete by pattern error:', error)
      this.updateMetrics('errors')
      return 0
    }
  }

  async clear(): Promise<boolean> {
    if (!this.connected) {
      return false
    }

    try {
      if (this.client instanceof Map) {
        this.client.clear()
        return true
      } else {
        await this.client.flushdb()
        return true
      }
    } catch (error) {
      console.error('[Cache] Clear error:', error)
      this.updateMetrics('errors')
      return false
    }
  }

  async exists(key: CacheKey): Promise<boolean> {
    if (!this.connected) {
      return false
    }

    const cacheKey = this.generateKey(key)

    try {
      if (this.client instanceof Map) {
        return this.client.has(cacheKey)
      } else {
        const result = await this.client.exists(cacheKey)
        return result === 1
      }
    } catch (error) {
      console.error('[Cache] Exists error:', error)
      this.updateMetrics('errors')
      return false
    }
  }

  async ttl(key: CacheKey): Promise<number> {
    if (!this.connected) {
      return -1
    }

    const cacheKey = this.generateKey(key)

    try {
      if (this.client instanceof Map) {
        const entry = this.client.get(cacheKey)
        if (!entry) {
          return -2 // Key doesn't exist
        }

        if (entry.ttl <= 0) {
          return -1 // No expiry
        }

        const remaining = entry.ttl - Math.floor((Date.now() - entry.timestamp) / 1000)
        return Math.max(0, remaining)
      } else {
        return await this.client.ttl(cacheKey)
      }
    } catch (error) {
      console.error('[Cache] TTL error:', error)
      this.updateMetrics('errors')
      return -1
    }
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  isConnected(): boolean {
    return this.connected
  }

  async disconnect(): Promise<void> {
    if (this.client && typeof this.client.disconnect === 'function') {
      await this.client.disconnect()
    }
    this.connected = false
  }
}

// Cache helpers for common patterns
export class CacheHelpers {
  private cache: CacheService

  constructor(cache: CacheService) {
    this.cache = cache
  }

  // Wrap a function with caching
  async wrap<T>(key: CacheKey, fn: () => Promise<T> | T, ttl?: number): Promise<T> {
    // Try to get from cache first
    const cached = await this.cache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn()
    await this.cache.set(key, result, ttl)
    return result
  }

  // Cache with tags for easier invalidation
  async setWithTags<T>(key: CacheKey, data: T, tags: string[], ttl?: number): Promise<boolean> {
    const keyWithTags = { ...key, tags }

    // Store the main data
    const success = await this.cache.set(keyWithTags, data, ttl)

    if (success && tags.length > 0) {
      // Store tag mappings for invalidation
      for (const tag of tags) {
        const tagKey: CacheKey = {
          prefix: 'tags',
          identifier: tag,
        }

        const existingKeys = (await this.cache.get<string[]>(tagKey)) || []
        const keyString = this.cache['generateKey'](keyWithTags)

        if (!existingKeys.includes(keyString)) {
          existingKeys.push(keyString)
          await this.cache.set(tagKey, existingKeys, ttl)
        }
      }
    }

    return success
  }

  // Invalidate by tags
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalDeleted = 0

    for (const tag of tags) {
      const tagKey: CacheKey = {
        prefix: 'tags',
        identifier: tag,
      }

      const keys = (await this.cache.get<string[]>(tagKey)) || []

      for (const key of keys) {
        // Parse key back to CacheKey format
        const keyParts = key.split(':')
        const parsedKey: CacheKey = {
          prefix: keyParts[1] || '',
          identifier: keyParts[2] || '',
        }

        const deleted = await this.cache.delete(parsedKey)
        if (deleted) {
          totalDeleted++
        }
      }

      // Clear the tag mapping
      await this.cache.delete(tagKey)
    }

    return totalDeleted
  }
}

// Default configuration
const defaultConfig: CacheConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
  },
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'), // 1 hour
  keyPrefix: process.env.CACHE_KEY_PREFIX || 'buildtrack',
  compression: {
    enabled: process.env.CACHE_COMPRESSION === 'true',
    threshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '1024'), // 1KB
  },
  serialization: {
    enabled: true,
    method: 'json' as const,
  },
}

// Singleton instance
let cacheInstance: CacheService | null = null
let helpersInstance: CacheHelpers | null = null

export function getCache(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService(defaultConfig)
  }
  return cacheInstance
}

export function getCacheHelpers(): CacheHelpers {
  if (!helpersInstance) {
    helpersInstance = new CacheHelpers(getCache())
  }
  return helpersInstance
}

export default getCache
