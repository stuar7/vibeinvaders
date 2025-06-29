/**
 * UNIFIED GAMESPACE SYSTEM
 * Single source of truth for all gamespace calculations
 * Prevents data duplication and conflicts between visual, boundary, and collision systems
 */


// SINGLE SOURCE OF TRUTH
export const GAMESPACE_MASTER_CONFIG = {
  // Core geometry - everything derives from this
  center: { x: 0, y: 12, z: 0 },
  // Rectangular boundary (wider east/west)
  bounds: {
    width: 36,    // East/west dimension (wider) - increased from 32 - Campaign mode
    height: 20,   // North/south dimension (narrower) - Campaign mode
  },
  // Free flight mode bounds (much larger play area)
  freeFlightBounds: {
    width: 20000,    // 10,000 units in each direction from center
    height: 20000,   // 10,000 units in each direction from center
  },
  length: 400,                // Cylinder length (Z-axis extent) - doubled
  segments: 32,               // Wireframe segments for collision detection
  
  // Visual cylinder position and orientation
  visual: {
    position: { x: 0, y: 12, z: -100 },  // Cylinder center position - moved back
    rotation: [Math.PI / 2, 0, 0],       // 90° around X-axis (horizontal)
  },
  
  // Z-axis zones (front to back distances)
  zones: {
    front: -500,      // Front of gamespace (doubled length, extending away from player) - Campaign mode
    back: 50,         // Back of gamespace (unchanged) - Campaign mode
    combat: -45,      // Where enemies engage - Campaign mode
    spawn: -280       // Enemy spawn distance (extended for longer gamespace) - Campaign mode
  },
  // Free flight mode zones (much larger Z-axis extent)
  freeFlightZones: {
    front: -10000,    // Front of free flight space
    back: 10000,      // Back of free flight space
    combat: -1000,    // Where enemies engage in free flight
    spawn: -5000      // Enemy spawn distance in free flight
  }
};

/**
 * UNIFIED GEOMETRY CALCULATIONS
 * All other systems must use these functions
 */
export class UnifiedGamespace {
  
  // BOUNDARY SYSTEM (Rectangular) - Mode-aware
  static isWithinBounds(x, y, gameMode = 'campaign') {
    const dx = Math.abs(x - GAMESPACE_MASTER_CONFIG.center.x);
    const dy = Math.abs(y - GAMESPACE_MASTER_CONFIG.center.y);
    
    // Use different bounds based on game mode
    const bounds = gameMode === 'freeflight' ? 
      GAMESPACE_MASTER_CONFIG.freeFlightBounds : 
      GAMESPACE_MASTER_CONFIG.bounds;
    
    return dx <= bounds.width / 2 && dy <= bounds.height / 2;
  }
  
  // Get distance from center (for boundary calculations)
  static getDistanceFromCenter(x, y) {
    const dx = x - GAMESPACE_MASTER_CONFIG.center.x;
    const dy = y - GAMESPACE_MASTER_CONFIG.center.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Get distance from rectangular boundary edge - Mode-aware
  static getDistanceFromBoundary(x, y, gameMode = 'campaign') {
    const dx = Math.abs(x - GAMESPACE_MASTER_CONFIG.center.x);
    const dy = Math.abs(y - GAMESPACE_MASTER_CONFIG.center.y);
    
    // Use different bounds based on game mode
    const bounds = gameMode === 'freeflight' ? 
      GAMESPACE_MASTER_CONFIG.freeFlightBounds : 
      GAMESPACE_MASTER_CONFIG.bounds;
      
    const edgeX = bounds.width / 2;
    const edgeY = bounds.height / 2;
    
    const distanceX = Math.max(0, dx - edgeX);
    const distanceY = Math.max(0, dy - edgeY);
    return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
  }
  
  // COLLISION SEGMENT CALCULATION
  static getCollisionSegment(x, y) {
    const dx = x - GAMESPACE_MASTER_CONFIG.center.x;
    const dy = y - GAMESPACE_MASTER_CONFIG.center.y;
    const angle = Math.atan2(dy, dx);
    const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
    const segmentAngle = (2 * Math.PI) / GAMESPACE_MASTER_CONFIG.segments;
    const segmentIndex = Math.floor(normalizedAngle / segmentAngle);
    
    return {
      segmentIndex,
      angle,
      normalizedAngle,
      adjacentSegments: [
        segmentIndex,
        (segmentIndex + 1) % GAMESPACE_MASTER_CONFIG.segments,
        (segmentIndex + GAMESPACE_MASTER_CONFIG.segments - 1) % GAMESPACE_MASTER_CONFIG.segments
      ]
    };
  }
  
  // SLIDING CALCULATION (Rectangular) - Mode-aware
  static getSlideMovement(currentX, currentY, requestedDeltaX, requestedDeltaY, gameMode = 'campaign') {
    const dx = currentX - GAMESPACE_MASTER_CONFIG.center.x;
    const dy = currentY - GAMESPACE_MASTER_CONFIG.center.y;
    
    // Use different bounds based on game mode
    const bounds = gameMode === 'freeflight' ? 
      GAMESPACE_MASTER_CONFIG.freeFlightBounds : 
      GAMESPACE_MASTER_CONFIG.bounds;
      
    const edgeX = bounds.width / 2;
    const edgeY = bounds.height / 2;
    
    let finalDeltaX = requestedDeltaX;
    let finalDeltaY = requestedDeltaY;
    
    // Check if hitting horizontal boundaries (east/west walls)
    if (Math.abs(dx) >= edgeX * 0.95) {
      finalDeltaX = 0; // Stop horizontal movement
    }
    
    // Check if hitting vertical boundaries (north/south walls)
    if (Math.abs(dy) >= edgeY * 0.95) {
      finalDeltaY = 0; // Stop vertical movement
    }
    
    return {
      deltaX: finalDeltaX * 0.8,
      deltaY: finalDeltaY * 0.8
    };
  }
  
  // VISUAL RECTANGLE GEOMETRY (for GamespaceBoundary component)
  static getRectangleGeometry() {
    return {
      position: [
        GAMESPACE_MASTER_CONFIG.center.x,
        GAMESPACE_MASTER_CONFIG.center.y,
        GAMESPACE_MASTER_CONFIG.visual.position.z
      ],
      args: [
        GAMESPACE_MASTER_CONFIG.bounds.width,   // width
        GAMESPACE_MASTER_CONFIG.bounds.height,  // height
        GAMESPACE_MASTER_CONFIG.length          // depth
      ]
    };
  }
  
  // WIREFRAME SEGMENTS (for rectangular boundary collision visualization)
  static getWireframeSegments() {
    const segments = [];
    const width = GAMESPACE_MASTER_CONFIG.bounds.width;
    const height = GAMESPACE_MASTER_CONFIG.bounds.height;
    const center = GAMESPACE_MASTER_CONFIG.center;
    
    // Create segments along the rectangular boundary edges
    const segmentCount = GAMESPACE_MASTER_CONFIG.segments;
    const perimeter = 2 * (width + height);
    const segmentLength = perimeter / segmentCount;
    
    for (let i = 0; i < segmentCount; i++) {
      const distanceAlongPerimeter = i * segmentLength;
      let x, y;
      
      if (distanceAlongPerimeter < width) {
        // Top edge
        x = center.x - width/2 + distanceAlongPerimeter;
        y = center.y + height/2;
      } else if (distanceAlongPerimeter < width + height) {
        // Right edge
        x = center.x + width/2;
        y = center.y + height/2 - (distanceAlongPerimeter - width);
      } else if (distanceAlongPerimeter < 2 * width + height) {
        // Bottom edge
        x = center.x + width/2 - (distanceAlongPerimeter - width - height);
        y = center.y - height/2;
      } else {
        // Left edge
        x = center.x - width/2;
        y = center.y - height/2 + (distanceAlongPerimeter - 2 * width - height);
      }
      
      segments.push({
        index: i,
        position: { x, y },
        // Longitudinal line position (front to back of rectangular boundary)
        linePosition: [x, y, GAMESPACE_MASTER_CONFIG.visual.position.z]
      });
    }
    
    return segments;
  }
  
  // FRONT AND BACK RECTANGULAR FRAMES (for visual boundary)
  static getRectangleFrameGeometry() {
    const width = GAMESPACE_MASTER_CONFIG.bounds.width;
    const height = GAMESPACE_MASTER_CONFIG.bounds.height;
    
    return {
      front: {
        position: [
          GAMESPACE_MASTER_CONFIG.center.x,
          GAMESPACE_MASTER_CONFIG.center.y,
          GAMESPACE_MASTER_CONFIG.zones.front
        ],
        args: [width, height, 0.5] // thin rectangle frame
      },
      back: {
        position: [
          GAMESPACE_MASTER_CONFIG.center.x,
          GAMESPACE_MASTER_CONFIG.center.y,
          GAMESPACE_MASTER_CONFIG.zones.back
        ],
        args: [width, height, 0.5] // thin rectangle frame
      }
    };
  }
  
  // SPAWN POSITIONS (for enemies, asteroids, powerups) - Rectangular - Mode-aware
  static getRandomSpawnPosition(zPosition = null, safetyPercent = 0.8, gameMode = 'campaign') {
    // Use different bounds based on game mode
    const bounds = gameMode === 'freeflight' ? 
      GAMESPACE_MASTER_CONFIG.freeFlightBounds : 
      GAMESPACE_MASTER_CONFIG.bounds;
    const zones = gameMode === 'freeflight' ? 
      GAMESPACE_MASTER_CONFIG.freeFlightZones : 
      GAMESPACE_MASTER_CONFIG.zones;
    
    // Generate random position within rectangular boundary
    const maxX = bounds.width / 2 * safetyPercent;
    const maxY = bounds.height / 2 * safetyPercent;
    
    const x = GAMESPACE_MASTER_CONFIG.center.x + (Math.random() - 0.5) * 2 * maxX;
    const y = GAMESPACE_MASTER_CONFIG.center.y + (Math.random() - 0.5) * 2 * maxY;
    const z = zPosition !== null ? zPosition : zones.spawn;
    
    return { x, y, z };
  }
  
  // SAFE SPAWN POSITIONS (enemies spawn away from boundary) - Mode-aware
  static getSafeSpawnPosition(zPosition = null, gameMode = 'campaign') {
    // Enemies spawn within 88% of boundary (12% away from edges)
    return this.getRandomSpawnPosition(zPosition, 0.88, gameMode);
  }
  
  // LEGACY COMPATIBILITY (for existing GameSpace.js)
  static getLegacyBounds() {
    return {
      type: 'rectangular',
      center: { 
        x: GAMESPACE_MASTER_CONFIG.center.x, 
        y: GAMESPACE_MASTER_CONFIG.center.y 
      },
      width: GAMESPACE_MASTER_CONFIG.bounds.width,
      height: GAMESPACE_MASTER_CONFIG.bounds.height,
      x: { 
        min: GAMESPACE_MASTER_CONFIG.center.x - GAMESPACE_MASTER_CONFIG.bounds.width / 2, 
        max: GAMESPACE_MASTER_CONFIG.center.x + GAMESPACE_MASTER_CONFIG.bounds.width / 2 
      },
      y: { 
        min: GAMESPACE_MASTER_CONFIG.center.y - GAMESPACE_MASTER_CONFIG.bounds.height / 2, 
        max: GAMESPACE_MASTER_CONFIG.center.y + GAMESPACE_MASTER_CONFIG.bounds.height / 2 
      },
      z: { 
        min: GAMESPACE_MASTER_CONFIG.zones.front, 
        max: GAMESPACE_MASTER_CONFIG.zones.back 
      }
    };
  }
}

// EXPORT CONSTANTS (for backward compatibility)
export const GAMESPACE_CENTER = GAMESPACE_MASTER_CONFIG.center;
export const GAMESPACE_WIDTH = GAMESPACE_MASTER_CONFIG.bounds.width;
export const GAMESPACE_HEIGHT = GAMESPACE_MASTER_CONFIG.bounds.height;