// BVH Optimization utilities for asteroid field
import { 
  computeBoundsTree, 
  disposeBoundsTree, 
  acceleratedRaycast,
  MeshBVH,
  INTERSECTED,
  NOT_INTERSECTED 
} from 'three-mesh-bvh';
import * as THREE from 'three';

// Extend Three.js prototypes
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export class OptimizedAsteroidField {
  constructor(asteroidData, instancedMesh) {
    this.asteroids = asteroidData;
    this.instancedMesh = instancedMesh;
    this.spatialBVH = null;
    
    // Build BVH
    this.buildSpatialBVH();
  }
  
  buildSpatialBVH() {
    const positions = new Float32Array(this.asteroids.length * 9);
    const indices = [];
    
    this.asteroids.forEach((asteroid, i) => {
      const baseIdx = i * 9;
      const { position, scale } = asteroid;
      
      // Triangle representation of asteroid bounds
      positions[baseIdx + 0] = position.x - scale;
      positions[baseIdx + 1] = position.y;
      positions[baseIdx + 2] = position.z;
      
      positions[baseIdx + 3] = position.x + scale;
      positions[baseIdx + 4] = position.y;
      positions[baseIdx + 5] = position.z;
      
      positions[baseIdx + 6] = position.x;
      positions[baseIdx + 7] = position.y + scale;
      positions[baseIdx + 8] = position.z;
      
      const triIdx = i * 3;
      indices.push(triIdx, triIdx + 1, triIdx + 2);
    });
    
    const spatialGeometry = new THREE.BufferGeometry();
    spatialGeometry.setAttribute('position', 
      new THREE.BufferAttribute(positions, 3));
    spatialGeometry.setIndex(indices);
    
    this.spatialBVH = new MeshBVH(spatialGeometry, {
      strategy: 'CENTER', // Faster for spatial queries
      maxLeafTris: 32
    });
  }
  
  frustumCullWithBVH(frustum) {
    const visibleIndices = [];
    
    this.spatialBVH.shapecast({
      intersectsBounds: (box) => {
        return frustum.intersectsBox(box) 
          ? INTERSECTED 
          : NOT_INTERSECTED;
      },
      
      intersectsTriangle: (triangle, triangleIndex) => {
        const asteroidIndex = Math.floor(triangleIndex / 3);
        visibleIndices.push(asteroidIndex);
        return false; // Continue traversal
      }
    });
    
    return visibleIndices;
  }
  
  checkCollisionsWithBVH(playerSphere) {
    const collisions = [];
    
    this.spatialBVH.shapecast({
      intersectsBounds: (box) => {
        return playerSphere.intersectsBox(box) 
          ? INTERSECTED 
          : NOT_INTERSECTED;
      },
      
      intersectsTriangle: (triangle, triangleIndex) => {
        const asteroidIndex = Math.floor(triangleIndex / 3);
        const asteroid = this.asteroids[asteroidIndex];
        
        // Get instance transform
        const matrix = new THREE.Matrix4();
        this.instancedMesh.getMatrixAt(asteroidIndex, matrix);
        
        // Transform sphere to asteroid's local space
        const localSphere = playerSphere.clone();
        const inverseMatrix = matrix.clone().invert();
        localSphere.applyMatrix4(inverseMatrix);
        
        // Check against geometry BVH
        const geometryBVH = this.instancedMesh.geometry.boundsTree;
        if (geometryBVH && geometryBVH.intersectsSphere(localSphere)) {
          collisions.push({
            asteroid: asteroid,
            index: asteroidIndex,
            distance: asteroid.position.distanceTo(playerSphere.center)
          });
        }
        
        return false; // Continue checking
      }
    });
    
    return collisions;
  }
  
  updatePositions(indices, newPositions) {
    indices.forEach((index, i) => {
      const asteroid = this.asteroids[index];
      asteroid.position.copy(newPositions[i]);
      
      // Update instance matrix
      const matrix = new THREE.Matrix4();
      this.instancedMesh.getMatrixAt(index, matrix);
      matrix.setPosition(newPositions[i]);
      this.instancedMesh.setMatrixAt(index, matrix);
    });
    
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    
    // Refit BVH for small changes (much faster than rebuild)
    if (this.spatialBVH) {
      this.spatialBVH.refit();
    }
  }
  
  // Find nearest asteroids to a point
  findNearestAsteroids(point, maxDistance, maxCount = 10) {
    const nearestAsteroids = [];
    const searchSphere = new THREE.Sphere(point, maxDistance);
    
    this.spatialBVH.shapecast({
      intersectsBounds: (box) => {
        return searchSphere.intersectsBox(box) 
          ? INTERSECTED 
          : NOT_INTERSECTED;
      },
      
      intersectsTriangle: (triangle, triangleIndex) => {
        const asteroidIndex = Math.floor(triangleIndex / 3);
        const asteroid = this.asteroids[asteroidIndex];
        const distance = asteroid.position.distanceTo(point);
        
        if (distance <= maxDistance) {
          nearestAsteroids.push({
            asteroid: asteroid,
            index: asteroidIndex,
            distance: distance
          });
        }
        
        return false;
      }
    });
    
    // Sort by distance and limit count
    nearestAsteroids.sort((a, b) => a.distance - b.distance);
    return nearestAsteroids.slice(0, maxCount);
  }
  
  // Ray casting for line-of-sight checks
  raycastToAsteroids(origin, direction, maxDistance = Infinity) {
    const ray = new THREE.Ray(origin, direction.normalize());
    const hits = [];
    
    this.spatialBVH.raycast(ray, (result) => {
      if (result.distance <= maxDistance) {
        const triangleIndex = result.triangleIndex;
        const asteroidIndex = Math.floor(triangleIndex / 3);
        
        hits.push({
          asteroid: this.asteroids[asteroidIndex],
          index: asteroidIndex,
          distance: result.distance,
          point: result.point.clone()
        });
      }
    });
    
    // Sort by distance
    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }
  
  // Get asteroids within a box region
  getAsteroidsInBox(box) {
    const asteroidsInBox = [];
    
    this.spatialBVH.shapecast({
      intersectsBounds: (nodeBox) => {
        return box.intersectsBox(nodeBox) 
          ? INTERSECTED 
          : NOT_INTERSECTED;
      },
      
      intersectsTriangle: (triangle, triangleIndex) => {
        const asteroidIndex = Math.floor(triangleIndex / 3);
        const asteroid = this.asteroids[asteroidIndex];
        
        if (box.containsPoint(asteroid.position)) {
          asteroidsInBox.push({
            asteroid: asteroid,
            index: asteroidIndex
          });
        }
        
        return false;
      }
    });
    
    return asteroidsInBox;
  }
  
  dispose() {
    // Clean up BVH
    if (this.spatialBVH) {
      this.spatialBVH = null;
    }
    
    if (this.instancedMesh.geometry.boundsTree) {
      this.instancedMesh.geometry.disposeBoundsTree();
    }
  }
}

export default OptimizedAsteroidField;