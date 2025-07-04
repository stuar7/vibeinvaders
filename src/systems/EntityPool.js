import * as THREE from 'three';

/**
 * Unified Entity Pool System
 * High-performance object pooling for aliens, asteroids, and other game entities
 * Follows the successful WeaponMeshPool2 pattern but for game logic entities
 */
class EntityPool {
  constructor() {
    // Pool configurations for different entity types
    this.poolConfigs = {
      // Alien pools by type (increased sizes)
      alien_scout: { size: 50, activeCount: 0, health: 2, points: 10 },
      alien_armored: { size: 40, activeCount: 0, health: 4, points: 15 },
      alien_elite: { size: 30, activeCount: 0, health: 6, points: 20 },
      alien_boss: { size: 10, activeCount: 0, health: 50, points: 500 },
      alien_flying: { size: 20, activeCount: 0, health: 6, points: 30 },
      
      // Asteroid pools by type
      asteroid_normal: { size: 25, activeCount: 0, health: 1 },
      asteroid_large: { size: 15, activeCount: 0, health: 3 },
      asteroid_superlarge: { size: 8, activeCount: 0, health: 5 },
      asteroid_doodad: { size: 5, activeCount: 0, health: 0 }
      
      // Future entity types can be added here
      // powerup: { size: 10, activeCount: 0 },
      // debris: { size: 30, activeCount: 0 }
    };
    
    // Entity pools storage
    this.pools = new Map();
    
    // PERFORMANCE: Global ID→entity map for O(1) lookups
    this.globalEntityMap = new Map();
    
    // PERFORMANCE: Cached active entities to avoid O(n×m) every frame
    this.cachedActiveEntities = new Map(); // entityType -> entities[]
    this.cacheVersion = 0;
    this.lastCacheUpdate = 0;
    
    // Entity creation templates
    this.entityTemplates = this.createEntityTemplates();
    
    // Initialize pools
    this.initializePools();
    
    console.log('[ENTITY POOL] Initialized with', Object.keys(this.poolConfigs).length, 'entity types');
  }

  initializePools() {
    Object.entries(this.poolConfigs).forEach(([entityType, config]) => {
      this.pools.set(entityType, {
        available: [],
        active: new Map(), // entityId -> entity
        totalCreated: 0
      });
      
      // Pre-create pool entities
      for (let i = 0; i < config.size; i++) {
        const entity = this.createPooledEntity(entityType);
        if (entity) {
          entity.pooled = true;
          entity.active = false;
          this.pools.get(entityType).available.push(entity);
        } else {
          console.warn(`[ENTITY POOL] Skipping entity creation for unknown type: ${entityType}`);
        }
      }
      
      console.log(`[ENTITY POOL] Created ${config.size} ${entityType} entities`);
    });
  }

  createEntityTemplates() {
    return {
      // Alien templates based on the 5 types from analysis
      alien_scout: {
        type: 1,
        health: 2,
        maxHealth: 2,
        points: 10,
        size: 1.5,
        color: '#ff0000',
        behaviorState: 'flying',
        isFlying: true,
        speed: 15,
        firingRate: 0.3
      },
      alien_armored: {
        type: 2,
        health: 4,
        maxHealth: 4,
        points: 15,
        size: 1.8,
        color: '#0000ff',
        behaviorState: 'flying',
        isFlying: true,
        speed: 12,
        firingRate: 0.25
      },
      alien_elite: {
        type: 3,
        health: 6,
        maxHealth: 6,
        points: 20,
        size: 2.0,
        color: '#00ff00',
        behaviorState: 'flying',
        isFlying: true,
        speed: 18,
        firingRate: 0.4
      },
      alien_boss: {
        type: 4,
        health: 50,
        maxHealth: 50,
        points: 500,
        size: 4.0,
        color: '#800080',
        behaviorState: 'flying',
        isFlying: true,
        speed: 8,
        firingRate: 0.6
      },
      alien_flying: {
        type: 5,
        health: 6,
        maxHealth: 6,
        points: 30,
        size: 2.2,
        color: '#808080',
        behaviorState: 'flying',
        isFlying: true,
        speed: 20,
        firingRate: 0.2,
        weaponType: 'charge'
      },
      
      // Asteroid templates based on 4 types from analysis
      asteroid_normal: {
        type: 'Normal',
        health: 1,
        maxHealth: 1,
        size: 2.0, // 1.5-4.5 range, using middle value
        color: '#8B4513',
        isDoodad: false,
        rotationSpeed: 0.01
      },
      asteroid_large: {
        type: 'Large',
        health: 3,
        maxHealth: 3,
        size: 6.5, // 5-8 range
        color: '#F4A460',
        isDoodad: false,
        rotationSpeed: 0.008
      },
      asteroid_superlarge: {
        type: 'SuperLarge',
        health: 5,
        maxHealth: 5,
        size: 10.0, // 8-12 range
        color: '#FF4500',
        isDoodad: false,
        rotationSpeed: 0.005
      },
      asteroid_doodad: {
        type: 'UltraMassive',
        health: 0,
        maxHealth: 0,
        size: 35.0, // 20-50 range
        color: '#2F4F4F',
        isDoodad: true,
        rotationSpeed: 0.002
      }
    };
  }

  createPooledEntity(entityType) {
    const template = this.entityTemplates[entityType];
    if (!template) {
      console.error(`[ENTITY POOL] Unknown entity type: ${entityType}`);
      return null;
    }
    
    const entity = {
      // Core properties
      id: null, // Will be set on acquisition
      entityType: entityType,
      pooled: true,
      active: false,
      
      // Spatial properties
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      
      // Copy template properties
      ...template,
      
      // Timestamps
      spawnTime: 0,
      lastUpdateTime: 0,
      
      // Alien-specific properties
      ...(entityType.startsWith('alien_') && {
        isInvulnerable: false,
        combatDistance: -40.5,
        lastFireTime: 0,
        targetPlayer: null,
        formation: null
      }),
      
      // Asteroid-specific properties
      ...(entityType.startsWith('asteroid_') && {
        fragmentsOnDeath: entityType === 'asteroid_large' ? 3 : 
                         entityType === 'asteroid_superlarge' ? 5 : 0,
        deformation: null // For damage visualization
      })
    };
    
    return entity;
  }

  // Acquire an entity from the pool
  acquire(entityType, entityData = {}) {
    const pool = this.pools.get(entityType);
    if (!pool) {
      console.warn(`[ENTITY POOL] Unknown entity type: ${entityType}`);
      return null;
    }
    
    // Check if we have available entities
    if (pool.available.length === 0) {
      console.warn(`[ENTITY POOL] Pool exhausted for ${entityType}, expanding...`);
      // Expand pool dynamically
      const newEntity = this.createPooledEntity(entityType);
      pool.available.push(newEntity);
      pool.totalCreated++;
    }
    
    // Get entity from pool
    const entity = pool.available.pop();
    const entityId = entityData.id || `${entityType}-${Date.now()}-${Math.random()}`;
    
    // Initialize entity with provided data
    entity.id = entityId;
    entity.active = true;
    entity.spawnTime = Date.now();
    entity.lastUpdateTime = Date.now();
    
    // Apply provided data (position, custom properties, etc.)
    Object.assign(entity, entityData);
    
    // Ensure health is reset to max
    if (entity.maxHealth > 0) {
      entity.health = entity.maxHealth;
    }
    
    // Add to active pool and global map
    pool.active.set(entityId, entity);
    this.globalEntityMap.set(entityId, entity);
    this.poolConfigs[entityType].activeCount++;
    this.cacheVersion++; // Invalidate cache
    
    return entity;
  }

  // Release an entity back to the pool
  release(entityId) {
    const entity = this.globalEntityMap.get(entityId);
    if (!entity) return false;
    
    const entityType = entity.entityType;
    const pool = this.pools.get(entityType);
    if (!pool) return false;
    
    // Remove from active pool
    pool.active.delete(entityId);
    this.globalEntityMap.delete(entityId);
    
    // Reset entity state
    this.resetEntity(entity);
    
    // Return to available pool
    pool.available.push(entity);
    this.poolConfigs[entityType].activeCount--;
    this.cacheVersion++; // Invalidate cache
    
    return true;
  }

  resetEntity(entity) {
    // Reset core state
    entity.id = null;
    entity.active = false;
    entity.position = { x: 0, y: 0, z: 0 };
    entity.velocity = { x: 0, y: 0, z: 0 };
    entity.rotation = { x: 0, y: 0, z: 0 };
    entity.spawnTime = 0;
    entity.lastUpdateTime = 0;
    
    // Reset type-specific properties
    const template = this.entityTemplates[entity.entityType];
    if (template) {
      entity.health = template.health;
      entity.maxHealth = template.maxHealth;
    }
    
    // Reset alien-specific state
    if (entity.entityType.startsWith('alien_')) {
      entity.isInvulnerable = false;
      entity.behaviorState = 'flying';
      entity.isFlying = true;
      entity.lastFireTime = 0;
      entity.targetPlayer = null;
      entity.formation = null;
    }
    
    // Reset asteroid-specific state
    if (entity.entityType.startsWith('asteroid_')) {
      entity.deformation = null;
    }
  }

  // PERFORMANCE: Cached active entities to avoid O(n×m) every frame
  getActiveEntities(entityType) {
    this.updateCacheIfNeeded();
    return this.cachedActiveEntities.get(entityType) || [];
  }
  
  getAllActiveEntities() {
    this.updateCacheIfNeeded();
    const allEntities = [];
    this.cachedActiveEntities.forEach(entities => {
      allEntities.push(...entities);
    });
    return allEntities;
  }
  
  // PERFORMANCE: Only rebuild cache when entities are added/removed
  updateCacheIfNeeded() {
    const now = performance.now();
    
    // Only update cache if version changed or it's been too long
    if (this.lastCacheUpdate === this.cacheVersion && (now - this.lastCacheUpdate) < 16) {
      return; // Cache is still valid
    }
    
    // Rebuild cache
    this.cachedActiveEntities.clear();
    
    this.pools.forEach((pool, entityType) => {
      const activeEntities = Array.from(pool.active.values());
      this.cachedActiveEntities.set(entityType, activeEntities);
    });
    
    this.lastCacheUpdate = this.cacheVersion;
  }

  // Get entity by ID (O(1) lookup)
  getEntityById(entityId) {
    return this.globalEntityMap.get(entityId);
  }

  // Update entity health and handle destruction
  damageEntity(entityId, damage) {
    console.log(`[ENTITY POOL] damageEntity called: ID=${entityId}, damage=${damage}`);
    const entity = this.globalEntityMap.get(entityId);
    
    if (!entity) {
      console.warn(`[ENTITY POOL] Entity ${entityId} not found in pool`);
      return false;
    }
    
    if (entity.health <= 0) {
      console.warn(`[ENTITY POOL] Entity ${entityId} already dead (health: ${entity.health})`);
      return false;
    }
    
    const oldHealth = entity.health;
    entity.health -= damage;
    
    console.log(`[ENTITY POOL] Entity ${entityId} health: ${oldHealth} -> ${entity.health}`);
    
    if (entity.health <= 0) {
      console.log(`[ENTITY POOL] Entity ${entityId} destroyed!`);
      return 'destroyed';
    }
    
    console.log(`[ENTITY POOL] Entity ${entityId} damaged but alive`);
    return 'damaged';
  }

  // Clear all active entities (for game reset)
  clearAllActiveEntities() {
    console.log('[ENTITY POOL] Clearing all active entities');
    
    // Release all active entities
    const allEntityIds = Array.from(this.globalEntityMap.keys());
    allEntityIds.forEach(entityId => {
      this.release(entityId);
    });
    
    // Reset cache
    this.cachedActiveEntities.clear();
    this.cacheVersion = 0;
    this.lastCacheUpdate = 0;
    
    console.log('[ENTITY POOL] All entities cleared');
  }

  // Get pool statistics
  getStats() {
    const stats = {};
    
    Object.entries(this.poolConfigs).forEach(([entityType, config]) => {
      const pool = this.pools.get(entityType);
      stats[entityType] = {
        poolSize: config.size,
        active: config.activeCount,
        available: pool.available.length,
        totalCreated: pool.totalCreated,
        utilizationRate: (config.activeCount / config.size * 100).toFixed(1) + '%'
      };
    });
    
    return stats;
  }

  // Batch operations for performance
  acquireMultiple(entityType, count, entityDataArray = []) {
    const entities = [];
    for (let i = 0; i < count; i++) {
      const entityData = entityDataArray[i] || {};
      const entity = this.acquire(entityType, entityData);
      if (entity) entities.push(entity);
    }
    return entities;
  }

  releaseMultiple(entityIds) {
    let releasedCount = 0;
    entityIds.forEach(entityId => {
      if (this.release(entityId)) releasedCount++;
    });
    return releasedCount;
  }

  // Dispose of all resources
  dispose() {
    this.clearAllActiveEntities();
    this.pools.clear();
    this.globalEntityMap.clear();
    this.cachedActiveEntities.clear();
    console.log('[ENTITY POOL] Disposed');
  }
}

// Singleton instance
const entityPool = new EntityPool();

export default entityPool;