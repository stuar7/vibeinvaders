import React from 'react';

const AdvancedTargetingHUD = ({ 
  gameMode, 
  freeLookMode, 
  targetingEnabled, 
  targetLock, 
  selectedTarget,
  targetingMode,
  weapons,
  targetPrediction,
  autoFireTargeting,
  firstPersonMode
}) => {
  if (gameMode !== 'freeflight' || !freeLookMode || !targetingEnabled) {
    return null;
  }

  return (
    <div className="targeting-hud" style={{
      position: 'absolute',
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      color: targetLock ? '#00ff00' : '#ffffff',
      fontFamily: 'monospace',
      fontSize: '14px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: '10px',
      borderRadius: '4px',
      border: targetLock ? '1px solid #00ff00' : '1px solid #444444',
      textAlign: 'center'
    }}>
      {targetLock && selectedTarget ? (
        <>
          <div>TARGET LOCKED</div>
          <div>Mode: {targetingMode.toUpperCase()} DIAMOND</div>
          <div>Weapon: {weapons.current.toUpperCase()}</div>
          {targetPrediction && (
            <>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                {targetPrediction.isStationary ? 'STATIONARY TARGET' : 'AIM HERE'}
              </div>
              <div style={{ fontSize: '12px' }}>
                T: {targetPrediction.time.toFixed(1)}s | D: {Math.floor(targetPrediction.distance)}m
              </div>
              <div style={{ fontSize: '12px' }}>
                {targetPrediction.closing ? 'CLOSING' : 'OPENING'}
              </div>
            </>
          )}
          <div style={{ fontSize: '12px', marginTop: '5px' }}>Press TAB to cycle targets</div>
          <div style={{ fontSize: '12px' }}>Press T to cycle targeting modes</div>
          <div style={{ fontSize: '12px' }}>Press V to validate algorithms</div>
          <div style={{ 
            fontSize: '12px', 
            color: autoFireTargeting.enabled ? '#ffaa00' : '#666',
            fontWeight: autoFireTargeting.enabled ? 'bold' : 'normal'
          }}>
            Press Y to toggle AUTO-FIRE {autoFireTargeting.enabled ? 'ON' : 'OFF'}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: firstPersonMode ? '#00ffff' : '#666',
            fontWeight: firstPersonMode ? 'bold' : 'normal'
          }}>
            Press O for COCKPIT VIEW {firstPersonMode ? 'ON' : 'OFF'}
          </div>
          {autoFireTargeting.enabled && (
            <div style={{ fontSize: '11px', marginTop: '3px', color: '#ffaa00' }}>
              <div>Alignment: {autoFireTargeting.debug.alignmentProgress.toFixed(0)}%</div>
              <div>Stability: {autoFireTargeting.debug.stabilityProgress.toFixed(0)}%</div>
              <div style={{ color: autoFireTargeting.debug.isAligned ? '#00ff00' : '#ff6666' }}>
                {autoFireTargeting.debug.isAligned ? '✓ ALIGNED' : '✗ NOT ALIGNED'}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div>Advanced Targeting Active</div>
          <div>Mode: {targetingMode.toUpperCase()} DIAMOND</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>Star Citizen-style aim assist</div>
          <div style={{ fontSize: '12px' }}>Press TAB to lock nearest target</div>
          <div style={{ fontSize: '12px' }}>Press T to cycle modes</div>
          <div style={{ fontSize: '12px' }}>Press V to validate algorithms</div>
          <div style={{ 
            fontSize: '12px', 
            color: autoFireTargeting.enabled ? '#ffaa00' : '#666',
            fontWeight: autoFireTargeting.enabled ? 'bold' : 'normal'
          }}>
            Press Y to toggle AUTO-FIRE {autoFireTargeting.enabled ? 'ON' : 'OFF'}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: firstPersonMode ? '#00ffff' : '#666',
            fontWeight: firstPersonMode ? 'bold' : 'normal'
          }}>
            Press O for COCKPIT VIEW {firstPersonMode ? 'ON' : 'OFF'}
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedTargetingHUD;
