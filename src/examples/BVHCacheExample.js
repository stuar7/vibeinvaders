// BVH Cache Usage Example for Space Invader Game
// This file demonstrates how to use the BVH cache system

import weaponMeshPool from '../systems/WeaponMeshPool2';
import bvhCache from '../systems/BVHCache';

/**
 * BVH Cache Usage Guide
 * 
 * The BVH (Bounding Volume Hierarchy) cache system automatically stores computed BVH data
 * to avoid expensive recomputation. BVH is used for:
 * - Efficient raycasting against complex geometries
 * - Spatial queries for collision detection
 * - Mesh intersection tests
 * 
 * Benefits:
 * - First-time BVH computation: ~20-50ms for complex geometry
 * - Cached BVH loading: ~1-2ms
 * - Persistent across sessions (stored in localStorage)
 * - Automatic memory management
 */

// Example 1: Ensure BVH is available for collision detection
export function prepareWeaponBVH(weaponType) {
  // This will check cache first, compute if needed, and cache the result
  weaponMeshPool.ensureBVHForWeapon(weaponType);
}

// Example 2: Pre-warm BVH cache for all weapon types
export function prewarmAllBVHCaches() {
  const weaponTypes = ['rocket', 'bomb', 'railgun', 'bfg'];
  
  console.log('[BVH CACHE] Pre-warming BVH caches...');
  weaponTypes.forEach(weaponType => {
    weaponMeshPool.ensureBVHForWeapon(weaponType);
  });
  
  // Check cache statistics
  const stats = weaponMeshPool.getBVHCacheStats();
  console.log('[BVH CACHE] Cache stats:', stats);
}

// Example 3: Using BVH for raycasting against weapon geometry
export function raycastAgainstWeapon(raycaster, weaponType) {
  const geometry = weaponMeshPool.geometryCache.get(weaponType);
  if (!geometry) return null;
  
  // Ensure BVH is available
  weaponMeshPool.ensureBVHForWeapon(weaponType);
  
  // Now the geometry has a boundsTree for efficient raycasting
  if (geometry.boundsTree) {
    const hits = geometry.boundsTree.raycast(raycaster.ray);
    return hits;
  }
  
  return null;
}

// Example 4: Clear cache during development
export function clearAllBVHCaches() {
  weaponMeshPool.clearBVHCache();
  console.log('[BVH CACHE] All caches cleared');
}

// Example 5: Monitor cache performance
export function monitorBVHCachePerformance() {
  const stats = bvhCache.getCacheStats();
  
  console.log('[BVH CACHE] Performance Stats:');
  console.log(`- Memory cache entries: ${stats.memoryCacheSize}`);
  console.log(`- LocalStorage entries: ${stats.localStorageEntries}`);
  console.log(`- Total cache size: ${(stats.totalSizeBytes / 1024).toFixed(2)} KB`);
  
  return stats;
}

// Example 6: Integration with collision system
export class BVHEnhancedCollisionSystem {
  constructor() {
    this.weaponBVHs = new Map();
  }
  
  // Prepare BVH for all active weapon types
  prepareWeaponBVHs(activeMissiles) {
    const weaponTypesInUse = new Set();
    
    // Collect unique weapon types
    activeMissiles.forEach(missile => {
      if (['rocket', 'bomb', 'railgun', 'bfg'].includes(missile.weaponType)) {
        weaponTypesInUse.add(missile.weaponType);
      }
    });
    
    // Ensure BVH is ready for each type
    weaponTypesInUse.forEach(weaponType => {
      if (!this.weaponBVHs.has(weaponType)) {
        weaponMeshPool.ensureBVHForWeapon(weaponType);
        const geometry = weaponMeshPool.geometryCache.get(weaponType);
        if (geometry && geometry.boundsTree) {
          this.weaponBVHs.set(weaponType, geometry.boundsTree);
        }
      }
    });
  }
  
  // Check precise collision using BVH
  checkPreciseCollision(missile, target) {
    const bvh = this.weaponBVHs.get(missile.weaponType);
    if (!bvh) return false;
    
    // Transform target to missile's local space
    const localTarget = target.clone();
    localTarget.applyMatrix4(missile.matrixWorld.clone().invert());
    
    // Use BVH for precise intersection test
    return bvh.intersectsSphere(localTarget);
  }
}

// Example 7: Automatic cache warming on game load
export function initializeBVHCacheOnGameLoad() {
  // This can be called during the loading screen
  console.log('[BVH CACHE] Initializing BVH cache during game load...');
  
  // Pre-compute BVH for commonly used weapons
  const priorityWeapons = ['rocket', 'bomb']; // Most commonly used
  priorityWeapons.forEach(weaponType => {
    weaponMeshPool.ensureBVHForWeapon(weaponType);
  });
  
  // Defer other weapons to avoid blocking
  setTimeout(() => {
    const otherWeapons = ['railgun', 'bfg'];
    otherWeapons.forEach(weaponType => {
      weaponMeshPool.ensureBVHForWeapon(weaponType);
    });
  }, 100);
}

// Export utilities
export default {
  prepareWeaponBVH,
  prewarmAllBVHCaches,
  raycastAgainstWeapon,
  clearAllBVHCaches,
  monitorBVHCachePerformance,
  BVHEnhancedCollisionSystem,
  initializeBVHCacheOnGameLoad
};