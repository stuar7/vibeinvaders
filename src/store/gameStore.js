import { create } from 'zustand';
import weaponMeshPool from '../systems/WeaponMeshPool2';
import entityPool from '../systems/EntityPool';

const initialState = {
  gameState: 'startup',
  showMenu: true, // Show main menu on startup
  gameMode: 'campaign', // 'campaign' or 'freeflight'
  score: 0,
  lives: 3,
  level: 1,
  difficulty: 'normal',
  showHelp: false,
  isPaused: false,
  gameStartTime: null,
  elapsedTime: 0,
  playerPosition: { x: 0, y: 12, z: 0 }, // Moved up 20 units (from -8 to 12)
  playerVelocity: { x: 0, y: 0, z: 0 }, // Star Fox 64-style momentum
  playerRotation: { x: 0, y: 0, z: 0 }, // Ship rotation for missile alignment
  playerRotationalVelocity: { x: 0, y: 0, z: 0 }, // Angular velocity for Q/E rotation tracking
  playerShipComponents: {
    body: { maxHp: 3, hp: 3, destroyed: false },
    nose: { maxHp: 3, hp: 3, destroyed: false },
    leftWing: { maxHp: 2, hp: 2, destroyed: false },
    rightWing: { maxHp: 2, hp: 2, destroyed: false }
  },
  playerShipStatus: {
    erraticMovement: false,
    turningSpeedMultiplier: 1.0
  },
  aliens: [],
  missiles: [],
  powerUps: [],
  effects: [],
  asteroids: [],
  wingmen: [],
  debris: [], // Ship debris from destroyed aliens
  playerPowerUps: {
    shield: false,
    rapidFire: false,
    multiShot: false,
    slowTime: false,
    speedBoost: false,
    weaponBoost: false,
    responsiveness: false,
    homingWeapons: false,
    stealth: false,
  },
  shieldLevel: 0, // Number of shield hits that can be absorbed
  powerUpTimers: {
    rapidFire: null,
    multiShot: null,
    slowTime: null,
    weaponBoost: null,
    responsiveness: null,
    homingWeapons: null,
    stealth: null,
  },
  playerSpeed: 1.0, // Base speed multiplier
  isBraking: false, // Whether B key is held for brake
  isBoosting: false, // Whether Q key is held for boost
  isShiftBoosting: false, // Whether Shift key is held for free flight boost
  shiftBoostCooldown: 0, // Timestamp when shift boost was released (for shooting delay)
  weapons: {
    current: 'default',
    default: { type: 'default', ammo: Infinity, maxAmmo: Infinity, level: 1 },
    laser: { type: 'laser', ammo: 100, maxAmmo: 100, level: 1 },
    chaingun: { type: 'chaingun', ammo: 2500, maxAmmo: 2500, level: 1 },
    bfg: { type: 'bfg', ammo: 3, maxAmmo: 3, level: 1 },
    rocket: { type: 'rocket', ammo: 20, maxAmmo: 20, level: 1 },
    charge: { type: 'charge', ammo: Infinity, maxAmmo: Infinity, level: 1 },
    bomb: { type: 'bomb', ammo: 5, maxAmmo: 5, level: 1 },
    railgun: { type: 'railgun', ammo: 8, maxAmmo: 8, level: 1 },
  },
  chargeWeapon: {
    isCharging: false,
    chargeLevel: 0,
    maxCharge: 5,
    chargeStartTime: 0,
  },
  defensiveSystems: {
    shield: { level: 1, efficiency: 100, status: 'active' },
    armor: { level: 1, integrity: 75, thickness: 'medium' },
    evasion: { level: 1, agility: 75, responsiveness: 'normal' },
    countermeasures: { level: 1, charges: 3, maxCharges: 5 },
    battery: { level: 1, charge: 100, maxCharge: 100, status: 'charged' },
    cooler: { level: 1, temperature: 50, maxTemp: 100, efficiency: 'optimal' },
  },
  highScore: 0,
  debug: {
    showGamespaceBounds: false,
    showDebugElements: true,
    showCollisionCircles: false,
    showBlasterCollisions: false,
    showPerformanceMonitor: false,
    showEntities: false,
  },
  
  // Performance settings
  useWebWorkerAI: true, // Toggle Web Worker AI vs traditional AI
  cursorAiming: false,
  freeLookMode: false,
  firstPersonMode: false, // Cockpit view for perfect auto-fire alignment
  uiInteractionMode: false, // Pause flight controls for UI interaction (F key in free flight)
  highlightedAlienId: null,
  virtualJoystick: { x: 0, y: 0 }, // For free flight mode mouse position display
  
  // Options/Settings
  options: {
    mouseSensitivity: 1.04, // Current sensitivity value
    invertedMouse: false, // Y-axis inversion
    fov: 75, // Default field of view
    debugPreferences: {
      showGamespaceBounds: false,
      showDebugElements: true,
      showCollisionCircles: false,
      showBlasterCollisions: false,
      showPerformanceMonitor: false,
      showEntities: false,
    },
  },
  
  // Zoom state
  isZoomed: false, // Z key zoom toggle
  zoomFOV: 50, // Target FOV when zoomed
  
  // Advanced targeting state  
  targetingEnabled: false,
  targetingMode: 'blue', // 'blue', 'yellow', 'cyan' - Blue is default
  selectedTarget: null,
  targetLock: false,
  targetPrediction: null, // Prediction data for UI display
  
  // Hit indicator for crosshair
  hitIndicator: {
    active: false,
    timestamp: 0
  },
  
  // Targeting validation results
  validationResults: null,
  
  // Live targeting statistics
  liveTargetingStats: {
    enabled: false,
    currentTarget: null,
    shotHistory: [], // Array of {timestamp, targetName, distance, hit, closestDistance, targetId}
    sessionStats: {
      shots: 0,
      hits: 0,
      totalDistance: 0,
      avgDistance: 0,
      totalClosestDistance: 0,
      avgClosestDistance: 0
    }
  },
  
  // Auto-fire targeting system
  autoFireTargeting: {
    enabled: false,
    alignmentThreshold: 2.0, // Distance threshold for crosshair alignment (in world units) - increased for easier alignment
    fireDelay: 0.1, // Delay between auto-fire shots in seconds
    lastFireTime: 0,
    alignmentHistory: [], // Track alignment over time for stability
    stabilityRequired: 3, // Number of consecutive aligned frames before firing
    // Debug information
    debug: {
      currentAlignment: 0,
      isAligned: false,
      alignmentProgress: 0,
      stabilityProgress: 0
    }
  },
  
  // Performance monitoring
  performance: {
    frameTime: 0,
    frameRate: 0,
    renderTime: 0,
    componentTimes: {},
    memoryUsage: 0,
    triangleCount: 0,
    lastUpdate: Date.now(),
    frameTimeHistory: [],
    maxFrameTime: 0,
    avgFrameTime: 0,
    spikes: [],
    gcEvents: 0,
    lastGCTime: 0,
  },
  
  // Async asset loading
  asyncAssetsLoaded: false
};

export const useGameStore = create((set, get) => ({
  ...initialState,
  
  setGameState: (gameState) => set({ gameState }),
  
  // Menu and game mode actions
  setShowMenu: (showMenu) => set({ showMenu }),
  setGameMode: (gameMode) => {
    console.log(`[STORE] Setting game mode to: ${gameMode}`);
    set({ 
      gameMode,
      // Enable freeLookMode by default when starting free flight mode
      freeLookMode: gameMode === 'freeflight' ? true : false
    });
  },
  returnToMenu: () => set({ 
    showMenu: true, 
    gameState: 'startup',
    gameStartTime: null 
  }),
  
  setScore: (score) => set((state) => ({
    score,
    highScore: Math.max(score, state.highScore),
  })),
  
  addScore: (points) => set((state) => ({
    score: state.score + points,
    highScore: Math.max(state.score + points, state.highScore),
  })),
  
  setLives: (lives) => set({ lives }),
  
  loseLife: () => set((state) => ({
    lives: Math.max(0, state.lives - 1),
    gameState: state.lives <= 1 ? 'gameOver' : state.gameState,
  })),
  
  setLevel: (level) => set({ level }),
  
  nextLevel: () => set((state) => ({
    level: state.level + 1,
    gameState: state.level >= 3 ? 'gameWon' : 'levelComplete',
  })),
  
  setDifficulty: (difficulty) => set({ difficulty }),
  
  toggleHelp: () => set((state) => ({ showHelp: !state.showHelp })),
  
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  
  setPlayerPosition: (position) => set({ playerPosition: position }),
  setPlayerRotation: (rotation) => set({ playerRotation: rotation }),
  setPlayerRotationalVelocity: (rotVelocity) => set({ playerRotationalVelocity: rotVelocity }),
  
  updatePlayerVelocity: (velX, velY, velZ = 0) => set((state) => ({
    playerVelocity: { x: velX, y: velY, z: velZ }
  })),
  
  startGameTimer: () => set({ 
    gameStartTime: Date.now(),
    elapsedTime: 0 
  }),
  
  updateGameTimer: () => set((state) => ({
    elapsedTime: state.gameStartTime ? Date.now() - state.gameStartTime : 0
  })),

  setAsyncAssetsLoaded: (loaded) => set({ asyncAssetsLoaded: loaded }),

  movePlayer: (deltaX, deltaY = 0, deltaZ = 0) => set((state) => {
    const currentPosition = state.playerPosition;
    const newPosition = {
      x: currentPosition.x + deltaX,
      y: currentPosition.y + deltaY,
      z: (currentPosition.z || 0) + deltaZ
    };
    
    return {
      playerPosition: newPosition
    };
  }),
  
  addAlien: (alien) => set((state) => ({
    aliens: [...state.aliens, alien],
  })),
  
  removeAlien: (id) => set((state) => {
    // Find the alien being removed
    const alienToRemove = state.aliens.find((alien) => alien.id === id);
    
    let newDebris = [...state.debris];
    
    // Create debris if alien exists
    if (alienToRemove) {
      const debrisComponents = [];
      const baseId = `debris-${alienToRemove.id}-${Date.now()}`;
      const explosionForce = 8 + Math.random() * 12; // 8-20 units/sec
      
      // Determine component types based on alien type
      const componentTypes = alienToRemove.type === 5 ? 
        ['saucerDisc', 'saucerDome', 'saucerHull', 'saucerEngine'] :
        ['fuselage', 'nose', 'leftWing', 'rightWing'];
      
      // Get alien color
      const alienColor = (() => {
        switch (alienToRemove.type) {
          case 1: return '#ff0000';
          case 2: return '#0080ff';
          case 3: return '#00ff00';
          case 4: return '#ff00ff';
          case 5: return '#888888';
          default: return '#ffffff';
        }
      })();
      
      componentTypes.forEach((componentType, index) => {
        // Calculate explosion direction (outward from center)
        const angle = (index / componentTypes.length) * Math.PI * 2;
        const explosionDirection = {
          x: Math.cos(angle) + (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.8,
          z: (Math.random() - 0.5) * 0.3
        };
        
        // Normalize and apply force
        const magnitude = Math.sqrt(
          explosionDirection.x * explosionDirection.x +
          explosionDirection.y * explosionDirection.y +
          explosionDirection.z * explosionDirection.z
        );
        
        const normalizedDirection = {
          x: explosionDirection.x / magnitude,
          y: explosionDirection.y / magnitude,
          z: explosionDirection.z / magnitude
        };
        
        // Get HP for this component from ship components if available
        const getComponentHP = () => {
          if (alienToRemove.shipComponents) {
            // Map component types to ship component names
            const componentMap = {
              'fuselage': 'body',
              'nose': 'nose',
              'leftWing': 'leftWing',
              'rightWing': 'rightWing',
              'saucerDisc': 'body',
              'saucerDome': 'nose',
              'saucerHull': 'leftWing', // Map to leftWing for consistency
              'saucerEngine': 'rightWing' // Map to rightWing for consistency
            };
            
            const shipComponentName = componentMap[componentType];
            if (shipComponentName && alienToRemove.shipComponents[shipComponentName]) {
              return alienToRemove.shipComponents[shipComponentName].hp || 1;
            }
          }
          // Default HP if no ship components
          return 1;
        };
        
        const debris = {
          id: `${baseId}-${index}`,
          componentType: componentType,
          originalColor: alienColor,
          position: { ...alienToRemove.position },
          velocity: {
            x: normalizedDirection.x * explosionForce,
            y: normalizedDirection.y * explosionForce,
            z: normalizedDirection.z * explosionForce + (alienToRemove.velocity?.z || 0)
          },
          rotationSpeed: {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10,
            z: (Math.random() - 0.5) * 10
          },
          lifetime: 3 + Math.random() * 2, // 3-5 seconds
          spawnTime: Date.now(),
          hp: getComponentHP(), // Add HP based on component that was destroyed
          maxHp: getComponentHP(), // Store original HP
          exploded: false // Track if already exploded
        };
        
        debrisComponents.push(debris);
      });
      
      newDebris = [...state.debris, ...debrisComponents];
    }
    
    return {
      aliens: state.aliens.filter((alien) => alien.id !== id),
      debris: newDebris
    };
  }),
  
  updateAliens: (aliens) => set({ aliens }),
  
  addMissile: (missile) => set((state) => {
    let newMissiles = [...state.missiles, missile];
    
    // FIFO culling: Remove oldest missiles when exceeding 100 entities
    if (newMissiles.length > 100) {
      const excessCount = newMissiles.length - 100;
      const culledMissiles = newMissiles.slice(0, excessCount); // Get missiles being removed
      
      // Release culled missiles from weapon pool
      culledMissiles.forEach(missile => {
        if (['rocket', 'bfg', 'bomb', 'railgun'].includes(missile.weaponType)) {
          weaponMeshPool.release(missile.id);
        }
      });
      
      console.log(`[MISSILE CULLING] Removing ${excessCount} oldest missiles (FIFO), keeping newest 100`);
      newMissiles = newMissiles.slice(excessCount); // Remove from beginning (oldest first)
    }
    
    return { missiles: newMissiles };
  }),
  
  // Optimized batch missile addition
  addMissilesBatch: (missiles) => set((state) => {
    let newMissiles = [...state.missiles, ...missiles];
    
    // FIFO culling: Remove oldest missiles when exceeding 100 entities
    if (newMissiles.length > 100) {
      const excessCount = newMissiles.length - 100;
      if (excessCount > 0) {
        const culledMissiles = newMissiles.slice(0, excessCount); // Get missiles being removed
        
        // Release culled missiles from weapon pool
        culledMissiles.forEach(missile => {
          if (['rocket', 'bfg', 'bomb', 'railgun'].includes(missile.weaponType)) {
            weaponMeshPool.release(missile.id);
          }
        });
        
        console.log(`[MISSILE CULLING] Removing ${excessCount} oldest missiles (FIFO), keeping newest 100`);
        newMissiles = newMissiles.slice(excessCount);
      }
    }
    
    return { missiles: newMissiles };
  }),
  
  removeMissile: (id) => set((state) => {
    // Release missile from weapon pool if it's using a pooled mesh
    const missile = state.missiles.find(m => m.id === id);
    if (missile && ['rocket', 'bfg', 'bomb', 'railgun'].includes(missile.weaponType)) {
      weaponMeshPool.release(id);
    }
    
    return {
      missiles: state.missiles.filter((missile) => missile.id !== id),
    };
  }),
  
  updateMissiles: (missiles) => set({ missiles }),
  
  addPowerUp: (powerUp) => set((state) => ({
    powerUps: [...state.powerUps, powerUp],
  })),
  
  removePowerUp: (id) => set((state) => ({
    powerUps: state.powerUps.filter((powerUp) => powerUp.id !== id),
  })),
  
  activatePowerUp: (type) => set((state) => {
    const newPowerUps = { ...state.playerPowerUps };
    const newTimers = { ...state.powerUpTimers };
    
    switch (type) {
      case 'shield':
        newPowerUps.shield = true;
        // Increase shield level (each pickup adds one hit absorption)
        const currentShieldLevel = state.shieldLevel;
        return { 
          playerPowerUps: newPowerUps, 
          powerUpTimers: newTimers,
          shieldLevel: currentShieldLevel + 1
        };
      case 'rapidFire':
        newPowerUps.rapidFire = true;
        newTimers.rapidFire = Date.now();
        break;
      case 'multiShot':
        newPowerUps.multiShot = true;
        newTimers.multiShot = Date.now();
        break;
      case 'slowTime':
        newPowerUps.slowTime = true;
        newTimers.slowTime = Date.now();
        break;
      case 'weaponBoost':
        newPowerUps.weaponBoost = true;
        newTimers.weaponBoost = Date.now();
        break;
      case 'responsiveness':
        newPowerUps.responsiveness = true;
        newTimers.responsiveness = Date.now();
        break;
      case 'stealth':
        newPowerUps.stealth = true;
        newTimers.stealth = Date.now();
        break;
      case 'extraLife':
        return { lives: state.lives + 1 };
      case 'wingmen':
        // Spawn two wingmen
        const now = Date.now();
        const wingman1 = {
          id: `wingman-${now}-1`,
          position: { x: state.playerPosition.x - 3, y: state.playerPosition.y, z: state.playerPosition.z },
          offset: { x: -3, y: 0 },
          lifetime: 20, // 20 seconds
          isLeaving: false,
        };
        const wingman2 = {
          id: `wingman-${now}-2`,
          position: { x: state.playerPosition.x + 3, y: state.playerPosition.y, z: state.playerPosition.z },
          offset: { x: 3, y: 0 },
          lifetime: 20, // 20 seconds
          isLeaving: false,
        };
        return { 
          wingmen: [...state.wingmen, wingman1, wingman2]
        };
      default:
        break;
    }
    
    return { playerPowerUps: newPowerUps, powerUpTimers: newTimers };
  }),
  
  deactivatePowerUp: (type) => set((state) => ({
    playerPowerUps: {
      ...state.playerPowerUps,
      [type]: false,
    },
    powerUpTimers: {
      ...state.powerUpTimers,
      [type]: null,
    },
  })),

  damageShield: () => set((state) => {
    const newShieldLevel = Math.max(0, state.shieldLevel - 1);
    const shieldStillActive = newShieldLevel > 0;
    
    return {
      shieldLevel: newShieldLevel,
      playerPowerUps: {
        ...state.playerPowerUps,
        shield: shieldStillActive
      }
    };
  }),

  damageArmor: (damage = 25) => set((state) => {
    const currentIntegrity = state.defensiveSystems.armor.integrity;
    const newIntegrity = Math.max(0, currentIntegrity - damage);
    
    return {
      defensiveSystems: {
        ...state.defensiveSystems,
        armor: {
          ...state.defensiveSystems.armor,
          integrity: newIntegrity,
          status: newIntegrity > 0 ? 'functional' : 'damaged'
        }
      }
    };
  }),

  damageShipComponent: (component, damage = 1) => set((state) => {
    const currentComponent = state.playerShipComponents[component];
    if (!currentComponent || currentComponent.destroyed) {
      return state; // Component already destroyed or doesn't exist
    }
    
    const newHp = Math.max(0, currentComponent.hp - damage);
    const isDestroyed = newHp === 0;
    
    const newComponents = {
      ...state.playerShipComponents,
      [component]: {
        ...currentComponent,
        hp: newHp,
        destroyed: isDestroyed
      }
    };
    
    // Check unified hull HP (based on lowest critical component)
    const unifiedHP = state.getUnifiedHP(newComponents);
    
    // Check if critical components (body or nose) are destroyed OR hull reaches 0
    const bodyDestroyed = newComponents.body.destroyed;
    const noseDestroyed = newComponents.nose.destroyed;
    const hullEmpty = unifiedHP.current <= 0;
    
    if (bodyDestroyed || noseDestroyed || hullEmpty) {
      // Player dies - unlock mouse and trigger game over
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
      document.body.style.cursor = 'auto';
      
      const newLives = state.lives - 1;
      const newGameState = newLives <= 0 ? 'gameOver' : 'playing';
      
      return {
        ...state,
        playerShipComponents: newComponents,
        lives: newLives,
        gameState: newGameState
      };
    }
    
    // Check if both wings are destroyed for erratic movement
    const leftWingDestroyed = newComponents.leftWing.destroyed;
    const rightWingDestroyed = newComponents.rightWing.destroyed;
    const bothWingsDestroyed = leftWingDestroyed && rightWingDestroyed;
    const anyWingDestroyed = leftWingDestroyed || rightWingDestroyed;
    
    const newShipStatus = {
      erraticMovement: anyWingDestroyed,
      turningSpeedMultiplier: anyWingDestroyed ? 0.5 : 1.0
    };
    
    return {
      ...state,
      playerShipComponents: newComponents,
      playerShipStatus: newShipStatus
    };
  }),

  repairShipComponent: (component, amount = 1) => set((state) => {
    const currentComponent = state.playerShipComponents[component];
    if (!currentComponent) {
      return state; // Component doesn't exist
    }
    
    const newHp = Math.min(currentComponent.maxHp, currentComponent.hp + amount);
    const isDestroyed = newHp === 0;
    
    const newComponents = {
      ...state.playerShipComponents,
      [component]: {
        ...currentComponent,
        hp: newHp,
        destroyed: isDestroyed
      }
    };
    
    // Update ship status based on wing state
    const leftWingDestroyed = newComponents.leftWing.destroyed;
    const rightWingDestroyed = newComponents.rightWing.destroyed;
    const anyWingDestroyed = leftWingDestroyed || rightWingDestroyed;
    
    const newShipStatus = {
      erraticMovement: anyWingDestroyed,
      turningSpeedMultiplier: anyWingDestroyed ? 0.5 : 1.0
    };
    
    return {
      ...state,
      playerShipComponents: newComponents,
      playerShipStatus: newShipStatus
    };
  }),

  resetShipComponents: () => set((state) => ({
    playerShipComponents: {
      body: { maxHp: 3, hp: 3, destroyed: false },
      nose: { maxHp: 3, hp: 3, destroyed: false },
      leftWing: { maxHp: 2, hp: 2, destroyed: false },
      rightWing: { maxHp: 2, hp: 2, destroyed: false }
    },
    playerShipStatus: {
      erraticMovement: false,
      turningSpeedMultiplier: 1.0
    }
  })),

  damageAlienShipComponent: (alienId, component, damage = 1) => set((state) => {
    const newAliens = state.aliens.map(alien => {
      if (alien.id !== alienId) return alien;
      
      if (!alien.shipComponents || !alien.shipComponents[component]) {
        return alien; // Component doesn't exist or alien doesn't have ship components
      }
      
      const currentComponent = alien.shipComponents[component];
      if (currentComponent.destroyed) {
        return alien; // Component already destroyed
      }
      
      const newHp = Math.max(0, currentComponent.hp - damage);
      const isDestroyed = newHp === 0;
      
      const newShipComponents = {
        ...alien.shipComponents,
        [component]: {
          ...currentComponent,
          hp: newHp,
          destroyed: isDestroyed
        }
      };
      
      // Check if critical components (body or nose) are destroyed
      const bodyDestroyed = newShipComponents.body.destroyed;
      const noseDestroyed = newShipComponents.nose.destroyed;
      
      if (bodyDestroyed || noseDestroyed) {
        // Alien dies - return null to be filtered out
        return null;
      }
      
      return {
        ...alien,
        shipComponents: newShipComponents
      };
    }).filter(alien => alien !== null); // Remove destroyed aliens
    
    return {
      ...state,
      aliens: newAliens
    };
  }),

  // Calculate unified HP based on lowest critical component (body/nose)
  getUnifiedHP: (shipComponents) => {
    if (!shipComponents || !shipComponents.body || !shipComponents.nose) {
      return { current: 0, max: 0 };
    }
    
    const bodyHp = shipComponents.body.hp;
    const noseHp = shipComponents.nose.hp;
    const bodyMaxHp = shipComponents.body.maxHp;
    const noseMaxHp = shipComponents.nose.maxHp;
    
    // Find the component with the lowest current HP
    const lowestCurrent = Math.min(bodyHp, noseHp);
    
    // Find the max HP of the component that has the lowest current HP
    const lowestMax = bodyHp <= noseHp ? bodyMaxHp : noseMaxHp;
    
    return { current: lowestCurrent, max: lowestMax };
  },

  // Get unified HP for player
  getPlayerUnifiedHP: () => {
    const state = useGameStore.getState();
    return state.getUnifiedHP(state.playerShipComponents);
  },

  // Get unified HP for an alien
  getAlienUnifiedHP: (alienId) => {
    const state = useGameStore.getState();
    const alien = state.aliens.find(a => a.id === alienId);
    if (!alien) return { current: 0, max: 0 };
    return state.getUnifiedHP(alien.shipComponents);
  },

  setPlayerSpeed: (speed) => set({ playerSpeed: speed }),

  toggleDebugGamespaceBounds: () => set((state) => {
    const newValue = !state.debug.showGamespaceBounds;
    return {
      debug: { ...state.debug, showGamespaceBounds: newValue },
      options: { ...state.options, debugPreferences: { ...state.options.debugPreferences, showGamespaceBounds: newValue } }
    };
  }),

  toggleDebugElements: () => set((state) => {
    const newValue = !state.debug.showDebugElements;
    return {
      debug: { ...state.debug, showDebugElements: newValue },
      options: { ...state.options, debugPreferences: { ...state.options.debugPreferences, showDebugElements: newValue } }
    };
  }),

  toggleDebugCollisionCircles: () => set((state) => {
    const newValue = !state.debug.showCollisionCircles;
    return {
      debug: { ...state.debug, showCollisionCircles: newValue },
      options: { ...state.options, debugPreferences: { ...state.options.debugPreferences, showCollisionCircles: newValue } }
    };
  }),

  toggleDebugBlasterCollisions: () => set((state) => {
    const newValue = !state.debug.showBlasterCollisions;
    return {
      debug: { ...state.debug, showBlasterCollisions: newValue },
      options: { ...state.options, debugPreferences: { ...state.options.debugPreferences, showBlasterCollisions: newValue } }
    };
  }),

  toggleDebugPerformanceMonitor: () => set((state) => {
    const newValue = !state.debug.showPerformanceMonitor;
    return {
      debug: { ...state.debug, showPerformanceMonitor: newValue },
      options: { ...state.options, debugPreferences: { ...state.options.debugPreferences, showPerformanceMonitor: newValue } }
    };
  }),

  toggleDebugEntities: () => set((state) => {
    const newValue = !state.debug.showEntities;
    return {
      debug: { ...state.debug, showEntities: newValue },
      options: { ...state.options, debugPreferences: { ...state.options.debugPreferences, showEntities: newValue } }
    };
  }),

  toggleCursorAiming: () => set((state) => ({
    cursorAiming: !state.cursorAiming
  })),

  toggleFreeLookMode: () => set((state) => ({
    freeLookMode: !state.freeLookMode
  })),

  toggleFirstPersonMode: () => set((state) => ({
    firstPersonMode: !state.firstPersonMode
  })),

  // UI Position Management
  resetUIPositions: () => {
    try {
      const uiPositionManager = require('../utils/uiPositions').default;
      uiPositionManager.resetPositions();
      // Trigger UI update
      window.dispatchEvent(new CustomEvent('ui-positions-reset'));
    } catch (error) {
      console.warn('Failed to reset UI positions:', error);
    }
  },

  // Toggle cursor control without changing game mode
  toggleCursorControl: () => set((state) => {
    if (state.gameMode === 'freeflight') {
      // In free flight mode, F key toggles UI interaction mode
      // This releases pointer lock and pauses flight controls
      const newUiMode = !state.uiInteractionMode;
      if (newUiMode) {
        // Release pointer lock when entering UI mode
        if (document.exitPointerLock) {
          document.exitPointerLock();
        }
        document.body.style.cursor = 'auto';
      }
      return { uiInteractionMode: newUiMode };
    } else {
      // In campaign mode, F key toggles cursor aiming
      return { cursorAiming: !state.cursorAiming };
    }
  }),

  setBraking: (isBraking) => set({ isBraking }),
  setBoosting: (isBoosting) => set({ isBoosting }),
  setShiftBoosting: (isShiftBoosting) => set({ isShiftBoosting }),
  setShiftBoostCooldown: (timestamp) => set({ shiftBoostCooldown: timestamp }),

  setHighlightedAlien: (alienId) => set({ highlightedAlienId: alienId }),
  
  setVirtualJoystick: (position) => set({ virtualJoystick: position }),
  
  addEffect: (effect) => set((state) => ({
    effects: [...state.effects, effect],
  })),
  
  removeEffect: (id) => set((state) => ({
    effects: state.effects.filter((effect) => effect.id !== id),
  })),

  addAsteroid: (asteroid) => set((state) => ({
    asteroids: [...state.asteroids, asteroid],
  })),

  removeAsteroid: (id) => set((state) => ({
    asteroids: state.asteroids.filter((asteroid) => asteroid.id !== id),
  })),

  updateAsteroids: (asteroids) => set({ asteroids }),
  
  damageAsteroid: (id, damage = 1) => set((state) => ({
    asteroids: state.asteroids.map(asteroid => 
      asteroid.id === id 
        ? { ...asteroid, health: Math.max(0, asteroid.health - damage) }
        : asteroid
    ),
  })),
  
  // Wingmen management
  addWingman: (wingman) => set((state) => ({
    wingmen: [...state.wingmen, wingman],
  })),
  
  removeWingman: (id) => set((state) => ({
    wingmen: state.wingmen.filter((w) => w.id !== id),
  })),
  
  updateWingmen: (wingmen) => set({ wingmen }),
  
  resetGame: () => {
    const currentState = get();
    
    // Clear weapon pool when resetting game
    weaponMeshPool.clearAllActiveMissiles();
    
    // Clear entity pool when resetting game
    entityPool.clearAllActiveEntities();
    
    set({
      ...initialState,
      gameMode: currentState.gameMode, // Preserve the selected game mode
      freeLookMode: currentState.freeLookMode, // Preserve free look mode
      highScore: currentState.highScore,
      chargeWeapon: {
        isCharging: false,
        chargeLevel: 0,
        maxCharge: 5,
        chargeStartTime: 0,
      },
    });
  },
  
  // Weapon management
  switchWeapon: (weaponType) => set((state) => {
    if (state.weapons[weaponType] && (state.weapons[weaponType].ammo > 0 || weaponType === 'charge' || weaponType === 'default')) {
      return { weapons: { ...state.weapons, current: weaponType } };
    }
    return state;
  }),
  
  useAmmo: (weaponType, amount = 1) => set((state) => {
    const weapon = state.weapons[weaponType];
    if (!weapon || weapon.ammo === Infinity) return state;
    
    const newAmmo = Math.max(0, weapon.ammo - amount);
    const newWeapons = {
      ...state.weapons,
      [weaponType]: { ...weapon, ammo: newAmmo }
    };
    
    // Auto-switch to default if current weapon is out of ammo
    if (weaponType === state.weapons.current && newAmmo === 0) {
      newWeapons.current = 'default';
    }
    
    return { weapons: newWeapons };
  }),
  
  addAmmo: (weaponType, amount) => set((state) => {
    const weapon = state.weapons[weaponType];
    if (!weapon || weapon.ammo === Infinity) return state;
    
    const newAmmo = Math.min(weapon.maxAmmo, weapon.ammo + amount);
    return {
      weapons: {
        ...state.weapons,
        [weaponType]: { ...weapon, ammo: newAmmo }
      }
    };
  }),

  // Charge weapon management
  startCharging: () => set((state) => ({
    chargeWeapon: {
      ...state.chargeWeapon,
      isCharging: true,
      chargeStartTime: Date.now(),
    }
  })),

  stopCharging: () => set((state) => ({
    chargeWeapon: {
      ...state.chargeWeapon,
      isCharging: false,
      chargeLevel: 0,
      chargeStartTime: 0,
    }
  })),

  updateChargeLevel: () => set((state) => {
    if (!state.chargeWeapon.isCharging) return state;
    
    const timeElapsed = (Date.now() - state.chargeWeapon.chargeStartTime) / 1000;
    const newChargeLevel = Math.min(state.chargeWeapon.maxCharge, Math.floor(timeElapsed));
    
    return {
      chargeWeapon: {
        ...state.chargeWeapon,
        chargeLevel: newChargeLevel,
      }
    };
  }),

  // Debug function to grant all weapons
  grantAllWeapons: () => set((state) => ({
    weapons: {
      ...state.weapons,
      laser: { ...state.weapons.laser, ammo: state.weapons.laser.maxAmmo },
      chaingun: { ...state.weapons.chaingun, ammo: state.weapons.chaingun.maxAmmo },
      bfg: { ...state.weapons.bfg, ammo: state.weapons.bfg.maxAmmo },
      rocket: { ...state.weapons.rocket, ammo: state.weapons.rocket.maxAmmo },
      bomb: { ...state.weapons.bomb, ammo: state.weapons.bomb.maxAmmo },
      railgun: { ...state.weapons.railgun, ammo: state.weapons.railgun.maxAmmo },
    }
  })),

  startGame: (difficulty = 'normal') => {
    const currentState = get();
    console.log(`[STORE] Starting game with mode: ${currentState.gameMode}`);
    
    // Clear weapon pool when starting new game
    weaponMeshPool.clearAllActiveMissiles();
    
    // Clear entity pool when starting new game
    entityPool.clearAllActiveEntities();
    
    set({
      ...initialState,
      showMenu: false,
      gameState: 'loading', // Start in loading state
      difficulty,
      gameMode: currentState.gameMode, // Preserve the selected game mode
      freeLookMode: currentState.freeLookMode, // Preserve free look mode
      highScore: currentState.highScore,
      lives: 3,
      aliens: [],
      missiles: [],
      powerUps: [],
      effects: [],
      asteroids: [],
      gameStartTime: Date.now(),
      elapsedTime: 0,
    });
  },

  setGameReady: () => set((state) => ({
    gameState: state.gameState === 'loading' ? 'playing' : state.gameState,
    gameStartTime: Date.now(), // Reset start time when actually starting
  })),

  // Battery management for energy weapons
  drainBattery: (amount = 1) => set((state) => ({
    defensiveSystems: {
      ...state.defensiveSystems,
      battery: {
        ...state.defensiveSystems.battery,
        charge: Math.max(0, state.defensiveSystems.battery.charge - amount),
        status: (state.defensiveSystems.battery.charge - amount) <= 20 ? 'low' : 'charged'
      }
    }
  })),

  rechargeBattery: (amount = 1) => set((state) => ({
    defensiveSystems: {
      ...state.defensiveSystems,
      battery: {
        ...state.defensiveSystems.battery,
        charge: Math.min(state.defensiveSystems.battery.maxCharge, state.defensiveSystems.battery.charge + amount),
        status: (state.defensiveSystems.battery.charge + amount) >= 80 ? 'charged' : 'charging'
      }
    }
  })),

  // Options setters
  setMouseSensitivity: (sensitivity) => set((state) => ({
    options: { ...state.options, mouseSensitivity: sensitivity }
  })),
  
  setInvertedMouse: (inverted) => set((state) => ({
    options: { ...state.options, invertedMouse: inverted }
  })),
  
  setFOV: (fov) => set((state) => ({
    options: { ...state.options, fov: fov }
  })),
  
  // Zoom controls
  setZoomed: (isZoomed) => set({ isZoomed }),
  toggleZoom: () => set((state) => ({ isZoomed: !state.isZoomed })),
  
  // Advanced targeting controls
  setTargetingEnabled: (enabled) => set({ targetingEnabled: enabled }),
  setTargetingMode: (mode) => set({ targetingMode: mode }),
  cycleTargetingMode: () => set((state) => {
    const modes = ['blue', 'yellow', 'cyan'];
    const currentIndex = modes.indexOf(state.targetingMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    return { targetingMode: modes[nextIndex] };
  }),
  setSelectedTarget: (target) => set({ selectedTarget: target }),
  setTargetLock: (locked) => set({ targetLock: locked }),
  setTargetPrediction: (prediction) => set({ targetPrediction: prediction }),
  
  // Hit indicator controls
  triggerHitIndicator: () => set({ 
    hitIndicator: { 
      active: true, 
      timestamp: Date.now() 
    } 
  }),
  clearHitIndicator: () => set({ 
    hitIndicator: { 
      active: false, 
      timestamp: 0 
    } 
  }),
  
  // Validation results controls
  setValidationResults: (results) => set({ validationResults: results }),
  clearValidationResults: () => set({ validationResults: null }),
  
  // Live targeting statistics controls
  enableLiveTargetingStats: () => set((state) => ({
    liveTargetingStats: { ...state.liveTargetingStats, enabled: true }
  })),
  disableLiveTargetingStats: () => set((state) => ({
    liveTargetingStats: { ...state.liveTargetingStats, enabled: false }
  })),
  setCurrentLiveTarget: (target) => set((state) => ({
    liveTargetingStats: { ...state.liveTargetingStats, currentTarget: target }
  })),
  recordTargetingShot: (shotData) => set((state) => {
    // Find target info and truncate name
    const target = state.aliens.find(a => a.id === shotData.targetId);
    const rawName = target ? (target.name || target.type || 'Unknown') : 'No Target';
    const targetName = String(rawName).substring(0, 8);
    
    // Create enhanced shot record
    const enhancedShotData = {
      ...shotData,
      targetName: targetName,
      closestDistance: shotData.distance // Will be updated by collision detection system
    };
    
    const newShotHistory = [...state.liveTargetingStats.shotHistory, enhancedShotData];
    // Keep only last 20 shots for cleaner display
    if (newShotHistory.length > 20) {
      newShotHistory.shift();
    }
    
    // Update simplified session stats
    const newSessionStats = { ...state.liveTargetingStats.sessionStats };
    newSessionStats.shots++;
    
    if (shotData.hit) {
      newSessionStats.hits++;
    }
    
    newSessionStats.totalDistance += shotData.distance;
    newSessionStats.avgDistance = newSessionStats.shots > 0 ? newSessionStats.totalDistance / newSessionStats.shots : 0;
    
    // Track closest distance (will be updated when missile gets closer to target)
    newSessionStats.totalClosestDistance += shotData.distance; // Initial distance, will be updated
    newSessionStats.avgClosestDistance = newSessionStats.shots > 0 ? newSessionStats.totalClosestDistance / newSessionStats.shots : 0;
    
    return {
      liveTargetingStats: {
        ...state.liveTargetingStats,
        shotHistory: newShotHistory,
        sessionStats: newSessionStats
      }
    };
  }),
  clearLiveTargetingStats: () => set((state) => ({
    liveTargetingStats: {
      ...state.liveTargetingStats,
      shotHistory: [],
      sessionStats: {
        blue: { shots: 0, hits: 0, totalDistance: 0, avgDistance: 0 },
        yellow: { shots: 0, hits: 0, totalDistance: 0, avgDistance: 0 },
        cyan: { shots: 0, hits: 0, totalDistance: 0, avgDistance: 0 }
      }
    }
  })),
  
  // Auto-fire targeting controls
  toggleAutoFireTargeting: () => set((state) => ({
    autoFireTargeting: {
      ...state.autoFireTargeting,
      enabled: !state.autoFireTargeting.enabled,
      alignmentHistory: [], // Reset alignment history when toggling
      lastFireTime: 0
    }
  })),
  updateAutoFireAlignment: (isAligned) => set((state) => {
    const newHistory = [...state.autoFireTargeting.alignmentHistory, isAligned];
    // Keep only recent alignment history
    if (newHistory.length > state.autoFireTargeting.stabilityRequired) {
      newHistory.shift();
    }
    
    return {
      autoFireTargeting: {
        ...state.autoFireTargeting,
        alignmentHistory: newHistory
      }
    };
  }),
  updateAutoFireLastShot: () => set((state) => ({
    autoFireTargeting: {
      ...state.autoFireTargeting,
      lastFireTime: Date.now()
    }
  })),
  updateAutoFireDebug: (debugData) => set((state) => ({
    autoFireTargeting: {
      ...state.autoFireTargeting,
      debug: {
        ...state.autoFireTargeting.debug,
        ...debugData
      }
    }
  })),
  
  // Performance monitoring
  updatePerformance: (perfData) => set((state) => ({
    performance: { ...state.performance, ...perfData }
  })),
  
  updateComponentTime: (componentName, time) => set((state) => ({
    performance: {
      ...state.performance,
      componentTimes: {
        ...state.performance.componentTimes,
        [componentName]: time
      }
    }
  })),

  // Load debug preferences from options
  loadDebugPreferences: () => set((state) => ({
    debug: {
      ...state.debug,
      ...state.options.debugPreferences
    }
  })),

  // Debris management functions
  addDebris: (debris) => set((state) => ({
    debris: [...state.debris, debris],
  })),

  updateDebris: (debris) => set({ debris }),
  
  // Damage debris piece
  damageDebris: (debrisId, damage = 1) => set((state) => {
    const updatedDebris = state.debris.map(piece => {
      if (piece.id === debrisId) {
        const newHP = Math.max(0, piece.hp - damage);
        return { ...piece, hp: newHP };
      }
      return piece;
    });
    
    return { debris: updatedDebris };
  }),

  removeDebris: (id) => set((state) => ({
    debris: state.debris.filter((debrisItem) => debrisItem.id !== id),
  })),
}));