# Impact and Explosion Effects Guide

## Overview

This guide explains the improved impact and explosion effects system, including how to fix the white squares bug and implement various explosion techniques.

## The White Squares Bug Fix

The original issue was that effects were marked as "processed" but never removed from the store, causing them to accumulate indefinitely. The fix includes:

1. **Proper cleanup system**: Effects are now tracked and removed after processing
2. **Automatic removal**: Effects are cleaned up every 2 seconds
3. **Lifetime management**: Each effect has a defined lifetime and is removed when expired

## Effect Types

### 1. Particle-Based Effects (ImpactEffects.js)

The main explosion system uses Three.js points for maximum performance:

- **Sparks**: Small, fast-moving particles for bullet impacts
- **Explosion particles**: Larger, colorful particles with heat transitions
- **Debris**: Physical chunks that can optionally use collision detection

### 2. Shader-Based Effects (ShaderExplosionEffect.js)

Alternative visual effects using custom shaders:

- **Shockwave rings**: Expanding energy rings
- **Glow spheres**: Pulsing, fresnel-based glow effects

## Using three-mesh-bvh (Optional)

While `three-mesh-bvh` isn't typically used for particle explosions, it can enhance debris physics:

```javascript
import { DebrisCollisionSystem } from './DebrisCollisionSystem';

// Initialize collision system
const collisionSystem = useRef(new DebrisCollisionSystem());

// Add ground or other collision meshes
useEffect(() => {
  const groundMesh = scene.getObjectByName('ground');
  if (groundMesh) {
    collisionSystem.current.addCollisionMesh(groundMesh);
  }
}, [scene]);

// Update debris with collision detection
useFrame((state, delta) => {
  collisionSystem.current.updateDebris(debrisData, delta);
});
```

## Adding Effects to Your Game

### To use the improved particle effects:

1. Ensure `ImpactEffects` component is included in your Game component
2. Trigger effects through the store:

```javascript
// For bullet impacts
addEffect({
  id: `hit-${Date.now()}`,
  type: 'hit',
  position: { x, y, z },
  startTime: Date.now()
});

// For explosions
addEffect({
  id: `explosion-${Date.now()}`,
  type: 'explosion',
  position: { x, y, z },
  startTime: Date.now()
});
```

### To add shader-based explosions:

1. Import and add to your Game component:

```javascript
import ShaderExplosionEffect from './ShaderExplosionEffect';

// In your Game component
<ShaderExplosionEffect />
```

## Performance Considerations

1. **Particle pooling**: Pre-allocate particles to avoid garbage collection
2. **Typed arrays**: Use Float32Array for better performance
3. **Batch updates**: Update all particles in a single pass
4. **Automatic cleanup**: Remove effects after their lifetime expires

## Visual Tuning

### Particle effects can be customized:

- `sparkData.count`: Number of spark particles (default: 100)
- `explosionData.count`: Number of explosion particles (default: 150)
- `debrisData.count`: Number of debris chunks (default: 20)
- Lifetime values control how long effects last
- Color arrays control the visual appearance

### Shader effects can be customized:

- Modify uniforms in the shader materials
- Adjust the number of shockwave rings
- Change color gradients and timing

## Common Issues and Solutions

1. **Effects not appearing**: Check that effects are being added to the store with proper structure
2. **Performance drops**: Reduce particle counts or disable less important effects
3. **Effects persisting**: Ensure the cleanup interval is running
4. **Collision not working**: Verify BVH is generated for collision meshes

## Best Practices

1. Use particle effects for most explosions (better performance)
2. Use shader effects sparingly for special moments
3. Only enable collision detection for important debris
4. Clean up effects promptly to maintain performance
5. Test on lower-end devices and adjust particle counts accordingly