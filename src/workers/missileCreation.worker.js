// Web Worker for Missile Creation
// Handles expensive missile creation calculations in parallel

/* eslint-env worker */
/* global self */
/* eslint no-restricted-globals: ["error", "event", "fdescribe"] */

class MissileCreationWorker {
  constructor() {
    this.pendingCreations = new Map();
  }

  createMissiles(creationData) {
    const {
      weaponType,
      playerPosition,
      playerRotation,
      playerPowerUps,
      weapons,
      timestamp,
      isMultishot
    } = creationData;

    const results = {
      missiles: [],
      timestamp,
      processingTime: 0
    };

    const startTime = performance.now();

    try {
      if (isMultishot) {
        // Create multishot spread
        results.missiles = this.createMultishotMissiles(creationData);
      } else {
        // Create single missile
        const missile = this.createSingleMissile(creationData);
        if (missile) {
          results.missiles = [missile];
        }
      }
    } catch (error) {
      console.error('[MISSILE WORKER] Creation error:', error);
      results.missiles = [];
    }

    results.processingTime = performance.now() - startTime;
    return results;
  }

  createSingleMissile(creationData) {
    const {
      weaponType,
      playerPosition,
      playerRotation,
      playerPowerUps,
      weapons,
      timestamp,
      offsetX = 0,
      chargeLevel = 1
    } = creationData;

    // Validate inputs
    if (!playerPosition || !playerRotation) {
      return null;
    }

    // Calculate spawn position with rotation
    const spawnOffset = this.calculateSpawnOffset(playerRotation, offsetX);
    const finalPosition = {
      x: playerPosition.x + spawnOffset.x,
      y: playerPosition.y + spawnOffset.y,
      z: playerPosition.z + spawnOffset.z
    };

    // Calculate velocity direction
    const velocityDirection = this.calculateVelocityDirection(playerRotation, creationData.cursorAiming, creationData.cursorWorld);

    // Get weapon properties
    const weaponProps = this.getWeaponProperties(weaponType, weapons, playerPowerUps, chargeLevel);

    return {
      id: `${weaponType}-${timestamp}-${offsetX}`,
      position: finalPosition,
      rotation: { ...playerRotation },
      velocity: velocityDirection,
      type: 'player',
      weaponType,
      weaponLevel: weaponProps.level,
      damage: weaponProps.damage,
      size: weaponProps.size,
      color: weaponProps.color,
      homing: weaponProps.homing,
      isBomb: weaponProps.isBomb,
      explosionRadius: weaponProps.explosionRadius,
      explosionDamage: weaponProps.explosionDamage,
      explosionDelay: weaponProps.explosionDelay
    };
  }

  createMultishotMissiles(creationData) {
    const { weaponType } = creationData;
    const missiles = [];

    // Determine spread
    let spread = 1.2; // Default spread
    switch (weaponType) {
      case 'laser': spread = 0.8; break;
      case 'chaingun': spread = 1.5; break;
      case 'bfg': spread = 2.0; break;
      case 'rocket': spread = 1.0; break;
      case 'charge': spread = 2.0; break;
      case 'railgun': spread = 0.6; break;
      default: spread = 1.2;
    }

    // Create 3 missiles in spread
    for (let i = -1; i <= 1; i++) {
      const missileData = {
        ...creationData,
        offsetX: i * spread
      };
      const missile = this.createSingleMissile(missileData);
      if (missile) {
        missiles.push(missile);
      }
    }

    return missiles;
  }

  calculateSpawnOffset(playerRotation, offsetX) {
    // Create rotation matrix
    const cos_x = Math.cos(playerRotation.x);
    const sin_x = Math.sin(playerRotation.x);
    const cos_y = Math.cos(playerRotation.y);
    const sin_y = Math.sin(playerRotation.y);
    const cos_z = Math.cos(playerRotation.z);
    const sin_z = Math.sin(playerRotation.z);

    // Local offset (forward + side offset)
    const localOffset = { x: offsetX, y: 0, z: -3 };

    // Apply rotation matrix
    return {
      x: localOffset.x * cos_y * cos_z - localOffset.y * cos_y * sin_z + localOffset.z * sin_y,
      y: localOffset.x * (sin_x * sin_y * cos_z + cos_x * sin_z) + localOffset.y * (-sin_x * sin_y * sin_z + cos_x * cos_z) - localOffset.z * sin_x * cos_y,
      z: localOffset.x * (-cos_x * sin_y * cos_z + sin_x * sin_z) + localOffset.y * (cos_x * sin_y * sin_z + sin_x * cos_z) + localOffset.z * cos_x * cos_y
    };
  }

  calculateVelocityDirection(playerRotation, cursorAiming, cursorWorld) {
    if (cursorAiming && cursorWorld) {
      // Use cursor direction
      const magnitude = Math.sqrt(cursorWorld.x * cursorWorld.x + cursorWorld.y * cursorWorld.y + cursorWorld.z * cursorWorld.z);
      return {
        x: cursorWorld.x / magnitude,
        y: cursorWorld.y / magnitude,
        z: cursorWorld.z / magnitude
      };
    } else {
      // Use ship direction
      const cos_x = Math.cos(playerRotation.x);
      const sin_x = Math.sin(playerRotation.x);
      const cos_y = Math.cos(playerRotation.y);
      const sin_y = Math.sin(playerRotation.y);

      return {
        x: sin_y,
        y: -sin_x * cos_y,
        z: -cos_x * cos_y
      };
    }
  }

  getChargeColor(level) {
    switch (level) {
      case 1: return '#0080ff'; // Blue
      case 2: return '#00ff80'; // Green  
      case 3: return '#80ff00'; // Yellow-green
      case 4: return '#ffff00'; // Yellow
      case 5: return '#ff8000'; // Orange
      default: return '#ffffff'; // White
    }
  }

  getWeaponProperties(weaponType, weapons, playerPowerUps, chargeLevel = 1) {
    const baseWeaponLevel = weapons[weaponType]?.level || 1;
    const weaponLevel = baseWeaponLevel + (playerPowerUps.weaponBoost ? 1 : 0);

    const props = {
      level: weaponLevel,
      damage: 1,
      size: 0.2,
      color: '#00ffff',
      homing: false,
      isBomb: false
    };

    switch (weaponType) {
      case 'default':
        props.color = '#00ffff';
        props.size = 0.2;
        break;
      case 'laser':
        props.color = '#ff0000';
        props.size = 0.15;
        break;
      case 'chaingun':
        props.color = '#ffff00';
        props.size = 0.1;
        break;
      case 'bfg':
        props.color = '#00ff00';
        props.size = 1.0;
        break;
      case 'rocket':
        props.color = '#ff8800';
        props.size = 0.3;
        props.homing = playerPowerUps.homingWeapons;
        break;
      case 'charge':
        props.damage = chargeLevel;
        props.size = 0.3 + (chargeLevel * 0.2);
        props.color = this.getChargeColor(chargeLevel);
        break;
      case 'railgun':
        props.color = '#8800ff';
        props.size = 0.25;
        break;
      case 'bomb':
        props.color = '#ff4400';
        props.size = 0.4;
        props.isBomb = true;
        props.explosionRadius = 25;
        props.explosionDamage = 50;
        props.explosionDelay = 3000;
        break;
    }

    return props;
  }
}

const creationWorker = new MissileCreationWorker();

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'createMissiles':
      const results = creationWorker.createMissiles(data);
      
      self.postMessage({
        type: 'missilesCreated',
        results: results,
        timestamp: data.timestamp
      });
      break;
  }
};

// Handle errors
self.onerror = function(error) {
  console.error('Missile Creation Worker Error:', error);
};