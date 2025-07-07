import React from 'react';

const LevelCompleteScreen = ({ level }) => {
  return (
    <div className="level-complete">
      <h1>LEVEL {level - 1} COMPLETE!</h1>
      <p>Press ENTER to Continue</p>
    </div>
  );
};

export default LevelCompleteScreen;
