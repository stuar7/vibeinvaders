import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { useKeyboard } from '../hooks/useKeyboard';
import { easing } from 'maath';
import * as THREE from 'three';

function Player() {
  const meshRef = useRef();
  const [dummy] = useState(() => new THREE.Object3D());
  const aimingEnabled = useGameStore((state) => state.cursorAiming);
  const { pointer, camera } = useThree();
  
  // Double-tap somersault state
  const [doubleTapState, setDoubleTapState] = useState({
    leftTaps: [],
    rightTaps: [],
    isRolling: false,
    rollDirection: 0, // -1 for left, 1 for right
    rollProgress: 0,
    rollStartTime: 0,
    rollDuration: 600, // 0.6 seconds (40% faster)
    rollDistance: 30, // Full tactical barrel roll distance
    wingTrails: { left: [], right: [] }
  });
  
  // Pointer lock state
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [mouseMovement, setMouseMovement] = useState({ x: 0, y: 0 });
  const [virtualJoystickLocal, setVirtualJoystickLocal] = useState({ x: 0, y: 0 }); // For local state
  const virtualJoystickUpdateRef = useRef(null); // For deferred store updates
  
  // Roll acceleration state for Q/E keys
  const [rollAcceleration, setRollAcceleration] = useState({
    isRolling: false,
    direction: 0, // -1 for Q (left), 1 for E (right), 0 for none
    holdTime: 0,  // How long the key has been held
    maxHoldTime: 2.0 // Maximum time for full acceleration (2 seconds)
  });
  
  // Deadzone damping state for smooth rotation stopping
  const [rotationDamping, setRotationDamping] = useState({
    active: false,
    startTime: 0,
    duration: 1000, // 1 second to stop
    startPitchRate: 0,
    startYawRate: 0
  });
  
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
  
  // Pointer lock functionality
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvas;
      setIsPointerLocked(isLocked);
      
      // If pointer lock was lost unexpectedly while in free flight mode, try to reacquire it
      if (!isLocked && freeLookMode) {
        // Reset all tracking states when losing lock
        setMouseMovement({ x: 0, y: 0 });
        setVirtualJoystickLocal({ x: 0, y: 0 });
        setVirtualJoystick({ x: 0, y: 0 });
        // Also reset ship rotation to prevent desync
        setPlayerRotation({ x: 0, y: 0, z: 0 });
        
        setTimeout(() => {
          if (canvas && freeLookMode && typeof canvas.requestPointerLock === 'function') {
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
      if (isPointerLocked && freeLookMode) {
        // For rotation control - accumulates infinitely
        setMouseMovement(prev => ({
          x: prev.x + event.movementX * 0.002,
          y: prev.y + event.movementY * 0.002
        }));
        
        // For virtual joystick display - shows desired world-space direction
        setVirtualJoystickLocal(prev => {
          const maxRadius = 100; // Max radius for virtual joystick
          let sensitivity = options.mouseSensitivity; // Get sensitivity from options
          
          // Compensate sensitivity when zoomed (FOV ratio compensation)
          if (isZoomed) {
            const baseFOV = options.fov;
            const zoomRatio = zoomFOV / baseFOV; // e.g., 50/75 = 0.667
            sensitivity *= zoomRatio; // Reduce sensitivity proportionally to zoom level
          }
          
          // Add mouse movement directly (world space direction)
          let newX = prev.x + event.movementX * sensitivity;
          let newY = prev.y + event.movementY * sensitivity;
          
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

    // Handle window focus events to detect tab out/in
    const handleWindowBlur = () => {
      if (freeLookMode && isPointerLocked) {
        // Store that we lost focus while in free look mode
        console.log('Window lost focus - preparing for mouse reset');
      }
    };

    const handleWindowFocus = () => {
      if (freeLookMode) {
        // When regaining focus in free look mode, reset everything
        console.log('Window regained focus - resetting mouse state');
        const centerPos = { x: 0, y: 0 };
        const centerRotation = { x: 0, y: 0, z: 0 };
        setVirtualJoystickLocal(centerPos);
        setVirtualJoystick(centerPos);
        setMouseMovement(centerRotation);
        setPlayerRotation(centerRotation);
        
        // Try to reacquire pointer lock after a brief delay
        setTimeout(() => {
          const canvas = document.querySelector('canvas');
          if (canvas && freeLookMode && !isPointerLocked) {
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
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isPointerLocked, freeLookMode]);
  
  // Request pointer lock when entering free flight mode
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (freeLookMode && canvas && !isPointerLocked) {
      const requestLock = async () => {
        try {
          // Check if pointer lock is supported
          if (typeof canvas.requestPointerLock === 'function') {
            const lockPromise = canvas.requestPointerLock();
            // Some browsers return a promise, others don't
            if (lockPromise && typeof lockPromise.then === 'function') {
              await lockPromise;
            }
            // Hide cursor
            document.body.style.cursor = 'none';
          } else {
            console.warn('Pointer lock not supported in this browser');
            // Fallback: just hide cursor without lock
            document.body.style.cursor = 'none';
          }
        } catch (error) {
          console.warn('Pointer lock failed:', error);
          // Fallback: just hide cursor without lock
          document.body.style.cursor = 'none';
        }
      };
      requestLock();
    } else if (!freeLookMode && isPointerLocked) {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
      // Show cursor
      document.body.style.cursor = 'auto';
    } else if (!freeLookMode) {
      // Ensure cursor is visible when not in free look mode
      document.body.style.cursor = 'auto';
    }
  }, [freeLookMode, isPointerLocked]);
  
  
  const getPlayerColor = () => {
    if (playerPowerUps.shield) return '#00ffff'; // Cyan when shield is active
    return '#00ffff'; // Always cyan for player ship
  };
  
  const getPlayerGeometry = () => {
    // Player ship always uses the same geometry (case 1 design) regardless of level
    return (
      <group rotation={[0, 0, 0]}>
        {/* FUSELAGE_BODY: Main ship body (center at origin, extends from z=-1 to z=+1) */}
        <mesh position={[0, 0, 0]} name="fuselage" renderOrder={10}>
          <boxGeometry args={[0.6, 0.4, 2.0]} />
          <meshStandardMaterial 
            color={getPlayerColor()} 
            transparent={playerPowerUps.stealth}
            opacity={playerPowerUps.stealth ? 0.3 : 1.0}
          />
        </mesh>
        
        {/* NOSE_CONE: Front cone at NEGATIVE Z (forward direction, where missiles go) */}
        <mesh position={[0, 0, -1.4]} rotation={[-Math.PI / 2, 0, 0]} name="nose" renderOrder={10}>
          <coneGeometry args={[0.4, 0.8, 4]} />
          <meshStandardMaterial 
            color={getPlayerColor()} 
            transparent={playerPowerUps.stealth}
            opacity={playerPowerUps.stealth ? 0.3 : 1.0}
          />
        </mesh>
        
        {/* LEFT_WING: Triangle extending left from fuselage */}
        <mesh position={[-0.3, 0, 0]} name="leftWing" renderOrder={10}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={3}
              array={new Float32Array([
                0, 0, -0.8,
                -1.5, 0, 0.5,
                0, 0, 0.8
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <meshStandardMaterial 
            color={getPlayerColor()} 
            side={THREE.DoubleSide}
            transparent={playerPowerUps.stealth}
            opacity={playerPowerUps.stealth ? 0.3 : 1.0}
          />
        </mesh>
        
        {/* RIGHT_WING: Triangle extending right from fuselage */}
        <mesh position={[0.3, 0, 0]} name="rightWing" renderOrder={10}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={3}
              array={new Float32Array([
                0, 0, -0.8,
                1.5, 0, 0.5,
                0, 0, 0.8
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <meshStandardMaterial 
            color={getPlayerColor()} 
            side={THREE.DoubleSide}
            transparent={playerPowerUps.stealth}
            opacity={playerPowerUps.stealth ? 0.3 : 1.0}
          />
        </mesh>
      </group>
    );
  };
  
  useFrame((state, delta) => {
    // Update virtual joystick store if there's a pending update (prevents render cycle conflicts)
    if (virtualJoystickUpdateRef.current) {
      setVirtualJoystick(virtualJoystickUpdateRef.current);
      virtualJoystickUpdateRef.current = null;
    }
    
    if (meshRef.current) {
      meshRef.current.position.x = position.x;
      meshRef.current.position.y = position.y;
      meshRef.current.position.z = position.z || 0;
      
      // Virtual joystick stays at mouse position - no auto-centering
      
      // Handle rotation based on mode priority
      if (!doubleTapState.isRolling) {
        // Free flight mode takes priority when active
        if (freeLookMode) {
          // 6DOF Space Sim Rotation (Elite Dangerous / Star Citizen style)
          // Manual pitch, yaw, and roll controls
          
          // Get current rotation state (persistent across frames)
          const currentRotation = {
            x: meshRef.current.rotation.x,
            y: meshRef.current.rotation.y, 
            z: meshRef.current.rotation.z
          };
          
          // Elite Dangerous / Star Citizen Style Unified Controls
          
          // Rotation speeds and sensitivity
          const pitchSpeed = 2.5;     // Up/Down rotation speed
          const yawSpeed = 2.5;       // Left/Right rotation speed  
          const rollSpeed = 1.0;      // Q/E roll speed (further reduced by half)
          const mouseSensitivity = 0.003; // Mouse sensitivity for direct rotation
          
          if (isPointerLocked) {
            // Star Citizen style virtual joystick - continuous rotation rate based on distance from center
            const virtualJoystickInput = virtualJoystickLocal;
            const deadZoneRadius = 4.5;
            
            // Calculate distance from center
            const inputMagnitude = Math.sqrt(virtualJoystickInput.x * virtualJoystickInput.x + virtualJoystickInput.y * virtualJoystickInput.y);
            
            // Calculate target rotation rates
            let targetPitchRate = 0;
            let targetYawRate = 0;
            
            // Always allow movement, but apply different behavior based on deadzone
            const maxRadius = 100; // Max virtual joystick radius
            const normalizedMagnitude = Math.min(inputMagnitude / maxRadius, 1.0);
            
            // Convert joystick position to world-space rotation rates
            const maxRotationRate = 2.0 * delta; // Maximum rotation speed per frame
            let rotationRate = normalizedMagnitude * maxRotationRate;
            
            // Apply reduced sensitivity within deadzone for microadjustments
            if (inputMagnitude <= deadZoneRadius) {
              rotationRate *= 0.3; // 30% sensitivity for microadjustments within deadzone
            }
            
            // Calculate rotation rates from virtual joystick input
            if (inputMagnitude > 0.001) { // Prevent division by zero
              targetPitchRate = -virtualJoystickInput.y / inputMagnitude * rotationRate; // Pitch (inverted Y)
              targetYawRate = -virtualJoystickInput.x / inputMagnitude * rotationRate;    // Yaw (inverted X for correct direction)
              
              // Clear damping when actively moving
              if (rotationDamping.active) {
                setRotationDamping({
                  active: false,
                  startTime: 0,
                  duration: 1000,
                  startPitchRate: 0,
                  startYawRate: 0
                });
              }
            } else {
              // No input - start damping to stop rotation
              if (!rotationDamping.active && (Math.abs(rotationDamping.startPitchRate) > 0.001 || Math.abs(rotationDamping.startYawRate) > 0.001)) {
                // Just stopped moving - start damping
                setRotationDamping({
                  active: true,
                  startTime: Date.now(),
                  duration: 1000,
                  startPitchRate: rotationDamping.startPitchRate || 0,
                  startYawRate: rotationDamping.startYawRate || 0
                });
              }
              
              if (rotationDamping.active) {
                // Apply damping curve
                const elapsed = Date.now() - rotationDamping.startTime;
                const progress = Math.min(elapsed / rotationDamping.duration, 1.0);
                const dampingFactor = 1.0 - progress; // Linear damping from 1 to 0
                
                targetPitchRate = rotationDamping.startPitchRate * dampingFactor;
                targetYawRate = rotationDamping.startYawRate * dampingFactor;
                
                // Stop damping when complete
                if (progress >= 1.0) {
                  setRotationDamping({
                    active: false,
                    startTime: 0,
                    duration: 1000,
                    startPitchRate: 0,
                    startYawRate: 0
                  });
                }
              }
            }
            
            // Store current rates for next frame
            setRotationDamping(prev => ({
              ...prev,
              startPitchRate: targetPitchRate,
              startYawRate: targetYawRate
            }));
            
            // Apply rotation if we have any
            if (Math.abs(targetPitchRate) > 0.0001 || Math.abs(targetYawRate) > 0.0001) {
              // Get current ship orientation
              const currentQuaternion = meshRef.current.quaternion.clone();
              
              // Create rotation quaternions in ship's LOCAL space (not world space)
              const pitchQuat = new THREE.Quaternion();
              const yawQuat = new THREE.Quaternion();
              
              // Apply rotations in ship's local coordinate system
              pitchQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), targetPitchRate); // Local X-axis (pitch)
              yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetYawRate);     // Local Y-axis (yaw)
              
              // Apply local rotations to current orientation: current * yaw * pitch
              currentQuaternion.multiply(yawQuat);
              currentQuaternion.multiply(pitchQuat);
              
              // Apply the result back to the ship
              meshRef.current.quaternion.copy(currentQuaternion);
            }
          } else {
            // Use mouse position for non-locked mode (with limits for traditional gameplay)
            const maxPitchAngle = Math.PI / 3; // ±60 degrees max pitch
            const maxYawAngle = Math.PI / 2;   // ±90 degrees max yaw
            
            const targetPitch = -pointer.y * maxPitchAngle * 1.5; // Inverted Y (up = negative pitch)
            const targetYaw = pointer.x * maxYawAngle * 1.5;       // X = yaw
            
            // Clamp target angles for non-locked mode
            const clampedPitch = Math.max(-maxPitchAngle, Math.min(maxPitchAngle, targetPitch));
            const clampedYaw = Math.max(-maxYawAngle, Math.min(maxYawAngle, targetYaw));
            
            // Smooth interpolation toward target orientation
            const rotationDamping = 0.15;
            meshRef.current.rotation.x += (clampedPitch - meshRef.current.rotation.x) * rotationDamping;
            meshRef.current.rotation.y += (clampedYaw - meshRef.current.rotation.y) * rotationDamping;
          }
          
          // Manual roll controls (Q/E like Elite Dangerous) with incremental acceleration
          if (keys.KeyQ || keys.KeyE) {
            const currentDirection = keys.KeyQ ? -1 : 1;
            
            // Update roll acceleration state
            setRollAcceleration(prev => {
              const isSameDirection = prev.direction === currentDirection;
              const newHoldTime = isSameDirection ? prev.holdTime + delta : 0;
              
              return {
                isRolling: true,
                direction: currentDirection,
                holdTime: Math.min(newHoldTime, prev.maxHoldTime),
                maxHoldTime: prev.maxHoldTime
              };
            });
            
            // Calculate acceleration factor (0 to 1) based on hold time
            const accelerationFactor = Math.min(rollAcceleration.holdTime / rollAcceleration.maxHoldTime, 1.0);
            
            // Apply easing curve for smooth acceleration (starts slow, builds up)
            const easedAcceleration = accelerationFactor * accelerationFactor; // Quadratic easing
            
            // Calculate final roll speed with acceleration
            const acceleratedRollSpeed = rollSpeed * (0.2 + easedAcceleration * 0.8); // Start at 20%, build to 100%
            const rollDelta = currentDirection * acceleratedRollSpeed * delta;
            
            // Get current quaternion
            const currentQuat = meshRef.current.quaternion.clone();
            
            // Create roll quaternion in local space
            const rollQuat = new THREE.Quaternion();
            rollQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollDelta); // Z-axis (roll)
            
            // Apply roll in local space
            currentQuat.multiply(rollQuat);
            meshRef.current.quaternion.copy(currentQuat);
            
            // Track rotational velocity for debug display
            const rollVelocity = rollDelta / delta; // Angular velocity in radians per second
            setPlayerRotationalVelocity({ 
              x: 0, 
              y: 0, 
              z: rollVelocity 
            });
          } else {
            // Reset roll acceleration state when not rotating
            setRollAcceleration(prev => ({
              ...prev,
              isRolling: false,
              direction: 0,
              holdTime: 0
            }));
            
            // Reset rotational velocity when not rotating
            setPlayerRotationalVelocity({ x: 0, y: 0, z: 0 });
          }
          
          // Optional: Arrow key rotation overrides (for precision control)
          if (keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight) {
            // Keyboard overrides mouse for precision
            let keyboardPitch = 0;
            let keyboardYaw = 0;
            
            if (keys.ArrowUp) keyboardPitch -= pitchSpeed * delta;
            if (keys.ArrowDown) keyboardPitch += pitchSpeed * delta;
            if (keys.ArrowLeft) keyboardYaw -= yawSpeed * delta;
            if (keys.ArrowRight) keyboardYaw += yawSpeed * delta;
            
            meshRef.current.rotation.x += keyboardPitch;
            meshRef.current.rotation.y += keyboardYaw;
          }
          
          // Only clamp rotations in non-pointer-locked mode
          if (!isPointerLocked) {
            meshRef.current.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, meshRef.current.rotation.x)); // Pitch limits
          }
          // In pointer lock mode, allow unlimited rotation for full 6DOF
          
          // Update rotation in game store for missile alignment
          // Convert quaternion back to Euler angles for game store
          const euler = new THREE.Euler();
          euler.setFromQuaternion(meshRef.current.quaternion, 'XYZ');
          setPlayerRotation({
            x: euler.x,
            y: euler.y,
            z: euler.z
          });
        } else if (aimingEnabled) {
          // Cursor aiming implementation using proper raycasting
          // Convert screen cursor to world position using proper raycasting
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(pointer, camera);
          
          // Create a plane at the targeting distance to intersect with
          const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 50); // plane at z = -50
          const cursorWorld = new THREE.Vector3();
          raycaster.ray.intersectPlane(targetPlane, cursorWorld);
          
          if (cursorWorld) {
            // Clamp cursor position to extended bounds for greater turning range in normal mode
            const gamespaceCenter = { x: 0, y: 12 }; // GAMESPACE_MASTER_CONFIG.center
            const gamespaceWidth = 36 * 1.5; // Extended width for more turning angle
            const gamespaceHeight = 20 * 1.5; // Extended height for more turning angle
            
            const finalCursorWorld = new THREE.Vector3(
              Math.max(gamespaceCenter.x - gamespaceWidth/2, Math.min(gamespaceCenter.x + gamespaceWidth/2, cursorWorld.x)),
              Math.max(gamespaceCenter.y - gamespaceHeight/2, Math.min(gamespaceCenter.y + gamespaceHeight/2, cursorWorld.y)),
              cursorWorld.z
            );
            
            // Calculate direction from player to cursor position
            const playerPos = meshRef.current.position;
            const direction = new THREE.Vector3().subVectors(finalCursorWorld, playerPos).normalize();
            
            // Since the ship's nose points in negative Z direction, we need to invert the lookAt direction
            // Create target position in the opposite direction so the nose points toward cursor
            const targetPos = new THREE.Vector3().addVectors(playerPos, direction.multiplyScalar(-15));
            
            // Make dummy object look at target position (this will point positive Z toward target)
            dummy.position.copy(playerPos);
            dummy.lookAt(targetPos);
            
            // Smoothly interpolate player rotation toward cursor direction (increased responsiveness)
            easing.dampQ(meshRef.current.quaternion, dummy.quaternion, 0.15, delta);
            
            // Update rotation in game store for missile alignment
            // Convert quaternion back to Euler angles for game store
            const euler = new THREE.Euler();
            euler.setFromQuaternion(meshRef.current.quaternion, 'XYZ');
            setPlayerRotation({
              x: euler.x,
              y: euler.y,
              z: euler.z
            });
          }
        } else {
          // Enhanced Star Fox 64-style banking and movement (only if not rolling)
          const playerVelocity = useGameStore.getState().playerVelocity;
          
          // Banking based on velocity, not just input (more realistic)
          let bankAngle = -playerVelocity.x * 0.05; // Bank in direction of movement
          let pitchAngle = playerVelocity.y * 0.03; // Pitch based on vertical movement
          
          // Additional banking based on input for responsiveness
          if (keys.ArrowLeft || keys.KeyA) {
            bankAngle += 0.25; // Stronger banking
          } else if (keys.ArrowRight || keys.KeyD) {
            bankAngle -= 0.25;
          }
          
          if (keys.ArrowUp || keys.KeyW) {
            pitchAngle -= 0.15; // More dramatic pitching
          } else if (keys.ArrowDown || keys.KeyS) {
            pitchAngle += 0.15;
          }
          
          // Clamp angles for realism
          bankAngle = Math.max(-0.4, Math.min(0.4, bankAngle));
          pitchAngle = Math.max(-0.3, Math.min(0.3, pitchAngle));
          
          if (playerPowerUps.shield) {
            meshRef.current.rotation.z = bankAngle + Math.sin(state.clock.elapsedTime * 5) * 0.02; // Reduced from 0.1
            meshRef.current.rotation.x = pitchAngle + Math.sin(state.clock.elapsedTime * 3) * 0.01; // Reduced from 0.05
          } else {
            meshRef.current.rotation.z = bankAngle;
            meshRef.current.rotation.x = pitchAngle;
          }
          
          // Update rotation in game store for missile alignment
          setPlayerRotation({
            x: meshRef.current.rotation.x,
            y: meshRef.current.rotation.y,
            z: meshRef.current.rotation.z
          });
        }
      }
      
      // Handle somersault rolling animation
      if (doubleTapState.isRolling) {
        const currentTime = Date.now();
        const elapsed = currentTime - doubleTapState.rollStartTime;
        doubleTapState.rollProgress = Math.min(elapsed / doubleTapState.rollDuration, 1.0);
        
        // Apply barrel roll rotation (inverted direction for correct spin)
        meshRef.current.rotation.z = -doubleTapState.rollDirection * doubleTapState.rollProgress * Math.PI * 2;
        
        // Apply lateral movement during roll (permanent displacement, no return)
        const moveProgress = doubleTapState.rollProgress;
        // Use smooth easing for the movement instead of sine wave
        const easeOutQuad = 1 - Math.pow(1 - moveProgress, 2);
        const lateralOffset = easeOutQuad * doubleTapState.rollDistance * doubleTapState.rollDirection;
        
        // Update player position through game store
        const currentPos = useGameStore.getState().playerPosition;
        const rollStartX = doubleTapState.rollStartX || currentPos.x;
        const newX = rollStartX + lateralOffset;
        
        useGameStore.getState().setPlayerPosition({ 
          x: newX, 
          y: currentPos.y, 
          z: currentPos.z 
        });
        
        // Create wing trail effects
        if (doubleTapState.rollProgress < 1.0) {
          const wingTipLeft = new THREE.Vector3(-2.0, 0, 0);
          const wingTipRight = new THREE.Vector3(2.0, 0, 0);
          
          // Transform wing tips to world space
          wingTipLeft.applyMatrix4(meshRef.current.matrixWorld);
          wingTipRight.applyMatrix4(meshRef.current.matrixWorld);
          
          // Add to trail arrays
          doubleTapState.wingTrails.left.push({
            position: wingTipLeft.clone(),
            time: state.clock.elapsedTime
          });
          doubleTapState.wingTrails.right.push({
            position: wingTipRight.clone(),
            time: state.clock.elapsedTime
          });
          
          // Remove old trail points
          const maxTrailAge = 0.5;
          doubleTapState.wingTrails.left = doubleTapState.wingTrails.left.filter(
            point => state.clock.elapsedTime - point.time < maxTrailAge
          );
          doubleTapState.wingTrails.right = doubleTapState.wingTrails.right.filter(
            point => state.clock.elapsedTime - point.time < maxTrailAge
          );
        }
        
        // End roll when complete
        if (doubleTapState.rollProgress >= 1.0) {
          // Preserve momentum: add roll velocity to current player velocity
          const currentVelocity = useGameStore.getState().playerVelocity || { x: 0, y: 0, z: 0 };
          const rollMomentum = (doubleTapState.rollDirection || 0) * 2.0; // Momentum factor
          
          useGameStore.getState().updatePlayerVelocity(
            (currentVelocity.x || 0) + rollMomentum,
            currentVelocity.y || 0,
            currentVelocity.z || 0
          );
          
          setDoubleTapState(prev => ({
            ...prev,
            isRolling: false,
            rollProgress: 0,
            rollDirection: 0,
            rollStartTime: 0,
            rollStartX: undefined,
            wingTrails: { left: [], right: [] }
          }));
          meshRef.current.rotation.z = 0; // Reset rotation
        }
      }
    }
  });
  
  // Double-tap detection
  React.useEffect(() => {
    const now = Date.now();
    const doubleTapWindow = 150; // 150ms window for fast double tap (was 300ms)
    
    // Check left arrow double-tap
    if (keys.ArrowLeft || keys.KeyA) {
      setDoubleTapState(prev => {
        const newLeftTaps = [...prev.leftTaps.filter(time => now - time < doubleTapWindow), now];
        
        if (newLeftTaps.length >= 2 && !prev.isRolling) {
          // Trigger left barrel roll
          const currentPos = useGameStore.getState().playerPosition;
          return {
            ...prev,
            leftTaps: [],
            rightTaps: [],
            isRolling: true,
            rollDirection: -1, // Left roll
            rollProgress: 0,
            rollStartTime: Date.now(),
            rollStartX: currentPos.x,
            wingTrails: { left: [], right: [] }
          };
        }
        
        return { ...prev, leftTaps: newLeftTaps };
      });
    }
    
    // Check right arrow double-tap
    if (keys.ArrowRight || keys.KeyD) {
      setDoubleTapState(prev => {
        const newRightTaps = [...prev.rightTaps.filter(time => now - time < doubleTapWindow), now];
        
        if (newRightTaps.length >= 2 && !prev.isRolling) {
          // Trigger right barrel roll
          const currentPos = useGameStore.getState().playerPosition;
          return {
            ...prev,
            leftTaps: [],
            rightTaps: [],
            isRolling: true,
            rollDirection: 1, // Right roll
            rollProgress: 0,
            rollStartTime: Date.now(),
            rollStartX: currentPos.x,
            wingTrails: { left: [], right: [] }
          };
        }
        
        return { ...prev, rightTaps: newRightTaps };
      });
    }
  }, [keys.ArrowLeft, keys.KeyA, keys.ArrowRight, keys.KeyD]);
  
  return (
    <group ref={meshRef} scale={[1.452, 1.452, 1.452]} renderOrder={10}>
      {getPlayerGeometry()}
      
      {/* Wing tip trail effects during barrel roll */}
      {doubleTapState.isRolling && (
        <>
          {/* Left wing trail */}
          {doubleTapState.wingTrails.left.map((point, index) => {
            const age = Date.now() / 1000 - point.time;
            const opacity = Math.max(0, 1 - (age / 0.5));
            return (
              <mesh key={`left-${index}`} position={[point.position.x, point.position.y, point.position.z]} renderOrder={25}>
                <sphereGeometry args={[0.1, 4, 4]} />
                <meshBasicMaterial 
                  color="#00ffff" 
                  transparent 
                  opacity={opacity}
                  depthTest={false}
                />
              </mesh>
            );
          })}
          
          {/* Right wing trail */}
          {doubleTapState.wingTrails.right.map((point, index) => {
            const age = Date.now() / 1000 - point.time;
            const opacity = Math.max(0, 1 - (age / 0.5));
            return (
              <mesh key={`right-${index}`} position={[point.position.x, point.position.y, point.position.z]} renderOrder={25}>
                <sphereGeometry args={[0.1, 4, 4]} />
                <meshBasicMaterial 
                  color="#00ffff" 
                  transparent 
                  opacity={opacity}
                  depthTest={false}
                />
              </mesh>
            );
          })}
        </>
      )}
      
      
      {/* Shield visual effect - always show when shield is active */}
      {playerPowerUps.shield && showDebugElements && (
        <mesh renderOrder={12}>
          <sphereGeometry args={[1.8 * (1 + (shieldLevel - 1) * 0.05), 16, 12]} />
          <meshBasicMaterial 
            color="#00ffff" 
            wireframe
            transparent 
            opacity={0.45}
            depthTest={false}
          />
        </mesh>
      )}
      
      {/* Collision circle - only show when collision debug is enabled */}
      {showCollisionCircles && (
        <mesh>
          <sphereGeometry args={[2.0, 16, 12]} />
          <meshBasicMaterial 
            color="#ff0000" 
            wireframe
            transparent 
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

export default Player;