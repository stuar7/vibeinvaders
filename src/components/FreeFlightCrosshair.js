import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function FreeFlightCrosshair() {
  const meshRef = useRef();
  const freeLookMode = useGameStore((state) => state.freeLookMode);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerRotation = useGameStore((state) => state.playerRotation);
  const weapons = useGameStore((state) => state.weapons);
  const isZoomed = useGameStore((state) => state.isZoomed);
  const zoomFOV = useGameStore((state) => state.zoomFOV);
  const options = useGameStore((state) => state.options);
  const virtualJoystick = useGameStore((state) => state.virtualJoystick);
  const hitIndicator = useGameStore((state) => state.hitIndicator);
  const clearHitIndicator = useGameStore((state) => state.clearHitIndicator);
  const selectedTarget = useGameStore((state) => state.selectedTarget);
  const targetingEnabled = useGameStore((state) => state.targetingEnabled);
  
  const { camera, size } = useThree();
  
  useFrame(() => {
    if (!meshRef.current || !freeLookMode) return;
    
    // Calculate weapon firing trajectory based on ship's current rotation
    // Match the exact missile spawn calculation from useWeaponSystem.js
    const missileSpawnOffset = new THREE.Vector3(0, 0, -3);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
    );
    missileSpawnOffset.applyMatrix4(rotationMatrix);
    
    const missileSpawnPos = new THREE.Vector3(
      playerPosition.x + missileSpawnOffset.x,
      playerPosition.y + missileSpawnOffset.y,
      playerPosition.z + missileSpawnOffset.z
    );
    
    // Ship's nose points in negative Z direction
    const shipDirection = new THREE.Vector3(0, 0, -1);
    shipDirection.applyMatrix4(rotationMatrix);
    
    // Calculate dynamic crosshair position based on selected target or default distance
    const currentWeapon = weapons.current;
    let engagementDistance = currentWeapon === 'bfg' ? 100 : 60; // Default base distance
    
    // Use selected target distance if available and targeting is enabled
    if (targetingEnabled && selectedTarget) {
      const targetDistance = Math.sqrt(
        Math.pow(selectedTarget.position.x - playerPosition.x, 2) +
        Math.pow(selectedTarget.position.y - playerPosition.y, 2) +
        Math.pow(selectedTarget.position.z - (playerPosition.z || 0), 2)
      );
      
      // Use target distance but clamp to reasonable bounds (wider range for more noticeable changes)
      const newEngagementDistance = Math.max(30, Math.min(800, targetDistance));
      
      // Only log significant changes to avoid spam
      if (Math.abs(newEngagementDistance - engagementDistance) > 10) {
        console.log(`[CROSSHAIR] Distance changed: ${engagementDistance.toFixed(1)} → ${newEngagementDistance.toFixed(1)} (target: ${targetDistance.toFixed(1)})`);
      }
      
      engagementDistance = newEngagementDistance;
    }
    
    // Adjust distance when zoomed for better precision
    if (isZoomed) {
      const zoomFactor = options.fov / zoomFOV; // e.g., 75/50 = 1.5x zoom
      engagementDistance *= zoomFactor; // Increase distance proportionally to zoom
    }
    
    let crosshairPos;
    
    // Calculate dynamic crosshair position
    const dynamicCrosshairPos = missileSpawnPos.clone().add(
      shipDirection.clone().multiplyScalar(engagementDistance)
    );
    
    // Position crosshair along actual missile trajectory at target distance
    // Missiles always follow ship direction (from useWeaponSystem.js line 161-166)
    crosshairPos = dynamicCrosshairPos; // Ship direction trajectory at target distance
    
    // The targeting system shows where you SHOULD aim, but missiles go where ship points
    
    // Position the crosshair mesh at the calculated trajectory point
    meshRef.current.position.copy(crosshairPos);
    
    // Scale crosshair to maintain constant screen size regardless of distance
    const distanceToCamera = camera.position.distanceTo(crosshairPos);
    const scaleFactor = distanceToCamera * 0.01; // Adjust this multiplier to change base size
    meshRef.current.scale.setScalar(scaleFactor);
    
    // Align crosshair with ship's rotation for proper orientation
    meshRef.current.rotation.copy(new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z));
  });
  
  // Auto-clear hit indicator after 250ms
  useEffect(() => {
    if (hitIndicator.active) {
      const timer = setTimeout(() => {
        clearHitIndicator();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [hitIndicator.active, clearHitIndicator]);
  
  if (!freeLookMode) return null;
  
  // Virtual joystick calculations
  const vx = virtualJoystick.x;
  const vy = virtualJoystick.y;
  const magnitude = Math.sqrt(vx * vx + vy * vy);
  const deadZone = 7.2;
  const inDeadZone = magnitude < deadZone;
  
  // Input intensity color calculation
  let inputColor = '#00ff00';
  if (magnitude > 30) inputColor = '#ffff00';
  if (magnitude > 60) inputColor = '#ff8800';
  if (magnitude > 80) inputColor = '#ff0000';
  
  // Virtual joystick position (scaled down for display)
  const scale = 0.1;
  const cursorX = vx * scale;
  const cursorY = -vy * scale;
  
  // Pre-calculate deadzone circle vertices
  const circleVertices = [];
  for (let i = 0; i <= 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    circleVertices.push(Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0);
  }
  
  return (
    <group ref={meshRef} raycast={() => null} renderOrder={999}>
      {/* Simple center crosshair for 6DOF flight mode */}
      
      {/* Left crosshair line - extends from larger deadzone box */}
      <mesh position={[-2.52, 0, 0]} raycast={() => null} renderOrder={999}>
        <boxGeometry args={[1.68, 0.12, 0.12]} />
        <meshBasicMaterial 
          color={hitIndicator.active ? "#66ff66" : "#00ff00"}
          transparent
          opacity={hitIndicator.active ? 1.0 : 0.6}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Right crosshair line - extends from larger deadzone box */}
      <mesh position={[2.52, 0, 0]} raycast={() => null} renderOrder={999}>
        <boxGeometry args={[1.68, 0.12, 0.12]} />
        <meshBasicMaterial 
          color={hitIndicator.active ? "#66ff66" : "#00ff00"}
          transparent
          opacity={hitIndicator.active ? 1.0 : 0.6}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Top crosshair line - extends from larger deadzone box */}
      <mesh position={[0, 2.52, 0]} raycast={() => null} renderOrder={999}>
        <boxGeometry args={[0.12, 1.68, 0.12]} />
        <meshBasicMaterial 
          color={hitIndicator.active ? "#66ff66" : "#00ff00"}
          transparent
          opacity={hitIndicator.active ? 1.0 : 0.6}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Bottom crosshair line - extends from larger deadzone box */}
      <mesh position={[0, -2.52, 0]} raycast={() => null} renderOrder={999}>
        <boxGeometry args={[0.12, 1.68, 0.12]} />
        <meshBasicMaterial 
          color={hitIndicator.active ? "#66ff66" : "#00ff00"}
          transparent
          opacity={hitIndicator.active ? 1.0 : 0.6}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Center dot - 20% larger */}
      <mesh raycast={() => null} renderOrder={999}>
        <circleGeometry args={[0.24, 8]} />
        <meshBasicMaterial 
          color="#ffffff"
          transparent
          opacity={0.9}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Corner brackets for space sim feel - 20% larger and further out */}
      {[
        { pos: [1.8, 1.8, 0], rot: [0, 0, 0] },
        { pos: [-1.8, 1.8, 0], rot: [0, 0, Math.PI/2] },
        { pos: [-1.8, -1.8, 0], rot: [0, 0, Math.PI] },
        { pos: [1.8, -1.8, 0], rot: [0, 0, -Math.PI/2] }
      ].map((bracket, index) => (
        <group key={index} position={bracket.pos} rotation={bracket.rot}>
          {/* L-shaped bracket - 20% larger */}
          <mesh position={[0.36, 0, 0]} raycast={() => null} renderOrder={999}>
            <boxGeometry args={[0.72, 0.096, 0.096]} />
            <meshBasicMaterial 
              color={hitIndicator.active ? "#66ff66" : "#00ff00"}
              transparent
              opacity={hitIndicator.active ? 1.0 : 0.6}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0.36, 0]} raycast={() => null} renderOrder={999}>
            <boxGeometry args={[0.096, 0.72, 0.096]} />
            <meshBasicMaterial 
              color={hitIndicator.active ? "#66ff66" : "#00ff00"}
              transparent
              opacity={hitIndicator.active ? 1.0 : 0.6}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
      
      {/* Virtual Joystick Elements */}
      
      {/* Deadzone circle - filled background */}
      <mesh raycast={() => null} renderOrder={998}>
        <circleGeometry args={[0.72, 32]} />
        <meshBasicMaterial 
          color="#000000"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Deadzone circle outline */}
      <lineLoop raycast={() => null} renderOrder={998}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={33}
            array={new Float32Array(circleVertices)}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color="#666666" 
          transparent
          opacity={0.6}
          depthTest={false}
        />
      </lineLoop>
      
      {/* Input velocity line */}
      <line raycast={() => null} renderOrder={1000}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0.1, cursorX, cursorY, 0.1])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color={inputColor}
          linewidth={5}
          transparent
          opacity={0.9}
          depthTest={false}
        />
      </line>
      
      {/* Mouse cursor position dot */}
      <mesh 
        position={[cursorX, cursorY, 0.1]}
        raycast={() => null}
        renderOrder={1001}
      >
        <circleGeometry args={[0.15, 8]} />
        <meshBasicMaterial 
          color="#ffffff"
          transparent
          opacity={0.9}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Hit indicator - expanding ring effect */}
      {hitIndicator.active && (
        <mesh raycast={() => null} renderOrder={1002}>
          <ringGeometry args={[0.5, 0.8, 16]} />
          <meshBasicMaterial 
            color="#00ff00"
            transparent
            opacity={0.8}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Hit indicator - center flash */}
      {hitIndicator.active && (
        <mesh raycast={() => null} renderOrder={1003}>
          <circleGeometry args={[0.3, 16]} />
          <meshBasicMaterial 
            color="#ffffff"
            transparent
            opacity={0.6}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

export default FreeFlightCrosshair;