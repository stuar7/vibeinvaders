import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

export const useChargeWeapon = ({ 
  keys, 
  gameState, 
  isPaused, 
  gameMode, 
  isShiftBoosting, 
  shiftBoostCooldown,
  missileQueueRef,
  chargeQueueRef,
  getCursorWorldPosition
}) => {
  const weapons = useGameStore((state) => state.weapons);
  const chargeWeapon = useGameStore((state) => state.chargeWeapon);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const cursorAiming = useGameStore((state) => state.cursorAiming);
  const startCharging = useGameStore((state) => state.startCharging);
  const stopCharging = useGameStore((state) => state.stopCharging);
  const updateChargeLevel = useGameStore((state) => state.updateChargeLevel);

  // Handle charge weapon logic
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;
    
    // Only run charge logic when charge weapon is actually selected
    if (weapons.current === 'charge') {
      const freeLookMode = useGameStore.getState().freeLookMode;
      
      // Check if shooting is disabled due to shift boost
      const shiftBoostBlocked = gameMode === 'freeflight' && (isShiftBoosting || (Date.now() - shiftBoostCooldown < 250));
      
      // Base fire key detection (excluding shift keys when boost is active in free flight)
      const baseFireKeys = gameMode === 'freeflight' && (keys.ShiftLeft || keys.ShiftRight) ? 
        (keys.Space || keys.MouseLeft) : // In free flight, exclude shift keys if they're pressed (for boost)
        (keys.Space || keys.MouseLeft || keys.ShiftLeft || keys.ShiftRight);
      
      const fireKeyPressed = baseFireKeys && !shiftBoostBlocked;
      
      // In free flight mode, only use Mouse1 for charging (not Space or Shift, since they're used for movement)
      const shouldStartCharging = freeLookMode ? 
        (keys.MouseLeft && !shiftBoostBlocked) : 
        fireKeyPressed;
      const shouldStopCharging = freeLookMode ? 
        (!keys.MouseLeft || shiftBoostBlocked) : 
        !fireKeyPressed;
      
      if (shouldStartCharging && !chargeWeapon.isCharging) {
        // Start charging
        startCharging();
      } else if (shouldStopCharging && chargeWeapon.isCharging) {
        // Release charge and fire
        const finalChargeLevel = chargeWeapon.chargeLevel;
        if (finalChargeLevel > 0) {
          fireChargeShot(finalChargeLevel);
        }
        stopCharging();
      }
    } else {
      // If charge weapon is not selected but is charging, stop it
      if (chargeWeapon.isCharging) {
        stopCharging();
      }
    }
  }, [keys.Space, keys.MouseLeft, keys.ShiftLeft, keys.ShiftRight, weapons.current, gameState, isPaused, gameMode, isShiftBoosting, shiftBoostCooldown]);

  // Update charge level continuously (faster with rapid fire) - queue charge updates instead of direct calls
  useEffect(() => {
    if (chargeWeapon.isCharging) {
      const chargeSpeed = playerPowerUps.rapidFire ? 50 : 100; // 2x faster charging with rapid fire
      const interval = setInterval(() => {
        chargeQueueRef.current.push({
          type: 'updateChargeLevel'
        });
      }, chargeSpeed);
      
      return () => clearInterval(interval);
    }
  }, [chargeWeapon.isCharging, playerPowerUps.rapidFire, chargeQueueRef]);

  const fireChargeShot = (chargeLevel) => {
    const now = Date.now();
    const currentPlayerPosition = useGameStore.getState().playerPosition;
    const currentPlayerRotation = useGameStore.getState().playerRotation;
    
    // Calculate firing direction for charge shot
    let velocityDirection = { x: 0, y: 0, z: -1 }; // Default: straight forward
    
    if (cursorAiming) {
      const cursorWorld = getCursorWorldPosition();
      
      if (cursorWorld) {
        // Calculate direction from player to cursor
        const playerPos = new THREE.Vector3(currentPlayerPosition.x, currentPlayerPosition.y, currentPlayerPosition.z);
        const direction = new THREE.Vector3().subVectors(cursorWorld, playerPos).normalize();
        
        velocityDirection = { x: direction.x, y: direction.y, z: direction.z };
      }
    } else {
      // Use ship's rotation for firing direction (especially important for free look mode)
      const shipDirection = new THREE.Vector3(0, 0, -1); // Ship points in negative Z
      const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(currentPlayerRotation.x, currentPlayerRotation.y, currentPlayerRotation.z)
      );
      shipDirection.applyMatrix4(rotationMatrix);
      velocityDirection = { x: shipDirection.x, y: shipDirection.y, z: shipDirection.z };
    }
    
    // Create charge missile factory function
    const createChargeMissile = (spreadOffset = 0) => {
      // VALIDATION: Check for invalid player position and rotation
      if (!currentPlayerPosition || 
          isNaN(currentPlayerPosition.x) || isNaN(currentPlayerPosition.y) || isNaN(currentPlayerPosition.z)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[CHARGE SPAWN] Invalid player position:`, currentPlayerPosition);
        }
        return null;
      }
      
      if (!currentPlayerRotation || 
          isNaN(currentPlayerRotation.x) || isNaN(currentPlayerRotation.y) || isNaN(currentPlayerRotation.z)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[CHARGE SPAWN] Invalid player rotation:`, currentPlayerRotation);
        }
        return null;
      }
      
      // VALIDATION: Check velocity direction is valid
      if (isNaN(velocityDirection.x) || isNaN(velocityDirection.y) || isNaN(velocityDirection.z)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[CHARGE SPAWN] Invalid velocity direction:`, velocityDirection);
        }
        return null;
      }
      
      // Calculate spawn position for each missile individually
      const missileSpawnOffset = new THREE.Vector3(spreadOffset, 0, -3); // 3 units forward in ship's local space
      const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(currentPlayerRotation.x, currentPlayerRotation.y, currentPlayerRotation.z)
      );
      missileSpawnOffset.applyMatrix4(rotationMatrix); // Transform to world space
      
      // VALIDATION: Check for invalid spawn offset
      if (isNaN(missileSpawnOffset.x) || isNaN(missileSpawnOffset.y) || isNaN(missileSpawnOffset.z)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[CHARGE SPAWN] Invalid spawn offset:`, missileSpawnOffset);
        }
        return null;
      }
      
      // Calculate final spawn position
      const finalChargeSpawnPosition = {
        x: currentPlayerPosition.x + missileSpawnOffset.x,
        y: currentPlayerPosition.y + missileSpawnOffset.y,
        z: currentPlayerPosition.z + missileSpawnOffset.z
      };
      
      // VALIDATION: Check for invalid final spawn position
      if (isNaN(finalChargeSpawnPosition.x) || isNaN(finalChargeSpawnPosition.y) || isNaN(finalChargeSpawnPosition.z)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[CHARGE SPAWN] Invalid final spawn position:`, finalChargeSpawnPosition);
        }
        return null;
      }
      
      return {
        id: `charge-${now}-${Math.random()}`,
        position: finalChargeSpawnPosition,
        rotation: {
          x: currentPlayerRotation.x,
          y: currentPlayerRotation.y,
          z: currentPlayerRotation.z
        },
        velocity: { 
          x: velocityDirection.x * 3.0, 
          y: velocityDirection.y * 3.0, 
          z: velocityDirection.z * 3.0 
        },
        type: 'player',
        weaponType: 'charge',
        size: 0.3 + (chargeLevel * 0.2), // Larger with more charge
        color: getChargeColor(chargeLevel),
        damage: chargeLevel, // 1 damage per charge level
      };
    };
    
    // Support multishot for charge weapon
    if (playerPowerUps.multiShot) {
      // Fire 3 charge projectiles in a spread
      const spread = 2.0; // Charge weapon spread
      const chargeMissileBatch = [];
      
      for (let i = -1; i <= 1; i++) {
        const chargeMissile = createChargeMissile(i * spread);
        if (chargeMissile) {
          chargeMissileBatch.push(chargeMissile);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[CHARGE SPAWN] Failed to create charge missile in spread ${i}`);
          }
        }
      }
      
      // Add all charge missiles to queue
      if (chargeMissileBatch.length > 0) {
        missileQueueRef.current.push(...chargeMissileBatch);
      }
    } else {
      // Fire single charge projectile
      const chargeMissile = createChargeMissile();
      if (chargeMissile) {
        missileQueueRef.current.push(chargeMissile);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[CHARGE SPAWN] Failed to create single charge missile`);
        }
      }
    }
  };

  const getChargeColor = (level) => {
    switch (level) {
      case 1: return '#0080ff'; // Blue
      case 2: return '#00ff80'; // Green  
      case 3: return '#80ff00'; // Yellow-green
      case 4: return '#ffff00'; // Yellow
      case 5: return '#ff8000'; // Orange
      default: return '#ffffff'; // White
    }
  };

  return {
    fireChargeShot,
    getChargeColor
  };
};