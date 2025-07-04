// Simplified SOA Worker for debugging
/* eslint-env worker */
/* global self */
/* eslint no-restricted-globals: ["error", "event", "fdescribe"] */

console.log('[SOA SIMPLE WORKER] Loading...');

// Simple fallback that works like the old system but with some SOA concepts
class SimpleSOAWorker {
  constructor() {
    this.missiles = [];
    this.aliens = [];
    this.asteroids = [];
    this.playerPosition = { x: 0, y: 0, z: 0 };
    console.log('[SOA SIMPLE WORKER] Initialized');
  }

  processFrame(data) {
    try {
      console.log('[SOA SIMPLE WORKER] Processing frame with data keys:', Object.keys(data || {}));
      
      const { 
        storeMissiles = [], 
        poolMissileUpdates = [], 
        aliens = [], 
        asteroids = [], 
        deltaTime = 0.016, 
        timeMultiplier = 1, 
        gameMode = 'campaign', 
        playerPosition = { x: 0, y: 0, z: 0 } 
      } = data || {};
      
      this.aliens = aliens;
      this.asteroids = asteroids;
      this.playerPosition = playerPosition;
      
      const adjustedDelta = deltaTime * timeMultiplier;
      const allMissiles = [...storeMissiles, ...poolMissileUpdates];
      
      console.log('[SOA SIMPLE WORKER] Processing', allMissiles.length, 'missiles');
      
      const updatedMissiles = [];
      
      allMissiles.forEach((missile, index) => {
        try {
          if (!missile || !missile.position || !missile.velocity) {
            console.warn('[SOA SIMPLE WORKER] Invalid missile at index', index, missile);
            return;
          }
          
          // Simple physics update
          const newPosition = {
            x: missile.position.x + (missile.velocity.x * adjustedDelta),
            y: missile.position.y + (missile.velocity.y * adjustedDelta),
            z: missile.position.z + (missile.velocity.z * adjustedDelta)
          };
          
          // Simple boundary check
          if (Math.abs(newPosition.x) > 200 || Math.abs(newPosition.y) > 200 || newPosition.z < -1000 || newPosition.z > 100) {
            // Cull missile
            return;
          }
          
          updatedMissiles.push({
            ...missile,
            position: newPosition
          });
        } catch (error) {
          console.error('[SOA SIMPLE WORKER] Error processing missile', index, error);
        }
      });
      
      console.log('[SOA SIMPLE WORKER] Updated', updatedMissiles.length, 'missiles');
      
      return {
        updatedMissiles,
        missileCount: updatedMissiles.length,
        collisions: {
          missileAlienHits: [],
          missileAsteroidHits: [],
          alienMissilePlayerHits: []
        },
        physicsStats: {
          total: allMissiles.length,
          culled: allMissiles.length - updatedMissiles.length
        }
      };
      
    } catch (error) {
      console.error('[SOA SIMPLE WORKER] processFrame error:', error);
      throw error;
    }
  }
}

const worker = new SimpleSOAWorker();

self.onmessage = function(e) {
  try {
    console.log('[SOA SIMPLE WORKER] Received message:', e.data?.type);
    
    if (!e.data) {
      console.error('[SOA SIMPLE WORKER] No data in message');
      return;
    }
    
    const { type, data } = e.data;
    
    switch (type) {
      case 'initialize':
        console.log('[SOA SIMPLE WORKER] Initialize received');
        self.postMessage({
          type: 'initialized',
          success: true
        });
        break;
        
      case 'processFrame':
        try {
          console.log('[SOA SIMPLE WORKER] Processing frame...');
          const results = worker.processFrame(data);
          
          self.postMessage({
            type: 'frameResults',
            results: results,
            timestamp: data?.timestamp || Date.now()
          });
          
        } catch (error) {
          console.error('[SOA SIMPLE WORKER] processFrame error:', error);
          self.postMessage({
            type: 'error',
            error: String(error.message || error),
            timestamp: data?.timestamp || Date.now()
          });
        }
        break;
        
      default:
        console.warn('[SOA SIMPLE WORKER] Unknown message type:', type);
    }
    
  } catch (error) {
    console.error('[SOA SIMPLE WORKER] onmessage error:', error);
    try {
      self.postMessage({
        type: 'error',
        error: String(error.message || 'Unknown error')
      });
    } catch (postError) {
      console.error('[SOA SIMPLE WORKER] Failed to post error message:', postError);
    }
  }
};

self.onerror = function(error) {
  console.error('[SOA SIMPLE WORKER] Global error:', error);
  try {
    self.postMessage({
      type: 'error',
      error: String(error.message || error)
    });
  } catch (e) {
    console.error('[SOA SIMPLE WORKER] Failed to post global error:', e);
  }
};

console.log('[SOA SIMPLE WORKER] Worker script loaded successfully');