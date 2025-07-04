import React, { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import asyncAssetManager from '../systems/AsyncAssetManager';
import { useGameStore } from '../store/gameStore';

function AsyncAssetLoader() {
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    progress: 0,
    currentAsset: '',
    completed: false,
    error: null
  });
  
  const gameState = useGameStore((state) => state.gameState);
  const showDebugElements = useGameStore((state) => state.debug.showDebugElements);
  
  useEffect(() => {
    // Start preloading when game starts or component mounts
    if (gameState === 'startup' || gameState === 'menu') {
      initializeAssets();
    }
  }, [gameState]);
  
  const initializeAssets = async () => {
    if (loadingState.isLoading || loadingState.completed) return;
    
    console.log('[ASYNC LOADER] Starting asset preload...');
    setLoadingState(prev => ({ 
      ...prev, 
      isLoading: true, 
      progress: 0,
      error: null 
    }));
    
    try {
      // Preload high priority assets first
      const highPriorityResult = await asyncAssetManager.preloadAssets('high');
      
      setLoadingState(prev => ({ 
        ...prev, 
        progress: 33,
        currentAsset: 'High priority assets' 
      }));
      
      // Then medium priority
      const mediumPriorityResult = await asyncAssetManager.preloadAssets('medium');
      
      setLoadingState(prev => ({ 
        ...prev, 
        progress: 66,
        currentAsset: 'Medium priority assets' 
      }));
      
      // Finally low priority (background loading)
      const lowPriorityResult = await asyncAssetManager.preloadAssets('low');
      
      setLoadingState(prev => ({ 
        ...prev, 
        progress: 100,
        currentAsset: 'All assets loaded',
        completed: true,
        isLoading: false 
      }));
      
      const totalAssets = highPriorityResult.successful + 
                         mediumPriorityResult.successful + 
                         lowPriorityResult.successful;
      
      const totalTime = highPriorityResult.loadTime + 
                       mediumPriorityResult.loadTime + 
                       lowPriorityResult.loadTime;
      
      console.log(`[ASYNC LOADER] Preload complete: ${totalAssets} assets in ${totalTime.toFixed(2)}ms`);
      
      // Add loaded assets to global state for other components to use
      useGameStore.getState().setAsyncAssetsLoaded(true);
      
    } catch (error) {
      console.error('[ASYNC LOADER] Preload failed:', error);
      setLoadingState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error.message 
      }));
    }
  };
  
  // Update progress periodically
  useEffect(() => {
    if (!loadingState.isLoading) return;
    
    const interval = setInterval(() => {
      const progress = asyncAssetManager.getLoadingProgress();
      setLoadingState(prev => ({ 
        ...prev, 
        progress: progress.percentage 
      }));
    }, 100);
    
    return () => clearInterval(interval);
  }, [loadingState.isLoading]);
  
  // Only show loading UI during startup or if debug is enabled
  if (!loadingState.isLoading && !showDebugElements) {
    return null;
  }
  
  return (
    <Html center style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#00ff00',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '14px',
        border: '2px solid #00ff00',
        minWidth: '300px',
        textAlign: 'center'
      }}>
        {loadingState.isLoading && (
          <>
            <h3 style={{ margin: '0 0 15px 0', color: '#00ffff' }}>
              Loading Game Assets
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <div style={{
                width: '100%',
                height: '20px',
                background: '#001100',
                border: '1px solid #00ff00',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${loadingState.progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ff00, #00ffff)',
                  transition: 'width 0.3s ease',
                  borderRadius: '10px'
                }} />
              </div>
              
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px',
                color: '#ffff00' 
              }}>
                {loadingState.progress.toFixed(1)}% Complete
              </div>
            </div>
            
            <div style={{ 
              fontSize: '12px',
              color: '#aaaaaa',
              marginBottom: '10px' 
            }}>
              {loadingState.currentAsset}
            </div>
            
            <div style={{ 
              fontSize: '10px',
              color: '#666666' 
            }}>
              <div>✓ Generating optimized geometries</div>
              <div>✓ Building BVH collision trees</div>
              <div>✓ Compiling materials</div>
            </div>
          </>
        )}
        
        {loadingState.error && (
          <>
            <h3 style={{ margin: '0 0 15px 0', color: '#ff0000' }}>
              Loading Error
            </h3>
            <div style={{ color: '#ff8888', fontSize: '12px' }}>
              {loadingState.error}
            </div>
          </>
        )}
        
        {loadingState.completed && showDebugElements && (
          <>
            <h3 style={{ margin: '0 0 15px 0', color: '#00ff00' }}>
              Assets Ready
            </h3>
            <div style={{ fontSize: '12px', color: '#88ff88' }}>
              All weapon meshes pre-loaded with BVH optimization
            </div>
          </>
        )}
      </div>
    </Html>
  );
}

export default AsyncAssetLoader;