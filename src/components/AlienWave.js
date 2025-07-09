import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Alien from './Alien';
import { useGameStore } from '../store/gameStore';
import { useEntityPool } from '../hooks/useEntityPool';
import { UnifiedGamespace } from '../config/UnifiedGamespace';
import { EnemyShip } from '../entities/EnemyShip';

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
        const speed = 6 + Math.random() * 2; // Normal speed without stacked multipliers
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
          y: -3, // Normal dive speed
          z: 3 // Normal forward speed
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
          x: 3, // Normal lateral speed
          y: 0,
          z: 1.5 // Normal forward speed
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
          x: -3, // Normal lateral speed
          y: 0,
          z: 1.5 // Normal forward speed
        };
        targetPosition = finalPosition;
        break;
        
      default:
        spawnPosition = finalPosition;
        velocity = {
          x: (Math.random() - 0.5) * 0.7,
          y: (Math.random() - 0.5) * 0.4,
          z: 5 + Math.random() * 2 // Normal forward speed
        };
        targetPosition = finalPosition;
    }
    
    // Create enemy ship instance
    const alienId = `alien-${alienType}-${Date.now()}-${Math.random()}`;
    const enemyShip = new EnemyShip(alienId, alienType, spawnPosition, velocity);
    
    // Configure initial state
    enemyShip.isSpawning = true;
    enemyShip.spawnStartTime = Date.now();
    enemyShip.isInvulnerable = gameMode !== 'freeflight';
    
    // Set initial mode based on spawn
    if (alienType === 4) {
      enemyShip.setMode('combat', { combatRange: 60, evasionDistance: 30 });
    } else {
      enemyShip.setMode('tasked', {
        destination: targetPosition,
        arrivalDistance: 10,
        onArrival: 'combat'
      });
    }
    
    // Use Entity Pool to spawn alien with enemy ship data
    const spawnData = {
      position: spawnPosition,
      velocity: velocity,
      isAtCombatDistance: false,
      isFlying: true,
      isSpawning: true,
      isInvulnerable: enemyShip.isInvulnerable,
      spawnType: spawnType,
      targetPosition: targetPosition,
      spawnStartTime: enemyShip.spawnStartTime,
      enemyShip: enemyShip,
      behaviorState: 'enemyShip',
      // Add properties for compatibility
      type: alienType,
      health: enemyShip.health,
      rotation: enemyShip.rotation
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
    
    // Create boss enemy ship
    const bossId = `boss-${Date.now()}`;
    const bossVelocity = {
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.2,
      z: 2.5
    };
    const bossShip = new EnemyShip(bossId, 4, spawnPosition, bossVelocity);
    
    // Configure boss with enhanced weapon
    bossShip.weapon.fireRate = 5000; // 5 seconds between BFG shots
    bossShip.weapon.type = 'bfg';
    bossShip.weapon.velocity = 40; // Slower BFG projectiles
    bossShip.weapon.damage = 5;
    bossShip.weapon.color = '#00ff00';
    
    // Set boss to combat mode
    bossShip.setMode('combat', {
      combatRange: 80,
      evasionDistance: 40,
      strafeAmplitude: 10,
      strafeFrequency: 0.3
    });
    
    const bossData = {
      position: spawnPosition,
      velocity: bossVelocity,
      isAtCombatDistance: false,
      isFlying: true,
      isBoss: true,
      enemyShip: bossShip,
      behaviorState: 'enemyShip',
      // Add properties for compatibility
      type: 4,
      health: bossShip.health,
      lastBfgFire: 0,
      bfgCooldown: 5000
    };
    
    // Spawn boss using entity pool (type 4)
    spawnAlien(4, bossData);
  };

  // Debug alien spawning removed - no longer needed for production

  useFrame((state, delta) => {
    // Don't spawn aliens if game isn't playing
    if (gameState !== 'playing') return;
    
    // Get fresh aliens list each frame
    const currentAliens = useGameStore.getState().aliens || [];
    
    // Boss spawning timer (every 30 seconds for testing)
    spawnRef.current.bossTimer += delta;
    
    // ALGORITHM LIMIT: Check alien count before spawning high-tier alien (was boss)
    if (spawnRef.current.bossTimer >= spawnRef.current.bossInterval && currentAliens.length < 20) {
      // Spawn a high-tier alien instead of boss
      spawnAlienWithPool(); // This will spawn a regular alien based on level
      spawnRef.current.bossTimer = 0;
    }
    
    // Spawn new aliens over time (like asteroids)
    spawnRef.current.spawnTimer += delta;
    
    // ALGORITHM LIMIT: Cap at 20 aliens for this spawning system
    // This limit only applies to the automatic spawning algorithm, not event-based waves
    const alienSpawnLimit = 20;
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
      
      // Handle enemy ship AI
      if (alien.enemyShip) {
        // Update enemy ship AI
        alien.enemyShip.update(adjustedDelta, playerPosition, now);
        
        // Sync position and velocity
        updatedAlien.position = { ...alien.enemyShip.position };
        updatedAlien.velocity = { ...alien.enemyShip.velocity };
        updatedAlien.rotation = { ...alien.enemyShip.rotation };
        
        // Check if enemy can fire
        const missile = alien.enemyShip.fire(playerPosition, now);
        if (missile) {
          addMissile(missile);
        }
        
        return updatedAlien;
      }
      
      // Handle spawn animations
      if (alien.isSpawning) {
        const timeSinceSpawn = now - alien.spawnStartTime;
        const spawnDuration = 3000; // 3 seconds spawn animation
        
        if (timeSinceSpawn > spawnDuration) {
          // Spawn animation complete
          updatedAlien.isSpawning = false;
          updatedAlien.isInvulnerable = false;
          
          // Update enemy ship state if available
          if (alien.enemyShip) {
            alien.enemyShip.isSpawning = false;
            alien.enemyShip.isInvulnerable = false;
            
            // Update enemy ship mode based on game mode
            if (gameMode === 'freeflight') {
              alien.enemyShip.setMode('combat', {
                combatRange: 50,
                evasionDistance: 20
              });
            } else if (alien.enemyShip.mode === 'tasked') {
              // Let tasked mode continue to its destination
            }
          }
        }
        
        // During spawn animation, don't cull for being out of bounds
        updatedAlien.position = { x: newX, y: newY, z: newZ };
        return updatedAlien;
      }
      
      // Normal alien behavior (non-spawning)
      
      // Handle out of bounds aliens with enemy ship AI
      if (!alien.isSpawning && alien.enemyShip) {
        const zBounds = gameMode === 'freeflight' ? 
          { front: -10000, back: 10000 } : 
          { front: -500, back: 50 };
        const isOutOfBounds = newZ > zBounds.back || newZ < zBounds.front || !UnifiedGamespace.isWithinBounds(newX, newY, gameMode);
        
        if (isOutOfBounds) {
          // Use enemy ship tasked mode to return to bounds
          let safePosition;
          if (gameMode === 'freeflight') {
            safePosition = {
              x: playerPosition.x + (Math.random() - 0.5) * 50,
              y: playerPosition.y + (Math.random() - 0.5) * 50,
              z: playerPosition.z - 45
            };
          } else {
            safePosition = UnifiedGamespace.getSafeSpawnPosition(-45, gameMode);
          }
          
          // Set enemy ship to return to safe position
          alien.enemyShip.setMode('tasked', {
            destination: safePosition,
            arrivalDistance: 10,
            onArrival: 'combat'
          });
        }
      }
      
      // Legacy combat distance check for non-enemy ship aliens
      if (!alien.enemyShip) {
        const combatDistance = -40.5;
        if (newZ > combatDistance && !alien.isAtCombatDistance) {
          console.log('Alien reached combat distance:', alien.id);
          return {
            ...updatedAlien,
            position: { x: newX, y: newY, z: combatDistance },
            velocity: { x: 0, y: 0, z: 0 },
            isAtCombatDistance: true,
            isFlying: false
          };
        }
      }
      
      return {
        ...updatedAlien,
        position: { x: newX, y: newY, z: newZ },
      };
    }).filter(alien => alien !== null);
    
    // Legacy AI firing for aliens without enemy ship AI
    const useWebWorkerAI = useGameStore.getState().useWebWorkerAI;
    
    if (!useWebWorkerAI) {
      const fireChance = 0.002 * difficultyMultiplier;
      const earlyShootingDistance = -50.625;
      const playerHasStealth = useGameStore.getState().playerPowerUps.stealth;
      
      updatedAliens.forEach((alien) => {
        // Skip aliens with enemy ship AI (they handle their own firing)
        if (alien.enemyShip) return;
        
        // Legacy firing logic for old aliens
        if (!alien.isInvulnerable && !playerHasStealth && (alien.isAtCombatDistance || alien.position.z > earlyShootingDistance)) {
          if (Math.random() < fireChance * adjustedDelta * 60) {
            const dx = playerPosition.x - alien.position.x;
            const dy = playerPosition.y - alien.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              const vx = (dx / distance) * 0.2;
              const vy = (dy / distance) * 0.2;
              
              addMissile({
                id: `alien-missile-${Date.now()}-${alien.id}`,
                position: { ...alien.position },
                velocity: { x: vx, y: vy, z: 2.5 },
                type: 'alien',
              });
            }
          }
        }
      });
    }
    
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