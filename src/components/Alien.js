import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { AlienGeometry } from './alien/AlienGeometry';
import { ALIEN_CONFIG } from './alien/alienConfig';
import { getComponentColor } from './alien/alienUtils';
import { updateAlienFrame } from './alien/alienAnimationStates';

function Alien({ alien, isHighlighted = false }) {
  const meshRef = useRef();
  const { type } = alien;
  const playerPosition = useGameStore((state) => state.playerPosition);
  
  // Create component color function bound to this alien
  const boundGetComponentColor = (component) => getComponentColor(alien, component, isHighlighted);
  
  useFrame((state) => {
    updateAlienFrame(alien, meshRef, playerPosition);
  });
  
  return (
    <group ref={meshRef} scale={ALIEN_CONFIG.shipScale}>
      <AlienGeometry 
        alien={alien} 
        isHighlighted={isHighlighted} 
        getComponentColor={boundGetComponentColor}
      />
    </group>
  );
}

export default Alien;