# Alien Spawning and Visibility Analysis

## Issue Summary
The entity pool system is spawning aliens successfully (confirmed by console logs), but they are not appearing visually in the game even though they're being created and added to the game store.

## Key Findings

### 1. Alien Component Structure ✅
- **File**: `/src/components/Alien.js`
- **Status**: Component properly renders different alien types with correct geometry
- **Render Logic**: No early returns or visibility filters found
- **Position Handling**: Correctly applies position from alien.position to meshRef

### 2. Entity Pool System ✅
- **File**: `/src/systems/EntityPool.js`
- **Status**: Creates proper alien entities with all required properties
- **Templates**: Defines proper alien_scout, alien_armored, alien_elite, alien_boss, alien_flying types
- **Position**: Sets position to { x: 0, y: 0, z: 0 } initially, then overridden by spawn data

### 3. Spawn Data Creation ✅
- **File**: `/src/components/AlienWave.js` (lines 144-163)
- **Status**: Creates comprehensive spawn data including:
  - Valid spawn position based on spawn type and game mode
  - Velocity vectors for movement
  - Combat and spawn flags
  - All necessary alien properties

### 4. Game Store Integration ✅
- **File**: `/src/hooks/useEntityPool.js` (lines 34-41)
- **Status**: Properly adds spawned aliens to game store via `addAlien()`
- **Confirmation**: Console logs show alien count increasing in store
- **Store Function**: `addAlien` simply appends to aliens array

### 5. Rendering Integration ✅
- **File**: `/src/components/AlienWave.js` (lines 512-518)
- **Status**: Maps over `aliens` array from store and renders `<Alien>` components
- **No Filters**: Direct mapping with no filtering conditions

## Potential Issues Identified

### 1. Spawn Position Coordinates 🚩
**Problem**: Aliens may be spawning at positions that are not visible to the camera or outside the expected viewing area.

**Evidence**:
- Spawn positions are calculated based on `UnifiedGamespace.getSafeSpawnPosition(-45, gameMode)`
- In campaign mode, spawn positions use:
  - Bounds: width=36, height=20 (around center x=0, y=12)  
  - Z-position: -45 (45 units in front of player at z=0)

**Possible Issue**: If camera is not positioned correctly or aliens spawn outside camera view frustum.

### 2. Scale and Position Issues 🚩
**Problem**: Aliens might be spawning at microscopic scale or far positions.

**Evidence**:
- Alien component has `<group ref={meshRef} scale={[1.6698, 1.6698, 1.6698]}>` 
- Position is applied via `meshRef.current.position.x = position.x + recoilOffset.x` in useFrame
- Boss aliens get additional `meshRef.current.scale.setScalar(5)` for 5x scale

### 3. Boundary Checking Logic 🚩
**Problem**: Aliens might be getting filtered out by boundary checks.

**Evidence**:
- Line 392: `.filter(alien => alien !== null)` suggests some aliens return null
- Lines 314-315: Boundary checking with `isOutOfBounds` logic
- If `UnifiedGamespace.isWithinBounds()` returns false, aliens get repositioned

### 4. Spawn Animation State 🚩
**Problem**: Aliens might be stuck in spawn animation state.

**Evidence**:
- Aliens spawn with `isSpawning: true` and `isInvulnerable: true`
- Spawn animation lasts 3000ms (3 seconds)
- During spawn animation, different position handling occurs

## Debugging Recommendations

### 1. Add Position Logging
Add console logs to track alien positions throughout the spawn process:
```javascript
// In Alien.js useFrame hook
console.log(`Alien ${alien.id} position:`, position, 'isSpawning:', alien.isSpawning);
```

### 2. Check Camera Frustum
Verify camera position and orientation relative to alien spawn positions:
- Player position: { x: 0, y: 12, z: 0 }
- Alien spawn Z: -45 (should be in front of player)
- Alien spawn X/Y: within bounds of width=36, height=20

### 3. Test Fixed Position
Temporarily spawn aliens at a fixed, known good position:
```javascript
const spawnPosition = { x: 0, y: 12, z: -20 }; // Right in front of player
```

### 4. Verify Render Order
Check if aliens are being rendered behind other geometry or UI elements.

### 5. Check Game State
Verify `gameState === 'playing'` condition is met for alien spawning to occur.

## Most Likely Root Cause

**Hypothesis**: Aliens are spawning outside the camera's viewing frustum due to coordinate system misalignment between the spawn position calculation and the actual game world coordinates.

The spawn position calculation uses `UnifiedGamespace` which might not align with the camera's expected viewing area, especially in the transition from 2D to 3D space.

## Next Steps

1. Add temporary position debugging logs
2. Test with fixed spawn positions near player
3. Verify camera frustum includes alien spawn area
4. Check if alien scale is appropriate for viewing distance