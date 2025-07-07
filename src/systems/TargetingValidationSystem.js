/**
 * Automated Targeting Validation System
 * 
 * Creates controlled test scenarios to mathematically validate
 * which targeting algorithm produces the most accurate predictions.
 * 
 * Uses the actual missile physics system to simulate and measure hits.
 */

import * as THREE from 'three';

export class TargetingValidationSystem {
  constructor() {
    this.testResults = {
      blue: { hits: 0, misses: 0, totalError: 0, tests: 0, detailedResults: [] },
      yellow: { hits: 0, misses: 0, totalError: 0, tests: 0, detailedResults: [] },
      cyan: { hits: 0, misses: 0, totalError: 0, tests: 0, detailedResults: [] }
      // Legacy algorithms (commented out but kept for antiquity)
      // orange: { hits: 0, misses: 0, totalError: 0, tests: 0, detailedResults: [] },
      // purple: { hits: 0, misses: 0, totalError: 0, tests: 0, detailedResults: [] }
    };
    
    this.isRunning = false;
    this.currentTest = 0;
    this.testScenarios = [];
    
    // Test configuration
    this.config = {
      testCount: 30, // Run 30 tests per algorithm
      hitThreshold: 3.0, // Distance threshold for considering a "hit"
      maxSimulationTime: 10, // Max seconds to simulate
      simulationTimeStep: 0.016, // 60fps simulation
    };
    
    this.generateTestScenarios();
  }
  
  /**
   * Generate a variety of test scenarios with known, predictable outcomes
   */
  generateTestScenarios() {
    this.testScenarios = [
      // Stationary target tests
      ...this.generateStationaryTargetTests(),
      
      // Linear motion tests
      ...this.generateLinearMotionTests(),
      
      // Player movement tests
      ...this.generatePlayerMovementTests(),
      
      // Complex movement tests
      ...this.generateComplexMovementTests(),
      
      // High-speed distance tests
      ...this.generateHighSpeedDistanceTests(),
    ];
  }
  
  generateStationaryTargetTests() {
    const tests = [];
    
    // Various distances and positions
    const positions = [
      { x: 0, y: 0, z: -50 },   // Straight ahead, close
      { x: 0, y: 0, z: -100 },  // Straight ahead, medium
      { x: 20, y: 10, z: -75 }, // Off-axis
      { x: -15, y: -8, z: -60 }, // Off-axis negative
    ];
    
    positions.forEach((targetPos, i) => {
      tests.push({
        name: `Stationary_${i}`,
        playerPosition: { x: 0, y: 0, z: 0 },
        playerVelocity: { x: 0, y: 0, z: 0 },
        playerRotation: { x: 0, y: 0, z: 0 },
        targetPosition: targetPos,
        targetVelocity: { x: 0, y: 0, z: 0 },
        weaponType: 'laser',
        expectedResult: 'hit' // Stationary targets should always hit
      });
    });
    
    return tests;
  }
  
  generateLinearMotionTests() {
    const tests = [];
    
    // Target moving in predictable linear patterns
    const scenarios = [
      // Target moving laterally
      {
        targetPos: { x: -30, y: 0, z: -80 },
        targetVel: { x: 15, y: 0, z: 0 }, // Moving right at 15 units/sec
        name: 'Linear_Lateral'
      },
      
      // Target moving away
      {
        targetPos: { x: 0, y: 0, z: -60 },
        targetVel: { x: 0, y: 0, z: -20 }, // Moving away at 20 units/sec
        name: 'Linear_Away'
      },
      
      // Target moving toward player
      {
        targetPos: { x: 0, y: 0, z: -120 },
        targetVel: { x: 0, y: 0, z: 25 }, // Moving toward at 25 units/sec
        name: 'Linear_Toward'
      },
      
      // Target moving diagonally
      {
        targetPos: { x: -20, y: -10, z: -90 },
        targetVel: { x: 12, y: 8, z: -5 }, // Diagonal movement
        name: 'Linear_Diagonal'
      },
    ];
    
    scenarios.forEach(scenario => {
      tests.push({
        name: scenario.name,
        playerPosition: { x: 0, y: 0, z: 0 },
        playerVelocity: { x: 0, y: 0, z: 0 },
        playerRotation: { x: 0, y: 0, z: 0 },
        targetPosition: scenario.targetPos,
        targetVelocity: scenario.targetVel,
        weaponType: 'laser',
        expectedResult: 'hit'
      });
    });
    
    return tests;
  }
  
  generatePlayerMovementTests() {
    const tests = [];
    
    // Player moving while targeting
    const scenarios = [
      // Player moving forward
      {
        playerVel: { x: 0, y: 0, z: -30 },
        targetPos: { x: 20, y: 0, z: -100 },
        targetVel: { x: -10, y: 0, z: 0 },
        name: 'Player_Forward'
      },
      
      // Player strafing right
      {
        playerVel: { x: 25, y: 0, z: 0 },
        targetPos: { x: -30, y: 0, z: -80 },
        targetVel: { x: 15, y: 0, z: 0 },
        name: 'Player_Strafe'
      },
      
      // Player complex movement
      {
        playerVel: { x: 15, y: 10, z: -20 },
        targetPos: { x: 0, y: 20, z: -120 },
        targetVel: { x: -8, y: -5, z: 12 },
        name: 'Player_Complex'
      },
    ];
    
    scenarios.forEach(scenario => {
      tests.push({
        name: scenario.name,
        playerPosition: { x: 0, y: 0, z: 0 },
        playerVelocity: scenario.playerVel,
        playerRotation: { x: 0, y: 0, z: 0 },
        targetPosition: scenario.targetPos,
        targetVelocity: scenario.targetVel,
        weaponType: 'laser',
        expectedResult: 'hit'
      });
    });
    
    return tests;
  }
  
  generateComplexMovementTests() {
    const tests = [];
    
    // High-speed scenarios that are most likely to expose errors
    const scenarios = [
      {
        playerVel: { x: 40, y: 20, z: -35 },
        targetPos: { x: 50, y: -30, z: -150 },
        targetVel: { x: -25, y: 15, z: 20 },
        name: 'HighSpeed_1'
      },
      {
        playerVel: { x: -30, y: -25, z: -40 },
        targetPos: { x: -40, y: 40, z: -200 },
        targetVel: { x: 35, y: -20, z: -10 },
        name: 'HighSpeed_2'
      },
    ];
    
    scenarios.forEach(scenario => {
      tests.push({
        name: scenario.name,
        playerPosition: { x: 0, y: 0, z: 0 },
        playerVelocity: scenario.playerVel,
        playerRotation: { x: 0, y: 0, z: 0 },
        targetPosition: scenario.targetPos,
        targetVelocity: scenario.targetVel,
        weaponType: 'laser',
        expectedResult: 'hit' // Should hit with good prediction
      });
    });
    
    return tests;
  }
  
  generateHighSpeedDistanceTests() {
    const tests = [];
    
    // High-speed scenarios at various distances to test algorithm performance
    // Based on the problematic HighSpeed_2 scenario but with varying distances
    const baseScenario = {
      playerVel: { x: -30, y: -25, z: -40 }, // High-speed player movement
      targetVel: { x: 35, y: -20, z: -10 }   // High-speed target movement
    };
    
    // Test at distances: 100m, 200m, 300m, 400m, 500m
    const distances = [100, 200, 300, 400, 500];
    
    distances.forEach((distance, index) => {
      // Calculate target position at specified distance
      // Place target at an angle to make it more challenging
      const angle = Math.PI / 4; // 45 degrees
      const targetX = -distance * 0.3; // Slightly left
      const targetY = distance * 0.2;  // Slightly up
      const targetZ = -distance;       // Main distance component
      
      tests.push({
        name: `HighSpeed_Distance_${index + 1}`,
        playerPosition: { x: 0, y: 0, z: 0 },
        playerVelocity: baseScenario.playerVel,
        playerRotation: { x: 0, y: 0, z: 0 },
        targetPosition: { x: targetX, y: targetY, z: targetZ },
        targetVelocity: baseScenario.targetVel,
        weaponType: 'laser',
        expectedResult: 'hit', // Should hit with good prediction
        testDistance: distance // For reference in results
      });
      
      // Add a second variant with different movement vectors for each distance
      const altTargetVel = {
        x: 20 + (distance / 20),  // Velocity increases with distance
        y: -15 - (distance / 30), // Velocity varies with distance
        z: 5 + (distance / 50)    // Small forward component
      };
      
      const altPlayerVel = {
        x: -20 - (distance / 25), // Player velocity varies with distance
        y: -30 + (distance / 40),
        z: -35 - (distance / 30)
      };
      
      tests.push({
        name: `HighSpeed_Distance_${index + 1}_Alt`,
        playerPosition: { x: 0, y: 0, z: 0 },
        playerVelocity: altPlayerVel,
        playerRotation: { x: 0, y: 0, z: 0 },
        targetPosition: { 
          x: distance * 0.4,  // Right side
          y: -distance * 0.1, // Slightly down
          z: -distance * 0.9  // Main distance
        },
        targetVelocity: altTargetVel,
        weaponType: 'laser',
        expectedResult: 'hit',
        testDistance: distance
      });
    });
    
    // Add extreme high-speed scenarios
    const extremeDistances = [300, 500]; // Focus on medium and long range
    extremeDistances.forEach((distance, index) => {
      tests.push({
        name: `HighSpeed_Extreme_${index + 1}`,
        playerPosition: { x: 0, y: 0, z: 0 },
        playerVelocity: { x: -50, y: -40, z: -60 }, // Very high speed
        playerRotation: { x: 0, y: 0, z: 0 },
        targetPosition: { 
          x: distance * 0.5, 
          y: distance * 0.3, 
          z: -distance 
        },
        targetVelocity: { x: 60, y: -30, z: -20 }, // Very high speed
        weaponType: 'laser',
        expectedResult: 'hit',
        testDistance: distance
      });
    });
    
    return tests;
  }
  
  /**
   * Run automated validation tests for all three targeting algorithms
   */
  async runValidationTests(targetingCalculationFunctions) {
    console.log('[TARGETING VALIDATION] Starting automated validation tests...');
    
    this.isRunning = true;
    this.resetResults();
    
    const { calculateAimPointBlue, calculateAimPointYellow, calculateAimPointCyan } = targetingCalculationFunctions;
    
    // Test each scenario with each algorithm
    for (let i = 0; i < this.testScenarios.length; i++) {
      const scenario = this.testScenarios[i];
      
      console.log(`[VALIDATION] Testing scenario ${i + 1}/${this.testScenarios.length}: ${scenario.name}`);
      
      // Test Blue algorithm
      const blueResult = await this.testTargetingAlgorithm('blue', scenario, calculateAimPointBlue);
      
      // Test Yellow algorithm  
      const yellowResult = await this.testTargetingAlgorithm('yellow', scenario, calculateAimPointYellow);
      
      // Test Cyan algorithm
      const cyanResult = await this.testTargetingAlgorithm('cyan', scenario, calculateAimPointCyan);
      
      // Log results for this scenario
      console.log(`[VALIDATION] Scenario ${scenario.name} results:`, {
        blue: blueResult,
        yellow: yellowResult,
        cyan: cyanResult
      });
      
      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.isRunning = false;
    
    // Calculate final statistics
    const finalResults = this.calculateFinalStatistics();
    console.log('[TARGETING VALIDATION] Final Results:', finalResults);
    
    return finalResults;
  }
  
  /**
   * Test a single targeting algorithm against a scenario
   */
  async testTargetingAlgorithm(algorithmName, scenario, calculateFunction) {
    // Mock camera object for the calculation
    const mockCamera = {
      position: new THREE.Vector3(0, 0, 5), // Camera slightly behind player
      getWorldDirection: () => new THREE.Vector3(0, 0, -1)
    };
    
    // Mock target object
    const mockTarget = {
      position: scenario.targetPosition,
      velocity: scenario.targetVelocity
    };
    
    // Get weapon speed
    const weaponSpeed = this.getWeaponSpeed(scenario.weaponType);
    
    // Calculate aim point using the algorithm
    const aimPrediction = calculateFunction(mockTarget, weaponSpeed, mockCamera);
    
    if (!aimPrediction) {
      // Algorithm failed to calculate
      this.testResults[algorithmName].misses++;
      this.testResults[algorithmName].tests++;
      return { hit: false, error: Infinity, reason: 'calculation_failed' };
    }
    
    // Simulate missile trajectory
    const simulationResult = this.simulateMissileTrajectory(
      scenario,
      aimPrediction,
      weaponSpeed
    );
    
    // Record results
    const isHit = simulationResult.minimumDistance <= this.config.hitThreshold;
    
    // Create detailed result record
    const detailedResult = {
      scenarioName: scenario.name,
      hit: isHit,
      error: simulationResult.minimumDistance,
      interceptTime: aimPrediction.time,
      predictedPosition: aimPrediction.point,
      actualClosestApproach: simulationResult.closestApproachPoint,
      scenario: {
        playerPos: scenario.playerPosition,
        playerVel: scenario.playerVelocity,
        targetPos: scenario.targetPosition,
        targetVel: scenario.targetVelocity,
        weaponType: scenario.weaponType
      }
    };
    
    // Add to detailed results
    this.testResults[algorithmName].detailedResults.push(detailedResult);
    
    if (isHit) {
      this.testResults[algorithmName].hits++;
    } else {
      this.testResults[algorithmName].misses++;
    }
    
    this.testResults[algorithmName].totalError += simulationResult.minimumDistance;
    this.testResults[algorithmName].tests++;
    
    return detailedResult;
  }
  
  /**
   * Simulate the actual missile trajectory physics and target movement
   */
  simulateMissileTrajectory(scenario, aimPrediction, weaponSpeed) {
    // Calculate missile spawn position (matching the actual game)
    const missileSpawnOffset = new THREE.Vector3(0, 0, -3);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(scenario.playerRotation.x, scenario.playerRotation.y, scenario.playerRotation.z)
    );
    missileSpawnOffset.applyMatrix4(rotationMatrix);
    
    const missileStartPos = new THREE.Vector3(
      scenario.playerPosition.x + missileSpawnOffset.x,
      scenario.playerPosition.y + missileSpawnOffset.y,
      scenario.playerPosition.z + missileSpawnOffset.z
    );
    
    // Calculate missile direction (toward predicted aim point)
    const missileDirection = new THREE.Vector3()
      .subVectors(aimPrediction.point, missileStartPos)
      .normalize();
    
    // Missile velocity vector
    const missileVelocity = missileDirection.clone().multiplyScalar(weaponSpeed);
    
    // Target initial state
    const targetPos = new THREE.Vector3(
      scenario.targetPosition.x,
      scenario.targetPosition.y,
      scenario.targetPosition.z
    );
    const targetVel = new THREE.Vector3(
      scenario.targetVelocity.x,
      scenario.targetVelocity.y,
      scenario.targetVelocity.z
    );
    
    // Simulation loop
    let currentMissilePos = missileStartPos.clone();
    let currentTargetPos = targetPos.clone();
    let time = 0;
    let minimumDistance = Infinity;
    let closestApproachPoint = null;
    
    while (time < this.config.maxSimulationTime) {
      // Update positions
      currentMissilePos.add(
        missileVelocity.clone().multiplyScalar(this.config.simulationTimeStep)
      );
      currentTargetPos.add(
        targetVel.clone().multiplyScalar(this.config.simulationTimeStep)
      );
      
      // Calculate distance between missile and target
      const distance = currentMissilePos.distanceTo(currentTargetPos);
      
      if (distance < minimumDistance) {
        minimumDistance = distance;
        closestApproachPoint = {
          missile: currentMissilePos.clone(),
          target: currentTargetPos.clone(),
          time: time
        };
      }
      
      // If we've passed the target and distance is increasing, break
      if (distance > minimumDistance + 10) {
        break;
      }
      
      time += this.config.simulationTimeStep;
    }
    
    return {
      minimumDistance,
      closestApproachPoint,
      simulationTime: time
    };
  }
  
  getWeaponSpeed(weaponType) {
    switch (weaponType) {
      case 'laser': return 200;
      case 'chaingun': return 250;
      case 'bfg': return 40;
      case 'rocket': return 150;
      case 'railgun': return 400;
      default: return 150;
    }
  }
  
  resetResults() {
    this.testResults = {
      blue: { hits: 0, misses: 0, totalError: 0, tests: 0, detailedResults: [] },
      yellow: { hits: 0, misses: 0, totalError: 0, tests: 0, detailedResults: [] },
      cyan: { hits: 0, misses: 0, totalError: 0, tests: 0, detailedResults: [] }
    };
  }
  
  calculateFinalStatistics() {
    const results = {};
    
    ['blue', 'yellow', 'cyan'].forEach(algorithm => {
      const data = this.testResults[algorithm];
      const hitRate = data.tests > 0 ? (data.hits / data.tests) * 100 : 0;
      const averageError = data.tests > 0 ? data.totalError / data.tests : Infinity;
      
      results[algorithm] = {
        hitRate: hitRate.toFixed(1) + '%',
        averageError: averageError.toFixed(2),
        hits: data.hits,
        misses: data.misses,
        totalTests: data.tests,
        accuracy: hitRate,
        detailedResults: data.detailedResults
      };
    });
    
    // Determine best algorithm
    const algorithms = ['blue', 'yellow', 'cyan'];
    const bestByHitRate = algorithms.reduce((best, current) => 
      results[current].accuracy > results[best].accuracy ? current : best
    );
    const bestByError = algorithms.reduce((best, current) => 
      parseFloat(results[current].averageError) < parseFloat(results[best].averageError) ? current : best
    );
    
    results.conclusion = {
      bestOverall: bestByHitRate,
      mostAccurate: bestByError,
      recommendation: `${bestByHitRate.toUpperCase()} algorithm shows the best hit rate (${results[bestByHitRate].hitRate})`
    };
    
    return results;
  }
  
  /**
   * Generate a quick summary report
   */
  generateReport() {
    if (!this.isRunning && this.testResults.orange.tests > 0) {
      return this.calculateFinalStatistics();
    }
    return null;
  }
}

export default TargetingValidationSystem;