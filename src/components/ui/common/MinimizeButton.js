import React from 'react';

const MinimizeButton = ({ panelId, isMinimized, toggleMinimize }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      toggleMinimize(panelId);
    }}
    style={{
      position: 'absolute',
      top: '5px',
      right: '5px',
      width: '20px',
      height: '20px',
      background: 'rgba(0, 255, 255, 0.2)',
      border: '1px solid #00ffff',
      borderRadius: '3px',
      color: '#00ffff',
      fontSize: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      zIndex: 1001
    }}
    title={isMinimized ? 'Expand' : 'Minimize'}
  >
    {isMinimized ? '+' : '-'}
  </button>
);

export default MinimizeButton;
