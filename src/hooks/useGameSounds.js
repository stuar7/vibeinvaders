import { useEffect, useRef } from 'react';
import soundManager from '../systems/SoundManager';
import { useGameStore } from '../store/gameStore';

/**
 * React hook for integrating sound effects with game events
 */
export function useGameSounds() {
  const lastMissileCount = useRef(0);
  const lastAlienCount = useRef(0);
  const lastPowerUpCount = useRef(0);
  const lastScore = useRef(0);
  const lastLives = useRef(3);
  const activeLoops = useRef(new Map());
  
  // Subscribe to relevant game state
  const missiles = useGameStore((state) => state.missiles);
  const aliens = useGameStore((state) => state.aliens);
  const powerUps = useGameStore((state) => state.powerUps);
  const score = useGameStore((state) => state.score);
  const lives = useGameStore((state) => state.lives);
  const gameState = useGameStore((state) => state.gameState);
  const effects = useGameStore((state) => state.effects);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  
  // Handle game state changes
  useEffect(() => {
    switch (gameState) {
      case 'playing':
        soundManager.play('game_start');
        // Start ambient sounds
        const ambientLoop = soundManager.play('space_ambient', { loop: true });
        if (ambientLoop) {
          activeLoops.current.set('ambient', ambientLoop);
        }
        break;
        
      case 'gameOver':
        soundManager.play('game_over');
        // Stop all loops
        activeLoops.current.forEach(loop => loop.stop());
        activeLoops.current.clear();
        break;
        
      case 'levelComplete':
        soundManager.play('level_complete');
        break;
        
      default:
        break;
    }
  }, [gameState]);
  
  // Handle missile firing (weapon sounds)
  useEffect(() => {
    const currentCount = missiles.length;
    
    // New missiles were added
    if (currentCount > lastMissileCount.current) {
      const newMissiles = missiles.slice(lastMissileCount.current);
      
      newMissiles.forEach(missile => {
        if (missile.isPlayerMissile) {
          // Ensure sound manager is initialized before playing
          if (!soundManager.initialized) {
            soundManager.initialize().then(() => {
              soundManager.playWeaponSound(missile.weaponType || 'default', {
                volume: missile.weaponType === 'chaingun' ? 0.3 : undefined,
                pitchVariation: 0.1
              });
            });
          } else {
            soundManager.playWeaponSound(missile.weaponType || 'default', {
              volume: missile.weaponType === 'chaingun' ? 0.3 : undefined,
              pitchVariation: 0.1
            });
          }
        } else {
          // Enemy missile
          soundManager.play('alien_shoot', {
            volume: 0.3,
            pitchVariation: 0.2
          });
        }
      });
    }
    
    lastMissileCount.current = currentCount;
  }, [missiles]);
  
  // Handle alien destruction
  useEffect(() => {
    const currentCount = aliens.length;
    
    // Aliens were destroyed
    if (currentCount < lastAlienCount.current && lastAlienCount.current > 0) {
      soundManager.play('alien_death', {
        pitchVariation: 0.2
      });
    }
    
    lastAlienCount.current = currentCount;
  }, [aliens]);
  
  // Handle power-up collection
  useEffect(() => {
    const currentCount = powerUps.length;
    
    // Power-up was collected
    if (currentCount < lastPowerUpCount.current && lastPowerUpCount.current > 0) {
      soundManager.play('powerup_collect');
    }
    
    lastPowerUpCount.current = currentCount;
  }, [powerUps]);
  
  // Handle score changes
  useEffect(() => {
    if (score > lastScore.current && lastScore.current > 0) {
      // Could play a small "point" sound here if desired
    }
    lastScore.current = score;
  }, [score]);
  
  // Handle life loss
  useEffect(() => {
    if (lives < lastLives.current && lastLives.current > 0) {
      soundManager.play('warning');
    }
    lastLives.current = lives;
  }, [lives]);
  
  // Handle shield activation
  useEffect(() => {
    if (playerPowerUps.shield) {
      soundManager.play('shield_activate');
    }
  }, [playerPowerUps.shield]);
  
  // Handle impact and explosion effects
  useEffect(() => {
    effects.forEach(effect => {
      if (!effect.soundPlayed) {
        switch (effect.type) {
          case 'hit':
            soundManager.playImpactSound('bullet_hit', {
              volume: 0.4,
              pitchVariation: 0.2
            });
            break;
            
          case 'explosion':
            soundManager.play('explosion_medium', {
              volume: 0.6,
              pitchVariation: 0.1
            });
            break;
            
          default:
            break;
        }
        
        // Mark sound as played (would need to add this to the effect object)
        effect.soundPlayed = true;
      }
    });
  }, [effects]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all active loops
      activeLoops.current.forEach(loop => loop.stop());
      activeLoops.current.clear();
    };
  }, []);
  
  // Return sound control functions
  return {
    playSound: (soundId, options) => soundManager.play(soundId, options),
    playWeaponSound: (weaponType, options) => soundManager.playWeaponSound(weaponType, options),
    playImpactSound: (impactType, options) => soundManager.playImpactSound(impactType, options),
    setVolume: (volume) => soundManager.setMasterVolume(volume),
    toggleSound: () => soundManager.toggleSound()
  };
}

/**
 * Hook for UI sounds
 */
export function useUISounds() {
  const playHover = () => soundManager.play('menu_hover');
  const playSelect = () => soundManager.play('menu_select');
  const playWarning = () => soundManager.play('warning');
  
  return {
    playHover,
    playSelect,
    playWarning
  };
}