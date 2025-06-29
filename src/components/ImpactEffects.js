import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function ImpactEffects() {
  const sparkRef = useRef();
  const explosionRef = useRef();
  const effects = useGameStore((state) => state.effects);
  
  // Create impact spark particles
  const sparkData = useMemo(() => {
    const positions = [];
    const velocities = [];
    const colors = [];
    const sizes = [];
    const lifetimes = [];
    const count = 100;
    
    for (let i = 0; i < count; i++) {
      positions.push(0, 0, 0); // Will be updated dynamically
      velocities.push(
        (Math.random() - 0.5) * 20,  // X: spread outward
        (Math.random() - 0.5) * 20,  // Y: spread outward
        (Math.random() - 0.5) * 15   // Z: some depth
      );
      colors.push(1, 1, 0.5); // Bright yellow-white sparks
      sizes.push(Math.random() * 1.5 + 0.5);
      lifetimes.push(0); // Will be set when spark is created
    }
    
    return { positions, velocities, colors, sizes, lifetimes, count };
  }, []);
  
  // Create explosion particles
  const explosionData = useMemo(() => {
    const positions = [];
    const velocities = [];
    const colors = [];
    const sizes = [];
    const lifetimes = [];
    const count = 150;
    
    for (let i = 0; i < count; i++) {
      positions.push(0, 0, 0); // Will be updated dynamically
      velocities.push(
        (Math.random() - 0.5) * 30,  // X: large spread
        (Math.random() - 0.5) * 30,  // Y: large spread
        (Math.random() - 0.5) * 25   // Z: depth movement
      );
      
      // Explosion colors - red to orange to yellow
      const heat = Math.random();
      colors.push(
        1.0,                    // R: always full red
        0.3 + heat * 0.7,       // G: orange to yellow
        heat * 0.5              // B: some yellow highlights
      );
      
      sizes.push(Math.random() * 3 + 1);
      lifetimes.push(0);
    }
    
    return { positions, velocities, colors, sizes, lifetimes, count };
  }, []);
  
  useFrame((state, delta) => {
    if (sparkRef.current) {
      const positions = sparkRef.current.attributes.position.array;
      const colors = sparkRef.current.attributes.color.array;
      const sizes = sparkRef.current.attributes.size.array;
      
      // Update spark particles
      for (let i = 0; i < sparkData.count; i++) {
        const i3 = i * 3;
        
        if (sparkData.lifetimes[i] > 0) {
          // Update position
          positions[i3] += sparkData.velocities[i] * delta;
          positions[i3 + 1] += sparkData.velocities[i + 1] * delta;
          positions[i3 + 2] += sparkData.velocities[i + 2] * delta;
          
          // Apply gravity and friction
          sparkData.velocities[i] *= 0.98;
          sparkData.velocities[i + 1] *= 0.98;
          sparkData.velocities[i + 2] *= 0.98;
          
          // Fade out over time
          sparkData.lifetimes[i] -= delta;
          const fade = Math.max(0, sparkData.lifetimes[i] / 1.0); // 1 second lifetime
          
          colors[i3] = fade * 1.0;     // R
          colors[i3 + 1] = fade * 1.0; // G
          colors[i3 + 2] = fade * 0.5; // B
          
          sizes[i] = sparkData.sizes[i] * fade;
        } else {
          // Hide dead particles
          sizes[i] = 0;
        }
      }
      
      sparkRef.current.attributes.position.needsUpdate = true;
      sparkRef.current.attributes.color.needsUpdate = true;
      sparkRef.current.attributes.size.needsUpdate = true;
    }
    
    if (explosionRef.current) {
      const positions = explosionRef.current.attributes.position.array;
      const colors = explosionRef.current.attributes.color.array;
      const sizes = explosionRef.current.attributes.size.array;
      
      // Update explosion particles
      for (let i = 0; i < explosionData.count; i++) {
        const i3 = i * 3;
        
        if (explosionData.lifetimes[i] > 0) {
          // Update position
          positions[i3] += explosionData.velocities[i] * delta;
          positions[i3 + 1] += explosionData.velocities[i + 1] * delta;
          positions[i3 + 2] += explosionData.velocities[i + 2] * delta;
          
          // Apply friction
          explosionData.velocities[i] *= 0.95;
          explosionData.velocities[i + 1] *= 0.95;
          explosionData.velocities[i + 2] *= 0.95;
          
          // Fade out over time
          explosionData.lifetimes[i] -= delta;
          const fade = Math.max(0, explosionData.lifetimes[i] / 2.0); // 2 second lifetime
          
          // Color transition from white -> red -> orange -> dark
          const intensity = fade * fade; // Squared for faster falloff
          colors[i3] = intensity * 1.0;     // R
          colors[i3 + 1] = intensity * (0.3 + fade * 0.7); // G
          colors[i3 + 2] = intensity * fade * 0.5; // B
          
          sizes[i] = explosionData.sizes[i] * fade;
        } else {
          // Hide dead particles
          sizes[i] = 0;
        }
      }
      
      explosionRef.current.attributes.position.needsUpdate = true;
      explosionRef.current.attributes.color.needsUpdate = true;
      explosionRef.current.attributes.size.needsUpdate = true;
    }
    
    // Check for new impact effects to spawn
    effects.forEach(effect => {
      if (effect.type === 'hit' && !effect.processed) {
        // Spawn impact sparks
        spawnSparks(effect.position);
        effect.processed = true;
      } else if (effect.type === 'explosion' && !effect.processed) {
        // Spawn explosion particles
        spawnExplosion(effect.position);
        effect.processed = true;
      }
    });
  });
  
  const spawnSparks = (position) => {
    // Find available spark particles and activate them
    let spawned = 0;
    for (let i = 0; i < sparkData.count && spawned < 15; i++) {
      if (sparkData.lifetimes[i] <= 0) {
        const i3 = i * 3;
        
        // Set position
        sparkData.positions[i3] = position.x;
        sparkData.positions[i3 + 1] = position.y;
        sparkData.positions[i3 + 2] = position.z;
        
        // Reset velocity with random spread
        sparkData.velocities[i] = (Math.random() - 0.5) * 25;
        sparkData.velocities[i + 1] = (Math.random() - 0.5) * 25;
        sparkData.velocities[i + 2] = (Math.random() - 0.5) * 20;
        
        // Set lifetime
        sparkData.lifetimes[i] = 0.8 + Math.random() * 0.4; // 0.8-1.2 seconds
        
        spawned++;
      }
    }
  };
  
  const spawnExplosion = (position) => {
    // Find available explosion particles and activate them
    let spawned = 0;
    for (let i = 0; i < explosionData.count && spawned < 30; i++) {
      if (explosionData.lifetimes[i] <= 0) {
        const i3 = i * 3;
        
        // Set position
        explosionData.positions[i3] = position.x;
        explosionData.positions[i3 + 1] = position.y;
        explosionData.positions[i3 + 2] = position.z;
        
        // Reset velocity with random spread
        explosionData.velocities[i] = (Math.random() - 0.5) * 35;
        explosionData.velocities[i + 1] = (Math.random() - 0.5) * 35;
        explosionData.velocities[i + 2] = (Math.random() - 0.5) * 30;
        
        // Set lifetime
        explosionData.lifetimes[i] = 1.5 + Math.random() * 1.0; // 1.5-2.5 seconds
        
        spawned++;
      }
    }
  };
  
  return (
    <>
      {/* Impact Sparks */}
      <points>
        <bufferGeometry ref={sparkRef}>
          <bufferAttribute
            attach="attributes-position"
            count={sparkData.count}
            array={new Float32Array(sparkData.positions)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={sparkData.count}
            array={new Float32Array(sparkData.colors)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={sparkData.count}
            array={new Float32Array(sparkData.sizes)}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={2.0}
          transparent
          opacity={0.9}
          vertexColors
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Explosion Particles */}
      <points>
        <bufferGeometry ref={explosionRef}>
          <bufferAttribute
            attach="attributes-position"
            count={explosionData.count}
            array={new Float32Array(explosionData.positions)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={explosionData.count}
            array={new Float32Array(explosionData.colors)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={explosionData.count}
            array={new Float32Array(explosionData.sizes)}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={3.0}
          transparent
          opacity={0.8}
          vertexColors
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

export default ImpactEffects;