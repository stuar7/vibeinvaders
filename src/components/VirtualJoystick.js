import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function VirtualJoystick() {
  const meshRef = useRef();
  const freeLookMode = useGameStore((state) => state.freeLookMode);
  const virtualJoystick = useGameStore((state) => state.virtualJoystick);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerRotation = useGameStore((state) => state.playerRotation);
  const weapons = useGameStore((state) => state.weapons);
  
  useFrame(() => {
    if (!meshRef.current || !freeLookMode) return;
    
    // Calculate crosshair position (same logic as FreeFlightCrosshair)
    const missileSpawnPos = new THREE.Vector3(
      playerPosition.x, 
      playerPosition.y, 
      playerPosition.z - 3
    );
    
    const shipDirection = new THREE.Vector3(0, 0, -1);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
    );
    shipDirection.applyMatrix4(rotationMatrix);
    
    const currentWeapon = weapons.current;
    const engagementDistance = currentWeapon === 'bfg' ? 100 : 60;
    
    const crosshairPos = missileSpawnPos.clone().add(
      shipDirection.clone().multiplyScalar(engagementDistance)
    );
    
    // Position virtual joystick AT the crosshair position (no offset)
    meshRef.current.position.copy(crosshairPos);
    
    // Align joystick with ship's rotation to match crosshair coordinate system
    meshRef.current.rotation.copy(new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z));
  });
  
  if (!freeLookMode) return null;
  
  // TEMPORARY FIX: Use simple variables to avoid lexical declaration issues
  const vx = virtualJoystick.x;
  const vy = virtualJoystick.y;
  const magnitude = Math.sqrt(vx * vx + vy * vy);
  const deadZone = 7.2;
  const inDeadZone = magnitude < deadZone;
  
  // Simple color calculation
  let color = '#00ff00';
  if (magnitude > 30) color = '#ffff00';
  if (magnitude > 60) color = '#ff8800';
  if (magnitude > 80) color = '#ff0000';
  
  // Simple position calculation
  const scale = 0.1;
  // Always show the actual mouse position, regardless of deadzone
  let lineEndX = vx * scale;
  let lineEndY = -vy * scale;
  
  // Pre-calculate arrays
  const circleVertices = [];
  for (let i = 0; i <= 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    circleVertices.push(Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0);
  }
  
  return (
    <group ref={meshRef} raycast={() => null}>
      
      {/* Visible deadzone circle */}
      <mesh raycast={() => null}>
        <circleGeometry args={[0.72, 32]} />
        <meshBasicMaterial 
          color="#000000"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Deadzone circle outline */}
      <lineLoop raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={33}
            array={new Float32Array(circleVertices)}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#666666" />
      </lineLoop>
      
      {/* Velocity line */}
      <line raycast={() => null} renderOrder={29}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0.15, lineEndX, lineEndY, 0.15])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color={color}
          linewidth={5}
          transparent
          opacity={0.9}
          depthTest={false}
        />
      </line>
      
      {/* Cursor dot */}
      <mesh 
        position={[lineEndX, lineEndY, 0.15]}
        raycast={() => null}
        renderOrder={30}
      >
        <circleGeometry args={[0.2, 8]} />
        <meshBasicMaterial 
          color="#ffffff"
          transparent
          opacity={0.9}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

export default VirtualJoystick;