import React from 'react';
import { useGameStore } from '../store/gameStore';

function WeaponDisplay() {
  const weapons = useGameStore((state) => state.weapons);
  const currentWeapon = weapons[weapons.current];
  
  const getWeaponIcon = (weaponType) => {
    switch (weaponType) {
      case 'default': return '🔫';
      case 'laser': return '⚡';
      case 'chaingun': return '🔥';
      case 'bfg': return '💥';
      case 'rocket': return '🚀';
      case 'charge': return '🔋'; // Charge weapon icon
      case 'bomb': return '💣'; // Bomb weapon icon
      case 'railgun': return '⚡'; // Electromagnetic railgun icon
      default: return '🔫';
    }
  };
  
  const getWeaponName = (weaponType) => {
    switch (weaponType) {
      case 'default': return 'Blaster';
      case 'laser': return 'Laser';
      case 'chaingun': return 'Chaingun';
      case 'bfg': return 'BFG';
      case 'rocket': return 'Rockets';
      case 'charge': return 'Plasma Cannon'; // Better name than "charge"
      case 'bomb': return 'Proximity Bomb';
      case 'railgun': return 'Railgun'; // Electromagnetic weapon
      default: return 'Unknown';
    }
  };
  
  const getWeaponDamage = (weaponType) => {
    switch (weaponType) {
      case 'default': return 1;
      case 'laser': return 2;
      case 'chaingun': return 1;
      case 'bfg': return 50;
      case 'rocket': return 5;
      case 'charge': return '1-5'; // Variable damage based on charge level
      case 'bomb': return '50 AOE'; // Area of effect damage
      case 'railgun': return 10; // High damage electromagnetic projectile
      default: return 1;
    }
  };
  
  const getAmmoDisplay = (weapon) => {
    if (weapon.ammo === Infinity) return '∞';
    return `${weapon.ammo}/${weapon.maxAmmo}`;
  };
  
  return (
    <div className="weapon-display">
      <div className="current-weapon">
        <div className="weapon-icon">{getWeaponIcon(currentWeapon.type)}</div>
        <div className="weapon-info">
          <div className="weapon-name">{getWeaponName(currentWeapon.type)}</div>
          <div className="weapon-damage">DMG: {getWeaponDamage(currentWeapon.type)}</div>
          <div className="weapon-ammo">{getAmmoDisplay(currentWeapon)}</div>
        </div>
      </div>
      
      <div className="weapon-inventory">
        {Object.entries(weapons).filter(([key]) => key !== 'current').map(([weaponType, weapon]) => {
          if (weapon.ammo === 0 && weaponType !== 'default') return null;
          
          const isActive = weaponType === weapons.current;
          return (
            <div 
              key={weaponType} 
              className={`weapon-slot ${isActive ? 'active' : ''}`}
            >
              <span className="slot-icon">{getWeaponIcon(weaponType)}</span>
              <span className="slot-damage">DMG:{getWeaponDamage(weaponType)}</span>
              <span className="slot-ammo">{getAmmoDisplay(weapon)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeaponDisplay;