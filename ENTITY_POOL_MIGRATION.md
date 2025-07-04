# Entity Pool Migration Guide

## Overview
The Entity Pool system provides high-performance object pooling for aliens, asteroids, and other game entities. It eliminates garbage collection pressure and provides O(1) entity lookups.

## Current Status
✅ **Entity Pool System Created** (`src/systems/EntityPool.js`)
✅ **Hook Interface Ready** (`src/hooks/useEntityPool.js`) 
✅ **UI Integration Complete** (Debug panel shows pool stats)
✅ **Performance Monitoring Added** (Entity pool usage in debug UI)

## How to Integrate

### 1. Basic Usage in Components

Replace direct alien/asteroid creation:

```javascript
// OLD way (AlienWave.js)
const newAlien = {
  id: `alien-${Date.now()}-${Math.random()}`,
  type: alienType,
  health: 2,
  position: { x: 0, y: 0, z: -500 },
  // ... other properties
};
addAlien(newAlien);

// NEW way with Entity Pool
import { useEntityPool } from '../hooks/useEntityPool';

const { spawnAlien } = useEntityPool();

const newAlien = spawnAlien(alienType, {
  position: { x: 0, y: 0, z: -500 },
  // ... other spawn data
});
```

### 2. Asteroid Creation

```javascript
// OLD way (Asteroids.js)
const newAsteroid = {
  id: `asteroid-${Date.now()}-${Math.random()}`,
  type: 'Normal',
  health: 1,
  size: 2.0,
  // ... other properties
};
addAsteroid(newAsteroid);

// NEW way with Entity Pool
const { spawnAsteroid } = useEntityPool();

const newAsteroid = spawnAsteroid('Normal', {
  position: { x: Math.random() * 100, y: 0, z: -300 },
  // ... other spawn data
});
```

### 3. Entity Removal

```javascript
// OLD way
removeAlien(alienId);
removeAsteroid(asteroidId);

// NEW way (automatically returns to pool)
const { removeAlien, removeAsteroid } = useEntityPool();
removeAlien(alienId);  // Returns entity to pool
removeAsteroid(asteroidId);  // Returns entity to pool
```

### 4. Damage System Integration

```javascript
// OLD way (in collision detection)
const aliens = useGameStore.getState().aliens;
const alienIndex = aliens.findIndex(a => a.id === hit.alienId);
if (alienIndex !== -1) {
  aliens[alienIndex].health -= damage;
  if (aliens[alienIndex].health <= 0) {
    removeAlien(hit.alienId);
  }
}

// NEW way with Entity Pool
const { damageEntity } = useEntityPool();
const result = damageEntity(hit.alienId, damage);
if (result === 'destroyed') {
  // Entity automatically returned to pool
  // Visual effects can be triggered here
}
```

### 5. Batch Operations

```javascript
// Spawn alien waves efficiently
const { spawnAlienWave } = useEntityPool();

const alienWave = [
  { type: 1, spawnData: { position: { x: -10, y: 0, z: -500 } } },
  { type: 2, spawnData: { position: { x: 0, y: 0, z: -500 } } },
  { type: 1, spawnData: { position: { x: 10, y: 0, z: -500 } } }
];

const spawnedAliens = spawnAlienWave(alienWave);
```

## Entity Types Supported

### Aliens (5 types):
- `alien_scout` (Type 1): 2 HP, 10 points, red, fast
- `alien_armored` (Type 2): 4 HP, 15 points, blue, medium
- `alien_elite` (Type 3): 6 HP, 20 points, green, fast + strong
- `alien_boss` (Type 4): 50 HP, 500 points, purple, slow + powerful
- `alien_flying` (Type 5): 6 HP, 30 points, gray, charge weapon

### Asteroids (4 types):
- `asteroid_normal`: 1 HP, brown, 2.0 size
- `asteroid_large`: 3 HP, sandy brown, 6.5 size
- `asteroid_superlarge`: 5 HP, orange-red, 10.0 size  
- `asteroid_doodad`: 0 HP, dark gray, 35.0 size (background)

## Pool Configurations

Current pool sizes (can be adjusted):
```javascript
alien_scout: 20 entities
alien_armored: 15 entities
alien_elite: 10 entities
alien_boss: 3 entities
alien_flying: 5 entities

asteroid_normal: 25 entities
asteroid_large: 15 entities
asteroid_superlarge: 8 entities
asteroid_doodad: 5 entities
```

## Performance Benefits

1. **Zero Garbage Collection**: Entities are reused, not recreated
2. **O(1) Lookups**: Global entity map for instant access
3. **Cached Queries**: Active entity lists cached and updated only when needed
4. **Batch Operations**: Efficient multi-entity spawning
5. **Memory Predictable**: Fixed memory footprint regardless of gameplay

## Monitoring

### Debug UI Shows:
- **Entity Pool Usage**: Active/Total for each entity type
- **Utilization Rates**: Percentage usage with warnings at 80%+
- **Performance Impact**: Reduced garbage collection pressure

### Console Logging:
- Entity spawn/release events
- Pool expansion when needed
- Migration status when integrating existing entities

## Migration Strategy

### Phase 1: Parallel Running ✅
- Entity pool runs alongside existing system
- No breaking changes to current code
- Stats monitoring available in debug UI

### Phase 2: Gradual Migration (Next Steps)
1. Migrate `AlienWave.js` to use `spawnAlien()`
2. Migrate `Asteroids.js` to use `spawnAsteroid()`
3. Update collision detection to use `damageEntity()`
4. Test performance improvements

### Phase 3: Full Integration
1. Remove old entity creation code
2. Use pool entities exclusively
3. Optimize pool sizes based on gameplay data

## Integration Points

### Key Files to Update:
- `src/components/AlienWave.js` - Use `spawnAlien()`
- `src/components/Asteroids.js` - Use `spawnAsteroid()`
- `src/hooks/useWorkerManager.js` - Use `damageEntity()` in collision handling
- `src/components/AlienAIManager.js` - Query entities via pool

### Store Integration:
- Entity pool automatically syncs with Zustand store
- React components continue to work unchanged
- Store remains source of truth for UI updates

## Example Component Migration

```javascript
// Before: AlienWave.js
const createAlien = (type, position) => {
  const alien = {
    id: `alien-${Date.now()}-${Math.random()}`,
    type: type,
    position: position,
    health: getHealthForType(type),
    // ... many more properties
  };
  addAlien(alien);
  return alien;
};

// After: AlienWave.js with Entity Pool
import { useEntityPool } from '../hooks/useEntityPool';

const { spawnAlien } = useEntityPool();

const createAlien = (type, position) => {
  return spawnAlien(type, { position });
  // Health, properties, etc. handled by pool templates
};
```

## Next Steps

1. **Test Current System**: Entity pools are ready but not yet used
2. **Migrate One Component**: Start with AlienWave.js as proof-of-concept
3. **Measure Performance**: Compare before/after metrics
4. **Expand Usage**: Gradually migrate other components
5. **Optimize Pool Sizes**: Adjust based on actual usage patterns

The Entity Pool system is ready for integration and should provide significant performance improvements for entity-heavy gameplay scenarios.