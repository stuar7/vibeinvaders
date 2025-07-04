// Missile Buffer System - Zero-copy missile data management using Transferable ArrayBuffers
// Implements Structure-of-Arrays (SOA) layout for optimal cache performance

// Buffer layout constants (must match worker)
const MISSILE_FLOAT_FIELDS = 14; // Added 3 for RGB color
const MISSILE_INT_FIELDS = 5;
const MISSILE_STRIDE = (MISSILE_FLOAT_FIELDS * 4) + (MISSILE_INT_FIELDS * 4); // 76 bytes per missile

// Field offsets in bytes
const OFFSET_X = 0;
const OFFSET_Y = 4;
const OFFSET_Z = 8;
const OFFSET_VX = 12;
const OFFSET_VY = 16;
const OFFSET_VZ = 20;
const OFFSET_SIZE = 24;
const OFFSET_DAMAGE = 28;
const OFFSET_HOMING_TARGET = 32;
const OFFSET_ROTATION_X = 36;
const OFFSET_ROTATION_Y = 40;
const OFFSET_COLOR_R = 44;
const OFFSET_COLOR_G = 48;
const OFFSET_COLOR_B = 52;
const OFFSET_ID = 56;
const OFFSET_WEAPON_TYPE = 60;
const OFFSET_TYPE = 64;
const OFFSET_ACTIVE = 68;
const OFFSET_FLAGS = 72;

// Weapon type enums
export const WEAPON_TYPES = {
  'default': 0,
  'laser': 1,
  'chaingun': 2,
  'bfg': 3,
  'rocket': 4,
  'charge': 5,
  'railgun': 6,
  'bomb': 7
};

// Reverse lookup for weapon types
const WEAPON_TYPE_NAMES = Object.fromEntries(
  Object.entries(WEAPON_TYPES).map(([k, v]) => [v, k])
);

// Missile type enums
export const MISSILE_TYPES = {
  'player': 0,
  'alien': 1,
  'wingman': 2
};

// Flag bits
export const FLAG_HOMING = 1 << 0;
export const FLAG_PIERCING = 1 << 1;
export const FLAG_EXPLODED = 1 << 2;
export const FLAG_DEPLOYED = 1 << 3;

class MissileBufferSystem {
  constructor(maxMissiles = 1000) {
    this.maxMissiles = maxMissiles;
    this.missileCount = 0;
    
    // Ping-pong buffers for zero-copy transfer
    this.bufferA = new ArrayBuffer(maxMissiles * MISSILE_STRIDE);
    this.bufferB = new ArrayBuffer(maxMissiles * MISSILE_STRIDE);
    this.currentBuffer = this.bufferA;
    this.otherBuffer = this.bufferB;
    
    // Views into the current buffer
    this.floatView = new Float32Array(this.currentBuffer);
    this.intView = new Int32Array(this.currentBuffer);
    
    // Free list for O(1) allocation
    this.freeIndices = [];
    for (let i = maxMissiles - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }
    
    // ID generation
    this.nextId = 1;
    
    // Mapping from missile ID to buffer index
    this.idToIndex = new Map();
    
    console.log(`[MissileBufferSystem] Initialized with ${maxMissiles} missile capacity`);
  }

  // Swap buffers after worker returns
  swapBuffers(returnedBuffer) {
    this.currentBuffer = returnedBuffer;
    this.otherBuffer = (returnedBuffer === this.bufferA) ? this.bufferB : this.bufferA;
    
    // Update views
    this.floatView = new Float32Array(this.currentBuffer);
    this.intView = new Int32Array(this.currentBuffer);
  }

  // Get buffer for transfer to worker
  getTransferBuffer() {
    // Copy data to other buffer before transfer
    const source = new Uint8Array(this.currentBuffer);
    const dest = new Uint8Array(this.otherBuffer);
    dest.set(source);
    
    // Swap to use the copy
    const temp = this.currentBuffer;
    this.currentBuffer = this.otherBuffer;
    this.otherBuffer = temp;
    
    // Update views to point to current buffer
    this.floatView = new Float32Array(this.currentBuffer);
    this.intView = new Int32Array(this.currentBuffer);
    
    // Return the other buffer for transfer
    return this.otherBuffer;
  }

  // Allocate a missile slot
  allocate(missileData) {
    if (this.freeIndices.length === 0) {
      console.warn('[MissileBufferSystem] Buffer full!');
      return -1;
    }
    
    const index = this.freeIndices.pop();
    // Use existing ID if provided, otherwise generate new one
    const id = missileData.id || `buffer-${this.nextId++}`;
    
    // Convert string IDs to numeric hash for buffer storage
    const numericId = typeof id === 'string' ? this.hashStringId(id) : id;
    
    // Write missile data to buffer
    const offset = index * MISSILE_STRIDE / 4; // Float32 array offset
    const intOffset = offset;
    
    // Position
    this.floatView[offset + OFFSET_X / 4] = missileData.position.x;
    this.floatView[offset + OFFSET_Y / 4] = missileData.position.y;
    this.floatView[offset + OFFSET_Z / 4] = missileData.position.z;
    
    // Velocity
    this.floatView[offset + OFFSET_VX / 4] = missileData.velocity.x;
    this.floatView[offset + OFFSET_VY / 4] = missileData.velocity.y;
    this.floatView[offset + OFFSET_VZ / 4] = missileData.velocity.z;
    
    // Size and damage
    this.floatView[offset + OFFSET_SIZE / 4] = missileData.size || 0.3;
    this.floatView[offset + OFFSET_DAMAGE / 4] = missileData.damage || 1;
    
    // Rotation if provided
    if (missileData.rotation) {
      this.floatView[offset + OFFSET_ROTATION_X / 4] = missileData.rotation.x;
      this.floatView[offset + OFFSET_ROTATION_Y / 4] = missileData.rotation.y;
    }
    
    // Color (convert hex to RGB)
    let r = 1, g = 1, b = 1;
    if (missileData.color) {
      const hex = missileData.color.replace('#', '');
      r = parseInt(hex.substr(0, 2), 16) / 255;
      g = parseInt(hex.substr(2, 2), 16) / 255;
      b = parseInt(hex.substr(4, 2), 16) / 255;
    }
    this.floatView[offset + OFFSET_COLOR_R / 4] = r;
    this.floatView[offset + OFFSET_COLOR_G / 4] = g;
    this.floatView[offset + OFFSET_COLOR_B / 4] = b;
    
    // Integer fields
    this.intView[intOffset + OFFSET_ID / 4] = numericId;
    this.intView[intOffset + OFFSET_WEAPON_TYPE / 4] = WEAPON_TYPES[missileData.weaponType] || 0;
    this.intView[intOffset + OFFSET_TYPE / 4] = MISSILE_TYPES[missileData.type] || 0;
    this.intView[intOffset + OFFSET_ACTIVE / 4] = 1;
    
    // Flags
    let flags = 0;
    if (missileData.homing) flags |= FLAG_HOMING;
    if (missileData.piercing) flags |= FLAG_PIERCING;
    if (missileData.isDeployed) flags |= FLAG_DEPLOYED;
    this.intView[intOffset + OFFSET_FLAGS / 4] = flags;
    
    // Update tracking
    this.idToIndex.set(id, index);
    this.missileCount++;
    
    return id;
  }

  // Deallocate a missile slot
  deallocate(id) {
    const index = this.idToIndex.get(id);
    if (index === undefined) return false;
    
    // Mark as inactive
    const intOffset = index * MISSILE_STRIDE / 4;
    this.intView[intOffset + OFFSET_ACTIVE / 4] = 0;
    
    // Return to free list
    this.freeIndices.push(index);
    this.idToIndex.delete(id);
    this.missileCount--;
    
    return true;
  }

  // Read missile data by ID
  getMissileById(id) {
    const index = this.idToIndex.get(id);
    if (index === undefined) return null;
    
    const offset = index * MISSILE_STRIDE / 4;
    const intOffset = offset;
    
    const weaponType = this.intView[intOffset + OFFSET_WEAPON_TYPE / 4];
    const type = this.intView[intOffset + OFFSET_TYPE / 4];
    const flags = this.intView[intOffset + OFFSET_FLAGS / 4];
    
    return {
      id: id,
      position: {
        x: this.floatView[offset + OFFSET_X / 4],
        y: this.floatView[offset + OFFSET_Y / 4],
        z: this.floatView[offset + OFFSET_Z / 4]
      },
      velocity: {
        x: this.floatView[offset + OFFSET_VX / 4],
        y: this.floatView[offset + OFFSET_VY / 4],
        z: this.floatView[offset + OFFSET_VZ / 4]
      },
      rotation: {
        x: this.floatView[offset + OFFSET_ROTATION_X / 4],
        y: this.floatView[offset + OFFSET_ROTATION_Y / 4],
        z: 0
      },
      size: this.floatView[offset + OFFSET_SIZE / 4],
      damage: this.floatView[offset + OFFSET_DAMAGE / 4],
      color: this.rgbToHex(
        this.floatView[offset + OFFSET_COLOR_R / 4],
        this.floatView[offset + OFFSET_COLOR_G / 4],
        this.floatView[offset + OFFSET_COLOR_B / 4]
      ),
      weaponType: WEAPON_TYPE_NAMES[weaponType] || 'default',
      type: type === 0 ? 'player' : (type === 1 ? 'alien' : 'wingman'),
      active: this.intView[intOffset + OFFSET_ACTIVE / 4] === 1,
      homing: (flags & FLAG_HOMING) !== 0,
      piercing: (flags & FLAG_PIERCING) !== 0,
      hasExploded: (flags & FLAG_EXPLODED) !== 0,
      isDeployed: (flags & FLAG_DEPLOYED) !== 0
    };
  }

  // Get all active missiles (for store compatibility)
  getAllActiveMissiles() {
    const missiles = [];
    
    for (const [id, index] of this.idToIndex) {
      const intOffset = index * MISSILE_STRIDE / 4;
      if (this.intView[intOffset + OFFSET_ACTIVE / 4] === 1) {
        missiles.push(this.getMissileById(id));
      }
    }
    
    return missiles;
  }

  // Update missile position by ID
  updatePosition(id, x, y, z) {
    const index = this.idToIndex.get(id);
    if (index === undefined) return false;
    
    const offset = index * MISSILE_STRIDE / 4;
    this.floatView[offset + OFFSET_X / 4] = x;
    this.floatView[offset + OFFSET_Y / 4] = y;
    this.floatView[offset + OFFSET_Z / 4] = z;
    
    return true;
  }

  // Batch update positions from mesh pool
  updatePositionsFromMeshes(meshMap) {
    meshMap.forEach((mesh, missileId) => {
      if (mesh.userData.missileData) {
        this.updatePosition(
          missileId,
          mesh.position.x,
          mesh.position.y,
          mesh.position.z
        );
      }
    });
  }

  // Get buffer stats
  getStats() {
    return {
      capacity: this.maxMissiles,
      active: this.missileCount,
      free: this.freeIndices.length,
      bufferSize: (this.maxMissiles * MISSILE_STRIDE / 1024).toFixed(1) + 'KB',
      utilizationRate: ((this.missileCount / this.maxMissiles) * 100).toFixed(1) + '%'
    };
  }

  // Helper to convert RGB to hex
  rgbToHex(r, g, b) {
    const toHex = (n) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }
  
  // Helper to hash string IDs to numbers
  hashStringId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Clear all missiles
  clear() {
    this.missileCount = 0;
    this.idToIndex.clear();
    this.freeIndices = [];
    for (let i = this.maxMissiles - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }
    
    // Clear buffer
    this.floatView.fill(0);
    this.intView.fill(0);
  }
}

// Singleton instance
const missileBufferSystem = new MissileBufferSystem(1000);

export default missileBufferSystem;