// Web Worker for Missile Physics Updates
// Handles missile movement calculations in parallel

/* eslint-env worker */
/* global self */
/* eslint no-restricted-globals: ["error", "event", "fdescribe"] */

// Non-blocking message-based logging
const WORKER_DEBUG = true; // Enable debug logging via postMessage
const workerLog = WORKER_DEBUG ? (message) => {
  // Low priority, non-blocking log via postMessage
  self.postMessage({
    type: 'workerLog',
    source: 'missilePhysics',
    level: 'debug',
    message: message,
    timestamp: performance.now()
  });
} : () => {};

class MissilePhysicsWorker {
  constructor() {
    this.missiles = [];
    this.aliens = [];
    this.timeMultiplier = 1.0;
    this.gameMode = 'campaign';
  }

  updateMissiles(missiles, aliens, deltaTime, timeMultiplier, gameMode) {
    this.missiles = missiles;
    this.aliens = aliens;
    this.timeMultiplier = timeMultiplier;
    this.gameMode = gameMode;
    
    const speed = 50; // Missile speed
    const adjustedDelta = deltaTime * timeMultiplier;
    const updatedMissiles = [];
    const homingCalculations = [];
    const cullStats = {
      total: missiles.length,
      culled: 0,
      homingUpdates: 0,
      bombsExploded: 0
    };
    
    missiles.forEach(missile => {
      // Skip if already exploded
      if (missile.isBomb && missile.hasExploded) {
        cullStats.culled++;
        return;
      }
      
      // Handle homing missiles with optimized target selection
      if (missile.type === 'player' && missile.homing && aliens.length > 0) {
        cullStats.homingUpdates++;
        let aliensChecked = 0;
        
        // Optimize: Only search for targets within reasonable homing range (100 units)
        const maxHomingRange = 100;
        const maxHomingRangeSquared = maxHomingRange * maxHomingRange;
        
        let closestAlien = null;
        let closestDistance = Infinity;
        let targetDx, targetDy, targetDz; // Store for reuse
        
        // Optimized alien search with early exit and range limiting
        for (let i = 0; i < aliens.length; i++) {
          const alien = aliens[i];
          aliensChecked++;
          
          // Calculate direction components once
          const dx = alien.position.x - missile.position.x;
          const dy = alien.position.y - missile.position.y;
          const dz = alien.position.z - missile.position.z;
          
          // Use squared distance for comparison (avoid sqrt until necessary)
          const distanceSquared = dx * dx + dy * dy + dz * dz;
          
          // Skip aliens outside homing range
          if (distanceSquared > maxHomingRangeSquared) continue;
          
          if (distanceSquared < closestDistance * closestDistance) {
            closestDistance = Math.sqrt(distanceSquared); // Only sqrt when we have a new closest
            closestAlien = alien;
            // Store direction components for reuse
            targetDx = dx;
            targetDy = dy;
            targetDz = dz;
          }
        }
        
        // Debug: Track homing optimization effectiveness
        if (cullStats.homingUpdates % 50 === 0 && aliensChecked > 0) {
          workerLog(`[HOMING OPTIMIZATION] Missile checked ${aliensChecked}/${aliens.length} aliens (range-limited)`);
        }
        
        if (closestAlien && closestDistance > 0) {
          // Reuse the already calculated target direction (no second distance calculation!)
          
          const homingStrength = 0.15;
          
          // Calculate new velocity using pre-calculated direction (no redundant distance calc!)
          const targetVelX = targetDx / closestDistance;
          const targetVelY = targetDy / closestDistance;
          const targetVelZ = targetDz / closestDistance;
          
          missile.velocity.x += (targetVelX - missile.velocity.x) * homingStrength;
          missile.velocity.y += (targetVelY - missile.velocity.y) * homingStrength;
          missile.velocity.z += (targetVelZ - missile.velocity.z) * homingStrength;
          
          // Normalize velocity
          const currentSpeed = Math.sqrt(
            missile.velocity.x * missile.velocity.x + 
            missile.velocity.y * missile.velocity.y + 
            missile.velocity.z * missile.velocity.z
          );
          if (currentSpeed > 0) {
            missile.velocity.x /= currentSpeed;
            missile.velocity.y /= currentSpeed;
            missile.velocity.z /= currentSpeed;
          }
          
          homingCalculations.push({
            missileId: missile.id,
            targetId: closestAlien.id,
            distance: closestDistance
          });
        }
      }
      
      // Check bomb explosions
      if (missile.isBomb && !missile.hasExploded && missile.isDeployed) {
        const currentTime = Date.now();
        if ((currentTime - missile.deployTime) >= missile.explosionDelay) {
          missile.hasExploded = true;
          cullStats.bombsExploded++;
          // Don't update position for exploded bombs
          updatedMissiles.push({
            ...missile,
            shouldExplode: true
          });
          return;
        }
      }
      
      // Update position
      const newX = missile.position.x + missile.velocity.x * adjustedDelta * speed;
      const newY = missile.position.y + missile.velocity.y * adjustedDelta * speed;
      const newZ = missile.position.z + missile.velocity.z * adjustedDelta * speed;
      
      // Check boundaries based on game mode
      let shouldCull = false;
      
      if (gameMode === 'campaign') {
        // Campaign mode culling
        if (missile.type === 'player') {
          const maxDistance = missile.weaponType === 'bfg' ? -843.75 : -281.25;
          if (newZ < maxDistance) {
            shouldCull = true;
            cullStats.culled++;
          }
        } else if (missile.type === 'alien' && newZ > 45) {
          shouldCull = true;
          cullStats.culled++;
        }
        
        // X/Y boundary check
        const gamespaceWidth = 36 * 3; // Extended bounds
        const gamespaceHeight = 20 * 3;
        if (Math.abs(newX) > gamespaceWidth/2 || Math.abs(newY) > gamespaceHeight/2) {
          shouldCull = true;
          cullStats.culled++;
        }
      } else if (gameMode === 'freeflight') {
        // Free flight mode - only cull at extreme distances
        const distanceFromCenter = Math.sqrt(newX * newX + newY * newY + newZ * newZ);
        if (distanceFromCenter > 5000) {
          shouldCull = true;
          cullStats.culled++;
        }
      }
      
      if (!shouldCull) {
        updatedMissiles.push({
          ...missile,
          position: { x: newX, y: newY, z: newZ }
        });
      }
    });
    
    return {
      missiles: updatedMissiles,
      homingCalculations,
      cullStats
    };
  }
}

const physicsWorker = new MissilePhysicsWorker();

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'updatePhysics':
      const results = physicsWorker.updateMissiles(
        data.missiles,
        data.aliens,
        data.deltaTime,
        data.timeMultiplier,
        data.gameMode
      );
      
      self.postMessage({
        type: 'physicsResults',
        results: results,
        timestamp: data.timestamp
      });
      break;
  }
};

// Handle errors
self.onerror = function(error) {
  console.error('Missile Physics Worker Error:', error);
};
