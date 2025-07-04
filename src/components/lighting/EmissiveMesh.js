import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Emissive mesh that provides area lighting without performance cost
 * Can be used as a replacement for PointLights in many scenarios
 */
function EmissiveMesh({ 
  position = [0, 0, 0],
  color = '#ffffff',
  emissiveIntensity = 2.0,
  size = 1,
  geometry = 'sphere',
  pulseSpeed = 0,
  pulseAmount = 0.2,
  enableBloom = true
}) {
  const meshRef = useRef();
  
  // Create geometry based on type
  const meshGeometry = useMemo(() => {
    switch (geometry) {
      case 'sphere':
        return new THREE.SphereGeometry(size, 16, 8);
      case 'box':
        return new THREE.BoxGeometry(size, size, size);
      case 'dodecahedron':
        return new THREE.DodecahedronGeometry(size, 0);
      default:
        return new THREE.SphereGeometry(size, 16, 8);
    }
  }, [geometry, size]);
  
  // Create emissive material
  const material = useMemo(() => {
    const threeColor = new THREE.Color(color);
    
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x000000), // Black base color
      emissive: threeColor,
      emissiveIntensity: emissiveIntensity,
      fog: false // Emissive objects should glow through fog
    });
  }, [color, emissiveIntensity]);
  
  // Animate pulsing if enabled
  useFrame((state) => {
    if (meshRef.current && pulseSpeed > 0) {
      const time = state.clock.elapsedTime;
      const scale = 1 + Math.sin(time * pulseSpeed) * pulseAmount;
      meshRef.current.scale.setScalar(scale * size);
      
      // Also pulse emissive intensity
      meshRef.current.material.emissiveIntensity = 
        emissiveIntensity * (1 + Math.sin(time * pulseSpeed * 1.5) * 0.3);
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      position={position}
      geometry={meshGeometry}
      material={material}
      layers-mask={enableBloom ? 3 : 1} // Enable bloom layer if requested
    />
  );
}

export default EmissiveMesh;