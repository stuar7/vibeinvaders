import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function Ground({ mode = 'planet' }) {
  const meshRef = useRef();
  const meshRef2 = useRef();
  const backgroundMeshRef = useRef();
  const backgroundMeshRef2 = useRef();
  const scrollRef = useRef(0);
  const backgroundScrollRef = useRef(0);
  const colorCycleRef = useRef(0);
  const playerSpeed = useGameStore((state) => state.playerSpeed);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const isBraking = useGameStore((state) => state.isBraking);
  const isBoosting = useGameStore((state) => state.isBoosting);
  
  const terrainData = useMemo(() => {
    const width = 1200; // Expanded by 50% from 800 to hide edges
    const height = 500;
    const widthSegments = 100;
    const heightSegments = 250;
    
    const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
    const positions = geometry.attributes.position.array;
    
    if (mode === 'planet') {
      // Add color attribute for vertex colors
      const colors = new Float32Array(positions.length);
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        
        // Normalize Y to create seamless tiling (0 to 2π for the height)
        const normalizedY = (y + height/2) / height * Math.PI * 2;
        
        // Create seamless terrain using periodic functions
        let elevation = 0;
        
        // Single ultra-massive wave pattern across the entire terrain
        elevation += Math.sin(normalizedY * 0.1) * 8; // Ultra-massive primary wave
        
        positions[i + 2] = elevation;
        
        // Calculate vertex colors based on elevation and position
        const heightFactor = (elevation + 8) / 16; // Normalize elevation
        const ridgeFactor = Math.abs(Math.sin(x * 0.02));
        
        // Create alien terrain colors  
        colors[i] = 0.3 + heightFactor * 0.3 + ridgeFactor * 0.1;     // R: darker reds
        colors[i + 1] = 0.1 + heightFactor * 0.2;                     // G: minimal green
        colors[i + 2] = 0.4 + heightFactor * 0.4 + Math.sin(x * 0.1) * 0.2; // B: alien blue-purple
      }
      
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    } else {
      // Space mode - subtle grid pattern
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const gridPattern = (Math.sin(x * 0.1) * Math.sin(y * 0.1)) * 0.5;
        positions[i + 2] = gridPattern;
      }
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }, [mode]);
  
  // Background terrain data - wider and further back
  const backgroundTerrainData = useMemo(() => {
    const width = 2400; // Double the width for wider coverage
    const height = 800; // Taller for more coverage
    const widthSegments = 120;
    const heightSegments = 200;
    
    const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
    const positions = geometry.attributes.position.array;
    
    if (mode === 'planet') {
      // Add color attribute for vertex colors
      const colors = new Float32Array(positions.length);
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        
        // Normalize Y to create seamless tiling
        const normalizedY = (y + height/2) / height * Math.PI * 2;
        
        // Create gentler, more distant terrain
        let elevation = 0;
        
        // Single ultra-massive wave for background terrain (even larger)
        elevation += Math.sin(normalizedY * 0.08) * 6; // Ultra-massive background wave
        
        positions[i + 2] = elevation;
        
        // Background terrain colors - darker and more muted
        const heightFactor = (elevation + 6) / 12;
        const ridgeFactor = Math.abs(Math.sin(x * 0.015));
        
        // Darker, more distant colors
        colors[i] = 0.2 + heightFactor * 0.2 + ridgeFactor * 0.05;     // R: darker reds
        colors[i + 1] = 0.05 + heightFactor * 0.1;                     // G: minimal green
        colors[i + 2] = 0.25 + heightFactor * 0.25 + Math.sin(x * 0.05) * 0.1; // B: muted blue-purple
      }
      
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    } else {
      // Space mode - subtle grid pattern
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const gridPattern = (Math.sin(x * 0.05) * Math.sin(y * 0.05)) * 0.3;
        positions[i + 2] = gridPattern;
      }
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }, [mode]);
  
  useFrame((state, delta) => {
    // Calculate effective speed (base speed + powerups + brake/boost)
    let baseSpeedMultiplier = playerSpeed * (playerPowerUps.speedBoost ? 2.0 : 1.0) * (playerPowerUps.slowTime ? 0.5 : 1.0);
    
    // Apply brake/boost effects
    if (isBraking) {
      baseSpeedMultiplier *= 0.1; // 90% reduction when braking
    } else if (isBoosting) {
      baseSpeedMultiplier *= 2.0; // 100% increase when boosting
    }
    
    const scrollSpeed = 20 * baseSpeedMultiplier;
    const backgroundScrollSpeed = 8 * baseSpeedMultiplier; // Slower for parallax effect
    
    scrollRef.current += delta * scrollSpeed;
    backgroundScrollRef.current += delta * backgroundScrollSpeed;
    
    // Color cycling - large cycle every 30 seconds
    colorCycleRef.current += delta * 0.2; // Slow cycle speed
    
    // Update ground material emissive color based on cycle
    if (meshRef.current && meshRef2.current && mode === 'planet') {
      const cycle = colorCycleRef.current;
      
      // Create dramatic color cycling through different alien terrain themes
      const cyclePhase = cycle % (Math.PI * 6); // 6 distinct color phases
      
      let red, green, blue;
      
      if (cyclePhase < Math.PI) {
        // Phase 1: Deep red/orange alien desert
        red = 0.4 + Math.sin(cycle) * 0.2;
        green = 0.15 + Math.sin(cycle * 2) * 0.1;
        blue = 0.05;
      } else if (cyclePhase < Math.PI * 2) {
        // Phase 2: Purple/magenta crystalline
        red = 0.3 + Math.sin(cycle * 1.5) * 0.15;
        green = 0.08;
        blue = 0.4 + Math.sin(cycle * 0.8) * 0.2;
      } else if (cyclePhase < Math.PI * 3) {
        // Phase 3: Toxic green swamp
        red = 0.1;
        green = 0.35 + Math.sin(cycle * 1.2) * 0.2;
        blue = 0.15 + Math.sin(cycle * 2.5) * 0.1;
      } else if (cyclePhase < Math.PI * 4) {
        // Phase 4: Icy blue/cyan
        red = 0.05;
        green = 0.2 + Math.sin(cycle * 1.8) * 0.15;
        blue = 0.45 + Math.sin(cycle * 0.9) * 0.25;
      } else if (cyclePhase < Math.PI * 5) {
        // Phase 5: Golden/yellow volcanic
        red = 0.45 + Math.sin(cycle * 1.3) * 0.2;
        green = 0.35 + Math.sin(cycle * 1.7) * 0.15;
        blue = 0.08;
      } else {
        // Phase 6: Deep space purple/void
        red = 0.15 + Math.sin(cycle * 2.2) * 0.1;
        green = 0.05;
        blue = 0.25 + Math.sin(cycle * 1.1) * 0.2;
      }
      
      const emissiveColor = new THREE.Color(red, green, blue);
      
      // Apply to foreground meshes
      if (meshRef.current.material) {
        meshRef.current.material.emissive = emissiveColor;
        meshRef.current.material.emissiveIntensity = 0.15 + Math.sin(cycle * 2) * 0.1;
      }
      if (meshRef2.current.material) {
        meshRef2.current.material.emissive = emissiveColor;
        meshRef2.current.material.emissiveIntensity = 0.15 + Math.sin(cycle * 2) * 0.1;
      }
      
      // Apply to background meshes with reduced intensity
      const backgroundEmissiveColor = new THREE.Color(red * 0.6, green * 0.6, blue * 0.6);
      if (backgroundMeshRef.current.material) {
        backgroundMeshRef.current.material.emissive = backgroundEmissiveColor;
        backgroundMeshRef.current.material.emissiveIntensity = 0.08 + Math.sin(cycle * 2) * 0.05;
      }
      if (backgroundMeshRef2.current.material) {
        backgroundMeshRef2.current.material.emissive = backgroundEmissiveColor;
        backgroundMeshRef2.current.material.emissiveIntensity = 0.08 + Math.sin(cycle * 2) * 0.05;
      }
    }
    
    // Position foreground meshes for seamless scrolling
    if (meshRef.current && meshRef2.current) {
      const planeLength = 500;
      const offset = scrollRef.current % planeLength;
      
      meshRef.current.position.z = offset;
      meshRef2.current.position.z = offset - planeLength;
      
      // Swap planes when needed
      if (meshRef.current.position.z > planeLength / 2) {
        meshRef.current.position.z -= planeLength * 2;
      }
      if (meshRef2.current.position.z > planeLength / 2) {
        meshRef2.current.position.z -= planeLength * 2;
      }
    }
    
    // Position background meshes for slower parallax scrolling
    if (backgroundMeshRef.current && backgroundMeshRef2.current) {
      const backgroundPlaneLength = 800; // Longer length for background
      const backgroundOffset = backgroundScrollRef.current % backgroundPlaneLength;
      
      backgroundMeshRef.current.position.z = backgroundOffset - 200; // Further back
      backgroundMeshRef2.current.position.z = backgroundOffset - backgroundPlaneLength - 200;
      
      // Swap background planes when needed
      if (backgroundMeshRef.current.position.z > backgroundPlaneLength / 2) {
        backgroundMeshRef.current.position.z -= backgroundPlaneLength * 2;
      }
      if (backgroundMeshRef2.current.position.z > backgroundPlaneLength / 2) {
        backgroundMeshRef2.current.position.z -= backgroundPlaneLength * 2;
      }
    }
  });
  
  const groundMaterial = useMemo(() => {
    if (mode === 'planet') {
      return (
        <meshStandardMaterial
          vertexColors
          emissive="#1a1a0a"
          emissiveIntensity={0.1}
          roughness={0.9}
          metalness={0.1}
          wireframe={false}
        />
      );
    } else {
      return (
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={1}
          metalness={0}
          opacity={0.8}
          transparent
          wireframe={false}
        />
      );
    }
  }, [mode]);
  
  const backgroundGroundMaterial = useMemo(() => {
    if (mode === 'planet') {
      return (
        <meshStandardMaterial
          vertexColors
          emissive="#0a0a0a"
          emissiveIntensity={0.08}
          roughness={0.95}
          metalness={0.05}
          wireframe={false}
          transparent
          opacity={0.7}
        />
      );
    } else {
      return (
        <meshStandardMaterial
          color="#0f0f1a"
          roughness={1}
          metalness={0}
          opacity={0.5}
          transparent
          wireframe={false}
        />
      );
    }
  }, [mode]);
  
  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={terrainData}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -25, 0]}
      >
        {groundMaterial}
      </mesh>
      
      <mesh
        ref={meshRef2}
        geometry={terrainData}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -25, -1000]}
      >
        {groundMaterial}
      </mesh>
      
      {/* Background terrain layer - wider and further back */}
      <mesh
        ref={backgroundMeshRef}
        geometry={backgroundTerrainData}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -35, -200]}
      >
        {backgroundGroundMaterial}
      </mesh>
      
      <mesh
        ref={backgroundMeshRef2}
        geometry={backgroundTerrainData}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -35, -1200]}
      >
        {backgroundGroundMaterial}
      </mesh>
      
      {/* Static horizon plane - very large, light gray, beyond all terrain */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -45, -2000]}
      >
        <planeGeometry args={[5000, 3000]} />
        <meshStandardMaterial 
          color="#404040"
          roughness={1}
          metalness={0}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {mode === 'planet' && (
        <>
          <directionalLight
            position={[0, 50, 20]}
            intensity={1.5}
            color="#ffeecc"
            castShadow
          />
          <ambientLight intensity={0.5} color="#ccccff" />
        </>
      )}
    </group>
  );
}

export default Ground;