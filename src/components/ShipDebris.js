import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function DebrisComponent({ debris }) {
  const meshRef = useRef();
  const addEffect = useGameStore((state) => state.addEffect);
  const updateDebris = useGameStore((state) => state.updateDebris);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Check if debris has been destroyed (HP <= 0)
    if (debris.hp <= 0 && !debris.exploded) {
      // Mark as exploded to prevent multiple explosions
      debris.exploded = true;
      
      // Create small explosion effect
      addEffect({
        id: `debris-explosion-${debris.id}-${Date.now()}`,
        type: 'explosion',
        position: { ...debris.position },
        scale: 0.5, // Smaller than ship explosion
        color: '#ff6600',
        duration: 1000,
        particles: 10
      });
      
      // Remove debris from store
      const currentDebris = useGameStore.getState().debris || [];
      const filteredDebris = currentDebris.filter(piece => piece.id !== debris.id);
      updateDebris(filteredDebris);
      return;
    }
    
    // Update position based on velocity
    meshRef.current.position.x += debris.velocity.x * delta;
    meshRef.current.position.y += debris.velocity.y * delta;
    meshRef.current.position.z += debris.velocity.z * delta;
    
    // Apply rotation for spinning effect
    meshRef.current.rotation.x += debris.rotationSpeed.x * delta;
    meshRef.current.rotation.y += debris.rotationSpeed.y * delta;
    meshRef.current.rotation.z += debris.rotationSpeed.z * delta;
    
    // Apply gravity and air resistance
    debris.velocity.y -= 9.8 * delta * 0.1; // Reduced gravity for space effect
    debris.velocity.x *= 0.995; // Air resistance
    debris.velocity.y *= 0.995;
    debris.velocity.z *= 0.995;
    
    // Fade out over time
    const age = (Date.now() - debris.spawnTime) / 1000;
    const fadeStart = debris.lifetime * 0.7; // Start fading at 70% of lifetime
    
    if (age > fadeStart) {
      const fadeProgress = (age - fadeStart) / (debris.lifetime - fadeStart);
      const opacity = Math.max(0, 1 - fadeProgress);
      
      if (meshRef.current.material) {
        meshRef.current.material.transparent = true;
        meshRef.current.material.opacity = opacity;
      }
    }
  });
  
  const renderComponent = () => {
    const color = debris.originalColor || '#ff0000';
    
    switch (debris.componentType) {
      case 'fuselage':
        return (
          <mesh ref={meshRef}>
            <boxGeometry args={[0.6, 0.4, 2.0]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
        
      case 'nose':
        return (
          <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.4, 0.8, 4]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
        
      case 'leftWing':
        return (
          <mesh ref={meshRef}>
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
            <meshStandardMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
        );
        
      case 'rightWing':
        return (
          <mesh ref={meshRef}>
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
            <meshStandardMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
        );
        
      // Flying saucer components
      case 'saucerDisc':
        return (
          <mesh ref={meshRef}>
            <cylinderGeometry args={[1.5, 1.8, 0.3, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
        
      case 'saucerDome':
        return (
          <mesh ref={meshRef}>
            <sphereGeometry args={[0.8, 12, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
        
      case 'saucerHull':
        return (
          <mesh ref={meshRef}>
            <sphereGeometry args={[1.2, 12, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
        
      case 'saucerEngine':
        return (
          <mesh ref={meshRef}>
            <cylinderGeometry args={[0.3, 0.5, 0.8, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
        
      default:
        return (
          <mesh ref={meshRef}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
    }
  };
  
  return renderComponent();
}

function ShipDebris() {
  const debris = useGameStore((state) => state.debris || []);
  const updateDebris = useGameStore((state) => state.updateDebris);
  const playerPosition = useGameStore((state) => state.playerPosition);
  
  useFrame(() => {
    const currentTime = Date.now();
    const currentDebris = useGameStore.getState().debris || [];
    
    // Remove expired debris or debris that's too far away/behind player
    const filteredDebris = currentDebris.filter(piece => {
      const age = (currentTime - piece.spawnTime) / 1000;
      
      // Remove if expired
      if (age > piece.lifetime) return false;
      
      // Remove if too far from player or behind player
      const dx = piece.position.x - playerPosition.x;
      const dy = piece.position.y - playerPosition.y;
      const dz = piece.position.z - playerPosition.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // Remove if too far away (>200 units) or behind player (z > player + 50)
      if (distance > 200 || piece.position.z > playerPosition.z + 50) return false;
      
      return true;
    });
    
    if (filteredDebris.length !== currentDebris.length) {
      updateDebris(filteredDebris);
    }
  });
  
  return (
    <>
      {debris.map((piece) => (
        <DebrisComponent key={piece.id} debris={piece} />
      ))}
    </>
  );
}

export default ShipDebris;