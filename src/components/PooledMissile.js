import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import weaponMeshPool from '../systems/WeaponMeshPool2';

// Component handles pooled weapon meshes
const PooledMissile = React.memo(function PooledMissile({ missile }) {
  const meshRef = useRef();
  const { position, type, weaponType = 'default', size = 0.2, color: missileColor, rotation } = missile;
  const showCollisionCircles = useGameStore((state) => state.debug.showCollisionCircles);
  
  // Check if this weapon type uses pooling
  const isPooledWeapon = ['rocket', 'bfg', 'bomb', 'railgun'].includes(weaponType);
  
  useEffect(() => {
    if (isPooledWeapon) {
      // Acquire mesh from pool
      const pooledMesh = weaponMeshPool.acquire(weaponType, missile.id);
      
      if (pooledMesh) {
        meshRef.current = pooledMesh;
        
        // Apply initial transform
        pooledMesh.position.set(position.x, position.y, position.z);
        if (rotation) {
          pooledMesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
        }
        
        // Apply scale based on size
        const scale = size / 0.2; // Normalize to default size
        pooledMesh.scale.set(scale, scale, scale);
        
        // Update color if provided
        if (missileColor && pooledMesh.userData.updateColor) {
          pooledMesh.userData.updateColor(missileColor);
        }
        
        // Special handling for bombs
        if (weaponType === 'bomb' && pooledMesh.userData.updateAnimation) {
          pooledMesh.userData.updateAnimation(missile.isDeployed);
        }
      }
      
      // Return mesh to pool on unmount
      return () => {
        if (meshRef.current) {
          weaponMeshPool.release(missile.id);
          meshRef.current = null;
        }
      };
    }
  }, [missile.id, weaponType, isPooledWeapon]); // Removed position, rotation, size, missileColor to prevent excessive re-runs
  
  // Update position every frame
  useFrame(() => {
    if (meshRef.current && isPooledWeapon) {
      meshRef.current.position.x = position.x;
      meshRef.current.position.y = position.y;
      meshRef.current.position.z = position.z;
      
      if (rotation) {
        meshRef.current.rotation.x = rotation.x || 0;
        meshRef.current.rotation.y = rotation.y || 0;
        meshRef.current.rotation.z = rotation.z || 0;
      }
      
      // Update bomb deployment state
      if (weaponType === 'bomb' && meshRef.current.userData.updateAnimation) {
        meshRef.current.userData.updateAnimation(missile.isDeployed);
      }
    }
  });
  
  // For pooled weapons, the mesh is managed directly - just render debug if needed
  if (isPooledWeapon) {
    return (
      <>
        {/* Debug collision circle */}
        {showCollisionCircles && (
          <mesh position={[position.x, position.y, position.z]}>
            <sphereGeometry args={[size, 8, 6]} />
            <meshBasicMaterial 
              color={type === 'player' ? '#00ff00' : '#ff0000'} 
              wireframe
              transparent 
              opacity={0.3}
            />
          </mesh>
        )}
      </>
    );
  }
  
  // For simple weapons, render basic sphere
  const color = missileColor || (type === 'player' ? '#00ffff' : '#ff0000');
  
  return (
    <mesh position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[size, 8, 6]} />
      <meshBasicMaterial color={color} />
      
      {/* Debug collision circle */}
      {showCollisionCircles && (
        <mesh>
          <sphereGeometry args={[size, 8, 6]} />
          <meshBasicMaterial 
            color={type === 'player' ? '#00ff00' : '#ff0000'} 
            wireframe
            transparent 
            opacity={0.3}
          />
        </mesh>
      )}
    </mesh>
  );
}, (prevProps, nextProps) => {
  // Only re-render if position changed significantly
  const threshold = 0.01;
  const posDiff = Math.abs(prevProps.missile.position.x - nextProps.missile.position.x) +
                  Math.abs(prevProps.missile.position.y - nextProps.missile.position.y) +
                  Math.abs(prevProps.missile.position.z - nextProps.missile.position.z);
  
  return prevProps.missile.id === nextProps.missile.id && posDiff < threshold;
});

export default PooledMissile;