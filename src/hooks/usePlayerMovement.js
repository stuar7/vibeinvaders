import { useGameStore } from '../store/gameStore';
import { GAMESPACE_MASTER_CONFIG } from '../config/UnifiedGamespace';
import * as THREE from 'three';

export const usePlayerMovement = ({ 
  keys, 
  gameMode, 
  isShiftBoosting, 
  damageQueueRef, 
  delta, 
  timeMultiplier 
}) => {
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const movePlayer = useGameStore((state) => state.movePlayer);
  const updatePlayerVelocity = useGameStore((state) => state.updatePlayerVelocity);

  const processMovement = () => {
    const adjustedDelta = delta * timeMultiplier;
    
    // Star Fox 64-style momentum-based movement
    
    // Get free look mode for 6DOF controls
    const freeLookMode = useGameStore.getState().freeLookMode;
    
    // Movement parameters
    const baseAcceleration = 45; // How quickly ship accelerates
    const baseMaxSpeed = 22; // Maximum speed (base reference)
    const dampening = freeLookMode ? 0.05 : 0.85; // Instant deceleration in free flight mode
    
    // Ctrl key velocity boost
    const isBoostActive = keys.ControlLeft || keys.ControlRight;
    // Shift key boost (free flight only)
    const isShiftBoostActive = gameMode === 'freeflight' && isShiftBoosting;
    const boostMultiplier = (isBoostActive ? 1.5 : 1.0) * (isShiftBoostActive ? 1.5 : 1.0); // Ctrl: 50% increase, Shift: additional 50%
    
    // Responsiveness powerup multiplier
    const responsivenessMultiplier = playerPowerUps.responsiveness ? 1.4 : 1.0; // 40% increase
    
    const acceleration = baseAcceleration * boostMultiplier * responsivenessMultiplier;
    const maxSpeed = baseMaxSpeed * boostMultiplier * responsivenessMultiplier;
    
    // Calculate input acceleration
    let accelX = 0;
    let accelY = 0;
    let accelZ = 0;
    
    if (freeLookMode) {
      // 6DOF Space Sim Controls (Ship-Relative Movement like Elite Dangerous)
      
      // Get player's current rotation to calculate ship-relative movement
      const playerRotation = useGameStore.getState().playerRotation;
      
      // Calculate ship-relative movement inputs (in ship's local space)
      let forwardInput = 0;  // Forward/backward relative to ship nose
      let rightInput = 0;    // Left/right strafe relative to ship
      let upInput = 0;       // Up/down relative to ship
      
      // Forward/Backward thrust (along ship's nose direction)
      if (keys.KeyW) {
        forwardInput += acceleration * 1.5 * adjustedDelta; // Forward thrust (increased by 0.5)
      }
      if (keys.KeyS) {
        forwardInput -= acceleration * 0.375 * adjustedDelta; // Backward thrust (further reduced by half)
      }
      
      // Left/Right strafe (relative to ship orientation)
      if (keys.KeyA) {
        rightInput -= acceleration * 0.2 * adjustedDelta; // Strafe left (further reduced by half)
      }
      if (keys.KeyD) {
        rightInput += acceleration * 0.2 * adjustedDelta; // Strafe right (further reduced by half)
      }
      
      // Up/Down thrust (relative to ship orientation)
      if (keys.Space) {
        upInput += acceleration * 0.5 * adjustedDelta; // Up thrust (half forward speed)
      }
      if (keys.ControlLeft || keys.ControlRight) {
        upInput -= acceleration * 0.5 * adjustedDelta; // Down thrust (half forward speed)
      }
      
      // Mathematical combination: when multiple directions are pressed, use average speeds
      const isMovingForward = forwardInput > 0;
      const isStrafing = Math.abs(rightInput) > 0;
      
      if (isMovingForward && isStrafing) {
        // When both forward and strafe are pressed, use average of the two speeds
        const forwardSpeed = 1.5; // Current forward multiplier
        const strafeSpeed = 0.2;  // Updated strafe multiplier (reduced by half)
        const averageSpeed = (forwardSpeed + strafeSpeed) / 2; // = 0.85
        
        // Apply the average to both directions
        const forwardRatio = forwardInput / (acceleration * forwardSpeed * adjustedDelta);
        const strafeRatio = Math.abs(rightInput) / (acceleration * strafeSpeed * adjustedDelta);
        
        forwardInput = forwardRatio * acceleration * averageSpeed * adjustedDelta;
        rightInput = (rightInput > 0 ? 1 : -1) * strafeRatio * acceleration * averageSpeed * adjustedDelta;
      }
      
      // Transform ship-relative movement to world space using ship's rotation
      const shipRotationMatrix = new THREE.Matrix4();
      shipRotationMatrix.makeRotationFromEuler(new THREE.Euler(
        playerRotation.x || 0,
        playerRotation.y || 0, 
        playerRotation.z || 0,
        'XYZ'
      ));
      
      // Define ship-relative movement vectors (in ship's local space)
      const forwardVector = new THREE.Vector3(0, 0, -forwardInput); // Ship's nose points in -Z
      const rightVector = new THREE.Vector3(rightInput, 0, 0);      // Ship's right is +X
      const upVector = new THREE.Vector3(0, upInput, 0);            // Ship's up is +Y
      
      // Transform vectors to world space
      forwardVector.applyMatrix4(shipRotationMatrix);
      rightVector.applyMatrix4(shipRotationMatrix);
      upVector.applyMatrix4(shipRotationMatrix);
      
      // Combine all movement vectors into world-space acceleration
      accelX = forwardVector.x + rightVector.x + upVector.x;
      accelY = forwardVector.y + rightVector.y + upVector.y;
      accelZ = forwardVector.z + rightVector.z + upVector.z;
      
    } else {
      // Traditional Star Fox Controls (Normal Mode)
      if (keys.ArrowLeft || keys.KeyA) {
        accelX -= acceleration * 1.1 * adjustedDelta; // 10% faster horizontal movement
      }
      if (keys.ArrowRight || keys.KeyD) {
        accelX += acceleration * 1.1 * adjustedDelta; // 10% faster horizontal movement
      }
      if (keys.ArrowUp || keys.KeyW) {
        accelY += acceleration * 0.7 * adjustedDelta; // Slower vertical acceleration
      }
      if (keys.ArrowDown || keys.KeyS) {
        accelY -= acceleration * 0.7 * adjustedDelta;
      }
    }
    
    // Update velocity with acceleration
    const playerVelocity = useGameStore.getState().playerVelocity;
    let newVelX = playerVelocity.x + accelX;
    let newVelY = playerVelocity.y + accelY;
    let newVelZ = (playerVelocity.z || 0) + accelZ;
    
    // Apply dampening when no input
    if (accelX === 0) {
      newVelX *= dampening;
    }
    if (accelY === 0) {
      newVelY *= dampening;
    }
    if (accelZ === 0) {
      newVelZ *= dampening;
    }
    
    // Directional max speed limits (different for each direction)
    if (freeLookMode) {
      // Free flight mode: directional speed limits
      const forwardMaxSpeed = (baseMaxSpeed + 3) * boostMultiplier * responsivenessMultiplier; // +3 forward speed
      const strafeMaxSpeed = (baseMaxSpeed / 2) * boostMultiplier * responsivenessMultiplier; // Half speed for strafe
      const upDownMaxSpeed = (baseMaxSpeed / 2) * boostMultiplier * responsivenessMultiplier; // Half speed for up/down
      
      // Clamp each direction independently
      if (Math.abs(newVelZ) > forwardMaxSpeed) {
        newVelZ = Math.sign(newVelZ) * forwardMaxSpeed;
      }
      if (Math.abs(newVelX) > strafeMaxSpeed) {
        newVelX = Math.sign(newVelX) * strafeMaxSpeed;
      }
      if (Math.abs(newVelY) > upDownMaxSpeed) {
        newVelY = Math.sign(newVelY) * upDownMaxSpeed;
      }
    } else {
      // Normal mode: total velocity limit
      const currentSpeed = Math.sqrt(newVelX * newVelX + newVelY * newVelY);
      if (currentSpeed > maxSpeed) {
        const scale = maxSpeed / currentSpeed;
        newVelX *= scale;
        newVelY *= scale;
      }
    }
    
    // Calculate potential new position
    const deltaX = newVelX * adjustedDelta;
    const deltaY = newVelY * adjustedDelta;
    const deltaZ = newVelZ * adjustedDelta;
    const playerPosition = useGameStore.getState().playerPosition;
    const newX = playerPosition.x + deltaX;
    const newY = playerPosition.y + deltaY;
    
    // Progressive boundary system with slowdown and drag-back (disabled in freelook mode)
    const gamespaceCenter = GAMESPACE_MASTER_CONFIG.center;
    const gamespaceWidth = GAMESPACE_MASTER_CONFIG.bounds.width / 2; // 16 units from center
    const gamespaceHeight = GAMESPACE_MASTER_CONFIG.bounds.height / 2; // 10 units from center
    
    // Calculate distance outside boundary for each axis
    const distanceOutsideX = Math.max(0, Math.abs(newX - gamespaceCenter.x) - gamespaceWidth);
    const distanceOutsideY = Math.max(0, Math.abs(newY - gamespaceCenter.y) - gamespaceHeight);
    const isOutsideX = distanceOutsideX > 0;
    const isOutsideY = distanceOutsideY > 0;
    
    // Progressive slowdown only in disallowed directions (skip if freelook mode is active)
    let finalVelX = newVelX;
    let finalVelY = newVelY;
    
    if (!freeLookMode) {
      if (isOutsideX) {
        // Determine if we're moving further out or back toward boundary
        const movingAwayFromBoundaryX = (newX > gamespaceCenter.x && finalVelX > 0) || 
                                       (newX < gamespaceCenter.x && finalVelX < 0);
        
        if (movingAwayFromBoundaryX) {
          // Only slow down movement that takes us further outside
          const speedMultiplierX = Math.max(0.05, 1.0 - (distanceOutsideX * 0.01));
          finalVelX *= speedMultiplierX;
        }
        // Movement toward boundary is unrestricted
      }
      
      if (isOutsideY) {
        // Determine if we're moving further out or back toward boundary
        const movingAwayFromBoundaryY = (newY > gamespaceCenter.y && finalVelY > 0) || 
                                       (newY < gamespaceCenter.y && finalVelY < 0);
        
        if (movingAwayFromBoundaryY) {
          // Only slow down movement that takes us further outside
          const speedMultiplierY = Math.max(0.05, 1.0 - (distanceOutsideY * 0.01));
          finalVelY *= speedMultiplierY;
        }
        // Movement toward boundary is unrestricted
      }
      
      // Drag-back force when outside boundary
      const dragForce = 15; // Force strength pulling back to boundary
      
      if (isOutsideX) {
        // Determine which side we're on and add drag force toward boundary
        const dragDirectionX = newX > gamespaceCenter.x ? -1 : 1; // Pull toward center
        const dragStrength = Math.min(distanceOutsideX * 0.1, 1.0); // Stronger drag further out
        finalVelX += dragDirectionX * dragForce * dragStrength * adjustedDelta;
      }
      
      if (isOutsideY) {
        // Determine which side we're on and add drag force toward boundary
        const dragDirectionY = newY > gamespaceCenter.y ? -1 : 1; // Pull toward center
        const dragStrength = Math.min(distanceOutsideY * 0.1, 1.0); // Stronger drag further out
        finalVelY += dragDirectionY * dragForce * dragStrength * adjustedDelta;
      }
    } // End of freelook mode boundary check
    
    // Calculate final movement
    const finalDeltaX = finalVelX * adjustedDelta;
    const finalDeltaY = finalVelY * adjustedDelta;
    const finalDeltaZ = newVelZ * adjustedDelta; // Z-axis not affected by boundary restrictions
    
    // Update velocity and position
    updatePlayerVelocity(finalVelX, finalVelY, newVelZ);
    movePlayer(finalDeltaX, finalDeltaY, freeLookMode ? finalDeltaZ : 0);
    
    // Debug logging when outside boundary (only in normal mode, not free flight)
    if (!freeLookMode && (isOutsideX || isOutsideY)) {
      let debugMsg = 'Outside boundary -';
      if (isOutsideX) {
        const movingAwayX = (newX > gamespaceCenter.x && finalVelX > 0) || (newX < gamespaceCenter.x && finalVelX < 0);
        const speedX = movingAwayX ? Math.max(0.05, 1.0 - (distanceOutsideX * 0.01)) : 1.0;
        debugMsg += ` X: ${distanceOutsideX.toFixed(1)} units (${movingAwayX ? 'restricted' : 'free'} - ${(speedX*100).toFixed(0)}% speed)`;
      }
      if (isOutsideY) {
        const movingAwayY = (newY > gamespaceCenter.y && finalVelY > 0) || (newY < gamespaceCenter.y && finalVelY < 0);
        const speedY = movingAwayY ? Math.max(0.05, 1.0 - (distanceOutsideY * 0.01)) : 1.0;
        debugMsg += ` Y: ${distanceOutsideY.toFixed(1)} units (${movingAwayY ? 'restricted' : 'free'} - ${(speedY*100).toFixed(0)}% speed)`;
      }
      console.log(debugMsg);
    }

    // Check if any alien has reached the player (Y or Z axis) - disabled in free flight mode
    if (gameMode !== 'freeflight') {
      for (const alien of useGameStore.getState().aliens) {
        if (alien.position.y < -30 || alien.position.z > 5) {
          console.log('Alien reached player:', alien.position);
          damageQueueRef.current.push({
            type: 'loseLife'
          });
          return;
        }
      }
    }
  };

  return {
    processMovement
  };
};