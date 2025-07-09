import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../hooks/useKeyboard';
import { PlayerGeometry } from './player/PlayerGeometry';
import { PLAYER_CONFIG } from './player/playerConfig';

// Ship display component using the actual PlayerGeometry
function PlayerShip({ rotation = [0, 0, 0] }) {
  const meshRef = useRef();
  
  // Slowly rotate the ship for better viewing
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });
  
  // Use default player power-ups for ship viewer (no special effects)
  const defaultPowerUps = {
    shield: false,
    stealth: false
  };
  
  return (
    <group ref={meshRef} rotation={rotation} scale={PLAYER_CONFIG.playerScale}>
      <PlayerGeometry playerPowerUps={defaultPowerUps} />
    </group>
  );
}

function ShipViewer({ onClose }) {
  const keys = useKeyboard();
  
  // Handle ESC key
  useEffect(() => {
    if (keys.Escape) {
      onClose();
    }
  }, [keys.Escape, onClose]);
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#00ffff',
      fontFamily: 'Arial, sans-serif',
      zIndex: 2000
    }}>
      {/* Title */}
      <h1 style={{
        fontSize: '2.5rem',
        marginBottom: '2rem',
        textShadow: '0 0 20px #00ffff',
        letterSpacing: '0.2em'
      }}>
        SHIP VIEWER
      </h1>
      
      {/* Four viewports */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '2px',
        width: '80vw',
        height: '60vh',
        border: '2px solid #00ffff',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        {/* Top view */}
        <div style={{ position: 'relative', background: '#111' }}>
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            color: '#00ffff',
            fontSize: '1rem',
            fontWeight: 'bold',
            textShadow: '0 0 5px #00ffff',
            zIndex: 1000,
            pointerEvents: 'none'
          }}>
            TOP VIEW
          </div>
          <Canvas camera={{ position: [0, 8, 0], fov: 50 }}>
            <ambientLight intensity={0.8} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, 5, -5]} intensity={0.5} />
            <PlayerShip rotation={[0, 0, 0]} />
            <gridHelper args={[10, 10, '#444', '#222']} />
          </Canvas>
        </div>
        
        {/* Front view */}
        <div style={{ position: 'relative', background: '#111' }}>
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            color: '#00ffff',
            fontSize: '1rem',
            fontWeight: 'bold',
            textShadow: '0 0 5px #00ffff',
            zIndex: 1000,
            pointerEvents: 'none'
          }}>
            FRONT VIEW
          </div>
          <Canvas camera={{ position: [0, 0, -8], fov: 50 }}>
            <ambientLight intensity={0.8} />
            <pointLight position={[5, 5, -5]} intensity={1} />
            <pointLight position={[-5, -5, -5]} intensity={0.5} />
            <PlayerShip rotation={[0, 0, 0]} />
            <gridHelper args={[10, 10, '#444', '#222']} rotation={[Math.PI / 2, 0, 0]} />
          </Canvas>
        </div>
        
        {/* Left view */}
        <div style={{ position: 'relative', background: '#111' }}>
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            color: '#00ffff',
            fontSize: '1rem',
            fontWeight: 'bold',
            textShadow: '0 0 5px #00ffff',
            zIndex: 1000,
            pointerEvents: 'none'
          }}>
            LEFT VIEW
          </div>
          <Canvas camera={{ position: [-8, 0, 0], fov: 50 }}>
            <ambientLight intensity={0.8} />
            <pointLight position={[-5, 5, 5]} intensity={1} />
            <pointLight position={[-5, -5, -5]} intensity={0.5} />
            <PlayerShip rotation={[0, 0, 0]} />
            <gridHelper args={[10, 10, '#444', '#222']} rotation={[0, 0, Math.PI / 2]} />
          </Canvas>
        </div>
        
        {/* Bottom view */}
        <div style={{ position: 'relative', background: '#111' }}>
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            color: '#00ffff',
            fontSize: '1rem',
            fontWeight: 'bold',
            textShadow: '0 0 5px #00ffff',
            zIndex: 1000,
            pointerEvents: 'none'
          }}>
            BOTTOM VIEW
          </div>
          <Canvas camera={{ position: [0, -8, 0], fov: 50 }}>
            <ambientLight intensity={0.8} />
            <pointLight position={[5, -5, 5]} intensity={1} />
            <pointLight position={[-5, -5, -5]} intensity={0.5} />
            <PlayerShip rotation={[0, 0, 0]} />
            <gridHelper args={[10, 10, '#444', '#222']} />
          </Canvas>
        </div>
      </div>
      
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          marginTop: '2rem',
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          background: 'transparent',
          color: '#00ffff',
          border: '2px solid #00ffff',
          borderRadius: '5px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(0, 255, 255, 0.2)';
          e.target.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'transparent';
          e.target.style.boxShadow = 'none';
        }}
      >
        Close (ESC)
      </button>
      
      {/* Instructions */}
      <p style={{
        marginTop: '1rem',
        fontSize: '0.9rem',
        opacity: 0.7
      }}>
        Ships rotate automatically for better viewing
      </p>
    </div>
  );
}

export default ShipViewer;