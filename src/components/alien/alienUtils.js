import * as THREE from 'three';
import { ALIEN_CONFIG } from './alienConfig';

export const getAlienColor = (type, isHighlighted = false) => {
  const alienType = ALIEN_CONFIG.alienTypes[type];
  const baseColor = alienType ? alienType.color : ALIEN_CONFIG.defaultColor;
  
  // Brighten color when highlighted
  if (isHighlighted) {
    const color = new THREE.Color(baseColor);
    color.lerp(new THREE.Color('#ffffff'), ALIEN_CONFIG.highlightMixRatio);
    return `#${color.getHexString()}`;
  }
  
  return baseColor;
};

export const getComponentColor = (alien, component, isHighlighted = false) => {
  const baseColor = new THREE.Color(getAlienColor(alien.type, isHighlighted));
  
  if (alien.shipComponents && alien.shipComponents[component]) {
    const hpRatio = alien.shipComponents[component].hp / alien.shipComponents[component].maxHp;
    // Reduce brightness based on damage (0.3 = 30% minimum brightness)
    const damageMultiplier = Math.max(ALIEN_CONFIG.damageMinBrightness, hpRatio);
    baseColor.multiplyScalar(damageMultiplier);
  }
  
  return baseColor;
};

export const applyHitRecoil = (alien, meshRef) => {
  let recoilOffset = { x: 0, y: 0, z: 0 };
  
  if (alien.hitRecoil && alien.hitRecoil.intensity > 0.01) {
    recoilOffset.x = alien.hitRecoil.direction.x * alien.hitRecoil.intensity;
    recoilOffset.y = alien.hitRecoil.direction.y * alien.hitRecoil.intensity;
    recoilOffset.z = alien.hitRecoil.direction.z * alien.hitRecoil.intensity;
    
    // Decay the recoil
    alien.hitRecoil.intensity *= ALIEN_CONFIG.hitRecoilDecay;
  }
  
  return recoilOffset;
};

export const applyAlienRotation = (alien, meshRef, playerPosition) => {
  if (alien.enemyShip) {
    // Use enemy ship's rotation for proper facing
    const enemyRotation = alien.enemyShip.rotation;
    meshRef.current.rotation.x = enemyRotation.x;
    meshRef.current.rotation.y = enemyRotation.y + Math.PI; // Add 180 degree correction
    meshRef.current.rotation.z = enemyRotation.z;
  } else {
    // Legacy behavior - look at player
    const lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(
      new THREE.Vector3(alien.position.x, alien.position.y, alien.position.z),
      new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z),
      new THREE.Vector3(0, 1, 0)
    );
    
    // Extract rotation from matrix and apply
    const lookAtQuaternion = new THREE.Quaternion();
    lookAtQuaternion.setFromRotationMatrix(lookAtMatrix);
    
    // Add 180 degree rotation since aliens need to face forward (they're already rotated 180 in geometry)
    const additionalRotation = new THREE.Quaternion();
    additionalRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    
    // Apply the look-at rotation with 180 degree correction
    meshRef.current.quaternion.copy(lookAtQuaternion);
    meshRef.current.quaternion.multiply(additionalRotation);
  }
};

export const applyTypeSpecificBehavior = (alien, meshRef) => {
  const { type } = alien;
  
  switch (type) {
    case 1: // Scout - no special behavior
      break;
    case 2: // Armored - no special behavior
      break;
    case 3: // Elite - no special behavior
      break;
    case 4: // Boss - larger scale
      meshRef.current.scale.setScalar(ALIEN_CONFIG.alienTypes[4].scale);
      break;
    default:
      // Default behavior for any other alien types
      break;
  }
  
  // Keep constant scale for non-boss aliens
  if (type !== 4) {
    meshRef.current.scale.setScalar(1);
  }
};