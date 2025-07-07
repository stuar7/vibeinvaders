import React from 'react';

const DebugControls = ({ 
  debug,
  toggleDebugGamespaceBounds,
  toggleDebugElements,
  toggleDebugCollisionCircles,
  toggleDebugBlasterCollisions
}) => {
  return (
    <div className="debug-controls">
      <button 
        className="debug-button"
        onClick={toggleDebugGamespaceBounds}
        style={{
          background: debug.showGamespaceBounds ? '#00ff00' : '#333',
          color: debug.showGamespaceBounds ? '#000' : '#fff'
        }}
      >
        {debug.showGamespaceBounds ? 'Hide' : 'Show'} Bounds
      </button>
      <button 
        className="debug-button"
        onClick={toggleDebugElements}
        style={{
          background: debug.showDebugElements ? '#00ff00' : '#333',
          color: debug.showDebugElements ? '#000' : '#fff'
        }}
      >
        {debug.showDebugElements ? 'Hide' : 'Show'} Debug
      </button>
      <button 
        className="debug-button"
        onClick={toggleDebugCollisionCircles}
        style={{
          background: debug.showCollisionCircles ? '#00ff00' : '#333',
          color: debug.showCollisionCircles ? '#000' : '#fff'
        }}
      >
        {debug.showCollisionCircles ? 'Hide' : 'Show'} Collisions
      </button>
      <button 
        className="debug-button"
        onClick={toggleDebugBlasterCollisions}
        style={{
          background: debug.showBlasterCollisions ? '#00ff00' : '#333',
          color: debug.showBlasterCollisions ? '#000' : '#fff'
        }}
      >
        {debug.showBlasterCollisions ? 'Hide' : 'Show'} Blaster
      </button>
    </div>
  );
};

export default DebugControls;
