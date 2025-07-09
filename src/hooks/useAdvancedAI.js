import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

export const useAdvancedAI = () => {
  const workerRef = useRef(null);
  const isWorkerReady = useRef(false);
  const lastUpdateTime = useRef(0);
  const aiResults = useRef(new Map());
  
  // Get game state
  const aliens = useGameStore((state) => state.aliens);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerVelocity = useGameStore((state) => state.playerVelocity);
  const missiles = useGameStore((state) => state.missiles);
  const asteroids = useGameStore((state) => state.asteroids);
  const gameMode = useGameStore((state) => state.gameMode);
  
  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL('../workers/advancedAI.worker.js', import.meta.url));
      
      workerRef.current.onmessage = (e) => {
        const { type, data } = e.data;
        
        switch (type) {
          case 'WORKER_READY':
            isWorkerReady.current = true;
            console.log('[ADVANCED AI] Worker initialized');
            break;
            
          case 'AI_RESULTS':
            // Store AI results for aliens
            aiResults.current.clear();
            data.forEach(result => {
              aiResults.current.set(result.id, result);
            });
            break;
            
          case 'FORMATION_POSITIONS':
            // Handle formation flying results
            console.log('[ADVANCED AI] Formation calculated:', data);
            break;
            
          default:
            console.warn('[ADVANCED AI] Unknown message type:', type);
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('[ADVANCED AI] Worker error:', error);
        isWorkerReady.current = false;
      };
      
    } catch (error) {
      console.error('[ADVANCED AI] Failed to create worker:', error);
    }
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        isWorkerReady.current = false;
      }
    };
  }, []);
  
  // Update world state in worker
  const updateWorldState = useCallback(() => {
    if (!workerRef.current || !isWorkerReady.current) return;
    
    const worldState = {
      player: {
        position: playerPosition,
        velocity: playerVelocity
      },
      asteroids: asteroids.map(asteroid => ({
        id: asteroid.id,
        position: asteroid.position,
        scale: asteroid.scale || 1
      })),
      missiles: missiles.map(missile => ({
        id: missile.id,
        position: missile.position,
        velocity: missile.velocity,
        isPlayerMissile: missile.isPlayerMissile
      })),
      aliens: aliens.map(alien => ({
        id: alien.id,
        position: alien.position,
        velocity: alien.velocity,
        maxSpeed: alien.maxSpeed || 25
      })),
      bounds: {
        width: 200,
        height: 150,
        depth: 2000
      }
    };
    
    workerRef.current.postMessage({
      type: 'UPDATE_WORLD',
      data: worldState
    });
  }, [playerPosition, playerVelocity, asteroids, missiles, aliens]);
  
  // Compute AI for all aliens
  const computeAI = useCallback(() => {
    if (!workerRef.current || !isWorkerReady.current || aliens.length === 0) return;
    
    const now = Date.now();
    if (now - lastUpdateTime.current < 100) return; // Limit to 10 FPS for AI
    
    lastUpdateTime.current = now;
    
    // Send aliens data to worker for AI computation
    workerRef.current.postMessage({
      type: 'COMPUTE_AI',
      data: {
        aliens: aliens.map(alien => ({
          id: alien.id,
          position: alien.position,
          velocity: alien.velocity,
          maxSpeed: alien.maxSpeed || 25
        }))
      }
    });
  }, [aliens]);
  
  // Get AI result for specific alien
  const getAIResult = useCallback((alienId) => {
    return aiResults.current.get(alienId) || null;
  }, []);
  
  // Request formation calculation
  const computeFormation = useCallback((center, count, type = 'arrow') => {
    if (!workerRef.current || !isWorkerReady.current) return;
    
    workerRef.current.postMessage({
      type: 'COMPUTE_FORMATION',
      data: {
        formationCenter: center,
        alienCount: count,
        formationType: type
      }
    });
  }, []);
  
  // Update AI configuration
  const updateAIConfig = useCallback((config) => {
    if (!workerRef.current || !isWorkerReady.current) return;
    
    workerRef.current.postMessage({
      type: 'UPDATE_CONFIG',
      data: config
    });
  }, []);
  
  // Auto-update world state periodically
  useEffect(() => {
    if (gameMode === 'freeflight') {
      updateWorldState();
    }
  }, [updateWorldState, gameMode, playerPosition, aliens.length, missiles.length]);
  
  return {
    isReady: isWorkerReady.current,
    computeAI,
    getAIResult,
    computeFormation,
    updateAIConfig,
    updateWorldState
  };
};