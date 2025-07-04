import React, { useMemo } from 'react';
import Missile from './Missile';
import { useGameStore } from '../store/gameStore';

function Missiles() {
  const missiles = useGameStore((state) => state.missiles);
  
  // Group missiles by type for potential instancing optimization
  const missilesByType = useMemo(() => {
    const groups = {};
    missiles.forEach(missile => {
      const type = missile.weaponType || 'default';
      if (!groups[type]) groups[type] = [];
      groups[type].push(missile);
    });
    return groups;
  }, [missiles]);
  
  // Prioritize rendering simple missiles first, complex ones last
  const renderOrder = ['default', 'laser', 'chaingun', 'charge', 'bfg', 'rocket', 'bomb', 'railgun'];
  
  return (
    <>
      {renderOrder.map(type => 
        missilesByType[type]?.map((missile) => (
          <Missile key={missile.id} missile={missile} />
        ))
      )}
    </>
  );
}

export default Missiles;