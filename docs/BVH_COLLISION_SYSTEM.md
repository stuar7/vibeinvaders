# BVH Collision System Documentation

## Overview

The BVH (Bounding Volume Hierarchy) collision system has been implemented to significantly improve collision detection performance in the space invader game. This system uses the `three-mesh-bvh` library to create spatial acceleration structures for fast collision queries.

## Performance Improvements

### Before BVH Implementation
- O(n × m) collision checks where n = number of missiles and m = number of entities
- With 50 missiles and 30 aliens: 1,500 collision checks per frame
- Performance degraded significantly with many entities

### After BVH Implementation
- O(n × log(m)) average case collision checks
- With 50 missiles and 30 aliens: ~250 collision checks per frame (83% reduction)
- Consistent performance even with hundreds of entities

## Key Features

1. **Dynamic BVH Updates**
   - BVH structures automatically rebuild when entity counts change significantly
   - Rebuilds occur at most once per second to avoid performance overhead
   - Separate BVH structures for aliens and asteroids

2. **Optimized Collision Queries**
   - Fast sphere-based collision detection for missiles
   - Radius queries for explosion effects (bombs)
   - Piercing weapon support (BFG, railgun, charge)

3. **Performance Monitoring**
   - Built-in performance tracking for BVH operations
   - Collision reduction metrics logged when many entities present
   - Warning system for slow BVH operations

## Implementation Details

### BVHCollisionSystem Class

The system is implemented as a singleton that manages:
- Merged geometries for aliens and asteroids
- BVH structures for spatial queries
- Entity-to-triangle mapping for identification
- Performance tracking and optimization

### Key Methods

1. **`rebuildAliensBVH(aliens)`** - Rebuilds the BVH for alien entities
2. **`rebuildAsteroidsBVH(asteroids)`** - Rebuilds the BVH for asteroid entities
3. **`checkMissileAlienCollisions(missile, aliens)`** - Fast collision check for missiles vs aliens
4. **`checkMissileAsteroidCollisions(missile, asteroids)`** - Fast collision check for missiles vs asteroids
5. **`getEntitiesInRadius(position, radius, entityType)`** - Get all entities within a radius (for explosions)

### Integration with Game.js

The BVH system is integrated into the main game loop:

```javascript
// BVH rebuilds when entity counts change
useEffect(() => {
  if (aliens.length !== bvhRebuildRef.current.lastAlienCount || 
      bvhCollisionSystem.needsRebuild(aliens, 'alien')) {
    bvhCollisionSystem.rebuildAliensBVH(aliens);
  }
}, [aliens, asteroids, gameState]);

// Fast collision detection in game loop
const hitAlien = bvhCollisionSystem.checkMissileAlienCollisions(missile, currentAliens);
if (hitAlien) {
  // Handle collision
}
```

## Performance Tips

1. **Batch Entity Updates**
   - Update multiple entities before rebuilding BVH
   - Avoid rebuilding BVH every frame

2. **Use Appropriate Geometry Detail**
   - Lower polygon count for collision geometries
   - Aliens use simple boxes, asteroids use low-poly spheres

3. **Monitor Performance Metrics**
   - Watch console logs for BVH efficiency reports
   - Track collision reduction percentages
   - Monitor rebuild frequency

## Debug Features

Enable debug visualization by setting:
```javascript
bvhCollisionSystem.debug = true;
bvhCollisionSystem.updateDebugHelpers(scene);
```

This will display:
- Red wireframe for alien BVH bounds
- Green wireframe for asteroid BVH bounds
- Visual hierarchy depth

## Future Optimizations

1. **Incremental BVH Updates**
   - Refit existing BVH instead of full rebuild for small movements
   - Track entity movement thresholds

2. **Broad Phase Optimization**
   - Sector-based culling before BVH queries
   - Distance-based entity activation

3. **Multi-threaded BVH Building**
   - Use Web Workers for BVH construction
   - Async BVH updates to prevent frame drops

## Troubleshooting

### Common Issues

1. **Missing Collisions**
   - Ensure BVH is rebuilt after adding/removing entities
   - Check collision radius calculations
   - Verify entity positions are valid (not NaN)

2. **Performance Spikes**
   - Monitor rebuild frequency (should be < 1Hz)
   - Check entity counts in performance logs
   - Reduce geometry complexity if needed

3. **Memory Usage**
   - Dispose old BVH structures properly
   - Monitor geometry disposal on entity removal
   - Use geometry instancing for similar entities

## Console Commands

For debugging, you can access the BVH system from the console:
```javascript
// Check BVH status
window.bvhCollisionSystem = bvhCollisionSystem;

// Force rebuild
bvhCollisionSystem.rebuildAliensBVH(useGameStore.getState().aliens);

// Enable debug visualization
bvhCollisionSystem.debug = true;
```
