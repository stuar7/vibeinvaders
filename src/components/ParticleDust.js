import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { useKeyboard } from '../hooks/useKeyboard';

function ParticleDust() {
  const particlesRef = useRef();
  const playerSpeed = useGameStore((state) => state.playerSpeed);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const isBraking = useGameStore((state) => state.isBraking);
  const isBoosting = useGameStore((state) => state.isBoosting);
  const keys = useKeyboard();
  
  const particleData = useMemo(() => {
    const positions = [];
    const velocities = [];
    const count = 500;
    
    for (let i = 0; i < count; i++) {
      // Spawn particles closer to player, within gamespace viewing area  
      positions.push(
        (Math.random() - 0.5) * 60,  // X: narrower spread within gamespace
        (Math.random() - 0.5) * 40 + 12, // Y: around player Y level (12)
        -Math.random() * 100 - 50    // Z: closer spawn range (-50 to -150)
      );
      
      // All particles move toward the camera (faster movement)
      velocities.push(
        (Math.random() - 0.5) * 4,   // X: slight sideways drift  
        (Math.random() - 0.5) * 2,   // Y: slight vertical drift
        120 + Math.random() * 60     // Z: much faster forward movement (120-180)
      );
    }
    
    return { positions, velocities };
  }, []);
  
  useFrame((state, delta) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.attributes.position.array;
      
      // Calculate effective speed (base speed + powerups + ctrl boost + brake/boost)
      const isBoostActive = keys.ControlLeft || keys.ControlRight;
      const ctrlBoostMultiplier = isBoostActive ? 1.5 : 1.0;
      let speedMultiplier = playerSpeed * (playerPowerUps.speedBoost ? 2.0 : 1.0) * (playerPowerUps.slowTime ? 0.5 : 1.0) * ctrlBoostMultiplier;
      
      // Apply brake/boost effects
      if (isBraking) {
        speedMultiplier *= 0.1; // 90% reduction when braking
      } else if (isBoosting) {
        speedMultiplier *= 2.0; // 100% increase when boosting
      }
      
      
      for (let i = 0; i < positions.length; i += 3) {
        // Move particles forward with speed multiplier
        positions[i] += particleData.velocities[i] * delta * speedMultiplier;     // X
        positions[i + 1] += particleData.velocities[i + 1] * delta * speedMultiplier; // Y
        positions[i + 2] += particleData.velocities[i + 2] * delta * speedMultiplier; // Z
        
        // Reset particles that have passed the camera/player
        if (positions[i + 2] > 30) {
          positions[i] = (Math.random() - 0.5) * 60;      // X: match spawn range
          positions[i + 1] = (Math.random() - 0.5) * 40 + 12; // Y: around player
          positions[i + 2] = -Math.random() * 100 - 50;   // Z: match spawn range
        }
        
        // Reset particles that have gone too far off to the sides
        if (Math.abs(positions[i]) > 50 || Math.abs(positions[i + 1] - 12) > 30) {
          positions[i] = (Math.random() - 0.5) * 60;
          positions[i + 1] = (Math.random() - 0.5) * 40 + 12;
          positions[i + 2] = -Math.random() * 100 - 50;
        }
      }
      
      particlesRef.current.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points>
      <bufferGeometry ref={particlesRef}>
        <bufferAttribute
          attach="attributes-position"
          count={particleData.positions.length / 3}
          array={new Float32Array(particleData.positions)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        color="#888888"
        transparent
        opacity={0.05}
        sizeAttenuation
      />
    </points>
  );
}

export default ParticleDust;