import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Box3, Vector3 } from 'three';
import * as THREE from 'three';
import { Html, Billboard } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import { TargetingValidationSystem } from '../systems/TargetingValidationSystem';

function AdvancedTargeting() {
  const tabPressedRef = useRef(false);
  const tPressedRef = useRef(false);
  const uPressedRef = useRef(false);
  const previousAlignmentRef = useRef(null);
  
  // Validation system
  const validationSystemRef = useRef(new TargetingValidationSystem());
  
  const aliens = useGameStore((state) => state.aliens);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerVelocity = useGameStore((state) => state.playerVelocity);
  const playerRotation = useGameStore((state) => state.playerRotation);
  const weapons = useGameStore((state) => state.weapons);
  const gameMode = useGameStore((state) => state.gameMode);
  const freeLookMode = useGameStore((state) => state.freeLookMode);
  
  // Targeting state from store
  const targetingEnabled = useGameStore((state) => state.targetingEnabled);
  const targetingMode = useGameStore((state) => state.targetingMode);
  const selectedTarget = useGameStore((state) => state.selectedTarget);
  const targetLock = useGameStore((state) => state.targetLock);
  const setTargetingEnabled = useGameStore((state) => state.setTargetingEnabled);
  const setTargetingMode = useGameStore((state) => state.setTargetingMode);
  const cycleTargetingMode = useGameStore((state) => state.cycleTargetingMode);
  const setSelectedTarget = useGameStore((state) => state.setSelectedTarget);
  const setTargetLock = useGameStore((state) => state.setTargetLock);
  const setTargetPrediction = useGameStore((state) => state.setTargetPrediction);
  const validationResults = useGameStore((state) => state.validationResults);
  const setValidationResults = useGameStore((state) => state.setValidationResults);
  const clearValidationResults = useGameStore((state) => state.clearValidationResults);
  const enableLiveTargetingStats = useGameStore((state) => state.enableLiveTargetingStats);
  const setCurrentLiveTarget = useGameStore((state) => state.setCurrentLiveTarget);
  const autoFireTargeting = useGameStore((state) => state.autoFireTargeting);
  const toggleAutoFireTargeting = useGameStore((state) => state.toggleAutoFireTargeting);
  const updateAutoFireAlignment = useGameStore((state) => state.updateAutoFireAlignment);
  const updateAutoFireLastShot = useGameStore((state) => state.updateAutoFireLastShot);
  const updateAutoFireDebug = useGameStore((state) => state.updateAutoFireDebug);
  const recordTargetingShot = useGameStore((state) => state.recordTargetingShot);
  const liveTargetingStats = useGameStore((state) => state.liveTargetingStats);
  const firstPersonMode = useGameStore((state) => state.firstPersonMode);
  const toggleFirstPersonMode = useGameStore((state) => state.toggleFirstPersonMode);
  
  const { camera, scene } = useThree();
  
  // Force re-render when target changes
  const [, forceUpdate] = useState(0);
  
  // Get missile speed for current weapon
  const getMissileSpeed = (weaponType) => {
    switch (weaponType) {
      case 'default': return 150;   // was 50, actual is 150
      case 'laser': return 200;     // was 80, actual is 200
      case 'chaingun': return 250;  // was 70, actual is 250
      case 'bfg': return 40;        // correct
      case 'rocket': return 150;    // was 45, actual is 150
      case 'charge': return 60;     // assuming same as before
      case 'bomb': return 60;       // was 30, actual is 60
      case 'railgun': return 400;   // was 120, actual is 400
      default: return 150;          // was 50, actual is 150
    }
  };
  
  // ORANGE DIAMOND: Enhanced Physics with Velocity Inheritance & Firing Delay
  const calculateAimPointOrange = (target, missileSpeed, camera) => {
    if (!target || !target.velocity) return null;
    
    // Enhanced Configuration
    const config = {
      missileInheritsVelocity: false, // Test: missiles don't inherit player velocity (arcade style)
      firingDelay: 0.05, // Account for 50ms firing delay
      missileSpawnOffset: { x: 0, y: 0, z: -3 }
    };
    
    // Target's current position and velocity
    const targetPos = new Vector3(target.position.x, target.position.y, target.position.z);
    const targetVel = new Vector3(target.velocity.x, target.velocity.y, target.velocity.z);
    const playerVel = new Vector3(playerVelocity.x, playerVelocity.y, playerVelocity.z);
    
    // Enhanced missile spawn calculation with firing delay compensation
    const missileSpawnOffset = new Vector3(config.missileSpawnOffset.x, config.missileSpawnOffset.y, config.missileSpawnOffset.z);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
    );
    missileSpawnOffset.applyMatrix4(rotationMatrix);
    
    // Account for player movement during firing delay
    const shooterPos = new Vector3(
      playerPosition.x + missileSpawnOffset.x + playerVel.x * config.firingDelay,
      playerPosition.y + missileSpawnOffset.y + playerVel.y * config.firingDelay,
      playerPosition.z + missileSpawnOffset.z + playerVel.z * config.firingDelay
    );
    
    // Calculate effective missile velocity and relative target velocity
    let effectiveMissileSpeed = missileSpeed;
    let relativeTargetVel;
    
    if (config.missileInheritsVelocity) {
      // Target velocity relative to moving reference frame
      relativeTargetVel = targetVel.clone().sub(playerVel);
      // Calculate effective missile speed (vector sum)
      const aimDirection = targetPos.clone().sub(shooterPos).normalize();
      const playerSpeedInDirection = playerVel.dot(aimDirection);
      effectiveMissileSpeed = Math.sqrt(missileSpeed * missileSpeed + playerSpeedInDirection * playerSpeedInDirection);
    } else {
      // Missile has fixed velocity in world space (arcade physics)
      relativeTargetVel = targetVel.clone();
      effectiveMissileSpeed = missileSpeed;
    }
    
    // Check if target is stationary
    const targetSpeed = targetVel.length();
    const isStationary = targetSpeed < 0.1;
    
    if (isStationary) {
      const distance = targetPos.distanceTo(shooterPos);
      return {
        point: targetPos.clone(),
        futurePos: targetPos.clone(),
        time: distance / effectiveMissileSpeed,
        distance: distance,
        closing: false,
        aimDirection: targetPos.clone().sub(shooterPos).normalize(),
        playerSpeed: playerVel.length(),
        targetSpeed: 0,
        projectionDistance: 0,
        isStationary: true
      };
    }
    
    // Enhanced quadratic solution with proper velocity handling
    const relativePos = targetPos.clone().sub(shooterPos);
    const a = relativeTargetVel.lengthSq() - effectiveMissileSpeed * effectiveMissileSpeed;
    const b = 2 * relativePos.dot(relativeTargetVel);
    const c = relativePos.lengthSq();
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) return null;
    
    let interceptTime = null;
    if (Math.abs(a) < 0.001) {
      if (Math.abs(b) > 0.001) {
        interceptTime = -c / b;
      }
    } else {
      const sqrtDisc = Math.sqrt(discriminant);
      const t1 = (-b - sqrtDisc) / (2 * a);
      const t2 = (-b + sqrtDisc) / (2 * a);
      
      if (t1 > 0 && t2 > 0) {
        interceptTime = Math.min(t1, t2);
      } else if (t1 > 0) {
        interceptTime = t1;
      } else if (t2 > 0) {
        interceptTime = t2;
      }
    }
    
    if (!interceptTime || interceptTime < 0 || interceptTime > 10) return null;
    
    const futureTargetPos = targetPos.clone().add(targetVel.clone().multiplyScalar(interceptTime));
    const aimPoint = futureTargetPos.clone();
    
    return {
      point: aimPoint,
      futurePos: futureTargetPos,
      time: interceptTime,
      distance: relativePos.length(),
      closing: relativePos.dot(relativeTargetVel) < 0,
      aimDirection: futureTargetPos.clone().sub(shooterPos).normalize(),
      playerSpeed: playerVel.length(),
      targetSpeed: targetSpeed,
      projectionDistance: aimPoint.distanceTo(shooterPos),
      isStationary: false
    };
  };
  
  // PURPLE DIAMOND: Iterative Refinement with Velocity Inheritance
  const calculateAimPointPurple = (target, missileSpeed, camera) => {
    if (!target || !target.velocity) return null;
    
    // Iterative Configuration
    const config = {
      missileInheritsVelocity: true, // Test: missiles DO inherit player velocity
      iterations: 3,
      firingDelay: 0.1, // Slightly longer delay
      missileSpawnOffset: { x: 0, y: 0, z: -3 }
    };
    
    const targetPos = new Vector3(target.position.x, target.position.y, target.position.z);
    const targetVel = new Vector3(target.velocity.x, target.velocity.y, target.velocity.z);
    const playerVel = new Vector3(playerVelocity.x, playerVelocity.y, playerVelocity.z);
    
    // Calculate enhanced shooter position
    const calculateShooterPosition = () => {
      const missileSpawnOffset = new Vector3(config.missileSpawnOffset.x, config.missileSpawnOffset.y, config.missileSpawnOffset.z);
      const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
      );
      missileSpawnOffset.applyMatrix4(rotationMatrix);
      
      return new Vector3(
        playerPosition.x + missileSpawnOffset.x + playerVel.x * config.firingDelay,
        playerPosition.y + missileSpawnOffset.y + playerVel.y * config.firingDelay,
        playerPosition.z + missileSpawnOffset.z + playerVel.z * config.firingDelay
      );
    };
    
    // Iterative refinement approach
    let estimatedInterceptTime = 0;
    let aimPoint = targetPos.clone();
    let shooterPos = calculateShooterPosition();
    
    for (let i = 0; i < config.iterations; i++) {
      // Calculate distance to current aim point
      const distance = aimPoint.distanceTo(shooterPos);
      
      // Calculate effective missile speed for this iteration
      let effectiveMissileSpeed = missileSpeed;
      if (config.missileInheritsVelocity) {
        const aimDirection = aimPoint.clone().sub(shooterPos).normalize();
        const playerSpeedInDirection = playerVel.dot(aimDirection);
        effectiveMissileSpeed = Math.sqrt(missileSpeed * missileSpeed + playerSpeedInDirection * playerSpeedInDirection);
      }
      
      // Estimate time to reach aim point
      estimatedInterceptTime = distance / effectiveMissileSpeed;
      
      // Calculate where target will be at intercept time
      const futureTargetPos = targetPos.clone().add(targetVel.clone().multiplyScalar(estimatedInterceptTime));
      
      // Update aim point for next iteration
      aimPoint = futureTargetPos;
    }
    
    // Check if target is stationary
    const targetSpeed = targetVel.length();
    const isStationary = targetSpeed < 0.1;
    
    if (isStationary) {
      const distance = targetPos.distanceTo(shooterPos);
      return {
        point: targetPos.clone(),
        futurePos: targetPos.clone(),
        time: distance / missileSpeed,
        distance: distance,
        closing: false,
        aimDirection: targetPos.clone().sub(shooterPos).normalize(),
        playerSpeed: playerVel.length(),
        targetSpeed: 0,
        projectionDistance: 0,
        isStationary: true
      };
    }
    
    // Final calculations
    const finalDistance = shooterPos.distanceTo(aimPoint);
    const relativeVel = config.missileInheritsVelocity ? 
      targetVel.clone().sub(playerVel) : 
      targetVel.clone();
    
    return {
      point: aimPoint,
      futurePos: aimPoint.clone(),
      time: estimatedInterceptTime,
      distance: finalDistance,
      closing: targetPos.clone().sub(shooterPos).dot(relativeVel) < 0,
      aimDirection: aimPoint.clone().sub(shooterPos).normalize(),
      playerSpeed: playerVel.length(),
      targetSpeed: targetSpeed,
      projectionDistance: finalDistance,
      isStationary: false
    };
  };
  
  // YELLOW DIAMOND: High-Speed Optimized with Velocity-Based Compensation
  const calculateAimPointYellow = (target, missileSpeed, camera) => {
    if (!target || !target.velocity) return null;
    
    // High-Speed Optimization Configuration
    const config = {
      velocityBasedOffset: true, // Adjust spawn offset based on player velocity
      highSpeedThreshold: 30, // Speed threshold for high-speed mode
      adaptiveFrameDelay: true, // Variable frame delay based on speed
      enhancedPrediction: true, // Use enhanced prediction for fast targets
      missileSpawnOffset: { x: 0, y: 0, z: -3 }
    };
    
    const targetPos = new Vector3(target.position.x, target.position.y, target.position.z);
    const targetVel = new Vector3(target.velocity.x, target.velocity.y, target.velocity.z);
    const playerVel = new Vector3(playerVelocity.x, playerVelocity.y, playerVelocity.z);
    
    // Calculate combined speed for high-speed detection
    const playerSpeed = playerVel.length();
    const targetSpeed = targetVel.length();
    const combinedSpeed = playerSpeed + targetSpeed;
    const isHighSpeed = combinedSpeed > config.highSpeedThreshold;
    
    // Enhanced missile spawn calculation with velocity-based offset
    const missileSpawnOffset = new Vector3(config.missileSpawnOffset.x, config.missileSpawnOffset.y, config.missileSpawnOffset.z);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
    );
    missileSpawnOffset.applyMatrix4(rotationMatrix);
    
    // Velocity-based offset adjustment for high-speed scenarios
    if (config.velocityBasedOffset && isHighSpeed) {
      const velocityOffset = playerVel.clone().multiplyScalar(0.1); // 10% of velocity as offset
      missileSpawnOffset.add(velocityOffset);
    }
    
    // Adaptive frame delay based on speed
    let frameDelay = 0.016; // Base 60fps delay
    if (config.adaptiveFrameDelay && isHighSpeed) {
      frameDelay += (combinedSpeed / 1000); // Add delay proportional to speed
    }
    
    const shooterPos = new Vector3(
      playerPosition.x + missileSpawnOffset.x + playerVel.x * frameDelay,
      playerPosition.y + missileSpawnOffset.y + playerVel.y * frameDelay,
      playerPosition.z + missileSpawnOffset.z + playerVel.z * frameDelay
    );
    
    // Enhanced relative velocity calculation
    const relativeTargetVel = targetVel.clone().sub(playerVel);
    
    // Check if target is stationary relative to player
    const relativeSpeed = relativeTargetVel.length();
    const isStationary = targetSpeed < 0.1 || relativeSpeed < 0.1;
    
    if (isStationary) {
      const distance = targetPos.distanceTo(shooterPos);
      return {
        point: targetPos.clone(),
        futurePos: targetPos.clone(),
        time: distance / missileSpeed,
        distance: distance,
        closing: false,
        aimDirection: targetPos.clone().sub(shooterPos).normalize(),
        playerSpeed: playerSpeed,
        targetSpeed: 0,
        projectionDistance: 0,
        isStationary: true
      };
    }
    
    // Enhanced quadratic solution with high-speed optimizations
    const relativePos = targetPos.clone().sub(shooterPos);
    
    // Adjust effective missile speed for high-speed scenarios
    let effectiveMissileSpeed = missileSpeed;
    if (isHighSpeed) {
      // Account for player velocity component in missile direction
      const aimDirection = relativePos.clone().normalize();
      const playerSpeedInDirection = playerVel.dot(aimDirection);
      effectiveMissileSpeed = missileSpeed + (playerSpeedInDirection * 0.8); // 80% velocity inheritance for high-speed
    }
    
    const a = relativeTargetVel.lengthSq() - effectiveMissileSpeed * effectiveMissileSpeed;
    const b = 2 * relativePos.dot(relativeTargetVel);
    const c = relativePos.lengthSq();
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) return null;
    
    let interceptTime = null;
    if (Math.abs(a) < 0.001) {
      if (Math.abs(b) > 0.001) {
        interceptTime = -c / b;
      }
    } else {
      const sqrtDisc = Math.sqrt(discriminant);
      const t1 = (-b - sqrtDisc) / (2 * a);
      const t2 = (-b + sqrtDisc) / (2 * a);
      
      if (t1 > 0 && t2 > 0) {
        interceptTime = Math.min(t1, t2);
      } else if (t1 > 0) {
        interceptTime = t1;
      } else if (t2 > 0) {
        interceptTime = t2;
      }
    }
    
    if (!interceptTime || interceptTime < 0 || interceptTime > 10) return null;
    
    // Enhanced future position calculation
    const futureTargetPos = targetPos.clone().add(targetVel.clone().multiplyScalar(interceptTime));
    const aimPoint = futureTargetPos.clone();
    
    return {
      point: aimPoint,
      futurePos: futureTargetPos,
      time: interceptTime,
      distance: relativePos.length(),
      closing: relativePos.dot(relativeTargetVel) < 0,
      aimDirection: aimPoint.clone().sub(shooterPos).normalize(),
      playerSpeed: playerSpeed,
      targetSpeed: targetSpeed,
      projectionDistance: aimPoint.distanceTo(shooterPos),
      isStationary: false
    };
  };
  
  // CYAN DIAMOND: Iterative High-Precision with Adaptive Refinement
  const calculateAimPointCyan = (target, missileSpeed, camera) => {
    if (!target || !target.velocity) return null;
    
    // Iterative High-Precision Configuration
    const config = {
      maxIterations: 5, // More iterations for better accuracy
      convergenceThreshold: 0.1, // Stop when prediction stabilizes
      adaptiveIterations: true, // Use more iterations for complex scenarios
      precisionMode: true, // Enable high-precision calculations
      missileSpawnOffset: { x: 0, y: 0, z: -3 }
    };
    
    const targetPos = new Vector3(target.position.x, target.position.y, target.position.z);
    const targetVel = new Vector3(target.velocity.x, target.velocity.y, target.velocity.z);
    const playerVel = new Vector3(playerVelocity.x, playerVelocity.y, playerVelocity.z);
    
    // Calculate scenario complexity for adaptive iterations
    const playerSpeed = playerVel.length();
    const targetSpeed = targetVel.length();
    const relativeVel = targetVel.clone().sub(playerVel);
    const relativeSpeed = relativeVel.length();
    const complexity = (playerSpeed + targetSpeed + relativeSpeed) / 3;
    
    // Adaptive iteration count based on scenario complexity
    let iterations = config.maxIterations;
    if (config.adaptiveIterations) {
      iterations = Math.min(config.maxIterations, Math.max(2, Math.ceil(complexity / 10)));
    }
    
    // Enhanced missile spawn calculation
    const missileSpawnOffset = new Vector3(config.missileSpawnOffset.x, config.missileSpawnOffset.y, config.missileSpawnOffset.z);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
    );
    missileSpawnOffset.applyMatrix4(rotationMatrix);
    
    const shooterPos = new Vector3(
      playerPosition.x + missileSpawnOffset.x,
      playerPosition.y + missileSpawnOffset.y,
      playerPosition.z + missileSpawnOffset.z
    );
    
    // Check if target is stationary
    const isStationary = targetSpeed < 0.1;
    
    if (isStationary) {
      const distance = targetPos.distanceTo(shooterPos);
      return {
        point: targetPos.clone(),
        futurePos: targetPos.clone(),
        time: distance / missileSpeed,
        distance: distance,
        closing: false,
        aimDirection: targetPos.clone().sub(shooterPos).normalize(),
        playerSpeed: playerSpeed,
        targetSpeed: 0,
        projectionDistance: 0,
        isStationary: true
      };
    }
    
    // Iterative refinement with convergence detection
    let estimatedInterceptTime = 0;
    let aimPoint = targetPos.clone();
    let previousAimPoint = null;
    
    for (let i = 0; i < iterations; i++) {
      // Store previous aim point for convergence check
      previousAimPoint = aimPoint.clone();
      
      // Calculate distance to current aim point
      const distance = aimPoint.distanceTo(shooterPos);
      
      // Enhanced missile speed calculation with player velocity consideration
      let effectiveMissileSpeed = missileSpeed;
      const aimDirection = aimPoint.clone().sub(shooterPos).normalize();
      const playerSpeedInDirection = playerVel.dot(aimDirection);
      
      // Precise velocity inheritance calculation
      if (config.precisionMode) {
        effectiveMissileSpeed = Math.sqrt(missileSpeed * missileSpeed + playerSpeedInDirection * playerSpeedInDirection);
      }
      
      // Estimate time to reach aim point
      estimatedInterceptTime = distance / effectiveMissileSpeed;
      
      // Calculate where target will be at intercept time with relative velocity
      const futureTargetPos = targetPos.clone().add(targetVel.clone().multiplyScalar(estimatedInterceptTime));
      
      // Update aim point for next iteration
      aimPoint = futureTargetPos;
      
      // Check for convergence
      if (previousAimPoint && config.convergenceThreshold) {
        const convergenceDistance = aimPoint.distanceTo(previousAimPoint);
        if (convergenceDistance < config.convergenceThreshold) {
          break; // Converged early
        }
      }
    }
    
    // Final calculations
    const finalDistance = shooterPos.distanceTo(aimPoint);
    
    return {
      point: aimPoint,
      futurePos: aimPoint.clone(),
      time: estimatedInterceptTime,
      distance: finalDistance,
      closing: targetPos.clone().sub(shooterPos).dot(relativeVel) < 0,
      aimDirection: aimPoint.clone().sub(shooterPos).normalize(),
      playerSpeed: playerSpeed,
      targetSpeed: targetSpeed,
      projectionDistance: finalDistance,
      isStationary: false
    };
  };

  // BLUE DIAMOND: Alternative Physics Model with Camera-Based Calculation
  const calculateAimPointBlue = (target, missileSpeed, camera) => {
    if (!target || !target.velocity) return null;
    
    // Alternative Physics Configuration
    const config = {
      useCameraPosition: true, // Test: use camera as reference point
      useRelativeVelocity: true, // Test: use relative velocity calculation
      accountForFrameDelay: true, // Test: account for frame processing delay
      frameDelay: 0.016, // 60fps = 16ms delay
      missileSpawnOffset: { x: 0, y: 0, z: -2.5 } // Slightly different offset
    };
    
    const targetPos = new Vector3(target.position.x, target.position.y, target.position.z);
    const targetVel = new Vector3(target.velocity.x, target.velocity.y, target.velocity.z);
    const playerVel = new Vector3(playerVelocity.x, playerVelocity.y, playerVelocity.z);
    
    // Calculate shooter position using alternative method
    let shooterPos;
    if (config.useCameraPosition) {
      // Use camera position with minimal offset
      const cameraDirection = new Vector3();
      camera.getWorldDirection(cameraDirection);
      shooterPos = camera.position.clone().add(cameraDirection.multiplyScalar(-2.5));
    } else {
      // Use enhanced player position calculation
      const missileSpawnOffset = new Vector3(config.missileSpawnOffset.x, config.missileSpawnOffset.y, config.missileSpawnOffset.z);
      const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
      );
      missileSpawnOffset.applyMatrix4(rotationMatrix);
      
      shooterPos = new Vector3(
        playerPosition.x + missileSpawnOffset.x,
        playerPosition.y + missileSpawnOffset.y,
        playerPosition.z + missileSpawnOffset.z
      );
    }
    
    // Account for frame processing delay
    if (config.accountForFrameDelay) {
      shooterPos.add(playerVel.clone().multiplyScalar(config.frameDelay));
    }
    
    // Calculate relative velocity using alternative model
    let relativeTargetVel;
    if (config.useRelativeVelocity) {
      // Use relative velocity between target and player
      relativeTargetVel = targetVel.clone().sub(playerVel);
    } else {
      // Use target's absolute velocity
      relativeTargetVel = targetVel.clone();
    }
    
    // Check if target is stationary
    const targetSpeed = targetVel.length();
    const relativeSpeed = relativeTargetVel.length();
    const isStationary = targetSpeed < 0.1 || relativeSpeed < 0.1;
    
    if (isStationary) {
      const distance = targetPos.distanceTo(shooterPos);
      return {
        point: targetPos.clone(),
        futurePos: targetPos.clone(),
        time: distance / missileSpeed,
        distance: distance,
        closing: false,
        aimDirection: targetPos.clone().sub(shooterPos).normalize(),
        playerSpeed: playerVel.length(),
        targetSpeed: 0,
        projectionDistance: 0,
        isStationary: true
      };
    }
    
    // Enhanced quadratic solution with alternative physics
    const relativePos = targetPos.clone().sub(shooterPos);
    
    // Calculate effective missile speed considering player velocity
    let effectiveMissileSpeed = missileSpeed;
    if (config.useRelativeVelocity) {
      // Adjust missile speed based on player movement direction
      const aimDirection = relativePos.clone().normalize();
      const playerSpeedInDirection = playerVel.dot(aimDirection);
      // Missiles fire at fixed speed but player movement affects relative effectiveness
      effectiveMissileSpeed = missileSpeed + playerSpeedInDirection;
    }
    
    const a = relativeTargetVel.lengthSq() - effectiveMissileSpeed * effectiveMissileSpeed;
    const b = 2 * relativePos.dot(relativeTargetVel);
    const c = relativePos.lengthSq();
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) return null;
    
    let interceptTime = null;
    if (Math.abs(a) < 0.001) {
      if (Math.abs(b) > 0.001) {
        interceptTime = -c / b;
      }
    } else {
      const sqrtDisc = Math.sqrt(discriminant);
      const t1 = (-b - sqrtDisc) / (2 * a);
      const t2 = (-b + sqrtDisc) / (2 * a);
      
      if (t1 > 0 && t2 > 0) {
        interceptTime = Math.min(t1, t2);
      } else if (t1 > 0) {
        interceptTime = t1;
      } else if (t2 > 0) {
        interceptTime = t2;
      }
    }
    
    if (!interceptTime || interceptTime < 0 || interceptTime > 10) return null;
    
    // Calculate future target position using relative velocity
    const futureTargetPos = targetPos.clone().add(targetVel.clone().multiplyScalar(interceptTime));
    const aimPoint = futureTargetPos.clone();
    
    return {
      point: aimPoint,
      futurePos: futureTargetPos,
      time: interceptTime,
      distance: relativePos.length(),
      closing: relativePos.dot(relativeTargetVel) < 0,
      aimDirection: aimPoint.clone().sub(shooterPos).normalize(),
      playerSpeed: playerVel.length(),
      targetSpeed: targetSpeed,
      projectionDistance: aimPoint.distanceTo(shooterPos),
      isStationary: false
    };
  };
  
  // Get crosshair color based on targeting mode
  const getCrosshairColor = () => {
    switch (targetingMode) {
      case 'blue':
        return '#0088ff';
      case 'yellow':
        return '#ffff00';
      case 'cyan':
        return '#00ffff';
      // Legacy modes (commented out but kept for antiquity)
      // case 'orange':
      //   return '#ff8800';
      // case 'purple':
      //   return '#8800ff';
      default:
        return '#0088ff';
    }
  };
  
  // Master calculation function that chooses method based on targeting mode
  const calculateAimPoint = (target, missileSpeed, camera) => {
    switch (targetingMode) {
      case 'blue':
        return calculateAimPointBlue(target, missileSpeed, camera);
      case 'yellow':
        return calculateAimPointYellow(target, missileSpeed, camera);
      case 'cyan':
        return calculateAimPointCyan(target, missileSpeed, camera);
      // Legacy modes (commented out but kept for antiquity)
      // case 'orange':
      //   return calculateAimPointOrange(target, missileSpeed, camera);
      // case 'purple':
      //   return calculateAimPointPurple(target, missileSpeed, camera);
      default:
        return calculateAimPointBlue(target, missileSpeed, camera);
    }
  };
  
  // Find targets near screen center or cycle through all targets
  const findTargets = () => {
    const validTargets = aliens.filter(alien => 
      alien && 
      !alien.isSpawning && 
      alien.health > 0 &&
      alien.position.z < playerPosition.z // Only targets in front
    );
    
    // Calculate screen positions for all targets
    const targetsWithScreenPos = validTargets.map(alien => {
      const worldPos = new Vector3(alien.position.x, alien.position.y, alien.position.z);
      const screenPos = worldPos.clone().project(camera);
      
      const distance = worldPos.distanceTo(new Vector3(playerPosition.x, playerPosition.y, playerPosition.z));
      
      return {
        alien,
        screenPos,
        distance,
        screenDistance: Math.sqrt(screenPos.x * screenPos.x + screenPos.y * screenPos.y)
      };
    });
    
    // Sort by distance from screen center
    targetsWithScreenPos.sort((a, b) => a.screenDistance - b.screenDistance);
    
    return targetsWithScreenPos;
  };
  
  // Handle T key for cycling targeting modes and Esc for closing validation
  useEffect(() => {
    if (gameMode !== 'freeflight' || !freeLookMode) return;
    
    const handleKeyDown = (e) => {
      // T key - Cycle through targeting modes or disable
      if (e.key === 't' || e.key === 'T') {
        if (!tPressedRef.current) {
          tPressedRef.current = true;
          if (!targetingEnabled) {
            // Enable targeting with blue mode (default)
            setTargetingEnabled(true);
            setTargetingMode('blue');
            enableLiveTargetingStats();
            console.log('[TARGETING] Advanced targeting enabled - Blue mode');
          } else {
            // Cycle through modes: blue -> yellow -> cyan -> disable
            if (targetingMode === 'blue') {
              cycleTargetingMode();
              console.log('[TARGETING] Switched to Yellow mode');
            } else if (targetingMode === 'yellow') {
              cycleTargetingMode();
              console.log('[TARGETING] Switched to Cyan mode');
            } else {
              // Cyan mode -> disable
              setTargetingEnabled(false);
              setSelectedTarget(null);
              setTargetLock(false);
              console.log('[TARGETING] Advanced targeting disabled');
            }
          }
        }
      }
      
      // Esc key closes validation results
      if (e.key === 'Escape' && validationResults) {
        clearValidationResults();
        console.log('[TARGETING VALIDATION] Results closed');
      }
      
      // O key toggles first-person cockpit mode
      if (e.key === 'o' || e.key === 'O') {
        toggleFirstPersonMode();
        console.log(`[FIRST PERSON] Cockpit mode ${firstPersonMode ? 'disabled' : 'enabled'}`);
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 't' || e.key === 'T') {
        tPressedRef.current = false;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameMode, freeLookMode, targetingEnabled, targetingMode, validationResults, firstPersonMode, toggleFirstPersonMode]);
  
  // Handle TAB key for target cycling and V key for validation
  useEffect(() => {
    if (!targetingEnabled) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Tab' && !tabPressedRef.current) {
        e.preventDefault();
        tabPressedRef.current = true;
        
        const targets = findTargets();
        if (targets.length === 0) {
          setSelectedTarget(null);
          setTargetLock(false);
          return;
        }
        
        if (!selectedTarget) {
          // Select the target closest to screen center
          setSelectedTarget(targets[0].alien);
          setTargetLock(true);
          setCurrentLiveTarget(targets[0].alien);
          forceUpdate(prev => prev + 1); // Force re-render
        } else {
          // Cycle to next target
          const currentIndex = targets.findIndex(t => t.alien.id === selectedTarget.id);
          const nextIndex = (currentIndex + 1) % targets.length;
          setSelectedTarget(targets[nextIndex].alien);
          setCurrentLiveTarget(targets[nextIndex].alien);
          setTargetLock(true);
          forceUpdate(prev => prev + 1); // Force re-render
        }
      }
      
      // V key for validation tests
      if ((e.key === 'v' || e.key === 'V')) {
        if (!validationResults) {
          console.log('[TARGETING VALIDATION] Starting automated validation tests...');
          const validationSystem = validationSystemRef.current;
          
          // Run validation tests with all three algorithms
          validationSystem.runValidationTests({
            calculateAimPointBlue,
            calculateAimPointYellow,
            calculateAimPointCyan
          }).then(results => {
            setValidationResults(results);
            console.log('[TARGETING VALIDATION] Tests completed:', results);
          }).catch(error => {
            console.error('[TARGETING VALIDATION] Test failed:', error);
          });
        } else {
          // Run new tests if results already displayed
          console.log('[TARGETING VALIDATION] Re-running validation tests...');
          clearValidationResults(); // Clear previous results
          const validationSystem = validationSystemRef.current;
          
          validationSystem.runValidationTests({
            calculateAimPointBlue,
            calculateAimPointYellow,
            calculateAimPointCyan
          }).then(results => {
            setValidationResults(results);
            console.log('[TARGETING VALIDATION] Tests completed:', results);
          }).catch(error => {
            console.error('[TARGETING VALIDATION] Test failed:', error);
          });
        }
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'Tab') {
        tabPressedRef.current = false;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedTarget, aliens, playerPosition, camera, targetingEnabled, validationResults]);
  
  // Handle Y key for auto-fire targeting and U key for live targeting stats
  useEffect(() => {
    if (!targetingEnabled) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'y' || e.key === 'Y') {
        toggleAutoFireTargeting();
        console.log(`[AUTO-FIRE] ${autoFireTargeting.enabled ? 'Disabled' : 'Enabled'}`);
      } else if (e.key === 'u' || e.key === 'U') {
        const gameStore = useGameStore.getState();
        if (gameStore.liveTargetingStats.enabled) {
          gameStore.disableLiveTargetingStats();
          console.log('[LIVE STATS] Live targeting stats disabled');
        } else {
          gameStore.enableLiveTargetingStats();
          console.log('[LIVE STATS] Live targeting stats enabled');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetingEnabled, autoFireTargeting.enabled, toggleAutoFireTargeting]);
  
  // Log alignment data when manually firing (mouse1 click)
  useEffect(() => {
    if (!autoFireTargeting.enabled || !targetingEnabled) return;
    
    const handleMouseClick = (e) => {
      if (e.button === 0) { // Left mouse button (mouse1)
        console.log('🎯 [MANUAL FIRE ALIGNMENT DATA]', window.currentAlignmentData || 'No alignment data available');
      }
    };
    
    window.addEventListener('mousedown', handleMouseClick);
    
    return () => {
      window.removeEventListener('mousedown', handleMouseClick);
    };
  }, [autoFireTargeting.enabled, targetingEnabled]);
  
  // Update selected target if it dies or moves out of range
  useEffect(() => {
    if (selectedTarget) {
      const target = aliens.find(a => a.id === selectedTarget.id);
      if (!target || target.health <= 0) {
        setSelectedTarget(null);
        setTargetLock(false);
      }
    }
  }, [aliens, selectedTarget]);
  
  // Calculate prediction for selected target
  const prediction = useMemo(() => {
    if (!selectedTarget || !targetLock || !targetingEnabled) return null;
    
    const target = aliens.find(a => a.id === selectedTarget.id);
    if (!target) return null;
    
    const missileSpeed = getMissileSpeed(weapons.current);
    return calculateAimPoint(target, missileSpeed, camera);
  }, [selectedTarget, targetLock, aliens, weapons.current, playerPosition, playerVelocity, targetingEnabled, targetingMode, camera]);

  // Update prediction data in store for UI access
  useEffect(() => {
    setTargetPrediction(prediction);
  }, [prediction, setTargetPrediction]);
  
  // Auto-fire alignment detection and firing logic
  useEffect(() => {
    if (!autoFireTargeting.enabled || !selectedTarget || !targetLock || !prediction) {
      previousAlignmentRef.current = null;
      updateAutoFireDebug({
        currentAlignment: 0,
        isAligned: false,
        alignmentProgress: 0,
        stabilityProgress: 0
      });
      return;
    }
    
    // Calculate where the ship is actually aiming by projecting missile trajectory
    // This matches exactly where a manually fired missile would go
    const missileSpawnOffset = new Vector3(0, 0, -3);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
    );
    missileSpawnOffset.applyMatrix4(rotationMatrix);
    
    const missileSpawnPos = new Vector3(
      playerPosition.x + missileSpawnOffset.x,
      playerPosition.y + missileSpawnOffset.y,
      playerPosition.z + missileSpawnOffset.z
    );
    
    // Ship's nose points in negative Z direction
    const shipDirection = new Vector3(0, 0, -1);
    shipDirection.applyMatrix4(rotationMatrix);
    
    // Calculate engagement distance (matching FreeFlightCrosshair.js)
    const currentWeapon = weapons.current;
    let engagementDistance = currentWeapon === 'bfg' ? 100 : 60;
    
    // Apply same zoom adjustment as crosshair
    const isZoomed = useGameStore.getState().isZoomed;
    const zoomFOV = useGameStore.getState().zoomFOV;
    const options = useGameStore.getState().options;
    
    if (isZoomed) {
      const zoomFactor = options.fov / zoomFOV;
      engagementDistance *= zoomFactor;
    }
    
    // Calculate ship aiming direction
    const shipAimDirection = shipDirection.clone().normalize();
    
    // Calculate required aiming direction to hit target
    const requiredAimDirection = new Vector3(prediction.point.x, prediction.point.y, prediction.point.z)
      .sub(missileSpawnPos).normalize();
    
    // Calculate angular difference between ship direction and required direction
    const dotProduct = shipAimDirection.dot(requiredAimDirection);
    const angleDifference = Math.acos(Math.max(-1, Math.min(1, dotProduct))); // Clamp for safety
    
    // Convert to degrees for easier understanding
    const angleDifferenceDegs = angleDifference * 180 / Math.PI;
    
    // Alignment based on angular accuracy (not distance)
    const alignmentThreshold = 2.0; // 2 degrees tolerance
    const worldDistance = angleDifferenceDegs;
    
    // Use angular threshold instead of distance
    const isAligned = worldDistance <= alignmentThreshold;
    
    // Calculate alignment progress (0-100%)
    const alignmentProgress = Math.max(0, (1 - (worldDistance / alignmentThreshold)) * 100);
    
    // Calculate stability progress
    const stabilityProgress = (autoFireTargeting.alignmentHistory.length / autoFireTargeting.stabilityRequired) * 100;
    
    // Update debug information
    updateAutoFireDebug({
      currentAlignment: worldDistance,
      isAligned: isAligned,
      alignmentProgress: Math.min(100, alignmentProgress),
      stabilityProgress: Math.min(100, stabilityProgress)
    });
    
    // Calculate crosshair positions for manual fire logging
    const freeLookCrosshairPos = missileSpawnPos.clone().add(shipAimDirection.clone().multiplyScalar(engagementDistance));
    const predictiveWorldPos = new Vector3(prediction.point.x, prediction.point.y, prediction.point.z);
    const worldThreshold = alignmentThreshold;
    
    // Store current alignment data for manual fire logging
    window.currentAlignmentData = {
      freeLookPos: freeLookCrosshairPos.toArray().map(n => n.toFixed(1)),
      predictivePos: predictiveWorldPos.toArray().map(n => n.toFixed(1)),
      worldDistance: worldDistance.toFixed(2),
      threshold: worldThreshold,
      isAligned,
      alignmentProgress: alignmentProgress.toFixed(1) + '%',
      stabilityProgress: stabilityProgress.toFixed(1) + '%',
      alignmentHistory: autoFireTargeting.alignmentHistory,
      playerPosition: [playerPosition.x.toFixed(1), playerPosition.y.toFixed(1), playerPosition.z.toFixed(1)],
      playerRotation: [playerRotation.x.toFixed(3), playerRotation.y.toFixed(3), playerRotation.z.toFixed(3)],
      targetPosition: selectedTarget ? [selectedTarget.position.x.toFixed(1), selectedTarget.position.y.toFixed(1), selectedTarget.position.z.toFixed(1)] : null,
      targetVelocity: selectedTarget ? [selectedTarget.velocity.x.toFixed(1), selectedTarget.velocity.y.toFixed(1), selectedTarget.velocity.z.toFixed(1)] : null,
      weaponType: weapons.current,
      targetingMode: targetingMode
    };
    
    // Only update if alignment state has changed to prevent infinite loops
    if (previousAlignmentRef.current !== isAligned) {
      previousAlignmentRef.current = isAligned;
      updateAutoFireAlignment(isAligned);
    }
    
    // Check if we should fire (only if currently aligned)
    if (isAligned) {
      const currentTime = Date.now();
      const timeSinceLastFire = currentTime - autoFireTargeting.lastFireTime;
      const hasStableAlignment = autoFireTargeting.alignmentHistory.length >= autoFireTargeting.stabilityRequired &&
        autoFireTargeting.alignmentHistory.every(aligned => aligned);
      
      if (hasStableAlignment && timeSinceLastFire >= autoFireTargeting.fireDelay * 1000) {
        // Trigger auto-fire
        console.log('[AUTO-FIRE] 🔥 FIRING! Crosshairs perfectly aligned!');
        
        // Record the shot for live targeting stats
        if (liveTargetingStats.enabled) {
          recordTargetingShot({
            timestamp: currentTime,
            distance: prediction.distance,
            hit: false, // Will be updated by collision detection
            targetId: selectedTarget.id,
            manual: false // Auto-fire shot
          });
        }
        
        // Update last fire time
        updateAutoFireLastShot();
        
        // Integrate with actual firing system by simulating mouse click
        const fireKeyPressed = new KeyboardEvent('keydown', {
          key: 'MouseLeft',
          code: 'MouseLeft',
          bubbles: true,
          cancelable: true
        });
        
        // Set auto-fire flag in global game keys to trigger weapon system
        if (typeof document._gameKeys === 'undefined') {
          document._gameKeys = {};
        }
        
        // Simulate mouse click for auto-fire (brief pulse)
        document._gameKeys.MouseLeft = true;
        console.log('[AUTO-FIRE] 🔥 FIRING! Crosshairs perfectly aligned - triggering weapon system');
        
        // Clear the auto-fire trigger after a brief moment to simulate click
        setTimeout(() => {
          if (document._gameKeys) {
            document._gameKeys.MouseLeft = false;
          }
        }, 50); // 50ms pulse
      }
    }
  }, [prediction]);
  
  // Get all nearby targets for hover detection
  const nearbyTargets = useMemo(() => {
    if (!targetingEnabled) return [];
    return findTargets()
      .filter(t => t.screenDistance < 0.3 && t.distance < 200)
      .slice(0, 5); // Limit to 5 nearest targets
  }, [aliens, playerPosition, camera, targetingEnabled]);
  
  // Only render if in free flight mode with free look and targeting enabled
  if (gameMode !== 'freeflight' || !freeLookMode || !targetingEnabled) return null;
  
  return (
    <>
      {/* Render targeting boxes for nearby enemies */}
      {nearbyTargets.map(({ alien, distance }) => (
        <group key={`nearby-${alien.id}`} position={[alien.position.x, alien.position.y, alien.position.z]}>
          {/* Target bracket */}
          <mesh>
            <boxGeometry args={[3, 3, 3]} />
            <meshBasicMaterial 
              color={selectedTarget?.id === alien.id ? "#00ff00" : "#ffffff"}
              wireframe
              transparent
              opacity={selectedTarget?.id === alien.id ? 0.4 : 0.3}
              linewidth={2}
            />
          </mesh>
          
          {/* Velocity vector for selected target */}
          {selectedTarget?.id === alien.id && alien.velocity && (
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    0, 0, 0,
                    alien.velocity.x * 3, alien.velocity.y * 3, alien.velocity.z * 3
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#00ff00" transparent opacity={0.8} linewidth={3} />
            </line>
          )}
          
          {/* Distance and info display - positioned to the right */}
          <Html position={[3, 0, 0]}>
            <div style={{
              color: selectedTarget?.id === alien.id ? '#00ff00' : '#ffffff',
              fontSize: '12px',
              fontFamily: 'monospace',
              backgroundColor: selectedTarget?.id === alien.id ? 'transparent' : 'rgba(0,0,0,0.5)',
              padding: selectedTarget?.id === alien.id ? '2px 0px' : '2px 4px',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
              opacity: selectedTarget?.id === alien.id ? 1 : 0.6,
              marginLeft: selectedTarget?.id === alien.id ? '40px' : '10px'
            }}>
              <div>{Math.floor(distance)}m</div>
              {selectedTarget?.id === alien.id && (
                <>
                  <div>HP: {alien.health}/{alien.maxHealth}</div>
                  <div>Type: {alien.type}</div>
                </>
              )}
            </div>
          </Html>
        </group>
      ))}
      
      {/* Star Citizen-style aim indicator for selected target */}
      {selectedTarget && targetLock && prediction && (
        <>
          
          {/* Aim indicator (where to point your crosshair) */}
          {prediction.isStationary ? (
            // For stationary targets, place indicator directly on target
            // Use a simple mesh instead of a group
            <>
              <mesh position={[selectedTarget.position.x, selectedTarget.position.y, selectedTarget.position.z]}>
                <ringGeometry args={[0.8, 1, 32]} />
                <meshBasicMaterial 
                  color={getCrosshairColor()}
                  transparent
                  opacity={0.9}
                  side={THREE.DoubleSide}
                />
              </mesh>
              
              <mesh position={[selectedTarget.position.x, selectedTarget.position.y, selectedTarget.position.z]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial 
                  color={getCrosshairColor()}
                  transparent
                  opacity={1}
                />
              </mesh>
              
              {/* Corner markers as separate meshes */}
              <mesh position={[selectedTarget.position.x + 0.7, selectedTarget.position.y + 0.7, selectedTarget.position.z]}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial color={getCrosshairColor()} />
              </mesh>
              <mesh position={[selectedTarget.position.x - 0.7, selectedTarget.position.y + 0.7, selectedTarget.position.z]}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial color={getCrosshairColor()} />
              </mesh>
              <mesh position={[selectedTarget.position.x + 0.7, selectedTarget.position.y - 0.7, selectedTarget.position.z]}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial color={getCrosshairColor()} />
              </mesh>
              <mesh position={[selectedTarget.position.x - 0.7, selectedTarget.position.y - 0.7, selectedTarget.position.z]}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial color={getCrosshairColor()} />
              </mesh>
              
              {/* White center reference */}
              <mesh position={[selectedTarget.position.x, selectedTarget.position.y, selectedTarget.position.z]}>
                <boxGeometry args={[0.05, 0.05, 0.05]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              
              {/* Distance display only */}
              <Html position={[0, -2, 0]}>
                <div style={{
                  color: getCrosshairColor(),
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(0,0,0,0)', // 100% transparent
                  padding: '2px 4px',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap',
                  textAlign: 'center'
                }}>
                  <div>D: {Math.floor(prediction.distance)}m</div>
                </div>
              </Html>
            </>
          ) : (
            // For moving targets, use the complex predictive indicator
            <group position={[prediction.point.x, prediction.point.y, prediction.point.z]}>
              {/* Billboard group that always faces camera */}
              <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
                {/* Scale the indicator based on distance to maintain consistent screen size */}
                <group scale={prediction.projectionDistance / 40}>
                  {/* Black backdrop for visibility */}
                  <mesh rotation={[0, 0, Math.PI / 4]}>
                    <boxGeometry args={[2, 2, 0.05]} />
                    <meshBasicMaterial 
                      color="#000000"
                      transparent
                      opacity={0.7}
                    />
                  </mesh>
                  
                  {/* Diamond-shaped aim indicator */}
                  <mesh rotation={[0, 0, Math.PI / 4]}>
                    <boxGeometry args={[1.8, 1.8, 0.1]} />
                    <meshBasicMaterial 
                      color={getCrosshairColor()}
                      wireframe
                      transparent
                      opacity={0.5}
                      linewidth={3}
                    />
                  </mesh>
                  
                  {/* Inner diamond */}
                  <mesh rotation={[0, 0, Math.PI / 4]}>
                    <boxGeometry args={[1, 1, 0.1]} />
                    <meshBasicMaterial 
                      color={getCrosshairColor()}
                      wireframe
                      transparent
                      opacity={0.4}
                      linewidth={2}
                    />
                  </mesh>
                  
                  {/* Center dot */}
                  <mesh>
                    <sphereGeometry args={[0.15, 8, 8]} />
                    <meshBasicMaterial 
                      color={getCrosshairColor()}
                      transparent
                      opacity={1}
                    />
                  </mesh>
                </group>
              </Billboard>
              
              {/* Distance display only */}
              <Html position={[0, -1.5, 0]}>
                <div style={{
                  color: getCrosshairColor(),
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(0,0,0,0)', // 100% transparent
                  padding: '2px 4px',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap',
                  textAlign: 'center'
                }}>
                  <div>D: {Math.floor(prediction.distance)}m</div>
                </div>
              </Html>
            </group>
          )}
          
        </>
      )}
      
    </>
  );
}

export default AdvancedTargeting;