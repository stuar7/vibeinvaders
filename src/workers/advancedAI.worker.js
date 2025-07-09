/**
 * Advanced AI Worker for Space Invaders
 * 
 * Handles CPU-intensive AI computations:
 * - Complex pathfinding with obstacle avoidance
 * - Advanced attack patterns and formations
 * - Missile dodging calculations
 * - Strategic positioning and flanking maneuvers
 */

// AI Worker State
let gameWorld = {
  player: { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
  asteroids: [],
  missiles: [],
  aliens: [],
  bounds: { width: 200, height: 150, depth: 2000 }
};

let aiConfig = {
  pathfindingResolution: 10, // Grid resolution for pathfinding
  lookaheadTime: 3.0, // Seconds to look ahead for predictions
  dangerRadius: 15, // Distance to consider threats
  flockingRadius: 30, // Distance for formation flying
  updateInterval: 100 // ms between major AI updates
};

// Pathfinding grid for spatial optimization
class PathfindingGrid {
  constructor(width, height, depth, resolution) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.resolution = resolution;
    this.cellsX = Math.ceil(width / resolution);
    this.cellsY = Math.ceil(height / resolution);
    this.cellsZ = Math.ceil(depth / resolution);
    this.grid = new Array(this.cellsX * this.cellsY * this.cellsZ).fill(0);
  }
  
  getIndex(x, y, z) {
    const gx = Math.floor((x + this.width/2) / this.resolution);
    const gy = Math.floor((y + this.height/2) / this.resolution);
    const gz = Math.floor((z + this.depth/2) / this.resolution);
    
    if (gx < 0 || gx >= this.cellsX || gy < 0 || gy >= this.cellsY || gz < 0 || gz >= this.cellsZ) {
      return -1;
    }
    
    return gx + gy * this.cellsX + gz * this.cellsX * this.cellsY;
  }
  
  markObstacle(x, y, z, radius = 5) {
    const cells = Math.ceil(radius / this.resolution);
    for (let dx = -cells; dx <= cells; dx++) {
      for (let dy = -cells; dy <= cells; dy++) {
        for (let dz = -cells; dz <= cells; dz++) {
          const index = this.getIndex(x + dx * this.resolution, y + dy * this.resolution, z + dz * this.resolution);
          if (index >= 0) {
            this.grid[index] = 1; // Mark as obstacle
          }
        }
      }
    }
  }
  
  isObstacle(x, y, z) {
    const index = this.getIndex(x, y, z);
    return index >= 0 ? this.grid[index] > 0 : true; // Out of bounds = obstacle
  }
  
  clear() {
    this.grid.fill(0);
  }
}

// Create pathfinding grid
let pathGrid = new PathfindingGrid(
  gameWorld.bounds.width, 
  gameWorld.bounds.height, 
  gameWorld.bounds.depth, 
  aiConfig.pathfindingResolution
);

// Vector3 helper functions
const vec3 = {
  create: (x = 0, y = 0, z = 0) => ({ x, y, z }),
  copy: (v) => ({ x: v.x, y: v.y, z: v.z }),
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  mul: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
  normalize: (v) => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 0, z: 0 };
  },
  length: (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  distance: (a, b) => vec3.length(vec3.sub(a, b)),
  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  lerp: (a, b, t) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  })
};

// Threat Assessment System
class ThreatAnalyzer {
  static analyzeMissileThreats(alienPos, missiles) {
    const threats = [];
    
    for (const missile of missiles) {
      if (!missile.isPlayerMissile) continue;
      
      const distance = vec3.distance(alienPos, missile.position);
      if (distance > aiConfig.dangerRadius * 2) continue;
      
      // Predict missile path
      const missileVel = vec3.normalize(missile.velocity || { x: 0, y: 0, z: -50 });
      const timeToImpact = distance / (vec3.length(missile.velocity || { x: 0, y: 0, z: 50 }) || 50);
      
      const impactPoint = vec3.add(missile.position, vec3.mul(missileVel, timeToImpact * 50));
      const threatDistance = vec3.distance(alienPos, impactPoint);
      
      if (threatDistance < aiConfig.dangerRadius) {
        threats.push({
          type: 'missile',
          position: missile.position,
          velocity: missileVel,
          timeToImpact,
          threatLevel: Math.max(0, 1 - (threatDistance / aiConfig.dangerRadius))
        });
      }
    }
    
    return threats.sort((a, b) => b.threatLevel - a.threatLevel);
  }
  
  static analyzePlayerThreat(alienPos, playerPos, playerVel) {
    const distance = vec3.distance(alienPos, playerPos);
    const playerDir = vec3.normalize(playerVel);
    const toAlien = vec3.normalize(vec3.sub(alienPos, playerPos));
    
    // Check if player is moving toward alien
    const approach = vec3.dot(playerDir, toAlien);
    const threatLevel = approach > 0.5 ? Math.max(0, 1 - (distance / 100)) : 0;
    
    return {
      type: 'player',
      distance,
      approach,
      threatLevel
    };
  }
}

// Advanced Pathfinding using A* with 3D modifications
class Pathfinder {
  static findPath(start, goal, obstacles = []) {
    // Update pathfinding grid with current obstacles
    pathGrid.clear();
    
    // Mark asteroids as obstacles
    for (const asteroid of gameWorld.asteroids) {
      pathGrid.markObstacle(asteroid.position.x, asteroid.position.y, asteroid.position.z, asteroid.scale * 2);
    }
    
    // Mark other aliens as obstacles (for formation flying)
    for (const alien of gameWorld.aliens) {
      if (vec3.distance(alien.position, start) > 1) { // Don't mark self
        pathGrid.markObstacle(alien.position.x, alien.position.y, alien.position.z, 8);
      }
    }
    
    // Simple A* implementation for 3D space
    const openSet = [{ pos: start, f: 0, g: 0, h: vec3.distance(start, goal), parent: null }];
    const closedSet = new Set();
    const resolution = aiConfig.pathfindingResolution;
    
    while (openSet.length > 0) {
      // Find lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      
      // Check if we reached the goal
      if (vec3.distance(current.pos, goal) < resolution) {
        // Reconstruct path
        const path = [];
        let node = current;
        while (node) {
          path.unshift(node.pos);
          node = node.parent;
        }
        return path;
      }
      
      const key = `${Math.round(current.pos.x/resolution)}_${Math.round(current.pos.y/resolution)}_${Math.round(current.pos.z/resolution)}`;
      if (closedSet.has(key)) continue;
      closedSet.add(key);
      
      // Explore neighbors
      const neighbors = [
        { x: resolution, y: 0, z: 0 }, { x: -resolution, y: 0, z: 0 },
        { x: 0, y: resolution, z: 0 }, { x: 0, y: -resolution, z: 0 },
        { x: 0, y: 0, z: resolution }, { x: 0, y: 0, z: -resolution },
        // Diagonal movements
        { x: resolution, y: resolution, z: 0 }, { x: resolution, y: -resolution, z: 0 },
        { x: -resolution, y: resolution, z: 0 }, { x: -resolution, y: -resolution, z: 0 }
      ];
      
      for (const offset of neighbors) {
        const neighbor = vec3.add(current.pos, offset);
        
        // Check bounds
        if (Math.abs(neighbor.x) > gameWorld.bounds.width/2 ||
            Math.abs(neighbor.y) > gameWorld.bounds.height/2 ||
            neighbor.z < -gameWorld.bounds.depth/2 || neighbor.z > gameWorld.bounds.depth/2) {
          continue;
        }
        
        // Check obstacles
        if (pathGrid.isObstacle(neighbor.x, neighbor.y, neighbor.z)) {
          continue;
        }
        
        const g = current.g + vec3.length(offset);
        const h = vec3.distance(neighbor, goal);
        const f = g + h;
        
        // Add to open set if not already processed with better score
        const existing = openSet.find(n => vec3.distance(n.pos, neighbor) < resolution/2);
        if (!existing || existing.f > f) {
          if (existing) {
            openSet.splice(openSet.indexOf(existing), 1);
          }
          openSet.push({ pos: neighbor, f, g, h, parent: current });
        }
      }
      
      // Limit search to prevent infinite loops
      if (closedSet.size > 1000) break;
    }
    
    // No path found, return direct line with obstacle avoidance
    return [start, goal];
  }
}

// Advanced AI Behaviors
class AIBehaviors {
  static calculateFlockingBehavior(alien, nearbyAliens) {
    let separation = vec3.create();
    let alignment = vec3.create();
    let cohesion = vec3.create();
    let count = 0;
    
    for (const other of nearbyAliens) {
      if (other.id === alien.id) continue;
      
      const distance = vec3.distance(alien.position, other.position);
      if (distance < aiConfig.flockingRadius) {
        // Separation - steer away from nearby aliens
        const diff = vec3.normalize(vec3.sub(alien.position, other.position));
        separation = vec3.add(separation, vec3.mul(diff, 1 / distance));
        
        // Alignment - match velocity
        alignment = vec3.add(alignment, other.velocity || vec3.create());
        
        // Cohesion - move toward center of mass
        cohesion = vec3.add(cohesion, other.position);
        
        count++;
      }
    }
    
    if (count > 0) {
      separation = vec3.mul(separation, 2.0); // Strong separation
      alignment = vec3.mul(vec3.normalize(alignment), 1.0);
      cohesion = vec3.mul(vec3.normalize(vec3.sub(vec3.mul(cohesion, 1/count), alien.position)), 0.5);
    }
    
    return vec3.add(vec3.add(separation, alignment), cohesion);
  }
  
  static calculateEvasiveManeuver(alien, threats) {
    if (threats.length === 0) return vec3.create();
    
    let evasion = vec3.create();
    
    for (const threat of threats) {
      if (threat.type === 'missile') {
        // Calculate perpendicular escape vector
        const toThreat = vec3.normalize(vec3.sub(threat.position, alien.position));
        const perpendicular1 = vec3.normalize({ x: -toThreat.y, y: toThreat.x, z: 0 });
        const perpendicular2 = vec3.normalize({ x: 0, y: -toThreat.z, z: toThreat.y });
        
        // Choose the perpendicular direction that moves away from player
        const toPlayer = vec3.normalize(vec3.sub(gameWorld.player.position, alien.position));
        const choice = vec3.dot(perpendicular1, toPlayer) < vec3.dot(perpendicular2, toPlayer) ? perpendicular1 : perpendicular2;
        
        evasion = vec3.add(evasion, vec3.mul(choice, threat.threatLevel * 3));
      }
    }
    
    return evasion;
  }
  
  static calculateAttackPattern(alien, playerPos, playerVel) {
    const distance = vec3.distance(alien.position, playerPos);
    
    // Predict player position
    const predictedPos = vec3.add(playerPos, vec3.mul(playerVel, aiConfig.lookaheadTime));
    
    if (distance > 80) {
      // Long range: approach with flanking
      const approachVector = vec3.normalize(vec3.sub(predictedPos, alien.position));
      const flankOffset = vec3.mul({ x: Math.sin(Date.now() * 0.001 + alien.id), y: Math.cos(Date.now() * 0.001 + alien.id), z: 0 }, 20);
      const targetPos = vec3.add(predictedPos, flankOffset);
      
      return {
        targetPosition: targetPos,
        behavior: 'approach',
        aggressiveness: 0.7
      };
    } else if (distance > 40) {
      // Medium range: circle strafe
      const angle = Date.now() * 0.002 + alien.id;
      const circlePos = vec3.add(predictedPos, {
        x: Math.cos(angle) * 30,
        y: Math.sin(angle) * 20,
        z: Math.sin(angle * 0.5) * 10
      });
      
      return {
        targetPosition: circlePos,
        behavior: 'circle',
        aggressiveness: 1.0
      };
    } else {
      // Close range: hit and run
      const retreatVector = vec3.normalize(vec3.sub(alien.position, predictedPos));
      const retreatPos = vec3.add(alien.position, vec3.mul(retreatVector, 50));
      
      return {
        targetPosition: retreatPos,
        behavior: 'retreat',
        aggressiveness: 0.5
      };
    }
  }
}

// Main AI update function
function updateAlienAI(alien) {
  try {
    // Threat analysis
    const missileThreats = ThreatAnalyzer.analyzeMissileThreats(alien.position, gameWorld.missiles);
    const playerThreat = ThreatAnalyzer.analyzePlayerThreat(alien.position, gameWorld.player.position, gameWorld.player.velocity);
    
    // Flocking behavior with nearby aliens
    const nearbyAliens = gameWorld.aliens.filter(other => 
      other.id !== alien.id && vec3.distance(alien.position, other.position) < aiConfig.flockingRadius * 2
    );
    const flockingForce = AIBehaviors.calculateFlockingBehavior(alien, nearbyAliens);
    
    // Evasive maneuvers
    const evasiveForce = AIBehaviors.calculateEvasiveManeuver(alien, missileThreats);
    
    // Attack patterns
    const attackPattern = AIBehaviors.calculateAttackPattern(alien, gameWorld.player.position, gameWorld.player.velocity);
    
    // Calculate optimal path to target
    const pathToTarget = Pathfinder.findPath(alien.position, attackPattern.targetPosition);
    
    // Combine all forces
    let combinedForce = vec3.create();
    
    // Priority: Evasion > Flocking > Attack
    const evasionWeight = missileThreats.length > 0 ? 3.0 : 0.0;
    const flockingWeight = 0.5;
    const attackWeight = 1.0;
    
    combinedForce = vec3.add(combinedForce, vec3.mul(evasiveForce, evasionWeight));
    combinedForce = vec3.add(combinedForce, vec3.mul(flockingForce, flockingWeight));
    
    // Attack movement (path following)
    if (pathToTarget.length > 1) {
      const nextWaypoint = pathToTarget[1];
      const pathDirection = vec3.normalize(vec3.sub(nextWaypoint, alien.position));
      combinedForce = vec3.add(combinedForce, vec3.mul(pathDirection, attackWeight));
    }
    
    // Normalize and apply speed limits
    const maxSpeed = alien.maxSpeed || 25;
    if (vec3.length(combinedForce) > maxSpeed) {
      combinedForce = vec3.mul(vec3.normalize(combinedForce), maxSpeed);
    }
    
    return {
      id: alien.id,
      recommendedVelocity: combinedForce,
      behavior: attackPattern.behavior,
      aggressiveness: attackPattern.aggressiveness,
      threats: missileThreats.length,
      pathLength: pathToTarget.length,
      shouldFire: attackPattern.behavior === 'circle' && vec3.distance(alien.position, gameWorld.player.position) < 60
    };
  } catch (error) {
    console.error('AI calculation error:', error);
    return {
      id: alien.id,
      recommendedVelocity: vec3.create(),
      behavior: 'idle',
      aggressiveness: 0,
      threats: 0,
      pathLength: 0,
      shouldFire: false
    };
  }
}

// Worker message handling
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'UPDATE_WORLD':
      gameWorld = { ...gameWorld, ...data };
      break;
      
    case 'UPDATE_CONFIG':
      aiConfig = { ...aiConfig, ...data };
      // Recreate pathfinding grid if resolution changed
      if (data.pathfindingResolution || data.bounds) {
        pathGrid = new PathfindingGrid(
          gameWorld.bounds.width, 
          gameWorld.bounds.height, 
          gameWorld.bounds.depth, 
          aiConfig.pathfindingResolution
        );
      }
      break;
      
    case 'COMPUTE_AI':
      const { aliens } = data;
      const aiResults = aliens.map(updateAlienAI);
      
      self.postMessage({
        type: 'AI_RESULTS',
        data: aiResults,
        timestamp: Date.now()
      });
      break;
      
    case 'COMPUTE_FORMATION':
      // Calculate formation flying positions
      const { formationCenter, alienCount, formationType } = data;
      let positions = [];
      
      switch (formationType) {
        case 'arrow':
          for (let i = 0; i < alienCount; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            positions.push({
              x: formationCenter.x + (col - 1) * 15,
              y: formationCenter.y + row * 10,
              z: formationCenter.z + row * -5
            });
          }
          break;
          
        case 'circle':
          for (let i = 0; i < alienCount; i++) {
            const angle = (i / alienCount) * Math.PI * 2;
            positions.push({
              x: formationCenter.x + Math.cos(angle) * 25,
              y: formationCenter.y + Math.sin(angle) * 25,
              z: formationCenter.z
            });
          }
          break;
          
        default:
          // Line formation
          for (let i = 0; i < alienCount; i++) {
            positions.push({
              x: formationCenter.x + (i - alienCount/2) * 12,
              y: formationCenter.y,
              z: formationCenter.z
            });
          }
      }
      
      self.postMessage({
        type: 'FORMATION_POSITIONS',
        data: positions
      });
      break;
      
    default:
      console.warn('Unknown AI worker message type:', type);
  }
};

// Send ready signal
self.postMessage({ type: 'WORKER_READY' });