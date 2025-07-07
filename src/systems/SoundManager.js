/**
 * Sound Manager for Space Invader Game
 * Handles all sound loading, playback, and management
 * Gracefully handles missing sound files
 */

class SoundManager {
  constructor() {
    this.sounds = new Map();
    this.enabled = true;
    this.volume = 0.7;
    this.audioContext = null;
    this.initialized = false;
    this.loadErrors = new Set();
    
    // Sound categories for organization
    this.categories = {
      weapons: new Map(),
      impacts: new Map(),
      explosions: new Map(),
      powerups: new Map(),
      ui: new Map(),
      ambient: new Map(),
      enemy: new Map()
    };
    
    // Initialize on first user interaction
    this.initPromise = null;
  }

  /**
   * Initialize the audio context (required for web audio)
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      
      // Resume context if suspended (browser policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.initialized = true;
      console.log('[SoundManager] Audio system initialized');
      
      // Load all configured sounds
      await this.loadAllSounds();
    } catch (error) {
      console.warn('[SoundManager] Failed to initialize audio:', error);
      this.enabled = false;
    }
  }

  /**
   * Load a sound file
   */
  async loadSound(id, url, category = 'general', options = {}) {
    if (!this.initialized || !this.enabled) return;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const soundData = {
        id,
        buffer: audioBuffer,
        category,
        volume: options.volume || 1.0,
        pitch: options.pitch || 1.0,
        loop: options.loop || false,
        variations: options.variations || []
      };
      
      this.sounds.set(id, soundData);
      if (this.categories[category]) {
        this.categories[category].set(id, soundData);
      }
      
      console.log(`[SoundManager] Loaded sound: ${id}`);
      return soundData;
    } catch (error) {
      // Don't spam console for each missing file
      if (!this.loadErrors.has(id)) {
        this.loadErrors.add(id);
        console.log(`[SoundManager] Sound not found: ${id} (${url}) - Game will continue without this sound`);
      }
      return null;
    }
  }

  /**
   * Load all configured sounds
   */
  async loadAllSounds() {
    const soundConfig = this.getSoundConfiguration();
    const loadPromises = [];
    
    for (const [category, sounds] of Object.entries(soundConfig)) {
      for (const [id, config] of Object.entries(sounds)) {
        loadPromises.push(
          this.loadSound(id, config.url, category, config.options)
        );
      }
    }
    
    await Promise.allSettled(loadPromises);
    console.log(`[SoundManager] Sound loading complete. Loaded ${this.sounds.size} sounds`);
  }

  /**
   * Play a sound by ID
   */
  play(soundId, options = {}) {
    if (!this.enabled || !this.initialized) return null;
    
    const sound = this.sounds.get(soundId);
    if (!sound) return null;
    
    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = sound.buffer;
      source.loop = options.loop || sound.loop;
      
      // Apply volume
      const volume = (options.volume || sound.volume) * this.volume;
      gainNode.gain.value = volume;
      
      // Apply pitch
      const pitch = options.pitch || sound.pitch;
      source.playbackRate.value = pitch;
      
      // Random pitch variation for variety
      if (options.pitchVariation) {
        const variation = 1 + (Math.random() - 0.5) * options.pitchVariation;
        source.playbackRate.value *= variation;
      }
      
      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Start playback
      const when = options.delay ? this.audioContext.currentTime + options.delay : 0;
      source.start(when);
      
      // Return control object
      return {
        source,
        gainNode,
        stop: () => {
          try {
            source.stop();
          } catch (e) {
            // Already stopped
          }
        },
        setVolume: (vol) => {
          gainNode.gain.value = vol * this.volume;
        }
      };
    } catch (error) {
      console.warn(`[SoundManager] Error playing sound ${soundId}:`, error);
      return null;
    }
  }

  /**
   * Play a random sound from a category
   */
  playRandom(category, options = {}) {
    const categorySounds = this.categories[category];
    if (!categorySounds || categorySounds.size === 0) return null;
    
    const soundIds = Array.from(categorySounds.keys());
    const randomId = soundIds[Math.floor(Math.random() * soundIds.length)];
    
    return this.play(randomId, options);
  }

  /**
   * Play weapon sound based on weapon type
   */
  playWeaponSound(weaponType, options = {}) {
    const weaponSounds = {
      default: 'laser_basic',
      laser: 'laser_beam',
      chaingun: 'chaingun_fire',
      bfg: 'bfg_charge',
      rocket: 'rocket_launch',
      charge: 'charge_shot',
      bomb: 'bomb_drop',
      railgun: 'railgun_fire'
    };
    
    const soundId = weaponSounds[weaponType] || 'laser_basic';
    return this.play(soundId, { 
      ...options, 
      pitchVariation: 0.1 // Add slight variation
    });
  }

  /**
   * Play impact sound based on impact type
   */
  playImpactSound(impactType, options = {}) {
    const impactSounds = {
      bullet_hit: 'impact_small',
      missile_hit: 'impact_medium',
      explosion: 'explosion_large',
      shield_hit: 'shield_impact',
      armor_hit: 'armor_impact'
    };
    
    const soundId = impactSounds[impactType] || 'impact_small';
    return this.play(soundId, options);
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Toggle sound on/off
   */
  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Get sound configuration with URLs
   */
  getSoundConfiguration() {
    // Base path for sound files
    const soundPath = '/sounds/';
    
    return {
      weapons: {
        laser_basic: {
          url: `${soundPath}laser_basic.mp3`,
          options: { volume: 0.5 }
        },
        laser_beam: {
          url: `${soundPath}laser_beam.mp3`,
          options: { volume: 0.6 }
        },
        chaingun_fire: {
          url: `${soundPath}chaingun.mp3`,
          options: { volume: 0.4 }
        },
        bfg_charge: {
          url: `${soundPath}bfg_charge.mp3`,
          options: { volume: 0.8 }
        },
        rocket_launch: {
          url: `${soundPath}rocket_launch.mp3`,
          options: { volume: 0.7 }
        },
        charge_shot: {
          url: `${soundPath}charge_shot.mp3`,
          options: { volume: 0.6 }
        },
        bomb_drop: {
          url: `${soundPath}bomb_drop.mp3`,
          options: { volume: 0.7 }
        },
        railgun_fire: {
          url: `${soundPath}railgun.mp3`,
          options: { volume: 0.8 }
        }
      },
      impacts: {
        impact_small: {
          url: `${soundPath}impact_small.mp3`,
          options: { volume: 0.3 }
        },
        impact_medium: {
          url: `${soundPath}impact_medium.mp3`,
          options: { volume: 0.5 }
        },
        shield_impact: {
          url: `${soundPath}shield_hit.mp3`,
          options: { volume: 0.4 }
        },
        armor_impact: {
          url: `${soundPath}armor_hit.mp3`,
          options: { volume: 0.5 }
        }
      },
      explosions: {
        explosion_small: {
          url: `${soundPath}explosion_small.mp3`,
          options: { volume: 0.6 }
        },
        explosion_medium: {
          url: `${soundPath}explosion_medium.mp3`,
          options: { volume: 0.7 }
        },
        explosion_large: {
          url: `${soundPath}explosion_large.mp3`,
          options: { volume: 0.8 }
        },
        explosion_alien: {
          url: `${soundPath}explosion_alien.mp3`,
          options: { volume: 0.6 }
        }
      },
      powerups: {
        powerup_collect: {
          url: `${soundPath}powerup_collect.mp3`,
          options: { volume: 0.5 }
        },
        shield_activate: {
          url: `${soundPath}shield_activate.mp3`,
          options: { volume: 0.4 }
        },
        weapon_upgrade: {
          url: `${soundPath}weapon_upgrade.mp3`,
          options: { volume: 0.5 }
        },
        health_restore: {
          url: `${soundPath}health_restore.mp3`,
          options: { volume: 0.4 }
        }
      },
      ui: {
        menu_select: {
          url: `${soundPath}menu_select.mp3`,
          options: { volume: 0.3 }
        },
        menu_hover: {
          url: `${soundPath}menu_hover.mp3`,
          options: { volume: 0.2 }
        },
        game_start: {
          url: `${soundPath}game_start.mp3`,
          options: { volume: 0.5 }
        },
        game_over: {
          url: `${soundPath}game_over.mp3`,
          options: { volume: 0.6 }
        },
        level_complete: {
          url: `${soundPath}level_complete.mp3`,
          options: { volume: 0.6 }
        },
        warning: {
          url: `${soundPath}warning.mp3`,
          options: { volume: 0.5 }
        }
      },
      enemy: {
        alien_hurt: {
          url: `${soundPath}alien_hurt.mp3`,
          options: { volume: 0.4 }
        },
        alien_death: {
          url: `${soundPath}alien_death.mp3`,
          options: { volume: 0.5 }
        },
        alien_shoot: {
          url: `${soundPath}alien_shoot.mp3`,
          options: { volume: 0.3 }
        },
        boss_appear: {
          url: `${soundPath}boss_appear.mp3`,
          options: { volume: 0.7 }
        }
      },
      ambient: {
        space_ambient: {
          url: `${soundPath}space_ambient.mp3`,
          options: { volume: 0.2, loop: true }
        },
        engine_hum: {
          url: `${soundPath}engine_hum.mp3`,
          options: { volume: 0.1, loop: true }
        }
      }
    };
  }

  /**
   * Cleanup and dispose
   */
  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.sounds.clear();
    this.initialized = false;
  }
}

// Create singleton instance
const soundManager = new SoundManager();

// Auto-initialize on first user interaction
if (typeof window !== 'undefined') {
  const initOnInteraction = async () => {
    await soundManager.initialize();
    // Remove listeners after initialization
    ['click', 'keydown', 'touchstart'].forEach(event => {
      document.removeEventListener(event, initOnInteraction);
    });
  };
  
  // Add listeners for user interaction
  ['click', 'keydown', 'touchstart'].forEach(event => {
    document.addEventListener(event, initOnInteraction, { once: true });
  });
}

export default soundManager;