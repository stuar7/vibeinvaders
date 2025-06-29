import React from 'react';
import Missile from './Missile';
import { useGameStore } from '../store/gameStore';

function Missiles() {
  const missiles = useGameStore((state) => state.missiles);
  
  return (
    <>
      {missiles.map((missile) => (
        <Missile key={missile.id} missile={missile} />
      ))}
    </>
  );
}

export default Missiles;