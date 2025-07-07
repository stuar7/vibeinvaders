import React from 'react';
import MinimizeButton from '../common/MinimizeButton';
import { UnifiedGamespace, GAMESPACE_MASTER_CONFIG } from '../../../config/UnifiedGamespace';

const GamespaceDimensions = ({ 
  playerPosition,
  playerVelocity,
  playerRotation,
  playerRotationalVelocity,
  draggableProps,
  minimized,
  toggleMinimize
}) => {
  return (
    <div 
      className="gamespace-info" 
      {...draggableProps}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid #555',
        borderRadius: '4px',
        padding: '15px',
        color: '#fff',
        fontSize: '12px',
        minHeight: minimized ? '40px' : '150px',
        zIndex: 999,
        width: '300px',
        ...draggableProps.style
      }}
    >
      <MinimizeButton panelId="gamespacePanel" isMinimized={minimized} toggleMinimize={toggleMinimize} />
      <h4 style={{ color: '#00ff00', marginTop: 0, marginBottom: '10px' }}>Gamespace Dimensions</h4>
      {!minimized && (
        <>
          <div>Center: ({GAMESPACE_MASTER_CONFIG.center.x}, {GAMESPACE_MASTER_CONFIG.center.y}, {GAMESPACE_MASTER_CONFIG.center.z})</div>
          <div>Width: {GAMESPACE_MASTER_CONFIG.bounds.width} (E/W)</div>
          <div>Height: {GAMESPACE_MASTER_CONFIG.bounds.height} (N/S)</div>
          <div>Length: {GAMESPACE_MASTER_CONFIG.length}</div>
          <div>Segments: {GAMESPACE_MASTER_CONFIG.segments}</div>
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444' }}>
            <strong>Player Position:</strong><br/>
            X: {playerPosition.x.toFixed(2)}<br/>
            Y: {playerPosition.y.toFixed(2)}<br/>
            Z: {playerPosition.z || 0}<br/>
            Distance from center: {UnifiedGamespace.getDistanceFromCenter(playerPosition.x, playerPosition.y).toFixed(2)}
            
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
              <strong>Player Velocity:</strong><br/>
              X: {playerVelocity.x.toFixed(3)}<br/>
              Y: {playerVelocity.y.toFixed(3)}<br/>
              Z: {playerVelocity.z.toFixed(3)}<br/>
              Speed: {Math.sqrt(playerVelocity.x ** 2 + playerVelocity.y ** 2 + playerVelocity.z ** 2).toFixed(3)}
            </div>
            
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
              <strong>Player Rotation:</strong><br/>
              X: {(playerRotation.x * 180 / Math.PI).toFixed(1)}°<br/>
              Y: {(playerRotation.y * 180 / Math.PI).toFixed(1)}°<br/>
              Z: {(playerRotation.z * 180 / Math.PI).toFixed(1)}°
            </div>
            
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
              <strong>Rotational Velocity:</strong><br/>
              X: {(playerRotationalVelocity.x * 180 / Math.PI).toFixed(1)}°/s<br/>
              Y: {(playerRotationalVelocity.y * 180 / Math.PI).toFixed(1)}°/s<br/>
              Z: {(playerRotationalVelocity.z * 180 / Math.PI).toFixed(1)}°/s (Q/E)
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GamespaceDimensions;
