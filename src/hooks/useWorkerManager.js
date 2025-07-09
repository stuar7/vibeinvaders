import { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import weaponMeshPool from '../systems/WeaponMeshPool2';
import soaMissileBuffer from '../systems/SOAMissileBuffer';
import { useEntityPool } from '../hooks/useEntityPool';
import workerLogProcessor from '../utils/WorkerLogProcessor';

export const useWorkerManager = ({ updateMissiles, damageArmor, damageShield, loseLife, effectsQueueRef, damageQueueRef }) => {
  const unifiedWorkerRef = useRef(null);
  const workerInitialized = useRef(false);
  const workerBusy = useRef(false);
  
  // Use entity pool for damage handling
  const { damageEntity } = useEntityPool();

  useEffect(() => {
    console.log('[WORKER] Creating new worker...');
    try {
      const worker = new Worker(new URL('../workers/soaMissilePhysics.worker.js', import.meta.url));
      unifiedWorkerRef.current = worker;
      console.log('[WORKER] Worker created successfully:', worker);
    } catch (error) {
      console.error('[WORKER] Failed to create worker:', error);
      return;
    }
    
    unifiedWorkerRef.current.onerror = (error) => {
      console.error('[WORKER] Worker error:', error);
    };
    
    unifiedWorkerRef.current.onmessage = (e) => {
      const { type, results, error, buffer } = e.data;
      
      // Handle worker log messages with low priority processing
      if (type === 'workerLog') {
        workerLogProcessor.addLog(e.data);
        return;
      }
      
      if (type === 'error') {
        console.error('[UNIFIED WORKER] Error:', error);
        // Worker is no longer busy on error
        workerBusy.current = false;
        // Restore buffer if it was returned with error
        if (buffer) {
          soaMissileBuffer.swapBuffers(buffer);
        }
        return;
      }
      
      if (type === 'initialized') {
        // Restore buffer after initialization
        if (buffer) {
          soaMissileBuffer.swapBuffers(buffer);
        }
        workerInitialized.current = true;
        return;
      }
      
      if (type === 'error') {
        console.error('[WORKER] Worker reported error:', error);
        return;
      }
      
      if (type === 'frameResults') {
        // Worker is no longer busy
        workerBusy.current = false;
        
        // Restore buffer from worker (ping-pong buffer system)
        if (buffer) {
          soaMissileBuffer.swapBuffers(buffer);
        }
        
        const { physicsStats, collisions, missileCount } = results;
        
        // Extract updated missiles from SOA buffer
        if (missileCount > 0) {
          const updatedMissiles = soaMissileBuffer.getAllActiveMissiles();
          
          if (updatedMissiles && updatedMissiles.length > 0) {
            // Separate pool missiles from store missiles
            const poolUpdates = [];
            const storeUpdates = [];
            
            updatedMissiles.forEach(missile => {
              if (['rocket', 'bfg', 'bomb', 'railgun'].includes(missile.weaponType)) {
                poolUpdates.push({
                  id: missile.id,
                  position: missile.position,
                  velocity: missile.velocity
                });
              } else {
                storeUpdates.push(missile);
              }
            });
            
            // Update pool missile positions
            if (poolUpdates.length > 0) {
              weaponMeshPool.updateMissilePositions(poolUpdates);
            }
            
            // Update store missiles
            if (storeUpdates.length > 0) {
              updateMissiles(storeUpdates);
            }
          }
        }
        
        // Handle collisions from worker
        if (collisions) {
          
          // Get current game state for collision handling
          const storeMissiles = useGameStore.getState().missiles;
          const poolMissiles = weaponMeshPool.getActiveMissiles();
          const allMissiles = [...storeMissiles, ...poolMissiles];
          const currentAliens = useGameStore.getState().aliens;
          const currentAsteroids = useGameStore.getState().asteroids;
          
          
          // Create lookup maps for O(1) collision handling
          const missileMap = new Map(allMissiles.map(m => [m.id, m]));
          const alienMap = new Map(currentAliens.map(a => [a.id, a]));
          const asteroidMap = new Map(currentAsteroids.map(a => [a.id, a]));
          
          // Track closest distances for live targeting stats every frame
          const gameStore = useGameStore.getState();
          if (gameStore.liveTargetingStats.enabled && gameStore.liveTargetingStats.shotHistory.length > 0) {
            // Update closest distances for all missiles in flight
            allMissiles.forEach(missile => {
              if (missile.type === 'player' && missile.timestamp) {
                // Find the most recent shot record that matches this missile's timestamp
                const shotRecord = gameStore.liveTargetingStats.shotHistory
                  .filter(shot => shot.targetId && Math.abs(shot.timestamp - missile.timestamp) < 1000)
                  .sort((a, b) => Math.abs(a.timestamp - missile.timestamp) - Math.abs(b.timestamp - missile.timestamp))[0];
                
                if (shotRecord) {
                  const target = currentAliens.find(a => a.id === shotRecord.targetId);
                  if (target) {
                    const distance = Math.sqrt(
                      Math.pow(missile.position.x - target.position.x, 2) +
                      Math.pow(missile.position.y - target.position.y, 2) +
                      Math.pow(missile.position.z - target.position.z, 2)
                    );
                    
                    // Update closest distance if this is closer
                    if (distance < shotRecord.closestDistance) {
                      shotRecord.closestDistance = distance;
                      // Update session stats as well
                      const sessionStats = gameStore.liveTargetingStats.sessionStats;
                      sessionStats.totalClosestDistance = gameStore.liveTargetingStats.shotHistory
                        .reduce((sum, shot) => sum + shot.closestDistance, 0);
                      sessionStats.avgClosestDistance = sessionStats.shots > 0 ? 
                        sessionStats.totalClosestDistance / sessionStats.shots : 0;
                    }
                  }
                }
              }
            });
          }

          // Handle player/wingman missile vs alien collisions
          if (collisions.missileAlienHits && collisions.missileAlienHits.length > 0) {
            collisions.missileAlienHits.forEach(hit => {
              const missile = missileMap.get(hit.missileId);
              const alien = alienMap.get(hit.alienId);
              
              
              if (missile && alien) {
                // Calculate damage based on weapon type (scaled down from old system)
                let damage = 1;
                switch (missile.weaponType) {
                  case 'laser': damage = 2; break;
                  case 'chaingun': damage = 1; break;
                  case 'bfg': damage = 50; break; // BFG should still one-shot most things
                  case 'rocket': damage = 5; break;
                  case 'charge': damage = missile.damage || 1; break;
                  case 'railgun': damage = 8; break;
                  default: damage = 1;
                }
                
                // Apply weapon level bonus
                const weaponLevel = missile.weaponLevel || 1;
                if (missile.weaponType !== 'charge') {
                  damage += (weaponLevel - 1);
                }
                
                
                // Trigger hit indicator on crosshair
                useGameStore.getState().triggerHitIndicator();
                
                // Apply component-based damage if component info is available
                if (hit.component) {
                  // Use component-based damage system
                  const damageAlienShipComponent = useGameStore.getState().damageAlienShipComponent;
                  damageAlienShipComponent(hit.alienId, hit.component, damage);
                  
                  // Check if alien still exists (component damage might have destroyed it)
                  const updatedAliens = useGameStore.getState().aliens;
                  const alienStillExists = updatedAliens.find(a => a.id === hit.alienId);
                  
                  if (!alienStillExists) {
                    // Alien was destroyed by component damage
                    useGameStore.getState().addScore(alien.points);
                    effectsQueueRef.current.push({
                      id: `explosion-${Date.now()}-${alien.id}`,
                      type: 'explosion',
                      position: alien.position,
                      size: alien.size || 1.5,
                      duration: 1000
                    });
                  }
                } else {
                  // Fallback to old damage system
                  const result = damageEntity(hit.alienId, damage);
                  
                  if (result === 'destroyed') {
                    // Entity pool already removed the alien
                    useGameStore.getState().addScore(alien.points);
                    effectsQueueRef.current.push({
                      id: `explosion-${Date.now()}-${alien.id}`,
                      type: 'explosion',
                      position: { ...alien.position },
                      startTime: Date.now(),
                    });
                  } else if (result === 'damaged') {
                    // Just damaged
                    effectsQueueRef.current.push({
                      id: `hit-${Date.now()}-${alien.id}`,
                      type: 'hit',
                      position: { ...alien.position },
                      startTime: Date.now(),
                    });
                  } else if (result === false) {
                    console.warn(`[COLLISION DEBUG] Failed to damage alien ${hit.alienId} - entity not found in pool`);
                  }
                }
                
                // Remove non-piercing missiles
                if (!['bfg', 'charge', 'railgun'].includes(missile.weaponType)) {
                  if (['rocket', 'bfg', 'bomb', 'railgun'].includes(missile.weaponType)) {
                    weaponMeshPool.release(missile.id);
                  } else {
                    const updatedMissiles = useGameStore.getState().missiles.filter(m => m.id !== missile.id);
                    updateMissiles(updatedMissiles);
                  }
                }
              } else {
                console.warn(`[COLLISION DEBUG] Missing entities - missile: ${!!missile}, alien: ${!!alien}`);
              }
            });
          }
          
          // Handle missile-asteroid collisions
          if (collisions.missileAsteroidHits) {
            collisions.missileAsteroidHits.forEach(hit => {
              const missile = missileMap.get(hit.missileId);
              const asteroid = asteroidMap.get(hit.asteroidId);
              
              if (missile && asteroid) {
                // Calculate damage based on weapon type
                let asteroidDamage = 1;
                
                switch (missile.weaponType) {
                  case 'bfg': 
                    asteroidDamage = asteroid.health || 999;
                    break;
                  case 'rocket':
                    asteroidDamage = 3;
                    break;
                  case 'railgun':
                    asteroidDamage = 5;
                    break;
                  case 'charge':
                    asteroidDamage = missile.damage || 1;
                    break;
                  default:
                    asteroidDamage = 1;
                }
                
                // Trigger hit indicator on crosshair
                useGameStore.getState().triggerHitIndicator();
                
                // Use Entity Pool damage system
                const result = damageEntity(asteroid.id, asteroidDamage);
                
                if (result === 'destroyed') {
                  // Entity pool already removed the asteroid
                  // Calculate score based on asteroid size
                  let score = 50;
                  if (asteroid.type === 'Large') score = 75;
                  else if (asteroid.type === 'SuperLarge') score = 100;
                  useGameStore.getState().addScore(score);
                  
                  effectsQueueRef.current.push({
                    id: `asteroid-explosion-${Date.now()}-${asteroid.id}`,
                    type: 'explosion',
                    position: { ...asteroid.position },
                    startTime: Date.now(),
                  });
                } else if (result === 'damaged') {
                  // Just damaged
                  effectsQueueRef.current.push({
                    id: `asteroid-hit-${Date.now()}-${asteroid.id}`,
                    type: 'hit',
                    position: { ...asteroid.position },
                    startTime: Date.now(),
                  });
                }
                
                // Remove non-piercing missiles
                if (!['bfg', 'railgun'].includes(missile.weaponType)) {
                  if (['rocket', 'bfg', 'bomb', 'railgun'].includes(missile.weaponType)) {
                    weaponMeshPool.release(missile.id);
                  } else {
                    const updatedMissiles = useGameStore.getState().missiles.filter(m => m.id !== missile.id);
                    updateMissiles(updatedMissiles);
                  }
                }
              }
            });
          }
          
          // Handle alien missile vs player collisions
          if (collisions.alienMissilePlayerHits) {
            collisions.alienMissilePlayerHits.forEach(hit => {
              const currentPlayerPosition = useGameStore.getState().playerPosition;
              const playerPowerUps = useGameStore.getState().playerPowerUps;
              const defensiveSystems = useGameStore.getState().defensiveSystems;
              
              // Remove the missile
              const hitMissile = missileMap.get(hit.missileId);
              if (hitMissile) {
                if (['rocket', 'bfg', 'bomb', 'railgun'].includes(hitMissile.weaponType)) {
                  weaponMeshPool.release(hit.missileId);
                } else {
                  const updatedMissiles = useGameStore.getState().missiles.filter(m => m.id !== hit.missileId);
                  updateMissiles(updatedMissiles);
                }
              }
              
              // Apply damage logic
              if (!playerPowerUps.shield) {
                // Apply component-based damage if component info is available
                if (hit.component) {
                  const baseDamage = 1;
                  const damageShipComponent = useGameStore.getState().damageShipComponent;
                  damageShipComponent(hit.component, baseDamage);
                  
                  effectsQueueRef.current.push({
                    id: `component-hit-${Date.now()}`,
                    type: 'componentHit',
                    position: { ...currentPlayerPosition, z: 0 },
                    component: hit.component,
                    startTime: Date.now(),
                  });
                } else {
                  // Fallback to old armor system
                  const armorIntegrity = defensiveSystems.armor.integrity;
                  const armorLevel = defensiveSystems.armor.level;
                  
                  if (armorIntegrity > 0) {
                    const baseDamage = 25;
                    const armorReduction = Math.min(0.8, (armorIntegrity / 100) * (armorLevel * 0.2));
                    const finalDamage = Math.ceil(baseDamage * (1 - armorReduction));
                    const armorDamage = Math.min(armorIntegrity, finalDamage * 0.8);
                    
                    damageQueueRef.current.push({
                      type: 'damageArmor',
                      amount: armorDamage
                    });
                    effectsQueueRef.current.push({
                      id: `armor-hit-${Date.now()}`,
                      type: 'armorHit',
                      position: { ...currentPlayerPosition, z: 0 },
                      startTime: Date.now(),
                    });
                    
                    if (armorIntegrity - armorDamage <= 0) {
                      damageQueueRef.current.push({
                        type: 'loseLife'
                      });
                      effectsQueueRef.current.push({
                        id: `player-hit-${Date.now()}`,
                        type: 'playerHit',
                        position: { ...currentPlayerPosition, z: 0 },
                        startTime: Date.now(),
                      });
                    }
                  } else {
                    damageQueueRef.current.push({
                      type: 'loseLife'
                    });
                    effectsQueueRef.current.push({
                      id: `player-hit-${Date.now()}`,
                      type: 'playerHit',
                      position: { ...currentPlayerPosition, z: 0 },
                      startTime: Date.now(),
                    });
                  }
                }
              } else {
                effectsQueueRef.current.push({
                  id: `shield-hit-${Date.now()}`,
                  type: 'shieldHit',
                  position: { ...currentPlayerPosition, z: 0 },
                  startTime: Date.now(),
                });
                damageQueueRef.current.push({
                  type: 'damageShield'
                });
              }
            });
          }
        }
      }
    };
    
    // Initialize SOA worker with transferable buffer
    setTimeout(() => {
      if (!unifiedWorkerRef.current) {
        console.error('[WORKER] Worker not available for initialization');
        return;
      }
      
      console.log('[GAME] Initializing SOA worker with transferable buffer');
      
      try {
        const transferBuffer = soaMissileBuffer.getTransferBuffer();
        const rawArrays = soaMissileBuffer.getRawArrays();
        
        console.log('[GAME] Sending buffer to worker:', {
          bufferSize: transferBuffer.byteLength,
          missileCount: rawArrays.count,
          maxMissiles: rawArrays.maxMissiles
        });
        
        unifiedWorkerRef.current.postMessage({
          type: 'initialize',
          data: {
            buffer: transferBuffer,
            rawArrays: rawArrays
          }
        }, [transferBuffer]);
        
        console.log('[GAME] Initialization message sent to worker');
      } catch (error) {
        console.error('[GAME] Failed to initialize worker:', error);
      }
    }, 100);
    
    return () => {
      if (unifiedWorkerRef.current) {
        unifiedWorkerRef.current.terminate();
      }
    };
  }, [damageEntity]); // Added damageEntity to dependency array

  return {
    unifiedWorkerRef,
    workerInitialized,
    workerBusy
  };
};