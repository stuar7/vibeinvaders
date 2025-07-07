import React from 'react';

const PerformanceMonitor = ({ performance }) => {
  return (
    <div className="debug-section" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #ff6600' }}>
      <h4 style={{ color: '#ff6600', marginTop: 0, marginBottom: '10px' }}>Performance Monitor</h4>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Frame Performance:</strong><br/>
        FPS: <span style={{ color: performance.frameRate < 30 ? '#ff0000' : performance.frameRate < 50 ? '#ffaa00' : '#00ff00' }}>
          {performance.frameRate}
        </span> | Target: 60<br/>
        Current: {performance.frameTime.toFixed(1)}ms | Avg: {(performance.avgFrameTime || 0).toFixed(1)}ms | Max: {(performance.maxFrameTime || 0).toFixed(1)}ms<br/>
        Render Time: {performance.renderTime.toFixed(1)}ms<br/>
        Frame Budget: <span style={{ color: performance.frameTime > (1000/60) ? '#ff0000' : '#00ff00' }}>
          {((performance.frameTime / (1000/60)) * 100).toFixed(1)}%
        </span> | GC Events: {performance.gcEvents || 0}
      </div>
      
      <div style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
        <strong>System Resources:</strong><br/>
        JS Memory: {performance.memoryUsage.toFixed(1)} MB<br/>
        Triangles: {performance.triangleCount.toLocaleString()}<br/>
        Draw Calls: {performance.drawCalls || 'N/A'}<br/>
        Geometries: {performance.geometries || 'N/A'}<br/>
        Textures: {performance.textures || 'N/A'}<br/>
        Objects: {performance.totalObjects || 'N/A'}
      </div>

      {performance.poolStats && (
        <div style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
          <strong>Weapon Pool Usage:</strong><br/>
          {Object.entries(performance.poolStats).map(([weaponType, stats]) => (
            <div key={weaponType} style={{ fontSize: '10px', marginBottom: '2px' }}>
              <span style={{ color: '#aaa', textTransform: 'uppercase', width: '50px', display: 'inline-block' }}>
                {weaponType}:
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

      {performance.effectsPoolStats && (
        <div style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
          <strong>Effects Pool Usage:</strong><br/>
          {Object.entries(performance.effectsPoolStats).map(([effectType, stats]) => (
            <div key={effectType} style={{ fontSize: '10px', marginBottom: '2px' }}>
              <span style={{ color: '#aaa', textTransform: 'uppercase', width: '70px', display: 'inline-block' }}>
                {effectType}:
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


      {performance.triangleBreakdown && performance.triangleCount > 50000 && (
        <div style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
          <strong>Triangle Breakdown ({performance.triangleCount.toLocaleString()}):</strong><br/>
          <div style={{ fontSize: '9px', marginBottom: '4px' }}>
            <strong>By Component:</strong>
          </div>
          {Object.entries(performance.triangleBreakdown.byComponent)
            .sort(([,a], [,b]) => b - a)
            .map(([component, count]) => (
              <div key={component} style={{ fontSize: '9px', marginBottom: '1px' }}>
                <span style={{ color: '#aaa', width: '80px', display: 'inline-block' }}>
                  {component}:
                </span>
                <span style={{ color: count > 10000 ? '#ff6600' : count > 5000 ? '#ffaa00' : '#00ff00' }}>
                  {count.toLocaleString()}
                </span>
                <span style={{ color: '#888', marginLeft: '4px' }}>
                  ({((count / performance.triangleCount) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          {performance.triangleBreakdown.topContributors.length > 0 && (
            <>
              <div style={{ fontSize: '9px', marginTop: '4px', marginBottom: '2px' }}>
                <strong>Top Contributors:</strong>
              </div>
              {performance.triangleBreakdown.topContributors.slice(0, 3).map((contributor, i) => (
                <div key={i} style={{ fontSize: '9px', marginBottom: '1px' }}>
                  <span style={{ color: '#aaa', width: '60px', display: 'inline-block' }}>
                    {contributor.name}:
                  </span>
                  <span style={{ color: contributor.triangles > 5000 ? '#ff6600' : '#ffaa00' }}>
                    {contributor.triangles.toLocaleString()}
                  </span>
                  <span style={{ color: '#888', marginLeft: '4px', fontSize: '8px' }}>
                    {contributor.type}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <div style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
        <strong>Performance Bottlenecks:</strong><br/>
        {performance.frameRate < 30 && <div style={{ color: '#ff0000' }}>⚠ Low FPS detected</div>}
        {performance.frameTime > (1000/60) && <div style={{ color: '#ff6600' }}>⚠ Frame budget exceeded</div>}
        {performance.memoryUsage > 100 && <div style={{ color: '#ffaa00' }}>⚠ High memory usage</div>}
        {performance.triangleCount > 50000 && <div style={{ color: '#ffaa00' }}>⚠ High triangle count</div>}
      </div>

      {performance.spikes && performance.spikes.length > 0 && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
          <strong>Recent Performance Spikes:</strong><br/>
          {performance.spikes.slice(-5).map((spike, i) => (
            <div key={i} style={{ fontSize: '10px', marginBottom: '4px', padding: '2px', backgroundColor: 'rgba(255, 0, 0, 0.1)', borderRadius: '2px' }}>
              <div style={{ color: '#ff6600' }}>
                {spike.frameTime.toFixed(1)}ms spike ({((Date.now() - spike.time) / 1000).toFixed(1)}s ago)
              </div>
              <div style={{ color: '#aaa', fontSize: '9px' }}>
                Missiles: <span style={{ color: spike.missileCount > 20 ? '#ff0000' : '#aaa' }}>{spike.missileCount}</span> | 
                Aliens: {spike.alienCount} | 
                Triangles: {spike.triangleCount.toLocaleString()} | 
                Calls: {spike.drawCalls}
              </div>
              {spike.poolStats && (
                <div style={{ color: '#888', fontSize: '8px' }}>
                  Pool: R:{spike.poolStats.rocket?.active || 0}/{spike.poolStats.rocket?.poolSize || 0} | 
                  B:{spike.poolStats.bfg?.active || 0}/{spike.poolStats.bfg?.poolSize || 0} | 
                  💣:{spike.poolStats.bomb?.active || 0}/{spike.poolStats.bomb?.poolSize || 0} | 
                  ⚡:{spike.poolStats.railgun?.active || 0}/{spike.poolStats.railgun?.poolSize || 0}
                </div>
              )}
              <div style={{ color: '#ccc', fontSize: '9px' }}>
                {spike.cause}
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(performance.componentTimes).length > 0 && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
          <strong>Component Render Times:</strong><br/>
          {Object.entries(performance.componentTimes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([name, time]) => (
              <div key={name} style={{ fontSize: '10px' }}>
                {name}: <span style={{ color: time > 5 ? '#ff0000' : time > 2 ? '#ff6600' : '#00ff00' }}>
                  {time.toFixed(2)}ms
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
