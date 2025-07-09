import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import weaponMeshPool from '../systems/WeaponMeshPool2';
import soundManager from '../systems/SoundManager';
import * as THREE from 'three';

export const useWeaponSystem = ({ 
  keys, 
  gameState, 
  isPaused, 
  gameMode, 
  isShiftBoosting, 
  shiftBoostCooldown,
  missileQueueRef,
  weaponStateQueueRef,
  getCursorWorldPosition
}) => {
  const weapons = useGameStore((state) => state.weapons);
  const switchWeapon = useGameStore((state) => state.switchWeapon);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const cursorAiming = useGameStore((state) => state.cursorAiming);
  const stopCharging = useGameStore((state) => state.stopCharging);
  
  // Use refs to persist fire timers across renders
  const fireTimersRef = useRef({ lastFireTime: 0, lastRocketTime: 0 });

  const getLaserColor = (level) => {
    switch (level) {
      case 1: return '#ff0000'; // Red
      case 2: return '#ff4000'; // Red-orange
      case 3: return '#ff8000'; // Orange
      case 4: return '#ffff00'; // Yellow
      case 5: return '#ffffff'; // White
      default: return '#ff0000'; // Red
    }
  };

  useEffect(() => {
    const handleFiring = () => {
      const freeLookMode = useGameStore.getState().freeLookMode;
      
      // Check if shooting is disabled due to shift boost
      const shiftBoostBlocked = gameMode === 'freeflight' && (isShiftBoosting || (Date.now() - shiftBoostCooldown < 250));
      
      // Get fresh keys by re-calling useKeyboard hook state
      // This is hacky but avoids the stale closure issue
      const currentKeys = document._gameKeys || {};
      const baseFireKeys = gameMode === 'freeflight' && (currentKeys.ShiftLeft || currentKeys.ShiftRight) ? 
        (currentKeys.Space || currentKeys.MouseLeft) : // In free flight, exclude shift keys if they're pressed (for boost)
        (currentKeys.Space || currentKeys.MouseLeft || currentKeys.ShiftLeft || currentKeys.ShiftRight);
      
      // In free flight mode, only use Mouse1 for firing (not Space or Shift, since they're used for movement)
      const fireKeyPressed = freeLookMode ? 
        (currentKeys.MouseLeft && !shiftBoostBlocked) : 
        (baseFireKeys && !shiftBoostBlocked);
      
      if (!fireKeyPressed || gameState !== 'playing' || isPaused) {
        return;
      }
      
      // Get fresh weapons state to avoid stale closure
      const currentWeapons = useGameStore.getState().weapons;
      
      // Check if weapon pools are ready for complex weapons (optimized)
      const weaponType = currentWeapons.current;
      const needsPool = ['rocket', 'bfg', 'bomb', 'railgun'].includes(weaponType);
      if (needsPool && !weaponMeshPool.isInitialized) {
        // Pool not ready - skip firing without logging (logging causes lag)
        return;
      }
      if (currentWeapons.current === 'charge') {
        return; // Charge weapon handled separately
      }
      
      // If charge weapon is stuck charging but not selected, clean it up
      const currentChargeWeapon = useGameStore.getState().chargeWeapon;
      if (currentChargeWeapon.isCharging && currentWeapons.current !== 'charge') {
        stopCharging(); // Clean up stuck charge state
      }
      
      const currentWeapon = currentWeapons[currentWeapons.current];
      if (!currentWeapon || (currentWeapon.ammo !== Infinity && currentWeapon.ammo <= 0)) {
        return;
      }
      
      const now = Date.now();
      let fireRate = 250;
      let lastTime = fireTimersRef.current.lastFireTime;
      
      // Weapon-specific fire rates
      switch (currentWeapons.current) {
        case 'laser':
          fireRate = playerPowerUps.rapidFire ? 100 : 150;
          break;
        case 'chaingun':
          fireRate = 60; // Very fast
          break;
        case 'bfg':
          fireRate = 2000; // Very slow
          break;
        case 'rocket':
          fireRate = 500; // 0.5 seconds between rockets
          lastTime = fireTimersRef.current.lastRocketTime; // Use separate rocket timer
          break;
        case 'railgun':
          fireRate = 800; // Slow but powerful
          break;
        default:
          fireRate = playerPowerUps.rapidFire ? 150 : 250;
      }
      
      if (now - lastTime < fireRate) return;
      
      // Update the appropriate timer
      if (currentWeapons.current === 'rocket') {
        fireTimersRef.current.lastRocketTime = now;
      } else {
        fireTimersRef.current.lastFireTime = now;
      }
      
      // Queue ammo usage for non-default weapons (charge weapon has infinite ammo)
      if (currentWeapons.current !== 'default' && currentWeapons.current !== 'charge') {
        weaponStateQueueRef.current.push({
          type: 'useAmmo',
          weaponType: currentWeapons.current,
          amount: 1
        });
      }
      
      // Queue battery operations for energy weapons
      const isEnergyWeapon = ['default', 'laser'].includes(currentWeapons.current);
      if (isEnergyWeapon) {
        // Queue battery drain and recharge
        weaponStateQueueRef.current.push({
          type: 'drainBattery',
          amount: 1
        });
        weaponStateQueueRef.current.push({
          type: 'rechargeBattery',
          amount: 1,
          delay: 100 // 100ms delay for recharge
        });
      }
      
      // Create and fire projectiles directly through weapon pool (no store involvement)
      const fireProjectile = (weaponType, offsetX = 0) => {
        const now = Date.now();
        const currentPlayerPosition = useGameStore.getState().playerPosition;
        const currentPlayerRotation = useGameStore.getState().playerRotation;
        
        // Calculate firing direction
        let velocityDirection = { x: 0, y: 0, z: -1 };
        
        if (cursorAiming && !freeLookMode) {
          const cursorWorld = getCursorWorldPosition();
          if (cursorWorld) {
            const playerPos = new THREE.Vector3(currentPlayerPosition.x + offsetX, currentPlayerPosition.y, currentPlayerPosition.z);
            const direction = new THREE.Vector3().subVectors(cursorWorld, playerPos).normalize();
            velocityDirection = { x: direction.x, y: direction.y, z: direction.z };
          }
        } else {
          const shipDirection = new THREE.Vector3(0, 0, -1);
          const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
            new THREE.Euler(currentPlayerRotation.x, currentPlayerRotation.y, currentPlayerRotation.z)
          );
          shipDirection.applyMatrix4(rotationMatrix);
          velocityDirection = { x: shipDirection.x, y: shipDirection.y, z: shipDirection.z };
        }
        
        // Calculate spawn position
        const missileSpawnOffset = new THREE.Vector3(offsetX, 0, -3);
        const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(currentPlayerRotation.x, currentPlayerRotation.y, currentPlayerRotation.z)
        );
        missileSpawnOffset.applyMatrix4(rotationMatrix);
        
        const finalSpawnPosition = {
          x: currentPlayerPosition.x + missileSpawnOffset.x,
          y: currentPlayerPosition.y + missileSpawnOffset.y,
          z: currentPlayerPosition.z + missileSpawnOffset.z
        };
        
        // Build missile data based on weapon type
        let missileData = {
          id: `${weaponType}-${now}-${offsetX}`,
          position: finalSpawnPosition,
          rotation: {
            x: currentPlayerRotation.x,
            y: currentPlayerRotation.y,
            z: currentPlayerRotation.z
          },
          type: 'player',
          weaponType: weaponType,
          homing: playerPowerUps.homingWeapons || weaponType === 'rocket',
          timestamp: now, // Add timestamp for tracking
        };
        
        // Add weapon-specific properties
        switch (weaponType) {
          case 'laser':
            missileData = {
              ...missileData,
              velocity: {
                x: velocityDirection.x * 200,
                y: velocityDirection.y * 200,
                z: velocityDirection.z * 200
              },
              size: 0.5,
              color: getLaserColor(currentWeapons[weaponType]?.level || 1),
            };
            break;
          case 'chaingun':
            missileData = {
              ...missileData,
              velocity: {
                x: velocityDirection.x * 250,
                y: velocityDirection.y * 250,
                z: velocityDirection.z * 250
              },
              size: 0.3,
              color: '#ffff00',
            };
            break;
          case 'bfg':
            missileData = {
              ...missileData,
              velocity: {
                x: velocityDirection.x * 40,  // Slower: 40 instead of 100
                y: velocityDirection.y * 40,
                z: velocityDirection.z * 40
              },
              size: 0.8,
              color: '#00ff00',
              damage: 100,
            };
            break;
          case 'rocket':
            missileData = {
              ...missileData,
              velocity: {
                x: velocityDirection.x * 150,  // Increased from 80 to 150
                y: velocityDirection.y * 150,
                z: velocityDirection.z * 150
              },
              size: 0.3,
              color: '#ff8000',
              damage: 30,
            };
            break;
          case 'railgun':
            missileData = {
              ...missileData,
              velocity: {
                x: velocityDirection.x * 400,
                y: velocityDirection.y * 400,
                z: velocityDirection.z * 400
              },
              size: 0.15,
              color: '#8080ff',
              damage: 50,
            };
            break;
          case 'bomb':
            missileData = {
              ...missileData,
              velocity: {
                x: velocityDirection.x * 60,
                y: velocityDirection.y * 60,
                z: velocityDirection.z * 60
              },
              size: 0.2,
              color: '#00ffff',
            };
            break;
          default:
            missileData = {
              ...missileData,
              velocity: {
                x: velocityDirection.x * 165,
                y: velocityDirection.y * 165,
                z: velocityDirection.z * 165
              },
              size: 0.3,
              color: '#ffffff',
            };
            break;
        }
        
        // For complex weapons (rockets, bfg, bombs, railguns), use the pool directly
        if (['rocket', 'bfg', 'bomb', 'railgun'].includes(weaponType)) {
          console.log(`[MISSILE DEBUG] Attempting to fire ${weaponType} with data:`, missileData);
          const mesh = weaponMeshPool.acquireLiveMissile(weaponType, missileData);
          if (mesh) {
            console.log(`[MISSILE DEBUG] Successfully acquired ${weaponType} mesh:`, mesh);
            console.log(`[MISSILE DEBUG] Mesh visibility: ${mesh.visible}, position:`, mesh.position);
            // Play weapon sound for complex weapons since they bypass the store
            soundManager.playWeaponSound(weaponType, {
              pitchVariation: 0.1
            });
            return true;
          } else {
            console.warn(`[DIRECT FIRE] Failed to acquire ${weaponType} from pool`);
            return false;
          }
        } else {
          // For simple weapons, still use the old system temporarily
          console.log(`[MISSILE DEBUG] Creating simple ${weaponType} missile:`, missileData);
          // Sound will be handled by useGameSounds hook when missile is added to store
          return missileData;
        }
      };
      
      if (playerPowerUps.multiShot) {
        // Fire 3 missiles in a spread
        const fireResults = [
          fireProjectile(currentWeapons.current, -2),
          fireProjectile(currentWeapons.current, 0),
          fireProjectile(currentWeapons.current, 2)
        ];
        
        // Handle simple weapons that still return missile data
        const simpleMissiles = fireResults.filter(result => result && typeof result === 'object' && result.position);
        simpleMissiles.forEach(missile => {
          missileQueueRef.current.push({
            type: 'add',
            missile: missile
          });
        });
        
        // Play weapon sound for successful fires (both simple and complex weapons)
        const successfulFires = fireResults.filter(result => result === true || (result && typeof result === 'object' && result.position)).length;
        if (successfulFires > 0) {
          soundManager.playWeaponSound(currentWeapons.current, {
            pitchVariation: 0.1
          });
        }
        
        // Count successful fires for complex weapons
        const complexFires = fireResults.filter(result => result === true).length;
        // Removed console.log for performance
      } else {
        // Fire single missile
        const fireResult = fireProjectile(currentWeapons.current, 0);
        
        if (fireResult === true) {
          // Complex weapon fired directly through pool - logging removed for performance
        } else if (fireResult && typeof fireResult === 'object' && fireResult.position) {
          // Simple weapon returns missile data for queue
          missileQueueRef.current.push({
            type: 'add',
            missile: fireResult
          });
          // Play weapon sound for simple weapons as backup (in case store hook fails)
          soundManager.playWeaponSound(currentWeapons.current, {
            pitchVariation: 0.1
          });
        } else {
          // Failed to fire weapon - skip logging for performance
        }
        
        // Record manual shot for live targeting stats
        const gameStore = useGameStore.getState();
        if (gameStore.liveTargetingStats.enabled && gameStore.selectedTarget && gameStore.targetingEnabled) {
          const selectedTarget = gameStore.selectedTarget;
          const playerPosition = gameStore.playerPosition;
          const distance = Math.sqrt(
            Math.pow(selectedTarget.position.x - playerPosition.x, 2) +
            Math.pow(selectedTarget.position.y - playerPosition.y, 2) +
            Math.pow(selectedTarget.position.z - (playerPosition.z || 0), 2)
          );
          
          gameStore.recordTargetingShot({
            timestamp: Date.now(),
            distance: distance,
            hit: false, // Will be updated by collision detection
            targetId: selectedTarget.id,
            manual: true // Flag to distinguish from auto-fire shots
          });
        }
      }
    };
    
    const fireInterval = setInterval(() => {
      handleFiring();
    }, 50); // Check every 50ms - now optimized with removed expensive stats calls
    
    return () => {
      clearInterval(fireInterval);
    };
  }, []); // Empty dependency array to prevent infinite recreation
  
  // Weapon switching
  useEffect(() => {
    if (keys.Digit1) switchWeapon('default');
    if (keys.Digit2) switchWeapon('laser');
    if (keys.Digit3) switchWeapon('chaingun');
    if (keys.Digit4) switchWeapon('bfg');
    if (keys.Digit5) switchWeapon('rocket');
    if (keys.Digit6) switchWeapon('charge');
    if (keys.Digit7) switchWeapon('railgun');
    if (keys.Digit8) switchWeapon('bomb');
  }, [keys.Digit1, keys.Digit2, keys.Digit3, keys.Digit4, keys.Digit5, keys.Digit6, keys.Digit7, keys.Digit8, switchWeapon]);
  
  // Mouse wheel weapon scrolling - RE-ENABLED
  useEffect(() => {
    const weaponOrder = ['default', 'laser', 'chaingun', 'bfg', 'rocket', 'charge', 'bomb', 'railgun'];
    
    // Filter to only include acquired weapons (have ammo or maxAmmo > 0, except default/charge)
    const availableWeapons = weaponOrder.filter(weaponType => {
      const weapon = weapons[weaponType];
      if (!weapon) return false;
      
      // Default and charge are always available
      if (weaponType === 'default' || weaponType === 'charge') return true;
      
      // Other weapons are available if they have max ammo > 0 (acquired)
      return weapon.maxAmmo > 0;
    });
    
    const currentWeaponIndex = availableWeapons.indexOf(weapons.current);
    
    if (keys.WheelUp && currentWeaponIndex > 0) {
      // Find next available weapon backwards
      for (let i = currentWeaponIndex - 1; i >= 0; i--) {
        const newWeapon = availableWeapons[i];
        const weapon = weapons[newWeapon];
        if (weapon && (weapon.ammo > 0 || newWeapon === 'default' || newWeapon === 'charge')) {
          switchWeapon(newWeapon);
          break;
        }
      }
    } else if (keys.WheelDown && currentWeaponIndex < availableWeapons.length - 1) {
      // Find next available weapon forwards
      for (let i = currentWeaponIndex + 1; i < availableWeapons.length; i++) {
        const newWeapon = availableWeapons[i];
        const weapon = weapons[newWeapon];
        if (weapon && (weapon.ammo > 0 || newWeapon === 'default' || newWeapon === 'charge')) {
          switchWeapon(newWeapon);
          break;
        }
      }
    }
  }, [keys.WheelUp, keys.WheelDown, weapons, switchWeapon]);

  return {
    fireTimersRef,
    getLaserColor
  };
};