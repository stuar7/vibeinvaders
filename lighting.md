# Three-mesh-bvh and Fast Lighting Techniques for Three.js/WebGL Applications

## Understanding three-mesh-bvh: High-Performance Spatial Acceleration

**Three-mesh-bvh transforms Three.js raycast performance from O(n) to O(log n) complexity**, delivering performance improvements of multiple orders of magnitude. Created by Garrett Johnson, this library implements Bounding Volume Hierarchy (BVH) acceleration structures specifically designed for Three.js meshes, with current version 0.9.0 achieving ~440,000 weekly npm downloads.

### Core Architecture and Implementation

The library offers three construction strategies, each optimized for different use cases. The **CENTER strategy** (default) provides fastest construction time by splitting nodes at the center of the longest axis. The **AVERAGE strategy** offers moderate construction time with better performance for certain geometry types. The **SAH (Surface Area Heuristic) strategy** delivers optimal bounds and memory efficiency through testing 32 discrete splits per axis, though with slower construction time.

```javascript
// Basic implementation
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

// Override Three.js raycast globally
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Generate BVH for geometry
const geometry = new THREE.TorusKnotGeometry(10, 3, 400, 100);
geometry.boundsTree = new MeshBVH(geometry, { 
    strategy: CENTER,
    maxDepth: 40,
    maxLeafTris: 10
});
```

### Advanced Features and Spatial Queries

Beyond basic raycasting, three-mesh-bvh enables sophisticated spatial operations. The **shapecast API** allows custom intersection logic, while specialized methods handle sphere, box, and geometry-to-geometry queries. **Closest point queries** enable efficient distance calculations, crucial for collision detection systems.

```javascript
// Spatial query examples
const sphere = new THREE.Sphere(center, radius);
const intersects = bvh.intersectsSphere(sphere);

// Closest point calculation
const result = bvh.closestPointToPoint(point, {}, 0, Infinity);
// Returns: { point: Vector3, distance: Number, faceIndex: Number }

// Custom shapecast for complex queries
bvh.shapecast({
    intersectsBounds: (box, isLeaf, score, depth, nodeIndex) => {
        return INTERSECTED | NOT_INTERSECTED | CONTAINED;
    },
    intersectsTriangle: (triangle, triangleIndex) => {
        // Custom triangle logic
        return true;
    }
});
```

### Performance Optimization Guidelines

The library demonstrates exceptional performance with **500 rays against 80,000 polygon models at 60fps**. Optimal usage requires geometries between 1,000-1,000,000 triangles, with the sweet spot at 10,000-500,000 triangles. Memory management features include serialization support for caching and SharedArrayBuffer compatibility for cross-worker sharing.

## Modern GPU-Friendly Lighting Approaches

### Forward vs Deferred Rendering Trade-offs

**Forward rendering** maintains simplicity with native transparency support but suffers from linear performance degradation with light count. Testing shows 60 FPS with 50 lights dropping to 15 FPS with 500 lights. **Deferred rendering** excels with many lights, maintaining 60 FPS even with 500+ lights through G-buffer optimization, though it requires more memory and complicates transparency handling.

```javascript
// Deferred rendering G-buffer setup
const ext = gl.getExtension('WEBGL_draw_buffers');
gl.framebufferTexture2D(gl.FRAMEBUFFER, ext.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, positionTexture, 0);
gl.framebufferTexture2D(gl.FRAMEBUFFER, ext.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, normalTexture, 0);
gl.framebufferTexture2D(gl.FRAMEBUFFER, ext.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, colorTexture, 0);
```

### Clustered Forward and Tile-Based Techniques

**Clustered forward rendering** divides the view frustum into a 3D grid, reducing complexity from O(lights × pixels) to O(lights_per_cluster × pixels). Optimal configuration uses 15×15×15 clusters, achieving 5-17x performance improvement with 500+ lights. **Tile-based deferred shading** further optimizes by culling lights per screen-space tile, typically using 32×32 pixel tiles.

```javascript
// Clustered forward implementation concept
const clusterDimensions = { x: 15, y: 15, z: 15 };
function assignLightsToCluster(lights, camera) {
    const clusters = new Array(totalClusters).fill(null).map(() => []);
    
    lights.forEach(light => {
        const clusterIndices = getClusterIndices(light.position, light.distance, camera);
        clusterIndices.forEach(index => {
            clusters[index].push(light);
        });
    });
    
    return clusters;
}
```

### Advanced Screen-Space Effects

**Screen-Space Ambient Occlusion (SSAO)** using N8AO provides efficient ambient darkening with configurable radius and intensity. Implementation requires careful parameter tuning for performance, with half-resolution rendering recommended for mobile devices.

```javascript
// N8AO implementation
import { N8AOPass } from 'n8ao';

const n8aoPass = new N8AOPass(scene, camera, width, height);
n8aoPass.configuration.aoRadius = 0.5;
n8aoPass.configuration.distanceFalloff = 0.1;
n8aoPass.configuration.intensity = 1.0;
composer.addPass(n8aoPass);
```

## Space Invader Game-Specific Optimizations

### Critical Performance Limits and Solutions

Research reveals **Three.js can only handle ~50 point lights before significant frame drops**, with each shadow-casting light rendering the scene 6 additional times. For Space Invader games with numerous projectiles and explosions, alternative approaches become essential.

**Emissive materials combined with bloom** provide the most effective solution, achieving visual quality without performance penalties:

```javascript
// High-performance projectile glow
const projectileMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,  // Black base for pure emissive
    emissive: 0x00ff00,
    emissiveIntensity: 2.0  // Above bloom threshold
});

// Selective bloom for efficiency
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // strength
    0.4,  // radius  
    1.0   // threshold
);
```

### GPU Instancing for Mass Rendering

**Instanced rendering** dramatically improves performance when rendering multiple projectiles or particles:

```javascript
// Efficient projectile system
const instancedProjectiles = new THREE.InstancedMesh(
    projectileGeometry,
    projectileMaterial,
    100  // Maximum projectile count
);

// Update positions efficiently
const matrix = new THREE.Matrix4();
for (let i = 0; i < activeProjectiles; i++) {
    matrix.setPosition(projectiles[i].position);
    instancedProjectiles.setMatrixAt(i, matrix);
}
instancedProjectiles.instanceMatrix.needsUpdate = true;
```

### Shader-Based Fake Lighting

Custom shaders provide efficient lighting approximation without actual light objects:

```glsl
// Fragment shader for fake point lighting
uniform vec3 lightPosition;
uniform float lightRadius;
uniform float lightIntensity;

void main() {
    float distance = length(vPosition - lightPosition);
    float attenuation = 1.0 / (1.0 + distance * distance / (lightRadius * lightRadius));
    vec3 finalColor = lightColor * lightIntensity * attenuation;
    gl_FragColor = vec4(finalColor, 1.0);
}
```

### Sprite-Based Glow Effects

Billboard sprites offer lightweight glow effects ideal for arcade aesthetics:

```javascript
// Dynamic glow sprite generation
class LightSprite {
    constructor(color, intensity) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Radial gradient for glow
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${intensity})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        const texture = new THREE.CanvasTexture(canvas);
        this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: texture,
            blending: THREE.AdditiveBlending
        }));
    }
}
```

## Implementation Best Practices

### Device-Adaptive Performance

Implement dynamic quality adjustment based on device capabilities and runtime performance:

```javascript
// Adaptive quality system
const performanceConfig = {
    desktop: {
        particleCount: 1000,
        bloomResolution: 512,
        maxLights: 8,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
    },
    mobile: {
        particleCount: 500,
        bloomResolution: 256,
        maxLights: 4,
        pixelRatio: Math.min(window.devicePixelRatio, 1.5)
    }
};

// Runtime FPS monitoring
class AdaptiveQuality {
    constructor() {
        this.targetFPS = 60;
        this.currentFPS = 60;
    }
    
    update() {
        if (this.currentFPS < this.targetFPS - 5) {
            this.reduceQuality();
        } else if (this.currentFPS > this.targetFPS + 5) {
            this.increaseQuality();
        }
    }
}
```

### Memory Management Strategies

For three-mesh-bvh, implement caching and serialization for large geometries:

```javascript
// BVH caching system
const serialized = MeshBVH.serialize(bvh, { cloneBuffers: false });
localStorage.setItem('bvh_cache', JSON.stringify(serialized));

// Restore from cache
const cached = JSON.parse(localStorage.getItem('bvh_cache'));
const bvh = MeshBVH.deserialize(cached, geometry);
```

### Material Hierarchy for Performance

Choose materials based on performance requirements:
1. **MeshBasicMaterial**: Fastest, no lighting calculations
2. **MeshLambertMaterial**: Vertex lighting, good performance
3. **MeshPhongMaterial**: Pixel lighting, moderate performance
4. **MeshStandardMaterial**: PBR, highest quality but slowest

## Complete Space Invader Implementation Example

```javascript
class SpaceInvaderLightingSystem {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        
        // Setup layers for selective bloom
        this.bloomLayer = new THREE.Layers();
        this.bloomLayer.set(1);
        
        // Initialize subsystems
        this.setupBloomPipeline();
        this.initializeProjectilePool();
        this.setupExplosionSystem();
    }
    
    setupBloomPipeline() {
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 1.0
        );
        
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.composer.addPass(bloomPass);
    }
    
    createProjectile(position, velocity) {
        const projectile = new THREE.Mesh(
            new THREE.PlaneGeometry(0.1, 0.3),
            new THREE.MeshBasicMaterial({
                color: 0x000000,
                emissive: 0x00ff00,
                emissiveIntensity: 2.0
            })
        );
        
        projectile.position.copy(position);
        projectile.userData.velocity = velocity;
        projectile.layers.set(1); // Enable bloom
        
        return projectile;
    }
}
```

## Conclusion and Recommendations

For high-performance Three.js applications, **three-mesh-bvh is essential for complex geometry interaction**, providing logarithmic complexity for spatial queries. The library's mature API and active development make it production-ready for applications with 1,000+ triangle meshes.

**Modern lighting techniques** require careful selection based on use case. Desktop applications benefit from deferred or clustered forward rendering for 100+ lights, while mobile devices should rely on forward rendering with aggressive optimization. **Space Invader-style games** specifically benefit from emissive materials with selective bloom, GPU instancing, and sprite-based effects rather than traditional point lights.

Key performance thresholds to remember:
- **50 point lights**: Maximum for forward rendering
- **1,000 triangles**: Minimum for BVH benefit
- **15×15×15 clusters**: Optimal for clustered forward rendering
- **2.0 emissive intensity**: Threshold for bloom effects

By combining spatial acceleration through three-mesh-bvh with modern GPU-friendly lighting techniques, developers can create visually impressive Three.js applications that maintain 60 FPS across diverse hardware configurations.