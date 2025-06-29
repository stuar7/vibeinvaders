import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function Wingman({ wingman }) {
  const meshRef = useRef();
  const addMissile = useGameStore((state) => state.addMissile);
  const aliens = useGameStore((state) => state.aliens);
  const asteroids = useGameStore((state) => state.asteroids || []);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const removeWingman = useGameStore((state) => state.removeWingman);
  
  const lastFireTime = useRef(0);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Update position
    meshRef.current.position.x = wingman.position.x;
    meshRef.current.position.y = wingman.position.y;
    meshRef.current.position.z = wingman.position.z;
    
    // Independent movement with loose formation keeping
    if (!wingman.velocity) {
      wingman.velocity = { x: 0, y: 0 };
    }
    
    // Calculate desired formation position
    const formationX = playerPosition.x + wingman.offset.x;
    const formationY = playerPosition.y + wingman.offset.y;
    
    // Calculate distance from formation position
    const deltaX = formationX - wingman.position.x;
    const deltaY = formationY - wingman.position.y;
    const distanceFromFormation = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Independent movement with formation bias
    const time = state.clock.elapsedTime;
    const wingmanId = parseFloat(wingman.id.split('-')[1]) || 0; // Use ID for unique movement
    
    // Base autonomous movement (gentle sine wave patterns)
    const autonomousX = Math.sin(time * 0.8 + wingmanId) * 0.3;
    const autonomousY = Math.cos(time * 0.6 + wingmanId * 1.5) * 0.2;
    
    // Formation correction force (stronger when further from formation)
    const formationForce = Math.min(distanceFromFormation * 0.1, 1.0);
    const formationX_force = deltaX * formationForce * 0.02;
    const formationY_force = deltaY * formationForce * 0.02;
    
    // Update velocity with autonomous movement and formation bias
    wingman.velocity.x = autonomousX + formationX_force;
    wingman.velocity.y = autonomousY + formationY_force;
    
    // Apply movement
    wingman.position.x += wingman.velocity.x * delta * 10;
    wingman.position.y += wingman.velocity.y * delta * 10;
    
    // Handle lifetime
    wingman.lifetime -= delta;
    if (wingman.lifetime <= 0) {
      // Time to fly away
      wingman.isLeaving = true;
    }
    
    if (wingman.isLeaving) {
      // Fly forward and up
      wingman.position.z -= 5 * delta;
      wingman.position.y += 3 * delta;
      
      // Remove when far enough
      if (wingman.position.z < -200 || wingman.position.y > 100) {
        removeWingman(wingman.id);
        return;
      }
    } else {
      // Combat behavior - find nearest target (alien or asteroid)
      let nearestTarget = null;
      let nearestDistance = Infinity;
      let targetType = null;
      
      // Check aliens first (priority over asteroids)
      aliens.forEach(alien => {
        if (alien.isInvulnerable) return; // Skip invulnerable aliens
        
        const dx = alien.position.x - wingman.position.x;
        const dy = alien.position.y - wingman.position.y;
        const dz = alien.position.z - wingman.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < nearestDistance && alien.position.z < 0) {
          nearestDistance = distance;
          nearestTarget = alien;
          targetType = 'alien';
        }
      });
      
      // Check asteroids only if no alien is found or asteroid is closer
      asteroids.forEach(asteroid => {
        if (asteroid.isDoodad) return; // Skip doodad asteroids
        
        const dx = asteroid.position.x - wingman.position.x;
        const dy = asteroid.position.y - wingman.position.y;
        const dz = asteroid.position.z - wingman.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Only target asteroids if they're closer than aliens or no alien found
        if (distance < nearestDistance && asteroid.position.z > -100) {
          nearestDistance = distance;
          nearestTarget = asteroid;
          targetType = 'asteroid';
        }
      });
      
      // Fire at nearest target (only if within 135 degree cone in front)
      const now = Date.now();
      if (nearestTarget && now - lastFireTime.current > 500) { // Fire every 0.5 seconds
        // Calculate direction to target
        const dx = nearestTarget.position.x - wingman.position.x;
        const dy = nearestTarget.position.y - wingman.position.y;
        const dz = nearestTarget.position.z - wingman.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance > 0) {
          // Check if target is within 135 degree cone in front of wingman
          // Wingman faces forward (negative Z direction)
          const forwardDirection = { x: 0, y: 0, z: -1 }; // Forward is negative Z
          const targetDirection = { x: dx / distance, y: dy / distance, z: dz / distance };
          
          // Calculate dot product to get angle
          const dotProduct = forwardDirection.x * targetDirection.x + 
                           forwardDirection.y * targetDirection.y + 
                           forwardDirection.z * targetDirection.z;
          
          // 135 degrees = 67.5 degrees from center = cos(67.5°) ≈ 0.38
          const fireAngleThreshold = Math.cos((135 * Math.PI) / 360); // Half of 135 degrees
          
          // Only fire if target is within the 135 degree cone (dotProduct > threshold)
          if (dotProduct > fireAngleThreshold) {
            lastFireTime.current = now;
            
            // Create missile
            const missile = {
              id: `wingman-missile-${Date.now()}-${Math.random()}`,
              type: 'wingman',
              position: { ...wingman.position },
              velocity: {
                x: (dx / distance) * 1.2,
                y: (dy / distance) * 1.2,
                z: (dz / distance) * 1.2 - 1, // Add forward velocity
              },
              damage: targetType === 'asteroid' ? 1 : 1, // Same damage for now
              size: 0.15,
              color: '#00ffff', // Cyan for wingman missiles
            };
            addMissile(missile);
          }
        }
      }
    }
  });
  
  // White color for wingman
  return (
    <group ref={meshRef} scale={[1.32, 1.32, 1.32]}>
      {/* Similar to player ship but smaller and white */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.3, 1.5]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Nose cone */}
      <mesh position={[0, 0, -1.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.3, 0.6, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Wings */}
      <mesh position={[-0.2, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={3}
            array={new Float32Array([
              0, 0, -0.6,
              -1.0, 0, 0.3,
              0, 0, 0.6
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
      
      <mesh position={[0.2, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={3}
            array={new Float32Array([
              0, 0, -0.6,
              1.0, 0, 0.3,
              0, 0, 0.6
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Wingmen() {
  const wingmen = useGameStore((state) => state.wingmen || []);
  
  return (
    <>
      {wingmen.map((wingman) => (
        <Wingman key={wingman.id} wingman={wingman} />
      ))}
    </>
  );
}

export default Wingmen;