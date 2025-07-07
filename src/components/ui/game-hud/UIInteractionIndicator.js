import React from 'react';

const UIInteractionIndicator = ({ gameMode, uiInteractionMode }) => {
  if (gameMode !== 'freeflight' || !uiInteractionMode) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      top: '50px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(255,170,0,0.9)',
      color: '#000',
      padding: '10px 20px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '14px',
      fontWeight: 'bold',
      boxShadow: '0 0 10px rgba(255,170,0,0.5)',
      zIndex: 1000
    }}>
      UI INTERACTION MODE - Press F to resume flight controls
    </div>
  );
};

export default UIInteractionIndicator;
