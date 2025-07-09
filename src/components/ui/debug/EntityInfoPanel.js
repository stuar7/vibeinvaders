import React from 'react';
import MinimizeButton from '../common/MinimizeButton';
import EntityTracker from './EntityTracker';
import EntityMonitor from './EntityMonitor';

const EntityInfoPanel = ({ 
  aliens,
  missiles,
  asteroids,
  performance,
  draggableProps,
  minimized,
  toggleMinimize
}) => {
  return (
    <div 
      className="entity-info" 
      {...draggableProps}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid #555',
        borderRadius: '4px',
        padding: '15px',
        color: '#fff',
        fontSize: '12px',
        zIndex: 999,
        minHeight: minimized ? '40px' : '200px',
        height: minimized ? '40px' : '300px',
        overflowY: minimized ? 'hidden' : 'auto',
        minWidth: '250px',
        maxWidth: '400px',
        ...draggableProps.style
      }}
    >
      <MinimizeButton panelId="entityPanel" isMinimized={minimized} toggleMinimize={toggleMinimize} />
      {minimized ? (
        <div style={{ color: '#00ff00', fontWeight: 'bold', marginTop: '5px' }}>Entity Info</div>
      ) : (
        <>
          <EntityTracker aliens={aliens} missiles={missiles} asteroids={asteroids} />
          <EntityMonitor 
            aliens={aliens} 
            missiles={missiles} 
            asteroids={asteroids} 
            performance={performance} 
          />
        </>
      )}
    </div>
  );
};

export default EntityInfoPanel;