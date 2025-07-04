/**
 * GPU Shader Pre-compilation System
 * Forces Three.js to compile all shaders during loading to prevent in-game stutters
 */

import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

class GPUPrecompiler {
  constructor() {
    this.compiledMaterials = new Set();
    this.compiledGeometries = new Set();
  }

  /**
   * Pre-compile all game assets on the GPU
   * This prevents shader compilation stutters during gameplay
   */
  async precompileAll(scene, camera, renderer) {
    console.log('[GPU PRECOMPILER] Starting comprehensive shader pre-compilation...');
    const startTime = performance.now();
    
    // Create temporary compilation scene
    const compileScene = new THREE.Scene();
    
    // Add basic lighting for materials that need it
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    compileScene.add(ambientLight);
    compileScene.add(directionalLight);
    
    const compilationStats = {
      weapons: 0,
      effects: 0,
      aliens: 0,
      environment: 0,
      ui: 0,
      player: 0,
      powerups: 0,
      background: 0,
      total: 0
    };
    
    // 1. Compile weapon materials
    await this.compileWeaponShaders(compileScene, compilationStats);
    
    // 2. Compile effect materials
    await this.compileEffectShaders(compileScene, compilationStats);
    
    // 3. Compile alien materials
    await this.compileAlienShaders(compileScene, compilationStats);
    
    // 4. Compile environment materials
    await this.compileEnvironmentShaders(compileScene, compilationStats);
    
    // 5. Compile UI materials
    await this.compileUIShaders(compileScene, compilationStats);
    
    // 6. Compile player ship and wingmen materials
    await this.compilePlayerShaders(compileScene, compilationStats);
    
    // 7. Compile power-up materials
    await this.compilePowerUpShaders(compileScene, compilationStats);
    
    // 8. Compile background and space materials
    await this.compileBackgroundShaders(compileScene, compilationStats);
    
    // Force Three.js to compile all shaders
    console.log('[GPU PRECOMPILER] Forcing GPU compilation...');
    renderer.compile(compileScene, camera);
    
    // Clean up
    compileScene.clear();
    
    const compileTime = performance.now() - startTime;
    compilationStats.total = Object.values(compilationStats).reduce((a, b) => a + b, 0) - compilationStats.total;
    
    console.log(`[GPU PRECOMPILER] Pre-compilation complete in ${compileTime.toFixed(2)}ms`);
    console.log('[GPU PRECOMPILER] Compilation stats:', compilationStats);
    
    return { compileTime, stats: compilationStats };
  }
  
  async compileWeaponShaders(scene, stats) {
    console.log('[GPU PRECOMPILER] Compiling weapon shaders...');
    
    // Get weapon mesh pool reference
    const weaponMeshPool = await import('./WeaponMeshPool2').then(m => m.default);
    
    // Add sample meshes from each weapon pool to force compilation
    const weaponTypes = ['rocket', 'bfg', 'bomb', 'railgun'];
    
    weaponTypes.forEach(weaponType => {
      const pool = weaponMeshPool.pools.get(weaponType);
      if (pool && pool.available.length > 0) {
        const mesh = pool.available[0];
        mesh.position.set(9999, 9999, 9999); // Off-screen
        mesh.visible = true;
        scene.add(mesh);
        stats.weapons++;
        
        // Also compile any child meshes (lights, effects, etc.)
        mesh.traverse(child => {
          if (child.isMesh && child !== mesh) {
            stats.weapons++;
          }
        });
      }
    });
    
    // Compile simple weapon materials (laser, chaingun, default)
    const simpleMaterials = [
      new THREE.MeshBasicMaterial({ color: '#ffffff' }), // default
      new THREE.MeshBasicMaterial({ color: '#ff0000' }), // laser
      new THREE.MeshBasicMaterial({ color: '#ffff00' }), // chaingun
    ];
    
    simpleMaterials.forEach(material => {
      const geometry = new THREE.SphereGeometry(1, 8, 6);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(9999, 9999, 9999);
      scene.add(mesh);
      stats.weapons++;
    });
  }
  
  async compileEffectShaders(scene, stats) {
    console.log('[GPU PRECOMPILER] Compiling effect shaders...');
    
    // Explosion materials
    const explosionMaterials = [
      new THREE.MeshBasicMaterial({ 
        color: '#ff6600',
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      }),
      new THREE.MeshBasicMaterial({ 
        color: '#ffaa00',
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      }),
    ];
    
    explosionMaterials.forEach(material => {
      const geometry = new THREE.SphereGeometry(1, 16, 12);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(9999, 9999, 9999);
      scene.add(mesh);
      stats.effects++;
    });
    
    // Particle materials
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      color: '#ffaa00',
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(100 * 3);
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.position.set(9999, 9999, 9999);
    scene.add(particles);
    stats.effects++;
  }
  
  async compileAlienShaders(scene, stats) {
    console.log('[GPU PRECOMPILER] Compiling alien shaders...');
    
    // Different alien material types
    const alienMaterials = [
      new THREE.MeshLambertMaterial({ color: '#00ff00' }), // Basic alien
      new THREE.MeshLambertMaterial({ color: '#ff00ff' }), // Elite alien
      new THREE.MeshPhongMaterial({ 
        color: '#ff0000',
        emissive: '#330000',
        shininess: 100 
      }), // Boss alien
    ];
    
    alienMaterials.forEach(material => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(9999, 9999, 9999);
      scene.add(mesh);
      stats.aliens++;
    });
  }
  
  async compileEnvironmentShaders(scene, stats) {
    console.log('[GPU PRECOMPILER] Compiling environment shaders...');
    
    // Asteroid materials
    const asteroidMaterials = [
      new THREE.MeshLambertMaterial({ color: '#888888' }),
      new THREE.MeshLambertMaterial({ color: '#666666' }),
      new THREE.MeshLambertMaterial({ color: '#444444' }),
    ];
    
    asteroidMaterials.forEach(material => {
      const geometry = new THREE.IcosahedronGeometry(1, 1);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(9999, 9999, 9999);
      scene.add(mesh);
      stats.environment++;
    });
    
    // Ground/background materials
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: '#202020',
      fog: true
    });
    
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.position.set(9999, 9999, 9999);
    scene.add(groundMesh);
    stats.environment++;
  }
  
  async compileUIShaders(scene, stats) {
    console.log('[GPU PRECOMPILER] Compiling UI shaders...');
    
    // HUD materials
    const hudMaterials = [
      new THREE.MeshBasicMaterial({ 
        color: '#00ff00',
        transparent: true,
        opacity: 0.8
      }),
      new THREE.MeshBasicMaterial({ 
        color: '#ff0000',
        transparent: true,
        opacity: 0.8
      }),
    ];
    
    hudMaterials.forEach(material => {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(9999, 9999, 9999);
      scene.add(mesh);
      stats.ui++;
    });
  }
  
  async compilePlayerShaders(scene, stats) {
    console.log('[GPU PRECOMPILER] Compiling player and wingmen shaders...');
    
    // Player ship materials
    const playerMaterials = [
      new THREE.MeshLambertMaterial({ color: '#4488ff' }), // Player ship body
      new THREE.MeshBasicMaterial({ color: '#ffffff' }), // Player ship details
      new THREE.MeshBasicMaterial({ 
        color: '#00aaff',
        transparent: true,
        opacity: 0.8
      }), // Ship highlights
      new THREE.MeshPhongMaterial({ 
        color: '#2266cc',
        emissive: '#001133',
        shininess: 50 
      }), // Metallic surfaces
    ];
    
    // Wingmen ship materials
    const wingmenMaterials = [
      new THREE.MeshLambertMaterial({ color: '#66aa44' }), // Wingman ship body
      new THREE.MeshLambertMaterial({ color: '#44aa66' }), // Wingman ship alt
      new THREE.MeshBasicMaterial({ 
        color: '#88ff44',
        transparent: true,
        opacity: 0.7
      }), // Wingman highlights
    ];
    
    // Engine trail materials
    const engineMaterials = [
      new THREE.MeshBasicMaterial({ 
        color: '#ff4400',
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      }),
      new THREE.MeshBasicMaterial({ 
        color: '#ff8800',
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      }),
    ];
    
    [...playerMaterials, ...wingmenMaterials, ...engineMaterials].forEach(material => {
      const geometry = new THREE.BoxGeometry(1, 1, 2); // Ship-like geometry
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(9999, 9999, 9999);
      scene.add(mesh);
      stats.player++;
    });
  }
  
  async compilePowerUpShaders(scene, stats) {
    console.log('[GPU PRECOMPILER] Compiling power-up shaders...');
    
    // Power-up materials
    const powerUpMaterials = [
      new THREE.MeshBasicMaterial({ 
        color: '#ffff00',
        transparent: true,
        opacity: 0.9
      }), // Weapon power-ups
      new THREE.MeshBasicMaterial({ 
        color: '#ff0088',
        transparent: true,
        opacity: 0.9
      }), // Health power-ups
      new THREE.MeshBasicMaterial({ 
        color: '#00ff88',
        transparent: true,
        opacity: 0.9
      }), // Shield power-ups
      new THREE.MeshBasicMaterial({ 
        color: '#8800ff',
        transparent: true,
        opacity: 0.9
      }), // Special power-ups
    ];
    
    powerUpMaterials.forEach(material => {
      const geometry = new THREE.SphereGeometry(0.5, 12, 8);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(9999, 9999, 9999);
      scene.add(mesh);
      stats.powerups++;
    });
  }
  
  async compileBackgroundShaders(scene, stats) {
    console.log('[GPU PRECOMPILER] Compiling background and space shaders...');
    
    // Star field materials
    const starMaterial = new THREE.PointsMaterial({
      size: 2,
      color: '#ffffff',
      transparent: true,
      opacity: 0.8
    });
    
    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1000 * 3);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 2000;
      positions[i + 1] = (Math.random() - 0.5) * 2000;
      positions[i + 2] = (Math.random() - 0.5) * 2000;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.position.set(9999, 9999, 9999);
    scene.add(stars);
    stats.background++;
    
    // Nebula/space background materials
    const spaceMaterials = [
      new THREE.MeshBasicMaterial({ 
        color: '#110033',
        transparent: true,
        opacity: 0.5
      }),
      new THREE.MeshBasicMaterial({ 
        color: '#330011',
        transparent: true,
        opacity: 0.3
      }),
      new THREE.MeshBasicMaterial({ 
        color: '#001133',
        transparent: true,
        opacity: 0.4
      }),
    ];
    
    spaceMaterials.forEach(material => {
      const geometry = new THREE.SphereGeometry(50, 16, 12);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(9999, 9999, 9999);
      scene.add(mesh);
      stats.background++;
    });
    
    // Add BVH compilation for collision meshes
    const bvhTestGeometry = new THREE.BoxGeometry(1, 1, 1);
    bvhTestGeometry.boundsTree = new MeshBVH(bvhTestGeometry);
    const bvhTestMaterial = new THREE.MeshBasicMaterial({ color: '#ff00ff', visible: false });
    const bvhTestMesh = new THREE.Mesh(bvhTestGeometry, bvhTestMaterial);
    bvhTestMesh.position.set(9999, 9999, 9999);
    scene.add(bvhTestMesh);
    stats.background++;
  }
}

// Singleton instance
const gpuPrecompiler = new GPUPrecompiler();

export default gpuPrecompiler;