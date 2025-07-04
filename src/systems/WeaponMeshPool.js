import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import asyncAssetManager from './AsyncAssetManager';

class WeaponMeshPool {
  constructor() {
    // Pool configurations for complex weapons
    this.poolConfigs = {
      rocket: { size: 60, activeCount: 0 }, // Increased for rapid fire scenarios
      bfg: { size: 20, activeCount: 0 },
      bomb: { size: 15, activeCount: 0 },
      railgun: { size: 25, activeCount: 0 }
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
      return;
    }
    
    console.log('[WEAPON POOL] Initializing scene with pooled meshes...');
    this.scene = scene;
    
    // Add all pooled meshes to scene (invisible)
    this.pools.forEach((pool, weaponType) => {
      pool.available.forEach(mesh => {
        mesh.visible = false;
        scene.add(mesh);
      });
      console.log(`[WEAPON POOL] Added ${pool.available.length} ${weaponType} meshes to scene`);
    });
    
    this.isInitialized = true;
    console.log('[WEAPON POOL] Scene initialization complete - meshes pre-added');
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
    // Check if async assets are available first
    if (this.useAsyncAssets) {
      return this.prebuildAsyncGeometries();
    }
    
    // Ultra-low-poly geometries for maximum performance
    // ROCKET - Single merged mesh with minimal triangles
    const rocketGeometries = [];
    
    // Main body (8 triangles)
    const rocketBody = new THREE.BoxGeometry(0.2, 0.2, 1);
    rocketGeometries.push(rocketBody);
    
    // Nose cone (VERY low poly - 3 segments = 6 triangles)
    const rocketNose = new THREE.ConeGeometry(0.15, 0.4, 3);
    rocketNose.translate(0, 0, 0.7);
    rocketGeometries.push(rocketNose);
    
    // Exhaust (VERY low poly - 3 segments = 6 triangles)  
    const rocketExhaust = new THREE.ConeGeometry(0.3, 0.6, 3);
    rocketExhaust.translate(0, 0, -0.7);
    rocketGeometries.push(rocketExhaust);
    
    // Merge into single geometry (~20 triangles total per rocket)
    this.geometryCache.set('rocket', BufferGeometryUtils.mergeGeometries(rocketGeometries));
    
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
    
    this.geometryCache.set('bomb', BufferGeometryUtils.mergeGeometries(bombGeometries));
    this.geometryCache.set('bomb-light', new THREE.SphereGeometry(0.3, 6, 4));
    
    // RAILGUN - Ultra-low-poly electromagnetic effect
    this.geometryCache.set('railgun-main', new THREE.CylinderGeometry(0.06, 0.06, 8, 6));
    this.geometryCache.set('railgun-trail', new THREE.CylinderGeometry(0.16, 0.16, 8, 6));
    this.geometryCache.set('railgun-field', new THREE.CylinderGeometry(0.24, 0.24, 8, 4));
    this.geometryCache.set('railgun-spike', new THREE.ConeGeometry(0.04, 0.4, 4));
    this.geometryCache.set('railgun-electricity', new THREE.SphereGeometry(0.3, 6, 4));
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
    // Single merged mesh for rocket
    const rocketMesh = new THREE.Mesh(
      this.geometryCache.get('rocket'),
      new THREE.MeshBasicMaterial({ color: '#ff8800' })
    );
    group.add(rocketMesh);
    
    // Exhaust glow mesh (can be toggled for LOD)
    const exhaustGlow = new THREE.Mesh(
      this.geometryCache.get('rocket-exhaust') || new THREE.ConeGeometry(0.3, 0.6, 6),
      new THREE.MeshBasicMaterial({ 
        color: '#ffaa00', 
        transparent: true, 
        opacity: 0.6 
      })
    );
    exhaustGlow.position.z = -0.7;
    exhaustGlow.name = 'exhaust-glow';
    group.add(exhaustGlow);
    
    // Point light
    const light = new THREE.PointLight('#ff8800', 15, 20);
    light.name = 'rocket-light';
    group.add(light);
    
    group.userData.updateColor = (color) => {
      rocketMesh.material.color.set(color);
      light.color.set(color);
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
    
    // Glow sphere
    const glow = new THREE.Mesh(
      this.geometryCache.get('bfg-glow'),
      new THREE.MeshBasicMaterial({ 
        color: '#00ff00',
        transparent: true,
        opacity: 0.3
      })
    );
    glow.name = 'bfg-glow';
    group.add(glow);
    
    // Intense light
    const light = new THREE.PointLight('#00ff00', 50, 30);
    light.name = 'bfg-light';
    group.add(light);
    
    group.userData.updateColor = (color) => {
      core.material.color.set(color);
      glow.material.color.set(color);
      light.color.set(color);
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
    
    // Blinking red light (separate for animation)
    const blinkLight = new THREE.Mesh(
      this.geometryCache.get('bomb-light'),
      new THREE.MeshBasicMaterial({ 
        color: '#ff0000',
        transparent: true,
        opacity: 0.3
      })
    );
    blinkLight.name = 'blink-light';
    group.add(blinkLight);
    
    // Pulsing point light
    const light = new THREE.PointLight('#ff0000', 30, 15);
    light.name = 'bomb-light';
    group.add(light);
    
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
      new THREE.MeshStandardMaterial({ 
        color: '#00ffdd',
        emissive: '#004466',
        emissiveIntensity: 0.5
      })
    );
    rail.rotation.x = Math.PI / 2;
    group.add(rail);
    
    // Electromagnetic trail
    const trail = new THREE.Mesh(
      this.geometryCache.get('railgun-trail'),
      new THREE.MeshBasicMaterial({ 
        color: '#00aaff',
        transparent: true,
        opacity: 0.4
      })
    );
    trail.rotation.x = Math.PI / 2;
    trail.name = 'rail-trail';
    group.add(trail);
    
    // Outer field
    const field = new THREE.Mesh(
      this.geometryCache.get('railgun-field'),
      new THREE.MeshBasicMaterial({ 
        color: '#ffffff',
        transparent: true,
        opacity: 0.2
      })
    );
    field.rotation.x = Math.PI / 2;
    field.name = 'rail-field';
    group.add(field);
    
    // Front spike
    const spike = new THREE.Mesh(
      this.geometryCache.get('railgun-spike'),
      new THREE.MeshStandardMaterial({ 
        color: '#ffffff',
        emissive: '#ffffff',
        emissiveIntensity: 0.8
      })
    );
    spike.position.z = -4.2;
    spike.rotation.x = Math.PI / 2;
    group.add(spike);
    
    // Electricity effect
    const electricity = new THREE.Mesh(
      this.geometryCache.get('railgun-electricity'),
      new THREE.MeshBasicMaterial({ 
        color: '#00ffff',
        transparent: true,
        opacity: 0.3,
        wireframe: true
      })
    );
    electricity.name = 'rail-electricity';
    group.add(electricity);
    
    // Intense light
    const light = new THREE.PointLight('#00ffdd', 80, 30);
    light.name = 'rail-light';
    group.add(light);
    
    return group;
  }

  // Get a weapon mesh from the pool with missile data
  acquire(weaponType, missileId) {
    const pool = this.pools.get(weaponType);
    if (!pool) {
      console.warn(`[WEAPON POOL] Unknown weapon type: ${weaponType}`);
      return null;
    }
    
    // Check if we have available meshes
    if (pool.available.length === 0) {
      console.warn(`[WEAPON POOL] Pool exhausted for ${weaponType}, expanding...`);
      // Expand pool dynamically
      const newMesh = this.createPooledWeapon(weaponType);
      newMesh.visible = false;
      
      // Add to scene if scene is initialized
      if (this.scene) {
        this.scene.add(newMesh);
        console.log(`[WEAPON POOL] Added expanded ${weaponType} mesh to scene`);
      }
      
      pool.totalCreated++;
      pool.available.push(newMesh);
    }
    
    if (process.env.NODE_ENV === 'development' && weaponType === 'rocket') {
      console.log(`[WEAPON POOL DEBUG] Rocket pool status - Available: ${pool.available.length}, Active: ${pool.active.size}`);
    }
    
    // Get mesh from pool
    const mesh = pool.available.pop();
    mesh.visible = true;
    mesh.userData.missileId = missileId;
    mesh.userData.poolWeaponType = weaponType; // CRITICAL: Store weapon type for O(1) release
    pool.active.set(missileId, mesh);
    
    // PERFORMANCE FIX: Add to global map for O(1) lookups
    this.globalMeshMap.set(missileId, mesh);
    this.cacheVersion++; // Invalidate cache
    
    this.poolConfigs[weaponType].activeCount++;
    
    return mesh;
  }

  // NEW: Acquire a live missile directly (no store involvement)
  acquireLiveMissile(weaponType, missileData) {
    const mesh = this.acquire(weaponType, missileData.id);
    if (!mesh) return null;
    
    // Store weapon type for O(1) release
    mesh.userData.poolWeaponType = weaponType;
    
    // Store missile data directly on the mesh
    mesh.userData.missileData = {
      id: missileData.id,
      position: { ...missileData.position },
      velocity: { ...missileData.velocity },
      rotation: { ...missileData.rotation },
      type: missileData.type,
      weaponType: missileData.weaponType,
      homing: missileData.homing,
      size: missileData.size,
      color: missileData.color,
      damage: missileData.damage,
      startTime: Date.now()
    };
    
    
    // Set initial position and rotation
    mesh.position.set(missileData.position.x, missileData.position.y, missileData.position.z);
    if (missileData.rotation) {
      mesh.rotation.set(missileData.rotation.x, missileData.rotation.y, missileData.rotation.z);
    }
    
    // Update color if provided
    if (missileData.color && mesh.userData.updateColor) {
      mesh.userData.updateColor(missileData.color);
    }
    
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
        console.warn(`[WEAPON POOL] Could not find mesh for missile ${update.id} (${update.weaponType})`);
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
    
    // Reset mesh state
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
        const pointLight = mesh.getObjectByName('bomb-light');
        
        if (blinkLight && pointLight) {
          const animData = mesh.userData.animationData;
          const blinkSpeed = animData.isDeployed ? 4 : 2;
          const elapsed = (now - animData.startTime) * 0.001;
          const blinkIntensity = Math.sin(elapsed * blinkSpeed * Math.PI) * 0.5 + 0.5;
          
          blinkLight.material.opacity = 0.3 + blinkIntensity * 0.7;
          pointLight.intensity = blinkIntensity * 30;
        }
      });
    }
    
    // Update railgun electricity animation
    const railgunPool = this.pools.get('railgun');
    if (railgunPool) {
      railgunPool.active.forEach((mesh) => {
        const electricity = mesh.getObjectByName('rail-electricity');
        if (electricity) {
          const opacity = 0.3 + Math.sin(now * 0.02) * 0.2;
          electricity.material.opacity = opacity;
        }
      });
    }
  }

  // Get pool statistics
  getStats() {
    const stats = {};
    
    Object.entries(this.poolConfigs).forEach(([weaponType, config]) => {
      const pool = this.pools.get(weaponType);
      stats[weaponType] = {
        poolSize: config.size,
        active: config.activeCount,
        available: pool.available.length,
        totalCreated: pool.totalCreated,
        utilizationRate: (config.activeCount / config.size * 100).toFixed(1) + '%'
      };
      
      // Debug logging for rocket pool
      if (weaponType === 'rocket') {
        console.log(`[WEAPON POOL DEBUG] Rocket stats - Size: ${config.size}, Active: ${config.activeCount}, Available: ${pool.available.length}, Total: ${pool.totalCreated}`);
      }
    });
    
    return stats;
  }

  // Warm up the pool by pre-creating all weapon instances during loading
  warmupPool() {
    if (this.isWarmedUp) {
      console.log('[WEAPON POOL] Already warmed up, skipping duplicate warmup');
      return { totalWarmed: 0, warmupTime: 0 };
    }
    
    console.log('[WEAPON POOL] Warming up weapon pools...');
    const startTime = performance.now();
    
    const weaponTypes = ['rocket', 'bfg', 'bomb', 'railgun'];
    let totalWarmed = 0;
    
    // Create temporary scene for warmup if one doesn't exist
    let tempScene = null;
    const needsTempScene = !this.scene;
    
    if (needsTempScene) {
      tempScene = new THREE.Scene();
      this.initializeScene(tempScene);
    }
    
    weaponTypes.forEach(weaponType => {
      const config = this.poolConfigs[weaponType];
      if (config) {
        // Pre-acquire and release all weapons to trigger creation
        const tempIds = [];
        
        for (let i = 0; i < config.size; i++) {
          const tempId = `warmup_${weaponType}_${i}`;
          const mesh = this.acquire(weaponType, tempId);
          if (mesh) {
            tempIds.push(tempId);
            totalWarmed++;
          }
        }
        
        // Release them all back to the pool
        let releasedCount = 0;
        tempIds.forEach(tempId => {
          if (this.release(tempId)) {
            releasedCount++;
          }
        });
        
        console.log(`[WEAPON POOL] Warmed up ${config.size} ${weaponType} meshes (acquired: ${tempIds.length}, released: ${releasedCount})`);
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
    // Dispose geometries
    this.geometryCache.forEach(geometry => {
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