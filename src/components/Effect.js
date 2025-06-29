import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

function Effect({ effect }) {
  const groupRef = useRef();
  const { id, type, position, startTime, color } = effect;
  const removeEffect = useGameStore((state) => state.removeEffect);
  
  const particles = useMemo(() => {
    const particleCount = type === 'explosion' ? 20 : 10;
    const particlesData = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.2;
      
      particlesData.push({
        position: new THREE.Vector3(position.x, position.y, position.z || 0),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * speed * 0.5
        ),
        scale: 0.2 + Math.random() * 0.3,
        rotation: Math.random() * Math.PI * 2,
      });
    }
    
    return particlesData;
  }, [type, position]);
  
  const getParticleColor = () => {
    switch (type) {
      case 'explosion':
        return '#ff8800';
      case 'hit':
        return '#ffff00';
      case 'playerHit':
        return '#ff0000';
      case 'shieldHit':
        return '#00ffff';
      case 'powerupCollect':
        return color || '#ffffff';
      default:
        return '#ffffff';
    }
  };
  
  useFrame((state) => {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / 1000;
    
    if (progress > 1) {
      removeEffect(id);
      return;
    }
    
    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        const particle = particles[index];
        
        child.position.x = particle.position.x + particle.velocity.x * progress * 10;
        child.position.y = particle.position.y + particle.velocity.y * progress * 10;
        child.position.z = particle.position.z + particle.velocity.z * progress * 10;
        
        const scale = particle.scale * (1 - progress);
        child.scale.set(scale, scale, scale);
        
        child.rotation.z = particle.rotation + progress * Math.PI * 2;
        
        if (child.material) {
          child.material.opacity = 1 - progress;
        }
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      {particles.map((particle, index) => (
        <mesh key={index}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshBasicMaterial 
            color={getParticleColor()} 
            transparent 
            opacity={1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export default Effect;