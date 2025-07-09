import React from 'react';
import * as THREE from 'three';
import { PLAYER_CONFIG } from './playerConfig';

export function PlayerGeometry({ playerPowerUps, playerShipComponents }) {
  const getPlayerColor = () => {
    if (playerPowerUps.shield) return PLAYER_CONFIG.shieldColor;
    return PLAYER_CONFIG.defaultColor;
  };
  
  const getComponentColor = (component) => {
    const baseColor = new THREE.Color(getPlayerColor());
    
    if (playerShipComponents && playerShipComponents[component]) {
      const hpRatio = playerShipComponents[component].hp / playerShipComponents[component].maxHp;
      // Reduce brightness based on damage (0.3 = 30% minimum brightness)
      const damageMultiplier = Math.max(0.3, hpRatio);
      baseColor.multiplyScalar(damageMultiplier);
    }
    
    return baseColor;
  };
  
  const opacity = playerPowerUps.stealth ? PLAYER_CONFIG.stealthOpacity : 1.0;
  
  return (
    <group rotation={[0, 0, 0]}>
      {/* FUSELAGE_BODY: Main ship body (center at origin, extends from z=-1 to z=+1) */}
      <mesh position={[0, 0, 0]} name="fuselage" renderOrder={10}>
        <boxGeometry args={[0.6, 0.4, 2.0]} />
        <meshStandardMaterial 
          color={getComponentColor('body')} 
          transparent={playerPowerUps.stealth}
          opacity={opacity}
        />
      </mesh>
      
      {/* NOSE_CONE: Front cone at NEGATIVE Z (forward direction, where missiles go) */}
      <mesh position={[0, 0, -1.4]} rotation={[-Math.PI / 2, 0, 0]} name="nose" renderOrder={10}>
        <coneGeometry args={[0.4, 0.8, 4]} />
        <meshStandardMaterial 
          color={getComponentColor('nose')} 
          transparent={playerPowerUps.stealth}
          opacity={opacity}
        />
      </mesh>
      
      {/* LEFT_WING: Flat wing extending left from fuselage, inline with main body at back */}
      {(!playerShipComponents || !playerShipComponents.leftWing?.destroyed) && (
        <mesh position={[-0.3, 0, 0]} name="leftWing" renderOrder={10}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={3}
              array={new Float32Array([
                0, 0, -0.8,
                -1.5, 0, 0.0,
                0, 0, 0.8
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <meshStandardMaterial 
            color={getComponentColor('leftWing')} 
            side={THREE.DoubleSide}
            transparent={playerPowerUps.stealth}
            opacity={opacity}
          />
        </mesh>
      )}
      
      {/* RIGHT_WING: Flat wing extending right from fuselage, inline with main body at back */}
      {(!playerShipComponents || !playerShipComponents.rightWing?.destroyed) && (
        <mesh position={[0.3, 0, 0]} name="rightWing" renderOrder={10}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={3}
              array={new Float32Array([
                0, 0, -0.8,
                1.5, 0, 0.0,
                0, 0, 0.8
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <meshStandardMaterial 
            color={getComponentColor('rightWing')} 
            side={THREE.DoubleSide}
            transparent={playerPowerUps.stealth}
            opacity={opacity}
          />
        </mesh>
      )}
    </group>
  );
}
