import React, { useState, useEffect } from 'react';
import soundManager from '../systems/SoundManager';
import { useUISounds } from '../hooks/useGameSounds';

function SoundSettings() {
  const [masterVolume, setMasterVolume] = useState(soundManager.volume);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled);
  const { playSelect } = useUISounds();
  
  useEffect(() => {
    // Update sound manager when volume changes
    soundManager.setMasterVolume(masterVolume);
  }, [masterVolume]);
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setMasterVolume(newVolume);
  };
  
  const toggleSound = () => {
    const newEnabled = soundManager.toggleSound();
    setSoundEnabled(newEnabled);
    if (newEnabled) {
      playSelect(); // Play sound when re-enabling
    }
  };
  
  const testSound = () => {
    soundManager.play('laser_basic');
  };
  
  return (
    <div style={{
      padding: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      borderRadius: '10px',
      border: '2px solid #00ffff',
      color: '#ffffff',
      minWidth: '400px'
    }}>
      <h3 style={{ 
        color: '#00ffff', 
        marginBottom: '20px',
        textAlign: 'center' 
      }}>
        Sound Settings
      </h3>
      
      {/* Sound Enable/Disable */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}>
          <span>Sound Effects</span>
          <button
            onClick={toggleSound}
            style={{
              padding: '5px 15px',
              background: soundEnabled ? '#00ff00' : '#ff0000',
              color: '#000',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </label>
      </div>
      
      {/* Master Volume */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          Master Volume: {Math.round(masterVolume * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={masterVolume}
          onChange={handleVolumeChange}
          disabled={!soundEnabled}
          style={{
            width: '100%',
            cursor: soundEnabled ? 'pointer' : 'not-allowed',
            opacity: soundEnabled ? 1 : 0.5
          }}
        />
      </div>
      
      {/* Test Sound Button */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          onClick={testSound}
          disabled={!soundEnabled}
          style={{
            padding: '10px 20px',
            background: soundEnabled ? '#00ffff' : '#444',
            color: soundEnabled ? '#000' : '#888',
            border: 'none',
            borderRadius: '5px',
            cursor: soundEnabled ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
          Test Sound
        </button>
      </div>
      
      {/* Sound Status Info */}
      <div style={{ 
        marginTop: '20px', 
        padding: '10px',
        background: 'rgba(0, 255, 255, 0.1)',
        borderRadius: '5px',
        fontSize: '0.9em',
        textAlign: 'center'
      }}>
        {soundManager.initialized ? (
          <span style={{ color: '#00ff00' }}>
            ✓ Audio System Initialized
          </span>
        ) : (
          <span style={{ color: '#ffff00' }}>
            ⚠ Audio will initialize on first interaction
          </span>
        )}
      </div>
    </div>
  );
}

export default SoundSettings;