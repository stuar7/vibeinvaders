import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useFrame, useThree } from '@react-three/fiber';
import weaponMeshPool from '../systems/WeaponMeshPool2';
import effectsPool from '../systems/EffectsPool';

// Performance monitoring hook for React components
export function useComponentPerformance(componentName) {
  const updateComponentTime = useGameStore((state) => state.updateComponentTime);
  const renderStartTime = useRef(Date.now());
  const lastUpdateTime = useRef(0);
  
  useEffect(() => {
    renderStartTime.current = Date.now();
    return () => {
      const renderTime = Date.now() - renderStartTime.current;
      const now = Date.now();
      
      // Only update performance metrics every 100ms to prevent infinite loops
      if (now - lastUpdateTime.current > 100) {
        lastUpdateTime.current = now;
        updateComponentTime(componentName, renderTime);
      }
    };
  }, []); // Empty dependency array to prevent constant re-running
}

// Main performance monitor hook for the game
export function usePerformanceMonitor() {
  const updatePerformance = useGameStore((state) => state.updatePerformance);
  const performance = useGameStore((state) => state.performance);
  const frameStartTime = useRef(Date.now());
  const frameCount = useRef(0);
  const lastFPSUpdate = useRef(Date.now());
  const frameTimeHistory = useRef([]);
  const lastMemoryUsage = useRef(0);
  const { gl, scene } = useThree();
  
  useFrame((state, delta) => {
    const now = Date.now();
    const frameTime = now - frameStartTime.current;
    frameStartTime.current = now;
    
    // Track frame time history (keep last 60 frames)
    frameTimeHistory.current.push(frameTime);
    if (frameTimeHistory.current.length > 60) {
      frameTimeHistory.current.shift();
    }
    
    // Calculate average frame time
    const avgFrameTime = frameTimeHistory.current.reduce((a, b) => a + b, 0) / frameTimeHistory.current.length;
    const maxFrameTime = Math.max(...frameTimeHistory.current);
    
    // Detect frame time spikes (> 2x average or > 33ms)
    const isSpike = frameTime > Math.max(avgFrameTime * 2, 33);
    
    // Update frame count for FPS calculation
    frameCount.current++;
    
    // Update FPS every second
    if (now - lastFPSUpdate.current >= 1000) {
      const fps = frameCount.current / ((now - lastFPSUpdate.current) / 1000);
      frameCount.current = 0;
      lastFPSUpdate.current = now;
      
      // Get memory usage if available
      let memoryUsage = 0;
      let gcDetected = false;
      if (window.performance && window.performance.memory) {
        memoryUsage = window.performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        
        // Detect GC events (significant memory drop)
        if (lastMemoryUsage.current > 0 && 
            lastMemoryUsage.current - memoryUsage > 5) { // 5MB drop indicates GC
          gcDetected = true;
        }
        lastMemoryUsage.current = memoryUsage;
      }
      
      // Get renderer info
      const rendererInfo = gl.info.render;
      const triangleCount = rendererInfo.triangles;
      const drawCalls = rendererInfo.calls;
      const geometries = gl.info.memory.geometries;
      const textures = gl.info.memory.textures;
      
      // Get detailed triangle breakdown
      let triangleBreakdown = null;
      try {
        triangleBreakdown = getTriangleBreakdown(scene);
      } catch (error) {
        console.warn('[PERFORMANCE] Could not get triangle breakdown:', error);
      }
      
      // Get game state for spike analysis
      const gameState = useGameStore.getState();
      const entityCount = gameState.aliens.length + gameState.missiles.length + gameState.asteroids.length;
      const missileCount = gameState.missiles.length;
      const alienCount = gameState.aliens.length;
      
      // Get pool statistics
      let poolStats = null;
      let effectsPoolStats = null;
      try {
        poolStats = weaponMeshPool.getStats();
        effectsPoolStats = effectsPool.getStats();
      } catch (error) {
        console.warn('[PERFORMANCE] Could not get pool stats:', error);
      }
      
      // Create spike record if detected
      let newSpikes = [...(performance.spikes || [])];
      if (isSpike) {
        const spikeData = {
          time: now,
          frameTime: frameTime,
          entityCount: entityCount,
          missileCount: missileCount,
          alienCount: alienCount,
          triangleCount: triangleCount,
          drawCalls: drawCalls,
          memoryUsage: memoryUsage,
          poolStats: poolStats,
          effectsPoolStats: effectsPoolStats,
          cause: analyzeSpikeCause(frameTime, entityCount, missileCount, alienCount, triangleCount, drawCalls, memoryUsage, poolStats, effectsPoolStats)
        };
        newSpikes.push(spikeData);
        
        // Keep only last 10 spikes
        if (newSpikes.length > 10) {
          newSpikes = newSpikes.slice(-10);
        }
      }
      
      updatePerformance({
        frameTime: frameTime,
        frameRate: Math.round(fps),
        renderTime: delta * 1000,
        memoryUsage: memoryUsage,
        triangleCount: triangleCount,
        drawCalls: drawCalls,
        geometries: geometries,
        textures: textures,
        frameTimeHistory: [...frameTimeHistory.current],
        maxFrameTime: maxFrameTime,
        avgFrameTime: avgFrameTime,
        spikes: newSpikes,
        gcEvents: performance.gcEvents + (gcDetected ? 1 : 0),
        lastGCTime: gcDetected ? now : performance.lastGCTime,
        lastUpdate: now,
        poolStats: poolStats,
        effectsPoolStats: effectsPoolStats,
        triangleBreakdown: triangleBreakdown,
      });
    }
  });
}

// Analyze what might be causing performance spikes
function analyzeSpikeCause(frameTime, entityCount, missileCount, alienCount, triangleCount, drawCalls, memoryUsage, poolStats, effectsPoolStats) {
  const causes = [];
  
  // Shooting-related causes
  if (missileCount > 50) causes.push(`HIGH MISSILE COUNT (${missileCount}) - Shooting lag`);
  else if (missileCount > 20) causes.push(`Many missiles (${missileCount}) - Possible shooting lag`);
  
  // Entity-related causes
  if (alienCount > 30) causes.push(`Many aliens (${alienCount})`);
  if (entityCount > 150) causes.push(`High total entities (${entityCount})`);
  
  // Rendering causes
  if (triangleCount > 100000) causes.push(`High triangles (${triangleCount.toLocaleString()})`);
  if (drawCalls > 200) causes.push(`High draw calls (${drawCalls})`);
  
  // Memory causes
  if (memoryUsage > 200) causes.push(`High memory (${memoryUsage.toFixed(1)}MB)`);
  
  // Frame time severity
  if (frameTime > 50) causes.push('SEVERE SPIKE');
  else if (frameTime > 33) causes.push('Moderate spike');
  
  // Specific shooting patterns
  if (missileCount > 15 && frameTime > 25) {
    causes.unshift('🔫 SHOOTING PERFORMANCE ISSUE');
  }
  
  // Pool analysis
  if (poolStats) {
    const rocketStats = poolStats.rocket;
    const bfgStats = poolStats.bfg;
    const bombStats = poolStats.bomb;
    const railgunStats = poolStats.railgun;
    
    // Check for pool exhaustion
    if (rocketStats && rocketStats.active >= rocketStats.poolSize * 0.9) {
      causes.push(`🚀 ROCKET POOL EXHAUSTED (${rocketStats.active}/${rocketStats.poolSize})`);
    }
    if (bfgStats && bfgStats.active >= bfgStats.poolSize * 0.9) {
      causes.push(`⚡ BFG POOL EXHAUSTED (${bfgStats.active}/${bfgStats.poolSize})`);
    }
    if (bombStats && bombStats.active >= bombStats.poolSize * 0.9) {
      causes.push(`💣 BOMB POOL EXHAUSTED (${bombStats.active}/${bombStats.poolSize})`);
    }
    if (railgunStats && railgunStats.active >= railgunStats.poolSize * 0.9) {
      causes.push(`⚡ RAILGUN POOL EXHAUSTED (${railgunStats.active}/${railgunStats.poolSize})`);
    }
    
    // Check for high pool usage during spike
    const totalActive = (rocketStats?.active || 0) + (bfgStats?.active || 0) + 
                       (bombStats?.active || 0) + (railgunStats?.active || 0);
    if (totalActive > 15) {
      causes.push(`🏭 HIGH POOL USAGE (${totalActive} pooled meshes active)`);
    }
  }
  
  // Effects pool analysis
  if (effectsPoolStats) {
    const explosionStats = effectsPoolStats.explosion;
    const hitStats = effectsPoolStats.hit;
    const playerHitStats = effectsPoolStats.playerHit;
    const shieldHitStats = effectsPoolStats.shieldHit;
    const powerupStats = effectsPoolStats.powerupCollect;
    
    // Check for effects pool exhaustion
    if (explosionStats && explosionStats.active >= explosionStats.poolSize * 0.9) {
      causes.push(`💥 EXPLOSION POOL EXHAUSTED (${explosionStats.active}/${explosionStats.poolSize})`);
    }
    if (hitStats && hitStats.active >= hitStats.poolSize * 0.9) {
      causes.push(`💢 HIT EFFECTS POOL EXHAUSTED (${hitStats.active}/${hitStats.poolSize})`);
    }
    
    // Check for high effects pool usage during spike
    const totalActiveEffects = (explosionStats?.active || 0) + (hitStats?.active || 0) + 
                              (playerHitStats?.active || 0) + (shieldHitStats?.active || 0) + 
                              (powerupStats?.active || 0);
    if (totalActiveEffects > 50) {
      causes.push(`🎆 HIGH EFFECTS USAGE (${totalActiveEffects} particles active)`);
    }
  }
  
  return causes.length > 0 ? causes.join(', ') : 'Unknown cause';
}

// Hook to measure render performance of specific operations
export function useRenderProfiler(operationName) {
  const updateComponentTime = useGameStore((state) => state.updateComponentTime);
  
  const profileStart = () => {
    return performance.now();
  };
  
  const profileEnd = (startTime) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    updateComponentTime(operationName, duration);
    return duration;
  };
  
  return { profileStart, profileEnd };
}

// Function to analyze triangle breakdown by traversing the scene
function getTriangleBreakdown(scene) {
  const breakdown = {
    total: 0,
    byComponent: {},
    byMaterial: {},
    byGeometry: {},
    topContributors: []
  };
  
  if (!scene) {
    console.warn('[TRIANGLE BREAKDOWN] No scene provided');
    return breakdown;
  }
  
  const contributors = [];
  let objectCount = 0;
  let meshCount = 0;
  
  // Traverse the scene and count triangles
  scene.traverse((object) => {
    objectCount++;
    if (object.isMesh && object.geometry) {
      meshCount++;
      const geometry = object.geometry;
      let triangleCount = 0;
      
      // Calculate triangle count
      if (geometry.index) {
        triangleCount = geometry.index.count / 3;
      } else if (geometry.attributes.position) {
        triangleCount = geometry.attributes.position.count / 3;
      }
      
      if (triangleCount > 0) {
        breakdown.total += triangleCount;
        
        // Categorize by component type
        const componentType = getComponentType(object);
        breakdown.byComponent[componentType] = (breakdown.byComponent[componentType] || 0) + triangleCount;
        
        // Debug logging removed for performance - check window.analyzeTriangles() for manual debugging
        
        // Categorize by material type
        const materialType = object.material ? object.material.constructor.name : 'Unknown';
        breakdown.byMaterial[materialType] = (breakdown.byMaterial[materialType] || 0) + triangleCount;
        
        // Categorize by geometry type
        const geometryType = geometry.constructor.name;
        breakdown.byGeometry[geometryType] = (breakdown.byGeometry[geometryType] || 0) + triangleCount;
        
        // Track individual contributors
        contributors.push({
          name: object.name || 'Unnamed',
          type: componentType,
          triangles: triangleCount,
          material: materialType,
          geometry: geometryType,
          visible: object.visible
        });
      }
    }
  });
  
  // Sort contributors by triangle count
  breakdown.topContributors = contributors
    .sort((a, b) => b.triangles - a.triangles)
    .slice(0, 10); // Top 10 contributors
  
  // Expose function globally for manual debugging (removed automatic console.log for performance)
  if (breakdown.total > 50000) {
    // Make function available globally for debugging
    window.analyzeTriangles = () => getTriangleBreakdown(scene);
  }
  
  return breakdown;
}

// Helper function to determine component type from object properties
function getComponentType(object) {
  // Check user data for component hints
  if (object.userData) {
    if (object.userData.weaponType) return `Weapon-${object.userData.weaponType}`;
    if (object.userData.effectType) return `Effect-${object.userData.effectType}`;
    if (object.userData.component) return object.userData.component;
  }
  
  // Check object name patterns (case insensitive)
  const name = (object.name || '').toLowerCase();
  if (name.includes('rocket') || name.includes('missile')) return 'Missiles';
  if (name.includes('alien')) return 'Aliens';
  if (name.includes('asteroid')) return 'Asteroids';
  if (name.includes('ground') || name.includes('terrain')) return 'Ground';
  if (name.includes('particle') || name.includes('dust')) return 'Particles';
  if (name.includes('effect') || name.includes('explosion')) return 'Effects';
  if (name.includes('ui') || name.includes('hud')) return 'UI';
  if (name.includes('background') || name.includes('skybox')) return 'Background';
  if (name.includes('instance')) return 'InstancedMesh';
  if (name.includes('points')) return 'PointCloud';
  
  // Check geometry type for better categorization
  if (object.geometry) {
    const geoType = object.geometry.constructor.name;
    if (geoType.includes('Instanced')) return 'InstancedMesh';
    if (geoType.includes('Buffer')) return 'BufferGeometry';
    if (geoType.includes('Points')) return 'PointCloud';
    if (geoType.includes('Plane')) return 'Planes';
    if (geoType.includes('Box')) return 'Boxes';
    if (geoType.includes('Sphere')) return 'Spheres';
    if (geoType.includes('Cylinder')) return 'Cylinders';
    if (geoType.includes('Cone')) return 'Cones';
  }
  
  // Check material type for hints
  if (object.material) {
    const matType = object.material.constructor.name;
    if (matType.includes('Points')) return 'PointMaterials';
    if (matType.includes('Shader')) return 'ShaderMaterials';
    if (object.material.transparent) return 'Transparent';
  }
  
  // Check object type
  if (object.isInstancedMesh) return 'InstancedMesh';
  if (object.isPoints) return 'PointCloud';
  if (object.isLine) return 'Lines';
  if (object.isSprite) return 'Sprites';
  
  // Check parent hierarchy for hints
  let parent = object.parent;
  let depth = 0;
  while (parent && parent !== parent.scene && depth < 5) {
    if (parent.userData && parent.userData.component) {
      return `${parent.userData.component}-Child`;
    }
    if (parent.name) {
      const parentName = parent.name.toLowerCase();
      if (parentName.includes('ground')) return 'Ground-Child';
      if (parentName.includes('missile')) return 'Missile-Child';
      if (parentName.includes('effect')) return 'Effect-Child';
    }
    parent = parent.parent;
    depth++;
  }
  
  // Layer-based categorization
  if (object.layers && object.layers.mask !== 1) return 'LayeredObjects';
  
  return 'Unknown';
}