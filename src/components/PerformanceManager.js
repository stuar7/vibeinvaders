import { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import workerLogProcessor from '../utils/WorkerLogProcessor';

function PerformanceManager() {
  const collisionWorkerRef = useRef(null);
  const physicsWorkerRef = useRef(null);
  const creationWorkerRef = useRef(null);
  const pendingCollisionsRef = useRef(new Map());
  const pendingPhysicsRef = useRef(new Map());
  const pendingCreationsRef = useRef(new Map());
  const lastUpdateRef = useRef({ collision: 0, physics: 0 });
  
  // Store references
  const missiles = useGameStore((state) => state.missiles);
  const aliens = useGameStore((state) => state.aliens);
  const asteroids = useGameStore((state) => state.asteroids);
  const updateMissiles = useGameStore((state) => state.updateMissiles);
  const addMissile = useGameStore((state) => state.addMissile);
  const removeAlien = useGameStore((state) => state.removeAlien);
  const removeAsteroid = useGameStore((state) => state.removeAsteroid);
  const addScore = useGameStore((state) => state.addScore);
  const addEffect = useGameStore((state) => state.addEffect);
  const gameMode = useGameStore((state) => state.gameMode);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  
  // Define processExplosionHits before useEffect to avoid lexical declaration error
  const processExplosionHits = useCallback((hits) => {
    hits.forEach(hit => {
      const alien = aliens.find(a => a.id === hit.alienId);
      if (alien) {
        alien.health -= 50; // Bomb damage
        
        if (alien.health <= 0) {
          removeAlien(alien.id);
          addScore(alien.points);
          addEffect({
            id: `explosion-${Date.now()}-${alien.id}`,
            type: 'explosion',
            position: { ...alien.position },
            startTime: Date.now(),
          });
        }
      }
    });
  }, [aliens, removeAlien, addScore, addEffect]);
  
  // Initialize Workers
  useEffect(() => {
    try {
      // Collision Detection Worker
      collisionWorkerRef.current = new Worker(new URL('../workers/collisionDetection.worker.js', import.meta.url));
          
      collisionWorkerRef.current.onmessage = (e) => {
        const { type, collisions, hits, timestamp } = e.data;
        
        // Handle worker log messages with low priority processing
        if (type === 'workerLog') {
          workerLogProcessor.addLog(e.data);
          return;
        }
        
        if (type === 'collisionResults') {
          pendingCollisionsRef.current.set(timestamp, collisions);
        } else if (type === 'explosionResults') {
          // Handle explosion results immediately
          processExplosionHits(hits);
        }
      };
      
      // Physics Worker
      physicsWorkerRef.current = new Worker(new URL('../workers/missilePhysics.worker.js', import.meta.url));
      
      physicsWorkerRef.current.onmessage = (e) => {
        const { type, results, timestamp } = e.data;
        
        // Handle worker log messages with low priority processing
        if (type === 'workerLog') {
          workerLogProcessor.addLog(e.data);
          return;
        }
        
        if (type === 'physicsResults') {
          pendingPhysicsRef.current.set(timestamp, results);
        }
      };

      // Missile Creation Worker
      creationWorkerRef.current = new Worker(new URL('../workers/missileCreation.worker.js', import.meta.url));
      
      creationWorkerRef.current.onmessage = (e) => {
        const { type, results, timestamp } = e.data;
        
        // Handle worker log messages with low priority processing
        if (type === 'workerLog') {
          workerLogProcessor.addLog(e.data);
          return;
        }
        
        if (type === 'missilesCreated') {
          pendingCreationsRef.current.set(timestamp, results);
        }
      };
      
    } catch (error) {
      console.warn('Web Workers not supported, falling back to main thread');
    }
    
    return () => {
      if (collisionWorkerRef.current) {
        collisionWorkerRef.current.terminate();
      }
      if (physicsWorkerRef.current) {
        physicsWorkerRef.current.terminate();
      }
      if (creationWorkerRef.current) {
        creationWorkerRef.current.terminate();
      }
    };
  }, [processExplosionHits]);
  
  const processCollisionResults = (collisions) => {
    // Process missile-alien hits
    collisions.missileAlienHits.forEach(hit => {
      const missile = missiles.find(m => m.id === hit.missileId);
      const alien = aliens.find(a => a.id === hit.alienId);
      
      if (missile && alien) {
        // Calculate damage based on weapon type
        let damage = 1;
        switch (missile.weaponType) {
          case 'laser': damage = 2; break;
          case 'chaingun': damage = 1; break;
          case 'bfg': damage = 50; break;
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
        
        // Apply alien type damage reduction
        switch (alien.type) {
          case 2: damage = Math.max(1, Math.floor(damage * 0.7)); break;
          case 3: damage = Math.max(1, Math.floor(damage * 0.5)); break;
          default: break; // No damage reduction for other types
        }
        
        alien.health -= damage;
        
        if (alien.health <= 0) {
          removeAlien(alien.id);
          addScore(alien.points);
          addEffect({
            id: `explosion-${Date.now()}-${alien.id}`,
            type: 'explosion',
            position: { ...alien.position },
            startTime: Date.now(),
          });
          
          // Handle power-up drops (simplified)
          if (Math.random() < 0.5) {
            const dropType = Math.random() < 0.5 ? 'shield' : 'rapidFire';
            useGameStore.getState().addPowerUp({
              id: `drop-${Date.now()}`,
              type: dropType,
              position: { ...alien.position },
              velocity: { x: 0, y: 0, z: 0.02 }
            });
          }
        } else {
          addEffect({
            id: `hit-${Date.now()}-${alien.id}`,
            type: 'hit',
            position: { ...alien.position },
            startTime: Date.now(),
          });
        }
        
        // Remove non-piercing missiles
        if (!['bfg', 'charge', 'railgun'].includes(missile.weaponType)) {
          const updatedMissiles = missiles.filter(m => m.id !== missile.id);
          updateMissiles(updatedMissiles);
        }
      }
    });
    
    // Process missile-asteroid hits
    collisions.missileAsteroidHits.forEach(hit => {
      const missile = missiles.find(m => m.id === hit.missileId);
      const asteroid = asteroids.find(a => a.id === hit.asteroidId);
      
      if (missile && asteroid) {
        // Handle asteroid damage
        const damageAsteroid = useGameStore.getState().damageAsteroid;
        if (missile.weaponType === 'bfg') {
          damageAsteroid(asteroid.id, asteroid.health || 999);
        } else {
          damageAsteroid(asteroid.id, 1);
        }
        
        // Check if destroyed
        const updatedAsteroid = asteroids.find(a => a.id === asteroid.id);
        if (updatedAsteroid && updatedAsteroid.health <= 0) {
          removeAsteroid(asteroid.id);
          
          let score = 50;
          if (asteroid.type === 'Large') score = 75;
          else if (asteroid.type === 'SuperLarge') score = 100;
          addScore(score);
          
          addEffect({
            id: `asteroid-explosion-${Date.now()}-${asteroid.id}`,
            type: 'explosion',
            position: { ...asteroid.position },
            startTime: Date.now(),
          });
        } else {
          addEffect({
            id: `asteroid-hit-${Date.now()}-${asteroid.id}`,
            type: 'hit',
            position: { ...asteroid.position },
            startTime: Date.now(),
          });
        }
        
        // Remove non-BFG missiles
        if (missile.weaponType !== 'bfg') {
          const updatedMissiles = missiles.filter(m => m.id !== missile.id);
          updateMissiles(updatedMissiles);
        }
      }
    });
  };
  
  useFrame((state, delta) => {
    const now = Date.now();
    const timeMultiplier = playerPowerUps.slowTime ? 0.5 : 1.0;
    
    // Update physics in worker (30fps)
    if (physicsWorkerRef.current && now - lastUpdateRef.current.physics > 33) {
      physicsWorkerRef.current.postMessage({
        type: 'updatePhysics',
        data: {
          missiles: missiles.map(m => ({
            ...m,
            position: { ...m.position },
            velocity: { ...m.velocity }
          })),
          aliens: aliens.map(a => ({
            id: a.id,
            position: { ...a.position }
          })),
          deltaTime: delta,
          timeMultiplier,
          gameMode,
          timestamp: now
        }
      });
      lastUpdateRef.current.physics = now;
    }
    
    // Update collision detection in worker (30fps)
    if (collisionWorkerRef.current && now - lastUpdateRef.current.collision > 33) {
      // Send entity updates
      collisionWorkerRef.current.postMessage({
        type: 'updateEntities',
        data: {
          aliens: aliens.map(a => ({
            id: a.id,
            position: { ...a.position },
            size: a.size,
            isInvulnerable: a.isInvulnerable
          })),
          asteroids: asteroids.filter(a => !a.isDoodad).map(a => ({
            id: a.id,
            position: { ...a.position },
            size: a.size
          }))
        }
      });
      
      // Request collision checks
      collisionWorkerRef.current.postMessage({
        type: 'checkCollisions',
        data: {
          missiles: missiles.map(m => ({
            id: m.id,
            type: m.type,
            position: { ...m.position },
            size: m.size,
            weaponType: m.weaponType
          })),
          aliens: aliens.map(a => ({
            id: a.id,
            position: { ...a.position },
            size: a.size,
            isInvulnerable: a.isInvulnerable
          })),
          asteroids: asteroids.filter(a => !a.isDoodad).map(a => ({
            id: a.id,
            position: { ...a.position },
            size: a.size
          })),
          playerPosition: useGameStore.getState().playerPosition,
          timestamp: now
        }
      });
      
      lastUpdateRef.current.collision = now;
    }
    
    // Process pending physics updates
    pendingPhysicsRef.current.forEach((results, timestamp) => {
      if (now - timestamp < 100) { // 100ms tolerance
        // Apply physics updates
        updateMissiles(results.missiles);
        
        // Handle bomb explosions
        const bombsToExplode = results.missiles.filter(m => m.shouldExplode);
        bombsToExplode.forEach(bomb => {
          addEffect({
            id: `bomb-explosion-${Date.now()}-${bomb.id}`,
            type: 'explosion',
            position: { ...bomb.position },
            startTime: Date.now(),
            size: bomb.explosionRadius * 3,
          });
          
          // Send explosion to collision worker
          if (collisionWorkerRef.current) {
            collisionWorkerRef.current.postMessage({
              type: 'checkExplosions',
              data: {
                explosions: [{
                  id: bomb.id,
                  position: bomb.position,
                  radius: bomb.explosionRadius
                }],
                aliens: aliens.map(a => ({
                  id: a.id,
                  position: { ...a.position }
                })),
                timestamp: now
              }
            });
          }
        });
        
        // Log performance stats if needed
        if (process.env.NODE_ENV === 'development' && results.cullStats.homingUpdates > 15) {
          console.log('[PHYSICS WORKER] Processed:', results.cullStats);
        }
      }
      pendingPhysicsRef.current.delete(timestamp);
    });
    
    // Process pending collision results  
    pendingCollisionsRef.current.forEach((collisions, timestamp) => {
      if (now - timestamp < 100) { // 100ms tolerance
        processCollisionResults(collisions);
        
        // Log performance if needed
        if (process.env.NODE_ENV === 'development' && collisions.processTime > 5) {
          console.log('[COLLISION WORKER] Process time:', collisions.processTime.toFixed(2) + 'ms');
        }
      }
      pendingCollisionsRef.current.delete(timestamp);
    });
    
    // Process pending missile creations
    pendingCreationsRef.current.forEach((results, timestamp) => {
      if (now - timestamp < 100) { // 100ms tolerance
        // Add created missiles to the game
        results.missiles.forEach(missile => {
          addMissile(missile);
        });
        
        // Log performance if needed
        if (process.env.NODE_ENV === 'development' && results.processingTime > 2) {
          console.log('[CREATION WORKER] Process time:', results.processingTime.toFixed(2) + 'ms');
        }
      }
      pendingCreationsRef.current.delete(timestamp);
    });
  });
  
  // Create a stable reference to the async creation function
  const createMissilesAsyncRef = useRef(null);
  
  // Initialize the function once
  useEffect(() => {
    if (!createMissilesAsyncRef.current) {
      createMissilesAsyncRef.current = (weaponType, playerPosition, playerRotation, playerPowerUps, weapons, options = {}) => {
        if (!creationWorkerRef.current) {
          // Fallback to immediate creation
          console.warn('[PERFORMANCE MANAGER] Creation worker not ready, falling back to immediate creation');
          return null;
        }
        
        const timestamp = Date.now();
        const creationData = {
          weaponType,
          playerPosition: { ...playerPosition },
          playerRotation: { ...playerRotation },
          playerPowerUps: { ...playerPowerUps },
          weapons: { ...weapons },
          chargeLevel: useGameStore.getState().chargeWeapon.chargeLevel,
          timestamp,
          isMultishot: options.isMultishot || false,
          cursorAiming: options.cursorAiming,
          cursorWorld: options.cursorWorld
        };
        
        creationWorkerRef.current.postMessage({
          type: 'createMissiles',
          data: creationData
        });
        
        return timestamp;
      };
      
      // Store function on game store for access from other components - only once
      useGameStore.setState({ createMissilesAsync: createMissilesAsyncRef.current });
    }
  }, []);
  
  return null;
}

export default PerformanceManager;
