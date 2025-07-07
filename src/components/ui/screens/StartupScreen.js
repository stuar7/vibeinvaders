import React from 'react';

const StartupScreen = ({ setGameState, startGame, resetGame }) => {
  return (
    <div className="game-over">
      <h1>SPACE INVADERS 3D</h1>
      <p>Press ENTER to Start</p>
      <p style={{ fontSize: '16px' }}>Press H for Help</p>
    </div>
  );
};

export default StartupScreen;
