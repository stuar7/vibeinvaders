// BVH Generation Worker
// Handles expensive BVH tree construction in parallel

/* eslint-env worker */
/* global self */
/* eslint no-restricted-globals: ["error", "event", "fdescribe"] */

import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

class BVHGenerationWorker {
  constructor() {
    this.processingQueue = [];
    this.isProcessing = false;
  }

  async generateBVH(data) {
    const { assetId, geometry: geometryData, options } = data;
    const startTime = performance.now();
    
    try {
      // Reconstruct geometry from transferred data
      const geometry = this.reconstructGeometry(geometryData);
      
      if (!geometry) {
        throw new Error('Failed to reconstruct geometry');
      }
      
      // Generate BVH with progress tracking
      const bvh = await this.generateBVHWithProgress(geometry, options, assetId);
      
      if (!bvh) {
        throw new Error('BVH generation returned null');
      }
      
      // Serialize BVH for transfer back to main thread
      const serializedBVH = MeshBVH.serialize(bvh);
      
      const processingTime = performance.now() - startTime;
      
      // Send success result
      self.postMessage({
        type: 'bvhComplete',
        data: {
          assetId,
          bvhData: serializedBVH,
          processingTime,
          statistics: this.getBVHStatistics(bvh)
        }
      });
      
    } catch (error) {
      console.error(`[BVH WORKER] Error generating BVH for ${assetId}:`, error);
      
      // Send error result
      self.postMessage({
        type: 'bvhError',
        data: {
          assetId,
          error: error.message,
          stack: error.stack
        }
      });
    }
  }

  reconstructGeometry(geometryData) {
    const { positions, indices, itemSize } = geometryData;
    
    if (!positions || !itemSize) {
      throw new Error('Invalid geometry data: missing positions or itemSize');
    }
    
    const geometry = new THREE.BufferGeometry();
    
    // Set position attribute
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, itemSize));
    
    // Set index if provided
    if (indices) {
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    }
    
    // Compute normals for proper BVH generation
    geometry.computeVertexNormals();
    
    return geometry;
  }

  async generateBVHWithProgress(geometry, options, assetId) {
    const defaultOptions = {
      strategy: 'CENTER',
      maxLeafTris: 10,
      maxDepth: 20,
      onProgress: (progress) => {
        // Send progress updates
        self.postMessage({
          type: 'bvhProgress',
          data: {
            assetId,
            progress: Math.round(progress * 100)
          }
        });
      }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    // Generate BVH
    const bvh = new MeshBVH(geometry, finalOptions);
    
    return bvh;
  }

  getBVHStatistics(bvh) {
    const stats = {
      nodeCount: 0,
      leafCount: 0,
      triangleCount: 0,
      maxDepth: 0,
      avgDepth: 0
    };
    
    // Traverse BVH to gather statistics
    const traverse = (node, depth = 0) => {
      stats.nodeCount++;
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      
      if (node.count !== undefined) {
        // Leaf node
        stats.leafCount++;
        stats.triangleCount += node.count;
        stats.avgDepth += depth;
      } else {
        // Internal node - traverse children
        if (node.left) traverse(node.left, depth + 1);
        if (node.right) traverse(node.right, depth + 1);
      }
    };
    
    if (bvh._root) {
      traverse(bvh._root);
      stats.avgDepth = stats.leafCount > 0 ? stats.avgDepth / stats.leafCount : 0;
    }
    
    return stats;
  }

  // Batch processing for multiple BVH generation requests
  async processBatch(requests) {
    const results = [];
    
    for (const request of requests) {
      try {
        await this.generateBVH(request);
        results.push({ assetId: request.assetId, success: true });
      } catch (error) {
        results.push({ 
          assetId: request.assetId, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    // Send batch completion
    self.postMessage({
      type: 'batchComplete',
      data: {
        results,
        totalProcessed: requests.length
      }
    });
  }

  // Optimize BVH for specific use cases
  async optimizeBVH(data) {
    const { assetId, geometry: geometryData, optimizationType } = data;
    
    const geometry = this.reconstructGeometry(geometryData);
    let options;
    
    switch (optimizationType) {
      case 'collision':
        // Optimized for collision detection
        options = {
          strategy: 'CENTER',
          maxLeafTris: 5,   // Smaller leaves for precise collision
          maxDepth: 30
        };
        break;
        
      case 'raycast':
        // Optimized for raycasting
        options = {
          // Use default strategy (removed SAH as it's not valid in this version)
          maxLeafTris: 8,
          maxDepth: 25
        };
        break;
        
      case 'frustum':
        // Optimized for frustum culling
        options = {
          strategy: 'CENTER',
          maxLeafTris: 15,  // Larger leaves for spatial queries
          maxDepth: 20
        };
        break;
        
      default:
        // Balanced optimization
        options = {
          strategy: 'CENTER',
          maxLeafTris: 10,
          maxDepth: 20
        };
    }
    
    return this.generateBVH({ assetId, geometry: geometryData, options });
  }
}

const bvhWorker = new BVHGenerationWorker();

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'generateBVH':
      bvhWorker.generateBVH(data);
      break;
      
    case 'generateBatch':
      bvhWorker.processBatch(data.requests);
      break;
      
    case 'optimizeBVH':
      bvhWorker.optimizeBVH(data);
      break;
      
    case 'getWorkerInfo':
      // Send worker capabilities
      self.postMessage({
        type: 'workerInfo',
        data: {
          capabilities: ['bvh', 'batch', 'optimization'],
          version: '1.0.0',
          status: 'ready'
        }
      });
      break;
      
    default:
      console.warn(`[BVH WORKER] Unknown message type: ${type}`);
  }
};

// Handle worker errors
self.onerror = function(error) {
  console.error('[BVH WORKER] Worker error:', error);
  
  self.postMessage({
    type: 'workerError',
    data: {
      message: error.message,
      filename: error.filename,
      lineno: error.lineno
    }
  });
};

// Send ready signal
self.postMessage({
  type: 'workerReady',
  data: {
    timestamp: Date.now(),
    capabilities: ['bvh', 'batch', 'optimization']
  }
});