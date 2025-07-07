import React from 'react';

const HelpScreen = () => {
  return (
    <div className="help-screen">
      <h2>How to Play</h2>
      <div style={{ marginBottom: '20px' }}>
        <h3>Controls:</h3>
        <p><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> Move ship</p>
        <p><kbd>Space</kbd> Fire missiles (hold for continuous fire)</p>
        <p><kbd>P</kbd> Pause game</p>
        <p><kbd>H</kbd> Toggle this help</p>
        <p><kbd>ESC</kbd> Close help/unpause</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Power-ups:</h3>
        <p>🔵 Shield - Protects from one hit</p>
        <p>⚡ Rapid Fire - Faster shooting</p>
        <p>🟢 Multi-Shot - Triple missiles</p>
        <p>❤️ Extra Life - Gain one life</p>
        <p>⏰ Slow Time - Slows enemies</p>
      </div>
      
      <div>
        <h3>Enemies:</h3>
        <p>🔴 Scout - 1 hit, 10 points</p>
        <p>🔵 Armored - 2 hits, 15 points</p>
        <p>🟢 Elite - 3 hits, 20 points</p>
      </div>
      
      <p style={{ marginTop: '20px' }}>
        Press <kbd>H</kbd> or <kbd>ESC</kbd> to close
      </p>
    </div>
  );
};

export default HelpScreen;
