import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { useEntityPool } from '../hooks/useEntityPool';
import { UnifiedGamespace } from '../config/UnifiedGamespace';


function Asteroid({ asteroid }) {
  const meshRef = useRef();
  const geometryRef = useRef();
  const originalVerticesRef = useRef(null);
  const collapsePointsRef = useRef(null);
  const vertexMappingRef = useRef(null);
  
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.x = asteroid.position.x;
      meshRef.current.position.y = asteroid.position.y;
      meshRef.current.position.z = asteroid.position.z;
      
      // Proper space motion - consistent rotation in one direction per axis
      if (asteroid.rotation) {
        meshRef.current.rotation.x += asteroid.rotation.x;
        meshRef.current.rotation.y += asteroid.rotation.y;
        meshRef.current.rotation.z += asteroid.rotation.z;
      }
    }
    
    // Initialize original vertices and collapse points on first frame
    if (geometryRef.current && !originalVerticesRef.current) {
      // CRITICAL FIX: Clone the geometry to prevent sharing with other objects
      const originalGeometry = geometryRef.current;
      const clonedGeometry = originalGeometry.clone();
      
      // Replace the geometry reference with our cloned version
      if (meshRef.current && meshRef.current.children[0]) {
        meshRef.current.children[0].geometry = clonedGeometry;
        geometryRef.current = clonedGeometry;
      }
      
      const vertices = geometryRef.current.attributes.position;
      originalVerticesRef.current = new Float32Array(vertices.array);
      
      // Create internal collapse points (smaller dodecahedron inside)
      const collapsePoints = [];
      const scaleFactor = 0.3; // Internal shape is 30% of original size
      
      // Create vertices of a smaller internal dodecahedron
      const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
      const invPhi = 1 / phi;
      
      // Dodecahedron vertices scaled down
      const internalVertices = [
        [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
        [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
        [0, invPhi, phi], [0, invPhi, -phi], [0, -invPhi, phi], [0, -invPhi, -phi],
        [invPhi, phi, 0], [invPhi, -phi, 0], [-invPhi, phi, 0], [-invPhi, -phi, 0],
        [phi, 0, invPhi], [phi, 0, -invPhi], [-phi, 0, invPhi], [-phi, 0, -invPhi]
      ];
      
      internalVertices.forEach(([x, y, z]) => {
        collapsePoints.push(x * scaleFactor, y * scaleFactor, z * scaleFactor);
      });
      
      collapsePointsRef.current = collapsePoints;
      
      // Map each vertex to its nearest collapse point
      const mapping = [];
      for (let i = 0; i < vertices.count; i++) {
        const i3 = i * 3;
        const vx = originalVerticesRef.current[i3];
        const vy = originalVerticesRef.current[i3 + 1];
        const vz = originalVerticesRef.current[i3 + 2];
        
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        
        // Find nearest collapse point
        for (let j = 0; j < collapsePoints.length; j += 3) {
          const dx = vx - collapsePoints[j];
          const dy = vy - collapsePoints[j + 1];
          const dz = vz - collapsePoints[j + 2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = j;
          }
        }
        
        mapping.push(nearestIndex);
      }
      
      vertexMappingRef.current = mapping;
    }
    
    // Apply advanced deformation based on damage
    if (geometryRef.current && originalVerticesRef.current && collapsePointsRef.current && asteroid.health < asteroid.maxHealth) {
      const damageRatio = 1 - (asteroid.health / asteroid.maxHealth);
      const vertices = geometryRef.current.attributes.position;
      const collapsePoints = collapsePointsRef.current;
      const mapping = vertexMappingRef.current;
      
      // Move vertices toward their assigned collapse points
      for (let i = 0; i < vertices.count; i++) {
        const i3 = i * 3;
        const origX = originalVerticesRef.current[i3];
        const origY = originalVerticesRef.current[i3 + 1];
        const origZ = originalVerticesRef.current[i3 + 2];
        
        const collapseIndex = mapping[i];
        const targetX = collapsePoints[collapseIndex];
        const targetY = collapsePoints[collapseIndex + 1];
        const targetZ = collapsePoints[collapseIndex + 2];
        
        // Interpolate between original position and collapse point
        const lerpFactor = damageRatio * 0.7; // Max 70% collapse
        const newX = origX + (targetX - origX) * lerpFactor;
        const newY = origY + (targetY - origY) * lerpFactor;
        const newZ = origZ + (targetZ - origZ) * lerpFactor;
        
        vertices.setX(i, newX);
        vertices.setY(i, newY);
        vertices.setZ(i, newZ);
      }
      
      vertices.needsUpdate = true;
      geometryRef.current.computeVertexNormals();
    }
  });
  
  const getAsteroidColors = (type) => {
    switch (type) {
      case 'UltraMassive': 
        return { 
          primary: "#2F2F2F", // Dark gray for massive doodads
          secondary: "#1A1A1A" // Darker gray for depth
        };
      case 'SuperLarge': 
        return { 
          primary: "#FF4500", // Orange-red for super large
          secondary: "#8B2500" // Darker red-brown for depth
        };
      case 'Large': 
        return { 
          primary: "#CD853F", // Sandy brown for large
          secondary: "#8B6914" // Darker brown for depth
        };
      case 'Normal': 
      default: 
        return { 
          primary: "#8B4513", // Brown for normal
          secondary: "#5D2F09" // Darker brown for depth
        };
    }
  };
  
  const colors = getAsteroidColors(asteroid.type);
  const textureOffset = (asteroid.id.charCodeAt(0) || 0) * 0.01; // Pseudo-random based on ID
  
  return (
    <group ref={meshRef} scale={[2.0, 2.0, 2.0]}>
      {/* Primary asteroid body */}
      <mesh>
        <sphereGeometry args={[asteroid.size, 12, 8]} />
        <meshStandardMaterial 
          color={colors.primary}
          roughness={0.9}
          metalness={0.1}
          flatShading={true}
        />
      </mesh>
      
      {/* Secondary darker layer for depth */}
      <mesh position={[0.1, 0.1, 0.1]} scale={[0.95, 0.95, 0.95]}>
        <sphereGeometry args={[asteroid.size, 8, 6]} />
        <meshStandardMaterial 
          color={colors.secondary}
          roughness={0.95}
          metalness={0.05}
          transparent
          opacity={0.6}
          flatShading={true}
        />
      </mesh>
      
      {/* Surface texture details */}
      {[...Array(3)].map((_, i) => {
        const offsetX = Math.sin(textureOffset + i * 2.1) * asteroid.size * 0.3;
        const offsetY = Math.cos(textureOffset + i * 1.7) * asteroid.size * 0.3;
        const offsetZ = Math.sin(textureOffset + i * 1.3) * asteroid.size * 0.3;
        const scale = 0.15 + (i * 0.1);
        
        return (
          <mesh key={i} position={[offsetX, offsetY, offsetZ]} scale={[scale, scale, scale]}>
            <sphereGeometry args={[asteroid.size * 0.4, 6, 4]} />
            <meshStandardMaterial 
              color={i % 2 === 0 ? colors.secondary : colors.primary}
              roughness={0.98}
              metalness={0.02}
              transparent
              opacity={0.4}
              flatShading={true}
            />
          </mesh>
        );
      })}
      
      {/* Crater effects for larger asteroids */}
      {(asteroid.size > 3) && [...Array(2)].map((_, i) => {
        const craterX = Math.cos(textureOffset + i * 3.14) * asteroid.size * 0.6;
        const craterY = Math.sin(textureOffset + i * 2.7) * asteroid.size * 0.6;
        const craterZ = Math.cos(textureOffset + i * 1.9) * asteroid.size * 0.6;
        
        return (
          <mesh key={`crater-${i}`} position={[craterX, craterY, craterZ]} scale={[0.3, 0.3, 0.1]}>
            <sphereGeometry args={[asteroid.size * 0.25, 8, 4]} />
            <meshStandardMaterial 
              color={colors.secondary}
              roughness={1.0}
              metalness={0.0}
              transparent
              opacity={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Asteroids({ level = 1 }) {
  const spawnRef = useRef({ 
    spawnTimer: 0, 
    spawnInterval: 5, // Faster testing - 5 seconds between asteroid spawns
    eventTimer: 0,
    eventInterval: Infinity, // DISABLED: Special event every 60 seconds - was causing unwanted asteroid spawns
    lastEventType: null,
    doodadTimer: 0,
    doodadInterval: 120 + Math.random() * 60 // Ultra massive doodads every 120-180 seconds (2-3 minutes)
  });
  
  const asteroids = useGameStore((state) => state.asteroids || []);
  const updateAsteroids = useGameStore((state) => state.updateAsteroids);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const aliens = useGameStore((state) => state.aliens);
  const removeAlien = useGameStore((state) => state.removeAlien);
  const loseLife = useGameStore((state) => state.loseLife);
  const gameMode = useGameStore((state) => state.gameMode);
  const gameState = useGameStore((state) => state.gameState);
  
  // Use Entity Pool for asteroid management
  const { spawnAsteroid, spawnAlien, spawnAsteroidField, spawnAlienWave } = useEntityPool();
  
  const spawnAsteroidWithPool = () => {
    // Determine asteroid type based on random chance
    const typeRoll = Math.random();
    let asteroidType, size;
    
    if (typeRoll < 0.1) { // 10% chance
      asteroidType = 'SuperLarge';
      size = 8 + Math.random() * 4; // 8-12 units
    } else if (typeRoll < 0.25) { // 15% chance  
      asteroidType = 'Large';
      size = 5 + Math.random() * 3; // 5-8 units
    } else { // 75% chance
      asteroidType = 'Normal';
      size = 1.5 + Math.random() * 3.0; // 1.5-4.5 units
    }
    
    // Use safe spawning system - spawn at far end of gamespace (further back than aliens)
    const spawnPosition = UnifiedGamespace.getSafeSpawnPosition(-500, gameMode);
    
    // Random speed multiplier between 100% and 300% (increased)
    const speedMultiplier = 1.0 + Math.random() * 2.0;
    
    const spawnData = {
      position: spawnPosition,
      velocity: {
        x: (Math.random() - 0.5) * 1 * speedMultiplier, // Slight sideways drift
        y: (Math.random() - 0.5) * 0.5 * speedMultiplier, // Minimal vertical movement
        z: (2 + Math.random() * 2) * speedMultiplier // Forward movement towards player
      },
      rotation: {
        x: Math.random() < 0.3 ? (Math.random() - 0.5) * 0.005 : 0, // 30% chance of slow X rotation
        y: Math.random() < 0.3 ? (Math.random() - 0.5) * 0.005 : 0, // 30% chance of slow Y rotation  
        z: Math.random() < 0.3 ? (Math.random() - 0.5) * 0.005 : 0  // 30% chance of slow Z rotation
      },
      size: size,
      spawnStartTime: Date.now(), // Add spawn time for culling exemption
    };
    
    console.log(`[ASTEROIDS] Spawning ${asteroidType} asteroid at position:`, spawnPosition);
    console.log(`[ASTEROIDS] Asteroid spawn data:`, spawnData);
    
    // Use entity pool to spawn asteroid
    spawnAsteroid(asteroidType, spawnData);
  };
  
  const splitAsteroid = (asteroid, position) => {
    const now = Date.now();
    let fragments = [];
    
    // Retain at least 50% of parent's forward velocity (z component)
    const parentForwardVelocity = asteroid.velocity.z;
    const minForwardVelocity = parentForwardVelocity * 0.5;
    
    if (asteroid.type === 'SuperLarge') {
      // Split into 3 pieces, total size <= original
      const fragmentSize = asteroid.size / 3;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5; // Spread in circle + randomness
        const speed = 1 + Math.random() * 2;
        fragments.push({
          type: 'Large',
          spawnData: {
            position: { ...position },
            velocity: {
              x: asteroid.velocity.x * 0.5 + Math.cos(angle) * speed,
              y: asteroid.velocity.y * 0.5 + Math.sin(angle) * speed * 0.5,
              z: Math.max(minForwardVelocity, parentForwardVelocity * 0.7 + (Math.random() - 0.3) * 1.5)
            },
            rotation: {
              x: Math.random() < 0.4 ? (Math.random() - 0.5) * 0.008 : 0, // 40% chance of very slow rotation
              y: Math.random() < 0.4 ? (Math.random() - 0.5) * 0.008 : 0,
              z: Math.random() < 0.4 ? (Math.random() - 0.5) * 0.008 : 0
            },
            size: fragmentSize
          }
        });
      }
    } else if (asteroid.type === 'Large') {
      // Split into 2 pieces, total size <= original
      const fragmentSize = asteroid.size / 2;
      for (let i = 0; i < 2; i++) {
        const angle = (i * Math.PI) + (Math.random() - 0.5) * 0.8; // Opposite directions + randomness
        const speed = 1.5 + Math.random() * 2;
        fragments.push({
          type: 'Normal',
          spawnData: {
            position: { ...position },
            velocity: {
              x: asteroid.velocity.x * 0.5 + Math.cos(angle) * speed,
              y: asteroid.velocity.y * 0.5 + Math.sin(angle) * speed * 0.3,
              z: Math.max(minForwardVelocity, parentForwardVelocity * 0.6 + (Math.random() - 0.2) * 1)
            },
            rotation: {
              x: Math.random() < 0.4 ? (Math.random() - 0.5) * 0.008 : 0, // 40% chance of very slow rotation
              y: Math.random() < 0.4 ? (Math.random() - 0.5) * 0.008 : 0,
              z: Math.random() < 0.4 ? (Math.random() - 0.5) * 0.008 : 0
            },
            size: fragmentSize
          }
        });
      }
    }
    
    // Add all fragments using entity pool
    fragments.forEach(fragment => spawnAsteroid(fragment.type, fragment.spawnData));
  };
  
  const spawnAlienWaveEvent = () => {
    const waveSize = 3 + Math.floor(level / 2); // 3-6 aliens based on level
    console.log(`🚀 ALIEN WAVE EVENT! Spawning ${waveSize} aliens`);
    
    const alienSpecs = [];
    for (let i = 0; i < waveSize; i++) {
      const alienType = Math.random() < 0.2 ? 3 : Math.random() < 0.5 ? 2 : 1;
      const spawnPosition = UnifiedGamespace.getSafeSpawnPosition(-180 - i * 20, gameMode); // Staggered spawn
      
      alienSpecs.push({
        type: alienType,
        spawnData: {
          position: spawnPosition,
          velocity: {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 1,
            z: 4 + Math.random() * 3
          },
          isAtCombatDistance: false,
          isFlying: true,
        }
      });
    }
    
    // Use batch spawn from entity pool
    spawnAlienWave(alienSpecs);
  };
  
  const spawnAsteroidWaveEvent = () => {
    const waveSize = 2 + Math.floor(level / 3); // 2-4 asteroids based on level
    
    const asteroidSpecs = [];
    for (let i = 0; i < waveSize; i++) {
      // Higher chance of large asteroids in events
      const typeRoll = Math.random();
      let asteroidType, size;
      
      if (typeRoll < 0.3) { // 30% chance for SuperLarge in events
        asteroidType = 'SuperLarge';
        size = 8 + Math.random() * 4;
      } else if (typeRoll < 0.6) { // 30% chance for Large
        asteroidType = 'Large';
        size = 5 + Math.random() * 3;
      } else {
        asteroidType = 'Normal';
        size = 1.5 + Math.random() * 3.0;
      }
      
      const spawnPosition = UnifiedGamespace.getSafeSpawnPosition(-400 - i * 30, gameMode); // Staggered spawn further back
      const speedMultiplier = 1.0 + Math.random() * 2.0;
      
      asteroidSpecs.push({
        type: asteroidType,
        spawnData: {
          position: spawnPosition,
          velocity: {
            x: (Math.random() - 0.5) * 1 * speedMultiplier,
            y: (Math.random() - 0.5) * 0.5 * speedMultiplier,
            z: (2 + Math.random() * 2) * speedMultiplier
          },
          rotation: {
            x: Math.random() < 0.3 ? (Math.random() - 0.5) * 0.005 : 0, // 30% chance of slow rotation
            y: Math.random() < 0.3 ? (Math.random() - 0.5) * 0.005 : 0,
            z: Math.random() < 0.3 ? (Math.random() - 0.5) * 0.005 : 0
          },
          size: size,
          spawnStartTime: Date.now(), // Add spawn time for culling exemption
        }
      });
    }
    
    // Use batch spawn from entity pool
    spawnAsteroidField(asteroidSpecs);
  };
  
  const spawnDoodadAsteroid = () => {
    // Ultra massive size (much larger than gameplay asteroids)
    const size = 20 + Math.random() * 30; // 20-50 units (vs normal 1.5-12)
    
    // Spawn far to left or right of gamespace
    const spawnSide = Math.random() < 0.5 ? 'left' : 'right';
    const gamespaceWidth = 36; // From UnifiedGamespace config (GAMESPACE_MASTER_CONFIG.bounds.width)
    const spawnDistance = gamespaceWidth * 4; // 4x outside gamespace (much further)
    
    let spawnX, velocityX;
    if (spawnSide === 'left') {
      spawnX = -spawnDistance; // Far left (-128 units from center)
      velocityX = -(0.1 + Math.random() * 0.3); // Drift further left (away from gamespace)
    } else {
      spawnX = spawnDistance; // Far right (+128 units from center)
      velocityX = 0.1 + Math.random() * 0.3; // Drift further right (away from gamespace)
    }
    
    // Random Y position across extended area (not just gamespace)
    const spawnY = 12 + (Math.random() - 0.5) * 60; // Center ±30 units (wider spread)
    
    // Much deeper Z position - spawn far behind gamespace for background effect
    const spawnZ = -800 + Math.random() * -400; // -800 to -1200 (much deeper background)
    
    const doodadData = {
      position: { x: spawnX, y: spawnY, z: spawnZ },
      velocity: {
        x: velocityX,
        y: (Math.random() - 0.5) * 0.1, // Minimal vertical drift
        z: (Math.random() - 0.5) * 0.2 // Minimal depth movement
      },
      rotation: {
        x: Math.random() < 0.2 ? (Math.random() - 0.5) * 0.002 : 0, // Very slow rotation
        y: Math.random() < 0.2 ? (Math.random() - 0.5) * 0.002 : 0,
        z: Math.random() < 0.2 ? (Math.random() - 0.5) * 0.002 : 0
      },
      size: size,
      isDoodad: true, // Mark as non-interactive
      spawnStartTime: Date.now(), // Add spawn time for culling exemption
    };
    
    // Spawn using entity pool (UltraMassive type)
    spawnAsteroid('UltraMassive', doodadData);
  };
  
  useFrame((state, delta) => {
    // Don't spawn asteroids if game isn't playing
    if (gameState !== 'playing') return;
    
    // Get fresh asteroids list
    const currentAsteroids = useGameStore.getState().asteroids || [];
    
    // Ultra Massive Doodad Timer (every 45-90 seconds)
    spawnRef.current.doodadTimer += delta;
    
    // ALGORITHM LIMIT: Don't spawn doodads if at or above limit (they count towards the total)
    if (spawnRef.current.doodadTimer >= spawnRef.current.doodadInterval && currentAsteroids.length < 15) {
      spawnDoodadAsteroid();
      spawnRef.current.doodadTimer = 0;
      spawnRef.current.doodadInterval = 120 + Math.random() * 60; // Reset to new random interval (2-3 minutes)
    }
    
    // Special Event Timer (every 60 seconds)
    spawnRef.current.eventTimer += delta;
    
    if (spawnRef.current.eventTimer >= spawnRef.current.eventInterval) {
      // Choose between alien wave or asteroid wave (50/50 chance, but not same as last)
      const eventOptions = ['aliens', 'asteroids'];
      let eventType;
      
      if (spawnRef.current.lastEventType) {
        // Don't repeat the same event type
        eventType = eventOptions.find(type => type !== spawnRef.current.lastEventType);
      } else {
        eventType = eventOptions[Math.floor(Math.random() * eventOptions.length)];
      }
      
      if (eventType === 'aliens') {
        spawnAlienWaveEvent();
      } else {
        spawnAsteroidWaveEvent();
      }
      
      spawnRef.current.lastEventType = eventType;
      spawnRef.current.eventTimer = 0;
    }
    
    // Regular asteroid spawning
    spawnRef.current.spawnTimer += delta;
    
    // ALGORITHM LIMIT: Cap at 15 asteroids for this spawning system (reduced to prevent only massive spawns)
    // This limit only applies to the automatic spawning algorithm, not event-based waves
    const asteroidSpawnLimit = 15;
    const currentAsteroidCount = currentAsteroids.length;
    
    // Debug asteroid spawning
    if (currentAsteroidCount === 0) {
      console.log(`[ASTEROIDS] No asteroids present. Timer: ${spawnRef.current.spawnTimer.toFixed(2)}/${spawnRef.current.spawnInterval} seconds`);
    }
    
    if (spawnRef.current.spawnTimer >= spawnRef.current.spawnInterval && currentAsteroidCount < asteroidSpawnLimit) {
      console.log(`[ASTEROIDS] Spawn timer triggered: ${currentAsteroidCount}/${asteroidSpawnLimit} asteroids`);
      // Only spawn 1 asteroid at a time
      spawnAsteroidWithPool();
      spawnRef.current.spawnTimer = 0;
      spawnRef.current.spawnInterval = Math.max(3, 5 - level * 0.3); // Shorter intervals for more frequent spawning
      console.log(`[ASTEROIDS] Reset spawn timer, next spawn in: ${spawnRef.current.spawnInterval} seconds`);
    }
    
    if (currentAsteroids.length === 0) {
      return;
    }
    
    const updatedAsteroids = currentAsteroids.map((asteroid) => {
      // Get brake/boost states for movement adjustment
      const isBraking = useGameStore.getState().isBraking;
      const isBoosting = useGameStore.getState().isBoosting;
      
      let movementMultiplier = 1.0;
      if (isBraking) {
        movementMultiplier = 0.1; // Asteroids slow down when player brakes
      } else if (isBoosting) {
        movementMultiplier = 2.0; // Asteroids speed up when player boosts
      }
      
      // Move asteroid with brake/boost effects
      const adjustedDelta = delta * movementMultiplier;
      const newX = asteroid.position.x + asteroid.velocity.x * adjustedDelta;
      const newY = asteroid.position.y + asteroid.velocity.y * adjustedDelta;
      const newZ = asteroid.position.z + asteroid.velocity.z * adjustedDelta;
      
      // Remove asteroids only if they go to negative z or 10x gamespace bounds in x/y
      const extendedWidth = 36 * 10; // 360 units wide (10x gamespace width)
      const extendedHeight = 20 * 10; // 200 units tall (10x gamespace height)
      const centerX = 0;
      const centerY = 12;
      
      const isWayOutside = Math.abs(newX - centerX) > extendedWidth/2 || 
                          Math.abs(newY - centerY) > extendedHeight/2 ||
                          newZ > 50; // Cull if passed behind player
      
      if (isWayOutside) {
        return null;
      }
      
      // Skip collision detection for doodad asteroids
      if (!asteroid.isDoodad) {
        // Check collision with player
        const playerDx = newX - playerPosition.x;
        const playerDy = newY - playerPosition.y;
        const playerDz = newZ - 0; // Player is at Z=0
        const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy + playerDz * playerDz);
        
        if (playerDistance < asteroid.size + 1) {
          loseLife();
          return null; // Remove asteroid after hit
        }
        
        // Check collision with aliens
        for (const alien of aliens) {
          const alienDx = newX - alien.position.x;
          const alienDy = newY - alien.position.y;
          const alienDz = newZ - alien.position.z;
          const alienDistance = Math.sqrt(alienDx * alienDx + alienDy * alienDy + alienDz * alienDz);
          
          if (alienDistance < asteroid.size + 2) { // Slightly larger collision radius for aliens
            // Handle asteroid splitting when hitting aliens
            if (asteroid.type === 'SuperLarge' || asteroid.type === 'Large') {
              splitAsteroid(asteroid, { x: newX, y: newY, z: newZ });
            }
            
            removeAlien(alien.id);
            return null; // Remove original asteroid after destroying alien
          }
        }
      }
      
      // Remove asteroids that are too far away (culling)
      const playerDx = newX - playerPosition.x;
      const playerDy = newY - playerPosition.y; 
      const playerDz = newZ - playerPosition.z;
      const distanceFromPlayer = Math.sqrt(playerDx * playerDx + playerDy * playerDy + playerDz * playerDz);
      
      // Cull asteroids that are more than 300 units away from player
      if (distanceFromPlayer > 300) {
        return null; // Remove asteroid
      }
      
      return {
        ...asteroid,
        position: { x: newX, y: newY, z: newZ },
      };
    }).filter(asteroid => asteroid !== null);
    
    updateAsteroids(updatedAsteroids);
  });
  
  return (
    <>
      {asteroids.map((asteroid) => (
        <Asteroid key={asteroid.id} asteroid={asteroid} />
      ))}
    </>
  );
}

export default Asteroids;