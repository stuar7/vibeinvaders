import { PLAYER_CONFIG } from './playerConfig';

export const createPointerLockHandlers = ({ 
  setIsPointerLocked, 
  setMouseMovement, 
  setVirtualJoystickLocal,
  setVirtualJoystick,
  setPlayerRotation,
  virtualJoystickUpdateRef,
  isPointerLocked,
  freeLookMode,
  uiInteractionMode,
  options,
  isZoomed,
  zoomFOV
}) => {
  const handlePointerLockChange = () => {
    const canvas = document.querySelector('canvas');
    const isLocked = document.pointerLockElement === canvas;
    setIsPointerLocked(isLocked);
    
    // If pointer lock was lost unexpectedly while in free flight mode, try to reacquire it
    // BUT ONLY if we're not in UI interaction mode (which intentionally releases the lock)
    if (!isLocked && freeLookMode && !uiInteractionMode) {
      // Reset all tracking states when losing lock
      setMouseMovement({ x: 0, y: 0 });
      setVirtualJoystickLocal({ x: 0, y: 0 });
      setVirtualJoystick({ x: 0, y: 0 });
      // Also reset ship rotation to prevent desync
      setPlayerRotation({ x: 0, y: 0, z: 0 });
      
      setTimeout(() => {
        if (canvas && freeLookMode && !uiInteractionMode && typeof canvas.requestPointerLock === 'function') {
          try {
            const lockPromise = canvas.requestPointerLock();
            if (lockPromise && typeof lockPromise.catch === 'function') {
              lockPromise.catch(err => {
                console.warn('Failed to reacquire pointer lock:', err);
              });
            }
          } catch (err) {
            console.warn('Failed to reacquire pointer lock:', err);
          }
        }
      }, 100);
    }
    
    // When pointer lock is reacquired, ensure all states are synchronized
    if (isLocked && freeLookMode) {
      // Sync virtual joystick with current ship rotation if needed
      const currentRotation = { x: 0, y: 0, z: 0 }; // Fresh start
      setMouseMovement(currentRotation);
      setPlayerRotation(currentRotation);
      // Also reset virtual joystick to center for clean start
      setVirtualJoystickLocal({ x: 0, y: 0 });
      setVirtualJoystick({ x: 0, y: 0 });
    }
  };
  
  const handleMouseMove = (event) => {
    if (isPointerLocked && freeLookMode && !uiInteractionMode) {
      // For rotation control - accumulates infinitely (40% reduction: 0.002 * 0.6 = 0.0012)
      setMouseMovement(prev => ({
        x: prev.x + event.movementX * (PLAYER_CONFIG.mouseSensitivity * 0.4),
        y: prev.y + event.movementY * (PLAYER_CONFIG.mouseSensitivity * 0.4)
      }));
      
      // For virtual joystick display - shows desired world-space direction
      setVirtualJoystickLocal(prev => {
        const maxRadius = PLAYER_CONFIG.virtualJoystickMaxRadius;
        let sensitivity = options.mouseSensitivity;
        
        // Compensate sensitivity when zoomed (FOV ratio compensation)
        if (isZoomed) {
          const baseFOV = options.fov;
          const zoomRatio = zoomFOV / baseFOV;
          sensitivity *= zoomRatio;
        }
        
        // Add mouse movement directly (world space direction) - apply 40% reduction
        let newX = prev.x + event.movementX * sensitivity * 0.6;
        let newY = prev.y + event.movementY * sensitivity * 0.6;
        
        // Clamp to max radius (circular constraint)
        const magnitude = Math.sqrt(newX * newX + newY * newY);
        if (magnitude > maxRadius) {
          const normalizedX = newX / magnitude;
          const normalizedY = newY / magnitude;
          newX = normalizedX * maxRadius;
          newY = normalizedY * maxRadius;
        }
        
        const newPos = { x: newX, y: newY };
        // Use ref to prevent state update during render - will update in useFrame instead
        virtualJoystickUpdateRef.current = newPos;
        return newPos;
      });
    }
  };
  
  const handleKeyDown = (event) => {
    if (event.code === 'Escape' && isPointerLocked) {
      document.exitPointerLock();
    }
    // Reset virtual joystick to center with R key (manual centering)
    if (event.code === 'KeyR' && isPointerLocked && freeLookMode) {
      const centerPos = { x: 0, y: 0 };
      const centerRotation = { x: 0, y: 0, z: 0 };
      setVirtualJoystickLocal(centerPos);
      setVirtualJoystick(centerPos);
      setMouseMovement(centerRotation);
      setPlayerRotation(centerRotation);
    }
  };

  const handleWindowBlur = () => {
    if (freeLookMode && isPointerLocked) {
      console.log('Window lost focus - preparing for mouse reset');
    }
  };

  const handleWindowFocus = () => {
    if (freeLookMode && !uiInteractionMode) {
      console.log('Window regained focus - resetting mouse state');
      const centerPos = { x: 0, y: 0 };
      const centerRotation = { x: 0, y: 0, z: 0 };
      setVirtualJoystickLocal(centerPos);
      setVirtualJoystick(centerPos);
      setMouseMovement(centerRotation);
      setPlayerRotation(centerRotation);
      
      setTimeout(() => {
        const canvas = document.querySelector('canvas');
        if (canvas && freeLookMode && !uiInteractionMode && !isPointerLocked) {
          try {
            const lockPromise = canvas.requestPointerLock();
            if (lockPromise && typeof lockPromise.catch === 'function') {
              lockPromise.catch(err => {
                console.warn('Failed to reacquire pointer lock after focus:', err);
              });
            }
          } catch (err) {
            console.warn('Failed to reacquire pointer lock after focus:', err);
          }
        }
      }, 200);
    }
  };
  
  return {
    handlePointerLockChange,
    handleMouseMove,
    handleKeyDown,
    handleWindowBlur,
    handleWindowFocus
  };
};

export const requestPointerLock = async (canvas) => {
  try {
    if (typeof canvas.requestPointerLock === 'function') {
      const lockPromise = canvas.requestPointerLock();
      if (lockPromise && typeof lockPromise.then === 'function') {
        await lockPromise;
      }
      document.body.style.cursor = 'none';
    } else {
      console.warn('Pointer lock not supported in this browser');
      document.body.style.cursor = 'none';
    }
  } catch (error) {
    console.warn('Pointer lock failed:', error);
    document.body.style.cursor = 'none';
  }
};
