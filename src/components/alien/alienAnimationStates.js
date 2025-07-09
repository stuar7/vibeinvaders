import { applyHitRecoil, applyAlienRotation, applyTypeSpecificBehavior } from './alienUtils';

export const updateFlyingAlienAnimation = (alien, meshRef, position, recoilOffset) => {
  // Flying aliens - no swaying, stable flight
  // Apply position with recoil
  meshRef.current.position.x = position.x + recoilOffset.x;
  meshRef.current.position.y = position.y + recoilOffset.y;
  meshRef.current.position.z = position.z + recoilOffset.z;
  
  // No rotation animations - keep stable
  // No pulsing effect - keep constant size
};

export const updateCombatAlienAnimation = (alien, meshRef, position, recoilOffset, playerPosition) => {
  // Apply position with recoil
  meshRef.current.position.x = position.x + recoilOffset.x;
  meshRef.current.position.y = position.y + recoilOffset.y;
  meshRef.current.position.z = position.z + recoilOffset.z;
  
  // Apply rotation based on enemy ship or look at player
  applyAlienRotation(alien, meshRef, playerPosition);
  
  // Apply type-specific behaviors
  applyTypeSpecificBehavior(alien, meshRef);
};

export const updateAlienFrame = (alien, meshRef, playerPosition) => {
  if (!meshRef.current) return;
  
  const { position, isFlying } = alien;
  
  // Hit recoil effect for Star Fox 64-style impact feedback
  const recoilOffset = applyHitRecoil(alien, meshRef);
  
  if (isFlying) {
    updateFlyingAlienAnimation(alien, meshRef, position, recoilOffset);
  } else {
    updateCombatAlienAnimation(alien, meshRef, position, recoilOffset, playerPosition);
  }
};