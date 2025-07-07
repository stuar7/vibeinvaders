import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function ImpactEffects() {
  const sparkRef = useRef();
  const explosionRef = useRef();
  const debrisRef = useRef();
  const effects = useGameStore((state) => state.effects);
  const removeEffect = useGameStore((state) => state.removeEffect);
  
  // Track processed effects to clean them up
  const processedEffects = useRef(new Set());
  
  // Create impact spark particles
  const sparkData = useMemo(() => {
    const positions = new Float32Array(300 * 3); // 100 particles * 3 coords
    const velocities = new Float32Array(300);
    const colors = new Float32Array(300 * 3);
    const sizes = new Float32Array(300);
    const lifetimes = new Float32Array(300);
    const count = 100;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      velocities[i] = 0;
      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 0.5;
      sizes[i] = 0;
      lifetimes[i] = 0;
    }
    
    return { 
      positions, 
      velocities: new Float32Array(300), 
      colors, 
      sizes, 
      lifetimes, 
      count,
      directions: new Float32Array(300) // Store normalized direction vectors
    };
  }, []);
  
  // Create explosion particles
  const explosionData = useMemo(() => {
    const positions = new Float32Array(450 * 3); // 150 particles * 3 coords
    const velocities = new Float32Array(450);
    const colors = new Float32Array(450 * 3);
    const sizes = new Float32Array(450);
    const lifetimes = new Float32Array(450);
    const count = 150;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      velocities[i] = 0;
      colors[i3] = 1;
      colors[i3 + 1] = 0.5;
      colors[i3 + 2] = 0;
      sizes[i] = 0;
      lifetimes[i] = 0;
    }
    
    return { 
      positions, 
      velocities: new Float32Array(450),
      colors, 
      sizes, 
      lifetimes, 
      count,
      directions: new Float32Array(450) // Store normalized direction vectors
    };
  }, []);
  
  // Create debris particles (larger chunks)
  const debrisData = useMemo(() => {
    const positions = new Float32Array(60 * 3); // 20 particles * 3 coords
    const velocities = new Float32Array(60);
    const rotations = new Float32Array(60); // Angular velocities
    const colors = new Float32Array(60 * 3);
    const sizes = new Float32Array(60);
    const lifetimes = new Float32Array(60);
    const count = 20;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      velocities[i] = 0;
      rotations[i] = 0;
      colors[i3] = 0.8;
      colors[i3 + 1] = 0.8;
      colors[i3 + 2] = 0.8;
      sizes[i] = 0;
      lifetimes[i] = 0;
    }
    
    return { 
      positions, 
      velocities: new Float32Array(60),
      rotations,
      colors, 
      sizes, 
      lifetimes, 
      count,
      directions: new Float32Array(60) // Store normalized direction vectors
    };
  }, []);
  
  // Clean up processed effects periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const toRemove = Array.from(processedEffects.current);
      if (toRemove.length > 0) {
        // Remove effects that have been processed
        toRemove.forEach(id => {
          removeEffect(id);
          processedEffects.current.delete(id);
        });
      }
    }, 2000); // Clean up every 2 seconds
    
    return () => clearInterval(cleanupInterval);
  }, [removeEffect]);
  
  useFrame((state, delta) => {
    // Update spark particles
    if (sparkRef.current && sparkRef.current.attributes) {
      const positions = sparkRef.current.attributes.position;
      const colors = sparkRef.current.attributes.color;
      const sizes = sparkRef.current.attributes.size;
      
      for (let i = 0; i < sparkData.count; i++) {
        if (sparkData.lifetimes[i] > 0) {
          const i3 = i * 3;
          
          // Update position using velocity
          const velocity = sparkData.velocities[i];
          positions.array[i3] += sparkData.directions[i3] * velocity * delta;
          positions.array[i3 + 1] += sparkData.directions[i3 + 1] * velocity * delta;
          positions.array[i3 + 2] += sparkData.directions[i3 + 2] * velocity * delta;
          
          // Apply gravity to Y component
          sparkData.directions[i3 + 1] -= 9.8 * delta * 0.5;
          
          // Apply friction
          sparkData.velocities[i] *= 0.96;
          
          // Update lifetime
          sparkData.lifetimes[i] -= delta;
          const lifeRatio = sparkData.lifetimes[i] / 1.0;
          
          // Fade out
          const fade = Math.max(0, lifeRatio);
          colors.array[i3] = fade;
          colors.array[i3 + 1] = fade * 0.8;
          colors.array[i3 + 2] = fade * 0.3;
          
          sizes.array[i] = fade * sparkData.sizes[i];
        } else {
          sizes.array[i] = 0;
        }
      }
      
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      sizes.needsUpdate = true;
    }
    
    // Update explosion particles
    if (explosionRef.current && explosionRef.current.attributes) {
      const positions = explosionRef.current.attributes.position;
      const colors = explosionRef.current.attributes.color;
      const sizes = explosionRef.current.attributes.size;
      
      for (let i = 0; i < explosionData.count; i++) {
        if (explosionData.lifetimes[i] > 0) {
          const i3 = i * 3;
          
          // Update position
          const velocity = explosionData.velocities[i];
          positions.array[i3] += explosionData.directions[i3] * velocity * delta;
          positions.array[i3 + 1] += explosionData.directions[i3 + 1] * velocity * delta;
          positions.array[i3 + 2] += explosionData.directions[i3 + 2] * velocity * delta;
          
          // Apply friction
          explosionData.velocities[i] *= 0.92;
          
          // Update lifetime
          explosionData.lifetimes[i] -= delta;
          const lifeRatio = explosionData.lifetimes[i] / 2.0;
          
          // Color transition: white -> yellow -> orange -> red -> dark
          const fade = Math.max(0, lifeRatio);
          const heat = fade * fade; // Squared for faster falloff
          
          if (fade > 0.7) {
            // White to yellow
            colors.array[i3] = 1;
            colors.array[i3 + 1] = 1;
            colors.array[i3 + 2] = fade;
          } else if (fade > 0.4) {
            // Yellow to orange
            colors.array[i3] = 1;
            colors.array[i3 + 1] = fade;
            colors.array[i3 + 2] = 0;
          } else {
            // Orange to red to dark
            colors.array[i3] = fade * 2.5;
            colors.array[i3 + 1] = fade * 0.5;
            colors.array[i3 + 2] = 0;
          }
          
          // Expand then shrink
          const sizeMultiplier = fade > 0.5 ? 1 + (1 - fade) : fade * 2;
          sizes.array[i] = explosionData.sizes[i] * sizeMultiplier;
        } else {
          sizes.array[i] = 0;
        }
      }
      
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      sizes.needsUpdate = true;
    }
    
    // Update debris particles
    if (debrisRef.current && debrisRef.current.attributes) {
      const positions = debrisRef.current.attributes.position;
      const colors = debrisRef.current.attributes.color;
      const sizes = debrisRef.current.attributes.size;
      
      for (let i = 0; i < debrisData.count; i++) {
        if (debrisData.lifetimes[i] > 0) {
          const i3 = i * 3;
          
          // Update position
          const velocity = debrisData.velocities[i];
          positions.array[i3] += debrisData.directions[i3] * velocity * delta;
          positions.array[i3 + 1] += debrisData.directions[i3 + 1] * velocity * delta;
          positions.array[i3 + 2] += debrisData.directions[i3 + 2] * velocity * delta;
          
          // Apply gravity
          debrisData.directions[i3 + 1] -= 15 * delta;
          
          // Apply friction
          debrisData.velocities[i] *= 0.98;
          
          // Rotate debris
          debrisData.rotations[i] += delta * 2;
          
          // Update lifetime
          debrisData.lifetimes[i] -= delta;
          const fade = Math.max(0, debrisData.lifetimes[i] / 3.0);
          
          // Darken over time
          colors.array[i3] = 0.8 * fade;
          colors.array[i3 + 1] = 0.7 * fade;
          colors.array[i3 + 2] = 0.6 * fade;
          
          sizes.array[i] = debrisData.sizes[i] * fade;
        } else {
          sizes.array[i] = 0;
        }
      }
      
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      sizes.needsUpdate = true;
    }
    
    // Process new effects
    effects.forEach(effect => {
      if (!processedEffects.current.has(effect.id)) {
        if (effect.type === 'hit') {
          spawnSparks(effect.position);
          processedEffects.current.add(effect.id);
        } else if (effect.type === 'explosion') {
          spawnExplosion(effect.position);
          spawnDebris(effect.position);
          processedEffects.current.add(effect.id);
        }
      }
    });
  });
  
  const spawnSparks = (position) => {
    let spawned = 0;
    for (let i = 0; i < sparkData.count && spawned < 20; i++) {
      if (sparkData.lifetimes[i] <= 0) {
        const i3 = i * 3;
        
        // Set position
        sparkData.positions[i3] = position.x;
        sparkData.positions[i3 + 1] = position.y;
        sparkData.positions[i3 + 2] = position.z || 0;
        
        // Random direction in cone shape
        const angle = Math.random() * Math.PI * 2;
        const spread = Math.random() * 0.5 + 0.5;
        sparkData.directions[i3] = Math.cos(angle) * spread;
        sparkData.directions[i3 + 1] = Math.random() * 0.5 + 0.5; // Upward bias
        sparkData.directions[i3 + 2] = Math.sin(angle) * spread;
        
        // Normalize direction
        const length = Math.sqrt(
          sparkData.directions[i3] * sparkData.directions[i3] +
          sparkData.directions[i3 + 1] * sparkData.directions[i3 + 1] +
          sparkData.directions[i3 + 2] * sparkData.directions[i3 + 2]
        );
        sparkData.directions[i3] /= length;
        sparkData.directions[i3 + 1] /= length;
        sparkData.directions[i3 + 2] /= length;
        
        // Set velocity
        sparkData.velocities[i] = 15 + Math.random() * 15;
        
        // Set size
        sparkData.sizes[i] = 0.5 + Math.random() * 1.0;
        
        // Set lifetime
        sparkData.lifetimes[i] = 0.5 + Math.random() * 0.5;
        
        spawned++;
      }
    }
  };
  
  const spawnExplosion = (position) => {
    let spawned = 0;
    for (let i = 0; i < explosionData.count && spawned < 40; i++) {
      if (explosionData.lifetimes[i] <= 0) {
        const i3 = i * 3;
        
        // Set position with small random offset
        explosionData.positions[i3] = position.x + (Math.random() - 0.5) * 0.5;
        explosionData.positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.5;
        explosionData.positions[i3 + 2] = (position.z || 0) + (Math.random() - 0.5) * 0.5;
        
        // Random spherical direction
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        explosionData.directions[i3] = Math.sin(phi) * Math.cos(theta);
        explosionData.directions[i3 + 1] = Math.sin(phi) * Math.sin(theta);
        explosionData.directions[i3 + 2] = Math.cos(phi);
        
        // Set velocity with variation
        explosionData.velocities[i] = 8 + Math.random() * 20;
        
        // Set size
        explosionData.sizes[i] = 1 + Math.random() * 2;
        
        // Set lifetime
        explosionData.lifetimes[i] = 1.0 + Math.random() * 1.0;
        
        spawned++;
      }
    }
  };
  
  const spawnDebris = (position) => {
    let spawned = 0;
    for (let i = 0; i < debrisData.count && spawned < 8; i++) {
      if (debrisData.lifetimes[i] <= 0) {
        const i3 = i * 3;
        
        // Set position
        debrisData.positions[i3] = position.x;
        debrisData.positions[i3 + 1] = position.y;
        debrisData.positions[i3 + 2] = position.z || 0;
        
        // Random direction with upward bias
        const angle = Math.random() * Math.PI * 2;
        debrisData.directions[i3] = Math.cos(angle) * 0.8;
        debrisData.directions[i3 + 1] = 0.5 + Math.random() * 0.5;
        debrisData.directions[i3 + 2] = Math.sin(angle) * 0.8;
        
        // Normalize
        const length = Math.sqrt(
          debrisData.directions[i3] * debrisData.directions[i3] +
          debrisData.directions[i3 + 1] * debrisData.directions[i3 + 1] +
          debrisData.directions[i3 + 2] * debrisData.directions[i3 + 2]
        );
        debrisData.directions[i3] /= length;
        debrisData.directions[i3 + 1] /= length;
        debrisData.directions[i3 + 2] /= length;
        
        // Set velocity
        debrisData.velocities[i] = 5 + Math.random() * 10;
        
        // Set rotation speed
        debrisData.rotations[i] = (Math.random() - 0.5) * 10;
        
        // Set size
        debrisData.sizes[i] = 2 + Math.random() * 3;
        
        // Set lifetime
        debrisData.lifetimes[i] = 2 + Math.random() * 1;
        
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
            array={sparkData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={sparkData.count}
            array={sparkData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={sparkData.count}
            array={sparkData.sizes}
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
          depthWrite={false}
        />
      </points>
      
      {/* Explosion Particles */}
      <points>
        <bufferGeometry ref={explosionRef}>
          <bufferAttribute
            attach="attributes-position"
            count={explosionData.count}
            array={explosionData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={explosionData.count}
            array={explosionData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={explosionData.count}
            array={explosionData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={4.0}
          transparent
          opacity={0.85}
          vertexColors
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      
      {/* Debris Particles */}
      <points>
        <bufferGeometry ref={debrisRef}>
          <bufferAttribute
            attach="attributes-position"
            count={debrisData.count}
            array={debrisData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={debrisData.count}
            array={debrisData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={debrisData.count}
            array={debrisData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={5.0}
          transparent
          opacity={0.7}
          vertexColors
          sizeAttenuation
          blending={THREE.NormalBlending}
          depthWrite={true}
        />
      </points>
    </>
  );
}

export default ImpactEffects;