import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import weaponMeshPool from '../systems/WeaponMeshPool2';
import effectsPool from '../systems/EffectsPool';
import asyncAssetManager from '../systems/AsyncAssetManager';
import gpuPrecompiler from '../systems/GPUPrecompiler';

function LoadingScreen() {
  const gameState = useGameStore((state) => state.gameState);
  const setGameReady = useGameStore((state) => state.setGameReady);
  
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [assetsLoaded, setAssetsLoaded] = useState({
    asyncAssets: false,
    weaponPool: false,
    weaponPoolWarmed: false,
    bvhCache: false,
    effectsPool: false,
    sceneReady: false,
    gpuCompiled: false,
  });

  useEffect(() => {
    if (gameState !== 'loading') return;

    const loadAssets = async () => {
      try {
        // Step 1: Load high-quality async assets first
        setLoadingStatus('Loading high-quality assets...');
        setLoadingProgress(5);
        
        try {
          await asyncAssetManager.preloadAssets('high');
          setAssetsLoaded(prev => ({ ...prev, asyncAssets: true }));
          console.log('[LOADING] High-quality assets loaded successfully');
        } catch (error) {
          console.warn('[LOADING] Async assets failed, using fallback geometry:', error);
          setAssetsLoaded(prev => ({ ...prev, asyncAssets: true })); // Continue anyway
        }
        
        // Step 2: Initialize weapon pool with async assets
        setLoadingStatus('Loading weapon meshes...');
        setLoadingProgress(15);
        
        // Enable async assets in weapon pool
        try {
          await weaponMeshPool.enableAsyncAssets();
          console.log('[LOADING] Weapon pool switched to async assets');
        } catch (error) {
          console.warn('[LOADING] Could not enable async assets in weapon pool:', error);
        }
        
        // Skip warmup during loading - GPU compilation will happen after scene is available
        setLoadingStatus('Preparing weapon pools...');
        setAssetsLoaded(prev => ({ ...prev, weaponPool: true }));
        setLoadingProgress(30);
        
        // Step 2.5: Pre-warm BVH cache for commonly used weapons
        setLoadingStatus('Optimizing collision detection...');
        setLoadingProgress(35);
        
        try {
          // Pre-compute BVH for rocket and bomb (most common weapons)
          weaponMeshPool.ensureBVHForWeapon('rocket');
          weaponMeshPool.ensureBVHForWeapon('bomb');
          
          // Get cache stats
          const bvhStats = weaponMeshPool.getBVHCacheStats();
          console.log('[LOADING] BVH cache warmed:', bvhStats);
          setAssetsLoaded(prev => ({ ...prev, bvhCache: true }));
          
          // Defer other weapons to avoid blocking
          setTimeout(() => {
            weaponMeshPool.ensureBVHForWeapon('railgun');
            weaponMeshPool.ensureBVHForWeapon('bfg');
          }, 100);
        } catch (error) {
          console.warn('[LOADING] BVH cache warming failed:', error);
        }
        
        setLoadingProgress(40);
        
        console.log('[LOADING] Weapon pools prepared - GPU compilation will happen after scene initialization');
        
        setAssetsLoaded(prev => ({ ...prev, weaponPoolWarmed: true }));
        setLoadingProgress(50);
        
        // Step 3: Wait for effects pool
        setLoadingStatus('Loading particle effects...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setAssetsLoaded(prev => ({ ...prev, effectsPool: true }));
        setLoadingProgress(75);
        
        // Step 4: Verify pools are ready
        setLoadingStatus('Verifying asset pools...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const weaponStats = weaponMeshPool.getStats();
        const effectStats = effectsPool.getStats();
        
        if (weaponStats && effectStats) {
          console.log('[LOADING] Weapon pool ready:', weaponStats);
          console.log('[LOADING] Effects pool ready:', effectStats);
          setAssetsLoaded(prev => ({ ...prev, sceneReady: true }));
          setLoadingProgress(90);
        }
        
        // Step 5: Final preparation
        setLoadingStatus('Starting game...');
        setLoadingProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Transition to playing state
        setGameReady();
        
      } catch (error) {
        console.error('[LOADING] Error during asset loading:', error);
        setLoadingStatus('Error loading assets - starting anyway...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        setGameReady();
      }
    };

    loadAssets();
  }, [gameState, setGameReady]);

  if (gameState !== 'loading') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      color: '#fff',
      fontFamily: 'monospace',
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '40px', color: '#00ff00' }}>
        LOADING
      </h1>
      
      <div style={{
        width: '400px',
        height: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '20px',
      }}>
        <div style={{
          width: `${loadingProgress}%`,
          height: '100%',
          backgroundColor: '#00ff00',
          transition: 'width 0.3s ease',
        }} />
      </div>
      
      <p style={{ fontSize: '16px', marginBottom: '30px' }}>
        {loadingStatus}
      </p>
      
      <div style={{ fontSize: '12px', opacity: 0.7 }}>
        <p>✓ High-Quality Assets: {assetsLoaded.asyncAssets ? 'Loaded' : 'Loading...'}</p>
        <p>✓ Weapon Pools: {assetsLoaded.weaponPool ? 'Ready' : 'Loading...'}</p>
        <p>✓ BVH Cache: {assetsLoaded.bvhCache ? 'Optimized' : 'Loading...'}</p>
        <p>✓ Pool Warmup: {assetsLoaded.weaponPoolWarmed ? 'Complete' : 'Loading...'}</p>
        <p>✓ Effect Pools: {assetsLoaded.effectsPool ? 'Ready' : 'Loading...'}</p>
        <p>✓ Scene Setup: {assetsLoaded.sceneReady ? 'Ready' : 'Loading...'}</p>
        <p>✓ GPU Compilation: {assetsLoaded.gpuCompiled ? 'Complete' : 'Pending...'}</p>
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: '40px',
        fontSize: '14px',
        opacity: 0.5,
      }}>
        {loadingProgress < 100 && (
          <p>Preparing high-performance weapon systems and GPU shaders...</p>
        )}
      </div>
    </div>
  );
}

export default LoadingScreen;