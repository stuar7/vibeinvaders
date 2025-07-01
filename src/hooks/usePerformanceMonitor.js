import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useFrame, useThree } from '@react-three/fiber';

// Performance monitoring hook for React components
export function useComponentPerformance(componentName) {
  const updateComponentTime = useGameStore((state) => state.updateComponentTime);
  const renderStartTime = useRef(Date.now());
  const lastUpdateTime = useRef(0);
  
  useEffect(() => {
    renderStartTime.current = Date.now();
    return () => {
      const renderTime = Date.now() - renderStartTime.current;
      const now = Date.now();
      
      // Only update performance metrics every 100ms to prevent infinite loops
      if (now - lastUpdateTime.current > 100) {
        lastUpdateTime.current = now;
        updateComponentTime(componentName, renderTime);
      }
    };
  }, []); // Empty dependency array to prevent constant re-running
}

// Main performance monitor hook for the game
export function usePerformanceMonitor() {
  const updatePerformance = useGameStore((state) => state.updatePerformance);
  const performance = useGameStore((state) => state.performance);
  const frameStartTime = useRef(Date.now());
  const frameCount = useRef(0);
  const lastFPSUpdate = useRef(Date.now());
  const frameTimeHistory = useRef([]);
  const lastMemoryUsage = useRef(0);
  const { gl } = useThree();
  
  useFrame((state, delta) => {
    const now = Date.now();
    const frameTime = now - frameStartTime.current;
    frameStartTime.current = now;
    
    // Track frame time history (keep last 60 frames)
    frameTimeHistory.current.push(frameTime);
    if (frameTimeHistory.current.length > 60) {
      frameTimeHistory.current.shift();
    }
    
    // Calculate average frame time
    const avgFrameTime = frameTimeHistory.current.reduce((a, b) => a + b, 0) / frameTimeHistory.current.length;
    const maxFrameTime = Math.max(...frameTimeHistory.current);
    
    // Detect frame time spikes (> 2x average or > 33ms)
    const isSpike = frameTime > Math.max(avgFrameTime * 2, 33);
    
    // Update frame count for FPS calculation
    frameCount.current++;
    
    // Update FPS every second
    if (now - lastFPSUpdate.current >= 1000) {
      const fps = frameCount.current / ((now - lastFPSUpdate.current) / 1000);
      frameCount.current = 0;
      lastFPSUpdate.current = now;
      
      // Get memory usage if available
      let memoryUsage = 0;
      let gcDetected = false;
      if (window.performance && window.performance.memory) {
        memoryUsage = window.performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        
        // Detect GC events (significant memory drop)
        if (lastMemoryUsage.current > 0 && 
            lastMemoryUsage.current - memoryUsage > 5) { // 5MB drop indicates GC
          gcDetected = true;
        }
        lastMemoryUsage.current = memoryUsage;
      }
      
      // Get renderer info
      const rendererInfo = gl.info.render;
      const triangleCount = rendererInfo.triangles;
      const drawCalls = rendererInfo.calls;
      const geometries = gl.info.memory.geometries;
      const textures = gl.info.memory.textures;
      
      // Get game state for spike analysis
      const gameState = useGameStore.getState();
      const entityCount = gameState.aliens.length + gameState.missiles.length + gameState.asteroids.length;
      const missileCount = gameState.missiles.length;
      const alienCount = gameState.aliens.length;
      
      // Create spike record if detected
      let newSpikes = [...(performance.spikes || [])];
      if (isSpike) {
        const spikeData = {
          time: now,
          frameTime: frameTime,
          entityCount: entityCount,
          missileCount: missileCount,
          alienCount: alienCount,
          triangleCount: triangleCount,
          drawCalls: drawCalls,
          memoryUsage: memoryUsage,
          cause: analyzeSpikeCause(frameTime, entityCount, missileCount, alienCount, triangleCount, drawCalls, memoryUsage)
        };
        newSpikes.push(spikeData);
        
        // Keep only last 10 spikes
        if (newSpikes.length > 10) {
          newSpikes = newSpikes.slice(-10);
        }
      }
      
      updatePerformance({
        frameTime: frameTime,
        frameRate: Math.round(fps),
        renderTime: delta * 1000,
        memoryUsage: memoryUsage,
        triangleCount: triangleCount,
        drawCalls: drawCalls,
        geometries: geometries,
        textures: textures,
        frameTimeHistory: [...frameTimeHistory.current],
        maxFrameTime: maxFrameTime,
        avgFrameTime: avgFrameTime,
        spikes: newSpikes,
        gcEvents: performance.gcEvents + (gcDetected ? 1 : 0),
        lastGCTime: gcDetected ? now : performance.lastGCTime,
        lastUpdate: now,
      });
    }
  });
}

// Analyze what might be causing performance spikes
function analyzeSpikeCause(frameTime, entityCount, missileCount, alienCount, triangleCount, drawCalls, memoryUsage) {
  const causes = [];
  
  // Shooting-related causes
  if (missileCount > 50) causes.push(`HIGH MISSILE COUNT (${missileCount}) - Shooting lag`);
  else if (missileCount > 20) causes.push(`Many missiles (${missileCount}) - Possible shooting lag`);
  
  // Entity-related causes
  if (alienCount > 30) causes.push(`Many aliens (${alienCount})`);
  if (entityCount > 150) causes.push(`High total entities (${entityCount})`);
  
  // Rendering causes
  if (triangleCount > 100000) causes.push(`High triangles (${triangleCount.toLocaleString()})`);
  if (drawCalls > 200) causes.push(`High draw calls (${drawCalls})`);
  
  // Memory causes
  if (memoryUsage > 200) causes.push(`High memory (${memoryUsage.toFixed(1)}MB)`);
  
  // Frame time severity
  if (frameTime > 50) causes.push('SEVERE SPIKE');
  else if (frameTime > 33) causes.push('Moderate spike');
  
  // Specific shooting patterns
  if (missileCount > 15 && frameTime > 25) {
    causes.unshift('🔫 SHOOTING PERFORMANCE ISSUE');
  }
  
  return causes.length > 0 ? causes.join(', ') : 'Unknown cause';
}

// Hook to measure render performance of specific operations
export function useRenderProfiler(operationName) {
  const updateComponentTime = useGameStore((state) => state.updateComponentTime);
  
  const profileStart = () => {
    return performance.now();
  };
  
  const profileEnd = (startTime) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    updateComponentTime(operationName, duration);
    return duration;
  };
  
  return { profileStart, profileEnd };
}