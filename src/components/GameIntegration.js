// Example integration for the main game component
// This shows how to integrate the selective bloom and performance monitoring

import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { SelectiveBloomRenderer } from '../utils/selectiveBloom';
import { PerformanceMonitor } from '../utils/performanceMonitor';

// This hook manages the selective bloom post-processing
export function useSelectiveBloom() {
  const { gl, scene, camera } = useThree();
  const bloomRenderer = useRef(null);
  const performanceMonitor = useRef(null);
  
  useEffect(() => {
    // Initialize selective bloom
    bloomRenderer.current = new SelectiveBloomRenderer(gl, scene, camera);
    
    // Initialize performance monitor
    performanceMonitor.current = new PerformanceMonitor(60);
    
    // Optional: Show debug overlay
    if (process.env.NODE_ENV === 'development') {
      performanceMonitor.current.createDebugOverlay();
    }
    
    // Handle window resize
    const handleResize = () => {
      bloomRenderer.current.resize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      bloomRenderer.current.dispose();
      
      // Remove debug overlay
      const overlay = document.getElementById('performance-monitor');
      if (overlay) overlay.remove();
    };
  }, [gl, scene, camera]);
  
  return { bloomRenderer: bloomRenderer.current, performanceMonitor: performanceMonitor.current };
}

// Example Game component integration
export function GameWithBloom() {
  const { bloomRenderer, performanceMonitor } = useSelectiveBloom();
  const { gl } = useThree();
  
  useFrame((state, delta) => {
    // Update performance monitor
    if (performanceMonitor) {
      performanceMonitor.update(delta);
      performanceMonitor.updateRendererInfo(gl);
      
      // Check if quality adjustment is needed
      const newQuality = performanceMonitor.checkQualityAdjustment();
      if (newQuality) {
        // Apply new quality settings to your game
        const settings = performanceMonitor.getCurrentSettings();
        console.log('Applying quality settings:', settings);
        // Update your asteroid field, nebula, etc. based on settings
      }
    }
    
    // Render with selective bloom instead of default rendering
    if (bloomRenderer) {
      bloomRenderer.render();
      return false; // Prevent default Three.js rendering
    }
  });
  
  return (
    <>
      {/* Your game components go here */}
      <Ground />
      {/* Other game elements */}
    </>
  );
}

// Integration notes:
/*
To use this in your main App or Game component:

1. Replace the default Canvas render with custom rendering:

```jsx
import { Canvas } from '@react-three/fiber';
import { GameWithBloom } from './components/GameIntegration';

function App() {
  return (
    <Canvas
      gl={{ 
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      }}
      camera={{ position: [0, 0, 10], fov: 75 }}
    >
      <GameWithBloom />
    </Canvas>
  );
}
```

2. Make sure glowing objects have layer 1 enabled:
```jsx
// In your Ground component or wherever you create glowing objects
mesh.layers.enable(1);
```

3. The performance monitor will automatically adjust quality based on FPS.
   You can also manually control it:
```jsx
performanceMonitor.setQuality('medium');
```

4. To add custom objects to bloom:
```jsx
bloomRenderer.addToBloom(yourMeshObject);
```

*/