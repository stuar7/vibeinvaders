import React from 'react';

const ScoreDisplay = ({ score, highScore, level, elapsedTime }) => {
  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="score">
      Score: {score} | High Score: {highScore} | Level: {level} | Time: {formatTime(elapsedTime)}
    </div>
  );
};

export default ScoreDisplay;
