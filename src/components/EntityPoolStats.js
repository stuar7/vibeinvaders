import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useEntityPool } from '../hooks/useEntityPool';
import { useGameStore } from '../store/gameStore';

function EntityPoolStats() {
  const showDebugElements = useGameStore((state) => state.debug.showDebugElements);
  const { getPoolStats } = useEntityPool();
  const [stats, setStats] = useState({});
  
  useEffect(() => {
    if (!showDebugElements) return;
    
    const updateStats = () => {
      const poolStats = getPoolStats();
      if (poolStats) {
        setStats(poolStats);
      }
    };
    
    // Update stats every 2 seconds (throttled by getPoolStats)
    updateStats();
    const interval = setInterval(updateStats, 2000);
    
    return () => clearInterval(interval);
  }, [showDebugElements, getPoolStats]);
  
  if (!showDebugElements) return null;
  
  // Group stats by entity type
  const alienStats = {};
  const asteroidStats = {};
  const otherStats = {};
  
  Object.entries(stats).forEach(([entityType, data]) => {
    if (entityType.startsWith('alien_')) {
      alienStats[entityType] = data;
    } else if (entityType.startsWith('asteroid_')) {
      asteroidStats[entityType] = data;
    } else {
      otherStats[entityType] = data;
    }
  });
  
  return (
    <Html position={[-20, 15, 0]} style={{ width: '320px', pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff00',
        padding: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        border: '1px solid #00ff00',
        borderRadius: '4px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#00ffff' }}>Entity Pool Statistics</h4>
        
        {/* Alien Pools */}
        {Object.keys(alienStats).length > 0 && (
          <>
            <div style={{ color: '#ff00ff', marginBottom: '5px' }}>🛸 ALIENS</div>
            {Object.entries(alienStats).map(([entityType, data]) => (
              <div key={entityType} style={{ marginBottom: '8px', paddingLeft: '10px' }}>
                <div style={{ color: '#ffff00' }}>
                  {entityType.replace('alien_', '').toUpperCase()}
                </div>
                <div style={{ paddingLeft: '10px', fontSize: '11px' }}>
                  <div>Active: {data.active} / {data.poolSize}</div>
                  <div>Available: {data.available}</div>
                  <div>Usage: <span style={{
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
          </>
        )}
        
        {/* Asteroid Pools */}
        {Object.keys(asteroidStats).length > 0 && (
          <>
            <div style={{ color: '#ff8800', marginBottom: '5px', marginTop: '10px' }}>🪨 ASTEROIDS</div>
            {Object.entries(asteroidStats).map(([entityType, data]) => (
              <div key={entityType} style={{ marginBottom: '8px', paddingLeft: '10px' }}>
                <div style={{ color: '#ffff00' }}>
                  {entityType.replace('asteroid_', '').toUpperCase()}
                </div>
                <div style={{ paddingLeft: '10px', fontSize: '11px' }}>
                  <div>Active: {data.active} / {data.poolSize}</div>
                  <div>Available: {data.available}</div>
                  <div>Usage: <span style={{
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
          </>
        )}
        
        {/* Other Entity Types (future) */}
        {Object.keys(otherStats).length > 0 && (
          <>
            <div style={{ color: '#8888ff', marginBottom: '5px', marginTop: '10px' }}>📦 OTHER</div>
            {Object.entries(otherStats).map(([entityType, data]) => (
              <div key={entityType} style={{ marginBottom: '8px', paddingLeft: '10px' }}>
                <div style={{ color: '#ffff00' }}>
                  {entityType.toUpperCase()}
                </div>
                <div style={{ paddingLeft: '10px', fontSize: '11px' }}>
                  <div>Active: {data.active} / {data.poolSize}</div>
                  <div>Available: {data.available}</div>
                  <div>Usage: <span style={{
                    color: parseFloat(data.utilizationRate) > 80 ? '#ff0000' : 
                           parseFloat(data.utilizationRate) > 50 ? '#ffff00' : '#00ff00'
                  }}>{data.utilizationRate}</span></div>
                </div>
              </div>
            ))}
          </>
        )}
        
        <div style={{ 
          marginTop: '10px', 
          paddingTop: '10px', 
          borderTop: '1px solid #00ff00',
          fontSize: '10px',
          color: '#888888'
        }}>
          <div>✓ Zero garbage collection</div>
          <div>✓ O(1) entity lookups</div>
          <div>✓ Cached active queries</div>
          <div>✓ Auto pool expansion</div>
        </div>
      </div>
    </Html>
  );
}

export default EntityPoolStats;