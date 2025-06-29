import React from 'react';
import Effect from './Effect';
import { useGameStore } from '../store/gameStore';

function Effects() {
  const effects = useGameStore((state) => state.effects);
  
  return (
    <>
      {effects.map((effect) => (
        <Effect key={effect.id} effect={effect} />
      ))}
    </>
  );
}

export default Effects;