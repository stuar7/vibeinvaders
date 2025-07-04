import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';

// Memoize the missile component to prevent unnecessary re-renders
const Missile = React.memo(function Missile({ missile }) {
  const meshRef = useRef();
  const { position, type, weaponType = 'default', size = 0.2, color: missileColor, rotation } = missile;
  const showCollisionCircles = useGameStore((state) => state.debug.showCollisionCircles);
  const showBlasterCollisions = useGameStore((state) => state.debug.showBlasterCollisions);
  
  const color = missileColor || (type === 'player' ? '#00ffff' : '#ff0000');
  const projectileSize = size;
  
  // Deferred loading state for complex missiles
  const [isComplexMeshLoaded, setIsComplexMeshLoaded] = useState(false);
  
  // Defer complex mesh loading to next frame for rockets, bombs, and railguns
  useEffect(() => {
    if (['rocket', 'bomb', 'railgun'].includes(weaponType)) {
      // Use requestAnimationFrame to defer complex mesh creation
      const rafId = requestAnimationFrame(() => {
        setIsComplexMeshLoaded(true);
      });
      return () => cancelAnimationFrame(rafId);
    } else {
      setIsComplexMeshLoaded(true);
    }
  }, [weaponType]);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x = position.x;
      meshRef.current.position.y = position.y;
      meshRef.current.position.z = position.z;
      
      // Apply rotation if provided
      if (rotation) {
        meshRef.current.rotation.x = rotation.x || 0;
        meshRef.current.rotation.y = rotation.y || 0;
        meshRef.current.rotation.z = rotation.z || 0;
      }
    }
  });
  
  const renderProjectile = () => {
    switch (weaponType) {
      case 'laser':
        return (
          // Simplified to single mesh for performance
          <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={15}>
            <cylinderGeometry args={[0.05, 0.05, 6, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} depthTest={false} />
          </mesh>
        );
      
      case 'chaingun':
        return (
          // Simplified to single mesh for performance
          <mesh renderOrder={15}>
            <sphereGeometry args={[projectileSize, 6, 4]} />
            <meshBasicMaterial color={color} depthTest={false} />
          </mesh>
        );
      
      case 'bfg':
        return (
          <>
          <mesh renderOrder={15}>
              <sphereGeometry args={[projectileSize, 16, 12]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} />
          </mesh>
            <mesh renderOrder={14}>
              <sphereGeometry args={[projectileSize * 1.2, 16, 12]} />
              <meshBasicMaterial color={color} transparent opacity={0.3} depthTest={false} />
            </mesh>
            <pointLight color={color} intensity={50} distance={projectileSize * 3} />
          </>
        );
      
      case 'rocket':
        // Show simple placeholder while complex mesh loads
        if (!isComplexMeshLoaded) {
          return (
            <mesh>
              <sphereGeometry args={[projectileSize, 6, 4]} />
              <meshBasicMaterial color={color} />
            </mesh>
          );
        }
        return (
          <>
          <mesh>
            <boxGeometry args={[0.2, 0.2, 1]} />
            <meshBasicMaterial color={color} />
          </mesh>
            <mesh position={[0, 0, 0.7]}>
              <coneGeometry args={[0.15, 0.4, 6]} />
              <meshBasicMaterial color="#ff4400" />
            </mesh>
            <mesh position={[0, 0, -0.7]}>
              <coneGeometry args={[0.3, 0.6, 6]} />
              <meshBasicMaterial color="#ffaa00" transparent opacity={0.6} />
            </mesh>
            <pointLight color={color} intensity={15} distance={20} />
          </>
        );
      
      case 'charge':
        return (
          <>
          <mesh>
              <sphereGeometry args={[projectileSize, 16, 12]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>
            <mesh>
              <sphereGeometry args={[projectileSize * 1.5, 16, 12]} />
              <meshBasicMaterial color={color} transparent opacity={0.3} wireframe />
            </mesh>
            <mesh>
              <sphereGeometry args={[projectileSize * 0.3, 8, 6]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
            <pointLight color={color} intensity={projectileSize * 20} distance={projectileSize * 10} />
          </>
        );
      
      case 'bomb':
        const blinkSpeed = missile.isDeployed ? 4 : 2; // Faster blinking when deployed
        const blinkIntensity = Math.sin(Date.now() * 0.01 * blinkSpeed) * 0.5 + 0.5;
        
        // Show simple placeholder while complex mesh loads
        if (!isComplexMeshLoaded) {
          return (
            <mesh>
              <sphereGeometry args={[projectileSize, 8, 6]} />
              <meshBasicMaterial color="#ff4400" />
            </mesh>
          );
        }
        
        return (
          <>
            {/* Main bomb body - spherical */}
          <mesh>
              <sphereGeometry args={[projectileSize, 12, 8]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
            
            {/* Blinking red light */}
            <mesh>
              <sphereGeometry args={[projectileSize * 0.3, 8, 6]} />
              <meshBasicMaterial 
                color="#ff0000" 
                transparent 
                opacity={0.3 + blinkIntensity * 0.7}
              />
            </mesh>
            
            {/* Warning stripes */}
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[projectileSize * 0.8, projectileSize * 0.8, 0.1, 8]} />
              <meshBasicMaterial color="#ffff00" transparent opacity={0.8} />
            </mesh>
            
            {/* Fins */}
            {[0, Math.PI/2, Math.PI, 3*Math.PI/2].map((rotation, index) => (
              <mesh key={index} rotation={[0, rotation, 0]} position={[0, 0, projectileSize * 0.5]}>
                <boxGeometry args={[0.1, projectileSize * 0.4, projectileSize * 0.6]} />
                <meshBasicMaterial color="#666666" />
          </mesh>
            ))}
            
            {/* Pulsing red light effect */}
            <pointLight 
              color="#ff0000" 
              intensity={blinkIntensity * 30} 
              distance={projectileSize * 15} 
            />
          </>
        );
      
      case 'railgun':
        // Show simple placeholder while complex mesh loads
        if (!isComplexMeshLoaded) {
          return (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 4, 6]} />
              <meshBasicMaterial color="#8800ff" />
            </mesh>
          );
        }
        
        return (
          <>
            {/* Main rail projectile - elongated cylinder with electromagnetic effect */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 8, 12]} />
              <meshStandardMaterial color="#00ffdd" emissive="#004466" emissiveIntensity={0.5} />
            </mesh>
            
            {/* Electromagnetic trail effect */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 8, 8]} />
              <meshBasicMaterial color="#00aaff" transparent opacity={0.4} />
            </mesh>
            
            {/* Outer energy field */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 8, 6]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
            </mesh>
            
            {/* Front spike - actual damage point */}
            <mesh position={[0, 0, -4.2]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.04, 0.4, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
            </mesh>
            
            {/* Intense point light */}
            <pointLight color="#00ffdd" intensity={80} distance={30} />
            
            {/* Crackling electricity effect */}
            <mesh>
              <sphereGeometry args={[0.3, 8, 6]} />
              <meshBasicMaterial 
                color="#00ffff" 
                transparent 
                opacity={0.3 + Math.sin(Date.now() * 0.02) * 0.2}
                wireframe
              />
          </mesh>
          </>
        );
      
      default:
        return (
          // Simplified to single mesh for performance
          <mesh renderOrder={15}>
            <sphereGeometry args={[0.15, 6, 4]} />
            <meshBasicMaterial color={color} depthTest={false} />
          </mesh>
        );
    }
  };

  return (
    <group ref={meshRef} renderOrder={15}>
      {renderProjectile()}
      
      {/* Collision circle for debugging - general collisions */}
      {showCollisionCircles && (
        <mesh>
          <sphereGeometry args={[projectileSize, 8, 6]} />
          <meshBasicMaterial 
            color={type === 'player' ? '#00ff00' : '#ff0000'} 
            wireframe
            transparent 
            opacity={0.3}
          />
        </mesh>
      )}
      
      {/* Blaster-specific collision circle - only for default blaster */}
      {showBlasterCollisions && weaponType === 'default' && (
        <mesh>
          <sphereGeometry args={[projectileSize, 8, 6]} />
          <meshBasicMaterial 
            color="#ffff00" 
            wireframe
            transparent 
            opacity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Only re-render if position actually changed significantly
  const positionThreshold = 0.01;
  const posDiff = Math.abs(prevProps.missile.position.x - nextProps.missile.position.x) +
                  Math.abs(prevProps.missile.position.y - nextProps.missile.position.y) +
                  Math.abs(prevProps.missile.position.z - nextProps.missile.position.z);
  
  // Re-render if position changed significantly or if it's a different missile
  return prevProps.missile.id === nextProps.missile.id && posDiff < positionThreshold;
});

export default Missile;