import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { useKeyboard } from '../hooks/useKeyboard';
import * as THREE from 'three';

function EngineTrails() {
  const trailsRef = useRef();
  const playerPosition = useGameStore((state) => state.playerPosition);
  const keys = useKeyboard();
  
  // Create small fire effect particles
  const trailData = useMemo(() => {
    const positions = [];
    const velocities = [];
    const colors = [];
    const sizes = [];
    const lifetimes = [];
    const count = 60; // Fewer particles for small fire effect
    
    for (let i = 0; i < count; i++) {
      // Start particles at the rear of the ship (z=+1)
      positions.push(
        (Math.random() - 0.5) * 0.134, // X: 33% smaller spread (0.2 * 0.67)
        (Math.random() - 0.5) * 0.134, // Y: 33% smaller spread
        1.0                          // Z: at rear of torso
      );
      
      // Fire particles move backward with some randomness - reduced range
      velocities.push(
        (Math.random() - 0.5) * 0.3,  // X: even tighter spread
        (Math.random() - 0.5) * 0.2,  // Y: even tighter spread
        Math.random() * 1.5 + 1       // Z: much slower, shorter range movement
      );
      
      // Fire colors - yellow/orange core to red edges
      const heat = Math.random();
      colors.push(
        1.0,                         // R: full red
        0.3 + heat * 0.7,           // G: orange to yellow
        heat * heat * 0.5           // B: slight yellow in hottest parts
      );
      
      sizes.push((Math.random() * 0.8 + 0.3) * 0.67); // 33% smaller particles
      lifetimes.push(Math.random()); // Random initial lifetime
    }
    
    return { positions, velocities, colors, sizes, lifetimes, count };
  }, []);
  
  useFrame((state, delta) => {
    if (trailsRef.current) {
      const positions = trailsRef.current.attributes.position.array;
      const colors = trailsRef.current.attributes.color.array;
      const sizes = trailsRef.current.attributes.size.array;
      
      // Fire is always active but intensifies with movement
      const isMoving = keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown || 
                      keys.KeyA || keys.KeyD || keys.KeyW || keys.KeyS;
      const movementIntensity = isMoving ? 1.2 : 0.7;
      
      for (let i = 0; i < trailData.count; i++) {
        const i3 = i * 3;
        
        // Update lifetime
        trailData.lifetimes[i] -= delta * 2; // Faster lifecycle for fire
        
        if (trailData.lifetimes[i] <= 0) {
          // Respawn particle at engine position
          positions[i3] = (Math.random() - 0.5) * 0.134;     // X: 33% smaller at engine
          positions[i3 + 1] = (Math.random() - 0.5) * 0.134; // Y: 33% smaller at engine
          positions[i3 + 2] = 1.0;                         // Z: rear of torso
          
          // Reset velocity with some variation - reduced to match initial values
          trailData.velocities[i] = (Math.random() - 0.5) * 0.3;
          trailData.velocities[i + 1] = (Math.random() - 0.5) * 0.2;
          trailData.velocities[i + 2] = Math.random() * 1.5 + 1;
          
          // Reset lifetime - shorter to prevent flames from appearing far from ship
          trailData.lifetimes[i] = 0.15 + Math.random() * 0.25; // 0.15-0.4 seconds (much shorter)
        } else {
          // Move particles
          positions[i3] += trailData.velocities[i] * delta;
          positions[i3 + 1] += trailData.velocities[i + 1] * delta;
          positions[i3 + 2] += trailData.velocities[i + 2] * delta;
          
          // Add slight upward drift (fire rises)
          positions[i3 + 1] += 0.5 * delta;
          
          // Expand outward over time
          positions[i3] += (positions[i3] - 0) * 0.3 * delta;
          positions[i3 + 1] += (positions[i3 + 1] - 0) * 0.3 * delta;
        }
        
        // Calculate fade based on lifetime - updated for shorter max lifetime
        const lifetimeRatio = trailData.lifetimes[i] / 0.4;
        const fade = Math.pow(lifetimeRatio, 0.5); // Square root for slower fade
        
        // Orange/fiery colors with movement intensity
        const heat = 1.0 - lifetimeRatio; // Gets cooler as it ages
        colors[i3] = 1.0 * fade * movementIntensity;                    // R: full red
        colors[i3 + 1] = (0.4 + heat * 0.6) * fade * movementIntensity; // G: orange to yellow
        colors[i3 + 2] = heat * 0.1 * fade * movementIntensity;         // B: minimal blue for hot orange
        
        // Size grows then shrinks
        const sizeMultiplier = lifetimeRatio < 0.3 ? lifetimeRatio / 0.3 : fade;
        sizes[i] = trailData.sizes[i] * sizeMultiplier * movementIntensity;
      }
      
      trailsRef.current.attributes.position.needsUpdate = true;
      trailsRef.current.attributes.color.needsUpdate = true;
      trailsRef.current.attributes.size.needsUpdate = true;
    }
  });
  
  return (
    <group position={[playerPosition.x, playerPosition.y, 0]}>
      <points>
        <bufferGeometry ref={trailsRef}>
          <bufferAttribute
            attach="attributes-position"
            count={trailData.count}
            array={new Float32Array(trailData.positions)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={trailData.count}
            array={new Float32Array(trailData.colors)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={trailData.count}
            array={new Float32Array(trailData.sizes)}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.67}
          transparent
          opacity={0.8}
          vertexColors
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export default EngineTrails;