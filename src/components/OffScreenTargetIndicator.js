import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function OffScreenTargetIndicator() {
  const meshRef = useRef();
  const { camera, size } = useThree();
  
  const selectedTarget = useGameStore((state) => state.selectedTarget);
  const targetingEnabled = useGameStore((state) => state.targetingEnabled);
  const freeLookMode = useGameStore((state) => state.freeLookMode);
  const gameMode = useGameStore((state) => state.gameMode);
  
  useFrame(() => {
    if (!meshRef.current || !selectedTarget || !targetingEnabled || gameMode !== 'freeflight' || !freeLookMode) {
      if (meshRef.current) {
        meshRef.current.visible = false;
      }
      return;
    }
    
    // Target position in world space
    const targetPos = new THREE.Vector3(
      selectedTarget.position.x,
      selectedTarget.position.y,
      selectedTarget.position.z
    );
    
    // Convert target position to screen space
    const targetScreenPos = targetPos.clone().project(camera);
    
    // Check if target is in front of camera (positive Z in camera space)
    const targetCameraSpace = targetPos.clone().applyMatrix4(camera.matrixWorldInverse);
    const isInFront = targetCameraSpace.z < 0;
    
    // Check if target is within screen bounds
    const isOnScreen = isInFront && 
      targetScreenPos.x >= -1 && targetScreenPos.x <= 1 && 
      targetScreenPos.y >= -1 && targetScreenPos.y <= 1;
    
    if (isOnScreen) {
      // Target is visible, hide indicator
      meshRef.current.visible = false;
      return;
    }
    
    // Target is off-screen, show indicator
    meshRef.current.visible = true;
    
    // Calculate direction to target on screen
    let indicatorX = targetScreenPos.x;
    let indicatorY = targetScreenPos.y;
    
    // If target is behind camera, flip the direction
    if (!isInFront) {
      indicatorX = -indicatorX;
      indicatorY = -indicatorY;
    }
    
    // Normalize to circle edge (maintain direction but clamp to circle)
    const distance = Math.sqrt(indicatorX * indicatorX + indicatorY * indicatorY);
    if (distance > 0) {
      // Place indicator on a circle with radius 0.8 (80% of screen)
      const circleRadius = 0.8;
      indicatorX = (indicatorX / distance) * circleRadius;
      indicatorY = (indicatorY / distance) * circleRadius;
    }
    
    // Simple approach: place indicator in world space relative to camera
    const indicatorDistance = 25; // Distance from camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // Get camera's right and up vectors
    const rightVector = new THREE.Vector3(1, 0, 0).transformDirection(camera.matrixWorld);
    const upVector = new THREE.Vector3(0, 1, 0).transformDirection(camera.matrixWorld);
    
    // Position indicator in front of camera at screen edge
    const basePos = camera.position.clone().add(cameraDirection.multiplyScalar(indicatorDistance));
    const finalPos = basePos.add(
      rightVector.clone().multiplyScalar(indicatorX * indicatorDistance * 0.5)
    ).add(
      upVector.clone().multiplyScalar(indicatorY * indicatorDistance * 0.5)
    );
    
    meshRef.current.position.copy(finalPos);
    
    // Make the indicator face the camera (billboard effect)
    meshRef.current.lookAt(camera.position);
    
    // Calculate rotation to point toward edge of screen (outward direction)
    const angle = Math.atan2(indicatorY, indicatorX);
    // Reset rotation and apply only the outward-pointing rotation
    meshRef.current.rotation.z = angle - Math.PI / 2; // Point triangle outward
    
    // Scale based on distance to maintain consistent size
    const scale = indicatorDistance * 0.02;
    meshRef.current.scale.setScalar(scale);
  });
  
  return (
    <group ref={meshRef} visible={false} renderOrder={1000}>
      {/* Chevron shape pointing toward target */}
      <mesh raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={3}
            array={new Float32Array([
              0, 1, 0,      // Top point
              -0.5, -0.5, 0, // Bottom left
              0.5, -0.5, 0   // Bottom right
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <meshBasicMaterial 
          color="#ff6600"
          transparent
          opacity={0.8}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Optional glow effect */}
      <mesh raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={3}
            array={new Float32Array([
              0, 1.2, 0,      // Top point (slightly larger)
              -0.6, -0.6, 0,  // Bottom left
              0.6, -0.6, 0    // Bottom right
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <meshBasicMaterial 
          color="#ff6600"
          transparent
          opacity={0.3}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default OffScreenTargetIndicator;