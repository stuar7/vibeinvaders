import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function TargetingCursor() {
  const meshRef = useRef();
  const lineRef = useRef();
  const cursorAiming = useGameStore((state) => state.cursorAiming);
  const freeLookMode = useGameStore((state) => state.freeLookMode);
  const aliens = useGameStore((state) => state.aliens);
  const setHighlightedAlien = useGameStore((state) => state.setHighlightedAlien);
  const { pointer, camera } = useThree();
  const [cursorWorldPos, setCursorWorldPos] = React.useState({ x: 0, y: 0, z: -50 });
  const [farCrosshairPos, setFarCrosshairPos] = React.useState({ x: 0, y: 0, z: -80 });
  const [aimAngles, setAimAngles] = React.useState({ horizontal: 0, vertical: 0 });
  
  useFrame((state) => {
    if (!meshRef.current || !cursorAiming || freeLookMode) return;
    
    
    // Get missile firing position and player rotation (where missiles actually spawn from)
    const playerPos = useGameStore.getState().playerPosition;
    const playerRotation = useGameStore.getState().playerRotation;
    const missileSpawnPos = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z - 3);
    
    // Use player's actual rotation to calculate crosshair trajectory instead of raw mouse position
    // This ensures crosshairs sync with ship rotation lag
    const shipDirection = new THREE.Vector3(0, 0, -1); // Ship points in negative Z
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
    );
    shipDirection.applyMatrix4(rotationMatrix);
    
    // Calculate trajectory from missile spawn position using ship's actual pointing direction
    const trajectoryDirection = shipDirection.clone().normalize();
    
    // Calculate aim angles relative to forward direction
    const forwardVector = new THREE.Vector3(0, 0, -1); // Pure forward
    
    // Horizontal angle (left/right)
    const horizontalProjection = new THREE.Vector3(trajectoryDirection.x, 0, trajectoryDirection.z).normalize();
    const horizontalAngle = Math.atan2(horizontalProjection.x, -horizontalProjection.z) * (180 / Math.PI);
    
    // Vertical angle (up/down)
    const verticalAngle = Math.asin(trajectoryDirection.y) * (180 / Math.PI);
    
    setAimAngles({ horizontal: horizontalAngle, vertical: verticalAngle });
    
    // Calculate near crosshair position on trajectory line at minimum enemy distance
    const firstInterceptDistance = Math.abs(-40.5); // Distance for near crosshair (minimum enemy distance)
    const nearCrosshairZ = -firstInterceptDistance;
    const nearDeltaZ = nearCrosshairZ - missileSpawnPos.z;
    const nearT = nearDeltaZ / trajectoryDirection.z;
    
    const nearCrosshairPos = missileSpawnPos.clone().add(
      trajectoryDirection.clone().multiplyScalar(nearT)
    );
    
    // Position the cursor visual at the trajectory intersection (not cursor world position)
    meshRef.current.position.copy(nearCrosshairPos);
    
    // Update state for render section
    setCursorWorldPos({ x: nearCrosshairPos.x, y: nearCrosshairPos.y, z: nearCrosshairPos.z });
    
    // Calculate where the projectile trajectory would hit at practical engagement distance
    const weapons = useGameStore.getState().weapons;
    const currentWeapon = weapons.current;
    
    // Use practical engagement distance (middle range) instead of max travel distance
    // This represents where missiles will likely hit enemies in real combat scenarios
    const engagementDistance = currentWeapon === 'bfg' ? -150 : -100; // Closer practical distances
    
    // Calculate the intersection point at practical engagement distance
    const targetZ = engagementDistance;
    const deltaZ = targetZ - missileSpawnPos.z;
    
    // Calculate the scalar to reach target Z distance
    const t = deltaZ / trajectoryDirection.z;
    
    // Calculate final position
    const missileEndPos = missileSpawnPos.clone().add(
      trajectoryDirection.clone().multiplyScalar(t)
    );
    
    const farIntersection = {
      x: missileEndPos.x,
      y: missileEndPos.y,
      z: missileEndPos.z
    };
    
    setFarCrosshairPos(farIntersection);
    
    // Find aliens that intersect with the firing line trajectory
    let closestAlien = null;
    let closestDistance = Infinity;
    
    // Line from near crosshair to far crosshair in world coordinates
    const lineStart = new THREE.Vector3(cursorWorldPos.x, cursorWorldPos.y, cursorWorldPos.z);
    const lineEnd = new THREE.Vector3(farCrosshairPos.x, farCrosshairPos.y, farCrosshairPos.z);
    const lineDirection = new THREE.Vector3().subVectors(lineEnd, lineStart).normalize();
    const lineLength = lineStart.distanceTo(lineEnd);
    
    aliens.forEach(alien => {
      if (!alien || alien.isSpawning) return;
      
      const alienPos = new THREE.Vector3(alien.position.x, alien.position.y, alien.position.z);
      const alienRadius = 2.0; // Collision radius for aliens
      
      // Calculate closest point on line to alien center
      const toAlien = new THREE.Vector3().subVectors(alienPos, lineStart);
      const projectionLength = toAlien.dot(lineDirection);
      
      // Clamp projection to line segment
      const clampedProjection = Math.max(0, Math.min(lineLength, projectionLength));
      const closestPointOnLine = new THREE.Vector3()
        .copy(lineStart)
        .add(lineDirection.clone().multiplyScalar(clampedProjection));
      
      // Check if alien sphere intersects with line
      const distanceToLine = alienPos.distanceTo(closestPointOnLine);
      
      if (distanceToLine <= alienRadius) {
        const distanceAlongLine = clampedProjection;
        if (distanceAlongLine < closestDistance) {
          closestAlien = alien;
          closestDistance = distanceAlongLine;
        }
      }
    });
    
    // Update highlighted alien in store
    setHighlightedAlien(closestAlien ? closestAlien.id : null);
    
    // Update line geometry with current crosshair positions
    if (lineRef.current && lineRef.current.geometry) {
      const positions = new Float32Array([
        0, 0, 0, // Near crosshair position (local coordinates)
        farCrosshairPos.x - cursorWorldPos.x, 
        farCrosshairPos.y - cursorWorldPos.y, 
        farCrosshairPos.z - cursorWorldPos.z // Far crosshair position (local coordinates)
      ]);
      lineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Change cursor appearance if targeting enemy
    const nearGroup = meshRef.current.children[0]; // Near crosshair group
    const farGroup = meshRef.current.children[1]; // Far crosshair group
    const connectingLine = meshRef.current.children[2]; // Connecting line
    
    const targetColor = closestAlien ? 0xff0000 : 0x00ff00; // Red when targeting, green normally
    
    // Update near crosshair colors
    if (nearGroup && nearGroup.children) {
      nearGroup.children.forEach(child => {
        if (child.material) {
          child.material.color.setHex(targetColor);
        }
      });
    }
    
    // Update far crosshair colors
    if (farGroup && farGroup.children) {
      farGroup.children.forEach(child => {
        if (child.material) {
          child.material.color.setHex(targetColor);
        }
      });
    }
    
    // Update connecting line color (using lineRef)
    if (lineRef.current && lineRef.current.material) {
      lineRef.current.material.color.setHex(targetColor);
    }
  });
  
  if (!cursorAiming || freeLookMode) return null;
  
  return (
    <group ref={meshRef} raycast={() => null}>
      {/* Near crosshair (close range targeting) */}
      <group position={[0, 0, 0]} raycast={() => null}>
        {/* Square targeting cursor */}
        <mesh raycast={() => null}>
          <ringGeometry args={[2.5, 3, 4]} />
          <meshBasicMaterial 
            color="#00ff00"
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Horizontal angle indicator (left/right) - visual bar representation */}
        <group position={[aimAngles.horizontal > 0 ? 4.5 : -4.5, 0, 0]} raycast={() => null}>
          {/* Background */}
          <mesh raycast={() => null}>
            <planeGeometry args={[2.4, 1.0]} />
            <meshBasicMaterial color="#003300" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
          {/* Angle bar - width represents angle magnitude */}
          <mesh position={[0, 0, 0.01]} raycast={() => null}>
            <planeGeometry args={[Math.min(Math.abs(aimAngles.horizontal) / 45, 1) * 2.4, 0.8]} />
            <meshBasicMaterial 
              color={Math.abs(aimAngles.horizontal) > 30 ? "#ff0000" : Math.abs(aimAngles.horizontal) > 15 ? "#ffff00" : "#00ff00"} 
              transparent 
              opacity={0.9} 
              side={THREE.DoubleSide} 
            />
          </mesh>
          {/* Angle magnitude indicators (dots) */}
          {[...Array(Math.min(Math.floor(Math.abs(aimAngles.horizontal) / 10), 4))].map((_, i) => (
            <mesh key={i} position={[(i - 1.5) * 0.5, 0, 0.02]} raycast={() => null}>
              <circleGeometry args={[0.16, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
        
        {/* Vertical angle indicator (up/down) - visual bar representation */}
        <group position={[0, aimAngles.vertical > 0 ? 4.5 : -4.5, 0]} raycast={() => null}>
          {/* Background */}
          <mesh raycast={() => null}>
            <planeGeometry args={[2.4, 1.0]} />
            <meshBasicMaterial color="#003300" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
          {/* Angle bar - width represents angle magnitude */}
          <mesh position={[0, 0, 0.01]} raycast={() => null}>
            <planeGeometry args={[Math.min(Math.abs(aimAngles.vertical) / 45, 1) * 2.4, 0.8]} />
            <meshBasicMaterial 
              color={Math.abs(aimAngles.vertical) > 30 ? "#ff0000" : Math.abs(aimAngles.vertical) > 15 ? "#ffff00" : "#00ff00"} 
              transparent 
              opacity={0.9} 
              side={THREE.DoubleSide} 
            />
          </mesh>
          {/* Angle magnitude indicators (dots) */}
          {[...Array(Math.min(Math.floor(Math.abs(aimAngles.vertical) / 10), 4))].map((_, i) => (
            <mesh key={i} position={[(i - 1.5) * 0.5, 0, 0.02]} raycast={() => null}>
              <circleGeometry args={[0.16, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
        
        {/* Center dot */}
        <mesh raycast={() => null}>
          <circleGeometry args={[0.2, 8]} />
          <meshBasicMaterial 
            color="#ffffff"
            transparent
            opacity={0.9}
          />
        </mesh>
        
        {/* Corner markers */}
        {[0, Math.PI/2, Math.PI, 3*Math.PI/2].map((rotation, index) => (
          <mesh key={index} rotation={[0, 0, rotation]} position={[2.8, 0, 0]} raycast={() => null}>
            <boxGeometry args={[0.8, 0.1, 0.1]} />
            <meshBasicMaterial 
              color="#00ff00"
              transparent
              opacity={0.54}
            />
          </mesh>
        ))}
      </group>

      {/* Far crosshair (long range targeting) - Star Fox 64 style */}
      <group position={[
        farCrosshairPos.x - cursorWorldPos.x, 
        farCrosshairPos.y - cursorWorldPos.y, 
        farCrosshairPos.z - cursorWorldPos.z
      ]} scale={[0.5, 0.5, 0.5]} renderOrder={999} raycast={() => null}>
        {/* Smaller square targeting cursor */}
        <mesh renderOrder={999} raycast={() => null}>
          <ringGeometry args={[2.5, 3, 4]} />
          <meshBasicMaterial 
            color="#00ff00"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        
        {/* Center dot */}
        <mesh renderOrder={999} raycast={() => null}>
          <circleGeometry args={[0.2, 8]} />
          <meshBasicMaterial 
            color="#ffffff"
            transparent
            opacity={0.5}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        
        {/* Corner markers */}
        {[0, Math.PI/2, Math.PI, 3*Math.PI/2].map((rotation, index) => (
          <mesh key={`far-${index}`} rotation={[0, 0, rotation]} position={[2.8, 0, 0]} renderOrder={999} raycast={() => null}>
            <boxGeometry args={[0.8, 0.1, 0.1]} />
            <meshBasicMaterial 
              color="#00ff00"
              transparent
              opacity={0.3}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Connecting line between near and far crosshairs - proper line element */}
      <line ref={lineRef} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              0, 0, 0, // Near crosshair position (local coordinates)
              farCrosshairPos.x - cursorWorldPos.x, 
              farCrosshairPos.y - cursorWorldPos.y, 
              farCrosshairPos.z - cursorWorldPos.z // Far crosshair position (local coordinates)
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color="#00ff00"
          linewidth={3}
          transparent
          opacity={0.8}
        />
      </line>
    </group>
  );
}

export default TargetingCursor;