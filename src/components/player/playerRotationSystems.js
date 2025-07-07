import * as THREE from 'three';
import { PLAYER_CONFIG } from './playerConfig';

export const applyFreeFlightRotation = ({ 
  meshRef, 
  isPointerLocked, 
  virtualJoystickLocal, 
  rotationDamping, 
  setRotationDamping, 
  delta 
}) => {
  if (!isPointerLocked) {
    // Non-locked mode: use limited rotation based on pointer position
    return false;
  }
  
  // Star Citizen style virtual joystick - continuous rotation rate based on distance from center
  const virtualJoystickInput = virtualJoystickLocal;
  const deadZoneRadius = PLAYER_CONFIG.deadZoneRadius;
  
  // Calculate distance from center
  const inputMagnitude = Math.sqrt(virtualJoystickInput.x * virtualJoystickInput.x + 
                                 virtualJoystickInput.y * virtualJoystickInput.y);
  
  // Calculate target rotation rates
  let targetPitchRate = 0;
  let targetYawRate = 0;
  
  const maxRadius = PLAYER_CONFIG.virtualJoystickMaxRadius;
  const normalizedMagnitude = Math.min(inputMagnitude / maxRadius, 1.0);
  
  // Convert joystick position to world-space rotation rates
  const maxRotationRate = PLAYER_CONFIG.maxRotationRate * delta;
  let rotationRate = normalizedMagnitude * maxRotationRate;
  
  // Check if we're in dead zone
  const isInDeadZone = inputMagnitude <= deadZoneRadius;
  
  // Calculate rotation rates from virtual joystick input
  if (inputMagnitude > 0.001) {
    targetPitchRate = -virtualJoystickInput.y / inputMagnitude * rotationRate;
    targetYawRate = -virtualJoystickInput.x / inputMagnitude * rotationRate;
    
    // Clear any existing damping when there's active input
    if (rotationDamping.active) {
      setRotationDamping({
        active: false,
        startTime: 0,
        duration: PLAYER_CONFIG.rotationDampingDuration,
        startPitchRate: 0,
        startYawRate: 0,
        wasInDeadZone: false
      });
    }
    
    // In dead zone: allow movement but reduce intensity for fine control
    if (isInDeadZone) {
      const deadZoneFactor = inputMagnitude / deadZoneRadius;
      targetPitchRate *= deadZoneFactor;
      targetYawRate *= deadZoneFactor;
    }
  } else {
    // No input - start damping to stop rotation
    if (!rotationDamping.active) {
      const currentPitchRate = rotationDamping.startPitchRate || 0;
      const currentYawRate = rotationDamping.startYawRate || 0;
      
      if (Math.abs(currentPitchRate) > 0.001 || Math.abs(currentYawRate) > 0.001) {
        const currentSpeed = Math.sqrt(currentPitchRate * currentPitchRate + currentYawRate * currentYawRate);
        const dampingTime = Math.max(PLAYER_CONFIG.minDampingTime, 
                                   Math.min(PLAYER_CONFIG.maxDampingTime, currentSpeed * 1000));
        
        setRotationDamping({
          active: true,
          startTime: Date.now(),
          duration: dampingTime,
          startPitchRate: currentPitchRate,
          startYawRate: currentYawRate,
          wasInDeadZone: false
        });
      }
    }
    
    if (rotationDamping.active) {
      const elapsed = Date.now() - rotationDamping.startTime;
      const progress = Math.min(elapsed / rotationDamping.duration, 1.0);
      const dampingFactor = 1.0 - progress;
      
      targetPitchRate = rotationDamping.startPitchRate * dampingFactor;
      targetYawRate = rotationDamping.startYawRate * dampingFactor;
      
      if (progress >= 1.0) {
        setRotationDamping({
          active: false,
          startTime: 0,
          duration: PLAYER_CONFIG.rotationDampingDuration,
          startPitchRate: 0,
          startYawRate: 0,
          wasInDeadZone: false
        });
        targetPitchRate = 0;
        targetYawRate = 0;
      }
    }
  }
  
  // Store current rates for next frame
  setRotationDamping(prev => ({
    ...prev,
    startPitchRate: targetPitchRate,
    startYawRate: targetYawRate
  }));
  
  // Apply rotation if we have any
  if (Math.abs(targetPitchRate) > 0.0001 || Math.abs(targetYawRate) > 0.0001) {
    const currentQuaternion = meshRef.current.quaternion.clone();
    
    const pitchQuat = new THREE.Quaternion();
    const yawQuat = new THREE.Quaternion();
    
    pitchQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), targetPitchRate);
    yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetYawRate);
    
    currentQuaternion.multiply(yawQuat);
    currentQuaternion.multiply(pitchQuat);
    
    meshRef.current.quaternion.copy(currentQuaternion);
  }
  
  return true;
};

export const applyRollControls = ({ 
  meshRef, 
  keys, 
  rollAcceleration, 
  setRollAcceleration, 
  setPlayerRotationalVelocity, 
  delta 
}) => {
  if (keys.KeyQ || keys.KeyE) {
    const currentDirection = keys.KeyQ ? -1 : 1;
    
    // Update roll acceleration state
    setRollAcceleration(prev => {
      const isSameDirection = prev.direction === currentDirection;
      const newHoldTime = isSameDirection ? prev.holdTime + delta : 0;
      
      return {
        isRolling: true,
        direction: currentDirection,
        holdTime: Math.min(newHoldTime, prev.maxHoldTime),
        maxHoldTime: prev.maxHoldTime
      };
    });
    
    // Calculate acceleration factor
    const accelerationFactor = Math.min(rollAcceleration.holdTime / rollAcceleration.maxHoldTime, 1.0);
    const easedAcceleration = accelerationFactor * accelerationFactor;
    
    // Calculate final roll speed with acceleration
    const acceleratedRollSpeed = PLAYER_CONFIG.rollSpeed * 
      (PLAYER_CONFIG.rollAccelerationStart + easedAcceleration * (1 - PLAYER_CONFIG.rollAccelerationStart));
    const rollDelta = currentDirection * acceleratedRollSpeed * delta;
    
    // Get current quaternion
    const currentQuat = meshRef.current.quaternion.clone();
    
    // Create roll quaternion in local space
    const rollQuat = new THREE.Quaternion();
    rollQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollDelta);
    
    // Apply roll in local space
    currentQuat.multiply(rollQuat);
    meshRef.current.quaternion.copy(currentQuat);
    
    // Track rotational velocity for debug display
    const rollVelocity = rollDelta / delta;
    setPlayerRotationalVelocity({ 
      x: 0, 
      y: 0, 
      z: rollVelocity 
    });
  } else {
    // Reset roll acceleration state when not rotating
    setRollAcceleration(prev => ({
      ...prev,
      isRolling: false,
      direction: 0,
      holdTime: 0
    }));
    
    setPlayerRotationalVelocity({ x: 0, y: 0, z: 0 });
  }
};

export const applyCursorAimingRotation = ({ meshRef, pointer, camera, dummy, delta }) => {
  // Convert screen cursor to world position using proper raycasting
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  
  // Create a plane at the targeting distance to intersect with
  const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 50);
  const cursorWorld = new THREE.Vector3();
  raycaster.ray.intersectPlane(targetPlane, cursorWorld);
  
  if (cursorWorld) {
    // Clamp cursor position to extended bounds for greater turning range
    const gamespaceCenter = { x: 0, y: 12 };
    const gamespaceWidth = 36 * 1.5;
    const gamespaceHeight = 20 * 1.5;
    
    const finalCursorWorld = new THREE.Vector3(
      Math.max(gamespaceCenter.x - gamespaceWidth/2, Math.min(gamespaceCenter.x + gamespaceWidth/2, cursorWorld.x)),
      Math.max(gamespaceCenter.y - gamespaceHeight/2, Math.min(gamespaceCenter.y + gamespaceHeight/2, cursorWorld.y)),
      cursorWorld.z
    );
    
    // Calculate direction from player to cursor position
    const playerPos = meshRef.current.position;
    const direction = new THREE.Vector3().subVectors(finalCursorWorld, playerPos).normalize();
    
    // Since the ship's nose points in negative Z direction, we need to invert the lookAt direction
    const targetPos = new THREE.Vector3().addVectors(playerPos, direction.multiplyScalar(-15));
    
    // Make dummy object look at target position
    dummy.position.copy(playerPos);
    dummy.lookAt(targetPos);
    
    // Smoothly interpolate player rotation toward cursor direction
    const dampingFactor = 0.15;
    const t = 1 - Math.pow(1 - dampingFactor, delta * 60);
    meshRef.current.quaternion.slerp(dummy.quaternion, t);
  }
};

export const applyStarFoxBanking = ({ meshRef, keys, playerVelocity, playerPowerUps, elapsedTime }) => {
  // Banking based on velocity, not just input
  let bankAngle = -playerVelocity.x * PLAYER_CONFIG.bankingFactor;
  let pitchAngle = playerVelocity.y * PLAYER_CONFIG.pitchingFactor;
  
  // Additional banking based on input for responsiveness
  if (keys.ArrowLeft || keys.KeyA) {
    bankAngle += 0.25;
  } else if (keys.ArrowRight || keys.KeyD) {
    bankAngle -= 0.25;
  }
  
  if (keys.ArrowUp || keys.KeyW) {
    pitchAngle -= 0.15;
  } else if (keys.ArrowDown || keys.KeyS) {
    pitchAngle += 0.15;
  }
  
  // Clamp angles
  bankAngle = Math.max(-PLAYER_CONFIG.maxBankAngle, Math.min(PLAYER_CONFIG.maxBankAngle, bankAngle));
  pitchAngle = Math.max(-PLAYER_CONFIG.maxPitchAngle, Math.min(PLAYER_CONFIG.maxPitchAngle, pitchAngle));
  
  if (playerPowerUps.shield) {
    meshRef.current.rotation.z = bankAngle + Math.sin(elapsedTime * 5) * 0.02;
    meshRef.current.rotation.x = pitchAngle + Math.sin(elapsedTime * 3) * 0.01;
  } else {
    meshRef.current.rotation.z = bankAngle;
    meshRef.current.rotation.x = pitchAngle;
  }
};

export const applySomersaultRoll = ({ 
  meshRef, 
  doubleTapState, 
  setDoubleTapState, 
  useGameStore, 
  clockTime 
}) => {
  const currentTime = Date.now();
  const elapsed = currentTime - doubleTapState.rollStartTime;
  const rollProgress = Math.min(elapsed / doubleTapState.rollDuration, 1.0);
  
  // Apply barrel roll rotation
  meshRef.current.rotation.z = -doubleTapState.rollDirection * rollProgress * Math.PI * 2;
  
  // Apply lateral movement during roll
  const moveProgress = rollProgress;
  const easeOutQuad = 1 - Math.pow(1 - moveProgress, 2);
  const lateralOffset = easeOutQuad * doubleTapState.rollDistance * doubleTapState.rollDirection;
  
  // Update player position through game store
  const currentPos = useGameStore.getState().playerPosition;
  const rollStartX = doubleTapState.rollStartX || currentPos.x;
  const newX = rollStartX + lateralOffset;
  
  useGameStore.getState().setPlayerPosition({ 
    x: newX, 
    y: currentPos.y, 
    z: currentPos.z 
  });
  
  // Create wing trail effects
  if (rollProgress < 1.0) {
    const wingTipLeft = new THREE.Vector3(-1.8, 0, 0);
    const wingTipRight = new THREE.Vector3(1.8, 0, 0);
    
    // Transform wing tips to world space
    wingTipLeft.applyMatrix4(meshRef.current.matrixWorld);
    wingTipRight.applyMatrix4(meshRef.current.matrixWorld);
    
    // Add to trail arrays
    doubleTapState.wingTrails.left.push({
      position: wingTipLeft.clone(),
      time: clockTime
    });
    doubleTapState.wingTrails.right.push({
      position: wingTipRight.clone(),
      time: clockTime
    });
    
    // Remove old trail points
    const maxTrailAge = 0.5;
    doubleTapState.wingTrails.left = doubleTapState.wingTrails.left.filter(
      point => clockTime - point.time < maxTrailAge
    );
    doubleTapState.wingTrails.right = doubleTapState.wingTrails.right.filter(
      point => clockTime - point.time < maxTrailAge
    );
  }
  
  // End roll when complete
  if (rollProgress >= 1.0) {
    // Preserve momentum: add roll velocity to current player velocity
    const currentVelocity = useGameStore.getState().playerVelocity || { x: 0, y: 0, z: 0 };
    const rollMomentum = (doubleTapState.rollDirection || 0) * 2.0;
    
    useGameStore.getState().updatePlayerVelocity(
      (currentVelocity.x || 0) + rollMomentum,
      currentVelocity.y || 0,
      currentVelocity.z || 0
    );
    
    setDoubleTapState(prev => ({
      ...prev,
      isRolling: false,
      rollProgress: 0,
      rollDirection: 0,
      rollStartTime: 0,
      rollStartX: undefined,
      wingTrails: { left: [], right: [] }
    }));
    meshRef.current.rotation.z = 0;
    
    return rollProgress;
  }
  
  return rollProgress;
};
