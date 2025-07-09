import React from 'react';
import * as THREE from 'three';
import { ALIEN_CONFIG } from './alienConfig';

export function AlienGeometry({ alien, isHighlighted = false, getComponentColor }) {
  const { type } = alien;
  
  const getAlienColor = () => {
    const alienType = ALIEN_CONFIG.alienTypes[type];
    const baseColor = alienType ? alienType.color : ALIEN_CONFIG.defaultColor;
    
    // Brighten color when highlighted
    if (isHighlighted) {
      const color = new THREE.Color(baseColor);
      color.lerp(new THREE.Color('#ffffff'), ALIEN_CONFIG.highlightMixRatio);
      return `#${color.getHexString()}`;
    }
    
    return baseColor;
  };
  
  // Flying saucer geometry
  if (type === 5) {
    const saucer = ALIEN_CONFIG.saucer;
    
    return (
      <group rotation={[0, Math.PI, 0]}>
        {/* Main saucer disc */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[saucer.discRadius[0], saucer.discRadius[1], saucer.discHeight, saucer.discSegments]} />
          <meshStandardMaterial color={getAlienColor()} />
        </mesh>
        
        {/* Top dome */}
        <mesh position={saucer.domePosition}>
          <sphereGeometry args={[saucer.domeRadius, saucer.domeSegments[0], saucer.domeSegments[1]]} />
          <meshStandardMaterial color={getAlienColor()} />
        </mesh>
        
        {/* Bottom hull */}
        <mesh position={saucer.hullPosition}>
          <sphereGeometry args={[saucer.hullRadius, saucer.hullSegments[0], saucer.hullSegments[1]]} />
          <meshStandardMaterial color={getAlienColor()} />
        </mesh>
        
        {/* Charge effect when charging */}
        {alien.isCharging && (
          <>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[2.0 + alien.chargeLevel * 0.3, 8, 6]} />
              <meshStandardMaterial 
                color={ALIEN_CONFIG.chargeColors[alien.chargeLevel] || ALIEN_CONFIG.chargeColors[5]}
                transparent 
                opacity={ALIEN_CONFIG.chargeOpacity}
                wireframe
              />
            </mesh>
            <pointLight 
              color={ALIEN_CONFIG.chargeColors[alien.chargeLevel] || ALIEN_CONFIG.chargeColors[5]}
              intensity={alien.chargeLevel * ALIEN_CONFIG.chargeLightIntensity} 
              distance={ALIEN_CONFIG.chargeLightDistance} 
            />
          </>
        )}
      </group>
    );
  }
  
  // Standard ship geometry (rotated 180 degrees to face player)
  const ship = ALIEN_CONFIG.ship;
  
  return (
    <group rotation={[0, Math.PI, 0]}>
      {/* FUSELAGE_BODY: Main ship body */}
      <mesh position={ship.body.position} name="fuselage">
        <boxGeometry args={ship.body.size} />
        <meshStandardMaterial color={getComponentColor('body')} />
      </mesh>
      
      {/* NOSE_CONE: Front cone */}
      <mesh position={ship.nose.position} rotation={ship.nose.rotation} name="nose">
        <coneGeometry args={[ship.nose.radius, ship.nose.height, ship.nose.segments]} />
        <meshStandardMaterial color={getComponentColor('nose')} />
      </mesh>
      
      {/* LEFT_WING: Triangle extending left from fuselage */}
      {(!alien.shipComponents || !alien.shipComponents.leftWing?.destroyed) && (
        <mesh position={ship.leftWing.position} name="leftWing">
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={3}
              array={new Float32Array(ship.leftWing.vertices)}
              itemSize={3}
            />
          </bufferGeometry>
          <meshStandardMaterial color={getComponentColor('leftWing')} side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {/* RIGHT_WING: Triangle extending right from fuselage */}
      {(!alien.shipComponents || !alien.shipComponents.rightWing?.destroyed) && (
        <mesh position={ship.rightWing.position} name="rightWing">
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={3}
              array={new Float32Array(ship.rightWing.vertices)}
              itemSize={3}
            />
          </bufferGeometry>
          <meshStandardMaterial color={getComponentColor('rightWing')} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};