/**
 * Simple in-memory cache for DealScope analysis results.
 * Caches API responses with TTL (time-to-live) in seconds.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class DealScopeCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTTL = 3600; // 1 hour in seconds

  /**
   * Generate a cache key from input parameters
   */
  generateKey(endpoint: string, params: Record<string, unknown>): string {
    const paramStr = JSON.stringify(params, Object.keys(params).sort());
    return `${endpoint}:${Buffer.from(paramStr).toString('base64')}`;
  }

  /**
   * Get cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached value with optional TTL
   */
  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ?? this.defaultTTL;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const dealscopeCache = new DealScopeCache();
