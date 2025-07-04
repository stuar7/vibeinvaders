import * as THREE from 'three';

class EffectsPool {
  constructor() {
    // Pool configurations for different effect types
    this.poolConfigs = {
      explosion: { size: 100, activeCount: 0 }, // 20 particles × 5 concurrent explosions
      hit: { size: 50, activeCount: 0 },
      playerHit: { size: 20, activeCount: 0 },
      shieldHit: { size: 30, activeCount: 0 },
      powerupCollect: { size: 20, activeCount: 0 }
    };
    
    // Object pools
    this.pools = new Map();
    
    // Pre-built geometries and materials (shared across all instances)
    this.geometryCache = new Map();
    this.materialCache = new Map();
    
    // Scene reference for proper pooling
    this.scene = null;
    this.isInitialized = false;
    
    // Initialize pools
    this.initializePools();
  }

  initializePools() {
    console.log('[EFFECTS POOL] Initializing particle pools...');
    const startTime = performance.now();
    
    // Pre-build shared geometry (single plane for all particles)
    this.geometryCache.set('particle', new THREE.PlaneGeometry(0.3, 0.3));
    
    // Pre-build materials for different effect types
    this.materialCache.set('explosion', new THREE.MeshBasicMaterial({ 
      color: '#ff8800', 
      transparent: true, 
      opacity: 1,
      side: THREE.DoubleSide
    }));
    this.materialCache.set('hit', new THREE.MeshBasicMaterial({ 
      color: '#ffff00', 
      transparent: true, 
      opacity: 1,
      side: THREE.DoubleSide
    }));
    this.materialCache.set('playerHit', new THREE.MeshBasicMaterial({ 
      color: '#ff0000', 
      transparent: true, 
      opacity: 1,
      side: THREE.DoubleSide
    }));
    this.materialCache.set('shieldHit', new THREE.MeshBasicMaterial({ 
      color: '#00ffff', 
      transparent: true, 
      opacity: 1,
      side: THREE.DoubleSide
    }));
    this.materialCache.set('powerupCollect', new THREE.MeshBasicMaterial({ 
      color: '#ffffff', 
      transparent: true, 
      opacity: 1,
      side: THREE.DoubleSide
    }));
    
    // Create pools for each effect type
    Object.entries(this.poolConfigs).forEach(([effectType, config]) => {
      this.pools.set(effectType, {
        available: [],
        active: new Map(), // effectId -> array of pooled particles
        totalCreated: 0
      });
      
      // Pre-create pool particles
      for (let i = 0; i < config.size; i++) {
        const particle = this.createPooledParticle(effectType);
        particle.visible = false;
        this.pools.get(effectType).available.push(particle);
      }
      
      console.log(`[EFFECTS POOL] Created ${config.size} ${effectType} particles`);
    });
    
    const loadTime = performance.now() - startTime;
    console.log(`[EFFECTS POOL] Initialization complete in ${loadTime.toFixed(2)}ms`);
  }

  // Initialize scene and add all pooled particles to it
  initializeScene(scene) {
    if (this.isInitialized || !scene) {
      return;
    }
    
    console.log('[EFFECTS POOL] Initializing scene with pooled particles...');
    this.scene = scene;
    
    // Add all pooled particles to scene (invisible)
    this.pools.forEach((pool, effectType) => {
      pool.available.forEach(particle => {
        particle.visible = false;
        scene.add(particle);
      });
      console.log(`[EFFECTS POOL] Added ${pool.available.length} ${effectType} particles to scene`);
    });
    
    this.isInitialized = true;
    console.log('[EFFECTS POOL] Scene initialization complete - particles pre-added');
  }

  createPooledParticle(effectType) {
    const geometry = this.geometryCache.get('particle');
    const material = this.materialCache.get(effectType).clone(); // Clone for individual opacity control
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { 
      effectType,
      effectId: null,
      initialPosition: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      initialScale: 1,
      initialRotation: 0,
      startTime: 0
    };
    
    return mesh;
  }

  // Acquire particles for an effect
  acquireEffect(effectType, effectId, particleCount = 20) {
    const pool = this.pools.get(effectType);
    if (!pool) {
      console.warn(`[EFFECTS POOL] Unknown effect type: ${effectType}`);
      return [];
    }
    
    const particles = [];
    
    // Get required number of particles from pool
    for (let i = 0; i < particleCount; i++) {
      // Check if we have available particles
      if (pool.available.length === 0) {
        console.warn(`[EFFECTS POOL] Pool exhausted for ${effectType}, expanding...`);
        // Expand pool dynamically
        const newParticle = this.createPooledParticle(effectType);
        newParticle.visible = false;
        
        // Add to scene if scene is initialized
        if (this.scene) {
          this.scene.add(newParticle);
        }
        
        pool.totalCreated++;
        pool.available.push(newParticle);
      }
      
      // Get particle from pool and make it visible
      const particle = pool.available.pop();
      particle.visible = true;
      particle.userData.effectId = effectId;
      particles.push(particle);
    }
    
    // Store active particles for this effect
    pool.active.set(effectId, particles);
    this.poolConfigs[effectType].activeCount += particleCount;
    
    return particles;
  }

  // Release particles back to pool
  releaseEffect(effectId) {
    let released = false;
    
    // Check all pools for this effect
    for (const [effectType, pool] of this.pools.entries()) {
      if (pool.active.has(effectId)) {
        const particles = pool.active.get(effectId);
        pool.active.delete(effectId);
        
        particles.forEach(particle => {
          // Reset particle state
          particle.visible = false;
          particle.position.set(0, 0, 0);
          particle.rotation.set(0, 0, 0);
          particle.scale.set(1, 1, 1);
          particle.material.opacity = 1;
          particle.userData.effectId = null;
          
          // Return to available pool
          pool.available.push(particle);
        });
        
        this.poolConfigs[effectType].activeCount -= particles.length;
        released = true;
        break;
      }
    }
    
    return released;
  }

  // Update animations for active particles
  updateAnimations() {
    const now = Date.now();
    
    this.pools.forEach((pool, effectType) => {
      pool.active.forEach((particles, effectId) => {
        particles.forEach(particle => {
          const userData = particle.userData;
          const elapsed = now - userData.startTime;
          const progress = elapsed / 1000; // 1 second duration
          
          if (progress <= 1) {
            // Update position based on velocity
            particle.position.x = userData.initialPosition.x + userData.velocity.x * progress * 10;
            particle.position.y = userData.initialPosition.y + userData.velocity.y * progress * 10;
            particle.position.z = userData.initialPosition.z + userData.velocity.z * progress * 10;
            
            // Update scale (shrink over time)
            const scale = userData.initialScale * (1 - progress);
            particle.scale.set(scale, scale, scale);
            
            // Update rotation
            particle.rotation.z = userData.initialRotation + progress * Math.PI * 2;
            
            // Update opacity (fade out)
            particle.material.opacity = 1 - progress;
          }
        });
      });
    });
  }

  // Get pool statistics
  getStats() {
    const stats = {};
    
    Object.entries(this.poolConfigs).forEach(([effectType, config]) => {
      const pool = this.pools.get(effectType);
      stats[effectType] = {
        poolSize: config.size,
        active: config.activeCount,
        available: pool.available.length,
        totalCreated: pool.totalCreated,
        utilizationRate: (config.activeCount / config.size * 100).toFixed(1) + '%'
      };
    });
    
    return stats;
  }

  // Dispose of all resources
  dispose() {
    // Dispose geometries
    this.geometryCache.forEach(geometry => {
      geometry.dispose();
    });
    this.geometryCache.clear();
    
    // Dispose materials
    this.materialCache.forEach(material => {
      material.dispose();
    });
    this.materialCache.clear();
    
    // Dispose pooled particles
    this.pools.forEach(pool => {
      [...pool.available, ...Array.from(pool.active.values()).flat()].forEach(particle => {
        if (particle.geometry) particle.geometry.dispose();
        if (particle.material) particle.material.dispose();
      });
    });
    
    this.pools.clear();
  }
}

// Singleton instance
const effectsPool = new EffectsPool();

export default effectsPool;