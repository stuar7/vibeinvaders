import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

// Example 1: Web Workers for Heavy Computation
function AsyncPhysicsCalculation() {
  const workerRef = useRef();
  const [results, setResults] = React.useState([]);

  React.useEffect(() => {
    // Create a Web Worker for heavy physics calculations
    const workerCode = `
      self.onmessage = function(e) {
        const { aliens, playerPos, deltaTime } = e.data;
        
        // Heavy computation: pathfinding, AI decisions, collision predictions
        const results = aliens.map(alien => {
          // Simulate complex AI pathfinding (CPU intensive)
          const dx = playerPos.x - alien.position.x;
          const dy = playerPos.y - alien.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Complex behavior tree calculation
          let newPosition = { ...alien.position };
          for (let i = 0; i < 1000; i++) {
            // Simulate expensive computation
            newPosition.x += Math.sin(i * deltaTime) * 0.001;
            newPosition.y += Math.cos(i * deltaTime) * 0.001;
          }
          
          return {
            id: alien.id,
            newPosition,
            behaviorState: distance < 50 ? 'attack' : 'patrol'
          };
        });
        
        self.postMessage(results);
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(blob));
    
    workerRef.current.onmessage = (e) => {
      setResults(e.data);
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  useFrame(() => {
    // Send data to worker every few frames to avoid overwhelming
    if (workerRef.current && Math.random() < 0.1) {
      const aliens = useGameStore.getState().aliens;
      const playerPos = useGameStore.getState().playerPosition;
      
      workerRef.current.postMessage({
        aliens: aliens,
        playerPos: playerPos,
        deltaTime: 0.016
      });
    }
  });

  return null; // This component just manages the worker
}

// Example 2: GPU Compute Shaders (Advanced)
function GPUParticleSystem() {
  const computeShader = useMemo(() => `
    uniform float uTime;
    uniform float uDeltaTime;
    
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      
      // Read current particle state from texture
      vec4 position = texture2D(texturePosition, uv);
      vec4 velocity = texture2D(textureVelocity, uv);
      
      // Update position on GPU (parallel for thousands of particles)
      position.xyz += velocity.xyz * uDeltaTime;
      
      // Apply forces, collisions, etc. on GPU
      velocity.y -= 9.81 * uDeltaTime; // Gravity
      
      gl_FragColor = position;
    }
  `, []);

  return (
    <mesh>
      {/* GPU-computed particle system would go here */}
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        fragmentShader={computeShader}
        uniforms={{
          uTime: { value: 0 },
          uDeltaTime: { value: 0.016 }
        }}
      />
    </mesh>
  );
}

// Example 3: Async Asset Loading
function AsyncModelLoader() {
  const [model, setModel] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Async loading doesn't block main thread
    const loadModel = async () => {
      try {
        // Simulate heavy model loading
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In real scenario, you'd use GLTFLoader, etc.
        setModel(new THREE.BoxGeometry(2, 2, 2));
        setLoading(false);
      } catch (error) {
        console.error('Model loading failed:', error);
      }
    };

    loadModel();
  }, []);

  if (loading) {
    return (
      <mesh>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="gray" wireframe />
      </mesh>
    );
  }

  return (
    <mesh geometry={model}>
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}

// Example 4: Throttled Heavy Operations
function ThrottledCollisionSystem() {
  const lastUpdateRef = useRef(0);
  const collisionCacheRef = useRef(new Map());

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    
    // Only run expensive collision detection every 100ms
    if (now - lastUpdateRef.current > 0.1) {
      const aliens = useGameStore.getState().aliens;
      const missiles = useGameStore.getState().missiles;
      
      // Heavy collision detection (throttled)
      aliens.forEach(alien => {
        missiles.forEach(missile => {
          const key = `${alien.id}-${missile.id}`;
          
          // Use cached results when possible
          if (!collisionCacheRef.current.has(key)) {
            const distance = new THREE.Vector3(
              alien.position.x - missile.position.x,
              alien.position.y - missile.position.y,
              alien.position.z - missile.position.z
            ).length();
            
            collisionCacheRef.current.set(key, distance < 2);
          }
        });
      });
      
      lastUpdateRef.current = now;
    }
  });

  return null;
}

export default function ThreadingExamples() {
  return (
    <>
      <AsyncPhysicsCalculation />
      <GPUParticleSystem />
      <AsyncModelLoader />
      <ThrottledCollisionSystem />
    </>
  );
}