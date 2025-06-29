import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function FreeFlightCrosshair() {
  const meshRef = useRef();
  const freeLookMode = useGameStore((state) => state.freeLookMode);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerRotation = useGameStore((state) => state.playerRotation);
  const weapons = useGameStore((state) => state.weapons);
  
  useFrame(() => {
    if (!meshRef.current || !freeLookMode) return;
    
    // Calculate weapon firing trajectory based on ship's current rotation
    const missileSpawnPos = new THREE.Vector3(
      playerPosition.x, 
      playerPosition.y, 
      playerPosition.z - 3 // Missiles spawn 3 units forward of ship center
    );
    
    // Ship's nose points in negative Z direction
    const shipDirection = new THREE.Vector3(0, 0, -1);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
    );
    shipDirection.applyMatrix4(rotationMatrix);
    
    // Calculate crosshair position at engagement distance
    const currentWeapon = weapons.current;
    const engagementDistance = currentWeapon === 'bfg' ? 100 : 60; // Distance where crosshair appears
    
    const crosshairPos = missileSpawnPos.clone().add(
      shipDirection.clone().multiplyScalar(engagementDistance)
    );
    
    // Position the crosshair mesh at the calculated trajectory point
    meshRef.current.position.copy(crosshairPos);
    
    // Align crosshair with ship's rotation for proper orientation
    meshRef.current.rotation.copy(new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z));
  });
  
  if (!freeLookMode) return null;
  
  return (
    <group ref={meshRef} raycast={() => null} renderOrder={999}>
      {/* Simple center crosshair for 6DOF flight mode */}
      
      {/* Left crosshair line - extends from larger deadzone box */}
      <mesh position={[-2.52, 0, 0]} raycast={() => null} renderOrder={999}>
        <boxGeometry args={[1.68, 0.12, 0.12]} />
        <meshBasicMaterial 
          color="#00ff00"
          transparent
          opacity={0.6}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Right crosshair line - extends from larger deadzone box */}
      <mesh position={[2.52, 0, 0]} raycast={() => null} renderOrder={999}>
        <boxGeometry args={[1.68, 0.12, 0.12]} />
        <meshBasicMaterial 
          color="#00ff00"
          transparent
          opacity={0.6}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Top crosshair line - extends from larger deadzone box */}
      <mesh position={[0, 2.52, 0]} raycast={() => null} renderOrder={999}>
        <boxGeometry args={[0.12, 1.68, 0.12]} />
        <meshBasicMaterial 
          color="#00ff00"
          transparent
          opacity={0.6}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      
      {/* Bottom crosshair line - extends from larger deadzone box */}
      <mesh position={[0, -2.52, 0]} raycast={() => null} renderOrder={999}>
        <boxGeometry args={[0.12, 1.68, 0.12]} />
        <meshBasicMaterial 
          color="#00ff00"
          transparent
          opacity={0.6}
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
              color="#00ff00"
              transparent
              opacity={0.6}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0.36, 0]} raycast={() => null} renderOrder={999}>
            <boxGeometry args={[0.096, 0.72, 0.096]} />
            <meshBasicMaterial 
              color="#00ff00"
              transparent
              opacity={0.6}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default FreeFlightCrosshair;