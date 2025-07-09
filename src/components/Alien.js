import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function Alien({ alien, isHighlighted = false }) {
  const meshRef = useRef();
  const { type, position, isFlying } = alien;
  const playerPosition = useGameStore((state) => state.playerPosition);
  
  
  const getAlienColor = () => {
    const baseColor = (() => {
      switch (type) {
        case 1: return '#ff0000';
        case 2: return '#0080ff';
        case 3: return '#00ff00';
        case 4: return '#ff00ff'; // Purple for boss
        case 5: return '#888888'; // Gray for flying saucer
        default: return '#ffffff';
      }
    })();
    
    // Brighten color when highlighted
    if (isHighlighted) {
      const color = new THREE.Color(baseColor);
      color.lerp(new THREE.Color('#ffffff'), 0.6); // Mix with white for brightness
      return `#${color.getHexString()}`;
    }
    
    return baseColor;
  };

  const getComponentColor = (component) => {
    const baseColor = new THREE.Color(getAlienColor());
    
    if (alien.shipComponents && alien.shipComponents[component]) {
      const hpRatio = alien.shipComponents[component].hp / alien.shipComponents[component].maxHp;
      // Reduce brightness based on damage (0.3 = 30% minimum brightness)
      const damageMultiplier = Math.max(0.3, hpRatio);
      baseColor.multiplyScalar(damageMultiplier);
    }
    
    return baseColor;
  };
  
  
  const getAlienGeometry = () => {
    // Flying saucer has unique geometry
    if (type === 5) {
      return (
        <group rotation={[0, Math.PI, 0]}>
          {/* Main saucer disc */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[1.5, 1.8, 0.3, 16]} />
            <meshStandardMaterial color={getAlienColor()} />
          </mesh>
          
          {/* Top dome */}
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.8, 12, 8]} />
            <meshStandardMaterial color={getAlienColor()} />
          </mesh>
          
          {/* Bottom hull */}
          <mesh position={[0, -0.25, 0]}>
            <sphereGeometry args={[1.2, 12, 6]} />
            <meshStandardMaterial color={getAlienColor()} />
          </mesh>
          
          {/* Charge effect when charging */}
          {alien.isCharging && (
            <>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[2.0 + alien.chargeLevel * 0.3, 8, 6]} />
                <meshStandardMaterial 
                  color={alien.chargeLevel === 1 ? '#ffff00' : 
                         alien.chargeLevel === 2 ? '#ff8800' :
                         alien.chargeLevel === 3 ? '#ff4400' :
                         alien.chargeLevel === 4 ? '#ff0088' : '#ff00ff'}
                  transparent 
                  opacity={0.2}
                  wireframe
                />
              </mesh>
              <pointLight 
                color={alien.chargeLevel === 1 ? '#ffff00' : 
                       alien.chargeLevel === 2 ? '#ff8800' :
                       alien.chargeLevel === 3 ? '#ff4400' :
                       alien.chargeLevel === 4 ? '#ff0088' : '#ff00ff'}
                intensity={alien.chargeLevel * 20} 
                distance={15} 
              />
            </>
          )}
        </group>
      );
    }
    
    // All other aliens use player ship model, rotated 180 degrees to face player
    return (
      <group rotation={[0, Math.PI, 0]}>
        {/* FUSELAGE_BODY: Main ship body */}
        <mesh position={[0, 0, 0]} name="fuselage">
          <boxGeometry args={[0.6, 0.4, 2.0]} />
          <meshStandardMaterial color={getComponentColor('body')} />
        </mesh>
        
        {/* NOSE_CONE: Front cone */}
        <mesh position={[0, 0, -1.4]} rotation={[-Math.PI / 2, 0, 0]} name="nose">
          <coneGeometry args={[0.4, 0.8, 4]} />
          <meshStandardMaterial color={getComponentColor('nose')} />
        </mesh>
        
        {/* LEFT_WING: Triangle extending left from fuselage */}
        {(!alien.shipComponents || !alien.shipComponents.leftWing?.destroyed) && (
          <mesh position={[-0.3, 0, 0]} name="leftWing">
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={3}
                array={new Float32Array([
                  0, 0, -0.8,
                  -1.5, 0, 0.5,
                  0, 0, 0.8
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <meshStandardMaterial color={getComponentColor('leftWing')} side={THREE.DoubleSide} />
          </mesh>
        )}
        
        {/* RIGHT_WING: Triangle extending right from fuselage */}
        {(!alien.shipComponents || !alien.shipComponents.rightWing?.destroyed) && (
          <mesh position={[0.3, 0, 0]} name="rightWing">
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={3}
                array={new Float32Array([
                  0, 0, -0.8,
                  1.5, 0, 0.5,
                  0, 0, 0.8
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <meshStandardMaterial color={getComponentColor('rightWing')} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    );
  };
  
  useFrame((state) => {
    if (meshRef.current) {
      
      // Hit recoil effect for Star Fox 64-style impact feedback
      let recoilOffset = { x: 0, y: 0, z: 0 };
      if (alien.hitRecoil && alien.hitRecoil.intensity > 0.01) {
        recoilOffset.x = alien.hitRecoil.direction.x * alien.hitRecoil.intensity;
        recoilOffset.y = alien.hitRecoil.direction.y * alien.hitRecoil.intensity;
        recoilOffset.z = alien.hitRecoil.direction.z * alien.hitRecoil.intensity;
        
        // Decay the recoil
        alien.hitRecoil.intensity *= alien.hitRecoil.decay;
      }
      
      // Apply position with recoil
      meshRef.current.position.x = position.x + recoilOffset.x;
      meshRef.current.position.y = position.y + recoilOffset.y;
      meshRef.current.position.z = position.z + recoilOffset.z;
      
      // Appropriate alien behavior based on type and state
      if (isFlying) {
        // Flying aliens - no swaying, stable flight
        // No rotation animations - keep stable
        
        // No pulsing effect - keep constant size
        // const pulse = Math.sin(state.clock.elapsedTime * 8) * 0.1 + 1;
        // meshRef.current.scale.setScalar(pulse);
      } else {
        // Combat position aliens - use enemy ship rotation if available
        if (alien.enemyShip) {
          // Use enemy ship's rotation for proper facing
          const enemyRotation = alien.enemyShip.rotation;
          meshRef.current.rotation.x = enemyRotation.x;
          meshRef.current.rotation.y = enemyRotation.y + Math.PI; // Add 180 degree correction
          meshRef.current.rotation.z = enemyRotation.z;
        } else {
          // Legacy behavior - look at player
          const lookAtMatrix = new THREE.Matrix4();
          lookAtMatrix.lookAt(
            new THREE.Vector3(position.x, position.y, position.z),
            new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z),
            new THREE.Vector3(0, 1, 0)
          );
          
          // Extract rotation from matrix and apply
          const lookAtQuaternion = new THREE.Quaternion();
          lookAtQuaternion.setFromRotationMatrix(lookAtMatrix);
          
          // Add 180 degree rotation since aliens need to face forward (they're already rotated 180 in geometry)
          const additionalRotation = new THREE.Quaternion();
          additionalRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // Add 180 degree rotation to face player correctly
          
          // Apply the look-at rotation with 180 degree correction
          meshRef.current.quaternion.copy(lookAtQuaternion);
          meshRef.current.quaternion.multiply(additionalRotation);
        }
        
        // Type-specific behaviors without swaying
        switch (type) {
          case 1: // Scout - no swaying
            break;
          case 2: // Armored - no swaying
            break;
          case 3: // Elite - no swaying
            break;
          case 4: // Boss - no swaying but keep larger scale
            meshRef.current.scale.setScalar(5); // 400% larger (5x total)
            break;
          default:
            // Default behavior for any other alien types
            break;
        }
        // Keep constant scale for all aliens
        if (type !== 4) {
          meshRef.current.scale.setScalar(1);
        }
      }
      
      // Removed duplicate Elite rotation - now handled in switch statement above
    }
  });
  
  return (
    <group ref={meshRef} scale={[1.6698, 1.6698, 1.6698]}>
      {getAlienGeometry()}
    </group>
  );
}

export default Alien;