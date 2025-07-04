import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import effectsPool from '../systems/EffectsPool';
import * as THREE from 'three';

function Effects() {
  const effects = useGameStore((state) => state.effects);
  const removeEffect = useGameStore((state) => state.removeEffect);
  const { scene } = useThree();
  const activeEffectsRef = useRef(new Map()); // Track active pooled effects
  const prevEffectsRef = useRef(new Map());
  const sceneInitialized = useRef(false);

  // Initialize scene with pooled particles on first render
  useEffect(() => {
    if (!sceneInitialized.current && scene) {
      console.log('[EFFECTS] Initializing effects pool with scene...');
      effectsPool.initializeScene(scene);
      sceneInitialized.current = true;
    }
  }, [scene]);

  useEffect(() => {
    const currentEffects = new Map();
    const activeEffects = activeEffectsRef.current;
    const prevEffects = prevEffectsRef.current;
    
    // Build current effects map
    effects.forEach(effect => {
      currentEffects.set(effect.id, effect);
    });
    
    // Release pooled particles for effects that no longer exist
    prevEffects.forEach((effect, effectId) => {
      if (!currentEffects.has(effectId)) {
        effectsPool.releaseEffect(effectId);
        activeEffects.delete(effectId);
      }
    });
    
    // Acquire pooled particles for new effects
    currentEffects.forEach((effect, effectId) => {
      if (!prevEffects.has(effectId) && !activeEffects.has(effectId)) {
        const particleCount = effect.type === 'explosion' ? 20 : 10;
        const particles = effectsPool.acquireEffect(effect.type, effect.id, particleCount);
        
        if (particles.length > 0) {
          // Initialize particle properties
          particles.forEach((particle, index) => {
            const angle = (index / particles.length) * Math.PI * 2;
            const speed = 0.1 + Math.random() * 0.2;
            
            // Set initial position
            particle.userData.initialPosition.set(
              effect.position.x, 
              effect.position.y, 
              effect.position.z || 0
            );
            particle.position.copy(particle.userData.initialPosition);
            
            // Set velocity
            particle.userData.velocity.set(
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              (Math.random() - 0.5) * speed * 0.5
            );
            
            // Set scale and rotation
            particle.userData.initialScale = 0.2 + Math.random() * 0.3;
            particle.userData.initialRotation = Math.random() * Math.PI * 2;
            particle.userData.startTime = effect.startTime;
            
            // Set initial transform
            particle.scale.setScalar(particle.userData.initialScale);
            particle.rotation.z = particle.userData.initialRotation;
            
            // Update material color if needed
            if (effect.color && effect.type === 'powerupCollect') {
              particle.material.color.set(effect.color);
            }
          });
          
          activeEffects.set(effect.id, particles);
          
          console.log(`[EFFECTS] Activated ${particles.length} pooled particles for ${effect.type} ${effect.id} - NO scene.add() needed!`);
        } else {
          console.warn(`[EFFECTS] Failed to acquire pooled particles for ${effect.type} ${effect.id}`);
        }
      }
    });
    
    // Update previous effects reference
    prevEffectsRef.current = currentEffects;
    
  }, [effects]);

  // Update animations and check for completion
  useFrame(() => {
    const now = Date.now();
    const activeEffects = activeEffectsRef.current;
    
    // Update pool animations
    effectsPool.updateAnimations();
    
    // Check for completed effects and remove them
    const effectsToRemove = [];
    
    effects.forEach(effect => {
      const elapsed = now - effect.startTime;
      const progress = elapsed / 1000;
      
      if (progress > 1) {
        effectsToRemove.push(effect.id);
      }
    });
    
    // Remove completed effects
    effectsToRemove.forEach(effectId => {
      removeEffect(effectId);
    });
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Release all active effects
      const activeEffects = activeEffectsRef.current;
      activeEffects.forEach((particles, effectId) => {
        effectsPool.releaseEffect(effectId);
      });
      activeEffects.clear();
    };
  }, []);

  // This component manages pooled particles directly, no JSX needed
  return null;
}

export default Effects;