// Web Worker for Collision Detection using BVH
// Handles expensive collision calculations in parallel

/* eslint-env worker */
/* global self */
/* eslint no-restricted-globals: ["error", "event", "fdescribe"] */

import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

// Non-blocking message-based logging
const WORKER_DEBUG = true; // Enable debug logging via postMessage
const workerLog = WORKER_DEBUG ? (message) => {
  // Low priority, non-blocking log via postMessage
  self.postMessage({
    type: 'workerLog',
    source: 'collisionDetection',
    level: 'debug',
    message: message,
    timestamp: performance.now()
  });
} : () => {};

// Simplified BVH collision checking in worker
class WorkerBVHCollisionSystem {
  constructor() {
    this.aliensBVH = null;
    this.asteroidsBVH = null;
    this.alienTriangleMap = new Map();
    this.asteroidTriangleMap = new Map();
  }

  updateBVH(entities, entityType) {
    // Rebuild BVH with entity data
    const geometries = [];
    const triangleMap = entityType === 'alien' ? this.alienTriangleMap : this.asteroidTriangleMap;
    triangleMap.clear();
    
    let triangleOffset = 0;
    
    entities.forEach((entity, index) => {
      // Create simple geometry bounds
      const size = entity.size || 1.5;
      const bounds = {
        min: {
          x: entity.position.x - size,
          y: entity.position.y - size,
          z: (entity.position.z || 0) - size
        },
        max: {
          x: entity.position.x + size,
          y: entity.position.y + size,
          z: (entity.position.z || 0) + size
        }
      };
      
      // Store entity reference
      triangleMap.set(index, entity);
    });
    
    // Store the BVH reference
    if (entityType === 'alien') {
      this.aliensBVH = { entities, triangleMap };
    } else {
      this.asteroidsBVH = { entities, triangleMap };
    }
  }

  checkMissileCollisions(missiles, aliens, asteroids, playerPosition) {
    const collisions = {
      missileAlienHits: [],
      missileAsteroidHits: [],
      alienMissilePlayerHits: [],
      processTime: 0
    };
    
    const startTime = performance.now();
    
    // Spatial optimization: Create spatial hash grid to reduce collision checks
    const gridSize = 20; // 20-unit grid cells
    const alienGrid = new Map();
    const asteroidGrid = new Map();
    
    // Hash aliens into spatial grid
    aliens.forEach(alien => {
      if (alien.isInvulnerable) return;
      const gridX = Math.floor(alien.position.x / gridSize);
      const gridY = Math.floor(alien.position.y / gridSize);
      const gridZ = Math.floor(alien.position.z / gridSize);
      const key = `${gridX},${gridY},${gridZ}`;
      
      if (!alienGrid.has(key)) alienGrid.set(key, []);
      alienGrid.get(key).push(alien);
    });
    
    // Hash asteroids into spatial grid
    asteroids.forEach(asteroid => {
      const gridX = Math.floor(asteroid.position.x / gridSize);
      const gridY = Math.floor(asteroid.position.y / gridSize);
      const gridZ = Math.floor(asteroid.position.z / gridSize);
      const key = `${gridX},${gridY},${gridZ}`;
      
      if (!asteroidGrid.has(key)) asteroidGrid.set(key, []);
      asteroidGrid.get(key).push(asteroid);
    });
    
    // Helper function to get collision radius based on LOD level
    const getCollisionRadius = (missile, distance) => {
      if (!['rocket', 'bomb', 'railgun'].includes(missile.weaponType)) {
        return missile.size || 0.2;
      }
      
      // Adjust collision precision based on distance (LOD concept)
      if (distance < 50) {
        return missile.size || 0.2; // Full precision
      } else if (distance < 150) {
        return (missile.size || 0.2) * 1.2; // Slightly larger for medium LOD
      } else {
        return (missile.size || 0.2) * 1.5; // Even larger for low LOD
      }
    };
    
    // Check each missile using spatial grid optimization
    missiles.forEach(missile => {
      if (missile.type !== 'player' && missile.type !== 'wingman') return;
      
      // Get missile's grid position
      const missileGridX = Math.floor(missile.position.x / gridSize);
      const missileGridY = Math.floor(missile.position.y / gridSize);
      const missileGridZ = Math.floor((missile.position.z || 0) / gridSize);
      
      // Check alien collisions - only check nearby grid cells
      let closestAlien = null;
      let closestAlienDistance = Infinity;
      
      // Check 3x3x3 grid around missile (27 cells max instead of all aliens)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = `${missileGridX + dx},${missileGridY + dy},${missileGridZ + dz}`;
            const nearbyAliens = alienGrid.get(key);
            
            if (!nearbyAliens) continue;
            
            nearbyAliens.forEach(alien => {
              const dx = missile.position.x - alien.position.x;
              const dy = missile.position.y - alien.position.y;
              const dz = (missile.position.z || 0) - alien.position.z;
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
              
              const missileRadius = getCollisionRadius(missile, distance);
              const collisionRadius = (alien.size || 1.5) + missileRadius + 0.3;
              
              if (distance < collisionRadius && distance < closestAlienDistance) {
                closestAlienDistance = distance;
                closestAlien = alien;
              }
            });
          }
        }
      }
      
      if (closestAlien) {
        collisions.missileAlienHits.push({
          missileId: missile.id,
          alienId: closestAlien.id,
          distance: closestAlienDistance
        });
      }
      
      // Check asteroid collisions - using same spatial grid optimization
      let closestAsteroid = null;
      let closestAsteroidDistance = Infinity;
      
      // Check 3x3x3 grid around missile for asteroids
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = `${missileGridX + dx},${missileGridY + dy},${missileGridZ + dz}`;
            const nearbyAsteroids = asteroidGrid.get(key);
            
            if (!nearbyAsteroids) continue;
            
            nearbyAsteroids.forEach(asteroid => {
              if (asteroid.isDoodad) return;
              
              const dx = missile.position.x - asteroid.position.x;
              const dy = missile.position.y - asteroid.position.y;
              const dz = (missile.position.z || 0) - asteroid.position.z;
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
              
              const missileRadius = getCollisionRadius(missile, distance);
              const collisionRadius = asteroid.size * 2.0 + missileRadius + 0.8;
              
              if (distance < collisionRadius && distance < closestAsteroidDistance) {
                closestAsteroidDistance = distance;
                closestAsteroid = asteroid;
              }
            });
          }
        }
      }
      
      if (closestAsteroid) {
        collisions.missileAsteroidHits.push({
          missileId: missile.id,
          asteroidId: closestAsteroid.id,
          distance: closestAsteroidDistance
        });
      }
      
      // Check alien missile vs player collisions
      if (missile.type === 'alien' && playerPosition) {
        const dx = missile.position.x - playerPosition.x;
        const dy = missile.position.y - playerPosition.y;
        const distanceSquared = dx * dx + dy * dy;
        
        // Skip expensive sqrt calculation if obviously too far (performance optimization)
        if (distanceSquared <= 64) { // 8x8 = 64 (much larger than 2.0 collision radius)
          const distance = Math.sqrt(distanceSquared);
          
          if (distance < 2.0) { // Adjusted for 10% larger player ship
            collisions.alienMissilePlayerHits.push({
              missileId: missile.id,
              distance: distance
            });
          }
        }
      }
    });
    
    collisions.processTime = performance.now() - startTime;
    
    // Debug logging for performance monitoring
    if (missiles.length > 20 && collisions.processTime > 5) {
      workerLog(`[COLLISION OPTIMIZATION] Processed ${missiles.length} missiles vs ${aliens.length} aliens + ${asteroids.length} asteroids in ${collisions.processTime.toFixed(2)}ms using spatial grid`);
    }
    
    return collisions;
  }

  checkExplosionCollisions(explosions, aliens) {
    const hits = [];
    
    explosions.forEach(explosion => {
      aliens.forEach(alien => {
        const dx = alien.position.x - explosion.position.x;
        const dy = alien.position.y - explosion.position.y;
        const dz = alien.position.z - explosion.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance <= explosion.radius) {
          hits.push({
            explosionId: explosion.id,
            alienId: alien.id,
            distance: distance
          });
        }
      });
    });
    
    return hits;
  }
}

const collisionSystem = new WorkerBVHCollisionSystem();

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'updateEntities':
      // Update BVH structures with new entity positions
      if (data.aliens) {
        collisionSystem.updateBVH(data.aliens, 'alien');
      }
      if (data.asteroids) {
        collisionSystem.updateBVH(data.asteroids, 'asteroid');
      }
      break;
      
    case 'checkCollisions':
      // Perform collision detection
      const collisions = collisionSystem.checkMissileCollisions(
        data.missiles || [],
        data.aliens || [],
        data.asteroids || [],
        data.playerPosition || null
      );
      
      // Send results back
      self.postMessage({
        type: 'collisionResults',
        collisions: collisions,
        timestamp: data.timestamp
      });
      break;
      
    case 'checkExplosions':
      // Check explosion radius collisions
      const explosionHits = collisionSystem.checkExplosionCollisions(
        data.explosions || [],
        data.aliens || []
      );
      
      self.postMessage({
        type: 'explosionResults',
        hits: explosionHits,
        timestamp: data.timestamp
      });
      break;
  }
};

// Handle errors
self.onerror = function(error) {
  console.error('Collision Detection Worker Error:', error);
};
