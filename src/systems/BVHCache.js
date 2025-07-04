import { MeshBVH } from 'three-mesh-bvh';

class BVHCache {
  constructor() {
    // In-memory cache
    this.memoryCache = new Map();
    
    // Configuration
    this.useLocalStorage = true; // Can be disabled if localStorage is not desired
    this.localStoragePrefix = 'spaceinvader_bvh_';
    this.cacheVersion = '1.0.0'; // Increment this to invalidate all caches
    
    console.log('[BVH CACHE] Initialized with version:', this.cacheVersion);
  }

  /**
   * Generate a unique key for a geometry based on its properties
   */
  generateCacheKey(geometryType, vertexCount, indexCount) {
    return `${geometryType}_v${vertexCount}_i${indexCount}_${this.cacheVersion}`;
  }

  /**
   * Get a cached BVH from memory or localStorage
   */
  getCachedBVH(geometry, geometryType) {
    const vertexCount = geometry.attributes.position?.count || 0;
    const indexCount = geometry.index?.count || 0;
    const cacheKey = this.generateCacheKey(geometryType, vertexCount, indexCount);
    
    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      console.log(`[BVH CACHE] Found in memory cache: ${cacheKey}`);
      return this.memoryCache.get(cacheKey);
    }
    
    // Check localStorage if enabled
    if (this.useLocalStorage && typeof localStorage !== 'undefined') {
      try {
        const storageKey = this.localStoragePrefix + cacheKey;
        const serializedData = localStorage.getItem(storageKey);
        
        if (serializedData) {
          const data = JSON.parse(serializedData);
          
          // Deserialize the BVH
          const bvh = MeshBVH.deserialize(data.bvh, geometry);
          
          // Store in memory cache for faster subsequent access
          this.memoryCache.set(cacheKey, bvh);
          
          console.log(`[BVH CACHE] Loaded from localStorage: ${cacheKey}`);
          return bvh;
        }
      } catch (error) {
        console.warn('[BVH CACHE] Failed to load from localStorage:', error);
        // Clear corrupted data
        try {
          localStorage.removeItem(this.localStoragePrefix + cacheKey);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
    
    return null;
  }

  /**
   * Cache a BVH in memory and optionally localStorage
   */
  cacheBVH(geometry, geometryType, bvh) {
    const vertexCount = geometry.attributes.position?.count || 0;
    const indexCount = geometry.index?.count || 0;
    const cacheKey = this.generateCacheKey(geometryType, vertexCount, indexCount);
    
    // Store in memory cache
    this.memoryCache.set(cacheKey, bvh);
    
    // Store in localStorage if enabled
    if (this.useLocalStorage && typeof localStorage !== 'undefined') {
      try {
        const serialized = MeshBVH.serialize(bvh, {
          cloneBuffers: false // Use references to save memory
        });
        
        const data = {
          bvh: serialized,
          timestamp: Date.now(),
          version: this.cacheVersion
        };
        
        const storageKey = this.localStoragePrefix + cacheKey;
        localStorage.setItem(storageKey, JSON.stringify(data));
        
        console.log(`[BVH CACHE] Saved to localStorage: ${cacheKey}`);
      } catch (error) {
        console.warn('[BVH CACHE] Failed to save to localStorage:', error);
        // If localStorage is full, try to clear old BVH caches
        this.clearOldCaches();
      }
    }
  }

  /**
   * Clear old BVH caches from localStorage
   */
  clearOldCaches() {
    if (!this.useLocalStorage || typeof localStorage === 'undefined') return;
    
    try {
      const keysToRemove = [];
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      // Find old BVH caches
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.localStoragePrefix)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (!data.timestamp || data.timestamp < oneWeekAgo || data.version !== this.cacheVersion) {
              keysToRemove.push(key);
            }
          } catch (e) {
            // Remove corrupted entries
            keysToRemove.push(key);
          }
        }
      }
      
      // Remove old entries
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      if (keysToRemove.length > 0) {
        console.log(`[BVH CACHE] Cleared ${keysToRemove.length} old cache entries`);
      }
    } catch (error) {
      console.warn('[BVH CACHE] Error clearing old caches:', error);
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear localStorage caches
    if (this.useLocalStorage && typeof localStorage !== 'undefined') {
      try {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.localStoragePrefix)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log(`[BVH CACHE] Cleared all ${keysToRemove.length} cache entries`);
      } catch (error) {
        console.warn('[BVH CACHE] Error clearing caches:', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      memoryCacheSize: this.memoryCache.size,
      localStorageEntries: 0,
      totalSizeBytes: 0
    };
    
    if (this.useLocalStorage && typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.localStoragePrefix)) {
            stats.localStorageEntries++;
            const value = localStorage.getItem(key);
            if (value) {
              stats.totalSizeBytes += value.length * 2; // Rough estimate (2 bytes per char)
            }
          }
        }
      } catch (error) {
        console.warn('[BVH CACHE] Error getting stats:', error);
      }
    }
    
    return stats;
  }
}

// Export singleton instance
const bvhCache = new BVHCache();
export default bvhCache;