import { create } from 'zustand';

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
  aliens: [],
  missiles: [],
  powerUps: [],
  effects: [],
  asteroids: [],
  wingmen: [],
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
  weapons: {
    current: 'default',
    default: { type: 'default', ammo: Infinity, maxAmmo: Infinity, level: 1 },
    laser: { type: 'laser', ammo: 0, maxAmmo: 100, level: 1 },
    chaingun: { type: 'chaingun', ammo: 0, maxAmmo: 2500, level: 1 },
    bfg: { type: 'bfg', ammo: 0, maxAmmo: 3, level: 1 },
    rocket: { type: 'rocket', ammo: 0, maxAmmo: 20, level: 1 },
    charge: { type: 'charge', ammo: Infinity, maxAmmo: Infinity, level: 1 },
    bomb: { type: 'bomb', ammo: 0, maxAmmo: 5, level: 1 },
    railgun: { type: 'railgun', ammo: 0, maxAmmo: 8, level: 1 },
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
  },
  highScore: 0,
  debug: {
    showGamespaceBounds: false,
    showDebugElements: true,
    showCollisionCircles: false,
    showBlasterCollisions: false,
  },
  
  // Performance settings
  useWebWorkerAI: true, // Toggle Web Worker AI vs traditional AI
  cursorAiming: false,
  freeLookMode: false,
  highlightedAlienId: null,
  virtualJoystick: { x: 0, y: 0 }, // For free flight mode mouse position display
};

export const useGameStore = create((set, get) => ({
  ...initialState,
  
  setGameState: (gameState) => set({ gameState }),
  
  // Menu and game mode actions
  setShowMenu: (showMenu) => set({ showMenu }),
  setGameMode: (gameMode) => set({ gameMode }),
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
  
  removeAlien: (id) => set((state) => ({
    aliens: state.aliens.filter((alien) => alien.id !== id),
  })),
  
  updateAliens: (aliens) => set({ aliens }),
  
  addMissile: (missile) => set((state) => ({
    missiles: [...state.missiles, missile],
  })),
  
  removeMissile: (id) => set((state) => ({
    missiles: state.missiles.filter((missile) => missile.id !== id),
  })),
  
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

  setPlayerSpeed: (speed) => set({ playerSpeed: speed }),

  toggleDebugGamespaceBounds: () => set((state) => ({
    debug: { ...state.debug, showGamespaceBounds: !state.debug.showGamespaceBounds }
  })),

  toggleDebugElements: () => set((state) => ({
    debug: { ...state.debug, showDebugElements: !state.debug.showDebugElements }
  })),

  toggleDebugCollisionCircles: () => set((state) => ({
    debug: { ...state.debug, showCollisionCircles: !state.debug.showCollisionCircles }
  })),

  toggleDebugBlasterCollisions: () => set((state) => ({
    debug: { ...state.debug, showBlasterCollisions: !state.debug.showBlasterCollisions }
  })),

  toggleCursorAiming: () => set((state) => ({
    cursorAiming: !state.cursorAiming
  })),

  toggleFreeLookMode: () => set((state) => ({
    freeLookMode: !state.freeLookMode
  })),

  setBraking: (isBraking) => set({ isBraking }),
  setBoosting: (isBoosting) => set({ isBoosting }),

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
  
  resetGame: () => set({
    ...initialState,
    highScore: get().highScore,
    chargeWeapon: {
      isCharging: false,
      chargeLevel: 0,
      maxCharge: 5,
      chargeStartTime: 0,
    },
  }),
  
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
    set({
      ...initialState,
      showMenu: false,
      gameState: 'playing',
      difficulty,
      highScore: get().highScore,
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
}));