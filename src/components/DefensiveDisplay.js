import React from 'react';
import { useGameStore } from '../store/gameStore';

function DefensiveDisplay() {
  const defensiveSystems = useGameStore((state) => state.defensiveSystems);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const debug = useGameStore((state) => state.debug);
  
  const getSystemIcon = (systemType) => {
    switch (systemType) {
      case 'shield': return '🛡️';
      case 'armor': return '⚔️';
      case 'evasion': return '🚀';
      case 'countermeasures': return '🎯';
      case 'battery': return '🔋';
      case 'cooler': return '❄️';
      default: return '⚙️';
    }
  };
  
  const getSystemName = (systemType) => {
    switch (systemType) {
      case 'shield': return 'Shield';
      case 'armor': return 'Armor';
      case 'evasion': return 'Boost';
      case 'countermeasures': return 'Counter';
      case 'battery': return 'Battery';
      case 'cooler': return 'Cooler';
      default: return 'Unknown';
    }
  };
  
  const getSystemStatus = (systemType, system) => {
    switch (systemType) {
      case 'shield': 
        return playerPowerUps.shield ? 'ACTIVE' : `${system.efficiency}%`;
      case 'armor': 
        return `${system.integrity}%`;
      case 'evasion': 
        return playerPowerUps.responsiveness ? 'ENHANCED' : system.responsiveness.toUpperCase();
      case 'countermeasures': 
        return `${system.charges}/${system.maxCharges}`;
      case 'battery':
        return `${system.charge}%`;
      case 'cooler':
        return `${system.temperature}°C`;
      default: 
        return 'OK';
    }
  };
  

  // Calculate dynamic positioning - move right when debug buttons are hidden
  const rightPosition = debug.showDebugElements ? '240px' : '20px';
  
  return (
    <div className="defensive-display" style={{
      position: 'fixed',
      bottom: '20px',
      right: rightPosition,
      transition: 'right 0.3s ease',
      zIndex: 999,
    }}>
      {/* Defensive system inventory - rectangular tabs like weapons */}
      <div className="weapon-inventory" style={{ display: 'flex', flexDirection: 'row', gap: '2px', flexWrap: 'wrap' }}>
        {Object.entries(defensiveSystems).map(([systemType, system]) => {
          const isActive = systemType === 'shield' && playerPowerUps.shield;
          return (
            <div 
              key={systemType} 
              className={`weapon-slot ${isActive ? 'active' : ''}`}
              style={{
                background: isActive ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 0, 0.6)',
                border: isActive ? '1px solid #00ff00' : '1px solid #666',
                borderRadius: '4px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                minWidth: '60px',
                color: isActive ? '#00ff00' : '#999',
              }}
            >
              <span className="slot-icon" style={{ fontSize: '20px' }}>
                {getSystemIcon(systemType)}
              </span>
              <span className="slot-damage" style={{ 
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#ff6600',
                fontWeight: 'bold'
              }}>
                {getSystemName(systemType)}
              </span>
              <span className="slot-ammo" style={{ 
                fontFamily: 'monospace',
                fontSize: '12px'
              }}>
                {getSystemStatus(systemType, system)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DefensiveDisplay;