import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

// Import BVH for optimization
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Extend Three.js prototypes for BVH
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

function Ground({ 
  mode = 'asteroid-tunnel',
  showNebula = true,          // Toggle nebula particles
  fogEnabled = false,          // Toggle fog
  fogColor = 0xf0f0f0,        // Gray fog color
  fogNear = 1200,              // Fog start distance
  fogFar = 4000               // Fog end distance
}) {
  const groupRef = useRef();
  const asteroidFieldRef = useRef();
  const nebulaRef = useRef();
  const glowingAsteroidsRef = useRef([]);
  const backgroundBloomRef = useRef();
  const { camera, scene } = useThree();
  
  const playerSpeed = useGameStore((state) => state.playerSpeed);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const isBraking = useGameStore((state) => state.isBraking);
  const isBoosting = useGameStore((state) => state.isBoosting);
  
  const [visibleIndices, setVisibleIndices] = useState([]);
  
  // Generate a naturally curving path through space
  const asteroidPath = useMemo(() => {
    const controlPoints = [];
    const segments = 30;
    const length = 8000;
    
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      
      // Create organic curve variations
      const xOffset = Math.sin(t * Math.PI * 4) * 300 + 
                     Math.sin(t * Math.PI * 7) * 150;
      const yOffset = Math.cos(t * Math.PI * 3) * 200 + 
                     Math.cos(t * Math.PI * 8) * 100;
      
      controlPoints.push(new THREE.Vector3(
        xOffset,
        yOffset,
        -i * (length / segments) - 500 // Start behind player
      ));
    }
    
    return new THREE.CatmullRomCurve3(controlPoints, false);
  }, []);
  
  // Create asteroid geometry variations with BVH
  const asteroidGeometries = useMemo(() => {
    const geometries = {
      high: new THREE.IcosahedronGeometry(1, 2), // High detail
      medium: new THREE.IcosahedronGeometry(1, 1), // Medium detail
      low: new THREE.SphereGeometry(1, 6, 4), // Low detail for distance
    };
    
    // Compute BVH for each geometry for efficient collision detection
    Object.values(geometries).forEach(geometry => {
      geometry.computeBoundsTree({
        maxLeafTris: 8
      });
    });
    
    return geometries;
  }, []);
  
  // Create asteroid materials with variations
  const asteroidMaterials = useMemo(() => {
    return [
      new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        roughness: 0.8,
        metalness: 0.2
      }),
      new THREE.MeshStandardMaterial({ 
        color: 0x666666, 
        roughness: 0.9,
        metalness: 0.1
      }),
      new THREE.MeshStandardMaterial({ 
        color: 0x999999, 
        roughness: 0.7,
        metalness: 0.3
      }),
    ];
  }, []);
  
  // Create instanced asteroid field along the curved path
  const asteroidField = useMemo(() => {
    const asteroidCount = 2000;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    
    // Create instanced mesh
    const instancedMesh = new THREE.InstancedMesh(
      asteroidGeometries.medium,
      asteroidMaterials[0],
      asteroidCount
    );
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    // Distribute asteroids along the curved path
    // getSpacedPoints returns count + 1 points (includes both start and end)
    const points = asteroidPath.getSpacedPoints(asteroidCount - 1);
    const asteroids = [];
    
    points.forEach((point, index) => {
      // Create tunnel distribution
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 150; // Tunnel radius variation
      
      position.set(
        point.x + Math.cos(angle) * radius,
        point.y + Math.sin(angle) * radius,
        point.z + (Math.random() - 0.5) * 30
      );
      
      // Random rotation
      rotation.setFromEuler(new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ));
      
      // Size variation
      const scaleValue = 0.5 + Math.random() * 3;
      scale.setScalar(scaleValue);
      
      matrix.compose(position, rotation, scale);
      instancedMesh.setMatrixAt(index, matrix);
      
      // Store asteroid data for spatial queries
      asteroids.push({
        position: position.clone(),
        scale: scaleValue,
        index: index
      });
    });
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    
    return { mesh: instancedMesh, asteroids };
  }, [asteroidPath, asteroidGeometries, asteroidMaterials]);
  
  // Create glowing asteroids for bloom effect
  const glowingAsteroids = useMemo(() => {
    const glowingCount = 50;
    const glowPositions = asteroidPath.getSpacedPoints(glowingCount);
    const glowingMeshes = [];
    
    glowPositions.forEach((position, i) => {
      const geometry = new THREE.IcosahedronGeometry(3 + Math.random() * 2, 2);
      // Add BVH to glowing asteroid geometries too
      geometry.computeBoundsTree();
      
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(10, 8, 15), // HDR colors for bloom
        emissive: new THREE.Color(5, 4, 8),
        emissiveIntensity: 2,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 50
      ));
      
      // Enable bloom layer (layer 1 for selective bloom)
      mesh.layers.enable(1);
      
      glowingMeshes.push(mesh);
    });
    
    return glowingMeshes;
  }, [asteroidPath]);
  
  // Create distant background bloom particles (skybox-like)
  const backgroundBloomParticles = useMemo(() => {
    const particleCount = 2000; // Many distant stars/galaxies
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Position far away in a sphere around the scene
      const distance = 4000 + Math.random() * 5000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = distance * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = distance * Math.cos(phi);
      positions[i * 3 + 2] = distance * Math.sin(phi) * Math.sin(theta) - 2000;
      
      // Color variation - blue to purple to pink range for cosmic feel
      const colorType = Math.random();
      if (colorType < 0.3) {
        // Blue stars
        colors[i * 3] = 0.6 + Math.random() * 0.4;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1.0;
      } else if (colorType < 0.6) {
        // Purple galaxies
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
      } else {
        // Pink/orange nebulae
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.4 + Math.random() * 0.3;
      }
      
      // Varied sizes for distant objects - smaller stars, larger galaxies
      if (colorType < 0.7) {
        // Smaller stars
        sizes[i] = Math.random() * 40 + 20;
      } else {
        // Larger galaxies/nebulae
        sizes[i] = Math.random() * 100 + 80;
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geometry;
  }, []);
  
  // Create nebula particle system
  const nebulaParticles = useMemo(() => {
    const particleCount = 4000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const curvePoints = asteroidPath.getSpacedPoints(100);
    
    for (let i = 0; i < particleCount; i++) {
      // Distribute particles around curve
      const t = Math.random();
      const point = asteroidPath.getPointAt(t);
      
      const radius = 450 + Math.random() * 500;
      const angle = Math.random() * Math.PI * 2;
      const angleY = (Math.random() - 0.5) * Math.PI;
      
      positions[i * 3] = point.x + Math.cos(angle) * Math.cos(angleY) * radius;
      positions[i * 3 + 1] = point.y + Math.sin(angleY) * radius;
      positions[i * 3 + 2] = point.z + Math.sin(angle) * Math.cos(angleY) * radius;
      
      // Color gradient - purple to pink nebula
      const intensity = 0.1 + (radius / 550 > 1 ? 0.1 : 0);
      colors[i * 3] = intensity * 0.8 + (Math.random() > 0.95 ? 0.05 : 0);
      colors[i * 3 + 1] = intensity * 0.4 + (Math.random() > 0.95 ? 0.02 : 0);
      colors[i * 3 + 2] = intensity * 0.9 + (Math.random() > 0.95 ? 0.05 : 0);

      sizes[i] = Math.random() * 30 + 120;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geometry;
  }, [asteroidPath]);
  
  // Create cloud texture for nebula
  const cloudTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    return new THREE.CanvasTexture(canvas);
  }, []);
  
  // Create star texture for background blooms
  const starTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw star with bright center and rays
    const centerX = 128;
    const centerY = 128;
    
    // Bright core
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20);
    coreGradient.addColorStop(0, 'rgba(255,255,255,1)');
    coreGradient.addColorStop(0.2, 'rgba(255,255,255,0.9)');
    coreGradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = coreGradient;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add star rays
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    
    // Horizontal ray
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(256, centerY);
    ctx.stroke();
    
    // Vertical ray
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, 256);
    ctx.stroke();
    
    // Diagonal rays
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(256, 256);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(0, 256);
    ctx.stroke();
    
    return new THREE.CanvasTexture(canvas);
  }, []);
  
  // Nebula shader material
  const nebulaMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: cloudTexture },
        fogNear: { value: 500 },
        fogFar: { value: 2000 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vFogDepth;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vFogDepth = -mvPosition.z;
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float fogNear;
        uniform float fogFar;
        varying vec3 vColor;
        varying float vFogDepth;
        
        void main() {
          vec4 color = vec4(vColor, 1.0);
          vec4 tex = texture2D(pointTexture, gl_PointCoord);
          
          float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          
          gl_FragColor = vec4(color.rgb * tex.rgb, tex.a * (1.0 - fogFactor) * 0.5);
          
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true
    });
  }, [cloudTexture]);
  
  // Background bloom shader material (no fog for distant objects)
  const backgroundBloomMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: starTexture },
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (500.0 / -mvPosition.z); // Larger scale factor for distant objects
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float time;
        varying vec3 vColor;
        
        void main() {
          vec4 tex = texture2D(pointTexture, gl_PointCoord);
          
          // Add subtle twinkling effect
          float twinkle = sin(time * 2.0 + gl_FragCoord.x * 0.01 + gl_FragCoord.y * 0.01) * 0.1 + 0.9;
          
          // HDR colors for bloom with star brightness variation
          float brightness = 1.0 + sin(time * 3.0 + gl_FragCoord.x * 0.1) * 0.5;
          vec3 color = vColor * brightness * 2.5; // Multiply for HDR effect
          
          gl_FragColor = vec4(color * tex.rgb * twinkle, tex.a);
          
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      fog: false // No fog for background objects
    });
  }, [starTexture]);
  
  // Update LOD and visibility
  const updateLOD = (cameraPosition) => {
    const frustum = new THREE.Frustum();
    const cameraMatrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(cameraMatrix);
    
    const visible = [];
    const matrix = new THREE.Matrix4();
    
    asteroidField.asteroids.forEach((asteroid, index) => {
      // Bounds check to prevent WebGL warning
      if (index >= asteroidFieldRef.current.count) {
        console.warn(`Asteroid index ${index} exceeds instanced mesh count ${asteroidFieldRef.current.count}`);
        return;
      }
      
      const distance = asteroid.position.distanceTo(cameraPosition);
      
      // Simple frustum culling
      if (frustum.containsPoint(asteroid.position) && distance < 2000) {
        visible.push(index);
        
        // Update asteroid visibility/LOD
        if (distance < 200) {
          // High detail - full visibility
          asteroidFieldRef.current.getMatrixAt(index, matrix);
          matrix.elements[0] = matrix.elements[5] = matrix.elements[10] = asteroid.scale;
        } else if (distance < 500) {
          // Medium detail
          asteroidFieldRef.current.getMatrixAt(index, matrix);
          matrix.elements[0] = matrix.elements[5] = matrix.elements[10] = asteroid.scale * 0.8;
        } else {
          // Low detail
          asteroidFieldRef.current.getMatrixAt(index, matrix);
          matrix.elements[0] = matrix.elements[5] = matrix.elements[10] = asteroid.scale * 0.5;
        }
        asteroidFieldRef.current.setMatrixAt(index, matrix);
      }
    });
    
    asteroidFieldRef.current.instanceMatrix.needsUpdate = true;
    setVisibleIndices(visible);
  };
  
  // Enhanced collision detection with BVH
  const checkCollisions = (playerPosition, playerRadius = 5) => {
    const collisions = [];
    const playerSphere = new THREE.Sphere(playerPosition, playerRadius);
    
    visibleIndices.forEach(index => {
      const asteroid = asteroidField.asteroids[index];
      const distance = asteroid.position.distanceTo(playerPosition);
      
      // Quick distance check first
      if (distance < playerRadius + asteroid.scale * 2) {
        // Get instance transform
        const matrix = new THREE.Matrix4();
        asteroidFieldRef.current.getMatrixAt(index, matrix);
        
        // Transform sphere to asteroid's local space for precise collision
        const localSphere = playerSphere.clone();
        const inverseMatrix = matrix.clone().invert();
        localSphere.applyMatrix4(inverseMatrix);
        
        // Check against geometry BVH for precise collision
        const geometryBVH = asteroidFieldRef.current.geometry.boundsTree;
        if (geometryBVH && geometryBVH.intersectsSphere(localSphere)) {
          collisions.push({
            asteroid: asteroid,
            index: index,
            distance: distance
          });
        }
      }
    });
    
    return collisions;
  };
  
  // Setup fog and cleanup on unmount
  useEffect(() => {
    // Setup gray fog
    if (fogEnabled) {
      scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    }
    
    // Add glowing asteroids to scene
    glowingAsteroids.forEach(mesh => {
      scene.add(mesh);
    });
    glowingAsteroidsRef.current = glowingAsteroids;
    
    // Background bloom particles are added in the render group
    
    return () => {
      // Remove fog on cleanup
      if (scene.fog) {
        scene.fog = null;
      }
      // Cleanup BVH
      Object.values(asteroidGeometries).forEach(geometry => {
        if (geometry.boundsTree) {
          geometry.disposeBoundsTree();
        }
      });
      
      // Cleanup glowing asteroids
      glowingAsteroids.forEach(mesh => {
        scene.remove(mesh);
        if (mesh.geometry.boundsTree) {
          mesh.geometry.disposeBoundsTree();
        }
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      
      // Cleanup is handled by React
    };
  }, [glowingAsteroids, scene, asteroidGeometries, fogEnabled, fogColor, fogNear, fogFar]);
  
  useFrame((state, delta) => {
    // Calculate effective speed
    let baseSpeedMultiplier = playerSpeed * (playerPowerUps.speedBoost ? 2.0 : 1.0) * (playerPowerUps.slowTime ? 0.5 : 1.0);
    
    if (isBraking) {
      baseSpeedMultiplier *= 0.1;
    } else if (isBoosting) {
      baseSpeedMultiplier *= 2.0;
    }
    
    // Move along the path
    if (groupRef.current) {
      groupRef.current.position.z += delta * 50 * baseSpeedMultiplier;
      
      // Reset position when reaching end of path
      if (groupRef.current.position.z > 8000) {
        groupRef.current.position.z = 0;
      }
    }
    
    // Update LOD based on camera position
    updateLOD(camera.position);
    
    // Rotate asteroids slowly
    if (asteroidFieldRef.current) {
      const time = state.clock.elapsedTime;
      asteroidFieldRef.current.rotation.y = time * 0.05;
    }
    
    // Animate glowing asteroids
    glowingAsteroidsRef.current.forEach((mesh, i) => {
      mesh.rotation.x += delta * 0.5;
      mesh.rotation.y += delta * 0.3;
      mesh.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.2);
    });
    
    // Update time uniform for background bloom twinkling
    if (backgroundBloomRef.current) {
      backgroundBloomRef.current.material.uniforms.time.value = state.clock.elapsedTime;
    }
    
    // Check collisions (example - integrate with your game logic)
    const collisions = checkCollisions(camera.position);
    if (collisions.length > 0) {
      // Handle collisions
      console.log('Asteroid collision detected:', collisions);
    }
  });
  
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Asteroid field */}
      <instancedMesh 
        ref={asteroidFieldRef}
        args={[asteroidField.mesh.geometry, asteroidField.mesh.material, asteroidField.asteroids.length]}
        instanceMatrix={asteroidField.mesh.instanceMatrix}
      />
      
      {/* Nebula particles - purple/pink dots */}
      {showNebula && (
        <points ref={nebulaRef} geometry={nebulaParticles} material={nebulaMaterial} />
      )}
      
      {/* Background bloom particles - distant stars/galaxies */}
      <points 
        ref={backgroundBloomRef} 
        geometry={backgroundBloomParticles} 
        material={backgroundBloomMaterial}
        layers-mask={3} // Enable both layer 0 and 1 for bloom
      />
      
      {/* Lighting setup */}
      <group>
        {/* Main directional light */}
        <directionalLight
          position={[500, 300, -200]}
          intensity={1.5}
          color="#fff8e0"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Nebula ambient lighting */}
        <pointLight
          position={[-300, 200, -500]}
          intensity={0.8}
          color="#ff88aa"
          distance={1200}
          decay={2}
        />
        
        <pointLight
          position={[300, 150, -300]}
          intensity={0.6}
          color="#8888ff"
          distance={1000}
          decay={2}
        />
        
        {/* Ambient light */}
        <ambientLight intensity={0.4} color="#b0a0c0" />
      </group>
    </group>
  );
}

export default Ground;