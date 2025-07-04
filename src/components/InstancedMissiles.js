import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import InstancedMissileSystem from '../systems/InstancedMissileSystem';

function InstancedMissiles() {
  const missiles = useGameStore((state) => state.missiles);
  const groupRef = useRef();
  
  // Create instanced missile system (singleton)
  const instancedSystem = useMemo(() => new InstancedMissileSystem(), []);
  
  // Add instanced meshes to scene
  useEffect(() => {
    if (groupRef.current) {
      const meshes = instancedSystem.getInstancedMeshes();
      meshes.forEach(mesh => {
        groupRef.current.add(mesh);
      });
      
      return () => {
        meshes.forEach(mesh => {
          groupRef.current.remove(mesh);
        });
      };
    }
  }, [instancedSystem]);
  
  // Update missiles every frame
  useFrame(() => {
    instancedSystem.updateMissiles(missiles);
  });
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      instancedSystem.dispose();
    };
  }, [instancedSystem]);
  
  return <group ref={groupRef} />;
}

export default InstancedMissiles;