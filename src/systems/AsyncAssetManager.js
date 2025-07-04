import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { MeshBVH } from 'three-mesh-bvh';

class AsyncAssetManager {
  constructor() {
    // Asset caches
    this.geometryCache = new Map();
    this.materialCache = new Map();
    this.bvhCache = new Map();
    this.textureCache = new Map();
    
    // Loading state
    this.loadingPromises = new Map();
    this.loadedAssets = new Set();
    this.loadingProgress = new Map();
    
    // Web worker for BVH generation
    this.bvhWorker = null;
    this.bvhQueue = [];
    this.bvhPromises = new Map();
    
    // Asset definitions
    this.assetDefinitions = this.defineAssets();
    
    this.initializeBVHWorker();
  }

  defineAssets() {
    return {
      // Weapon geometries with complexity levels
      weapons: {
        rocket: {
          priority: 'high',
          complexity: 'high',
          needsBVH: true,
          variants: ['default', 'homing', 'cluster']
        },
        bfg: {
          priority: 'high', 
          complexity: 'medium',
          needsBVH: true,
          variants: ['player', 'boss']
        },
        bomb: {
          priority: 'high',
          complexity: 'high',
          needsBVH: true,
          variants: ['proximity', 'timed', 'cluster']
        },
        railgun: {
          priority: 'medium',
          complexity: 'high',
          needsBVH: true,
          variants: ['standard', 'charged']
        },
        laser: {
          priority: 'low',
          complexity: 'low',
          needsBVH: false,
          variants: ['beam', 'pulse']
        }
      },
      
      // Effect geometries
      effects: {
        explosion: {
          priority: 'medium',
          complexity: 'high',
          needsBVH: false,
          variants: ['small', 'medium', 'large', 'nuclear']
        },
        impact: {
          priority: 'low',
          complexity: 'low', 
          needsBVH: false,
          variants: ['spark', 'debris', 'energy']
        }
      },
      
      // Environmental assets
      environment: {
        asteroid: {
          priority: 'high',
          complexity: 'medium',
          needsBVH: true,
          variants: ['small', 'medium', 'large', 'metallic', 'rocky']
        },
        debris: {
          priority: 'low',
          complexity: 'low',
          needsBVH: true,
          variants: ['metal', 'rock', 'crystal']
        }
      }
    };
  }

  initializeBVHWorker() {
    try {
      // Create dedicated worker for BVH generation
      this.bvhWorker = new Worker(new URL('../workers/bvhGeneration.worker.js', import.meta.url));
      
      this.bvhWorker.onmessage = (e) => {
        const { type, data } = e.data;
        
        if (type === 'bvhComplete') {
          const { assetId, bvhData, processingTime } = data;
          const promise = this.bvhPromises.get(assetId);
          
          if (promise) {
            // Reconstruct BVH from worker data
            const geometry = this.geometryCache.get(assetId);
            if (geometry && bvhData) {
              geometry.boundsTree = MeshBVH.deserialize(bvhData, geometry);
              this.bvhCache.set(assetId, geometry.boundsTree);
              
              console.log(`[ASYNC ASSETS] BVH built for ${assetId} in ${processingTime.toFixed(2)}ms`);
              promise.resolve(geometry.boundsTree);
            }
            
            this.bvhPromises.delete(assetId);
          }
        } else if (type === 'bvhError') {
          const { assetId, error } = data;
          const promise = this.bvhPromises.get(assetId);
          
          if (promise) {
            console.error(`[ASYNC ASSETS] BVH generation failed for ${assetId}:`, error);
            promise.reject(new Error(error));
            this.bvhPromises.delete(assetId);
          }
        }
      };
      
      this.bvhWorker.onerror = (error) => {
        console.error('[ASYNC ASSETS] BVH Worker error:', error);
      };
      
    } catch (error) {
      console.warn('[ASYNC ASSETS] BVH Worker not available, falling back to main thread');
    }
  }

  // Preload assets by priority
  async preloadAssets(priority = 'high') {
    console.log(`[ASYNC ASSETS] Starting preload for priority: ${priority}`);
    const startTime = performance.now();
    
    const promises = [];
    
    // Load all assets of specified priority
    Object.entries(this.assetDefinitions).forEach(([category, assets]) => {
      Object.entries(assets).forEach(([assetName, config]) => {
        if (this.shouldLoadAsset(config.priority, priority)) {
          config.variants.forEach(variant => {
            const assetId = `${category}_${assetName}_${variant}`;
            promises.push(this.loadAsset(assetId, category, assetName, variant, config));
          });
        }
      });
    });
    
    const results = await Promise.allSettled(promises);
    const loadTime = performance.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`[ASYNC ASSETS] Preload complete in ${loadTime.toFixed(2)}ms: ${successful} loaded, ${failed} failed`);
    
    return { successful, failed, loadTime };
  }

  shouldLoadAsset(assetPriority, requestedPriority) {
    const priorities = { high: 3, medium: 2, low: 1 };
    return priorities[assetPriority] >= priorities[requestedPriority];
  }

  async loadAsset(assetId, category, assetName, variant, config) {
    // Check if already loaded
    if (this.loadedAssets.has(assetId)) {
      return this.geometryCache.get(assetId);
    }
    
    // Check if currently loading
    if (this.loadingPromises.has(assetId)) {
      return this.loadingPromises.get(assetId);
    }
    
    // Start loading
    const loadPromise = this.performAssetLoad(assetId, category, assetName, variant, config);
    this.loadingPromises.set(assetId, loadPromise);
    
    try {
      const result = await loadPromise;
      this.loadedAssets.add(assetId);
      this.loadingPromises.delete(assetId);
      return result;
    } catch (error) {
      this.loadingPromises.delete(assetId);
      throw error;
    }
  }

  async performAssetLoad(assetId, category, assetName, variant, config) {
    const startTime = performance.now();
    
    try {
      // Generate geometry based on asset type
      const geometry = await this.generateGeometry(category, assetName, variant);
      
      if (!geometry) {
        throw new Error(`Failed to generate geometry for ${assetId}`);
      }
      
      // Cache the geometry
      this.geometryCache.set(assetId, geometry);
      
      // Generate BVH if needed
      if (config.needsBVH) {
        await this.generateBVHAsync(assetId, geometry);
      }
      
      // Generate materials
      const materials = await this.generateMaterials(category, assetName, variant);
      this.materialCache.set(assetId, materials);
      
      const loadTime = performance.now() - startTime;
      console.log(`[ASYNC ASSETS] Loaded ${assetId} in ${loadTime.toFixed(2)}ms`);
      
      return { geometry, materials };
      
    } catch (error) {
      console.error(`[ASYNC ASSETS] Failed to load ${assetId}:`, error);
      throw error;
    }
  }

  async generateGeometry(category, assetName, variant) {
    switch (category) {
      case 'weapons':
        return this.generateWeaponGeometry(assetName, variant);
      case 'effects':
        return this.generateEffectGeometry(assetName, variant);
      case 'environment':
        return this.generateEnvironmentGeometry(assetName, variant);
      default:
        throw new Error(`Unknown asset category: ${category}`);
    }
  }

  async generateWeaponGeometry(weaponType, variant) {
    switch (weaponType) {
      case 'rocket':
        return this.generateRocketGeometry(variant);
      case 'bfg':
        return this.generateBFGGeometry(variant);
      case 'bomb':
        return this.generateBombGeometry(variant);
      case 'railgun':
        return this.generateRailgunGeometry(variant);
      case 'laser':
        return this.generateLaserGeometry(variant);
      default:
        throw new Error(`Unknown weapon type: ${weaponType}`);
    }
  }

  generateRocketGeometry(variant) {
    const geometries = [];
    
    // Base rocket geometry
    const body = new THREE.BoxGeometry(0.2, 0.2, 1);
    const nose = new THREE.ConeGeometry(0.15, 0.4, 8);
    nose.translate(0, 0, 0.7);
    
    geometries.push(body, nose);
    
    // Variant-specific modifications
    switch (variant) {
      case 'homing':
        // Add guidance fins
        for (let i = 0; i < 4; i++) {
          const fin = new THREE.BoxGeometry(0.05, 0.3, 0.1);
          fin.rotateZ((i * Math.PI) / 2);
          fin.translate(0.15, 0, -0.3);
          geometries.push(fin);
        }
        break;
        
      case 'cluster':
        // Larger warhead section
        const warhead = new THREE.SphereGeometry(0.25, 8, 6);
        warhead.translate(0, 0, 0.3);
        geometries.push(warhead);
        break;
        
      default: // 'default'
        // Standard exhaust
        const exhaust = new THREE.ConeGeometry(0.3, 0.6, 6);
        exhaust.translate(0, 0, -0.7);
        geometries.push(exhaust);
    }
    
    return BufferGeometryUtils.mergeGeometries(geometries);
  }

  generateBFGGeometry(variant) {
    const geometries = [];
    
    switch (variant) {
      case 'player':
        // Player-sized BFG
        const core = new THREE.SphereGeometry(0.8, 16, 12);
        const field = new THREE.SphereGeometry(1.2, 12, 8);
        geometries.push(core, field);
        break;
        
      case 'boss':
        // Boss-sized BFG
        const bossCore = new THREE.SphereGeometry(2.0, 20, 16);
        const bossField1 = new THREE.SphereGeometry(2.5, 16, 12);
        const bossField2 = new THREE.SphereGeometry(3.0, 12, 8);
        geometries.push(bossCore, bossField1, bossField2);
        break;
        
      default: // 'default' and other variants
        // Standard BFG
        const defaultCore = new THREE.SphereGeometry(1.0, 14, 10);
        const defaultField = new THREE.SphereGeometry(1.5, 10, 8);
        geometries.push(defaultCore, defaultField);
        break;
    }
    
    return BufferGeometryUtils.mergeGeometries(geometries);
  }

  generateBombGeometry(variant) {
    const geometries = [];
    
    // Base bomb body
    const body = new THREE.SphereGeometry(0.4, 12, 8);
    geometries.push(body);
    
    switch (variant) {
      case 'proximity':
        // Add sensor array
        const sensors = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 6);
        for (let i = 0; i < 6; i++) {
          const sensor = sensors.clone();
          sensor.rotateY((i * Math.PI) / 3);
          sensor.translate(0.5, 0, 0);
          geometries.push(sensor);
        }
        break;
        
      case 'cluster':
        // Add submunition housings
        for (let i = 0; i < 8; i++) {
          const submunition = new THREE.SphereGeometry(0.1, 6, 4);
          const angle = (i * Math.PI) / 4;
          submunition.translate(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0);
          geometries.push(submunition);
        }
        break;
        
      default: // 'timed'
        // Standard fins and stripes
        const stripe = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 8);
        stripe.rotateZ(Math.PI / 4);
        geometries.push(stripe);
        
        // Fins
        for (let i = 0; i < 4; i++) {
          const fin = new THREE.BoxGeometry(0.1, 0.4, 0.6);
          fin.rotateY((i * Math.PI) / 2);
          fin.translate(0, 0, 0.5);
          geometries.push(fin);
        }
    }
    
    return BufferGeometryUtils.mergeGeometries(geometries);
  }

  generateRailgunGeometry(variant) {
    const geometries = [];
    
    // Base rail
    const rail = new THREE.CylinderGeometry(0.06, 0.06, 8, 12);
    rail.rotateX(Math.PI / 2);
    geometries.push(rail);
    
    switch (variant) {
      case 'charged':
        // Add electromagnetic coils
        for (let i = 0; i < 4; i++) {
          const coil = new THREE.TorusGeometry(0.2, 0.02, 4, 8);
          coil.rotateX(Math.PI / 2);
          coil.translate(0, 0, -3 + i * 1.5);
          geometries.push(coil);
        }
        break;
        
      default: // 'standard'
        // Standard spike
        const spike = new THREE.ConeGeometry(0.04, 0.4, 8);
        spike.translate(0, 0, -4.2);
        spike.rotateX(Math.PI / 2);
        geometries.push(spike);
    }
    
    return BufferGeometryUtils.mergeGeometries(geometries);
  }

  generateLaserGeometry(variant) {
    switch (variant) {
      case 'beam':
        return new THREE.CylinderGeometry(0.05, 0.05, 6, 6);
      case 'pulse':
        return new THREE.SphereGeometry(0.1, 8, 6);
      default:
        return new THREE.CylinderGeometry(0.05, 0.05, 4, 6);
    }
  }

  generateEffectGeometry(effectType, variant) {
    // Implementation for effect geometries
    switch (effectType) {
      case 'explosion':
        return this.generateExplosionGeometry(variant);
      case 'impact':
        return this.generateImpactGeometry(variant);
      default:
        return new THREE.SphereGeometry(1, 8, 6);
    }
  }

  generateExplosionGeometry(variant) {
    const sizes = { small: 2, medium: 5, large: 10, nuclear: 25 };
    const size = sizes[variant] || 5;
    
    return new THREE.SphereGeometry(size, 16, 12);
  }

  generateImpactGeometry(variant) {
    switch (variant) {
      case 'spark':
        return new THREE.ConeGeometry(0.1, 0.5, 4);
      case 'debris':
        return new THREE.BoxGeometry(0.2, 0.2, 0.2);
      default:
        return new THREE.SphereGeometry(0.2, 6, 4);
    }
  }

  generateEnvironmentGeometry(envType, variant) {
    switch (envType) {
      case 'asteroid':
        return this.generateAsteroidGeometry(variant);
      case 'debris':
        return this.generateDebrisGeometry(variant);
      default:
        return new THREE.SphereGeometry(1, 8, 6);
    }
  }

  generateAsteroidGeometry(variant) {
    const sizes = { small: 1, medium: 2, large: 4, metallic: 1.5, rocky: 2.5 };
    const size = sizes[variant] || 2;
    
    // Create irregular asteroid shape
    const geometry = new THREE.IcosahedronGeometry(size, 2);
    
    // Add randomness to vertices
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const scale = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      positions.setX(i, positions.getX(i) * scale);
      positions.setY(i, positions.getY(i) * scale);
      positions.setZ(i, positions.getZ(i) * scale);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }

  generateDebrisGeometry(variant) {
    switch (variant) {
      case 'metal':
        return new THREE.BoxGeometry(0.5, 0.2, 0.8);
      case 'rock':
        return new THREE.DodecahedronGeometry(0.3);
      case 'crystal':
        return new THREE.OctahedronGeometry(0.4);
      default:
        return new THREE.BoxGeometry(0.3, 0.3, 0.3);
    }
  }

  async generateMaterials(category, assetName, variant) {
    // Generate materials based on asset type
    const materials = {};
    
    switch (category) {
      case 'weapons':
        materials.primary = await this.generateWeaponMaterial(assetName, variant);
        break;
      case 'effects':
        materials.primary = await this.generateEffectMaterial(assetName, variant);
        break;
      case 'environment':
        materials.primary = await this.generateEnvironmentMaterial(assetName, variant);
        break;
    }
    
    return materials;
  }

  async generateWeaponMaterial(weaponType, variant) {
    const colors = {
      rocket: '#ff8800',
      bfg: '#00ff00', 
      bomb: '#ff0000',
      railgun: '#00ffdd',
      laser: '#ff0000'
    };
    
    return new THREE.MeshBasicMaterial({
      color: colors[weaponType] || '#ffffff',
      fog: true
    });
  }

  async generateEffectMaterial(effectType, variant) {
    return new THREE.MeshBasicMaterial({
      color: '#ffaa00',
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
  }

  async generateEnvironmentMaterial(envType, variant) {
    const colors = {
      small: '#888888',
      medium: '#666666', 
      large: '#444444',
      metallic: '#aaaacc',
      rocky: '#997755'
    };
    
    return new THREE.MeshLambertMaterial({
      color: colors[variant] || '#888888'
    });
  }

  async generateBVHAsync(assetId, geometry) {
    if (!this.bvhWorker) {
      // Fallback to main thread
      return this.generateBVHMainThread(geometry);
    }
    
    return new Promise((resolve, reject) => {
      // Store promise for later resolution
      this.bvhPromises.set(assetId, { resolve, reject });
      
      // Send geometry to worker
      this.bvhWorker.postMessage({
        type: 'generateBVH',
        data: {
          assetId: assetId,
          geometry: {
            positions: geometry.attributes.position.array,
            indices: geometry.index ? geometry.index.array : null,
            itemSize: geometry.attributes.position.itemSize
          },
          options: {
            strategy: 0, // CENTER strategy (0 = CENTER, 1 = AVERAGE, 2 = SAH)
            maxLeafTris: 10,
            maxDepth: 20
          }
        }
      });
    });
  }

  generateBVHMainThread(geometry) {
    console.log('[ASYNC ASSETS] Generating BVH on main thread (worker not available)');
    
    geometry.computeBoundsTree({
      strategy: 0, // CENTER strategy
      maxLeafTris: 10,
      maxDepth: 20
    });
    
    return geometry.boundsTree;
  }

  // Public API methods
  async getAsset(category, assetName, variant = 'default') {
    const assetId = `${category}_${assetName}_${variant}`;
    
    if (this.loadedAssets.has(assetId)) {
      return {
        geometry: this.geometryCache.get(assetId),
        materials: this.materialCache.get(assetId),
        bvh: this.bvhCache.get(assetId)
      };
    }
    
    // Load on demand if not preloaded
    const config = this.assetDefinitions[category]?.[assetName];
    if (!config) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    
    return this.loadAsset(assetId, category, assetName, variant, config);
  }

  isAssetLoaded(category, assetName, variant = 'default') {
    const assetId = `${category}_${assetName}_${variant}`;
    return this.loadedAssets.has(assetId);
  }

  getLoadingProgress() {
    const total = Object.values(this.assetDefinitions)
      .flatMap(category => Object.values(category))
      .reduce((sum, asset) => sum + asset.variants.length, 0);
    
    const loaded = this.loadedAssets.size;
    const loading = this.loadingPromises.size;
    
    return {
      total,
      loaded,
      loading,
      percentage: total > 0 ? (loaded / total) * 100 : 0
    };
  }

  dispose() {
    // Dispose geometries
    this.geometryCache.forEach(geometry => {
      if (geometry.boundsTree) {
        geometry.disposeBoundsTree();
      }
      geometry.dispose();
    });
    
    // Dispose materials
    this.materialCache.forEach(materials => {
      Object.values(materials).forEach(material => {
        if (Array.isArray(material)) {
          material.forEach(m => m.dispose());
        } else {
          material.dispose();
        }
      });
    });
    
    // Dispose textures
    this.textureCache.forEach(texture => texture.dispose());
    
    // Terminate worker
    if (this.bvhWorker) {
      this.bvhWorker.terminate();
    }
    
    // Clear caches
    this.geometryCache.clear();
    this.materialCache.clear();
    this.bvhCache.clear();
    this.textureCache.clear();
    this.loadedAssets.clear();
    this.loadingPromises.clear();
  }
}

// Singleton instance
const asyncAssetManager = new AsyncAssetManager();

export default asyncAssetManager;