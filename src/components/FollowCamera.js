import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import { GAMESPACE_CENTER } from '../config/UnifiedGamespace';
import * as THREE from 'three';

function FollowCamera() {
  const cameraRef = useRef();
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerRotation = useGameStore((state) => state.playerRotation);
  const isZoomed = useGameStore((state) => state.isZoomed);
  const zoomFOV = useGameStore((state) => state.zoomFOV);
  const { pointer } = useThree();
  
  // Star Fox 64-style camera state
  const [cameraState, setCameraState] = useState({
    position: { x: 0, y: GAMESPACE_CENTER.y + 10, z: 20 },
    rotation: { x: -0.15, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    shake: { x: 0, y: 0, z: 0, intensity: 0 },
    fov: 80,
    freelookOffset: { x: 0, y: 0 } // Mouse-based offset for free look
  });
  
  const baseCameraDistance = 13.2; // 40% closer (22 * 0.6 = 13.2)
  const cameraHeight = 9; // Increased by 2 units from 7
  
  useFrame((state, delta) => {
    if (cameraRef.current && playerPosition) {
      const camera = cameraRef.current;
      const freeLookMode = useGameStore.getState().freeLookMode;
      const playerVelocity = useGameStore.getState().playerVelocity;
      
      // Update freelook offset based on mouse position
      if (freeLookMode) {
        const maxOffset = 15; // Maximum camera offset
        cameraState.freelookOffset.x = pointer.x * maxOffset;
        cameraState.freelookOffset.y = pointer.y * maxOffset;
      } else {
        // Smoothly return to center when not in freelook
        cameraState.freelookOffset.x *= 0.9;
        cameraState.freelookOffset.y *= 0.9;
      }
      
      // Dynamic FOV based on forward velocity (when flying forward/partially forward)
      const baseFOV = 80;
      const maxFOVReduction = 5;
      
      // Calculate forward velocity component (Z-axis is forward direction when negative)
      const forwardVelocity = Math.abs(playerVelocity.z); // Use absolute value since forward is negative Z
      const maxForwardVelocity = 15; // Estimate of max forward speed based on new settings
      
      // Linear reduction: 0 velocity = no reduction, max velocity = max reduction
      const velocityRatio = Math.min(forwardVelocity / maxForwardVelocity, 1.0);
      const fovReduction = velocityRatio * maxFOVReduction;
      let dynamicFOV = baseFOV - fovReduction;
      
      // Apply zoom if active (override dynamic FOV when zoomed)
      if (isZoomed) {
        dynamicFOV = zoomFOV;
      }
      
      // Smoothly interpolate FOV changes
      cameraState.fov = cameraState.fov + (dynamicFOV - cameraState.fov) * 0.1;
      
      // Calculate target position with Star Fox 64-style lag (more responsive in freelook mode)
      const followMultiplier = freeLookMode ? 1.0 : 0.7; // Full following in freelook, reduced normally
      const targetX = playerPosition.x * followMultiplier + cameraState.freelookOffset.x;
      const targetY = GAMESPACE_CENTER.y + cameraHeight + (playerPosition.y - GAMESPACE_CENTER.y) * (freeLookMode ? 1.0 : 0.4) + cameraState.freelookOffset.y;
      const targetZ = (playerPosition.z || 0) + (freeLookMode ? baseCameraDistance * 2.5 : baseCameraDistance); // Follow player Z position
      
      // Smooth camera banking and pitching
      let targetBankingZ = -cameraState.velocity.x * 0.02; // Gentle banking opposite to movement
      let targetPitchX = -0.15; // Base pitch to look down at action
      
      // Very subtle pitch adjustments based on velocity, not input
      targetPitchX += -cameraState.velocity.y * 0.01; // Gentle pitch based on vertical movement
      
      // Smooth interpolation of camera rotation (no sudden changes)
      const rotationLerpSpeed = 0.1;
      cameraState.rotation.x += (targetPitchX - cameraState.rotation.x) * rotationLerpSpeed;
      cameraState.rotation.z += (targetBankingZ - cameraState.rotation.z) * rotationLerpSpeed;
      
      // Add momentum and inertia to camera movement (more responsive in freelook mode)
      const followStrength = freeLookMode ? 0.15 : 0.08; // Faster following in freelook mode
      const dampening = freeLookMode ? 0.9 : 0.85; // Less dampening in freelook mode
      
      // Update camera velocity (momentum-based movement)
      cameraState.velocity.x += (targetX - cameraState.position.x) * followStrength;
      cameraState.velocity.y += (targetY - cameraState.position.y) * followStrength;
      cameraState.velocity.z += (targetZ - cameraState.position.z) * followStrength;
      
      // Apply dampening to velocity
      cameraState.velocity.x *= dampening;
      cameraState.velocity.y *= dampening;
      cameraState.velocity.z *= dampening;
      
      // Update camera position
      cameraState.position.x += cameraState.velocity.x;
      cameraState.position.y += cameraState.velocity.y;
      cameraState.position.z += cameraState.velocity.z;
      
      // Dynamic FOV based on movement intensity (Star Fox 64 style)
      const movementIntensity = Math.abs(cameraState.velocity.x) + Math.abs(cameraState.velocity.y);
      const targetFov = 80 + movementIntensity * 5; // Wider FOV during intense movement
      cameraState.fov += (targetFov - cameraState.fov) * 0.1;
      
      // Update camera shake (for impacts)
      if (cameraState.shake.intensity > 0) {
        cameraState.shake.x = (Math.random() - 0.5) * cameraState.shake.intensity;
        cameraState.shake.y = (Math.random() - 0.5) * cameraState.shake.intensity;
        cameraState.shake.z = (Math.random() - 0.5) * cameraState.shake.intensity;
        cameraState.shake.intensity *= 0.9; // Decay shake
      }
      
      if (freeLookMode && playerRotation) {
        // In free flight mode, attach camera to ship and rotate with it
        // Create a transformation matrix from ship's rotation
        const shipRotationMatrix = new THREE.Matrix4();
        shipRotationMatrix.makeRotationFromEuler(new THREE.Euler(
          playerRotation.x || 0,
          playerRotation.y || 0,
          playerRotation.z || 0,
          'XYZ'
        ));
        
        // Define camera offset in ship's local space (behind and above ship)
        const localCameraOffset = new THREE.Vector3(0, 3, 20); // Above and behind ship
        
        // Transform camera offset to world space based on ship rotation
        const worldCameraOffset = localCameraOffset.clone();
        worldCameraOffset.applyMatrix4(shipRotationMatrix);
        
        // Position camera relative to ship
        camera.position.set(
          playerPosition.x + worldCameraOffset.x + cameraState.shake.x,
          playerPosition.y + worldCameraOffset.y + cameraState.shake.y,
          (playerPosition.z || 0) + worldCameraOffset.z + cameraState.shake.z
        );
        
        // Create camera's rotation to match ship's orientation
        // First set the camera's rotation to match the ship
        camera.rotation.set(
          playerRotation.x,
          playerRotation.y,
          playerRotation.z,
          'XYZ'
        );
        
        // Then apply camera shake
        camera.rotation.x += cameraState.shake.x * 0.1;
        camera.rotation.y += cameraState.shake.y * 0.1;
        camera.rotation.z += cameraState.shake.z * 0.1;
      } else {
        // Normal mode - traditional Star Fox camera
        // Apply position with shake
        camera.position.set(
          cameraState.position.x + cameraState.shake.x,
          cameraState.position.y + cameraState.shake.y,
          cameraState.position.z + cameraState.shake.z
        );
        
        // Apply smooth rotation with shake
        camera.rotation.set(
          cameraState.rotation.x + cameraState.shake.x * 0.1,
          cameraState.shake.y * 0.1,
          cameraState.rotation.z + cameraState.shake.z * 0.1
        );
      }
      
      // Update FOV
      camera.fov = cameraState.fov;
      camera.updateProjectionMatrix();
      
      setCameraState({ ...cameraState });
    }
  });
  
  // Expose camera shake function to game store
  React.useEffect(() => {
    const triggerCameraShake = (intensity = 0.5) => {
      setCameraState(prev => ({
        ...prev,
        shake: { ...prev.shake, intensity }
      }));
    };
    
    // Add to game store for other components to use
    useGameStore.setState({ triggerCameraShake });
  }, []);
  
  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, GAMESPACE_CENTER.y + 7, 13.2]}
      rotation={[-0.15, 0, 0]}
      fov={cameraState.fov}
      near={0.1}
      far={5000}
    />
  );
}

export default FollowCamera;