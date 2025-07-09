import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';

function AlienAIManager() {
  const workerRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const pendingUpdatesRef = useRef(new Map());
  
  const aliens = useGameStore((state) => state.aliens);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const difficulty = useGameStore((state) => state.difficulty);
  const addMissile = useGameStore((state) => state.addMissile);
  const updateAliens = useGameStore((state) => state.updateAliens);

  // Initialize Web Worker
  useEffect(() => {
    // Create worker inline for React compatibility
    try {
      const workerCode = `
        // Web Worker for Alien AI Logic
        self.onmessage = function(e) {
          const { 
            aliens, 
            playerPosition, 
            playerPowerUps,
            difficultyMultiplier, 
            deltaTime, 
            now 
          } = e.data;

          // Process all alien AI decisions in parallel thread
          const alienUpdates = aliens.map(alien => {
            const updates = {
              id: alien.id,
              position: { ...alien.position },
              velocity: { ...alien.velocity },
              shouldFire: false,
              missileData: null,
              newBehaviorState: alien.behaviorState || 'patrol'
            };

            // 1. MOVEMENT AI (expensive pathfinding can go here)
            const dx = playerPosition.x - alien.position.x;
            const dy = playerPosition.y - alien.position.y;
            const dz = playerPosition.z - alien.position.z;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Advanced AI behavior tree (CPU intensive) - Increased aggro ranges
            if (distanceToPlayer < 40) { // Increased from 20 to 40
              // Close combat: evasive maneuvers
              updates.newBehaviorState = 'evade';
              
              // Calculate evasion vector (expensive)
              const evasionAngle = Math.atan2(dy, dx) + Math.PI/2;
              updates.velocity.x += Math.cos(evasionAngle) * 2.0 * deltaTime;
              updates.velocity.y += Math.sin(evasionAngle) * 1.5 * deltaTime;
              
            } else if (distanceToPlayer < 100) { // Increased from 50 to 100
              // Medium range: aggressive approach
              updates.newBehaviorState = 'attack';
              
              // Predictive targeting (CPU intensive)
              const playerVelocity = { x: 0, y: 0, z: 0 }; // Would need real player velocity
              const interceptTime = distanceToPlayer / 20; // Estimated missile speed
              const predictedPlayerPos = {
                x: playerPosition.x + playerVelocity.x * interceptTime,
                y: playerPosition.y + playerVelocity.y * interceptTime,
                z: playerPosition.z + playerVelocity.z * interceptTime
              };
              
              // Aim for predicted position
              const pdx = predictedPlayerPos.x - alien.position.x;
              const pdy = predictedPlayerPos.y - alien.position.y;
              const predictedDistance = Math.sqrt(pdx * pdx + pdy * pdy);
              
              if (predictedDistance > 0) {
                updates.velocity.x += (pdx / predictedDistance) * 1.0 * deltaTime;
                updates.velocity.y += (pdy / predictedDistance) * 1.0 * deltaTime;
              }
            }

            // 2. FIRING AI (complex targeting calculations)
            const fireChance = 0.002 * difficultyMultiplier;
            const earlyShootingDistance = -50.625;
            
            // Debug aliens should never shoot
            if (!alien.isDebugAlien &&
                !alien.isInvulnerable && 
                !playerPowerUps.stealth && 
                (alien.isAtCombatDistance || alien.position.z > earlyShootingDistance)) {
              
              // Boss BFG logic
              if (alien.isBoss && (now - (alien.lastBfgFire || 0)) >= (alien.bfgCooldown || 15000)) {
                if (distanceToPlayer > 0) {
                  updates.shouldFire = true;
                  updates.missileData = {
                    type: 'boss-bfg',
                    weaponType: 'bfg',
                    velocity: {
                      x: (dx / distanceToPlayer) * 0.3,
                      y: (dy / distanceToPlayer) * 0.3,
                      z: 1.0
                    },
                    size: 8,
                    color: '#00ff00'
                  };
                  updates.lastBfgFire = now;
                }
              }
              
              // Flying saucer charge weapon
              else if (!alien.isBoss && alien.type === 5) {
                const chargeDuration = 3000;
                
                if (!alien.isCharging && (now - (alien.lastChargeTime || 0)) > 2000 + Math.random() * 3000) {
                  updates.isCharging = true;
                  updates.chargeStartTime = now;
                  updates.chargeLevel = 0;
                }
                
                if (alien.isCharging) {
                  const chargeProgress = (now - alien.chargeStartTime) / chargeDuration;
                  updates.chargeLevel = Math.min(5, Math.floor(chargeProgress * 5) + 1);
                  
                  // Random firing decision (expensive probability calculations)
                  if (updates.chargeLevel >= 1 && Math.random() < 0.005 * deltaTime * 60) {
                    if (distanceToPlayer > 0) {
                      updates.shouldFire = true;
                      updates.missileData = {
                        type: 'saucer-charge',
                        weaponType: 'charge',
                        velocity: {
                          x: (dx / distanceToPlayer) * 0.4,
                          y: (dy / distanceToPlayer) * 0.4,
                          z: 0.8
                        },
                        chargeLevel: updates.chargeLevel,
                        damage: updates.chargeLevel,
                        size: 0.3 + updates.chargeLevel * 0.2,
                        color: updates.chargeLevel === 1 ? '#ffff00' : 
                               updates.chargeLevel === 2 ? '#ff8800' :
                               updates.chargeLevel === 3 ? '#ff4400' :
                               updates.chargeLevel === 4 ? '#ff0088' : '#ff00ff'
                      };
                      
                      updates.isCharging = false;
                      updates.chargeLevel = 0;
                      updates.lastChargeTime = now;
                    }
                  }
                }
              }
              
              // Regular alien firing
              else if (!alien.isBoss && alien.type !== 5 && Math.random() < fireChance * deltaTime * 60) {
                if (distanceToPlayer > 0) {
                  updates.shouldFire = true;
                  updates.missileData = {
                    type: 'alien-missile',
                    weaponType: 'default',
                    velocity: {
                      x: (dx / distanceToPlayer) * 0.2,
                      y: (dy / distanceToPlayer) * 0.2,
                      z: 0.5
                    }
                  };
                }
              }
            }

            // 3. ADVANCED AI BEHAVIORS (formation flying, flanking, etc.)
            if (alien.type === 3) {
              // Advanced alien: formation behavior
              const formationOffset = {
                x: Math.sin(now * 0.001 + alien.id) * 5,
                y: Math.cos(now * 0.001 + alien.id) * 3
              };
              
              updates.velocity.x += formationOffset.x * deltaTime;
              updates.velocity.y += formationOffset.y * deltaTime;
            }

            return updates;
          });

          // Send results back to main thread
          self.postMessage({
            type: 'alienUpdates',
            updates: alienUpdates,
            timestamp: now
          });
        };

        // Handle errors
        self.onerror = function(error) {
          console.error('Alien AI Worker Error:', error);
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      workerRef.current = new Worker(URL.createObjectURL(blob));
      
      // Handle messages from worker
      workerRef.current.onmessage = (e) => {
        const { type, updates, timestamp } = e.data;
        
        if (type === 'alienUpdates') {
          // Store updates to apply on main thread
          pendingUpdatesRef.current.set(timestamp, updates);
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('Alien AI Worker Error:', error);
        // Fallback to main thread processing
      };
      
    } catch (error) {
      console.warn('Web Workers not supported, using main thread AI');
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  useFrame((state, delta) => {
    const now = Date.now();
    
    // Send AI data to worker every 2 frames (30 fps AI updates instead of 60)
    if (workerRef.current && now - lastUpdateRef.current > 33) { // ~30fps
      const difficultyMultiplier = {
        easy: 0.75,
        normal: 1.0,
        hard: 1.5,
      }[difficulty];

      // Send current game state to worker
      workerRef.current.postMessage({
        aliens: aliens.map(alien => ({
          id: alien.id,
          type: alien.type,
          position: alien.position,
          velocity: alien.velocity,
          isInvulnerable: alien.isInvulnerable,
          isAtCombatDistance: alien.isAtCombatDistance,
          isBoss: alien.isBoss,
          lastBfgFire: alien.lastBfgFire,
          bfgCooldown: alien.bfgCooldown,
          isCharging: alien.isCharging,
          chargeStartTime: alien.chargeStartTime,
          chargeLevel: alien.chargeLevel,
          lastChargeTime: alien.lastChargeTime,
          behaviorState: alien.behaviorState,
          isDebugAlien: alien.isDebugAlien
        })),
        playerPosition,
        playerPowerUps,
        difficultyMultiplier,
        deltaTime: delta,
        now
      });
      
      lastUpdateRef.current = now;
    }

    // Apply pending updates from worker
    pendingUpdatesRef.current.forEach((updates, timestamp) => {
      // Only apply recent updates (avoid stale data)
      if (now - timestamp < 100) { // 100ms tolerance
        
        // Apply AI decisions to aliens
        const updatedAliens = aliens.map(alien => {
          const update = updates.find(u => u.id === alien.id);
          if (!update) return alien;

          // Apply worker-calculated changes
          const updatedAlien = {
            ...alien,
            position: update.position,
            velocity: update.velocity,
            behaviorState: update.newBehaviorState,
            isCharging: update.isCharging !== undefined ? update.isCharging : alien.isCharging,
            chargeLevel: update.chargeLevel !== undefined ? update.chargeLevel : alien.chargeLevel,
            chargeStartTime: update.chargeStartTime !== undefined ? update.chargeStartTime : alien.chargeStartTime,
            lastChargeTime: update.lastChargeTime !== undefined ? update.lastChargeTime : alien.lastChargeTime,
            lastBfgFire: update.lastBfgFire !== undefined ? update.lastBfgFire : alien.lastBfgFire
          };

          // Handle firing commands from AI
          if (update.shouldFire && update.missileData) {
            addMissile({
              id: `${update.missileData.type}-${now}-${alien.id}`,
              position: { ...alien.position },
              velocity: update.missileData.velocity,
              type: 'alien',
              weaponType: update.missileData.weaponType,
              chargeLevel: update.missileData.chargeLevel,
              damage: update.missileData.damage,
              size: update.missileData.size || 0.2,
              color: update.missileData.color || '#ff0000'
            });
          }

          return updatedAlien;
        });

        updateAliens(updatedAliens);
      }
      
      // Clean up old updates
      pendingUpdatesRef.current.delete(timestamp);
    });
  });

  return null; // This component only manages AI logic
}

export default AlienAIManager;