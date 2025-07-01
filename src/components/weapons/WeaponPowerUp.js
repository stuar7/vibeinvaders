import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
// Removed unused GameSpace imports
import { UnifiedGamespace } from '../../config/UnifiedGamespace';

function WeaponPowerUp({ powerUp }) {
  const meshRef = useRef();
  const { id, type, position, velocity } = powerUp;
  
  const removePowerUp = useGameStore((state) => state.removePowerUp);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const addAmmo = useGameStore((state) => state.addAmmo);
  const addEffect = useGameStore((state) => state.addEffect);
  const gameMode = useGameStore((state) => state.gameMode);
  
  const getWeaponAppearance = () => {
    switch (type) {
      case 'laser':
        return {
          geometry: <boxGeometry args={[0.1, 1.0, 0.1]} />,
          color: '#ff0000',
          rotationSpeed: 2,
          customMesh: (
            <group>
              <mesh>
                <boxGeometry args={[0.1, 1.0, 0.1]} />
                <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.8} />
              </mesh>
            </group>
          ),
        };
      
      case 'chaingun':
        return {
          geometry: <cylinderGeometry args={[0.2, 0.3, 0.8, 8]} />,
          color: '#ffaa00',
          rotationSpeed: 3,
          customMesh: (
            <group>
              <mesh>
                <cylinderGeometry args={[0.2, 0.3, 0.8, 8]} />
                <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.6} />
              </mesh>
              <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[0.1, 0.3, 0.1]} />
                <meshStandardMaterial color="#ffaa00" />
              </mesh>
            </group>
          ),
        };
      
      case 'bfg':
        return {
          geometry: <sphereGeometry args={[0.5, 16, 12]} />,
          color: '#00ff00',
          rotationSpeed: 1,
          customMesh: (
            <group>
              <mesh>
                <sphereGeometry args={[0.5, 16, 12]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1.0} />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.6, 16, 12]} />
                <meshStandardMaterial color="#00ff00" transparent opacity={0.3} />
              </mesh>
            </group>
          ),
        };
      
      case 'rocketAmmo':
        return {
          geometry: <boxGeometry args={[0.2, 0.2, 1.0]} />,
          color: '#ff8800',
          rotationSpeed: 1.5,
          customMesh: (
            <group>
              <mesh>
                <boxGeometry args={[0.2, 0.2, 1.0]} />
                <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0, 0, 0.6]}>
                <coneGeometry args={[0.15, 0.3, 6]} />
                <meshStandardMaterial color="#ff4400" />
              </mesh>
            </group>
          ),
        };
      
      case 'bombAmmo':
        return {
          geometry: <sphereGeometry args={[0.4, 12, 8]} />,
          color: '#ff0000',
          rotationSpeed: 1,
          customMesh: (
            <group>
              {/* Main bomb body */}
              <mesh>
                <sphereGeometry args={[0.4, 12, 8]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              
              {/* Blinking red warning light */}
              <mesh>
                <sphereGeometry args={[0.15, 8, 6]} />
                <meshStandardMaterial 
                  color="#ff0000" 
                  emissive="#ff0000" 
                  emissiveIntensity={Math.sin(Date.now() * 0.01) * 0.5 + 0.5}
                />
              </mesh>
              
              {/* Yellow warning stripes */}
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <cylinderGeometry args={[0.35, 0.35, 0.05, 8]} />
                <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.3} />
              </mesh>
              <mesh rotation={[0, 0, -Math.PI / 4]}>
                <cylinderGeometry args={[0.35, 0.35, 0.05, 8]} />
                <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.3} />
              </mesh>
              
              {/* Fins */}
              {[0, Math.PI/2, Math.PI, 3*Math.PI/2].map((rotation, index) => (
                <mesh key={index} rotation={[0, rotation, 0]} position={[0, 0, 0.2]}>
                  <boxGeometry args={[0.05, 0.15, 0.2]} />
                  <meshStandardMaterial color="#666666" />
                </mesh>
              ))}
            </group>
          ),
        };
      
      case 'railgunAmmo':
        return {
          geometry: <cylinderGeometry args={[0.08, 0.08, 1.2, 12]} />,
          color: '#00ffdd',
          rotationSpeed: 2,
          customMesh: (
            <group>
              {/* Main rail projectile rod */}
              <mesh>
                <cylinderGeometry args={[0.08, 0.08, 1.2, 12]} />
                <meshStandardMaterial color="#00ffdd" emissive="#004466" emissiveIntensity={0.5} />
              </mesh>
              
              {/* Electromagnetic field rings */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.25, 0.02, 8, 16]} />
                <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={0.8} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
                <torusGeometry args={[0.2, 0.015, 8, 16]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
                <torusGeometry args={[0.2, 0.015, 8, 16]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
              </mesh>
              
              {/* Energy core */}
              <mesh>
                <sphereGeometry args={[0.12, 8, 6]} />
                <meshStandardMaterial 
                  color="#00ffff" 
                  emissive="#00ffff" 
                  emissiveIntensity={0.7}
                  transparent 
                  opacity={0.8}
                />
              </mesh>
            </group>
          ),
        };
      
      default:
        return {
          geometry: <sphereGeometry args={[0.3, 8, 6]} />,
          color: '#ffffff',
          rotationSpeed: 1,
        };
    }
  };

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const appearance = getWeaponAppearance();
    
    // Rotation animation
    meshRef.current.rotation.x += appearance.rotationSpeed * delta;
    meshRef.current.rotation.y += appearance.rotationSpeed * delta;
    
    // Floating animation
    const time = state.clock.getElapsedTime();
    meshRef.current.position.y = position.y + Math.sin(time * 3) * 0.2;
    
    // Update position
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
    const dz = position.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Collection detection
    if (distance < 2.0) {
      // Determine ammo amount based on weapon type
      let ammoAmount = 50; // Default
      switch (type) {
        case 'laser':
          ammoAmount = 100;
          break;
        case 'chaingun':
          ammoAmount = 500;
          break;
        case 'bfg':
          ammoAmount = 3;
          break;
        case 'rocketAmmo':
          ammoAmount = 10;
          break;
        case 'bombAmmo':
          ammoAmount = 3;
          break;
        case 'railgunAmmo':
          ammoAmount = 5;
          break;
        default:
          ammoAmount = 50;
          break;
      }
      
      // Add ammo to appropriate weapon (remove 'Ammo' suffix if present)
      const weaponType = type.replace('Ammo', '').toLowerCase();
      addAmmo(weaponType, ammoAmount);
      
      // Create collection effect
      addEffect({
        id: `effect-${Date.now()}`,
        type: 'weaponPickup',
        position: { ...position },
        velocity: { x: 0, y: 0, z: 0 },
        lifetime: 1000,
        color: getWeaponAppearance().color,
      });
      
      removePowerUp(id);
    }
  });

  const appearance = getWeaponAppearance();

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      {appearance.customMesh || (
        <>
          {appearance.geometry}
          <meshStandardMaterial 
            color={appearance.color} 
            emissive={appearance.color} 
            emissiveIntensity={0.3}
          />
        </>
      )}
    </mesh>
  );
}

export default WeaponPowerUp;