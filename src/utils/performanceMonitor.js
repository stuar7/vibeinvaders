// Performance monitoring and auto-adjustment for asteroid field
import * as THREE from 'three';

export class PerformanceMonitor {
  constructor(targetFPS = 60) {
    this.targetFPS = targetFPS;
    this.targetFrameTime = 1000 / targetFPS;
    this.samples = [];
    this.maxSamples = 60;
    
    // Quality settings
    this.qualityLevels = {
      ultra: {
        asteroidCount: 3000,
        lodDistances: [200, 500, 1000],
        bloomEnabled: true,
        nebulaParticles: 5000,
        shadowsEnabled: true
      },
      high: {
        asteroidCount: 2000,
        lodDistances: [150, 400, 800],
        bloomEnabled: true,
        nebulaParticles: 3000,
        shadowsEnabled: true
      },
      medium: {
        asteroidCount: 1500,
        lodDistances: [100, 300, 600],
        bloomEnabled: true,
        nebulaParticles: 2000,
        shadowsEnabled: false
      },
      low: {
        asteroidCount: 1000,
        lodDistances: [80, 200, 400],
        bloomEnabled: false,
        nebulaParticles: 1000,
        shadowsEnabled: false
      },
      potato: {
        asteroidCount: 500,
        lodDistances: [50, 150, 300],
        bloomEnabled: false,
        nebulaParticles: 500,
        shadowsEnabled: false
      }
    };
    
    this.currentQuality = 'high';
    this.lastQualityChange = Date.now();
    this.qualityChangeDebounce = 5000; // 5 seconds between quality changes
    
    // Performance metrics
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      drawCalls: 0,
      triangles: 0,
      visibleAsteroids: 0
    };
  }
  
  update(deltaTime) {
    // Record frame time
    const frameTime = deltaTime * 1000; // Convert to milliseconds
    this.samples.push(frameTime);
    
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
    
    // Calculate average frame time
    const avgFrameTime = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.metrics.frameTime = avgFrameTime;
    this.metrics.fps = 1000 / avgFrameTime;
    
    // Auto-adjust quality if needed
    this.checkQualityAdjustment();
  }
  
  checkQualityAdjustment() {
    const now = Date.now();
    if (now - this.lastQualityChange < this.qualityChangeDebounce) {
      return;
    }
    
    const avgFPS = this.metrics.fps;
    const qualityLevels = Object.keys(this.qualityLevels);
    const currentIndex = qualityLevels.indexOf(this.currentQuality);
    
    // Downgrade if FPS is too low
    if (avgFPS < this.targetFPS * 0.8 && currentIndex < qualityLevels.length - 1) {
      this.currentQuality = qualityLevels[currentIndex + 1];
      this.lastQualityChange = now;
      console.log(`Performance: Downgrading to ${this.currentQuality} quality (FPS: ${avgFPS.toFixed(1)})`);
      return this.currentQuality;
    }
    
    // Upgrade if FPS is consistently high
    if (avgFPS > this.targetFPS * 0.95 && currentIndex > 0) {
      // Only upgrade if we've been stable for a while
      if (this.samples.length === this.maxSamples) {
        const minFPS = Math.min(...this.samples.map(t => 1000 / t));
        if (minFPS > this.targetFPS * 0.9) {
          this.currentQuality = qualityLevels[currentIndex - 1];
          this.lastQualityChange = now;
          console.log(`Performance: Upgrading to ${this.currentQuality} quality (FPS: ${avgFPS.toFixed(1)})`);
          return this.currentQuality;
        }
      }
    }
    
    return null;
  }
  
  getCurrentSettings() {
    return this.qualityLevels[this.currentQuality];
  }
  
  updateRendererInfo(renderer) {
    const info = renderer.info;
    this.metrics.drawCalls = info.render.calls;
    this.metrics.triangles = info.render.triangles;
  }
  
  setVisibleAsteroids(count) {
    this.metrics.visibleAsteroids = count;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      quality: this.currentQuality
    };
  }
  
  // Manual quality control
  setQuality(quality) {
    if (this.qualityLevels[quality]) {
      this.currentQuality = quality;
      this.lastQualityChange = Date.now();
      return this.getCurrentSettings();
    }
    return null;
  }
  
  // Debug overlay
  createDebugOverlay() {
    const div = document.createElement('div');
    div.id = 'performance-monitor';
    div.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      border-radius: 5px;
      pointer-events: none;
      z-index: 1000;
    `;
    
    document.body.appendChild(div);
    
    setInterval(() => {
      const metrics = this.getMetrics();
      div.innerHTML = `
        <div>FPS: ${metrics.fps.toFixed(1)}</div>
        <div>Frame Time: ${metrics.frameTime.toFixed(2)}ms</div>
        <div>Quality: ${metrics.quality}</div>
        <div>Draw Calls: ${metrics.drawCalls}</div>
        <div>Triangles: ${metrics.triangles.toLocaleString()}</div>
        <div>Visible Asteroids: ${metrics.visibleAsteroids}</div>
      `;
    }, 100);
  }
}

// Dynamic asteroid count manager
export class DynamicAsteroidManager {
  constructor(maxAsteroids = 5000) {
    this.maxAsteroids = maxAsteroids;
    this.activeRange = 2000; // Distance to keep asteroids active
    this.asteroidPool = [];
    this.activeAsteroids = new Set();
  }
  
  updateActiveAsteroids(playerPosition, asteroidField) {
    const newActive = new Set();
    
    // Find asteroids within active range
    asteroidField.asteroids.forEach((asteroid, index) => {
      const distance = asteroid.position.distanceTo(playerPosition);
      if (distance < this.activeRange) {
        newActive.add(index);
      }
    });
    
    // Activate new asteroids
    newActive.forEach(index => {
      if (!this.activeAsteroids.has(index)) {
        this.activateAsteroid(index, asteroidField);
      }
    });
    
    // Deactivate distant asteroids
    this.activeAsteroids.forEach(index => {
      if (!newActive.has(index)) {
        this.deactivateAsteroid(index, asteroidField);
      }
    });
    
    this.activeAsteroids = newActive;
  }
  
  activateAsteroid(index, asteroidField) {
    // Make asteroid visible
    const matrix = new THREE.Matrix4();
    asteroidField.instancedMesh.getMatrixAt(index, matrix);
    // Restore original scale from stored data
    const scale = asteroidField.asteroids[index].scale;
    matrix.elements[0] = matrix.elements[5] = matrix.elements[10] = scale;
    asteroidField.instancedMesh.setMatrixAt(index, matrix);
  }
  
  deactivateAsteroid(index, asteroidField) {
    // Make asteroid invisible by scaling to 0
    const matrix = new THREE.Matrix4();
    asteroidField.instancedMesh.getMatrixAt(index, matrix);
    matrix.elements[0] = matrix.elements[5] = matrix.elements[10] = 0;
    asteroidField.instancedMesh.setMatrixAt(index, matrix);
  }
}

export default PerformanceMonitor;