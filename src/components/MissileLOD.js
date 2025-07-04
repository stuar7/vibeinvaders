import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Import our LOD system
import MissileLODSystem from '../systems/MissileLODSystem';

// Singleton LOD system
const lodSystem = new MissileLODSystem();

const MissileLOD = React.memo(function MissileLOD({ missile }) {
  const meshRef = useRef();
  const { camera } = useThree();
  const { position, type, weaponType = 'default', size = 0.2, color: missileColor } = missile;
  
  const color = missileColor || (type === 'player' ? '#00ffff' : '#ff0000');
  
  // Create LOD object with cached geometries
  const lodObject = useMemo(() => {
    if (!['rocket', 'bomb', 'railgun'].includes(weaponType)) {
      // Simple missiles don't need LOD
      return null;
    }
    
    const materials = {
      high: new THREE.MeshBasicMaterial({ color }),
      medium: new THREE.MeshBasicMaterial({ color }),
      low: new THREE.MeshBasicMaterial({ color })
    };
    
    return lodSystem.createMissileLOD(weaponType, materials);
  }, [weaponType, color]);
  
  // Update position and handle LOD
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(position.x, position.y, position.z);
      
      // Apply rotation if provided
      if (missile.rotation) {
        meshRef.current.rotation.set(
          missile.rotation.x || 0,
          missile.rotation.y || 0,
          missile.rotation.z || 0
        );
      }
      
      // Update LOD based on camera distance
      if (lodObject) {
        lodObject.update(camera);
      }
    }
  });
  
  // For simple missiles, render normally
  if (!lodObject) {
    return (
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 8, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
    );
  }
  
  // For complex missiles, use LOD
  return <primitive ref={meshRef} object={lodObject} />;
}, (prevProps, nextProps) => {
  // Only re-render if position changed significantly
  const threshold = 0.01;
  const posDiff = Math.abs(prevProps.missile.position.x - nextProps.missile.position.x) +
                  Math.abs(prevProps.missile.position.y - nextProps.missile.position.y) +
                  Math.abs(prevProps.missile.position.z - nextProps.missile.position.z);
  
  return prevProps.missile.id === nextProps.missile.id && posDiff < threshold;
});

export default MissileLOD;