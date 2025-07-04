import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Alien from './Alien';
import { useGameStore } from '../store/gameStore';
import { useEntityPool } from '../hooks/useEntityPool';
import { UnifiedGamespace } from '../config/UnifiedGamespace';

function AlienWave({ level, difficultyMultiplier }) {
  const spawnRef = useRef({ 
    spawnTimer: 0, 
    spawnInterval: 1.064 / 3.0, // seconds between spawns (100% increased spawn rate)
    bossTimer: 0,
    bossInterval: 15, // Boss spawns every 15 seconds (for testing)
    lastLoggedBossTime: -1 // For debug logging
  });
  
  const updateAliens = useGameStore((state) => state.updateAliens);
  const addMissile = useGameStore((state) => state.addMissile);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const gameMode = useGameStore((state) => state.gameMode);
  const gameState = useGameStore((state) => state.gameState);
  
  // Use Entity Pool for alien management
  const { spawnAlien } = useEntityPool();
  
  const spawnAlienWithPool = () => {
    // Level-based alien spawning
    let alienType = 1; // Default to level 1
    const rand = Math.random();
    
    switch (level) {
      case 1:
        alienType = 1; // Only easiest aliens
        break;
      case 2:
        alienType = rand < 0.5 ? 1 : 2; // Mix of level 1 and 2
        break;
      case 3:
        alienType = rand < 0.25 ? 1 : 2; // 75% level 2, 25% level 1
        break;
      case 4:
      default:
        // 15% flying saucer, 15% level 3, 45% level 2, 25% level 1
        if (rand < 0.15) alienType = 5; // Flying saucer
        else if (rand < 0.30) alienType = 3;
        else if (rand < 0.75) alienType = 2;
        else alienType = 1;
        break;
    }
    
    // Choose random spawn animation type
    const spawnTypes = ['from_distance', 'from_sky', 'from_left', 'from_right'];
    const spawnType = spawnTypes[Math.floor(Math.random() * spawnTypes.length)];
    
    let spawnPosition, velocity, targetPosition;
    
    // In free flight mode, spawn relative to player position, not world center
    let finalPosition;
    if (gameMode === 'freeflight') {
      // Spawn aliens relative to player position in free flight mode
      finalPosition = {
        x: playerPosition.x + (Math.random() - 0.5) * 200, // Within 200 units of player
        y: playerPosition.y + (Math.random() - 0.5) * 200,
        z: playerPosition.z - 45 // In front of player
      };
    } else {
      // Campaign mode uses fixed world positions
      finalPosition = UnifiedGamespace.getSafeSpawnPosition(-45, gameMode);
    }
    
    switch (spawnType) {
      case 'from_distance':
        // Spawn far back and fly forward - use full game length
        spawnPosition = { 
          x: finalPosition.x, 
          y: finalPosition.y, 
          z: -480 // Near front boundary at -500
        };
        
        // Calculate velocity direction toward target
        const deltaZ = finalPosition.z - spawnPosition.z; // -45 - (-480) = +435
        const speed = (4 + Math.random() * 3) * 1.5 * 1.1 * 1.25 * 1.1;
        const direction = deltaZ > 0 ? 1 : -1; // Positive if moving toward higher Z
        
        velocity = {
          x: 0,
          y: 0,
          z: speed * direction // Velocity direction based on target position
        };
        targetPosition = finalPosition;
        break;
        
      case 'from_sky':
        // Spawn high above and dive down - stay within gamespace height (20 units)
        spawnPosition = { 
          x: finalPosition.x, 
          y: finalPosition.y + 15, // Within bounds (gamespace height is 20)
          z: finalPosition.z - 50
        };
        velocity = {
          x: 0,
          y: -2.2 * 1.25 * 1.1, // Dive down 10% faster + 25% entrance speed + 10% movement speed
          z: 2.2 * 1.25 * 1.1 // 10% faster + 25% entrance speed + 10% movement speed
        };
        targetPosition = finalPosition;
        break;
        
      case 'from_left':
        // Spawn far left and fly in - stay within gamespace width (36 units)
        spawnPosition = { 
          x: finalPosition.x - 25, // Within bounds (gamespace width is 36)
          y: finalPosition.y, 
          z: finalPosition.z - 30
        };
        velocity = {
          x: 2.2 * 1.25 * 1.1, // Fly right 10% faster + 25% entrance speed + 10% movement speed
          y: 0,
          z: 1.1 * 1.25 * 1.1 // 10% faster + 25% entrance speed + 10% movement speed
        };
        targetPosition = finalPosition;
        break;
        
      case 'from_right':
        // Spawn far right and fly in - stay within gamespace width (36 units)
        spawnPosition = { 
          x: finalPosition.x + 25, // Within bounds (gamespace width is 36)
          y: finalPosition.y, 
          z: finalPosition.z - 30
        };
        velocity = {
          x: -2.2 * 1.25 * 1.1, // Fly left 10% faster + 25% entrance speed + 10% movement speed
          y: 0,
          z: 1.1 * 1.25 * 1.1 // 10% faster + 25% entrance speed + 10% movement speed
        };
        targetPosition = finalPosition;
        break;
        
      default:
        spawnPosition = finalPosition;
        velocity = {
          x: (Math.random() - 0.5) * 0.5 * 1.25 * 1.1,
          y: (Math.random() - 0.5) * 0.3 * 1.25 * 1.1,
          z: (4 + Math.random() * 3) * 1.1 * 1.25 * 1.1 // 10% faster + 25% entrance speed + 10% movement speed
        };
        targetPosition = finalPosition;
    }
    
    // Use Entity Pool to spawn alien with all necessary data
    const spawnData = {
      position: spawnPosition,
      velocity: velocity,
      isAtCombatDistance: false,
      isFlying: true,
      isSpawning: true, // New flag for spawn animation
      isInvulnerable: gameMode !== 'freeflight', // No invulnerability in free flight mode
      spawnType: spawnType,
      targetPosition: targetPosition,
      spawnStartTime: Date.now(),
      // Flying saucer charge weapon properties
      chargeLevel: alienType === 5 ? 0 : undefined,
      maxChargeLevel: alienType === 5 ? 5 : undefined,
      lastChargeTime: alienType === 5 ? 0 : undefined,
      isCharging: alienType === 5 ? false : undefined,
      // AI behavior state for Web Worker
      behaviorState: 'patrol',
    };
    
    const newAlien = spawnAlien(alienType, spawnData);
  };

  const spawnBoss = () => {
    // In free flight mode, spawn boss relative to player position
    let spawnPosition;
    if (gameMode === 'freeflight') {
      spawnPosition = {
        x: playerPosition.x + (Math.random() - 0.5) * 100, // Within 100 units of player
        y: playerPosition.y + (Math.random() - 0.5) * 100,
        z: playerPosition.z - 450 // Far in front of player
      };
    } else {
      // Campaign mode uses fixed world positions
      spawnPosition = UnifiedGamespace.getSafeSpawnPosition(-450, gameMode);
    }
    
    const bossData = {
      position: spawnPosition,
      velocity: {
        x: (Math.random() - 0.5) * 0.3, // Much reduced sideways drift to prevent boundary exit
        y: (Math.random() - 0.5) * 0.2, // Much reduced vertical drift to prevent boundary exit
        z: 2.2 // Slower approach than normal aliens, but 10% faster
      },
      isAtCombatDistance: false,
      isFlying: true,
      isBoss: true,
      lastBfgFire: 0, // Track BFG firing
      bfgCooldown: 15000, // 15 seconds between BFG shots
      behaviorState: 'boss_attack' // AI behavior state for Web Worker
    };
    
    // Spawn boss using entity pool (type 4)
    spawnAlien(4, bossData);
  };

  useFrame((state, delta) => {
    // Don't spawn aliens if game isn't playing
    if (gameState !== 'playing') return;
    
    // Get fresh aliens list each frame
    const currentAliens = useGameStore.getState().aliens || [];
    
    // Boss spawning timer (every 30 seconds for testing)
    spawnRef.current.bossTimer += delta;
    
    // ALGORITHM LIMIT: Check alien count before spawning boss
    if (spawnRef.current.bossTimer >= spawnRef.current.bossInterval && currentAliens.length < 30) {
      spawnBoss();
      spawnRef.current.bossTimer = 0;
    }
    
    // Spawn new aliens over time (like asteroids)
    spawnRef.current.spawnTimer += delta;
    
    // ALGORITHM LIMIT: Cap at 30 aliens for this spawning system
    // This limit only applies to the automatic spawning algorithm, not event-based waves
    const alienSpawnLimit = 30;
    const currentAlienCount = currentAliens.length;
    
    if (spawnRef.current.spawnTimer >= spawnRef.current.spawnInterval && currentAlienCount < alienSpawnLimit) {
      // Reduced regular alien spawning (events handle waves now)
      spawnAlienWithPool();
      spawnRef.current.spawnTimer = 0;
      spawnRef.current.spawnInterval = Math.max(1.6, (4 - level * 0.13) * 0.8) / 3.0; // 100% increased spawn rate
    }
    
    // Get fresh aliens list after potential spawning
    const freshAliens = useGameStore.getState().aliens || [];
    
    // Don't process if no aliens exist
    if (freshAliens.length === 0) {
      return;
    }
    
    // Get brake/boost states from store
    const isBraking = useGameStore.getState().isBraking;
    const isBoosting = useGameStore.getState().isBoosting;
    
    let timeMultiplier = playerPowerUps.slowTime ? 0.5 : 1.0;
    
    // Apply brake/boost effects to enemy movement (inverse effect)
    // Reduced impact so enemy missiles don't pause completely
    if (isBraking) {
      timeMultiplier *= 0.3; // Enemies slow down but not as drastically
    } else if (isBoosting) {
      timeMultiplier *= 1.5; // Enemies speed up but less dramatically
    }
    
    const adjustedDelta = delta * timeMultiplier * difficultyMultiplier;
    const now = Date.now();
    
    const updatedAliens = freshAliens.map((alien) => {
      let newX = alien.position.x + alien.velocity.x * adjustedDelta;
      let newY = alien.position.y + alien.velocity.y * adjustedDelta;
      let newZ = alien.position.z + alien.velocity.z * adjustedDelta;
      
      let updatedAlien = { ...alien };
      
      // Handle spawn animations
      if (alien.isSpawning) {
        const timeSinceSpawn = now - alien.spawnStartTime;
        const spawnDuration = 3000; // 3 seconds spawn animation
        
        if (timeSinceSpawn > spawnDuration) {
          // Spawn animation complete
          updatedAlien.isSpawning = false;
          updatedAlien.isInvulnerable = false; // Spawn animation complete, always vulnerable
          
          // Set movement target based on game mode
          let targetX, targetY, targetZ;
          
          if (gameMode === 'freeflight') {
            // In free flight mode, aliens always head towards the player
            targetX = playerPosition.x;
            targetY = playerPosition.y;
            targetZ = playerPosition.z;
          } else {
            // In campaign mode, use predetermined target position
            targetX = alien.targetPosition.x;
            targetY = alien.targetPosition.y;
            targetZ = alien.targetPosition.z;
          }
          
          const dx = targetX - newX;
          const dy = targetY - newY;
          const dz = targetZ - newZ;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (gameMode === 'freeflight' || distance > 5) {
            // In free flight: always move towards player. In campaign: move to target until close
            const speed = 4.4 * 1.25 * 1.1; // 10% faster + 25% entrance speed + 10% movement speed
            
            // In free flight mode, adjust approach to be more gradual and not too aggressive
            const approachModifier = gameMode === 'freeflight' ? 0.8 : 1.0;
            
            updatedAlien.velocity = {
              x: (dx / distance) * speed * 0.3 * approachModifier,
              y: (dy / distance) * speed * 0.3 * approachModifier,
              z: (dz / distance) * speed * approachModifier
            };
          } else {
            // Reached target in campaign mode, use normal movement
            updatedAlien.velocity = {
              x: (Math.random() - 0.5) * 0.5 * 1.1,
              y: (Math.random() - 0.5) * 0.3 * 1.1,
              z: (4 + Math.random() * 3) * 1.1 * 1.1 // 10% faster + 10% movement speed
            };
          }
        }
        
        // During spawn animation, don't cull for being out of bounds
        updatedAlien.position = { x: newX, y: newY, z: newZ };
        return updatedAlien;
      }
      
      // Normal alien behavior (non-spawning)
      
      // Handle out of bounds aliens - make them return to valid gamezone
      const timeSinceSpawn = now - alien.spawnStartTime;
      const shouldCheckBounds = timeSinceSpawn > 5000; // 5 seconds grace period
      
      if (!alien.isFlying && !alien.isSpawning && shouldCheckBounds) {
        // Use mode-appropriate Z-axis bounds
        const zBounds = gameMode === 'freeflight' ? 
          { front: -10000, back: 10000 } : 
          { front: -500, back: 50 };
        const isOutOfBounds = newZ > zBounds.back || newZ < zBounds.front || !UnifiedGamespace.isWithinBounds(newX, newY, gameMode);
        
        if (isOutOfBounds && !alien.isReturningToBounds) {
          // Mark alien as returning to bounds and set target position
          console.log('Alien out of bounds, redirecting to gamezone:', { x: newX, y: newY, z: newZ });
          
          // Get a safe position within the gamezone near combat zone
          let safePosition;
          if (gameMode === 'freeflight') {
            // In free flight mode, return to position near player
            safePosition = {
              x: playerPosition.x + (Math.random() - 0.5) * 50,
              y: playerPosition.y + (Math.random() - 0.5) * 50,
              z: playerPosition.z - 45
            };
          } else {
            safePosition = UnifiedGamespace.getSafeSpawnPosition(-45, gameMode);
          }
          
          // Calculate direction to safe position
          const dx = safePosition.x - newX;
          const dy = safePosition.y - newY;
          const dz = safePosition.z - newZ;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance > 0) {
            // Set velocity to return to bounds at moderate speed
            const returnSpeed = 8.0; // Fast enough to return quickly
            updatedAlien.velocity = {
              x: (dx / distance) * returnSpeed,
              y: (dy / distance) * returnSpeed,
              z: (dz / distance) * returnSpeed
            };
            updatedAlien.isReturningToBounds = true;
            updatedAlien.returnTarget = safePosition;
          }
        }
        
        // Check if returning alien has reached safe zone
        if (alien.isReturningToBounds) {
          const targetDx = alien.returnTarget.x - newX;
          const targetDy = alien.returnTarget.y - newY;
          const targetDz = alien.returnTarget.z - newZ;
          const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy + targetDz * targetDz);
          
          if (targetDistance < 10 || UnifiedGamespace.isWithinBounds(newX, newY, gameMode)) {
            // Reached safe zone, resume normal behavior
            console.log('Alien returned to gamezone');
            updatedAlien.isReturningToBounds = false;
            updatedAlien.returnTarget = null;
            // Set normal movement velocity
            updatedAlien.velocity = {
              x: (Math.random() - 0.5) * 0.5 * 1.1,
              y: (Math.random() - 0.5) * 0.3 * 1.1,
              z: (4 + Math.random() * 3) * 1.1 * 1.1
            };
          }
        }
      }
      
      // Stop alien when it reaches combat distance (10% closer)
      const combatDistance = -40.5; // 10% closer to player
      if (newZ > combatDistance && !alien.isAtCombatDistance) {
        console.log('Alien reached combat distance:', alien.id);
        return {
          ...updatedAlien,
          position: { x: newX, y: newY, z: combatDistance },
          velocity: { x: 0, y: 0, z: 0 }, // Stop moving
          isAtCombatDistance: true,
          isFlying: false // No longer flying
        };
      }
      
      return {
        ...updatedAlien,
        position: { x: newX, y: newY, z: newZ },
      };
    }).filter(alien => alien !== null);
    
    // Aliens shoot at player when at combat distance or approaching (25% sooner)
    // Skip AI logic if using Web Worker AI (handled by AlienAIManager)
    const useWebWorkerAI = useGameStore.getState().useWebWorkerAI;
    
    if (!useWebWorkerAI) {
      const fireChance = 0.002 * difficultyMultiplier;
      const earlyShootingDistance = -50.625; // 25% sooner than combat distance of -40.5
      
      updatedAliens.forEach((alien) => {
      // Check if player has stealth - if so, aliens can't see them to fire
      const playerHasStealth = useGameStore.getState().playerPowerUps.stealth;
      
      if (!alien.isInvulnerable && !playerHasStealth && (alien.isAtCombatDistance || alien.position.z > earlyShootingDistance)) {
        // Boss BFG firing logic
        if (alien.isBoss && (now - alien.lastBfgFire) >= alien.bfgCooldown) {
          const dx = playerPosition.x - alien.position.x;
          const dy = playerPosition.y - alien.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            console.log('👑 BOSS FIRES BFG!');
            const vx = (dx / distance) * 0.3;
            const vy = (dy / distance) * 0.3;
            
            addMissile({
              id: `boss-bfg-${Date.now()}-${alien.id}`,
              position: { ...alien.position },
              velocity: { x: vx, y: vy, z: 3.0 }, // Much faster BFG projectile
              type: 'alien',
              weaponType: 'bfg',
              size: 8, // Large BFG projectile
              color: '#00ff00'
            });
            
            // Update last fire time
            alien.lastBfgFire = now;
          }
        }
        // Flying saucer charge weapon firing
        else if (!alien.isBoss && alien.type === 5) {
          // Handle charging behavior
          const chargeDuration = 3000; // 3 seconds to charge
          
          if (!alien.isCharging && (now - alien.lastChargeTime) > 2000 + Math.random() * 3000) {
            // Start charging (random delay between 2-5 seconds)
            alien.isCharging = true;
            alien.chargeStartTime = now;
            alien.chargeLevel = 0;
          }
          
          if (alien.isCharging) {
            // Increase charge level over time
            const chargeProgress = (now - alien.chargeStartTime) / chargeDuration;
            alien.chargeLevel = Math.min(5, Math.floor(chargeProgress * 5) + 1);
            
            // Randomly fire at any charge level between 1-5
            if (alien.chargeLevel >= 1 && Math.random() < 0.005 * adjustedDelta * 60) {
              const dx = playerPosition.x - alien.position.x;
              const dy = playerPosition.y - alien.position.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 0) {
                const vx = (dx / distance) * 0.4;
                const vy = (dy / distance) * 0.4;
                
                addMissile({
                  id: `saucer-charge-${Date.now()}-${alien.id}`,
                  position: { ...alien.position },
                  velocity: { x: vx, y: vy, z: 2.0 }, // Faster charge projectile
                  type: 'alien',
                  weaponType: 'charge',
                  chargeLevel: alien.chargeLevel,
                  damage: alien.chargeLevel,
                  size: 0.3 + alien.chargeLevel * 0.2,
                  color: alien.chargeLevel === 1 ? '#ffff00' : 
                         alien.chargeLevel === 2 ? '#ff8800' :
                         alien.chargeLevel === 3 ? '#ff4400' :
                         alien.chargeLevel === 4 ? '#ff0088' : '#ff00ff'
                });
                
                // Reset charging
                alien.isCharging = false;
                alien.chargeLevel = 0;
                alien.lastChargeTime = now;
              }
            }
          }
        }
        // Regular alien firing
        else if (!alien.isBoss && alien.type !== 5 && Math.random() < fireChance * adjustedDelta * 60) {
          const dx = playerPosition.x - alien.position.x;
          const dy = playerPosition.y - alien.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const vx = (dx / distance) * 0.2;
            const vy = (dy / distance) * 0.2;
            
            addMissile({
              id: `alien-missile-${Date.now()}-${alien.id}`,
              position: { ...alien.position },
              velocity: { x: vx, y: vy, z: 2.5 }, // Increased velocity - move faster toward player
              type: 'alien',
            });
          }
        }
      }
      });
    } // End of traditional AI logic
    
    updateAliens(updatedAliens);
  });
  
  const aliens = useGameStore((state) => state.aliens);
  const highlightedAlienId = useGameStore((state) => state.highlightedAlienId);
  
  return (
    <>
      {aliens.map((alien, index) => (
        <Alien 
          key={alien.id} 
          alien={alien} 
          isHighlighted={alien.id === highlightedAlienId}
        />
      ))}
    </>
  );
}

export default AlienWave;