import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

class MissileLODSystem {
  constructor() {
    // Cache geometries for different detail levels
    this.geometryCache = new Map();
    this.materialCache = new Map();
    this.lodBVHs = new Map(); // BVH trees for each LOD level
    
    // LOD distance thresholds
    this.lodDistances = {
      high: 50,    // 0-50 units: full detail
      medium: 150, // 50-150 units: medium detail
      low: 400     // 150+ units: low detail
    };
    
    this.initializeGeometries();
  }

  initializeGeometries() {
    // Rocket geometries at different detail levels
    this.createRocketGeometries();
    this.createBombGeometries();
    this.createRailgunGeometries();
  }

  createRocketGeometries() {
    // High detail rocket (original complexity)
    const highDetail = this.createComplexRocket();
    
    // Medium detail rocket (simplified)
    const mediumDetail = this.createMediumRocket();
    
    // Low detail rocket (billboard/simple mesh)
    const lowDetail = this.createSimpleRocket();
    
    // Create BVH for each level for collision detection
    highDetail.computeBoundsTree();
    mediumDetail.computeBoundsTree();
    lowDetail.computeBoundsTree();
    
    this.geometryCache.set('rocket-high', highDetail);
    this.geometryCache.set('rocket-medium', mediumDetail);
    this.geometryCache.set('rocket-low', lowDetail);
    
    // Store BVH references
    this.lodBVHs.set('rocket-high', highDetail.boundsTree);
    this.lodBVHs.set('rocket-medium', mediumDetail.boundsTree);
    this.lodBVHs.set('rocket-low', lowDetail.boundsTree);
  }

  createComplexRocket() {
    // Your original 4-mesh rocket
    const geometries = [];
    
    // Main body
    const body = new THREE.BoxGeometry(0.2, 0.2, 1);
    body.translate(0, 0, 0);
    geometries.push(body);
    
    // Nose cone
    const nose = new THREE.ConeGeometry(0.15, 0.4, 6);
    nose.translate(0, 0, 0.7);
    geometries.push(nose);
    
    // Exhaust
    const exhaust = new THREE.ConeGeometry(0.3, 0.6, 6);
    exhaust.translate(0, 0, -0.7);
    geometries.push(exhaust);
    
    // Merge into single geometry
    return THREE.BufferGeometryUtils.mergeGeometries(geometries);
  }

  createMediumRocket() {
    // Simplified rocket - 2 parts instead of 4
    const geometries = [];
    
    const body = new THREE.CylinderGeometry(0.1, 0.15, 1, 8);
    body.rotateX(Math.PI / 2);
    geometries.push(body);
    
    const nose = new THREE.ConeGeometry(0.1, 0.3, 6);
    nose.translate(0, 0, 0.5);
    geometries.push(nose);
    
    return THREE.BufferGeometryUtils.mergeGeometries(geometries);
  }

  createSimpleRocket() {
    // Ultra-simple rocket - single elongated sphere
    return new THREE.SphereGeometry(0.1, 6, 4);
  }

  // Create LOD object for a missile
  createMissileLOD(missileType, materials) {
    const lod = new THREE.LOD();
    
    if (this.geometryCache.has(`${missileType}-high`)) {
      const highMesh = new THREE.Mesh(
        this.geometryCache.get(`${missileType}-high`),
        materials.high || materials.default
      );
      
      const mediumMesh = new THREE.Mesh(
        this.geometryCache.get(`${missileType}-medium`),
        materials.medium || materials.default
      );
      
      const lowMesh = new THREE.Mesh(
        this.geometryCache.get(`${missileType}-low`),
        materials.low || materials.default
      );
      
      // Add LOD levels
      lod.addLevel(highMesh, 0);
      lod.addLevel(mediumMesh, this.lodDistances.high);
      lod.addLevel(lowMesh, this.lodDistances.medium);
    }
    
    return lod;
  }

  // Get appropriate BVH for collision detection based on distance
  getBVHForDistance(missileType, distance) {
    let lodLevel;
    if (distance < this.lodDistances.high) {
      lodLevel = 'high';
    } else if (distance < this.lodDistances.medium) {
      lodLevel = 'medium';
    } else {
      lodLevel = 'low';
    }
    
    return this.lodBVHs.get(`${missileType}-${lodLevel}`);
  }

  // Update LOD distances based on performance
  updateLODDistances(performanceLevel) {
    const settings = {
      ultra: { high: 100, medium: 300, low: 800 },
      high: { high: 75, medium: 250, low: 600 },
      medium: { high: 50, medium: 150, low: 400 },
      low: { high: 30, medium: 100, low: 250 },
      potato: { high: 20, medium: 60, low: 150 }
    };
    
    if (settings[performanceLevel]) {
      this.lodDistances = settings[performanceLevel];
    }
  }

  // Advanced: Screen-space based LOD
  getScreenSpaceLOD(missile, camera) {
    // Calculate screen space size
    const distance = camera.position.distanceTo(missile.position);
    const screenSize = missile.size / distance;
    
    // Use BVH bounds to get more accurate screen coverage
    const bounds = this.getBVHForDistance('rocket', distance)?.boundingBox;
    if (bounds) {
      const boundingSize = bounds.getSize(new THREE.Vector3()).length();
      const adjustedScreenSize = boundingSize / distance;
      
      // LOD based on screen coverage
      if (adjustedScreenSize > 0.1) return 'high';
      if (adjustedScreenSize > 0.05) return 'medium';
      return 'low';
    }
    
    // Fallback to distance-based
    return distance < 50 ? 'high' : distance < 150 ? 'medium' : 'low';
  }

  // Dispose resources
  dispose() {
    this.geometryCache.forEach(geometry => {
      geometry.disposeBoundsTree();
      geometry.dispose();
    });
    this.geometryCache.clear();
    this.lodBVHs.clear();
  }
}

export default MissileLODSystem;