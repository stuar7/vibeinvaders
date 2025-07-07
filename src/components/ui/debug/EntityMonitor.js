import React from 'react';

const EntityMonitor = ({ aliens, missiles, asteroids, performance }) => {
  return (
    <div className="debug-section" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #00aa00' }}>
      <h4 style={{ color: '#00aa00', marginTop: 0, marginBottom: '10px' }}>Entity Monitor</h4>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Entity Counts:</strong><br/>
        Total Objects: {aliens.length + missiles.length + asteroids.length}<br/>
        Aliens: <span style={{ color: aliens.length > 50 ? '#ff6600' : aliens.length > 20 ? '#ffaa00' : '#00ff00' }}>{aliens.length}</span><br/>
        Missiles: <span style={{ color: missiles.length > 20 ? '#ff6600' : missiles.length > 10 ? '#ffaa00' : '#00ff00' }}>{missiles.length}</span><br/>
        Asteroids: <span style={{ color: asteroids.length > 30 ? '#ff6600' : asteroids.length > 15 ? '#ffaa00' : '#00ff00' }}>{asteroids.length}</span>
      </div>

      {performance.entityPoolStats && (
        <div style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
          <strong>Entity Pool Usage:</strong><br/>
          {Object.entries(performance.entityPoolStats)
            .filter(([entityType]) => entityType.startsWith('alien_') || entityType.startsWith('asteroid_'))
            .map(([entityType, stats]) => (
            <div key={entityType} style={{ fontSize: '10px', marginBottom: '2px' }}>
              <span style={{ color: '#aaa', textTransform: 'uppercase', width: '80px', display: 'inline-block' }}>
                {entityType.replace('_', ' ')}:
              </span>
              <span style={{ color: stats.active > 0 ? '#00ff00' : '#666' }}>
                {stats.active}/{stats.poolSize}
              </span>
              <span style={{ color: '#888', marginLeft: '8px' }}>
                ({stats.utilizationRate})
              </span>
              {stats.active > stats.poolSize * 0.8 && (
                <span style={{ color: '#ff6600', marginLeft: '4px' }}>⚠</span>
              )}
            </div>
          ))}
        </div>
      )}

      {performance.cleanupWorkerStats && (
        <div style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
          <strong>Cleanup Worker:</strong><br/>
          <div style={{ fontSize: '10px', marginBottom: '2px' }}>
            <span style={{ color: '#aaa', width: '80px', display: 'inline-block' }}>
              Tracking:
            </span>
            <span style={{ color: performance.cleanupWorkerStats.totalMissiles > 50 ? '#ff6600' : '#00ff00' }}>
              {performance.cleanupWorkerStats.totalMissiles} missiles
            </span>
          </div>
          <div style={{ fontSize: '10px', marginBottom: '2px' }}>
            <span style={{ color: '#aaa', width: '80px', display: 'inline-block' }}>
              Avg Age:
            </span>
            <span style={{ color: performance.cleanupWorkerStats.averageAge > 15 ? '#ff6600' : '#888' }}>
              {performance.cleanupWorkerStats.averageAge}s
            </span>
            <span style={{ color: '#888', marginLeft: '8px' }}>
              (oldest: {performance.cleanupWorkerStats.oldestAge}s)
            </span>
          </div>
          <div style={{ fontSize: '10px', marginBottom: '2px' }}>
            <span style={{ color: '#aaa', width: '80px', display: 'inline-block' }}>
              Status:
            </span>
            <span style={{ color: performance.cleanupWorkerStats.isRunning ? '#00ff00' : '#ff0000' }}>
              {performance.cleanupWorkerStats.isRunning ? 'Running' : 'Stopped'}
            </span>
            <span style={{ color: '#888', marginLeft: '8px' }}>
              (next: {performance.cleanupWorkerStats.nextCleanupIn}s)
            </span>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
        <strong>Entity Warnings:</strong><br/>
        {aliens.length > 50 && <div style={{ color: '#ff6600' }}>⚠ High alien count</div>}
        {missiles.length > 20 && <div style={{ color: '#ff6600' }}>⚠ High missile count</div>}
        {asteroids.length > 30 && <div style={{ color: '#ff6600' }}>⚠ High asteroid count</div>}
        {(aliens.length + missiles.length + asteroids.length) > 100 && <div style={{ color: '#ff0000' }}>⚠ Too many entities</div>}
        {aliens.length === 0 && missiles.length === 0 && asteroids.length === 0 && (
          <div style={{ color: '#888' }}>No entities detected</div>
        )}
      </div>
    </div>
  );
};

export default EntityMonitor;