// Centralized cache module for server-side caching
// Uses structuredClone to prevent mutation of cached objects

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();

export const CACHE_TTL_DEFAULT = 5 * 60 * 1000; // 5 minutes
export const CACHE_TTL_SHORT = 1 * 60 * 1000; // 1 minute (for premium checks)
export const CACHE_TTL_LONG = 10 * 60 * 1000; // 10 minutes (for static data like individual schools)

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  // Return a deep clone to prevent mutation of cached data
  return structuredClone(entry.data) as T;
}

export function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL_DEFAULT): void {
  if (cache.size > 5_000) {
    const now = Date.now();
    for (const [existingKey, entry] of cache) {
      if (now - entry.timestamp > entry.ttl) cache.delete(existingKey);
    }
  }
  // Store a deep clone to prevent external mutation of cached data
  cache.set(key, {
    data: structuredClone(data),
    timestamp: Date.now(),
    ttl,
  });
}

export function deleteCache(key: string): void {
  cache.delete(key);
}

// Helper to invalidate premium/subscription caches when subscription changes
export function invalidateUserCaches(userId: string): void {
  cache.delete(`premium-user-${userId}`);
  cache.delete(`subscription-status-${userId}`);
}
