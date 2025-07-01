// Example of using ParallelMeshBVHWorker for your collision system
// This shows how to adapt the three-mesh-bvh example to your game

import { ParallelMeshBVHWorker } from 'three-mesh-bvh/src/workers/ParallelMeshBVHWorker.js';

class OptimizedBVHCollisionSystem {
  constructor() {
    this.bvhWorker = new ParallelMeshBVHWorker();
    this.aliensBVH = null;
    this.asteroidsBVH = null;
    this.pendingBVHBuilds = new Map();
  }

  async rebuildAliensBVHAsync(aliens) {
    if (aliens.length === 0) return;
    
    // Create merged geometry for all aliens
    const geometry = this.createMergedGeometry(aliens, 'alien');
    
    // Build BVH in worker with progress tracking
    const onProgress = (progress) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[BVH] Building aliens BVH: ${(progress * 100).toFixed(0)}%`);
      }
    };
    
    try {
      // Use worker to generate BVH (non-blocking!)
      const bvh = await this.bvhWorker.generate(geometry, {
        strategy: 'CENTER',
        maxLeafTris: 5,
        maxDepth: 30,
        onProgress
      });
      
      // Apply the generated BVH
      geometry.boundsTree = bvh;
      this.aliensBVH = bvh;
      
      // Store for later use
      this.aliensMergedGeometry = geometry;
      
      console.log('[BVH] Aliens BVH built successfully in worker');
    } catch (error) {
      console.error('[BVH] Failed to build aliens BVH in worker:', error);
      // Fallback to synchronous build
      this.rebuildAliensBVH(aliens);
    }
  }

  async rebuildAsteroidsBVHAsync(asteroids) {
    const collidableAsteroids = asteroids.filter(a => !a.isDoodad);
    if (collidableAsteroids.length === 0) return;
    
    const geometry = this.createMergedGeometry(collidableAsteroids, 'asteroid');
    
    const onProgress = (progress) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[BVH] Building asteroids BVH: ${(progress * 100).toFixed(0)}%`);
      }
    };
    
    try {
      const bvh = await this.bvhWorker.generate(geometry, {
        strategy: 'CENTER',
        maxLeafTris: 5,
        maxDepth: 30,
        onProgress
      });
      
      geometry.boundsTree = bvh;
      this.asteroidsBVH = bvh;
      this.asteroidsMergedGeometry = geometry;
      
      console.log('[BVH] Asteroids BVH built successfully in worker');
    } catch (error) {
      console.error('[BVH] Failed to build asteroids BVH in worker:', error);
      this.rebuildAsteroidsBVH(asteroids);
    }
  }

  // Schedule BVH rebuilds to avoid blocking
  scheduleRebuild(entities, entityType) {
    // Cancel any pending rebuild for this type
    if (this.pendingBVHBuilds.has(entityType)) {
      clearTimeout(this.pendingBVHBuilds.get(entityType));
    }
    
    // Schedule new rebuild with debouncing
    const timeoutId = setTimeout(() => {
      if (entityType === 'alien') {
        this.rebuildAliensBVHAsync(entities);
      } else {
        this.rebuildAsteroidsBVHAsync(entities);
      }
      this.pendingBVHBuilds.delete(entityType);
    }, 100); // 100ms debounce
    
    this.pendingBVHBuilds.set(entityType, timeoutId);
  }

  dispose() {
    // Clean up worker
    if (this.bvhWorker) {
      this.bvhWorker.dispose();
    }
    
    // Clear pending builds
    this.pendingBVHBuilds.forEach(timeoutId => clearTimeout(timeoutId));
    this.pendingBVHBuilds.clear();
    
    // ... rest of disposal logic
  }
}

// Usage in your game:
// const bvhSystem = new OptimizedBVHCollisionSystem();
// 
// // When aliens change significantly:
// bvhSystem.scheduleRebuild(aliens, 'alien');
// 
// // The BVH will be built in a worker without blocking the main thread!
