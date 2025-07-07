import React from 'react';

const GameWonScreen = ({ score }) => {
  return (
    <div className="game-over">
      <h1>YOU WIN!</h1>
      <p>Final Score: {score}</p>
      <p>Press ENTER to Play Again</p>
    </div>
  );
};

export default GameWonScreen;
