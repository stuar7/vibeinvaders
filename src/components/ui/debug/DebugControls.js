import React from 'react';

const DebugControls = ({ 
  debug,
  toggleDebugGamespaceBounds,
  toggleDebugElements,
  toggleDebugCollisionCircles,
  toggleDebugBlasterCollisions,
  toggleDebugPerformanceMonitor,
  toggleDebugEntities
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
        {debug.showDebugElements ? 'Hide' : 'Show'} Info
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
      <button 
        className="debug-button"
        onClick={toggleDebugPerformanceMonitor}
        style={{
          background: debug.showPerformanceMonitor ? '#00ff00' : '#333',
          color: debug.showPerformanceMonitor ? '#000' : '#fff'
        }}
      >
        {debug.showPerformanceMonitor ? 'Hide' : 'Show'} Performance
      </button>
      <button 
        className="debug-button"
        onClick={toggleDebugEntities}
        style={{
          background: debug.showEntities ? '#00ff00' : '#333',
          color: debug.showEntities ? '#000' : '#fff'
        }}
      >
        {debug.showEntities ? 'Hide' : 'Show'} Entities
      </button>
    </div>
  );
};

export default DebugControls;
