import * as THREE from 'three';
import { PLAYER_CONFIG } from './playerConfig';

export const updatePlayerRotationInStore = (meshRef, setPlayerRotation) => {
  // Convert quaternion back to Euler angles for game store
  const euler = new THREE.Euler();
  euler.setFromQuaternion(meshRef.current.quaternion, 'XYZ');
  setPlayerRotation({
    x: euler.x,
    y: euler.y,
    z: euler.z
  });
};

export const handleNonPointerLockedRotation = (meshRef, pointer, isPointerLocked) => {
  if (isPointerLocked) return;
  
  // Use mouse position for non-locked mode (with limits for traditional gameplay)
  const maxPitchAngle = PLAYER_CONFIG.maxPitchAngle;
  const maxYawAngle = PLAYER_CONFIG.maxYawAngle;
  
  const targetPitch = -pointer.y * maxPitchAngle * 1.5;
  const targetYaw = pointer.x * maxYawAngle * 1.5;
  
  // Clamp target angles for non-locked mode
  const clampedPitch = Math.max(-maxPitchAngle, Math.min(maxPitchAngle, targetPitch));
  const clampedYaw = Math.max(-maxYawAngle, Math.min(maxYawAngle, targetYaw));
  
  // Smooth interpolation toward target orientation
  const rotationDamping = 0.15;
  meshRef.current.rotation.x += (clampedPitch - meshRef.current.rotation.x) * rotationDamping;
  meshRef.current.rotation.y += (clampedYaw - meshRef.current.rotation.y) * rotationDamping;
  
  // Only clamp rotations in non-pointer-locked mode
  meshRef.current.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, meshRef.current.rotation.x));
};

export const handleArrowKeyRotation = (meshRef, keys, delta) => {
  if (keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight) {
    let keyboardPitch = 0;
    let keyboardYaw = 0;
    
    if (keys.ArrowUp) keyboardPitch -= PLAYER_CONFIG.pitchSpeed * delta;
    if (keys.ArrowDown) keyboardPitch += PLAYER_CONFIG.pitchSpeed * delta;
    if (keys.ArrowLeft) keyboardYaw -= PLAYER_CONFIG.yawSpeed * delta;
    if (keys.ArrowRight) keyboardYaw += PLAYER_CONFIG.yawSpeed * delta;
    
    meshRef.current.rotation.x += keyboardPitch;
    meshRef.current.rotation.y += keyboardYaw;
    
    return true;
  }
  
  return false;
};

export const updatePlayerMeshPosition = (meshRef, position) => {
  if (!meshRef.current) return;
  
  meshRef.current.position.x = position.x;
  meshRef.current.position.y = position.y;
  meshRef.current.position.z = position.z || 0;
};
