import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePerformanceMonitor, useRenderProfiler } from '../hooks/usePerformanceMonitor';
import { useWorkerManager } from '../hooks/useWorkerManager';
import { useQueueProcessor } from '../hooks/useQueueProcessor';
import { useChargeWeapon } from '../hooks/useChargeWeapon';
import { useWeaponSystem } from '../hooks/useWeaponSystem';
// import { useCleanupWorker } from '../hooks/useCleanupWorker'; // Disabled - unified physics worker handles missile culling
import { useEntityPool } from '../hooks/useEntityPool';
import { processPlayerMovement } from '../utils/playerMovement';
import Player from './Player';
import AlienWave from './AlienWave';
import OptimizedMissiles from './OptimizedMissiles';
import PowerUps from './PowerUps';
import Effects from './Effects';
import Background from './Background';
import Asteroids from './Asteroids';
import ParticleDust from './ParticleDust';
import Ground from './Ground';
import GamespaceBoundary from './GamespaceBoundary';
import EngineTrails from './EngineTrails';
import ImpactEffects from './ImpactEffects';
import Wingmen from './Wingman';
import TargetingCursor from './TargetingCursor';
import FreeFlightCrosshair from './FreeFlightCrosshair';
import VirtualJoystick from './VirtualJoystick';
import ChargeBall from './ChargeBall';
import PredictiveCrosshairs from './PredictiveCrosshairs';
import AdvancedTargeting from './AdvancedTargeting';
import OffScreenTargetIndicator from './OffScreenTargetIndicator';
import AlienAIManager from './AlienAIManager';
import PerformanceManager from './PerformanceManager';
import PoolTestComponent from './PoolTestComponent';
import AsyncAssetLoader from './AsyncAssetLoader';
import LoadingScreen from './LoadingScreen';
import { useGameStore } from '../store/gameStore';
import { useKeyboard } from '../hooks/useKeyboard';
import { useGameSounds } from '../hooks/useGameSounds';
// Removed unused GameSpace imports - using UnifiedGamespace instead
import { GAMESPACE_MASTER_CONFIG } from '../config/UnifiedGamespace';
import weaponMeshPool from '../systems/WeaponMeshPool2';
import soaMissileBuffer from '../systems/SOAMissileBuffer';
// BVH collision system replaced by Web Workers


function Game() {
  
  
  // Note: High render count is normal for games with animations
  // The real issue was game freezing, not just re-rendering
  
  // Initialize game sounds
  useGameSounds();
  
  const gameState = useGameStore((state) => state.gameState);
  const gameMode = useGameStore((state) => state.gameMode);
  const isPaused = useGameStore((state) => state.isPaused);
  const level = useGameStore((state) => state.level);
  const difficulty = useGameStore((state) => state.difficulty);
  // TEMPORARILY REMOVED store subscriptions to avoid misleading debug info
  // const aliens = useGameStore((state) => state.aliens);
  // const missiles = useGameStore((state) => state.missiles);
  // const asteroids = useGameStore((state) => state.asteroids);
  
  // Removed playerPosition and playerVelocity subscriptions to prevent infinite re-renders
  // Use useGameStore.getState().playerPosition when needed instead
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  
  
  const movePlayer = useGameStore((state) => state.movePlayer);
  const updatePlayerVelocity = useGameStore((state) => state.updatePlayerVelocity);
  const updateMissiles = useGameStore((state) => state.updateMissiles);
  const loseLife = useGameStore((state) => state.loseLife);
  const addEffect = useGameStore((state) => state.addEffect);
  const damageShield = useGameStore((state) => state.damageShield);
  const damageArmor = useGameStore((state) => state.damageArmor);
  const weapons = useGameStore((state) => state.weapons);
  const switchWeapon = useGameStore((state) => state.switchWeapon);
  const setLevel = useGameStore((state) => state.setLevel);
  const gameStartTime = useGameStore((state) => state.gameStartTime);
  const chargeWeapon = useGameStore((state) => state.chargeWeapon);
  const startCharging = useGameStore((state) => state.startCharging);
  const stopCharging = useGameStore((state) => state.stopCharging);
  const updateChargeLevel = useGameStore((state) => state.updateChargeLevel);
  const grantAllWeapons = useGameStore((state) => state.grantAllWeapons);
  const cursorAiming = useGameStore((state) => state.cursorAiming);
  const isShiftBoosting = useGameStore((state) => state.isShiftBoosting);
  const shiftBoostCooldown = useGameStore((state) => state.shiftBoostCooldown);
  const setShiftBoosting = useGameStore((state) => state.setShiftBoosting);
  const setShiftBoostCooldown = useGameStore((state) => state.setShiftBoostCooldown);
  const toggleZoom = useGameStore((state) => state.toggleZoom);
  
  const keys = useKeyboard();
  const { pointer, camera } = useThree();

  // Performance monitoring
  usePerformanceMonitor();
  const { profileStart, profileEnd } = useRenderProfiler('Game.js');
  
  // Queue systems to decouple operations from Zustand updates
  const missileQueueRef = useRef([]);
  const effectsQueueRef = useRef([]);
  const weaponStateQueueRef = useRef([]);
  const damageQueueRef = useRef([]);
  const chargeQueueRef = useRef([]);
  
  // Initialize worker management
  const { unifiedWorkerRef, workerInitialized, workerBusy } = useWorkerManager({
    updateMissiles,
    damageArmor,
    damageShield,
    loseLife,
    effectsQueueRef,
    damageQueueRef
  });
  
  // Initialize queue processing
  const { processAllQueues } = useQueueProcessor({
    missileQueueRef,
    effectsQueueRef,
    weaponStateQueueRef,
    damageQueueRef,
    chargeQueueRef,
    updateMissiles,
    addEffect,
    damageArmor,
    damageShield,
    loseLife,
    updateChargeLevel
  });
  
  // Cleanup worker disabled - unified physics worker now handles efficient missile culling
  // const { updateCleanupWorker, getCleanupStats, triggerManualCleanup } = useCleanupWorker();
  
  // Initialize entity pool for high-performance entity management
  const { getPoolStats: getEntityPoolStats, migrateExistingEntities } = useEntityPool();
  
  // Update entity pool stats for debug UI (cleanup worker disabled)
  useEffect(() => {
    const statsInterval = setInterval(() => {
      // Update entity pool stats
      const entityPoolStats = getEntityPoolStats();
      if (entityPoolStats) {
        const updatePerformance = useGameStore.getState().updatePerformance;
        if (updatePerformance) {
          updatePerformance({
            entityPoolStats: entityPoolStats
          });
        }
      }
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(statsInterval);
  }, [getEntityPoolStats]);
  
  // Helper function to get cursor world position (clamped to bounds)
  const getCursorWorldPosition = () => {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 50);
    const cursorWorld = new THREE.Vector3();
    const intersection = raycaster.ray.intersectPlane(targetPlane, cursorWorld);
    
    // Handle case where ray doesn't intersect plane
    if (!intersection) {
      console.warn('[CURSOR] Ray does not intersect plane, using fallback');
      return new THREE.Vector3(0, 0, -10); // Fallback position
    }
    
    // Check if free flight mode is active
    const freeLookMode = useGameStore.getState().freeLookMode;
    
    if (freeLookMode) {
      // No clamping in free flight mode - allow full mouse range for 6DOF control
      return cursorWorld;
    } else {
      // Clamp cursor position to stay within gamespace bounds in normal mode
      const gamespaceCenter = GAMESPACE_MASTER_CONFIG.center;
      const gamespaceWidth = GAMESPACE_MASTER_CONFIG.bounds.width; // 36
      const gamespaceHeight = GAMESPACE_MASTER_CONFIG.bounds.height; // 20
      
      const clampedCursorWorld = new THREE.Vector3(
        Math.max(gamespaceCenter.x - gamespaceWidth/2, Math.min(gamespaceCenter.x + gamespaceWidth/2, cursorWorld.x)),
        Math.max(gamespaceCenter.y - gamespaceHeight/2, Math.min(gamespaceCenter.y + gamespaceHeight/2, cursorWorld.y)),
        cursorWorld.z
      );
      
      return clampedCursorWorld;
    }
  };
  
  const difficultyMultiplier = {
    easy: 0.75,
    normal: 1.0,
    hard: 1.5,
  }[difficulty];
  
  // Calculate time multiplier including brake/boost effects (sync with AlienWave.js)
  let timeMultiplier = playerPowerUps.slowTime ? 0.5 : 1.0;
  
  // Get brake/boost states from store  
  const isBraking = useGameStore.getState().isBraking;
  const isBoosting = useGameStore.getState().isBoosting;
  
  // Apply brake/boost effects to match alien behavior (reduced impact)
  if (isBraking) {
    timeMultiplier *= 0.3; // Reduced from 0.1 to prevent pausing
  } else if (isBoosting) {
    timeMultiplier *= 1.5; // Reduced from 2.0 for balance
  }
  
  // Initialize charge weapon system
  useChargeWeapon({
    keys,
    gameState,
    isPaused,
    gameMode,
    isShiftBoosting,
    shiftBoostCooldown,
    missileQueueRef,
    chargeQueueRef,
    getCursorWorldPosition
  });
  
  // Initialize weapon system
  useWeaponSystem({
    keys,
    gameState,
    isPaused,
    gameMode,
    isShiftBoosting,
    shiftBoostCooldown,
    missileQueueRef,
    weaponStateQueueRef,
    getCursorWorldPosition
  });
  
  // Player movement will be handled directly in useFrame
  
  // Shift boost tracking (free flight mode only)
  useEffect(() => {
    if (gameMode === 'freeflight') {
      if (keys.ShiftLeft || keys.ShiftRight) {
        // Start shift boost
        if (!isShiftBoosting) {
          setShiftBoosting(true);
        }
      } else {
        // Stop shift boost and start cooldown
        if (isShiftBoosting) {
          setShiftBoosting(false);
          setShiftBoostCooldown(Date.now()); // Start 0.25s shooting cooldown
        }
      }
    } else if (isShiftBoosting) {
      // Clear boost if not in free flight mode
      setShiftBoosting(false);
    }
  }, [keys.ShiftLeft, keys.ShiftRight, gameMode, isShiftBoosting, setShiftBoosting, setShiftBoostCooldown]);

  // Functions extracted to hooks

  // Weapon firing handled by useWeaponSystem hook
  
  // Weapon switching handled by useWeaponSystem hook
  
  // Cursor aiming toggle
  const toggleCursorAiming = useGameStore((state) => state.toggleCursorAiming);
  useEffect(() => {
    if (keys.KeyC) {
      toggleCursorAiming();
    }
  }, [keys.KeyC, toggleCursorAiming]);

  // Cursor control toggle (F key) - no longer changes game mode
  const toggleCursorControl = useGameStore((state) => state.toggleCursorControl);
  useEffect(() => {
    if (keys.KeyF) {
      toggleCursorControl();
    }
  }, [keys.KeyF, toggleCursorControl]);

  // Zoom toggle (free flight mode only) - RE-ENABLED
  const [zKeyPressed, setZKeyPressed] = useState(false);
  useEffect(() => {
    if (keys.KeyZ && gameMode === 'freeflight' && !zKeyPressed) {
      setZKeyPressed(true);
      toggleZoom();
    } else if (!keys.KeyZ && zKeyPressed) {
      setZKeyPressed(false);
    }
  }, [keys.KeyZ, gameMode, zKeyPressed, toggleZoom]);

  // Debug: Grant all weapons (G key)
  useEffect(() => {
    if (keys.KeyG) {
      grantAllWeapons();
    }
  }, [keys.KeyG, grantAllWeapons]);
  
  // Brake and boost controls - TEMPORARILY DISABLED
  /*useEffect(() => {
    setBraking(keys.KeyB);
  }, [keys.KeyB, setBraking]);
  
  useEffect(() => {
    setBoosting(keys.KeyQ);
  }, [keys.KeyQ, setBoosting]);*/
  
  // Re-enabled useFrame for player movement and game logic
  useFrame((state, delta) => {
    if (gameState !== 'playing' || isPaused) return;
    
    // Process all queues using the extracted hook
    processAllQueues();
    
    // Process player movement directly
    processPlayerMovement({
      keys,
      gameMode,
      isShiftBoosting,
      damageQueueRef,
      delta,
      timeMultiplier
    });
    
    // Player movement handled by usePlayerMovement hook
    
    // Check worker state
    const currentMissiles = useGameStore.getState().missiles;
    
    // Debug disabled to reduce console spam
    
    // Send missile data to SOA worker with transferable buffer
    if (unifiedWorkerRef.current && workerInitialized.current && !workerBusy.current) {
      const storeMissiles = currentMissiles;
      const poolMissiles = weaponMeshPool.getActiveMissileUpdates();
      
      // Cleanup worker disabled - unified physics worker handles missile culling
      // updateCleanupWorker(storeMissiles, poolMissiles);
      
      // Always send if worker is initialized, even with no missiles
      const currentPlayerPosition = useGameStore.getState().playerPosition;
      const currentAliens = useGameStore.getState().aliens;
      const currentAsteroids = useGameStore.getState().asteroids;
      
      // Try to process missiles with worker
      try {
        // Add missiles to SOA buffer (optimized allocation)
        soaMissileBuffer.clear(); // Start fresh each frame
        
        // Add store missiles to SOA buffer
        storeMissiles.forEach(missile => {
          try {
            soaMissileBuffer.allocate(missile);
          } catch (error) {
            console.error('[SOA BUFFER] Failed to allocate store missile:', error, missile);
          }
        });
        
        // Add pool missiles to SOA buffer  
        poolMissiles.forEach(missile => {
          try {
            soaMissileBuffer.allocate(missile);
          } catch (error) {
            console.error('[SOA BUFFER] Failed to allocate pool missile:', error, missile);
          }
        });
        
        // Get transferable buffer for worker
        let transferBuffer;
        let rawArrays;
        try {
          // Get raw arrays BEFORE transferring buffer (order matters!)
          rawArrays = soaMissileBuffer.getRawArrays();
          transferBuffer = soaMissileBuffer.getTransferBuffer();
        } catch (bufferError) {
          console.error('[GAME] Failed to get buffer:', bufferError.message);
          return; // Skip this frame
        }
        
        
        // Send to SOA worker with transferable buffer
        unifiedWorkerRef.current.postMessage({
          type: 'updateBuffer',
          data: {
            buffer: transferBuffer
          }
        }, [transferBuffer]);
        
        // Then send frame processing request
        workerBusy.current = true; // Mark worker as busy
        unifiedWorkerRef.current.postMessage({
          type: 'processFrame',
          data: {
            missileCount: rawArrays.count,
            aliens: currentAliens,
            asteroids: currentAsteroids,
            playerPosition: currentPlayerPosition,
            deltaTime: delta,
            timeMultiplier: timeMultiplier,
            gameMode: gameMode,
            timestamp: Date.now(),
            hashedToOriginalId: rawArrays.hashedToOriginalId
          }
        });
        
      } catch (error) {
        if (error.message && error.message.includes('detached ArrayBuffer')) {
          // Buffer is transferred to worker, skip this frame - this is normal
        } else {
          console.error('[SOA BUFFER] Failed to process frame:', error);
        }
      }
    }
    
    // Performance tracking simplified - workers handle the heavy lifting
    
    // Time-based level progression (every 30 seconds)
    if (gameStartTime && gameState === 'playing') {
      const gameTime = (Date.now() - gameStartTime) / 1000; // Convert to seconds
      const newLevel = Math.floor(gameTime / 30) + 1; // Level up every 30 seconds
      if (newLevel !== level && newLevel <= 4) { // Cap at level 4
        setLevel(newLevel);
        console.log(`Level increased to ${newLevel}!`);
      }
    }
  });

  // Staggered cleanup system for free flight mode - TEMPORARILY DISABLED
  /*useEffect(() => {
    if (gameMode !== 'freeflight' || gameState !== 'playing') return;

    // Missile cleanup every 30 seconds
    const missileCleanupInterval = setInterval(() => {
      const currentMissiles = useGameStore.getState().missiles;
      const cleanedMissiles = currentMissiles.filter(missile => {
        // Calculate distance from gamespace center, not origin
        const gamespaceCenter = GAMESPACE_MASTER_CONFIG.center;
        const dx = missile.position.x - gamespaceCenter.x;
        const dy = missile.position.y - gamespaceCenter.y;
        const dz = missile.position.z - gamespaceCenter.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return distance <= 5000; // Remove missiles >5000 units away from gamespace center
      });
      
      if (cleanedMissiles.length !== currentMissiles.length) {
        console.log(`🧹 Missile cleanup: Removed ${currentMissiles.length - cleanedMissiles.length} distant missiles`);
        useGameStore.getState().updateMissiles(cleanedMissiles);
      }
    }, 30000); // Every 30 seconds

    // Enemy ship cleanup 10 seconds after missiles, then every 30 seconds
    const enemyCleanupInterval = setInterval(() => {
      const currentAliens = useGameStore.getState().aliens;
      const cleanedAliens = currentAliens.filter(alien => {
        const distance = Math.sqrt(
          alien.position.x * alien.position.x + 
          alien.position.y * alien.position.y + 
          alien.position.z * alien.position.z
        );
        return distance <= 7500; // Remove aliens >7500 units away
      });
      
      if (cleanedAliens.length !== currentAliens.length) {
        console.log(`🧹 Enemy cleanup: Removed ${currentAliens.length - cleanedAliens.length} distant enemies`);
        useGameStore.getState().updateAliens(cleanedAliens);
      }
    }, 30000); // Every 30 seconds

    // Asteroid cleanup 20 seconds after missiles, then every 30 seconds  
    const asteroidCleanupInterval = setInterval(() => {
      const currentAsteroids = useGameStore.getState().asteroids;
      const cleanedAsteroids = currentAsteroids.filter(asteroid => {
        const distance = Math.sqrt(
          asteroid.position.x * asteroid.position.x + 
          asteroid.position.y * asteroid.position.y + 
          asteroid.position.z * asteroid.position.z
        );
        return distance <= 6000; // Remove asteroids >6000 units away
      });
      
      if (cleanedAsteroids.length !== currentAsteroids.length) {
        console.log(`🧹 Asteroid cleanup: Removed ${currentAsteroids.length - cleanedAsteroids.length} distant asteroids`);
        useGameStore.getState().updateAsteroids(cleanedAsteroids);
      }
    }, 30000); // Every 30 seconds

    // Start enemy cleanup 10 seconds after component mount, then every 30 seconds
    const enemyCleanupTimeout = setTimeout(() => {
      // Run enemy cleanup immediately, then start interval
      const currentAliens = useGameStore.getState().aliens;
      const cleanedAliens = currentAliens.filter(alien => {
        const distance = Math.sqrt(
          alien.position.x * alien.position.x + 
          alien.position.y * alien.position.y + 
          alien.position.z * alien.position.z
        );
        return distance <= 7500;
      });
      
      if (cleanedAliens.length !== currentAliens.length) {
        console.log(`🧹 Enemy cleanup (initial): Removed ${currentAliens.length - cleanedAliens.length} distant enemies`);
        useGameStore.getState().updateAliens(cleanedAliens);
      }
    }, 10000);

    // Start asteroid cleanup 20 seconds after component mount, then every 30 seconds
    const asteroidCleanupTimeout = setTimeout(() => {
      // Run asteroid cleanup immediately, then start interval
      const currentAsteroids = useGameStore.getState().asteroids;
      const cleanedAsteroids = currentAsteroids.filter(asteroid => {
        const distance = Math.sqrt(
          asteroid.position.x * asteroid.position.x + 
          asteroid.position.y * asteroid.position.y + 
          asteroid.position.z * asteroid.position.z
        );
        return distance <= 6000;
      });
      
      if (cleanedAsteroids.length !== currentAsteroids.length) {
        console.log(`🧹 Asteroid cleanup (initial): Removed ${currentAsteroids.length - cleanedAsteroids.length} distant asteroids`);
        useGameStore.getState().updateAsteroids(cleanedAsteroids);
      }
    }, 20000);

    return () => {
      clearInterval(missileCleanupInterval);
      clearInterval(enemyCleanupInterval);
      clearInterval(asteroidCleanupInterval);
      clearTimeout(enemyCleanupTimeout);
      clearTimeout(asteroidCleanupTimeout);
    };
  }, [gameMode, gameState]);*/
  
  if (gameState === 'startup' || gameState === 'gameOver' || gameState === 'gameWon' || gameState === 'loading') {
    return null;
  }

  return (
    <>
      <Background />
      <Ground mode="planet" />
      {/* <ParticleDust /> */}
      <GamespaceBoundary />
      <Player />
      {/* TEMPORARILY DISABLED TO DEBUG INFINITE RENDER LOOP */}
      <AlienWave level={level} difficultyMultiplier={difficultyMultiplier} />
      <Asteroids level={level} />
      <OptimizedMissiles />
      <PowerUps />
      <Effects />
      {/* <EngineTrails /> */}
      <ImpactEffects />
      <Wingmen />
      <TargetingCursor />
      <FreeFlightCrosshair />
      <VirtualJoystick />
      <ChargeBall />
      <PredictiveCrosshairs />
      <AdvancedTargeting />
      <OffScreenTargetIndicator />
      <AlienAIManager />
      {/* <AsyncAssetLoader /> */}
      {/* <PoolTestComponent /> */}
      {/* <PerformanceManager /> - CONFIRMED: Causes freezing, needs redesign */}
    </>
  );
}

Game.lastFireTime = 0;

export default Game;