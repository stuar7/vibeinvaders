import { useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import entityPool from '../systems/EntityPool';

/**
 * Hook for managing game entities through the EntityPool system
 * Provides high-level interface for spawning, updating, and managing entities
 */
export const useEntityPool = () => {
  const lastStatsUpdate = useRef(0);
  
  // Spawn alien with proper pool management
  const spawnAlien = useCallback((alienType, spawnData) => {
    // Map alien type numbers to pool entity types
    const typeMap = {
      1: 'alien_scout',
      2: 'alien_armored', 
      3: 'alien_elite',
      4: 'alien_boss',
      5: 'alien_flying'
    };
    
    const poolType = typeMap[alienType];
    if (!poolType) {
      console.warn(`[ENTITY POOL] Unknown alien type: ${alienType}`);
      return null;
    }
    
    const alien = entityPool.acquire(poolType, {
      ...spawnData,
      type: alienType // Keep original type for compatibility
    });
    
    if (alien) {
      // Check for duplicate IDs
      const existingAlien = useGameStore.getState().aliens.find(a => a.id === alien.id);
      if (existingAlien) {
        console.warn(`[DUPLICATE ID] Alien with ID ${alien.id} already exists!`);
      }
      
      // Add to game store for immediate React updates
      const addAlien = useGameStore.getState().addAlien;
      addAlien(alien);
      
      console.log(`[ENTITY POOL] Spawned ${poolType} with ID: ${alien.id}, health: ${alien.health}/${alien.maxHealth} at position:`, alien.position);
    }
    
    return alien;
  }, []);
  
  // Spawn asteroid with proper pool management
  const spawnAsteroid = useCallback((asteroidType, spawnData) => {
    // Map asteroid type strings to pool entity types
    const typeMap = {
      'Normal': 'asteroid_normal',
      'Large': 'asteroid_large',
      'SuperLarge': 'asteroid_superlarge',
      'UltraMassive': 'asteroid_doodad'
    };
    
    const poolType = typeMap[asteroidType];
    if (!poolType) {
      console.warn(`[ENTITY POOL] Unknown asteroid type: ${asteroidType}`);
      return null;
    }
    
    const asteroid = entityPool.acquire(poolType, {
      ...spawnData,
      type: asteroidType // Keep original type for compatibility
    });
    
    if (asteroid) {
      // Add to game store for immediate React updates
      const addAsteroid = useGameStore.getState().addAsteroid;
      addAsteroid(asteroid);
      
      console.log(`[ENTITY POOL] Spawned ${poolType} with ID: ${asteroid.id}`);
    }
    
    return asteroid;
  }, []);
  
  // Remove alien and return to pool
  const removeAlien = useCallback((alienId) => {
    const alien = entityPool.getEntityById(alienId);
    if (!alien) return false;
    
    // Remove from game store
    const removeAlienFromStore = useGameStore.getState().removeAlien;
    removeAlienFromStore(alienId);
    
    // Return to pool
    const released = entityPool.release(alienId);
    
    if (released) {
      console.log(`[ENTITY POOL] Released alien ${alienId} back to pool`);
    }
    
    return released;
  }, []);
  
  // Remove asteroid and return to pool
  const removeAsteroid = useCallback((asteroidId) => {
    const asteroid = entityPool.getEntityById(asteroidId);
    if (!asteroid) return false;
    
    // Remove from game store
    const removeAsteroidFromStore = useGameStore.getState().removeAsteroid;
    removeAsteroidFromStore(asteroidId);
    
    // Return to pool
    const released = entityPool.release(asteroidId);
    
    if (released) {
      console.log(`[ENTITY POOL] Released asteroid ${asteroidId} back to pool`);
    }
    
    return released;
  }, []);
  
  // Damage entity through pool (maintains pool health tracking)
  const damageEntity = useCallback((entityId, damage) => {
    const result = entityPool.damageEntity(entityId, damage);
    
    if (result === 'destroyed') {
      const entity = entityPool.getEntityById(entityId);
      if (entity) {
        if (entity.entityType.startsWith('alien_')) {
          removeAlien(entityId);
        } else if (entity.entityType.startsWith('asteroid_')) {
          removeAsteroid(entityId);
        }
      }
    }
    
    return result;
  }, [removeAlien, removeAsteroid]);
  
  // Get active entities by type
  const getActiveEntities = useCallback((entityType) => {
    return entityPool.getActiveEntities(entityType);
  }, []);
  
  // Get all active entities
  const getAllActiveEntities = useCallback(() => {
    return entityPool.getAllActiveEntities();
  }, []);
  
  // Batch spawn operations for performance
  const spawnAlienWave = useCallback((alienSpecs) => {
    const spawnedAliens = [];
    
    alienSpecs.forEach(spec => {
      const alien = spawnAlien(spec.type, spec.spawnData);
      if (alien) spawnedAliens.push(alien);
    });
    
    console.log(`[ENTITY POOL] Spawned wave of ${spawnedAliens.length} aliens`);
    return spawnedAliens;
  }, [spawnAlien]);
  
  const spawnAsteroidField = useCallback((asteroidSpecs) => {
    const spawnedAsteroids = [];
    
    asteroidSpecs.forEach(spec => {
      const asteroid = spawnAsteroid(spec.type, spec.spawnData);
      if (asteroid) spawnedAsteroids.push(asteroid);
    });
    
    console.log(`[ENTITY POOL] Spawned field of ${spawnedAsteroids.length} asteroids`);
    return spawnedAsteroids;
  }, [spawnAsteroid]);
  
  // Clear all entities (for game reset)
  const clearAllEntities = useCallback(() => {
    // Clear from pools
    entityPool.clearAllActiveEntities();
    
    // Clear from store
    const updateAliens = useGameStore.getState().updateAliens;
    const updateAsteroids = useGameStore.getState().updateAsteroids;
    updateAliens([]);
    updateAsteroids([]);
    
    console.log('[ENTITY POOL] Cleared all entities from pools and store');
  }, []);
  
  // Get pool statistics for performance monitoring
  const getPoolStats = useCallback(() => {
    const now = performance.now();
    
    // Throttle stats updates to every 2 seconds
    if (now - lastStatsUpdate.current < 2000) {
      return null;
    }
    
    lastStatsUpdate.current = now;
    return entityPool.getStats();
  }, []);
  
  // Sync pool entities with store (for cases where store is modified directly)
  const syncWithStore = useCallback(() => {
    const currentAliens = useGameStore.getState().aliens;
    const currentAsteroids = useGameStore.getState().asteroids;
    
    console.log(`[ENTITY SYNC] Store aliens: ${currentAliens.length}, Store asteroids: ${currentAsteroids.length}`);
    
    // Get pool stats by type
    const poolStats = getPoolStats();
    let totalPoolAliens = 0;
    let totalPoolAsteroids = 0;
    
    Object.entries(poolStats).forEach(([entityType, stats]) => {
      if (entityType.startsWith('alien_')) {
        totalPoolAliens += stats.active;
      } else if (entityType.startsWith('asteroid_')) {
        totalPoolAsteroids += stats.active;
      }
    });
    
    console.log(`[ENTITY SYNC] Pool aliens: ${totalPoolAliens}, Pool asteroids: ${totalPoolAsteroids}`);
    
    // Check for entities in store but not in pool
    currentAliens.forEach(alien => {
      if (!entityPool.getEntityById(alien.id)) {
        console.warn(`[ENTITY POOL] Alien ${alien.id} in store but not in pool`);
      }
    });
    
    currentAsteroids.forEach(asteroid => {
      if (!entityPool.getEntityById(asteroid.id)) {
        console.warn(`[ENTITY POOL] Asteroid ${asteroid.id} in store but not in pool`);
      }
    });
    
    // Check for entities in pool but not in store
    const poolEntities = getAllActiveEntities();
    poolEntities.forEach(entity => {
      if (entity.entityType.startsWith('alien_')) {
        const inStore = currentAliens.some(alien => alien.id === entity.id);
        if (!inStore) {
          console.warn(`[ENTITY POOL] Alien ${entity.id} in pool but not in store`);
        }
      } else if (entity.entityType.startsWith('asteroid_')) {
        const inStore = currentAsteroids.some(asteroid => asteroid.id === entity.id);
        if (!inStore) {
          console.warn(`[ENTITY POOL] Asteroid ${entity.id} in pool but not in store`);
        }
      }
    });
  }, [getAllActiveEntities, getPoolStats]);
  
  // Migration helper to convert existing entities to pooled entities
  const migrateExistingEntities = useCallback(() => {
    const currentAliens = useGameStore.getState().aliens;
    const currentAsteroids = useGameStore.getState().asteroids;
    
    console.log(`[ENTITY POOL] Migrating ${currentAliens.length} aliens and ${currentAsteroids.length} asteroids to pool system`);
    
    // Migrate aliens
    const migratedAliens = [];
    currentAliens.forEach(alien => {
      const poolType = {
        1: 'alien_scout',
        2: 'alien_armored',
        3: 'alien_elite', 
        4: 'alien_boss',
        5: 'alien_flying'
      }[alien.type];
      
      if (poolType) {
        const pooledAlien = entityPool.acquire(poolType, alien);
        if (pooledAlien) {
          migratedAliens.push(pooledAlien);
        }
      }
    });
    
    // Migrate asteroids
    const migratedAsteroids = [];
    currentAsteroids.forEach(asteroid => {
      const poolType = {
        'Normal': 'asteroid_normal',
        'Large': 'asteroid_large',
        'SuperLarge': 'asteroid_superlarge',
        'UltraMassive': 'asteroid_doodad'
      }[asteroid.type];
      
      if (poolType) {
        const pooledAsteroid = entityPool.acquire(poolType, asteroid);
        if (pooledAsteroid) {
          migratedAsteroids.push(pooledAsteroid);
        }
      }
    });
    
    // Update store with migrated entities
    const updateAliens = useGameStore.getState().updateAliens;
    const updateAsteroids = useGameStore.getState().updateAsteroids;
    updateAliens(migratedAliens);
    updateAsteroids(migratedAsteroids);
    
    console.log(`[ENTITY POOL] Migration complete: ${migratedAliens.length} aliens, ${migratedAsteroids.length} asteroids`);
  }, []);
  
  return {
    // Basic entity operations
    spawnAlien,
    spawnAsteroid,
    removeAlien,
    removeAsteroid,
    damageEntity,
    
    // Query operations
    getActiveEntities,
    getAllActiveEntities,
    
    // Batch operations
    spawnAlienWave,
    spawnAsteroidField,
    clearAllEntities,
    
    // Utility operations
    getPoolStats,
    syncWithStore,
    migrateExistingEntities
  };
};