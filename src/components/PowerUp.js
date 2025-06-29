import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
// Removed unused GameSpace imports
import { UnifiedGamespace } from '../config/UnifiedGamespace';

function PowerUp({ powerUp }) {
  const meshRef = useRef();
  const { id, type, position, velocity } = powerUp;
  
  const removePowerUp = useGameStore((state) => state.removePowerUp);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const activatePowerUp = useGameStore((state) => state.activatePowerUp);
  const addEffect = useGameStore((state) => state.addEffect);
  const gameMode = useGameStore((state) => state.gameMode);
  
  const getPowerUpAppearance = () => {
    switch (type) {
      case 'shield':
        return {
          geometry: <torusGeometry args={[0.4, 0.2, 8, 16]} />,
          color: '#00ffff',
          rotationSpeed: 2,
        };
      
      case 'rapidFire':
        return {
          geometry: <boxGeometry args={[0.1, 0.6, 0.1]} />,
          color: '#ffff00',
          rotationSpeed: 3,
          customMesh: (
            <group>
              <mesh>
                <boxGeometry args={[0.1, 0.6, 0.1]} />
                <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[-0.2, 0, 0]}>
                <boxGeometry args={[0.1, 0.6, 0.1]} />
                <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0.2, 0, 0]}>
                <boxGeometry args={[0.1, 0.6, 0.1]} />
                <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
              </mesh>
            </group>
          ),
        };
      
      case 'multiShot':
        return {
          geometry: <boxGeometry args={[0.8, 0.1, 0.1]} />,
          color: '#00ff00',
          rotationSpeed: 1.5,
          customMesh: (
            <group>
              <mesh>
                <boxGeometry args={[0.8, 0.1, 0.1]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[0.8, 0.1, 0.1]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0, -0.3, 0]}>
                <boxGeometry args={[0.8, 0.1, 0.1]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
              </mesh>
            </group>
          ),
        };
      
      case 'extraLife':
        return {
          geometry: <sphereGeometry args={[0.4, 8, 8]} />,
          color: '#ff0000',
          rotationSpeed: 1,
          customMesh: (
            <group>
              <mesh scale={[1, 1.2, 0.8]}>
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
              </mesh>
              <mesh scale={[1.2, 1, 0.8]}>
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
              </mesh>
            </group>
          ),
        };
      
      case 'slowTime':
        return {
          geometry: <coneGeometry args={[0.4, 0.4, 6]} />,
          color: '#ff00ff',
          rotationSpeed: 0.5,
          customMesh: (
            <group>
              <mesh position={[0, 0.2, 0]}>
                <coneGeometry args={[0.4, 0.4, 6]} />
                <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0, -0.2, 0]} rotation={[0, 0, Math.PI]}>
                <coneGeometry args={[0.4, 0.4, 6]} />
                <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.5} />
              </mesh>
            </group>
          ),
        };
      
      case 'responsiveness':
        return {
          geometry: <dodecahedronGeometry args={[0.4]} />,
          color: '#00ffaa',
          rotationSpeed: 3,
          customMesh: (
            <group>
              {/* Main body - fast spinning dodecahedron */}
              <mesh>
                <dodecahedronGeometry args={[0.4]} />
                <meshStandardMaterial color="#00ffaa" emissive="#00ffaa" emissiveIntensity={0.6} />
              </mesh>
              
              {/* Speed trail rings */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.6, 0.03, 8, 16]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
              </mesh>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.6, 0.03, 8, 16]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
              </mesh>
              <mesh rotation={[0, 0, 0]}>
                <torusGeometry args={[0.6, 0.03, 8, 16]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
              </mesh>
            </group>
          ),
        };
      
      case 'stealth':
        return {
          geometry: <octahedronGeometry args={[0.4]} />,
          color: '#4400aa',
          rotationSpeed: 1.5,
          customMesh: (
            <group>
              {/* Main body - semi-transparent octahedron */}
              <mesh>
                <octahedronGeometry args={[0.4]} />
                <meshStandardMaterial 
                  color="#4400aa" 
                  emissive="#4400aa" 
                  emissiveIntensity={0.3}
                  transparent 
                  opacity={0.7}
                />
              </mesh>
              
              {/* Stealth shimmer effect */}
              <mesh>
                <sphereGeometry args={[0.6, 8, 6]} />
                <meshStandardMaterial 
                  color="#ffffff" 
                  transparent 
                  opacity={0.1 + Math.sin(Date.now() * 0.005) * 0.1}
                  wireframe
                />
              </mesh>
              
              {/* Cloaking field rings */}
              <mesh rotation={[0, Date.now() * 0.001, 0]}>
                <torusGeometry args={[0.8, 0.02, 6, 12]} />
                <meshStandardMaterial color="#4400aa" transparent opacity={0.3} />
              </mesh>
              <mesh rotation={[Math.PI / 3, Date.now() * -0.001, 0]}>
                <torusGeometry args={[0.7, 0.02, 6, 12]} />
                <meshStandardMaterial color="#4400aa" transparent opacity={0.3} />
              </mesh>
            </group>
          ),
        };
      
      
      case 'wingmen':
        return {
          geometry: <boxGeometry args={[0.6, 0.6, 0.6]} />,
          color: '#ffffff',
          rotationSpeed: 2,
          customMesh: (
            <group>
              {/* Two small ship icons */}
              <mesh position={[-0.3, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                <boxGeometry args={[0.3, 0.2, 0.6]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0.3, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                <boxGeometry args={[0.3, 0.2, 0.6]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
              </mesh>
              {/* Connection between them */}
              <mesh>
                <boxGeometry args={[0.8, 0.05, 0.05]} />
                <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.8} />
              </mesh>
            </group>
          ),
        };
      
      case 'weaponBoost':
        return {
          geometry: <boxGeometry args={[0.5, 0.5, 0.5]} />,
          color: '#ff00ff',
          rotationSpeed: 3,
          customMesh: (
            <group>
              {/* Central crystal */}
              <mesh>
                <octahedronGeometry args={[0.4, 0]} />
                <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.8} />
              </mesh>
              {/* Orbiting energy rings */}
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <torusGeometry args={[0.6, 0.05, 8, 16]} />
                <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.6} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.5, 0.03, 8, 16]} />
                <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.6} />
              </mesh>
            </group>
          ),
        };
      
      case 'homingWeapons':
        return {
          geometry: <coneGeometry args={[0.4, 0.8, 6]} />,
          color: '#ff8800',
          rotationSpeed: 3,
          customMesh: (
            <group>
              {/* Main homing missile shape */}
              <mesh>
                <coneGeometry args={[0.4, 0.8, 6]} />
                <meshStandardMaterial color="#ff8800" emissive="#ff4400" emissiveIntensity={0.6} />
              </mesh>
              
              {/* Tracking rings */}
              <mesh position={[0, 0.2, 0]}>
                <torusGeometry args={[0.5, 0.05, 8, 16]} />
                <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.8} />
              </mesh>
              <mesh position={[0, -0.2, 0]}>
                <torusGeometry args={[0.6, 0.05, 8, 16]} />
                <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.8} />
              </mesh>
              
              {/* Pulsing center core */}
              <mesh>
                <sphereGeometry args={[0.15, 8, 6]} />
                <meshStandardMaterial 
                  color="#ffffff" 
                  emissive="#ffffff" 
                  emissiveIntensity={0.5 + Math.sin(Date.now() * 0.01) * 0.3}
                />
              </mesh>
              
              {/* Orbital tracking elements */}
              {[0, Math.PI/2, Math.PI, 3*Math.PI/2].map((rotation, index) => (
                <mesh key={index} rotation={[0, rotation + Date.now() * 0.005, 0]} position={[0.7, 0, 0]}>
                  <sphereGeometry args={[0.05, 4, 4]} />
                  <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.8} />
                </mesh>
              ))}
            </group>
          ),
        };
      
      default:
        return {
          geometry: <boxGeometry args={[0.5, 0.5, 0.5]} />,
          color: '#ffffff',
          rotationSpeed: 1,
        };
    }
  };
  
  const { geometry, color, rotationSpeed, customMesh } = getPowerUpAppearance();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.x = position.x;
      meshRef.current.position.y = position.y;
      meshRef.current.position.z = position.z;
      
      meshRef.current.rotation.y += rotationSpeed * delta;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.2;
      
      // Add attraction toward player (20% faster)
      const attractionSpeed = 8.0; // Attraction strength
      const attractDx = playerPosition.x - position.x;
      const attractDy = playerPosition.y - position.y;
      const attractDistance = Math.sqrt(attractDx * attractDx + attractDy * attractDy);
      
      if (attractDistance > 0 && attractDistance < 15) { // Start attracting when close
        const attractionForce = Math.min(1, 5 / attractDistance); // Stronger when closer
        velocity.x += (attractDx / attractDistance) * attractionSpeed * delta * attractionForce;
        velocity.y += (attractDy / attractDistance) * attractionSpeed * delta * attractionForce;
      }
      
      // Apply velocity
      position.x += velocity.x;
      position.y += velocity.y;
      position.z += velocity.z;
      
      // Use unified cleanup bounds
      if (position.z > 100 || position.z < -200 || !UnifiedGamespace.isWithinBounds(position.x, position.y, gameMode)) {
        removePowerUp(id);
        return;
      }
      
      const dx = position.x - playerPosition.x;
      const dy = position.y - playerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 1.3) { // Adjusted for 10% larger player ship
        // This component only handles modifier powerups, not weapons
        activatePowerUp(type);
        removePowerUp(id);
        
        addEffect({
          id: `powerup-collect-${Date.now()}`,
          type: 'powerupCollect',
          position: { ...position },
          startTime: Date.now(),
          color,
        });
        
        if (type !== 'extraLife' && type !== 'shield') {
          setTimeout(() => {
            useGameStore.getState().deactivatePowerUp(type);
          }, 20000); // Doubled from 10000
        }
      }
    }
  });
  
  return (
    <group ref={meshRef}>
      {customMesh || (
        <mesh>
          {geometry}
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={0.5}
            metalness={0.3}
            roughness={0.3}
          />
        </mesh>
      )}
      
      <pointLight
        position={[0, 0, 0]}
        color={color}
        intensity={1}
        distance={3}
      />
      
      <mesh scale={[1.5, 1.5, 1.5]}>
        <ringGeometry args={[0.6, 0.7, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export default PowerUp;