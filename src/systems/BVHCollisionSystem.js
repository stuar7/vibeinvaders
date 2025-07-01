import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { 
  MeshBVH, 
  MeshBVHHelper,
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree
} from 'three-mesh-bvh';

// Add BVH methods to THREE
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

class BVHCollisionSystem {
  constructor() {
    // BVH structures for different entity types
    this.aliensBVH = null;
    this.asteroidsBVH = null;
    
    // Merged geometries for BVH
    this.aliensMergedGeometry = null;
    this.asteroidsMergedGeometry = null;
    
    // Entity to triangle mapping for identification
    this.alienTriangleMap = new Map();
    this.asteroidTriangleMap = new Map();
    
    // Temporary objects for calculations
    this.tempMatrix = new THREE.Matrix4();
    this.tempSphere = new THREE.Sphere();
    this.tempBox = new THREE.Box3();
    this.tempVector = new THREE.Vector3();
    
    // Performance tracking
    this.lastRebuildTime = 0;
    this.rebuildThreshold = 100; // Rebuild if entities moved more than this threshold
    
    // Debug helpers
    this.debug = false;
    this.bvhHelpers = [];
  }

  /**
   * Creates a merged geometry from an array of entities for BVH construction
   */
  createMergedGeometry(entities, entityType = 'alien') {
    if (!entities || entities.length === 0) return null;

    const geometries = [];
    const triangleMap = entityType === 'alien' ? this.alienTriangleMap : this.asteroidTriangleMap;
    triangleMap.clear();
    
    let triangleOffset = 0;
    
    entities.forEach((entity, index) => {
      // Create geometry based on entity type
      let geometry;
      
      if (entityType === 'alien') {
        // Aliens use box geometry
        const size = entity.size || 1.5;
        geometry = new THREE.BoxGeometry(size * 2, size * 2, size * 2);
      } else {
        // Asteroids use sphere geometry
        const radius = entity.size || 1;
        geometry = new THREE.SphereGeometry(radius * 2, 8, 6); // Lower poly for performance
      }
      
      // Apply entity transform
      const matrix = new THREE.Matrix4();
      matrix.makeTranslation(
        entity.position.x,
        entity.position.y,
        entity.position.z || 0
      );
      geometry.applyMatrix4(matrix);
      
      // Map triangles to entity
      const triangleCount = geometry.index ? 
        geometry.index.count / 3 : 
        geometry.attributes.position.count / 3;
      
      for (let i = 0; i < triangleCount; i++) {
        triangleMap.set(triangleOffset + i, entity);
      }
      triangleOffset += triangleCount;
      
      geometries.push(geometry);
    });
    
    // Merge all geometries
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    
    // Compute BVH
    mergedGeometry.computeBoundsTree({
      strategy: 'CENTER',
      maxLeafTris: 5,
      maxDepth: 30
    });
    
    return mergedGeometry;
  }

  /**
   * Rebuild BVH for aliens
   */
  rebuildAliensBVH(aliens) {
    // Dispose old BVH
    if (this.aliensMergedGeometry) {
      this.aliensMergedGeometry.disposeBoundsTree();
      this.aliensMergedGeometry.dispose();
    }
    
    // Create new merged geometry and BVH
    this.aliensMergedGeometry = this.createMergedGeometry(aliens, 'alien');
    
    if (this.aliensMergedGeometry) {
      this.aliensBVH = this.aliensMergedGeometry.boundsTree;
    }
  }

  /**
   * Rebuild BVH for asteroids
   */
  rebuildAsteroidsBVH(asteroids) {
    // Filter out doodads
    const collidableAsteroids = asteroids.filter(a => !a.isDoodad);
    
    // Dispose old BVH
    if (this.asteroidsMergedGeometry) {
      this.asteroidsMergedGeometry.disposeBoundsTree();
      this.asteroidsMergedGeometry.dispose();
    }
    
    // Create new merged geometry and BVH
    this.asteroidsMergedGeometry = this.createMergedGeometry(collidableAsteroids, 'asteroid');
    
    if (this.asteroidsMergedGeometry) {
      this.asteroidsBVH = this.asteroidsMergedGeometry.boundsTree;
    }
  }

  /**
   * Check if a missile hits any aliens using BVH
   */
  checkMissileAlienCollisions(missile, aliens) {
    if (!this.aliensBVH || aliens.length === 0) return null;
    
    // Create a sphere for the missile
    this.tempSphere.center.set(
      missile.position.x,
      missile.position.y,
      missile.position.z || 0
    );
    this.tempSphere.radius = missile.size || 0.2;
    
    let hitAlien = null;
    let closestDistance = Infinity;
    
    // Use BVH to find potential collisions
    this.aliensBVH.shapecast({
      intersectsBounds: (box) => {
        return box.intersectsSphere(this.tempSphere);
      },
      
      intersectsTriangle: (triangle, triangleIndex) => {
        // Get the alien associated with this triangle
        const alien = this.alienTriangleMap.get(triangleIndex);
        if (!alien || alien.isInvulnerable) return false;
        
        // Precise distance check
        const dx = missile.position.x - alien.position.x;
        const dy = missile.position.y - alien.position.y;
        const dz = (missile.position.z || 0) - alien.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const collisionRadius = (alien.size || 1.5) + this.tempSphere.radius + 0.3; // Add buffer
        
        if (distance < collisionRadius && distance < closestDistance) {
          closestDistance = distance;
          hitAlien = alien;
        }
        
        return false; // Continue checking other triangles
      }
    });
    
    return hitAlien;
  }

  /**
   * Check if a missile hits any asteroids using BVH
   */
  checkMissileAsteroidCollisions(missile, asteroids) {
    if (!this.asteroidsBVH) return null;
    
    // Create a sphere for the missile
    this.tempSphere.center.set(
      missile.position.x,
      missile.position.y,
      missile.position.z || 0
    );
    this.tempSphere.radius = missile.size || 0.2;
    
    let hitAsteroid = null;
    let closestDistance = Infinity;
    
    // Use BVH to find potential collisions
    this.asteroidsBVH.shapecast({
      intersectsBounds: (box) => {
        return box.intersectsSphere(this.tempSphere);
      },
      
      intersectsTriangle: (triangle, triangleIndex) => {
        // Get the asteroid associated with this triangle
        const asteroid = this.asteroidTriangleMap.get(triangleIndex);
        if (!asteroid || asteroid.isDoodad) return false;
        
        // Precise distance check
        const dx = missile.position.x - asteroid.position.x;
        const dy = missile.position.y - asteroid.position.y;
        const dz = (missile.position.z || 0) - asteroid.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const collisionRadius = asteroid.size * 2.0 + 0.8; // Match original collision radius
        
        if (distance < collisionRadius && distance < closestDistance) {
          closestDistance = distance;
          hitAsteroid = asteroid;
        }
        
        return false; // Continue checking other triangles
      }
    });
    
    return hitAsteroid;
  }

  /**
   * Check if any alien missiles hit the player
   */
  checkAlienMissilePlayerCollision(missile, playerPosition, playerSize = 1.1) {
    // Simple sphere-sphere collision for player
    const dx = missile.position.x - playerPosition.x;
    const dy = missile.position.y - playerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < (playerSize + (missile.size || 0.2) + 0.8); // 2.0 total radius
  }

  /**
   * Get all entities within a radius (useful for explosions)
   */
  getEntitiesInRadius(position, radius, entityType = 'alien') {
    const bvh = entityType === 'alien' ? this.aliensBVH : this.asteroidsBVH;
    const triangleMap = entityType === 'alien' ? this.alienTriangleMap : this.asteroidTriangleMap;
    
    if (!bvh) return [];
    
    // Create sphere for radius check
    this.tempSphere.center.set(position.x, position.y, position.z || 0);
    this.tempSphere.radius = radius;
    
    const entitiesInRadius = new Set();
    
    bvh.shapecast({
      intersectsBounds: (box) => {
        return box.intersectsSphere(this.tempSphere);
      },
      
      intersectsTriangle: (triangle, triangleIndex) => {
        const entity = triangleMap.get(triangleIndex);
        if (!entity) return false;
        
        // Check actual distance
        const dx = position.x - entity.position.x;
        const dy = position.y - entity.position.y;
        const dz = (position.z || 0) - (entity.position.z || 0);
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance <= radius) {
          entitiesInRadius.add(entity);
        }
        
        return false; // Continue checking
      }
    });
    
    return Array.from(entitiesInRadius);
  }

  /**
   * Check if BVH needs rebuilding based on entity movement
   */
  needsRebuild(entities, entityType = 'alien') {
    // Rebuild every 60 frames or if entity count changed significantly
    const now = Date.now();
    if (now - this.lastRebuildTime > 1000) { // Every second
      this.lastRebuildTime = now;
      return true;
    }
    
    // Check if entity count changed significantly
    const triangleMap = entityType === 'alien' ? this.alienTriangleMap : this.asteroidTriangleMap;
    const currentCount = entities.length;
    const bvhCount = triangleMap.size > 0 ? Math.floor(triangleMap.size / 12) : 0; // Approximate entity count
    
    if (Math.abs(currentCount - bvhCount) > 5) {
      return true;
    }
    
    return false;
  }

  /**
   * Update debug visualizations
   */
  updateDebugHelpers(scene) {
    // Remove old helpers
    this.bvhHelpers.forEach(helper => {
      scene.remove(helper);
      helper.geometry.dispose();
    });
    this.bvhHelpers = [];
    
    if (!this.debug) return;
    
    // Add alien BVH helper
    if (this.aliensBVH) {
      const alienMesh = new THREE.Mesh(this.aliensMergedGeometry);
      const helper = new MeshBVHHelper(alienMesh, 10);
      helper.material.color.set(0xff0000);
      helper.material.opacity = 0.3;
      scene.add(helper);
      this.bvhHelpers.push(helper);
    }
    
    // Add asteroid BVH helper
    if (this.asteroidsBVH) {
      const asteroidMesh = new THREE.Mesh(this.asteroidsMergedGeometry);
      const helper = new MeshBVHHelper(asteroidMesh, 10);
      helper.material.color.set(0x00ff00);
      helper.material.opacity = 0.3;
      scene.add(helper);
      this.bvhHelpers.push(helper);
    }
  }

  /**
   * Dispose of all BVH resources
   */
  dispose() {
    if (this.aliensMergedGeometry) {
      this.aliensMergedGeometry.disposeBoundsTree();
      this.aliensMergedGeometry.dispose();
    }
    
    if (this.asteroidsMergedGeometry) {
      this.asteroidsMergedGeometry.disposeBoundsTree();
      this.asteroidsMergedGeometry.dispose();
    }
    
    this.alienTriangleMap.clear();
    this.asteroidTriangleMap.clear();
    
    this.bvhHelpers.forEach(helper => {
      helper.geometry.dispose();
    });
    this.bvhHelpers = [];
  }
}

// Create singleton instance
const bvhCollisionSystem = new BVHCollisionSystem();

export default bvhCollisionSystem;
