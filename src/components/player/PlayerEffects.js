import React from 'react';
import { PLAYER_CONFIG } from './playerConfig';

export function WingTrailEffect({ wingTrails }) {
  return (
    <>
      {/* Left wing trail */}
      {wingTrails.left.map((point, index) => {
        const age = Date.now() / 1000 - point.time;
        const opacity = Math.max(0, 1 - (age / 0.5));
        return (
          <mesh key={`left-${index}`} position={[point.position.x, point.position.y, point.position.z]} renderOrder={25}>
            <sphereGeometry args={[0.1, 4, 4]} />
            <meshBasicMaterial 
              color={PLAYER_CONFIG.defaultColor}
              transparent 
              opacity={opacity}
              depthTest={false}
            />
          </mesh>
        );
      })}
      
      {/* Right wing trail */}
      {wingTrails.right.map((point, index) => {
        const age = Date.now() / 1000 - point.time;
        const opacity = Math.max(0, 1 - (age / 0.5));
        return (
          <mesh key={`right-${index}`} position={[point.position.x, point.position.y, point.position.z]} renderOrder={25}>
            <sphereGeometry args={[0.1, 4, 4]} />
            <meshBasicMaterial 
              color={PLAYER_CONFIG.defaultColor}
              transparent 
              opacity={opacity}
              depthTest={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

export function ShieldEffect({ playerPowerUps, shieldLevel, showDebugElements }) {
  if (!playerPowerUps.shield || !showDebugElements) return null;
  
  return (
    <mesh renderOrder={12}>
      <sphereGeometry args={[PLAYER_CONFIG.shieldRadius * (1 + (shieldLevel - 1) * 0.05), 16, 12]} />
      <meshBasicMaterial 
        color={PLAYER_CONFIG.shieldColor}
        wireframe
        transparent 
        opacity={PLAYER_CONFIG.shieldOpacity}
        depthTest={false}
      />
    </mesh>
  );
}

export function CollisionDebugCircle({ showCollisionCircles }) {
  if (!showCollisionCircles) return null;
  
  return (
    <mesh>
      <sphereGeometry args={[PLAYER_CONFIG.collisionRadius, 16, 12]} />
      <meshBasicMaterial 
        color="#ff0000" 
        wireframe
        transparent 
        opacity={0.3}
      />
    </mesh>
  );
}
