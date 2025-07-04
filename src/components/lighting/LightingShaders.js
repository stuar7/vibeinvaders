import * as THREE from 'three';

/**
 * Creates a rim light shader material for asteroids
 * Provides edge highlighting without actual lights
 */
export function createRimLightMaterial(baseColor = 0x888888, rimColor = 0xaaccff, rimPower = 2.0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: new THREE.Color(baseColor) },
      rimColor: { value: new THREE.Color(rimColor) },
      rimPower: { value: rimPower },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 rimColor;
      uniform float rimPower;
      uniform float time;
      
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;
      
      void main() {
        vec3 viewDir = normalize(vViewPosition);
        
        // Calculate rim lighting
        float rim = 1.0 - dot(viewDir, vNormal);
        rim = pow(rim, rimPower);
        
        // Add subtle pulsing to rim
        float pulse = sin(time * 2.0 + vWorldPosition.x * 0.1) * 0.1 + 0.9;
        rim *= pulse;
        
        // Mix base color with rim
        vec3 finalColor = mix(baseColor, rimColor, rim);
        
        // Add subtle fresnel-like reflection
        float fresnel = pow(1.0 - dot(viewDir, vNormal), 3.0);
        finalColor += rimColor * fresnel * 0.2;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    side: THREE.FrontSide
  });
}

/**
 * Creates a fake area light shader that simulates light emanating from a surface
 */
export function createAreaLightMaterial(color = 0xffffff, intensity = 1.0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      lightColor: { value: new THREE.Color(color) },
      intensity: { value: intensity },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 lightColor;
      uniform float intensity;
      uniform float time;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        // Create gradient from center
        vec2 center = vUv - 0.5;
        float dist = length(center);
        float gradient = 1.0 - smoothstep(0.0, 0.5, dist);
        
        // Add subtle animation
        float flicker = sin(time * 10.0) * 0.05 + 0.95;
        
        // Calculate final color with HDR values for bloom
        vec3 finalColor = lightColor * intensity * gradient * flicker * 2.0;
        
        gl_FragColor = vec4(finalColor, gradient);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

/**
 * Creates a volumetric fog shader for atmospheric lighting
 */
export function createVolumetricFogMaterial(fogColor = 0x8888ff, density = 0.01) {
  return new THREE.ShaderMaterial({
    uniforms: {
      fogColor: { value: new THREE.Color(fogColor) },
      density: { value: density },
      time: { value: 0 },
      cameraPos: { value: new THREE.Vector3() }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying float vDepth;
      
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vec4 mvPosition = viewMatrix * worldPosition;
        vDepth = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 fogColor;
      uniform float density;
      uniform float time;
      uniform vec3 cameraPos;
      
      varying vec3 vWorldPosition;
      varying float vDepth;
      
      void main() {
        // Calculate distance-based fog
        float fogAmount = 1.0 - exp(-density * vDepth);
        
        // Add noise for volumetric appearance
        float noise = sin(vWorldPosition.x * 0.01 + time) * 
                     cos(vWorldPosition.y * 0.01 - time * 0.5) * 0.1;
        fogAmount += noise;
        fogAmount = clamp(fogAmount, 0.0, 0.8);
        
        // Add subtle color variation
        vec3 finalFogColor = fogColor;
        finalFogColor += vec3(
          sin(vWorldPosition.x * 0.005 + time * 0.3) * 0.1,
          cos(vWorldPosition.y * 0.005 - time * 0.2) * 0.1,
          sin(vWorldPosition.z * 0.005 + time * 0.4) * 0.1
        );
        
        gl_FragColor = vec4(finalFogColor, fogAmount);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
}