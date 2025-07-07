// Export all player-related components and utilities
export { PLAYER_CONFIG } from './playerConfig';
export { PlayerGeometry } from './PlayerGeometry';
export { WingTrailEffect, ShieldEffect, CollisionDebugCircle } from './PlayerEffects';
export { createInitialAnimationStates, updateDoubleTapState } from './playerAnimationStates';
export { createPointerLockHandlers, requestPointerLock } from './playerInputHandlers';
export { 
  applyFreeFlightRotation, 
  applyRollControls, 
  applyCursorAimingRotation, 
  applyStarFoxBanking,
  applySomersaultRoll 
} from './playerRotationSystems';
export { 
  updatePlayerRotationInStore, 
  handleNonPointerLockedRotation, 
  handleArrowKeyRotation,
  updatePlayerMeshPosition 
} from './playerUtils';
