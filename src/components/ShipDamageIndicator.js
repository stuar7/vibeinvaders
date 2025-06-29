import React from 'react';
import { useGameStore } from '../store/gameStore';

function ShipDamageIndicator() {
  const lives = useGameStore((state) => state.lives);
  const maxLives = 3; // Assuming 3 starting lives
  
  // Create ship status display similar to lives - using ship emojis that change based on damage
  const getShipEmojis = () => {
    const shipEmojis = [];
    for (let i = 0; i < maxLives; i++) {
      if (i < lives) {
        shipEmojis.push('🚀'); // Intact ship
      } else {
        shipEmojis.push('💥'); // Damaged/destroyed ship
      }
    }
    return shipEmojis;
  };

  return null; // Remove the separate ship damage indicator - damage is now shown in lives
}

export default ShipDamageIndicator;