import React, { useEffect } from 'react';
import PowerUp from './PowerUp';
import { WeaponPowerUp, isWeaponPowerUp } from './weapons';
import { useGameStore } from '../store/gameStore';
// Removed unused GameSpace imports - using UnifiedGamespace instead
import { UnifiedGamespace } from '../config/UnifiedGamespace';

function PowerUps() {
  const powerUps = useGameStore((state) => state.powerUps);
  const addPowerUp = useGameStore((state) => state.addPowerUp);
  const gameState = useGameStore((state) => state.gameState);
  const level = useGameStore((state) => state.level);
  const gameMode = useGameStore((state) => state.gameMode);
  
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const spawnInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        // Level-based powerup availability
        let availableTypes = [];
        
        switch (level) {
          case 1:
            availableTypes = ['shield', 'multiShot', 'laser', 'extraLife'];
            break;
          case 2:
            availableTypes = ['shield', 'rapidFire', 'multiShot', 'extraLife', 'slowTime', 'laser', 'chaingun', 'responsiveness'];
            break;
          case 3:
            availableTypes = ['shield', 'rapidFire', 'multiShot', 'extraLife', 'slowTime', 'laser', 'chaingun', 'rocketAmmo', 'railgunAmmo', 'wingmen', 'weaponBoost', 'responsiveness'];
            break;
          case 4:
          default:
            availableTypes = ['shield', 'rapidFire', 'multiShot', 'extraLife', 'slowTime', 'laser', 'chaingun', 'bfg', 'rocketAmmo', 'railgunAmmo', 'wingmen', 'weaponBoost', 'responsiveness', 'stealth'];
            break;
        }
        
        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        
        // Use unified spawning system - spawn closer to player than aliens
        const spawnPosition = UnifiedGamespace.getRandomSpawnPosition(-60, 0.8, gameMode);
        
        addPowerUp({
          id: `powerup-${Date.now()}`,
          type,
          position: spawnPosition,
          velocity: {
            x: 0,
            y: 0,
            z: (0.05 + level * 0.01) * 1.2, // 20% faster toward player
          },
        });
      }
    }, 8000);
    
    return () => clearInterval(spawnInterval);
  }, [gameState, level, addPowerUp]);
  
  return (
    <>
      {powerUps.map((powerUp) => 
        isWeaponPowerUp(powerUp.type) ? (
          <WeaponPowerUp key={powerUp.id} powerUp={powerUp} />
        ) : (
          <PowerUp key={powerUp.id} powerUp={powerUp} />
        )
      )}
    </>
  );
}

export default PowerUps;