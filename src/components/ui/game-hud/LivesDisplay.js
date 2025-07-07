import React from 'react';

const LivesDisplay = ({ lives }) => (
  <div className="lives">
    Ship: {(() => {
      try {
        const currentLives = typeof lives === 'number' ? lives : 0;
        const safeLives = Math.max(0, Math.min(3, Math.floor(currentLives)));
        const ships = [];
        const destroyed = [];
        
        for (let i = 0; i < safeLives; i++) {
          ships.push('🚀');
        }
        for (let i = 0; i < (3 - safeLives); i++) {
          destroyed.push('💥');
        }
        
        return [...ships, ...destroyed].join(' ');
      } catch (error) {
        console.error('Error rendering lives:', error, { lives });
        return '🚀 🚀 🚀'; // Default display
      }
    })()}
  </div>
);

export default LivesDisplay;
