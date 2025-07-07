import React from 'react';

const GameOverScreen = ({ score, resetGame, setGameState }) => {
  return (
    <div className="game-over">
      <h1>GAME OVER</h1>
      <p>Final Score: {score}</p>
      <div className="game-over-buttons">
        <button 
          className="game-over-button default-selected"
          onClick={() => {
            resetGame();
            setGameState('startup');
          }}
        >
          Try Again
        </button>
        <button 
          className="game-over-button"
          onClick={() => setGameState('startup')}
        >
          Return to Menu
        </button>
      </div>
      <p style={{ fontSize: '14px', marginTop: '20px', opacity: 0.8 }}>
        Press ENTER for Try Again or click any button
      </p>
    </div>
  );
};

export default GameOverScreen;
