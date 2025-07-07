import React from 'react';
import MinimizeButton from '../common/MinimizeButton';
import PerformanceMonitor from './PerformanceMonitor';

const DebugInfoPanel = ({ 
  performance,
  draggableProps,
  minimized,
  toggleMinimize
}) => {
  return (
    <div 
      className="debug-info" 
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
      <MinimizeButton panelId="debugPanel" isMinimized={minimized} toggleMinimize={toggleMinimize} />
      {!minimized && (
        <PerformanceMonitor performance={performance} />
      )}
    </div>
  );
};

export default DebugInfoPanel;
