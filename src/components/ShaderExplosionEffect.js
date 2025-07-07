import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

/**
 * Shader-based explosion effect as an alternative to particle systems
 * Creates expanding shockwave rings and glowing spheres
 */
function ShaderExplosionEffect() {
  const effects = useGameStore((state) => state.effects);
  const meshRefs = useRef([]);
  
  // Shockwave shader material
  const shockwaveMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uColor: { value: new THREE.Color(0.5, 0.8, 1.0) }
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Expand the ring over time
          float expansion = uTime * 3.0;
          pos.xy *= 1.0 + expansion;
          
          // Add some wave distortion
          float wave = sin(uTime * 10.0 + position.x * 5.0) * 0.1;
          pos.z += wave * (1.0 - uTime);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        
        void main() {
          // Create ring shape
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          float ring = smoothstep(0.3, 0.35, dist) * smoothstep(0.5, 0.45, dist);
          
          // Fade out over time
          float fade = 1.0 - uTime;
          fade = pow(fade, 2.0);
          
          // Energy effect at the edges
          float energy = sin(dist * 20.0 - uTime * 10.0) * 0.5 + 0.5;
          energy *= ring;
          
          vec3 color = uColor + vec3(energy * 0.5);
          float alpha = ring * fade * uOpacity;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, []);
  
  // Glow sphere shader material
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1 },
        uColor1: { value: new THREE.Color(1, 1, 0) },
        uColor2: { value: new THREE.Color(1, 0.3, 0) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        uniform float uTime;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec3 pos = position;
          
          // Pulsing effect
          float pulse = sin(uTime * 5.0) * 0.1 + 1.0;
          pos *= pulse;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          // Fresnel effect for glow
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = 1.0 - dot(vNormal, viewDir);
          fresnel = pow(fresnel, 2.0);
          
          // Animated color mixing
          float colorMix = sin(uTime * 3.0) * 0.5 + 0.5;
          vec3 color = mix(uColor1, uColor2, colorMix);
          
          // Add noise for texture
          float noise = sin(uTime * 10.0 + vViewPosition.x * 5.0) * 0.1;
          
          // Fade out over time
          float fade = 1.0 - uTime;
          fade = pow(fade, 3.0);
          
          float alpha = (fresnel + 0.2 + noise) * fade * uIntensity;
          
          gl_FragColor = vec4(color * 2.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, []);
  
  // Helper function to properly clone shader materials with uniforms
  const cloneShaderMaterial = (material) => {
    const cloned = material.clone();
    // Deep clone the uniforms to prevent undefined values
    cloned.uniforms = {};
    for (const [key, uniform] of Object.entries(material.uniforms)) {
      cloned.uniforms[key] = { value: uniform.value };
      // Handle THREE.js objects that need proper cloning
      if (uniform.value && typeof uniform.value.clone === 'function') {
        cloned.uniforms[key].value = uniform.value.clone();
      }
    }
    return cloned;
  };

  // Active explosions tracking
  const activeExplosions = useRef(new Map());
  
  useFrame((state, delta) => {
    const now = Date.now();
    
    // Check for new explosion effects
    effects.forEach(effect => {
      if (effect.type === 'explosion' && !activeExplosions.current.has(effect.id)) {
        // Create explosion meshes
        const explosionGroup = new THREE.Group();
        explosionGroup.position.set(
          effect.position.x,
          effect.position.y,
          effect.position.z || 0
        );
        
        // Add shockwave rings at different angles
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            cloneShaderMaterial(shockwaveMaterial)
          );
          ring.rotation.x = Math.random() * Math.PI;
          ring.rotation.y = Math.random() * Math.PI;
          ring.userData.delay = i * 0.1;
          explosionGroup.add(ring);
        }
        
        // Add central glow sphere
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 16, 16),
          cloneShaderMaterial(glowMaterial)
        );
        explosionGroup.add(glow);
        
        activeExplosions.current.set(effect.id, {
          group: explosionGroup,
          startTime: now,
          meshes: explosionGroup.children
        });
        
        state.scene.add(explosionGroup);
      }
    });
    
    // Update active explosions
    const toRemove = [];
    activeExplosions.current.forEach((explosion, id) => {
      const elapsed = (now - explosion.startTime) / 1000;
      
      if (elapsed > 2) {
        // Remove completed explosion
        state.scene.remove(explosion.group);
        toRemove.push(id);
      } else {
        // Update shader uniforms
        explosion.meshes.forEach((mesh, index) => {
          if (mesh.material.uniforms && mesh.material.uniforms.uTime) {
            const delay = mesh.userData.delay || 0;
            const adjustedTime = Math.max(0, elapsed - delay);
            mesh.material.uniforms.uTime.value = adjustedTime;
            
            // Scale up the explosion
            const scale = 1 + adjustedTime * 2;
            mesh.scale.setScalar(scale);
          }
        });
      }
    });
    
    // Clean up completed explosions
    toRemove.forEach(id => activeExplosions.current.delete(id));
  });
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      activeExplosions.current.forEach(explosion => {
        if (explosion.group.parent) {
          explosion.group.parent.remove(explosion.group);
        }
      });
      activeExplosions.current.clear();
    };
  }, []);
  
  return null;
}

export default ShaderExplosionEffect;