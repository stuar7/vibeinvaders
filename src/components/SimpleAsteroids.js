import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function SimpleAsteroid({ asteroid }) {
  const meshRef = useRef();
  
  // Create geometry variations
  const geometry = useMemo(() => {
    const size = asteroid.size || 1;
    
    // Create irregular asteroid shape
    const geometry = new THREE.IcosahedronGeometry(size, 1);
    const vertices = geometry.attributes.position.array;
    
    // Randomize vertices for irregular shape
    for (let i = 0; i < vertices.length; i += 3) {
      const randomFactor = 0.3 + Math.random() * 0.4; // 0.3 to 0.7 variation
      vertices[i] *= randomFactor;
      vertices[i + 1] *= randomFactor;
      vertices[i + 2] *= randomFactor;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }, [asteroid.id, asteroid.size]);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Update position
    meshRef.current.position.x = asteroid.position.x;
    meshRef.current.position.y = asteroid.position.y;
    meshRef.current.position.z = asteroid.position.z;
    
    // Apply rotation
    if (asteroid.rotation) {
      meshRef.current.rotation.x += asteroid.rotation.x;
      meshRef.current.rotation.y += asteroid.rotation.y;
      meshRef.current.rotation.z += asteroid.rotation.z;
    }
  });
  
  const color = asteroid.type === 'Large' ? '#666666' : '#888888';
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color={color}
        roughness={0.9}
        metalness={0.1}
        flatShading
      />
    </mesh>
  );
}

function SimpleAsteroids() {
  const spawnTimerRef = useRef(0);
  const nextSpawnTimeRef = useRef(2); // First spawn after 2 seconds
  
  const asteroids = useGameStore((state) => state.asteroids);
  const updateAsteroids = useGameStore((state) => state.updateAsteroids);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const gameState = useGameStore((state) => state.gameState);
  const gameMode = useGameStore((state) => state.gameMode);
  const isBraking = useGameStore((state) => state.isBraking);
  const isBoosting = useGameStore((state) => state.isBoosting);
  
  // Simple asteroid spawning
  const spawnAsteroid = () => {
    const id = Date.now() + Math.random();
    
    // Random size
    const sizeRoll = Math.random();
    let size;
    if (sizeRoll < 0.1) {
      size = 4 + Math.random() * 2; // Large: 4-6
    } else {
      size = 1 + Math.random() * 2; // Normal: 1-3
    }
    
    // Spawn ahead of player in a cone
    const spawnDistance = 150 + Math.random() * 100; // 150-250 units ahead
    const spawnAngle = (Math.random() - 0.5) * Math.PI * 0.5; // ±45 degrees
    const spawnHeight = (Math.random() - 0.5) * 40; // ±20 units vertical
    
    const spawnX = playerPosition.x + Math.sin(spawnAngle) * spawnDistance;
    const spawnY = playerPosition.y + spawnHeight;
    const spawnZ = playerPosition.z - spawnDistance; // Ahead of player
    
    const newAsteroid = {
      id: `asteroid-${id}`,
      position: { x: spawnX, y: spawnY, z: spawnZ },
      velocity: {
        x: (Math.random() - 0.5) * 2, // Slight drift
        y: (Math.random() - 0.5) * 1,
        z: 10 + Math.random() * 15  // Move toward player
      },
      rotation: {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01
      },
      size: size,
      type: size > 3 ? 'Large' : 'Normal',
      health: size * 2,
      maxHealth: size * 2,
      spawnTime: Date.now()
    };
    
    return newAsteroid;
  };
  
  useFrame((state, delta) => {
    // Only run in free flight mode when game is playing
    if (gameMode !== 'freeflight' || gameState !== 'playing') return;
    
    const currentAsteroids = asteroids || [];
    
    // Spawning logic
    spawnTimerRef.current += delta;
    
    if (spawnTimerRef.current >= nextSpawnTimeRef.current && currentAsteroids.length < 12) {
      const newAsteroid = spawnAsteroid();
      updateAsteroids([...currentAsteroids, newAsteroid]);
      
      spawnTimerRef.current = 0;
      nextSpawnTimeRef.current = 3 + Math.random() * 4; // 3-7 seconds between spawns
      
      console.log('[SIMPLE ASTEROIDS] Spawned asteroid at:', newAsteroid.position);
    }
    
    // Movement multiplier based on player actions
    let movementMultiplier = 1.0;
    if (isBraking) {
      movementMultiplier = 0.2;
    } else if (isBoosting) {
      movementMultiplier = 2.0;
    }
    
    // Update asteroid positions
    const updatedAsteroids = currentAsteroids.map(asteroid => {
      const newPos = {
        x: asteroid.position.x + asteroid.velocity.x * delta * movementMultiplier,
        y: asteroid.position.y + asteroid.velocity.y * delta * movementMultiplier,
        z: asteroid.position.z + asteroid.velocity.z * delta * movementMultiplier
      };
      
      // Check if asteroid is too far behind player or too far away
      const distanceFromPlayer = Math.sqrt(
        Math.pow(newPos.x - playerPosition.x, 2) +
        Math.pow(newPos.y - playerPosition.y, 2) +
        Math.pow(newPos.z - playerPosition.z, 2)
      );
      
      // Remove if too far away or passed player
      if (distanceFromPlayer > 200 || newPos.z > playerPosition.z + 50) {
        return null;
      }
      
      return {
        ...asteroid,
        position: newPos
      };
    }).filter(Boolean);
    
    updateAsteroids(updatedAsteroids);
  });
  
  return (
    <>
      {(asteroids || []).map((asteroid) => (
        <SimpleAsteroid key={asteroid.id} asteroid={asteroid} />
      ))}
    </>
  );
}

export default SimpleAsteroids;