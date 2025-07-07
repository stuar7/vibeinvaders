import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useKeyboard } from '../hooks/useKeyboard';
import { useUISounds } from '../hooks/useGameSounds';
import OptionsMenu from './OptionsMenu';
import ShipViewer from './ShipViewer';

function MainMenu() {
  const [selectedOption, setSelectedOption] = useState(0); // 0 = Linear Campaign, 1 = Free Flight, 2 = Ship Viewer, 3 = Options
  const [showOptions, setShowOptions] = useState(false);
  const [showShipViewer, setShowShipViewer] = useState(false);
  const keys = useKeyboard();
  const startGame = useGameStore((state) => state.startGame);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const { playHover, playSelect } = useUISounds();
  
  const menuOptions = [
    { title: 'Linear Campaign', description: 'Play through structured levels with increasing difficulty' },
    { title: 'Free Flight', description: 'Unlimited exploration with no boundaries or objectives' },
    { title: 'Ship Viewer', description: 'View your ship from multiple angles' },
    { title: 'Options', description: 'Configure game settings and controls' }
  ];

  // Define functions first
  const handleSelection = useCallback((optionIndex = selectedOption) => {
    playSelect(); // Play selection sound
    if (optionIndex === 0) {
      // Linear Campaign
      console.log('[MENU] Setting game mode to: campaign');
      setGameMode('campaign');
      startGame();
    } else if (optionIndex === 1) {
      // Free Flight
      console.log('[MENU] Setting game mode to: freeflight');
      setGameMode('freeflight');
      startGame();
    } else if (optionIndex === 2) {
      // Ship Viewer
      setShowShipViewer(true);
    } else if (optionIndex === 3) {
      // Options
      setShowOptions(true);
    }
  }, [selectedOption, setGameMode, startGame, playSelect]);

  // Handle mouse click selection
  const handleMouseClick = (optionIndex) => {
    setSelectedOption(optionIndex);
    handleSelection(optionIndex);
  };

  // Handle navigation
  useEffect(() => {
    // A key or Left Arrow - select Linear Campaign
    if (keys.KeyA || keys.ArrowLeft) {
      if (selectedOption !== 0) playHover();
      setSelectedOption(0);
    }
  }, [keys.KeyA, keys.ArrowLeft, selectedOption, playHover]);

  useEffect(() => {
    // B key or Right Arrow - select Free Flight  
    if (keys.KeyB || keys.ArrowRight) {
      if (selectedOption !== 1) playHover();
      setSelectedOption(1);
    }
  }, [keys.KeyB, keys.ArrowRight, selectedOption, playHover]);

  useEffect(() => {
    // S key - select Ship Viewer
    if (keys.KeyS) {
      if (selectedOption !== 2) playHover();
      setSelectedOption(2);
    }
  }, [keys.KeyS, selectedOption, playHover]);

  useEffect(() => {
    // O key - select Options
    if (keys.KeyO) {
      if (selectedOption !== 3) playHover();
      setSelectedOption(3);
    }
  }, [keys.KeyO, selectedOption, playHover]);

  useEffect(() => {
    // Enter key - confirm selection
    if (keys.Enter) {
      handleSelection();
    }
  }, [keys.Enter, handleSelection]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #2a1a4a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#00ffff',
      fontFamily: 'Arial, sans-serif',
      zIndex: 1000
    }}>
      {/* Title */}
      <h1 style={{
        fontSize: '4rem',
        marginBottom: '2rem',
        textShadow: '0 0 20px #00ffff',
        letterSpacing: '0.2em'
      }}>
        SPACE INVADERS R3F
      </h1>

      {/* Subtitle */}
      <p style={{
        fontSize: '1.2rem',
        marginBottom: '4rem',
        opacity: 0.8,
        textAlign: 'center'
      }}>
        Select your mission type
      </p>

      {/* Menu Options */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '2rem',
        marginBottom: '3rem',
        maxWidth: '800px'
      }}>
        {menuOptions.map((option, index) => (
          <div
            key={index}
            onClick={() => handleMouseClick(index)}
            onMouseEnter={() => {
              if (selectedOption !== index) {
                playHover();
                setSelectedOption(index);
              }
            }}
            style={{
              padding: '2rem',
              minWidth: '250px',
              textAlign: 'center',
              border: selectedOption === index ? '3px solid #00ffff' : '2px solid #444',
              borderRadius: '10px',
              background: selectedOption === index ? 'rgba(0, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedOption === index ? '0 0 30px rgba(0, 255, 255, 0.5)' : 'none'
            }}
          >
            <h2 style={{
              fontSize: '2rem',
              marginBottom: '1rem',
              color: selectedOption === index ? '#00ffff' : '#ffffff'
            }}>
              {option.title}
            </h2>
            <p style={{
              fontSize: '1rem',
              opacity: 0.8,
              lineHeight: '1.5'
            }}>
              {option.description}
            </p>
          </div>
        ))}
      </div>

      {/* Controls Instructions */}
      <div style={{
        textAlign: 'center',
        opacity: 0.6,
        fontSize: '1rem'
      }}>
        <p>Press <span style={{color: '#00ffff'}}>Enter</span> or <span style={{color: '#00ffff'}}>Click</span> to start</p>
      </div>

      {/* Debug Info */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        fontSize: '0.8rem',
        opacity: 0.5
      }}>
        Debug: F key still available for direct free flight toggle
      </div>

      {/* Options Menu */}
      {showOptions && (
        <OptionsMenu onClose={() => setShowOptions(false)} />
      )}
      
      {/* Ship Viewer */}
      {showShipViewer && (
        <ShipViewer onClose={() => setShowShipViewer(false)} />
      )}
    </div>
  );
}

export default MainMenu;