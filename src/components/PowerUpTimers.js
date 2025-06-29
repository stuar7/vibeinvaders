import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

function PowerUpTimers() {
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const powerUpTimers = useGameStore((state) => state.powerUpTimers);
  const shieldLevel = useGameStore((state) => state.shieldLevel);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100); // Update every 100ms
    
    return () => clearInterval(interval);
  }, []);
  
  const POWERUP_DURATION = 20000; // 20 seconds
  
  const getTimeRemaining = (startTime) => {
    if (!startTime) return 0;
    const elapsed = currentTime - startTime;
    const remaining = Math.max(0, POWERUP_DURATION - elapsed);
    return Math.ceil(remaining / 1000); // Convert to seconds
  };
  
  const powerUps = [
    { type: 'rapidFire', icon: '⚡', name: 'Rapid Fire', color: '#ffff00' },
    { type: 'multiShot', icon: '🔫', name: 'Multi Shot', color: '#00ff00' },
    { type: 'slowTime', icon: '⏰', name: 'Slow Time', color: '#ff00ff' },
    { type: 'responsiveness', icon: '🚀', name: 'Responsive', color: '#00aaff' },
  ];
  
  const activePowerUps = powerUps.filter(p => playerPowerUps[p.type]);
  
  if (activePowerUps.length === 0 && !playerPowerUps.shield) {
    return null;
  }
  
  return (
    <div className="powerup-timers">
      {playerPowerUps.shield && (
        <div className="powerup-timer" style={{ color: '#00ffff' }}>
          <span className="timer-icon">🛡️</span>
          <span className="timer-name">Shield</span>
          <span className="timer-value">L{shieldLevel}</span>
        </div>
      )}
      {activePowerUps.map(powerUp => {
        const timeRemaining = getTimeRemaining(powerUpTimers[powerUp.type]);
        return (
          <div key={powerUp.type} className="powerup-timer" style={{ color: powerUp.color }}>
            <span className="timer-icon">{powerUp.icon}</span>
            <span className="timer-name">{powerUp.name}</span>
            <span className="timer-value">{timeRemaining}s</span>
          </div>
        );
      })}
    </div>
  );
}

export default PowerUpTimers;