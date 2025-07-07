import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { useKeyboard } from '../hooks/useKeyboard';
import * as THREE from 'three';

// Import player components
import { PLAYER_CONFIG } from './player/playerConfig';
import { PlayerGeometry } from './player/PlayerGeometry';
import { WingTrailEffect, ShieldEffect, CollisionDebugCircle } from './player/PlayerEffects';
import { createInitialAnimationStates, updateDoubleTapState } from './player/playerAnimationStates';
import { createPointerLockHandlers, requestPointerLock } from './player/playerInputHandlers';
import { 
  applyFreeFlightRotation, 
  applyRollControls, 
  applyCursorAimingRotation, 
  applyStarFoxBanking,
  applySomersaultRoll 
} from './player/playerRotationSystems';
import { 
  updatePlayerRotationInStore, 
  handleNonPointerLockedRotation, 
  handleArrowKeyRotation,
  updatePlayerMeshPosition 
} from './player/playerUtils';

function Player() {
  const meshRef = useRef();
  const [dummy] = useState(() => new THREE.Object3D());
  const aimingEnabled = useGameStore((state) => state.cursorAiming);
  const { pointer, camera } = useThree();
  
  // Initialize animation states
  const animationStates = createInitialAnimationStates();
  const [doubleTapState, setDoubleTapState] = useState(animationStates.doubleTapState);
  const [isPointerLocked, setIsPointerLocked] = useState(animationStates.pointerLockState.isPointerLocked);
  const [mouseMovement, setMouseMovement] = useState(animationStates.pointerLockState.mouseMovement);
  const [virtualJoystickLocal, setVirtualJoystickLocal] = useState(animationStates.pointerLockState.virtualJoystickLocal);
  const [rollAcceleration, setRollAcceleration] = useState(animationStates.rollAcceleration);
  const [rotationDamping, setRotationDamping] = useState(animationStates.rotationDamping);
  
  const virtualJoystickUpdateRef = useRef(null);
  
  // Game store state
  const position = useGameStore((state) => state.playerPosition);
  const playerPowerUps = useGameStore((state) => state.playerPowerUps);
  const shieldLevel = useGameStore((state) => state.shieldLevel);
  const setPlayerRotation = useGameStore((state) => state.setPlayerRotation);
  const setPlayerRotationalVelocity = useGameStore((state) => state.setPlayerRotationalVelocity);
  const freeLookMode = useGameStore((state) => state.freeLookMode);
  const setVirtualJoystick = useGameStore((state) => state.setVirtualJoystick);
  const options = useGameStore((state) => state.options);
  const isZoomed = useGameStore((state) => state.isZoomed);
  const zoomFOV = useGameStore((state) => state.zoomFOV);
  const keys = useKeyboard();
  const showDebugElements = useGameStore((state) => state.debug.showDebugElements);
  const showCollisionCircles = useGameStore((state) => state.debug.showCollisionCircles);
  const firstPersonMode = useGameStore((state) => state.firstPersonMode);
  const uiInteractionMode = useGameStore((state) => state.uiInteractionMode);
  
  // Create input handlers
  const inputHandlers = createPointerLockHandlers({
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
  });
  
  // Set up pointer lock event listeners
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    document.addEventListener('pointerlockchange', inputHandlers.handlePointerLockChange);
    document.addEventListener('mousemove', inputHandlers.handleMouseMove);
    document.addEventListener('keydown', inputHandlers.handleKeyDown);
    window.addEventListener('blur', inputHandlers.handleWindowBlur);
    window.addEventListener('focus', inputHandlers.handleWindowFocus);
    
    return () => {
      document.removeEventListener('pointerlockchange', inputHandlers.handlePointerLockChange);
      document.removeEventListener('mousemove', inputHandlers.handleMouseMove);
      document.removeEventListener('keydown', inputHandlers.handleKeyDown);
      window.removeEventListener('blur', inputHandlers.handleWindowBlur);
      window.removeEventListener('focus', inputHandlers.handleWindowFocus);
    };
  }, [isPointerLocked, freeLookMode, uiInteractionMode, inputHandlers]);
  
  // Request pointer lock when entering free flight mode
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (freeLookMode && canvas && !isPointerLocked && !uiInteractionMode) {
      requestPointerLock(canvas);
    } else if (!freeLookMode && isPointerLocked) {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
      document.body.style.cursor = 'auto';
    } else if (!freeLookMode) {
      document.body.style.cursor = 'auto';
    }
  }, [freeLookMode, isPointerLocked, uiInteractionMode]);
  
  // Handle frame updates
  useFrame((state, delta) => {
    // Update virtual joystick store if there's a pending update
    if (virtualJoystickUpdateRef.current) {
      setVirtualJoystick(virtualJoystickUpdateRef.current);
      virtualJoystickUpdateRef.current = null;
    }
    
    if (meshRef.current) {
      // Update mesh position
      updatePlayerMeshPosition(meshRef, position);
      
      // Handle rotation based on mode priority
      if (!doubleTapState.isRolling) {
        // Free flight mode takes priority when active
        if (freeLookMode && !uiInteractionMode) {
          // Apply free flight rotation
          const rotationApplied = applyFreeFlightRotation({
            meshRef,
            isPointerLocked,
            virtualJoystickLocal,
            rotationDamping,
            setRotationDamping,
            delta
          });
          
          // Handle non-pointer-locked mode
          if (!rotationApplied) {
            handleNonPointerLockedRotation(meshRef, pointer, isPointerLocked);
          }
          
          // Apply roll controls
          applyRollControls({
            meshRef,
            keys,
            rollAcceleration,
            setRollAcceleration,
            setPlayerRotationalVelocity,
            delta
          });
          
          // Handle arrow key overrides
          handleArrowKeyRotation(meshRef, keys, delta);
          
          // Update rotation in game store
          updatePlayerRotationInStore(meshRef, setPlayerRotation);
        } else if (aimingEnabled) {
          // Cursor aiming mode
          applyCursorAimingRotation({ meshRef, pointer, camera, dummy, delta });
          updatePlayerRotationInStore(meshRef, setPlayerRotation);
        } else {
          // Star Fox banking mode
          const playerVelocity = useGameStore.getState().playerVelocity;
          applyStarFoxBanking({ 
            meshRef, 
            keys, 
            playerVelocity, 
            playerPowerUps, 
            elapsedTime: state.clock.elapsedTime 
          });
          
          // Update rotation in game store
          setPlayerRotation({
            x: meshRef.current.rotation.x,
            y: meshRef.current.rotation.y,
            z: meshRef.current.rotation.z
          });
        }
      }
      
      // Handle somersault rolling animation
      if (doubleTapState.isRolling) {
        applySomersaultRoll({
          meshRef,
          doubleTapState,
          setDoubleTapState,
          useGameStore,
          clockTime: state.clock.elapsedTime
        });
      }
    }
  });
  
  // Double-tap detection
  useEffect(() => {
    const currentPos = useGameStore.getState().playerPosition;
    setDoubleTapState(prev => updateDoubleTapState(prev, keys, currentPos));
  }, [keys.ArrowLeft, keys.KeyA, keys.ArrowRight, keys.KeyD]);
  
  return (
    <group ref={meshRef} scale={PLAYER_CONFIG.playerScale} renderOrder={10}>
      {/* Hide ship model in first-person mode */}
      {!firstPersonMode && <PlayerGeometry playerPowerUps={playerPowerUps} />}
      
      {/* Wing tip trail effects during barrel roll */}
      {doubleTapState.isRolling && <WingTrailEffect wingTrails={doubleTapState.wingTrails} />}
      
      {/* Shield visual effect */}
      <ShieldEffect 
        playerPowerUps={playerPowerUps} 
        shieldLevel={shieldLevel} 
        showDebugElements={showDebugElements} 
      />
      
      {/* Collision debug circle */}
      <CollisionDebugCircle showCollisionCircles={showCollisionCircles} />
    </group>
  );
}

export default Player;
