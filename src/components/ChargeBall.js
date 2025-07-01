import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

function ChargeBall() {
  const meshRef = useRef();
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerRotation = useGameStore((state) => state.playerRotation);
  const chargeWeapon = useGameStore((state) => state.chargeWeapon);
  const weapons = useGameStore((state) => state.weapons);
  
  // Only show charge ball when charge weapon is selected and charging
  const isVisible = weapons.current === 'charge' && chargeWeapon.isCharging && chargeWeapon.chargeLevel > 0;
  
  useFrame((state) => {
    if (meshRef.current && isVisible && playerPosition && playerRotation) {
      // Calculate position in front of ship based on ship's rotation
      const forwardOffset = new THREE.Vector3(0, 0, -6); // 6 units forward in ship's local space
      const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
      );
      forwardOffset.applyMatrix4(rotationMatrix); // Transform to world space
      
      // Position the ball in front of the ship
      meshRef.current.position.set(
        playerPosition.x + forwardOffset.x,
        playerPosition.y + forwardOffset.y,
        playerPosition.z + forwardOffset.z
      );
      
      // Pulsing effect based on charge level
      const pulseSpeed = 3 + chargeWeapon.chargeLevel; // Faster pulse with more charge
      const pulse = Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
      
      // Rotation for visual effect
      meshRef.current.rotation.x += 0.05;
      meshRef.current.rotation.y += 0.03;
    }
  });
  
  if (!isVisible) {
    return null;
  }
  
  // Calculate size based on charge level (0.5 to 2.5 units)
  const baseSize = 0.5 + (chargeWeapon.chargeLevel * 0.4);
  
  // Color based on charge level (blue -> green -> yellow -> orange -> red)
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
  
  const chargeColor = getChargeColor(chargeWeapon.chargeLevel);
  
  return (
    <group ref={meshRef} renderOrder={20}>
      {/* Main charge ball */}
      <mesh renderOrder={20}>
        <sphereGeometry args={[baseSize, 16, 12]} />
        <meshBasicMaterial 
          color={chargeColor} 
          transparent 
          opacity={0.8}
          depthTest={false}
        />
      </mesh>
      
      {/* Outer energy ring */}
      <mesh renderOrder={19}>
        <sphereGeometry args={[baseSize * 1.3, 16, 12]} />
        <meshBasicMaterial 
          color={chargeColor} 
          transparent 
          opacity={0.3}
          wireframe
          depthTest={false}
        />
      </mesh>
      
      {/* Inner core */}
      <mesh renderOrder={21}>
        <sphereGeometry args={[baseSize * 0.3, 8, 6]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.9}
          depthTest={false}
        />
      </mesh>
      
      {/* Light effect */}
      <pointLight 
        color={chargeColor} 
        intensity={chargeWeapon.chargeLevel * 10} 
        distance={baseSize * 5} 
      />
    </group>
  );
}

export default ChargeBall;