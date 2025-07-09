import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { MeshBVH, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import asyncAssetManager from './AsyncAssetManager';
import bvhCache from './BVHCache';

/**
 * WeaponMeshPool - High-performance pooled mesh system for complex weapons
 * 
 * Features:
 * - Object pooling to avoid GC during gameplay
 * - BVH caching for collision detection optimization
 * - Lazy BVH computation (only when needed)
 * - Persistent BVH cache across sessions (localStorage)
 * 
 * BVH Cache Benefits:
 * - First computation: ~20-50ms for complex geometry
 * - Cached loading: ~1-2ms
 * - Automatic cache invalidation on geometry changes
 * - Memory-efficient with automatic cleanup
 */

class WeaponMeshPool {
  constructor() {
    // Pool configurations for complex weapons - increased sizes to prevent exhaustion lag
    this.poolConfigs = {
      rocket: { size: 150, activeCount: 0 }, // Massively increased for rapid fire without lag
      bfg: { size: 40, activeCount: 0 }, // Doubled for high-intensity gameplay
      bomb: { size: 30, activeCount: 0 }, // Doubled for multiple bombs
      railgun: { size: 50, activeCount: 0 } // Doubled for rapid railgun fire
    };
    
    console.log('[WEAPON POOL] Constructor called with rocket pool size:', this.poolConfigs.rocket.size);
    console.log('[WEAPON POOL] Full pool configs:', this.poolConfigs);
    
    // Object pools
    this.pools = new Map();
    
    // PERFORMANCE FIX: Global ID→mesh map for O(1) lookups
    this.globalMeshMap = new Map();
    
    // PERFORMANCE FIX: Cached active missiles data (avoid O(n×m) every frame)
    this.cachedActiveMissiles = [];
    this.cachedMissileUpdates = [];
    this.cacheVersion = 0;
    this.lastCacheUpdate = 0;
    
    // Pre-built geometries (shared across all instances)
    this.geometryCache = new Map();
    this.materialCache = new Map();
    this.useAsyncAssets = false; // Will be enabled when async assets are loaded
    
    // Scene reference for proper pooling
    this.scene = null;
    this.isInitialized = false;
    this.isWarmedUp = false;
    
    // Stats caching to prevent expensive calculations during weapon firing
    this.cachedStats = null;
    this.statsCacheVersion = 0;
    this.lastStatsUpdate = 0;
    
    // Initialize pools (without scene)
    this.initializePools();
  }

  initializePools() {
    console.log('[WEAPON POOL] Initializing mesh pools...');
    const startTime = performance.now();
    
    // Pre-build geometries first (only once!)
    this.prebuildGeometries();
    
    // Create pools for each weapon type
    Object.entries(this.poolConfigs).forEach(([weaponType, config]) => {
      this.pools.set(weaponType, {
        available: [],
        active: new Map(), // missileId -> pooledObject
        totalCreated: 0
      });
      
      // Pre-create pool objects
      for (let i = 0; i < config.size; i++) {
        const pooledObject = this.createPooledWeapon(weaponType);
        pooledObject.visible = false;
        this.pools.get(weaponType).available.push(pooledObject);
      }
      
      console.log(`[WEAPON POOL] Created ${config.size} ${weaponType} meshes`);
    });
    
    const loadTime = performance.now() - startTime;
    console.log(`[WEAPON POOL] Initialization complete in ${loadTime.toFixed(2)}ms`);
  }

  // Initialize scene and add all pooled meshes to it (call this from OptimizedMissiles)
  initializeScene(scene) {
    if (this.isInitialized || !scene) {
      console.log('[WEAPON POOL DEBUG] Scene initialization skipped - isInitialized:', this.isInitialized, 'scene:', !!scene);
      return;
    }
    
    console.log('[WEAPON POOL] Initializing scene with pooled meshes...');
    console.log('[WEAPON POOL DEBUG] Scene object:', scene);
    console.log('[WEAPON POOL DEBUG] Pool configurations:', this.poolConfigs);
    this.scene = scene;
    
    // Add all pooled meshes to scene and pre-warm GPU compilation
    this.pools.forEach((pool, weaponType) => {
      console.log(`[WEAPON POOL DEBUG] Processing ${weaponType} pool with ${pool.available.length} meshes`);
      pool.available.forEach((mesh, index) => {
        console.log(`[WEAPON POOL DEBUG] Adding ${weaponType} mesh ${index} to scene:`, mesh);
        scene.add(mesh);
        
        // Pre-warm GPU by briefly making first mesh visible (forces shader compilation)
        if (index === 0) {
          mesh.visible = true;
          mesh.position.set(9999, 9999, 9999); // Off-screen position
          console.log(`[WEAPON POOL DEBUG] Pre-warming ${weaponType} mesh ${index} - visible: ${mesh.visible}, position:`, mesh.position);
          // Will be hidden again immediately after render
          setTimeout(() => {
            mesh.visible = false;
            mesh.position.set(0, 0, 0);
            console.log(`[WEAPON POOL DEBUG] Reset ${weaponType} mesh ${index} - visible: ${mesh.visible}, position:`, mesh.position);
          }, 100);
        } else {
          mesh.visible = false;
        }
      });
      console.log(`[WEAPON POOL] Added ${pool.available.length} ${weaponType} meshes to scene with GPU pre-warming`);
    });
    
    this.isInitialized = true;
    console.log('[WEAPON POOL] Scene initialization complete - meshes pre-added');
    console.log('[WEAPON POOL DEBUG] Final scene children count:', scene.children.length);
  }

  async enableAsyncAssets() {
    console.log('[WEAPON POOL] Switching to async asset geometries...');
    this.useAsyncAssets = true;
    
    // Update existing pool objects with async geometries
    const updates = [];
    
    for (const [weaponType] of this.pools.entries()) {
      if (['rocket', 'bfg', 'bomb', 'railgun'].includes(weaponType)) {
        updates.push(this.updatePoolGeometry(weaponType));
      }
    }
    
    await Promise.all(updates);
    console.log('[WEAPON POOL] Async asset integration complete');
  }
  
  async updatePoolGeometry(weaponType) {
    try {
      const asyncAsset = await asyncAssetManager.getAsset('weapons', weaponType, 'default');
      
      if (asyncAsset.geometry) {
        // Update cached geometry
        this.geometryCache.set(weaponType, asyncAsset.geometry);
        
        // Update all meshes in the pool
        const pool = this.pools.get(weaponType);
        if (pool) {
          [...pool.available, ...pool.active.values()].forEach(group => {
            // Update mesh geometry
            group.traverse(child => {
              if (child.isMesh && child.geometry) {
                child.geometry = asyncAsset.geometry;
              }
            });
          });
        }
        
        console.log(`[WEAPON POOL] Updated ${weaponType} geometry with async asset`);
      }
    } catch (error) {
      console.warn(`[WEAPON POOL] Failed to load async asset for ${weaponType}:`, error);
    }
  }
  
  async prebuildAsyncGeometries() {
    console.log('[WEAPON POOL] Loading geometries from async asset manager...');
    
    const weaponTypes = ['rocket', 'bfg', 'bomb', 'railgun'];
    const loadPromises = weaponTypes.map(async (weaponType) => {
      try {
        const asset = await asyncAssetManager.getAsset('weapons', weaponType, 'default');
        if (asset.geometry) {
          this.geometryCache.set(weaponType, asset.geometry);
          console.log(`[WEAPON POOL] ✓ Loaded async geometry for ${weaponType}`);
        }
      } catch (error) {
        console.warn(`[WEAPON POOL] ✗ Failed to load async geometry for ${weaponType}, using fallback`);
        // Fall back to local generation for this weapon
        this.generateFallbackGeometry(weaponType);
      }
    });
    
    await Promise.all(loadPromises);
  }
  
  generateFallbackGeometry(weaponType) {
    // Generate simple fallback geometry if async loading fails
    switch (weaponType) {
      case 'rocket':
        this.geometryCache.set('rocket', new THREE.BoxGeometry(0.2, 0.2, 1));
        break;
      case 'bfg':
        this.geometryCache.set('bfg-core', new THREE.SphereGeometry(1, 8, 6));
        break;
      case 'bomb':
        this.geometryCache.set('bomb', new THREE.SphereGeometry(0.4, 8, 6));
        break;
      case 'railgun':
        const rail = new THREE.CylinderGeometry(0.06, 0.06, 8, 8);
        rail.rotateX(Math.PI / 2);
        this.geometryCache.set('railgun-main', rail);
        break;
    }
  }

  prebuildGeometries() {
    // ALWAYS build fallback geometries first for immediate availability
    // This prevents lag on first rocket fire
    console.log('[WEAPON POOL] Building synchronous fallback geometries...');
    this.buildSyncGeometries();
    
    // Then optionally upgrade to async geometries later
    if (this.useAsyncAssets) {
      // Don't await - let it upgrade in background
      this.prebuildAsyncGeometries().then(() => {
        console.log('[WEAPON POOL] Async geometries loaded in background');
      });
    }
  }
  
  buildSyncGeometries() {
    // Ultra-low-poly geometries for maximum performance
    // ROCKET - Single merged mesh with minimal triangles
    const rocketGeometries = [];
    
    // REMOVED: Exhaust geometry no longer needed since we disabled exhaust glow for performance
    
    // ULTRA OPTIMIZED: Single cylinder for entire rocket (only 16 triangles total)
    const rocketBody = new THREE.CylinderGeometry(0.15, 0.20, 1.5, 4);
    rocketBody.rotateX(Math.PI / 2); // Orient along Z axis
    rocketGeometries.push(rocketBody);
    
    // Merge into single geometry (~16 triangles total per rocket)
    const rocketGeometry = BufferGeometryUtils.mergeGeometries(rocketGeometries);
    
    // PERFORMANCE: Check BVH cache first
    let cachedBVH = bvhCache.getCachedBVH(rocketGeometry, 'rocket');
    if (cachedBVH) {
      rocketGeometry.boundsTree = cachedBVH;
      console.log('[WEAPON POOL] Using cached BVH for rocket geometry');
    } else {
      // Only assign BVH functions if no cache found - let collision system compute when needed
      rocketGeometry.computeBoundsTree = computeBoundsTree;
      rocketGeometry.disposeBoundsTree = disposeBoundsTree;
      // Don't pre-compute BVH here - it will be computed and cached when first needed
    }
    
    this.geometryCache.set('rocket', rocketGeometry);
    
    // BFG - Ultra-low-poly spheres for maximum performance
    this.geometryCache.set('bfg-core', new THREE.SphereGeometry(1, 8, 6));
    this.geometryCache.set('bfg-glow', new THREE.SphereGeometry(1.2, 8, 6));
    
    // BOMB - Ultra-simplified geometry
    const bombGeometries = [];
    
    // Main bomb body (ultra-low-poly)
    const bombBody = new THREE.SphereGeometry(1, 8, 6);
    bombGeometries.push(bombBody);
    
    // Warning stripe (minimal segments)
    const bombStripe = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 6);
    bombStripe.rotateZ(Math.PI / 4);
    bombGeometries.push(bombStripe);
    
    // Reduced fins (only 2 instead of 4)
    for (let i = 0; i < 2; i++) {
      const fin = new THREE.BoxGeometry(0.1, 0.4, 0.6);
      fin.rotateY((i * Math.PI));
      fin.translate(0, 0, 0.5);
      bombGeometries.push(fin);
    }
    
    const bombGeometry = BufferGeometryUtils.mergeGeometries(bombGeometries);
    
    // PERFORMANCE: Check BVH cache first
    cachedBVH = bvhCache.getCachedBVH(bombGeometry, 'bomb');
    if (cachedBVH) {
      bombGeometry.boundsTree = cachedBVH;
      console.log('[WEAPON POOL] Using cached BVH for bomb geometry');
    } else {
      // Only assign BVH functions if no cache found
      bombGeometry.computeBoundsTree = computeBoundsTree;
      bombGeometry.disposeBoundsTree = disposeBoundsTree;
    }
    
    this.geometryCache.set('bomb', bombGeometry);
    this.geometryCache.set('bomb-light', new THREE.SphereGeometry(0.3, 6, 4));
    
    // RAILGUN - Ultra-low-poly electromagnetic effect
    this.geometryCache.set('railgun-main', new THREE.CylinderGeometry(0.06, 0.06, 8, 6));
    this.geometryCache.set('railgun-trail', new THREE.CylinderGeometry(0.16, 0.16, 8, 6));
    this.geometryCache.set('railgun-field', new THREE.CylinderGeometry(0.24, 0.24, 8, 4));
    this.geometryCache.set('railgun-spike', new THREE.ConeGeometry(0.04, 0.4, 4));
    this.geometryCache.set('railgun-electricity', new THREE.SphereGeometry(0.3, 6, 4));
  }

  // Ensure BVH is computed and cached for a weapon type
  ensureBVHForWeapon(weaponType) {
    const geometry = this.geometryCache.get(weaponType);
    if (!geometry) return;
    
    // If BVH already exists, nothing to do
    if (geometry.boundsTree) return;
    
    // Compute BVH
    console.log(`[WEAPON POOL] Computing BVH for ${weaponType} geometry...`);
    const startTime = performance.now();
    
    if (geometry.computeBoundsTree) {
      geometry.computeBoundsTree();
      
      // Cache the computed BVH
      if (geometry.boundsTree) {
        bvhCache.cacheBVH(geometry, weaponType, geometry.boundsTree);
        const computeTime = performance.now() - startTime;
        console.log(`[WEAPON POOL] BVH computed and cached for ${weaponType} in ${computeTime.toFixed(2)}ms`);
      }
    }
  }
  
  // Clear BVH cache (useful for development/debugging)
  clearBVHCache() {
    bvhCache.clearAllCaches();
    console.log('[WEAPON POOL] BVH cache cleared');
  }
  
  // Get BVH cache statistics
  getBVHCacheStats() {
    return bvhCache.getCacheStats();
  }

  createPooledWeapon(weaponType) {
    const group = new THREE.Group();
    group.userData = { weaponType, missileId: null };
    
    switch (weaponType) {
      case 'rocket':
        return this.createPooledRocket(group);
      case 'bfg':
        return this.createPooledBFG(group);
      case 'bomb':
        return this.createPooledBomb(group);
      case 'railgun':
        return this.createPooledRailgun(group);
      default:
        return group;
    }
  }

  createPooledRocket(group) {
    // PERFORMANCE: Use cached materials to avoid repeated allocations
    if (!this.materialCache.has('rocket-main')) {
      // PERFORMANCE: Use MeshBasicMaterial which doesn't need lighting calculations
      this.materialCache.set('rocket-main', new THREE.MeshBasicMaterial({ 
        color: '#ff8800'
      }));
    }
    // REMOVED: Exhaust material no longer needed since we disabled exhaust glow for performance
    
    // Single merged mesh for rocket
    const rocketMesh = new THREE.Mesh(
      this.geometryCache.get('rocket'),
      this.materialCache.get('rocket-main') // Use shared material - don't clone during creation
    );
    group.add(rocketMesh);
    
    // PERFORMANCE: Disable exhaust glow to reduce draw calls
    // const exhaustGlow = new THREE.Mesh(
    //   this.geometryCache.get('rocket-exhaust'),
    //   this.materialCache.get('rocket-exhaust')
    // );
    // exhaustGlow.position.z = -0.7;
    // exhaustGlow.name = 'exhaust-glow';
    // group.add(exhaustGlow);
    
    // PERFORMANCE: Disable PointLight for rockets - use emissive material instead
    // const light = new THREE.PointLight('#ff8800', 15, 20);
    // light.name = 'rocket-light';
    // group.add(light);
    
    group.userData.updateColor = (color) => {
      rocketMesh.material.color.set(color);
      // light.color.set(color);
    };
    
    return group;
  }

  createPooledBFG(group) {
    // Core sphere
    const core = new THREE.Mesh(
      this.geometryCache.get('bfg-core'),
      new THREE.MeshBasicMaterial({ 
        color: '#00ff00',
        transparent: true,
        opacity: 0.9
      })
    );
    group.add(core);
    
    // Glow sphere - enhanced opacity to compensate for no PointLight
    const glow = new THREE.Mesh(
      this.geometryCache.get('bfg-glow'),
      new THREE.MeshBasicMaterial({ 
        color: '#00ff00',
        transparent: true,
        opacity: 0.5  // Increased from 0.3
      })
    );
    glow.name = 'bfg-glow';
    group.add(glow);
    
    // PERFORMANCE: Disable PointLight for BFG - use emissive material instead
    // const light = new THREE.PointLight('#00ff00', 50, 30);
    // light.name = 'bfg-light';
    // group.add(light);
    
    group.userData.updateColor = (color) => {
      core.material.color.set(color);
      glow.material.color.set(color);
      // light.color.set(color);
    };
    
    return group;
  }

  createPooledBomb(group) {
    // Main bomb mesh (body + fins + stripe merged)
    const bombMesh = new THREE.Mesh(
      this.geometryCache.get('bomb'),
      new THREE.MeshBasicMaterial({ color: '#333333' })
    );
    group.add(bombMesh);
    
    // Blinking red light (separate for animation) - enhanced visibility
    const blinkLight = new THREE.Mesh(
      this.geometryCache.get('bomb-light'),
      new THREE.MeshBasicMaterial({ 
        color: '#ff0000',
        transparent: true,
        opacity: 0.6  // Increased from 0.3 for better visibility without PointLight
      })
    );
    blinkLight.name = 'blink-light';
    group.add(blinkLight);
    
    // PERFORMANCE: Disable PointLight for bomb - use material glow only
    // const light = new THREE.PointLight('#ff0000', 30, 15);
    // light.name = 'bomb-light';
    // group.add(light);
    
    // Animation data
    group.userData.animationData = {
      isDeployed: false,
      startTime: Date.now()
    };
    
    group.userData.updateAnimation = (isDeployed) => {
      group.userData.animationData.isDeployed = isDeployed;
      if (isDeployed) {
        group.userData.animationData.startTime = Date.now();
      }
    };
    
    return group;
  }

  createPooledRailgun(group) {
    // Main rail
    const rail = new THREE.Mesh(
      this.geometryCache.get('railgun-main'),
      new THREE.MeshBasicMaterial({ 
        color: '#00ffdd'
      })
    );
    rail.rotation.x = Math.PI / 2;
    group.add(rail);
    
    // Electromagnetic trail - enhanced visibility
    const trail = new THREE.Mesh(
      this.geometryCache.get('railgun-trail'),
      new THREE.MeshBasicMaterial({ 
        color: '#00aaff',
        transparent: true,
        opacity: 0.6  // Increased from 0.4
      })
    );
    trail.rotation.x = Math.PI / 2;
    trail.name = 'rail-trail';
    group.add(trail);
    
    // Outer field - enhanced visibility
    const field = new THREE.Mesh(
      this.geometryCache.get('railgun-field'),
      new THREE.MeshBasicMaterial({ 
        color: '#ffffff',
        transparent: true,
        opacity: 0.3  // Increased from 0.2
      })
    );
    field.rotation.x = Math.PI / 2;
    field.name = 'rail-field';
    group.add(field);
    
    // Front spike
    const spike = new THREE.Mesh(
      this.geometryCache.get('railgun-spike'),
      new THREE.MeshBasicMaterial({ 
        color: '#ffffff'
      })
    );
    spike.position.z = -4.2;
    spike.rotation.x = Math.PI / 2;
    group.add(spike);
    
    // Electricity effect - enhanced visibility
    const electricity = new THREE.Mesh(
      this.geometryCache.get('railgun-electricity'),
      new THREE.MeshBasicMaterial({ 
        color: '#00ffff',
        transparent: true,
        opacity: 0.5,  // Increased from 0.3
        wireframe: true
      })
    );
    electricity.name = 'rail-electricity';
    group.add(electricity);
    
    // PERFORMANCE: Disable PointLight for railgun - use material colors only
    // const light = new THREE.PointLight('#00ffdd', 80, 30);
    // light.name = 'rail-light';
    // group.add(light);
    
    return group;
  }

  // Get a weapon mesh from the pool with missile data
  acquire(weaponType, missileId) {
    const pool = this.pools.get(weaponType);
    if (!pool) {
      console.warn(`[WEAPON POOL] Unknown weapon type: ${weaponType}`);
      return null;
    }
    
    console.log(`[WEAPON POOL DEBUG] Acquiring ${weaponType} for missile ${missileId}`);
    console.log(`[WEAPON POOL DEBUG] Pool state - available: ${pool.available.length}, active: ${pool.active.size}`);
    
    // Check if we have available meshes - NO DYNAMIC EXPANSION to prevent lag spikes
    if (pool.available.length === 0) {
      console.warn(`[WEAPON POOL] ${weaponType} pool exhausted! Available: ${pool.available.length}, Active: ${pool.active.size}`);
      return null; // Return null instead of blocking main thread with mesh creation
    }
    
    // Get mesh from pool
    const mesh = pool.available.pop();
    console.log(`[WEAPON POOL DEBUG] Got mesh from pool:`, mesh);
    
    // Set mesh visible immediately - deferring broke firing
    mesh.visible = true;
    console.log(`[WEAPON POOL DEBUG] Set mesh visible to true, checking visibility: ${mesh.visible}`);
    
    mesh.userData.missileId = missileId;
    mesh.userData.poolWeaponType = weaponType; // CRITICAL: Store weapon type for O(1) release
    pool.active.set(missileId, mesh);
    
    // PERFORMANCE FIX: Add to global map for O(1) lookups
    this.globalMeshMap.set(missileId, mesh);
    this.cacheVersion++; // Invalidate cache
    
    // Invalidate stats cache since pool state changed
    this.cachedStats = null;
    
    this.poolConfigs[weaponType].activeCount++;
    
    console.log(`[WEAPON POOL DEBUG] Pool state after acquisition - available: ${pool.available.length}, active: ${pool.active.size}`);
    
    return mesh;
  }

  // NEW: Acquire a live missile directly (no store involvement)
  acquireLiveMissile(weaponType, missileData) {
    const mesh = this.acquire(weaponType, missileData.id);
    if (!mesh) return null;
    
    // Store weapon type for O(1) release
    mesh.userData.poolWeaponType = weaponType;
    
    // Store missile data directly on the mesh (avoid object spreading to reduce allocations)
    mesh.userData.missileData = missileData;
    mesh.userData.startTime = Date.now();
    
    
    // Set initial position and rotation immediately - deferring broke firing
    mesh.position.set(missileData.position.x, missileData.position.y, missileData.position.z);
    if (missileData.rotation) {
      mesh.rotation.set(missileData.rotation.x, missileData.rotation.y, missileData.rotation.z);
    }
    
    // Skip color update to avoid expensive material operations during firing
    // Color updates can be handled during rendering if needed
    
    return mesh;
  }

  // PERFORMANCE FIX: Cached active missiles to avoid O(n×m) every frame
  getActiveMissiles() {
    this.updateCacheIfNeeded();
    return this.cachedActiveMissiles;
  }
  
  // PERFORMANCE FIX: Get minimal missile updates for worker (reduced serialization)
  getActiveMissileUpdates() {
    this.updateCacheIfNeeded();
    return this.cachedMissileUpdates;
  }
  
  // PERFORMANCE FIX: Only rebuild cache when missiles are added/removed
  updateCacheIfNeeded() {
    const now = performance.now();
    
    // Only update cache if version changed (missile added/removed) or it's been too long
    if (this.lastCacheUpdate === this.cacheVersion && (now - this.lastCacheUpdate) < 16) {
      return; // Cache is still valid
    }
    
    // Rebuild cache
    this.cachedActiveMissiles = [];
    this.cachedMissileUpdates = [];
    
    // Use global map for O(1) access instead of nested loops
    this.globalMeshMap.forEach((mesh, missileId) => {
      if (mesh.userData.missileData) {
        // Full missile data for collision detection
        this.cachedActiveMissiles.push(mesh.userData.missileData);
        
        // Minimal data for worker serialization
        this.cachedMissileUpdates.push({
          id: mesh.userData.missileData.id,
          position: mesh.userData.missileData.position,
          velocity: mesh.userData.missileData.velocity,
          weaponType: mesh.userData.missileData.weaponType,
          type: mesh.userData.missileData.type,
          homing: mesh.userData.missileData.homing,
          size: mesh.userData.missileData.size
        });
      }
    });
    
    this.lastCacheUpdate = this.cacheVersion;
  }

  // PERFORMANCE FIX: O(1) missile position updates using global map
  updateMissilePositions(missileUpdates) {
    missileUpdates.forEach(update => {
      // PERFORMANCE FIX: O(1) lookup instead of O(n×m) search
      const mesh = this.globalMeshMap.get(update.id);
      
      if (mesh && mesh.userData.missileData) {
        // Update position
        mesh.position.set(update.position.x, update.position.y, update.position.z);
        
        // Update missile data
        mesh.userData.missileData.position = { ...update.position };
        if (update.velocity) {
          mesh.userData.missileData.velocity = { ...update.velocity };
        }
        
        // Handle special weapon updates
        if (mesh.userData.missileData.weaponType === 'bomb' && update.shouldExplode) {
          mesh.userData.missileData.shouldExplode = true;
        }
      } else {
        // This can happen if missile was cleaned up between physics update and position update
        // It's not an error, just log for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`[WEAPON POOL] Missile ${update.id} (${update.weaponType}) already cleaned up`);
        }
      }
    });
  }

  // Return a weapon mesh to the pool
  release(missileId) {
    // PERFORMANCE FIX: Use global map for O(1) lookup instead of searching all pools
    const mesh = this.globalMeshMap.get(missileId);
    if (!mesh) {
      console.warn(`[WEAPON POOL] Release failed - mesh not found for ID: ${missileId}`);
      return false;
    }
    
    // O(1) lookup using stored weapon type
    const weaponType = mesh.userData.poolWeaponType;
    if (!weaponType) {
      console.warn(`[WEAPON POOL] Release failed - no poolWeaponType for ID: ${missileId}`);
      return false;
    }
    
    const foundPool = this.pools.get(weaponType);
    if (!foundPool) {
      console.warn(`[WEAPON POOL] Release failed - pool not found for type: ${weaponType}`);
      return false;
    }
    
    foundPool.active.delete(missileId);
    
    // Remove from global map
    this.globalMeshMap.delete(missileId);
    this.cacheVersion++; // Invalidate cache
    
    // Invalidate stats cache since pool state changed
    this.cachedStats = null;
    
    // Reset mesh state immediately - deferring caused issues
    mesh.visible = false;
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.userData.missileId = null;
    
    // Reset animation data if bomb
    if (weaponType === 'bomb' && mesh.userData.animationData) {
      mesh.userData.animationData.isDeployed = false;
    }
    
    // Return to available pool
    foundPool.available.push(mesh);
    this.poolConfigs[weaponType].activeCount--;
    
    // Debug logging removed to prevent performance overhead
    
    return true;
  }

  // Update animations for active meshes
  updateAnimations() {
    const now = Date.now();
    
    // Update bomb animations
    const bombPool = this.pools.get('bomb');
    if (bombPool) {
      bombPool.active.forEach((mesh) => {
        const blinkLight = mesh.getObjectByName('blink-light');
        // PointLight removed for performance
        
        if (blinkLight) {
          const animData = mesh.userData.animationData;
          const blinkSpeed = animData.isDeployed ? 4 : 2;
          const elapsed = (now - animData.startTime) * 0.001;
          const blinkIntensity = Math.sin(elapsed * blinkSpeed * Math.PI) * 0.5 + 0.5;
          
          // Enhanced blinking effect to compensate for no PointLight
          blinkLight.material.opacity = 0.4 + blinkIntensity * 0.6; // Wider range
          // pointLight.intensity = blinkIntensity * 30; // Removed
        }
      });
    }
    
    // Update railgun electricity animation
    const railgunPool = this.pools.get('railgun');
    if (railgunPool) {
      railgunPool.active.forEach((mesh) => {
        const electricity = mesh.getObjectByName('rail-electricity');
        if (electricity) {
          // Enhanced animation range for better visibility without PointLight
          const opacity = 0.4 + Math.sin(now * 0.02) * 0.3; // Range: 0.4-0.7
          electricity.material.opacity = opacity;
        }
      });
    }
  }

  // Get pool statistics (cached to prevent lag spikes during weapon firing)
  getStats() {
    const now = performance.now();
    
    // Return cached stats if they're less than 1 second old
    if (this.cachedStats && (now - this.lastStatsUpdate) < 1000) {
      return this.cachedStats;
    }
    
    // Calculate fresh stats
    const stats = {};
    
    Object.entries(this.poolConfigs).forEach(([weaponType, config]) => {
      const pool = this.pools.get(weaponType);
      stats[weaponType] = {
        poolSize: config.size,
        active: pool.active.size, // Use actual active count from Map
        available: pool.available.length,
        totalCreated: pool.totalCreated,
        utilizationRate: (pool.active.size / config.size * 100).toFixed(1) + '%'
      };
    });
    
    // Cache the results
    this.cachedStats = stats;
    this.lastStatsUpdate = now;
    this.statsCacheVersion++;
    
    return stats;
  }

  // Warm up the pool by pre-creating all weapon instances during loading
  warmupPool() {
    if (this.isWarmedUp) {
      console.log('[WEAPON POOL] Already warmed up, skipping duplicate warmup');
      return { totalWarmed: 0, warmupTime: 0 };
    }
    
    console.log('[WEAPON POOL] Warming up weapon pools with GPU pre-compilation...');
    const startTime = performance.now();
    
    const weaponTypes = ['rocket', 'bfg', 'bomb', 'railgun'];
    let totalWarmed = 0;
    
    // Create temporary scene for warmup if one doesn't exist
    let tempScene = null;
    const needsTempScene = !this.scene;
    
    if (needsTempScene) {
      tempScene = new THREE.Scene();
      // Add basic lighting for materials that need it
      tempScene.add(new THREE.AmbientLight(0xffffff, 0.5));
      tempScene.add(new THREE.DirectionalLight(0xffffff, 0.5));
      this.initializeScene(tempScene);
    }
    
    // Force GPU compilation by making first mesh of each type visible
    weaponTypes.forEach(weaponType => {
      const config = this.poolConfigs[weaponType];
      const pool = this.pools.get(weaponType);
      if (config && pool && pool.available.length > 0) {
        console.log(`[WEAPON POOL] GPU pre-compiling ${weaponType} shaders...`);
        
        // Take first few meshes from each pool and make them visible off-screen
        const meshesToWarm = Math.min(3, pool.available.length);
        for (let i = 0; i < meshesToWarm; i++) {
          const mesh = pool.available[i];
          mesh.position.set(9999 + i * 100, 9999, 9999); // Off-screen, slightly different positions
          mesh.visible = true;
          
          // Force material variations to compile
          mesh.traverse(child => {
            if (child.isMesh && child.material) {
              // Touch material properties to ensure compilation
              child.material.needsUpdate = true;
            }
            if (child.isLight) {
              // Ensure lights are enabled
              child.visible = true;
            }
          });
        }
        
        totalWarmed += meshesToWarm;
      }
    });
    
    // Also warm up simple weapon materials (laser, chaingun, default)
    console.log('[WEAPON POOL] Pre-compiling simple weapon shaders...');
    const simpleMaterials = {
      default: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      laser: new THREE.MeshBasicMaterial({ color: '#ff0000' }),
      chaingun: new THREE.MeshBasicMaterial({ color: '#ffff00' }),
      charge: new THREE.MeshBasicMaterial({ color: '#0080ff', transparent: true, opacity: 0.8 })
    };
    
    Object.entries(simpleMaterials).forEach(([type, material]) => {
      const geometry = new THREE.SphereGeometry(0.3, 8, 6);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(8888, 8888, 8888);
      mesh.visible = true;
      if (this.scene) {
        this.scene.add(mesh);
        // Remove after a frame (check if scene exists)
        setTimeout(() => {
          if (this.scene) {
            this.scene.remove(mesh);
          }
        }, 100);
        totalWarmed++;
      }
    });
    
    // Reset all warmed meshes back to their initial state
    console.log('[WEAPON POOL] Resetting warmed meshes to initial state...');
    weaponTypes.forEach(weaponType => {
      const pool = this.pools.get(weaponType);
      if (pool && pool.available.length > 0) {
        pool.available.forEach(mesh => {
          mesh.visible = false;
          mesh.position.set(0, 0, 0);
          mesh.rotation.set(0, 0, 0);
          
          // Reset all child objects
          mesh.traverse(child => {
            if (child.isLight) {
              child.visible = true; // Keep lights visible but they'll be hidden with parent
            }
          });
        });
      }
    });
    
    // Clean up temporary scene if we created one
    if (needsTempScene && tempScene) {
      // Remove all meshes from temporary scene
      tempScene.clear();
      
      // Reset scene reference so the real game scene can be initialized later
      this.scene = null;
      this.isInitialized = false;
      
      console.log('[WEAPON POOL] Cleaned up temporary scene, meshes ready for real scene');
    }
    
    const warmupTime = performance.now() - startTime;
    console.log(`[WEAPON POOL] Warmup complete - ${totalWarmed} weapons ready in ${warmupTime.toFixed(2)}ms`);
    
    this.isWarmedUp = true;
    
    return { totalWarmed, warmupTime };
  }

  // Clear all active missiles and reset pools
  clearAllActiveMissiles() {
    console.log('[WEAPON POOL] Clearing all active missiles');
    console.log('[WEAPON POOL] Before clear - Active missiles:', this.globalMeshMap.size);
    
    // Log current stats before clearing
    const beforeStats = this.getStats();
    console.log('[WEAPON POOL] Before clear stats:', beforeStats);
    
    // Release all active missiles from all pools
    this.globalMeshMap.forEach((mesh, missileId) => {
      this.release(missileId);
    });
    
    // Reset cache
    this.cachedActiveMissiles = [];
    this.cachedMissileUpdates = [];
    this.cacheVersion = 0;
    this.lastCacheUpdate = 0;
    
    // Reset active counts
    Object.keys(this.poolConfigs).forEach(weaponType => {
      this.poolConfigs[weaponType].activeCount = 0;
    });
    
    // Log stats after clearing
    const afterStats = this.getStats();
    console.log('[WEAPON POOL] After clear stats:', afterStats);
    
    // Verify all pools are empty
    this.pools.forEach((pool, weaponType) => {
      if (pool.active.size > 0) {
        console.warn(`[WEAPON POOL] ${weaponType} pool still has ${pool.active.size} active missiles after clear`);
      }
    });
  }

  // Dispose of all resources
  dispose() {
    // Dispose geometries and BVH structures
    this.geometryCache.forEach(geometry => {
      if (geometry.boundsTree) {
        geometry.disposeBoundsTree();
      }
      geometry.dispose();
    });
    this.geometryCache.clear();
    
    // Dispose materials and meshes
    this.pools.forEach(pool => {
      [...pool.available, ...pool.active.values()].forEach(group => {
        group.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });
    });
    
    this.pools.clear();
  }
}

// Force new instance - timestamp: 1735843200000
const weaponMeshPool = new WeaponMeshPool();

export default weaponMeshPool;