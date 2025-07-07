import { PLAYER_CONFIG } from './playerConfig';

export const createInitialAnimationStates = () => ({
  doubleTapState: {
    leftTaps: [],
    rightTaps: [],
    isRolling: false,
    rollDirection: 0, // -1 for left, 1 for right
    rollProgress: 0,
    rollStartTime: 0,
    rollDuration: PLAYER_CONFIG.rollDuration,
    rollDistance: PLAYER_CONFIG.rollDistance,
    wingTrails: { left: [], right: [] }
  },
  
  rollAcceleration: {
    isRolling: false,
    direction: 0, // -1 for Q (left), 1 for E (right), 0 for none
    holdTime: 0,  // How long the key has been held
    maxHoldTime: PLAYER_CONFIG.rollAccelerationMax
  },
  
  rotationDamping: {
    active: false,
    startTime: 0,
    duration: PLAYER_CONFIG.rotationDampingDuration,
    startPitchRate: 0,
    startYawRate: 0
  },
  
  pointerLockState: {
    isPointerLocked: false,
    mouseMovement: { x: 0, y: 0 },
    virtualJoystickLocal: { x: 0, y: 0 }
  }
});

export const updateDoubleTapState = (prevState, keys, currentPos) => {
  const now = Date.now();
  const doubleTapWindow = PLAYER_CONFIG.doubleTapWindow;
  
  // Check left arrow double-tap
  if (keys.ArrowLeft || keys.KeyA) {
    const newLeftTaps = [...prevState.leftTaps.filter(time => now - time < doubleTapWindow), now];
    
    if (newLeftTaps.length >= 2 && !prevState.isRolling) {
      // Trigger left barrel roll
      return {
        ...prevState,
        leftTaps: [],
        rightTaps: [],
        isRolling: true,
        rollDirection: -1,
        rollProgress: 0,
        rollStartTime: Date.now(),
        rollStartX: currentPos.x,
        wingTrails: { left: [], right: [] }
      };
    }
    
    return { ...prevState, leftTaps: newLeftTaps };
  }
  
  // Check right arrow double-tap
  if (keys.ArrowRight || keys.KeyD) {
    const newRightTaps = [...prevState.rightTaps.filter(time => now - time < doubleTapWindow), now];
    
    if (newRightTaps.length >= 2 && !prevState.isRolling) {
      // Trigger right barrel roll
      return {
        ...prevState,
        leftTaps: [],
        rightTaps: [],
        isRolling: true,
        rollDirection: 1,
        rollProgress: 0,
        rollStartTime: Date.now(),
        rollStartX: currentPos.x,
        wingTrails: { left: [], right: [] }
      };
    }
    
    return { ...prevState, rightTaps: newRightTaps };
  }
  
  return prevState;
};
