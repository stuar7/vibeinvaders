export { default as WeaponPowerUp } from './WeaponPowerUp';

// List of weapon powerup types for easy reference
export const WEAPON_POWERUP_TYPES = [
  'laser',
  'chaingun', 
  'bfg',
  'rocketAmmo',
  'bombAmmo',
  'railgunAmmo'
];

// Helper function to check if a powerup type is a weapon
export const isWeaponPowerUp = (type) => {
  return WEAPON_POWERUP_TYPES.includes(type);
};