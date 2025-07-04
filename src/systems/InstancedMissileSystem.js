import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';

class InstancedMissileSystem {
  constructor() {
    // Maximum missiles per type
    this.maxInstances = {
      rocket: 50,
      default: 200,
      laser: 100,
      chaingun: 150,
      bfg: 20,
      bomb: 30,
      railgun: 40
    };
    
    // Instanced meshes for each missile type
    this.instancedMeshes = new Map();
    this.instancedBVHs = new Map(); // BVH for each instanced mesh
    
    // Active missile tracking
    this.activeMissiles = new Map(); // missileType -> [missile objects]
    this.instanceMatrices = new Map(); // missileType -> matrices
    this.instanceColors = new Map(); // missileType -> colors
    
    // Temporary objects for calculations
    this.tempMatrix = new THREE.Matrix4();
    this.tempVector = new THREE.Vector3();
    this.tempQuaternion = new THREE.Quaternion();
    this.tempEuler = new THREE.Euler();
    
    this.initializeInstancedMeshes();
  }

  initializeInstancedMeshes() {
    Object.entries(this.maxInstances).forEach(([type, maxCount]) => {
      const geometry = this.createGeometryForType(type);
      const material = this.createMaterialForType(type);
      
      // Create instanced mesh
      const instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instancedMesh.frustumCulled = false; // We'll handle culling manually
      
      // Create BVH for the base geometry
      geometry.computeBoundsTree({
        strategy: 'CENTER',
        maxLeafTris: 10,
        maxDepth: 20
      });
      
      // Store instanced BVH system
      this.instancedBVHs.set(type, {
        baseGeometry: geometry,
        baseBVH: geometry.boundsTree,
        instanceTransforms: new Map() // instanceId -> transform matrix
      });
      
      this.instancedMeshes.set(type, instancedMesh);
      this.activeMissiles.set(type, []);
      this.instanceMatrices.set(type, []);
      this.instanceColors.set(type, []);
      
      // Initialize with identity matrices and default colors
      for (let i = 0; i < maxCount; i++) {
        instancedMesh.setMatrixAt(i, new THREE.Matrix4());
        instancedMesh.setColorAt(i, new THREE.Color(1, 1, 1));
        
        // Scale to 0 to hide unused instances
        const hiddenMatrix = new THREE.Matrix4();
        hiddenMatrix.makeScale(0, 0, 0);
        instancedMesh.setMatrixAt(i, hiddenMatrix);
      }
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
    });
  }

  createGeometryForType(type) {
    switch (type) {
      case 'rocket':
        return this.createRocketGeometry();
      case 'bomb':
        return this.createBombGeometry();
      case 'railgun':
        return this.createRailgunGeometry();
      case 'laser':
        return new THREE.CylinderGeometry(0.05, 0.05, 6, 6);
      case 'chaingun':
        return new THREE.SphereGeometry(0.1, 6, 4);
      case 'bfg':
        return new THREE.SphereGeometry(0.5, 16, 12);
      default:
        return new THREE.SphereGeometry(0.15, 6, 4);
    }
  }

  createRocketGeometry() {
    // Create merged rocket geometry for instancing
    const geometries = [];
    
    // Main body
    const body = new THREE.BoxGeometry(0.2, 0.2, 1);
    geometries.push(body);
    
    // Nose cone
    const nose = new THREE.ConeGeometry(0.15, 0.4, 6);
    nose.translate(0, 0, 0.7);
    geometries.push(nose);
    
    // Exhaust (simplified for instancing)
    const exhaust = new THREE.ConeGeometry(0.3, 0.4, 6);
    exhaust.translate(0, 0, -0.7);
    geometries.push(exhaust);
    
    return BufferGeometryUtils.mergeGeometries(geometries);
  }

  createBombGeometry() {
    const geometries = [];
    
    // Main bomb body
    const body = new THREE.SphereGeometry(0.4, 12, 8);
    geometries.push(body);
    
    // Simplified fins for instancing
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.BoxGeometry(0.1, 0.2, 0.3);
      fin.rotateY((i * Math.PI) / 2);
      fin.translate(0.3, 0, 0.2);
      geometries.push(fin);
    }
    
    return BufferGeometryUtils.mergeGeometries(geometries);
  }

  createRailgunGeometry() {
    const geometries = [];
    
    // Main rail
    const rail = new THREE.CylinderGeometry(0.06, 0.06, 8, 12);
    rail.rotateX(Math.PI / 2);
    geometries.push(rail);
    
    // Front spike
    const spike = new THREE.ConeGeometry(0.04, 0.4, 8);
    spike.translate(0, 0, -4.2);
    spike.rotateX(Math.PI / 2);
    geometries.push(spike);
    
    return BufferGeometryUtils.mergeGeometries(geometries);
  }

  createMaterialForType(type) {
    const colors = {
      rocket: '#ff8800',
      default: '#00ffff',
      laser: '#ff0000',
      chaingun: '#ffff00',
      bfg: '#00ff00',
      bomb: '#ff4400',
      railgun: '#8800ff'
    };
    
    return new THREE.MeshBasicMaterial({
      color: colors[type] || '#ffffff',
      fog: true
    });
  }

  // Add missile to instanced system
  addMissile(missile) {
    const type = missile.weaponType || 'default';
    const activeMissiles = this.activeMissiles.get(type);
    const instancedMesh = this.instancedMeshes.get(type);
    
    if (!activeMissiles || !instancedMesh) return false;
    
    // Check if we have space
    if (activeMissiles.length >= this.maxInstances[type]) {
      console.warn(`[INSTANCED MISSILES] Max instances reached for ${type}`);
      return false;
    }
    
    const instanceIndex = activeMissiles.length;
    activeMissiles.push(missile);
    
    // Set instance transform
    this.updateInstanceTransform(type, instanceIndex, missile);
    
    // Set instance color if missile has custom color
    if (missile.color && instancedMesh.instanceColor) {
      const color = new THREE.Color(missile.color);
      instancedMesh.setColorAt(instanceIndex, color);
      instancedMesh.instanceColor.needsUpdate = true;
    }
    
    // Update BVH instance tracking
    const bvhData = this.instancedBVHs.get(type);
    if (bvhData) {
      bvhData.instanceTransforms.set(instanceIndex, {
        position: { ...missile.position },
        rotation: { ...missile.rotation },
        scale: missile.size || 1.0,
        missileId: missile.id
      });
    }
    
    return true;
  }

  // Remove missile from instanced system
  removeMissile(missile) {
    const type = missile.weaponType || 'default';
    const activeMissiles = this.activeMissiles.get(type);
    const instancedMesh = this.instancedMeshes.get(type);
    
    if (!activeMissiles || !instancedMesh) return;
    
    const index = activeMissiles.findIndex(m => m.id === missile.id);
    if (index === -1) return;
    
    // Remove from active missiles
    activeMissiles.splice(index, 1);
    
    // Compact instances - move last instance to removed slot
    const lastIndex = activeMissiles.length;
    if (index < lastIndex) {
      const lastMissile = activeMissiles[lastIndex - 1];
      this.updateInstanceTransform(type, index, lastMissile);
    }
    
    // Hide the last instance
    const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    instancedMesh.setMatrixAt(lastIndex, hiddenMatrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    // Update BVH tracking
    const bvhData = this.instancedBVHs.get(type);
    if (bvhData) {
      bvhData.instanceTransforms.delete(index);
      // Update indices for compacted instances
      if (index < lastIndex) {
        const lastTransform = bvhData.instanceTransforms.get(lastIndex);
        if (lastTransform) {
          bvhData.instanceTransforms.set(index, lastTransform);
          bvhData.instanceTransforms.delete(lastIndex);
        }
      }
    }
  }

  // Update missile positions (call this every frame)
  updateMissiles(missiles) {
    // Clear all instances first
    this.instancedMeshes.forEach((mesh, type) => {
      const activeMissiles = this.activeMissiles.get(type);
      activeMissiles.length = 0;
      
      // Hide all instances
      for (let i = 0; i < this.maxInstances[type]; i++) {
        const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
        mesh.setMatrixAt(i, hiddenMatrix);
      }
    });
    
    // Add current missiles
    missiles.forEach(missile => {
      this.addMissile(missile);
    });
  }

  updateInstanceTransform(type, instanceIndex, missile) {
    const instancedMesh = this.instancedMeshes.get(type);
    if (!instancedMesh) return;
    
    // Create transform matrix
    this.tempVector.set(missile.position.x, missile.position.y, missile.position.z);
    
    if (missile.rotation) {
      this.tempEuler.set(
        missile.rotation.x || 0,
        missile.rotation.y || 0,
        missile.rotation.z || 0
      );
      this.tempQuaternion.setFromEuler(this.tempEuler);
    } else {
      this.tempQuaternion.set(0, 0, 0, 1);
    }
    
    const scale = missile.size || 1.0;
    this.tempMatrix.compose(this.tempVector, this.tempQuaternion, 
      new THREE.Vector3(scale, scale, scale));
    
    instancedMesh.setMatrixAt(instanceIndex, this.tempMatrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  // BVH collision detection for instanced missiles
  checkInstancedCollisions(missiles, targets, targetType = 'alien') {
    const hits = [];
    
    missiles.forEach(missile => {
      const type = missile.weaponType || 'default';
      const bvhData = this.instancedBVHs.get(type);
      
      if (!bvhData) return;
      
      // Find missile instance
      const activeMissiles = this.activeMissiles.get(type);
      const instanceIndex = activeMissiles.findIndex(m => m.id === missile.id);
      
      if (instanceIndex === -1) return;
      
      // Get instance transform
      const transform = bvhData.instanceTransforms.get(instanceIndex);
      if (!transform) return;
      
      // Check against targets using BVH
      targets.forEach(target => {
        const dx = transform.position.x - target.position.x;
        const dy = transform.position.y - target.position.y;
        const dz = transform.position.z - target.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Use BVH bounds for more accurate collision
        const bounds = bvhData.baseBVH.boundingBox;
        const missileSize = bounds.getSize(new THREE.Vector3()).length() * transform.scale;
        const targetSize = target.size || 1.5;
        
        if (distance < (missileSize + targetSize) / 2 + 0.3) {
          hits.push({
            missileId: missile.id,
            targetId: target.id,
            distance: distance,
            instanceIndex: instanceIndex
          });
        }
      });
    });
    
    return hits;
  }

  // Get all instanced meshes for adding to scene
  getInstancedMeshes() {
    return Array.from(this.instancedMeshes.values());
  }

  // Dispose resources
  dispose() {
    this.instancedMeshes.forEach(mesh => {
      mesh.geometry.disposeBoundsTree();
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    
    this.instancedMeshes.clear();
    this.instancedBVHs.clear();
    this.activeMissiles.clear();
  }
}

export default InstancedMissileSystem;