import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import PooledMissile from './PooledMissile';
import Missile from './Missile';
import weaponMeshPool from '../systems/WeaponMeshPool2';
import gpuPrecompiler from '../systems/GPUPrecompiler';

// Batched simple missile renderer - replaces individual Missile components
function SimpleMissileBatch({ missiles }) {
  const meshRefs = useRef(new Map());
  const showCollisionCircles = useGameStore((state) => state.debug.showCollisionCircles);
  const showBlasterCollisions = useGameStore((state) => state.debug.showBlasterCollisions);

  // Single useFrame for ALL simple missiles (massive performance improvement)
  useFrame(() => {
    if (missiles.length === 0) return;
    
    // Debug: Show optimization impact occasionally
    if (missiles.length > 10 && Math.random() < 0.001) {
      console.log(`[BATCH OPTIMIZATION] Updated ${missiles.length} simple missiles in single useFrame (was ${missiles.length} separate callbacks)`);
    }
    
    missiles.forEach(missile => {
      const meshRef = meshRefs.current.get(missile.id);
      if (meshRef?.current) {
        // Batch position updates - single loop instead of N useFrame callbacks
        meshRef.current.position.set(missile.position.x, missile.position.y, missile.position.z);
        
        if (missile.rotation) {
          meshRef.current.rotation.set(
            missile.rotation.x || 0,
            missile.rotation.y || 0, 
            missile.rotation.z || 0
          );
        }
      }
    });
  });

  // Clean up refs for removed missiles
  useEffect(() => {
    const currentMissileIds = new Set(missiles.map(m => m.id));
    const existingIds = Array.from(meshRefs.current.keys());
    
    existingIds.forEach(id => {
      if (!currentMissileIds.has(id)) {
        meshRefs.current.delete(id);
      }
    });
  }, [missiles]);

  const renderMissile = (missile) => {
    const { weaponType = 'default', size = 0.2, color: missileColor, type } = missile;
    const color = missileColor || (type === 'player' ? '#00ffff' : '#ff0000');
    const projectileSize = size;

    // Create ref if doesn't exist
    if (!meshRefs.current.has(missile.id)) {
      meshRefs.current.set(missile.id, React.createRef());
    }
    const meshRef = meshRefs.current.get(missile.id);

    switch (weaponType) {
      case 'laser':
        return (
          <group key={missile.id} ref={meshRef}>
            <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={15}>
              <cylinderGeometry args={[0.05, 0.05, 6, 6]} />
              <meshBasicMaterial color={color} transparent opacity={0.8} depthTest={false} />
            </mesh>
            {showBlasterCollisions && (
              <mesh>
                <sphereGeometry args={[projectileSize, 8, 6]} />
                <meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} />
              </mesh>
            )}
          </group>
        );
      
      case 'chaingun':
        return (
          <group key={missile.id} ref={meshRef}>
            <mesh renderOrder={15}>
              <sphereGeometry args={[projectileSize, 6, 4]} />
              <meshBasicMaterial color={color} depthTest={false} />
            </mesh>
            {showCollisionCircles && (
              <mesh>
                <sphereGeometry args={[projectileSize, 8, 6]} />
                <meshBasicMaterial color="#00ff00" wireframe transparent opacity={0.3} />
              </mesh>
            )}
          </group>
        );

      default: // Simple sphere for default missiles
        return (
          <group key={missile.id} ref={meshRef}>
            <mesh renderOrder={15}>
              <sphereGeometry args={[projectileSize, 8, 6]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {showCollisionCircles && (
              <mesh>
                <sphereGeometry args={[projectileSize, 8, 6]} />
                <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} />
              </mesh>
            )}
          </group>
        );
    }
  };

  return (
    <>
      {missiles.map(missile => renderMissile(missile))}
    </>
  );
}

function OptimizedMissiles() {
  const missiles = useGameStore((state) => state.missiles);
  const debug = useGameStore((state) => state.debug.showDebugElements);
  const { scene, camera, gl } = useThree();
  const pooledMeshesRef = useRef(new Map()); // Track pooled meshes in scene
  const sceneInitialized = useRef(false);
  const failedPoolRef = useRef(new Set()); // Track missiles that failed pool acquisition
  
  // Optimized pooled mesh management - only handle add/remove in useEffect
  const prevMissilesRef = useRef(new Map());
  
  // Initialize scene with pooled meshes on first render
  useEffect(() => {
    if (!sceneInitialized.current && scene && camera && gl) {
      console.log('[OPTIMIZED MISSILES] Initializing weapon pool with scene...');
      weaponMeshPool.initializeScene(scene);
      
      // GPU shader pre-compilation to prevent first-rocket lag
      console.log('[OPTIMIZED MISSILES] Starting GPU shader pre-compilation...');
      gpuPrecompiler.precompileAll(scene, camera, gl).then(result => {
        console.log(`[OPTIMIZED MISSILES] GPU compilation complete in ${result.compileTime.toFixed(2)}ms`);
        console.log('[OPTIMIZED MISSILES] Compilation stats:', result.stats);
      }).catch(error => {
        console.warn('[OPTIMIZED MISSILES] GPU compilation failed:', error);
      });
      
      sceneInitialized.current = true;
    }
  }, [scene, camera, gl]);

  useEffect(() => {
    const currentPooledMeshes = pooledMeshesRef.current;
    const prevMissiles = prevMissilesRef.current;
    const currentMissiles = new Map();
    
    // Build current missile map for fast lookups
    missiles.forEach(missile => {
      const weaponType = missile.weaponType || 'default';
      if (['rocket', 'bfg', 'bomb', 'railgun'].includes(weaponType)) {
        currentMissiles.set(missile.id, missile);
      }
    });
    
    // Release pooled meshes for missiles that no longer exist (just toggles visibility)
    prevMissiles.forEach((missile, missileId) => {
      if (!currentMissiles.has(missileId)) {
        if (currentPooledMeshes.has(missileId)) {
          // Just release to pool - mesh stays in scene but becomes invisible
          weaponMeshPool.release(missileId);
          currentPooledMeshes.delete(missileId);
        }
        // Clean up failed pool tracking
        failedPoolRef.current.delete(missileId);
      }
    });
    
    // Add meshes for new missiles only
    currentMissiles.forEach((missile, missileId) => {
      if (!prevMissiles.has(missileId) && !currentPooledMeshes.has(missileId)) {
        const weaponType = missile.weaponType || 'default';
        const pooledMesh = weaponMeshPool.acquire(weaponType, missile.id);
        
        
        if (pooledMesh) {
          // Set initial transform (mesh is already in scene, just invisible)
          pooledMesh.position.set(missile.position.x, missile.position.y, missile.position.z);
          
          if (missile.rotation) {
            pooledMesh.rotation.set(
              missile.rotation.x || 0,
              missile.rotation.y || 0,
              missile.rotation.z || 0
            );
          }
          
          const scale = (missile.size || 0.2) / 0.2;
          pooledMesh.scale.set(scale, scale, scale);
          
          if (missile.color && pooledMesh.userData.updateColor) {
            pooledMesh.userData.updateColor(missile.color);
          }
          
          if (weaponType === 'bomb' && pooledMesh.userData.updateAnimation) {
            pooledMesh.userData.updateAnimation(missile.isDeployed);
          }
          
          // NO scene.add() - mesh is already in scene, just made visible by acquire()
          currentPooledMeshes.set(missile.id, pooledMesh);
        } else {
          // Pool acquisition failed - mark for fallback to simple rendering
          // Removed console.warn for performance - it was causing lag during rapid fire
          failedPoolRef.current.add(missile.id);
        }
      }
    });
    
    // Update previous missiles reference
    prevMissilesRef.current = currentMissiles;
    
  }, [missiles, scene]);
  
  // Create missile lookup map for O(1) access
  const missileMap = useMemo(() => {
    const map = new Map();
    missiles.forEach(missile => map.set(missile.id, missile));
    return map;
  }, [missiles]);
  
  // Update pool animations and positions every frame
  useFrame(() => {
    const currentPooledMeshes = pooledMeshesRef.current;
    
    // Update positions for all active pooled meshes (O(1) missile lookups)
    currentPooledMeshes.forEach((mesh, missileId) => {
      const missile = missileMap.get(missileId);
      if (missile) {
        // Update position
        mesh.position.set(missile.position.x, missile.position.y, missile.position.z);
        
        // Update rotation if provided
        if (missile.rotation) {
          mesh.rotation.set(
            missile.rotation.x || 0,
            missile.rotation.y || 0,
            missile.rotation.z || 0
          );
        }
        
        // Update bomb deployment state
        if (missile.weaponType === 'bomb' && mesh.userData.updateAnimation) {
          mesh.userData.updateAnimation(missile.isDeployed);
        }
      }
    });
    
    // Update pool animations (bomb blinking, etc.)
    weaponMeshPool.updateAnimations();
  });
  
  // Group missiles by complexity
  const { pooledMissiles, simpleMissiles } = useMemo(() => {
    const pooled = [];
    const simple = [];
    
    missiles.forEach(missile => {
      const weaponType = missile.weaponType || 'default';
      const shouldUsePool = ['rocket', 'bfg', 'bomb', 'railgun'].includes(weaponType);
      const poolFailed = failedPoolRef.current.has(missile.id);
      
      if (shouldUsePool && !poolFailed) {
        pooled.push(missile);
      } else {
        simple.push(missile);
      }
    });
    
    return { pooledMissiles: pooled, simpleMissiles: simple };
  }, [missiles]);
  
  // Debug logging outside useMemo
  const lastCountRef = useRef(0);
  useEffect(() => {
    if (pooledMissiles.length > 0 && process.env.NODE_ENV === 'development') {
      if (Math.abs(pooledMissiles.length - lastCountRef.current) > 2) {
        console.log(`[OPTIMIZED MISSILES] Pooled missiles: ${pooledMissiles.length}`);
        lastCountRef.current = pooledMissiles.length;
      }
    }
  }, [pooledMissiles.length]);
  
  // Debug pool statistics
  useEffect(() => {
    if (debug) {
      const logStats = () => {
        const stats = weaponMeshPool.getStats();
        // console.log('[WEAPON POOL] Statistics:', stats);
      };
      
      // Log stats every 5 seconds in debug mode
      const interval = setInterval(logStats, 5000);
      return () => clearInterval(interval);
    }
  }, [debug]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all pooled meshes
      const currentPooledMeshes = pooledMeshesRef.current;
      currentPooledMeshes.forEach((mesh, missileId) => {
        scene.remove(mesh);
        weaponMeshPool.release(missileId);
      });
      currentPooledMeshes.clear();
    };
  }, [scene]);
  
  return (
    <>
      {/* Render simple missiles (laser, chaingun, default) */}
      {/* Pooled missiles are managed directly in the scene */}
      <SimpleMissileBatch missiles={simpleMissiles} />
    </>
  );
}

export default OptimizedMissiles;