// Flexible Game Space Configuration
// Supports both rectangular and circular/cylindrical bounds

export const GameSpaceConfig = {
  // SHAPE CONFIGURATION
  shape: 'circular', // 'rectangular' or 'circular'
  
  // SIZE CONFIGURATION (east-west oval, 10% smaller than previous)
  size: {
    // Horizontal radius/half-width from player (wider for east-west oval)
    horizontal: 20.25, // 10% smaller than 22.5
    // Vertical radius/half-height from player center (narrower for oval)
    vertical: 8.1, // 10% smaller than 9 (which was ~80% of horizontal)
    // Forward distance (negative Z)
    forward: 101.25, // 10% smaller than 112.5
    // Backward distance (positive Z) 
    backward: 10.125 // 10% smaller than 11.25
  },

  // LAYER DISTANCES (Z-axis zones from player, doubled)
  layers: {
    player: 0,           // Player position
    combat: -22.5,       // Where enemies stop to fight (doubled)
    powerups: -45,       // Powerup spawn distance (doubled)
    nearSpawn: -90,      // Close enemy/asteroid spawns (doubled)
    farSpawn: -180,      // Far enemy/asteroid spawns (doubled)
    cleanup: -270        // Cleanup boundary (doubled)
  }
};

// STATIC GAMESPACE CENTER
export const GAMESPACE_CENTER = { x: 0, y: 12, z: 0 };

// DYNAMIC GAMESPACE (static center, not dependent on player position)
export const GameSpace = {
  // Get all bounds based on static gamespace center
  updateBounds(playerPosition = GAMESPACE_CENTER) {
    const config = GameSpaceConfig;
    const center = GAMESPACE_CENTER; // Use static center, not player position
    
    return {
      // PLAYER MOVEMENT AREA
      player: {
        bounds: this._createBounds(center, config.size.horizontal, config.size.vertical, 0, 0),
        startPosition: GAMESPACE_CENTER
      },

      // COMBAT ZONE (where active gameplay happens)
      combatZone: this._createBounds(
        center, 
        config.size.horizontal * 1.2, 
        config.size.vertical * 1.2, 
        config.layers.combat, 
        config.layers.backward
      ),

      // SPAWN ZONES
      spawn: {
        enemies: this._createBounds(
          center,
          config.size.horizontal * 1.5,
          config.size.vertical * 1.5,
          config.layers.farSpawn,
          config.layers.nearSpawn
        ),
        
        asteroids: this._createBounds(
          center,
          config.size.horizontal * 2,
          config.size.vertical * 2,
          config.layers.farSpawn - 30,
          config.layers.nearSpawn - 20
        ),
        
        powerups: this._createBounds(
          center,
          config.size.horizontal,
          config.size.vertical,
          config.layers.powerups - 20,
          config.layers.powerups + 10
        )
      },

      // CLEANUP BOUNDARIES
      cleanup: this._createBounds(
        center,
        config.size.horizontal * 3,
        config.size.vertical * 3,
        config.layers.cleanup,
        config.layers.backward + 10
      ),

      // MISSILE BOUNDS
      missiles: {
        player: {
          bounds: this._createBounds(
            center,
            config.size.horizontal * 2,
            config.size.vertical * 2,
            config.layers.cleanup,
            config.layers.backward
          ),
          spawnOffset: { x: 0, y: 0, z: -2 },
          velocity: { x: 0, y: 0, z: -3.0 }
        },
        
        alien: {
          bounds: this._createBounds(
            center,
            config.size.horizontal * 1.5,
            config.size.vertical * 1.5,
            config.layers.combat - 10,
            config.layers.backward
          ),
          velocity: { baseZ: 0.5 }
        }
      },

      // STOPPING POSITIONS
      positions: {
        enemyCombat: config.layers.combat,
        groundLevel: config.layers.combat - 5
      }
    };
  },

  // Create bounds based on shape configuration
  _createBounds(center, horizontalSize, verticalSize, zMin, zMax) {
    if (GameSpaceConfig.shape === 'circular') {
      return {
        type: 'circular',
        center: { x: center.x, y: center.y },
        radius: horizontalSize,
        y: { min: center.y - horizontalSize, max: center.y + horizontalSize },
        z: { min: zMin, max: zMax }
      };
    } else {
      return {
        type: 'rectangular',
        x: { min: center.x - horizontalSize, max: center.x + horizontalSize },
        y: { min: center.y - verticalSize, max: center.y + verticalSize },
        z: { min: zMin, max: zMax }
      };
    }
  },

  // Get current bounds (call this to get fresh bounds)
  getCurrentBounds(playerPosition) {
    return this.updateBounds(playerPosition);
  }
};

// UTILITY FUNCTIONS
export const GameSpaceUtils = {
  // Check if position is within bounds (handles both shapes)
  isInBounds(position, bounds) {
    // Check Z bounds first (same for both shapes)
    if (position.z < bounds.z.min || position.z > bounds.z.max) {
      return false;
    }
    
    // Check bounds based on shape
    if (bounds.type === 'circular') {
      const dx = position.x - bounds.center.x;
      const dy = position.y - bounds.center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= bounds.radius;
    } else {
      // For rectangular bounds, check X and Y separately
      if (position.y < bounds.y.min || position.y > bounds.y.max) {
        return false;
      }
      return position.x >= bounds.x.min && position.x <= bounds.x.max;
    }
  },

  // Clamp position to bounds (handles both shapes, including oval)
  clampToBounds(position, bounds) {
    let clampedPos = {
      z: Math.max(bounds.z.min, Math.min(bounds.z.max, position.z))
    };
    
    if (bounds.type === 'circular') {
      const dx = position.x - bounds.center.x;
      const dy = position.y - bounds.center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > bounds.radius) {
        // Point is outside circle, project it back onto the circle
        const scale = bounds.radius / distance;
        clampedPos.x = bounds.center.x + dx * scale;
        clampedPos.y = bounds.center.y + dy * scale;
      } else {
        clampedPos.x = position.x;
        clampedPos.y = position.y;
      }
    } else {
      clampedPos.x = Math.max(bounds.x.min, Math.min(bounds.x.max, position.x));
      clampedPos.y = Math.max(bounds.y.min, Math.min(bounds.y.max, position.y));
    }
    
    return clampedPos;
  },

  // Generate random spawn position within zone (handles both shapes)
  randomSpawnPosition(spawnZone, gamespaceCenter = GAMESPACE_CENTER) {
    const bounds = spawnZone;
    
    let x, y;
    
    if (bounds.type === 'circular') {
      // Generate random point within circle
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * bounds.radius;
      x = bounds.center.x + Math.cos(angle) * radius;
      y = bounds.center.y + Math.sin(angle) * radius;
    } else {
      x = Math.random() * (bounds.x.max - bounds.x.min) + bounds.x.min;
      y = Math.random() * (bounds.y.max - bounds.y.min) + bounds.y.min;
    }
    
    const z = Math.random() * (bounds.z.max - bounds.z.min) + bounds.z.min;
    
    return { x, y, z };
  },

  // Check if object should be cleaned up (static based on gamespace center)
  shouldCleanup(position, gamespaceCenter = GAMESPACE_CENTER) {
    const currentBounds = GameSpace.getCurrentBounds(gamespaceCenter);
    return !this.isInBounds(position, currentBounds.cleanup);
  },

  // Easy way to change shape at runtime
  setShape(newShape) {
    GameSpaceConfig.shape = newShape;
  },

  // Easy way to adjust size at runtime
  adjustSize(multiplier) {
    GameSpaceConfig.size.horizontal *= multiplier;
    GameSpaceConfig.size.vertical *= multiplier;
  }
};