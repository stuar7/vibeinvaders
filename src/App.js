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
  const { scene, camera } = useThree();
  const playerPosition = useGameStore((state) => state.playerPosition);
  
  useFrame(() => {
    if (scene.fog) {
      // Fog should always be relative to camera/player position
      // These are the desired fog distances from the player
      const fogNear = 175;
      const fogFar = 850;
      
      // In three.js, fog is calculated from the camera position
      // Since the camera follows the player, we just need to set constant distances
      scene.fog.near = fogNear;
      scene.fog.far = fogFar;
      
      // Note: Three.js fog automatically works relative to the camera position,
      // so we don't need to manually offset it. The fog will naturally follow
      // as the camera moves with the player.
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