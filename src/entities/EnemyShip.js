export class EnemyShip {
  constructor(id, type, position, velocity) {
    this.id = id;
    this.type = type;
    this.position = { ...position };
    this.velocity = { ...velocity };
    
    // Target system
    this.currentTarget = null;
    this.lastTargetUpdate = 0;
    
    // Mode system with state
    this.mode = 'passive';
    this.modeState = {};
    
    // Weapon system
    this.weapon = {
      type: 'default',
      lastFireTime: 0,
      fireRate: 2000, // 2 seconds between shots
      velocity: 60, // Projectile speed
      damage: 1,
      color: '#ff0000'
    };
    
    // Movement physics
    this.acceleration = { x: 0, y: 0, z: 0 };
    this.maxSpeed = 8;
    this.turnRate = 2; // radians per second
    this.rotation = { x: 0, y: 0, z: 0 };
    
    // Combat state
    this.health = this.getMaxHealth();
    this.isInvulnerable = false;
    this.isSpawning = false;
    this.spawnStartTime = 0;
    
    // Special properties
    this.isBoss = type === 4;
    this.isDebugAlien = false;
  }
  
  getMaxHealth() {
    switch (this.type) {
      case 1: return 1;  // Scout
      case 2: return 3;  // Armored
      case 3: return 2;  // Elite
      case 4: return 20; // Boss
      case 5: return 5;  // Flying saucer
      default: return 1;
    }
  }
  
  setMode(mode, state = {}) {
    this.mode = mode;
    this.modeState = state;
    
    // Initialize mode-specific state
    switch (mode) {
      case 'passive':
        this.modeState = {};
        break;
        
      case 'exploring':
        this.modeState = {
          explorationCenter: state.explorationCenter || { ...this.position },
          explorationRadius: state.explorationRadius || 50,
          nextWaypoint: null,
          waypointReachedDistance: 5
        };
        break;
        
      case 'tasked':
        this.modeState = {
          destination: state.destination || { x: 0, y: 0, z: 0 },
          arrivalDistance: state.arrivalDistance || 10,
          onArrival: state.onArrival || 'passive' // What mode to switch to on arrival
        };
        break;
        
      case 'combat':
        this.modeState = {
          combatRange: state.combatRange || 40,
          evasionDistance: state.evasionDistance || 20,
          strafeAmplitude: state.strafeAmplitude || 5,
          strafeFrequency: state.strafeFrequency || 0.5
        };
        break;
    }
  }
  
  update(deltaTime, playerPosition, gameTime) {
    // Skip if spawning
    if (this.isSpawning) {
      const spawnDuration = 3000;
      if (gameTime - this.spawnStartTime > spawnDuration) {
        this.isSpawning = false;
        this.isInvulnerable = false;
      } else {
        // Continue spawn animation movement
        this.updatePhysics(deltaTime);
        return;
      }
    }
    
    // Update AI based on mode
    this.updateAI(deltaTime, playerPosition, gameTime);
    
    // Update physics with smooth acceleration
    this.updatePhysics(deltaTime);
    
    // Update rotation to face movement direction
    this.updateRotation(deltaTime);
  }
  
  updateAI(deltaTime, playerPosition, gameTime) {
    switch (this.mode) {
      case 'passive':
        // No movement in passive mode
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.currentTarget = null;
        break;
        
      case 'exploring':
        this.updateExploringMode(deltaTime);
        break;
        
      case 'tasked':
        this.updateTaskedMode(deltaTime);
        break;
        
      case 'combat':
        this.updateCombatMode(deltaTime, playerPosition, gameTime);
        break;
    }
  }
  
  updateExploringMode(deltaTime) {
    // Pick a new waypoint if needed
    if (!this.modeState.nextWaypoint || this.getDistanceTo(this.modeState.nextWaypoint) < this.modeState.waypointReachedDistance) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.modeState.explorationRadius;
      
      this.modeState.nextWaypoint = {
        x: this.modeState.explorationCenter.x + Math.cos(angle) * distance,
        y: this.modeState.explorationCenter.y + (Math.random() - 0.5) * 20,
        z: this.modeState.explorationCenter.z + Math.sin(angle) * distance
      };
    }
    
    // Move towards waypoint
    this.seekTarget(this.modeState.nextWaypoint, deltaTime, 0.5); // Half speed for exploration
  }
  
  updateTaskedMode(deltaTime) {
    const distanceToDestination = this.getDistanceTo(this.modeState.destination);
    
    if (distanceToDestination < this.modeState.arrivalDistance) {
      // Arrived at destination
      this.setMode(this.modeState.onArrival);
    } else {
      // Move towards destination
      this.seekTarget(this.modeState.destination, deltaTime, 1.0);
    }
  }
  
  updateCombatMode(deltaTime, playerPosition, gameTime) {
    this.currentTarget = playerPosition;
    const distanceToPlayer = this.getDistanceTo(playerPosition);
    
    if (distanceToPlayer < this.modeState.evasionDistance) {
      // Too close - evasive maneuvers
      const evasionVector = this.getEvasionVector(playerPosition, gameTime);
      this.acceleration = {
        x: evasionVector.x * 10,
        y: evasionVector.y * 10,
        z: evasionVector.z * 10
      };
    } else if (distanceToPlayer > this.modeState.combatRange * 1.5) {
      // Too far - approach more aggressively
      this.seekTarget(playerPosition, deltaTime, 1.2);
    } else {
      // Combat range - strafe and maintain distance
      const strafeVector = this.getStrafeVector(playerPosition, gameTime);
      this.acceleration = {
        x: strafeVector.x * 5,
        y: strafeVector.y * 5,
        z: strafeVector.z * 5
      };
    }
  }
  
  seekTarget(target, deltaTime, speedFactor = 1.0) {
    const direction = {
      x: target.x - this.position.x,
      y: target.y - this.position.y,
      z: target.z - this.position.z
    };
    
    const distance = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    if (distance > 0) {
      // Normalize and apply acceleration
      const accelMagnitude = 20 * speedFactor;
      this.acceleration = {
        x: (direction.x / distance) * accelMagnitude,
        y: (direction.y / distance) * accelMagnitude,
        z: (direction.z / distance) * accelMagnitude
      };
    }
  }
  
  getEvasionVector(playerPosition, gameTime) {
    // Calculate perpendicular vector for evasion
    const toPlayer = {
      x: playerPosition.x - this.position.x,
      y: playerPosition.y - this.position.y,
      z: playerPosition.z - this.position.z
    };
    
    const distance = Math.sqrt(toPlayer.x ** 2 + toPlayer.y ** 2 + toPlayer.z ** 2);
    if (distance === 0) return { x: 0, y: 0, z: 0 };
    
    // Normalize
    toPlayer.x /= distance;
    toPlayer.y /= distance;
    toPlayer.z /= distance;
    
    // Create perpendicular vector with some randomness
    const angle = Math.sin(gameTime * 0.001 + this.id) * Math.PI;
    return {
      x: -toPlayer.z * Math.cos(angle) - toPlayer.x,
      y: Math.sin(gameTime * 0.002 + this.id) * 0.5,
      z: toPlayer.x * Math.cos(angle) - toPlayer.z
    };
  }
  
  getStrafeVector(playerPosition, gameTime) {
    // Orbital strafe around player
    const angle = gameTime * 0.001 * this.modeState.strafeFrequency + this.id;
    const radius = this.modeState.combatRange;
    
    const targetPos = {
      x: playerPosition.x + Math.cos(angle) * radius,
      y: playerPosition.y + Math.sin(angle * 0.7) * 10,
      z: playerPosition.z + Math.sin(angle) * radius
    };
    
    const direction = {
      x: targetPos.x - this.position.x,
      y: targetPos.y - this.position.y,
      z: targetPos.z - this.position.z
    };
    
    const distance = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    if (distance > 0) {
      return {
        x: direction.x / distance,
        y: direction.y / distance,
        z: direction.z / distance
      };
    }
    
    return { x: 0, y: 0, z: 0 };
  }
  
  updatePhysics(deltaTime) {
    // Apply acceleration to velocity
    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;
    this.velocity.z += this.acceleration.z * deltaTime;
    
    // Apply drag
    const drag = 0.95;
    this.velocity.x *= drag;
    this.velocity.y *= drag;
    this.velocity.z *= drag;
    
    // Limit max speed
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2);
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
      this.velocity.z *= scale;
    }
    
    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * deltaTime;
  }
  
  updateRotation(deltaTime) {
    // Rotate to face movement direction or target
    let targetDirection;
    
    if (this.currentTarget) {
      targetDirection = {
        x: this.currentTarget.x - this.position.x,
        y: this.currentTarget.y - this.position.y,
        z: this.currentTarget.z - this.position.z
      };
    } else if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1) {
      targetDirection = { ...this.velocity };
    } else {
      return; // No rotation needed
    }
    
    // Calculate target rotation
    const targetYaw = Math.atan2(targetDirection.x, targetDirection.z);
    
    // Smooth rotation
    const rotationDelta = targetYaw - this.rotation.y;
    const normalizedDelta = ((rotationDelta + Math.PI) % (2 * Math.PI)) - Math.PI;
    
    this.rotation.y += Math.sign(normalizedDelta) * Math.min(Math.abs(normalizedDelta), this.turnRate * deltaTime);
  }
  
  canFire(gameTime) {
    if (!this.currentTarget || 
        this.isSpawning || 
        this.isInvulnerable || 
        (gameTime - this.weapon.lastFireTime) <= this.weapon.fireRate) {
      return false;
    }
    
    // Check if enemy is facing the target
    return this.isFacingTarget(this.currentTarget);
  }
  
  isFacingTarget(target) {
    // Calculate direction to target
    const toTarget = {
      x: target.x - this.position.x,
      y: target.y - this.position.y,
      z: target.z - this.position.z
    };
    
    const distance = Math.sqrt(toTarget.x ** 2 + toTarget.y ** 2 + toTarget.z ** 2);
    if (distance === 0) return false;
    
    // Normalize target direction
    toTarget.x /= distance;
    toTarget.y /= distance;
    toTarget.z /= distance;
    
    // Calculate ship's forward direction based on rotation
    const forward = {
      x: Math.sin(this.rotation.y),
      y: 0,
      z: Math.cos(this.rotation.y)
    };
    
    // Calculate dot product (cosine of angle between directions)
    const dotProduct = forward.x * toTarget.x + forward.y * toTarget.y + forward.z * toTarget.z;
    
    // Check if within firing cone (head-on only = cos(15°) ≈ 0.966)
    const facingThreshold = 0.966; // 15 degree cone (head-on only)
    return dotProduct >= facingThreshold;
  }
  
  fire(playerPosition, gameTime) {
    if (!this.canFire(gameTime)) return null;
    
    const direction = {
      x: playerPosition.x - this.position.x,
      y: playerPosition.y - this.position.y,
      z: playerPosition.z - this.position.z
    };
    
    const distance = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    if (distance === 0) return null;
    
    // Normalize
    direction.x /= distance;
    direction.y /= distance;
    direction.z /= distance;
    
    this.weapon.lastFireTime = gameTime;
    
    // Calculate missile spawn position from the front of the ship
    const forwardOffset = 2; // Distance in front of ship
    const forward = {
      x: Math.sin(this.rotation.y),
      y: 0,
      z: Math.cos(this.rotation.y)
    };
    
    const spawnPosition = {
      x: this.position.x + forward.x * forwardOffset,
      y: this.position.y + forward.y * forwardOffset,
      z: this.position.z + forward.z * forwardOffset
    };
    
    // Return missile data
    return {
      id: `enemy-missile-${this.id}-${gameTime}`,
      position: spawnPosition,
      velocity: {
        x: direction.x * this.weapon.velocity,
        y: direction.y * this.weapon.velocity,
        z: direction.z * this.weapon.velocity
      },
      type: 'alien',
      weaponType: this.weapon.type,
      damage: this.weapon.damage,
      color: this.weapon.color,
      size: 0.2
    };
  }
  
  getDistanceTo(target) {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dz = target.z - this.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  takeDamage(amount) {
    if (this.isInvulnerable) return false;
    
    this.health -= amount;
    return this.health <= 0;
  }
}