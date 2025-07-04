import React, { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Game from './components/Game';
import UI from './components/UI';
import FollowCamera from './components/FollowCamera';
import CursorZoomOverlay from './components/CursorZoomOverlay';
import MainMenu from './components/MainMenu';
import LoadingScreen from './components/LoadingScreen';
import { useGameStore } from './store/gameStore';

// Dynamic fog component that follows player position
function DynamicFog() {
  const { scene } = useThree();
  const playerPosition = useGameStore((state) => state.playerPosition);
  
  useFrame(() => {
    if (scene.fog && playerPosition) {
      // Keep the same relative distances (175 near, 850 far) but make them relative to player position
      const baseNear = 175;
      const baseFar = 850;
      
      // Adjust fog distances based on player's Z position
      scene.fog.near = baseNear + (playerPosition.z || 0);
      scene.fog.far = baseFar + (playerPosition.z || 0);
    }
  });
  
  return null;
}

function App() {
  const gameState = useGameStore((state) => state.gameState);
  const showMenu = useGameStore((state) => state.showMenu);
  const gameMode = useGameStore((state) => state.gameMode);
  
  console.log('Current game state:', gameState, 'Show menu:', showMenu, 'Game mode:', gameMode);

  // Show main menu
  if (showMenu) {
    return <MainMenu />;
  }

  // Show game
  return (
    <>
      {gameState === 'loading' && <LoadingScreen />}
      {gameState !== 'loading' && (
        <>
          <Canvas
            gl={{ antialias: true, alpha: false }}
            style={{ background: '#000' }}
          >
            <FollowCamera />
            
            <ambientLight intensity={0.5} />
            <pointLight position={[0, 50, 50]} intensity={1} />
            
            {/* Mild directional light from top left */}
            <directionalLight 
              position={[-30, 40, 20]} 
              intensity={0.3} 
              color="#ffffff"
            />
            
            <fog attach="fog" args={['#404040', 175, 850]} />
            <DynamicFog />
            
            <Suspense fallback={null}>
              <Game />
            </Suspense>
          </Canvas>
          
          <UI />
          {/* <CursorZoomOverlay /> */}
        </>
      )}
    </>
  );
}

export default App;