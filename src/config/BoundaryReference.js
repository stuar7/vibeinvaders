/**
 * BOUNDARY SYSTEM QUICK REFERENCE
 * 
 * This file serves as a quick reference for the boundary system
 * to prevent implementation errors and confusion.
 */

import { GAMESPACE_CENTER, GameSpaceConfig } from './GameSpace';

export const BoundaryReference = {
  // COORDINATE SYSTEM
  coordinates: {
    x: "Left (-) to Right (+) movement",
    y: "Down (-) to Up (+) movement", 
    z: "Forward (-) to Backward (+) movement"
  },

  // CYLINDER ORIENTATION
  cylinder: {
    rotation: [Math.PI / 2, 0, 0], // 90 degrees around X-axis
    orientation: "HORIZONTAL (lying on its side)",
    crossSection: "X-Y plane (player movement plane)",
    length: "200 units along Z-axis (front to back)"
  },

  // BOUNDARY CALCULATIONS
  boundaries: {
    center: GAMESPACE_CENTER, // { x: 0, y: 12, z: 0 }
    radius: GameSpaceConfig.size.horizontal, // 20.25
    
    // Effective bounds after cylinder rotation:
    xRange: `[${-GameSpaceConfig.size.horizontal}, ${GameSpaceConfig.size.horizontal}]`,
    yRange: `[${GAMESPACE_CENTER.y - GameSpaceConfig.size.horizontal}, ${GAMESPACE_CENTER.y + GameSpaceConfig.size.horizontal}]`,
    
    // Distance formula for circular boundary:
    formula: "√((x - 0)² + (y - 12)²) ≤ 20.25"
  },

  // TEST POINTS for verification
  testPoints: {
    center: [0, 12],
    rightEdge: [20.25, 12],
    topEdge: [0, 32.25],
    bottomEdge: [0, -8.25],
    corner: [14.3, 26.3] // Should be exactly at boundary
  },

  // COMMON MISTAKES TO AVOID
  commonMistakes: [
    "Don't use Y-Z coordinates for boundary - use X-Y",
    "Don't forget the cylinder is rotated 90 degrees",
    "Don't use vertical size for circular boundaries",
    "Don't calculate distance from player position - use static center",
    "Don't confuse 'bottom' with Z-axis - it's low Y values"
  ],

  // COLLISION SEGMENTS
  collision: {
    segmentCount: 32,
    segmentAngle: "360° / 32 = 11.25° per segment",
    angleCalculation: "Math.atan2(dy, dx)",
    highlightCount: 3 // main + 2 adjacent segments
  }
};

/**
 * Helper function to verify a position is within bounds
 * Use this for testing and debugging
 */
export const verifyBounds = (x, y) => {
  const dx = x - GAMESPACE_CENTER.x;
  const dy = y - GAMESPACE_CENTER.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const radius = GameSpaceConfig.size.horizontal;
  
  return {
    position: [x, y],
    center: [GAMESPACE_CENTER.x, GAMESPACE_CENTER.y],
    distance,
    radius,
    withinBounds: distance <= radius,
    percentageUsed: (distance / radius * 100).toFixed(1) + '%'
  };
};

/**
 * Helper function to get collision segment for a position
 */
export const getCollisionSegment = (x, y) => {
  const dx = x - GAMESPACE_CENTER.x;
  const dy = y - GAMESPACE_CENTER.y;
  const angle = Math.atan2(dy, dx);
  const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
  const segmentAngle = (2 * Math.PI) / 32;
  const segmentIndex = Math.floor(normalizedAngle / segmentAngle);
  
  return {
    segmentIndex,
    angle: angle * 180 / Math.PI, // degrees
    normalizedAngle: normalizedAngle * 180 / Math.PI // degrees
  };
};