import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import weaponMeshPool from '../systems/WeaponMeshPool2';
import { useGameStore } from '../store/gameStore';

function WeaponPoolStats() {
  const showDebugElements = useGameStore((state) => state.debug.showDebugElements);
  const [stats, setStats] = useState({});
  
  useEffect(() => {
    if (!showDebugElements) return;
    
    const updateStats = () => {
      setStats(weaponMeshPool.getStats());
    };
    
    // Update stats every 500ms
    updateStats();
    const interval = setInterval(updateStats, 500);
    
    return () => clearInterval(interval);
  }, [showDebugElements]);
  
  if (!showDebugElements) return null;
  
  return (
    <Html position={[20, 15, 0]} style={{ width: '300px', pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff00',
        padding: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        border: '1px solid #00ff00',
        borderRadius: '4px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#00ffff' }}>Weapon Pool Statistics</h4>
        
        {Object.entries(stats).map(([weapon, data]) => (
          <div key={weapon} style={{ marginBottom: '8px' }}>
            <div style={{ color: '#ffff00' }}>{weapon.toUpperCase()}</div>
            <div style={{ paddingLeft: '10px', fontSize: '11px' }}>
              <div>Active: {data.active} / {data.poolSize}</div>
              <div>Available: {data.available}</div>
              <div>Utilization: <span style={{
                color: parseFloat(data.utilizationRate) > 80 ? '#ff0000' : 
                       parseFloat(data.utilizationRate) > 50 ? '#ffff00' : '#00ff00'
              }}>{data.utilizationRate}</span></div>
              {data.totalCreated > data.poolSize && (
                <div style={{ color: '#ff8800' }}>
                  Expanded: +{data.totalCreated - data.poolSize}
                </div>
              )}
            </div>
          </div>
        ))}
        
        <div style={{ 
          marginTop: '10px', 
          paddingTop: '10px', 
          borderTop: '1px solid #00ff00',
          fontSize: '10px',
          color: '#888888'
        }}>
          <div>✓ Pre-created meshes</div>
          <div>✓ Zero allocation spawning</div>
          <div>✓ Shared geometry buffers</div>
        </div>
      </div>
    </Html>
  );
}

export default WeaponPoolStats;