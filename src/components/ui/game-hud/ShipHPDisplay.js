import React from 'react';
import { useGameStore } from '../../../store/gameStore';

const ShipHPDisplay = () => {
  const playerShipComponents = useGameStore((state) => state.playerShipComponents);
  const getUnifiedHP = useGameStore((state) => state.getUnifiedHP);
  
  if (!playerShipComponents) {
    return null;
  }

  const unifiedHP = getUnifiedHP(playerShipComponents);
  
  // Create visual HP bar
  const hpPercentage = unifiedHP.max > 0 ? (unifiedHP.current / unifiedHP.max) * 100 : 0;
  
  // Color based on HP percentage
  const getHPColor = () => {
    if (hpPercentage > 60) return '#00ff00'; // Green
    if (hpPercentage > 30) return '#ffff00'; // Yellow
    return '#ff0000'; // Red
  };

  // Wing status indicators
  const getWingStatus = (wing) => {
    if (!playerShipComponents[wing]) return '❓';
    if (playerShipComponents[wing].destroyed) return '💥';
    const wingHP = playerShipComponents[wing].hp;
    const wingMaxHP = playerShipComponents[wing].maxHp;
    const wingPercent = wingMaxHP > 0 ? (wingHP / wingMaxHP) * 100 : 0;
    
    if (wingPercent > 60) return '🛡️'; // Intact
    if (wingPercent > 30) return '⚠️'; // Damaged
    return '🔥'; // Critical
  };

  return (
    <div className="ship-hp-display" style={{ 
      position: 'absolute', 
      top: '10px', 
      left: '10px', 
      background: 'rgba(0, 0, 0, 0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '14px',
      border: '1px solid #333'
    }}>
      <div style={{ marginBottom: '5px' }}>
        <strong>Ship Hull: {unifiedHP.current}/{unifiedHP.max}</strong>
      </div>
      
      {/* HP Bar */}
      <div style={{ 
        width: '120px', 
        height: '8px', 
        backgroundColor: '#333', 
        border: '1px solid #666',
        marginBottom: '8px'
      }}>
        <div style={{ 
          width: `${hpPercentage}%`, 
          height: '100%', 
          backgroundColor: getHPColor(),
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Component Status */}
      <div style={{ fontSize: '12px', display: 'flex', gap: '8px' }}>
        <span>L: {getWingStatus('leftWing')}</span>
        <span>Hull: {playerShipComponents.body?.destroyed ? '💥' : '🛡️'}</span>
        <span>R: {getWingStatus('rightWing')}</span>
      </div>
      
      {/* Critical component details */}
      <div style={{ fontSize: '10px', marginTop: '4px', color: '#aaa' }}>
        Body: {playerShipComponents.body?.hp || 0}/{playerShipComponents.body?.maxHp || 0} | 
        Nose: {playerShipComponents.nose?.hp || 0}/{playerShipComponents.nose?.maxHp || 0}
      </div>
    </div>
  );
};

export default ShipHPDisplay;