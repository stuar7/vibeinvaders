import React from 'react';
import { useGameStore } from '../store/gameStore';

function PredictiveCrosshairs() {
  const aliens = useGameStore((state) => state.aliens);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const weapons = useGameStore((state) => state.weapons);
  
  // Calculate predictive aim point for a moving target
  const calculatePredictiveAim = (alien, playerPos, missileSpeed) => {
    // Enemy position and velocity
    const enemyPos = alien.position;
    const enemyVel = alien.velocity;
    
    // Relative position (enemy relative to player)
    const relativeX = enemyPos.x - playerPos.x;
    const relativeY = enemyPos.y - playerPos.y;
    const relativeZ = enemyPos.z - playerPos.z;
    
    // Quadratic equation coefficients for intercept calculation
    // We need to solve: |enemyPos + enemyVel*t - (playerPos + missileVel*t)| = 0
    // This becomes a quadratic equation in t
    
    const a = enemyVel.x * enemyVel.x + enemyVel.y * enemyVel.y + enemyVel.z * enemyVel.z - missileSpeed * missileSpeed;
    const b = 2 * (relativeX * enemyVel.x + relativeY * enemyVel.y + relativeZ * enemyVel.z);
    const c = relativeX * relativeX + relativeY * relativeY + relativeZ * relativeZ;
    
    // Solve quadratic equation
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0 || Math.abs(a) < 0.001) {
      // No solution or missile too slow - aim at current position
      return enemyPos;
    }
    
    // Take the positive root (future time)
    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t = t1 > 0 ? (t2 > 0 && t2 < t1 ? t2 : t1) : t2;
    
    if (t <= 0) {
      return enemyPos; // No valid future intercept
    }
    
    // Calculate predicted position
    return {
      x: enemyPos.x + enemyVel.x * t,
      y: enemyPos.y + enemyVel.y * t,
      z: enemyPos.z + enemyVel.z * t
    };
  };
  
  // Get missile speed for current weapon
  const getMissileSpeed = (weaponType) => {
    switch (weaponType) {
      case 'default': return 1.5;
      case 'laser': return 2.0;
      case 'chaingun': return 1.8;
      case 'bfg': return 1.0;
      case 'rocket': return 1.2;
      case 'charge': return 1.5;
      case 'bomb': return 0.8;
      case 'railgun': return 3.0;
      default: return 1.5;
    }
  };
  
  const currentMissileSpeed = getMissileSpeed(weapons.current);
  
  // Filter aliens within 100 units and calculate predictive crosshairs
  const predictiveCrosshairs = aliens
    .filter(alien => {
      if (!alien || alien.isSpawning) return false;
      
      const distance = Math.sqrt(
        Math.pow(alien.position.x - playerPosition.x, 2) +
        Math.pow(alien.position.y - playerPosition.y, 2) +
        Math.pow(alien.position.z - playerPosition.z, 2)
      );
      
      return distance <= 100 && distance > 5; // Within 100 units but not too close
    })
    .map(alien => {
      const predictedPos = calculatePredictiveAim(alien, playerPosition, currentMissileSpeed);
      
      // Calculate accuracy indicator based on how much the enemy is moving
      const enemySpeed = Math.sqrt(
        alien.velocity.x * alien.velocity.x +
        alien.velocity.y * alien.velocity.y +
        alien.velocity.z * alien.velocity.z
      );
      
      const distance = Math.sqrt(
        Math.pow(alien.position.x - playerPosition.x, 2) +
        Math.pow(alien.position.y - playerPosition.y, 2) +
        Math.pow(alien.position.z - playerPosition.z, 2)
      );
      
      // Accuracy decreases with distance and enemy speed
      const accuracy = Math.max(0.3, 1.0 - (distance / 100) - (enemySpeed / 10));
      
      return {
        id: alien.id,
        position: predictedPos,
        accuracy: accuracy,
        distance: distance,
        enemySpeed: enemySpeed
      };
    });
  
  return (
    <>
      {predictiveCrosshairs.map((crosshair) => (
        <group key={`predictive-${crosshair.id}`} position={[crosshair.position.x, crosshair.position.y, crosshair.position.z]} raycast={() => null}>
          {/* Main predictive crosshair */}
          <mesh raycast={() => null}>
            <ringGeometry args={[0.2, 0.3, 8]} />
            <meshBasicMaterial 
              color="#ffaa00" 
              transparent 
              opacity={0.6 * crosshair.accuracy}
              side={2}
            />
          </mesh>
          
          {/* Accuracy indicator - smaller ring inside */}
          <mesh raycast={() => null}>
            <ringGeometry args={[0.1, 0.15, 8]} />
            <meshBasicMaterial 
              color={crosshair.accuracy > 0.7 ? "#00ff00" : crosshair.accuracy > 0.4 ? "#ffff00" : "#ff4400"} 
              transparent 
              opacity={crosshair.accuracy}
              side={2}
            />
          </mesh>
          
          {/* Lead indicator - shows direction of enemy movement */}
          <mesh rotation={[0, 0, Math.atan2(crosshair.position.y - playerPosition.y, crosshair.position.x - playerPosition.x)]} raycast={() => null}>
            <coneGeometry args={[0.08, 0.2, 4]} />
            <meshBasicMaterial 
              color="#ffaa00" 
              transparent 
              opacity={0.5 * crosshair.accuracy}
            />
          </mesh>
          
          {/* Distance markers for very close targets */}
          {crosshair.distance < 30 && (
            <mesh raycast={() => null}>
              <ringGeometry args={[0.4, 0.5, 12]} />
              <meshBasicMaterial 
                color="#ff0000" 
                transparent 
                opacity={0.3}
                side={2}
              />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

export default PredictiveCrosshairs;