import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Low-cost glow sprite component that simulates point light effects
 * without the GPU overhead of actual lights
 */
function GlowSprite({ 
  position = [0, 0, 0], 
  color = '#ffffff', 
  intensity = 1.0, 
  size = 5,
  pulseSpeed = 0,
  layers = 0
}) {
  // Create glow texture procedurally
  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Parse color
    const threeColor = new THREE.Color(color);
    const r = Math.floor(threeColor.r * 255);
    const g = Math.floor(threeColor.g * 255);
    const b = Math.floor(threeColor.b * 255);
    
    // Create radial gradient with soft falloff
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensity})`);
    gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${intensity * 0.8})`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${intensity * 0.4})`);
    gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${intensity * 0.1})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    // Add subtle rays for star-like appearance
    if (intensity > 0.7) {
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${intensity * 0.3})`;
      ctx.lineWidth = 2;
      
      // Horizontal ray
      ctx.beginPath();
      ctx.moveTo(0, 64);
      ctx.lineTo(128, 64);
      ctx.stroke();
      
      // Vertical ray
      ctx.beginPath();
      ctx.moveTo(64, 0);
      ctx.lineTo(64, 128);
      ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
  }, [color, intensity]);
  
  // Sprite material with additive blending
  const material = useMemo(() => {
    return new THREE.SpriteMaterial({
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 1.0,
      fog: false // Glows should not be affected by fog
    });
  }, [glowTexture]);
  
  return (
    <sprite
      position={position}
      scale={[size, size, 1]}
      material={material}
      layers-mask={1 << layers}
      userData={{ pulseSpeed, baseScale: size }}
    />
  );
}

export default GlowSprite;