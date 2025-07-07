import React from 'react';
import MinimizeButton from '../common/MinimizeButton';

const LiveTargetingStatistics = ({ 
  gameMode,
  freeLookMode,
  targetingEnabled,
  liveTargetingStats,
  targetingMode,
  clearLiveTargetingStats,
  draggableProps,
  minimized,
  toggleMinimize
}) => {
  if (gameMode !== 'freeflight' || !freeLookMode || !targetingEnabled || !liveTargetingStats.enabled) {
    return null;
  }

  return (
    <div 
      {...draggableProps}
      style={{
        ...draggableProps.style,
        backgroundColor: 'rgba(0,0,0,0.85)',
        border: '1px solid #0088ff',
        borderRadius: '6px',
        padding: '15px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 998,
        maxHeight: minimized ? '40px' : '400px',
        overflowY: minimized ? 'hidden' : 'auto',
        minWidth: '280px',
        maxWidth: '350px', // Add max width
        position: 'relative'
      }}>
      <MinimizeButton panelId="liveTargetingStats" isMinimized={minimized} toggleMinimize={toggleMinimize} />
      {!minimized && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '1px solid #444', paddingBottom: '8px' }}>
            <h4 style={{ color: '#0088ff', margin: '0 0 5px 0', fontSize: '14px' }}>LIVE TARGETING STATS</h4>
            <div style={{ fontSize: '10px', color: '#aaa' }}>
              Mode: {targetingMode.toUpperCase()} | 
              Target: {liveTargetingStats.currentTarget ? `#${liveTargetingStats.currentTarget.id}` : 'None'}
            </div>
          </div>
          
          {/* Session Statistics */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', color: '#00ff00' }}>SESSION ACCURACY</div>
            <div style={{ 
              padding: '6px', 
              backgroundColor: 'rgba(0,136,255,0.1)',
              borderRadius: '3px',
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ color: '#fff' }}>
                  Shots: {liveTargetingStats.sessionStats.shots}
                </span>
                <span style={{ color: '#00ff00' }}>
                  Hits: {liveTargetingStats.sessionStats.hits}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ color: '#aaa' }}>
                  Hit Rate: {liveTargetingStats.sessionStats.shots > 0 ? ((liveTargetingStats.sessionStats.hits / liveTargetingStats.sessionStats.shots) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
              <div style={{ color: '#aaa', fontSize: '10px' }}>
                Avg Initial Distance: {liveTargetingStats.sessionStats.avgDistance.toFixed(1)}m
              </div>
              <div style={{ color: '#ffaa00', fontSize: '10px' }}>
                Avg Closest Distance: {liveTargetingStats.sessionStats.avgClosestDistance.toFixed(1)}m
              </div>
            </div>
          </div>
          
          {/* Recent Shot History */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', color: '#ffaa00' }}>
              RECENT SHOTS ({liveTargetingStats.shotHistory.length}/20)
            </div>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {liveTargetingStats.shotHistory.slice(-10).reverse().map((shot, index) => {
                const timeAgo = ((Date.now() - shot.timestamp) / 1000).toFixed(0);
                return (
                  <div key={index} style={{
                    marginBottom: '3px',
                    padding: '3px 5px',
                    backgroundColor: shot.hit ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)',
                    border: `1px solid ${shot.hit ? '#00ff0030' : '#ff000030'}`,
                    borderRadius: '2px',
                    fontSize: '9px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>
                        {shot.targetName || 'Unknown'}
                      </span>
                      <span style={{ color: shot.hit ? '#00ff00' : '#ff6666' }}>
                        {shot.hit ? '✓ HIT' : '✗ MISS'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '8px' }}>
                      <span>{timeAgo}s ago</span>
                      <span>Init: {shot.distance.toFixed(1)}m | Closest: {shot.closestDistance.toFixed(1)}m</span>
                    </div>
                    {shot.manual && (
                      <div style={{ color: '#aaa', fontSize: '7px' }}>Manual Shot</div>
                    )}
                  </div>
                );
              })}
              {liveTargetingStats.shotHistory.length === 0 && (
                <div style={{ color: '#666', fontSize: '10px', textAlign: 'center', padding: '10px' }}>
                  No shots recorded yet
                </div>
              )}
            </div>
          </div>
          
          {/* Clear Stats Button */}
          <div style={{ marginTop: '10px', textAlign: 'center', borderTop: '1px solid #444', paddingTop: '8px' }}>
            <button 
              onClick={clearLiveTargetingStats}
              style={{
                background: '#333',
                color: '#fff',
                border: '1px solid #666',
                borderRadius: '3px',
                padding: '4px 8px',
                fontSize: '9px',
                cursor: 'pointer'
              }}
            >
              Clear Stats
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveTargetingStatistics;
