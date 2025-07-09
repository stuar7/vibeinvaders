import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Extend Three.js prototypes for BVH
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/**
 * Component-based collision detection system using MeshBVH
 * Provides accurate per-component collision detection for ships
 */
class ComponentCollisionSystem {
  constructor() {
    this.componentGeometries = new Map();
    this.initialized = false;
    this.init();
  }

  init() {
    // Create component geometries with BVH
    this.createComponentGeometries();
    this.initialized = true;
    console.log('[COMPONENT COLLISION] Initialized component collision system');
  }

  createComponentGeometries() {
    // Player/Alien ship components
    const shipComponents = {
      body: new THREE.BoxGeometry(0.6, 0.4, 2.0),
      nose: new THREE.ConeGeometry(0.4, 0.8, 4),
      leftWing: this.createWingGeometry('left'),
      rightWing: this.createWingGeometry('right')
    };

    // Flying saucer components (mapped to standard components)
    const saucerComponents = {
      body: new THREE.CylinderGeometry(1.5, 1.8, 0.3, 16), // Main disc
      nose: new THREE.SphereGeometry(0.8, 12, 8), // Top dome
      leftWing: new THREE.SphereGeometry(1.2, 12, 6), // Bottom hull (conceptually split)
      rightWing: new THREE.SphereGeometry(1.2, 12, 6) // Bottom hull (conceptually split)
    };

    // Compute BVH for all geometries
    Object.entries(shipComponents).forEach(([name, geometry]) => {
      geometry.computeBoundsTree({
        maxLeafTris: 4, // More precise collision detection
        maxDepth: 10
      });
      this.componentGeometries.set(`ship_${name}`, geometry);
    });

    Object.entries(saucerComponents).forEach(([name, geometry]) => {
      geometry.computeBoundsTree({
        maxLeafTris: 4,
        maxDepth: 10
      });
      this.componentGeometries.set(`saucer_${name}`, geometry);
    });

    console.log('[COMPONENT COLLISION] Created BVH for', this.componentGeometries.size, 'component types');
  }

  createWingGeometry(side) {
    const geometry = new THREE.BufferGeometry();
    const isLeft = side === 'left';
    
    const vertices = new Float32Array([
      0, 0, -0.8,
      isLeft ? -1.5 : 1.5, 0, 0.0,
      0, 0, 0.8
    ]);

    const indices = new Uint16Array([0, 1, 2]);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Check collision between a missile and ship components
   * @param {Object} missile - Missile object with position and size
   * @param {Object} ship - Ship object with position, rotation, and shipComponents
   * @param {string} shipType - 'ship' or 'saucer' for geometry selection
   * @returns {Object|null} Collision result with component name and hit point
   */
  checkMissileShipCollision(missile, ship, shipType = 'ship') {
    if (!this.initialized) return null;

    const missilePosition = new THREE.Vector3(missile.position.x, missile.position.y, missile.position.z);
    const missileRadius = missile.size || 0.3;
    
    // Create ship transformation matrix
    const shipMatrix = new THREE.Matrix4();
    shipMatrix.setPosition(ship.position.x, ship.position.y, ship.position.z);
    
    if (ship.rotation) {
      const euler = new THREE.Euler(ship.rotation.x, ship.rotation.y, ship.rotation.z);
      const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
      shipMatrix.multiplyMatrices(shipMatrix, rotationMatrix);
    }

    // Component positions for ship type
    const componentPositions = this.getComponentPositions(shipType);
    
    // Check each component
    for (const [componentName, localPosition] of Object.entries(componentPositions)) {
      // Skip destroyed components
      if (ship.shipComponents && ship.shipComponents[componentName]?.destroyed) {
        continue;
      }

      // Transform component position to world space
      const worldPosition = localPosition.clone().applyMatrix4(shipMatrix);
      
      // Quick distance check first
      const distance = missilePosition.distanceTo(worldPosition);
      const roughRadius = this.getComponentRoughRadius(componentName, shipType);
      
      if (distance > roughRadius + missileRadius) {
        continue; // Too far for collision
      }

      // Precise BVH collision check
      const collisionResult = this.checkPreciseCollision(
        missilePosition, 
        missileRadius, 
        componentName, 
        shipType, 
        shipMatrix, 
        localPosition
      );

      if (collisionResult) {
        return {
          component: componentName,
          hitPoint: collisionResult.point,
          distance: distance,
          normal: collisionResult.normal
        };
      }
    }

    return null;
  }

  getComponentPositions(shipType) {
    if (shipType === 'saucer') {
      return {
        body: new THREE.Vector3(0, 0, 0), // Main disc
        nose: new THREE.Vector3(0, 0.25, 0), // Top dome
        leftWing: new THREE.Vector3(-0.6, -0.25, 0), // Left side of bottom hull
        rightWing: new THREE.Vector3(0.6, -0.25, 0) // Right side of bottom hull
      };
    }

    // Standard ship components
    return {
      body: new THREE.Vector3(0, 0, 0),
      nose: new THREE.Vector3(0, 0, -1.4),
      leftWing: new THREE.Vector3(-0.3, 0, 0),
      rightWing: new THREE.Vector3(0.3, 0, 0)
    };
  }

  getComponentRoughRadius(componentName, shipType) {
    if (shipType === 'saucer') {
      switch (componentName) {
        case 'body': return 1.8;
        case 'nose': return 0.8;
        case 'leftWing':
        case 'rightWing': return 1.2;
        default: return 1.0;
      }
    }

    // Standard ship components
    switch (componentName) {
      case 'body': return 1.0;
      case 'nose': return 0.8;
      case 'leftWing':
      case 'rightWing': return 1.5;
      default: return 1.0;
    }
  }

  checkPreciseCollision(missilePosition, missileRadius, componentName, shipType, shipMatrix, localPosition) {
    const geometryKey = `${shipType}_${componentName}`;
    const geometry = this.componentGeometries.get(geometryKey);
    
    if (!geometry || !geometry.boundsTree) {
      return null;
    }

    // Create a temporary mesh for the component
    const mesh = new THREE.Mesh(geometry);
    mesh.matrixAutoUpdate = false;
    
    // Set component's world transform
    const componentMatrix = shipMatrix.clone();
    componentMatrix.multiply(new THREE.Matrix4().makeTranslation(localPosition.x, localPosition.y, localPosition.z));
    
    // Add component-specific rotation for nose
    if (componentName === 'nose' && shipType === 'ship') {
      const noseRotation = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      componentMatrix.multiply(noseRotation);
    }
    
    mesh.matrix.copy(componentMatrix);
    mesh.matrixWorld.copy(componentMatrix);

    // Create a sphere for the missile
    const missileGeometry = new THREE.SphereGeometry(missileRadius, 8, 6);
    const missileMesh = new THREE.Mesh(missileGeometry);
    missileMesh.position.copy(missilePosition);
    missileMesh.updateMatrixWorld();

    // Use BVH intersection test
    const intersects = mesh.geometry.boundsTree.intersectsGeometry(
      missileMesh.geometry,
      missileMesh.matrixWorld
    );

    if (intersects) {
      // Calculate hit point and normal
      const direction = new THREE.Vector3()
        .subVectors(missilePosition, new THREE.Vector3().setFromMatrixPosition(componentMatrix))
        .normalize();

      const raycaster = new THREE.Raycaster(missilePosition, direction.negate());
      const intersections = [];
      mesh.raycast(raycaster, intersections);

      if (intersections.length > 0) {
        return {
          point: intersections[0].point,
          normal: intersections[0].face?.normal || direction
        };
      }

      // Fallback hit point
      return {
        point: missilePosition.clone(),
        normal: direction
      };
    }

    return null;
  }

  /**
   * Get the most appropriate component for a hit at a given position
   * @param {THREE.Vector3} hitPosition - World position of the hit
   * @param {Object} ship - Ship object
   * @param {string} shipType - 'ship' or 'saucer'
   * @returns {string} Component name
   */
  getHitComponent(hitPosition, ship, shipType = 'ship') {
    const shipMatrix = new THREE.Matrix4();
    shipMatrix.setPosition(ship.position.x, ship.position.y, ship.position.z);
    
    if (ship.rotation) {
      const euler = new THREE.Euler(ship.rotation.x, ship.rotation.y, ship.rotation.z);
      const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
      shipMatrix.multiplyMatrices(shipMatrix, rotationMatrix);
    }

    // Transform hit position to local ship space
    const localHitPosition = hitPosition.clone()
      .applyMatrix4(shipMatrix.clone().invert());

    const componentPositions = this.getComponentPositions(shipType);
    
    let closestComponent = 'body';
    let closestDistance = Infinity;

    for (const [componentName, localPosition] of Object.entries(componentPositions)) {
      // Skip destroyed components
      if (ship.shipComponents && ship.shipComponents[componentName]?.destroyed) {
        continue;
      }

      const distance = localHitPosition.distanceTo(localPosition);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestComponent = componentName;
      }
    }

    return closestComponent;
  }

  dispose() {
    // Clean up BVH trees
    this.componentGeometries.forEach(geometry => {
      if (geometry.boundsTree) {
        geometry.disposeBoundsTree();
      }
      geometry.dispose();
    });
    this.componentGeometries.clear();
    this.initialized = false;
  }
}

// Create singleton instance
const componentCollisionSystem = new ComponentCollisionSystem();

export default componentCollisionSystem;