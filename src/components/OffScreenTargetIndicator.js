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
    
    // Convert screen coordinates back to world space at a fixed distance from camera
    const indicatorDistance = 20; // Distance from camera
    const indicatorWorldPos = new THREE.Vector3(indicatorX, indicatorY, 0.5).unproject(camera);
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const finalPos = camera.position.clone().add(cameraDirection.multiplyScalar(indicatorDistance));
    
    // Adjust for screen position
    const rightVector = new THREE.Vector3(1, 0, 0).transformDirection(camera.matrixWorld);
    const upVector = new THREE.Vector3(0, 1, 0).transformDirection(camera.matrixWorld);
    
    finalPos.add(rightVector.multiplyScalar(indicatorX * indicatorDistance * 0.5));
    finalPos.add(upVector.multiplyScalar(indicatorY * indicatorDistance * 0.5));
    
    meshRef.current.position.copy(finalPos);
    
    // Make the indicator face the camera (billboard effect)
    meshRef.current.lookAt(camera.position);
    
    // Calculate rotation to point toward target (only around local Z axis)
    const angle = Math.atan2(indicatorY, indicatorX);
    // Apply additional rotation around the forward axis to point the triangle
    meshRef.current.rotateZ(angle - Math.PI / 2); // Adjust for chevron orientation
    
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