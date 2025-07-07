import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import SoundSettings from './SoundSettings';

function OptionsMenu({ onClose }) {
  const options = useGameStore((state) => state.options);
  const setMouseSensitivity = useGameStore((state) => state.setMouseSensitivity);
  const setInvertedMouse = useGameStore((state) => state.setInvertedMouse);
  const resetUIPositions = useGameStore((state) => state.resetUIPositions);
  
  const [tempSensitivity, setTempSensitivity] = useState(options.mouseSensitivity);
  const [tempInverted, setTempInverted] = useState(options.invertedMouse);

  const handleSave = () => {
    setMouseSensitivity(tempSensitivity);
    setInvertedMouse(tempInverted);
    onClose();
  };

  const handleCancel = () => {
    setTempSensitivity(options.mouseSensitivity);
    setTempInverted(options.invertedMouse);
    onClose();
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'rgba(0, 20, 40, 0.95)',
          border: '2px solid #00ffff',
          borderRadius: '10px',
          padding: '30px',
          minWidth: '600px',
          maxWidth: '800px',
          maxHeight: '80vh',
          overflowY: 'auto',
          color: '#ffffff',
          fontFamily: 'monospace',
        }}
      >
        <h2 style={{ textAlign: 'center', color: '#00ffff', marginBottom: '30px' }}>
          OPTIONS
        </h2>
        
        {/* Sound Settings Section */}
        <div style={{ marginBottom: '30px' }}>
          <SoundSettings />
        </div>
        
        {/* Controls Section */}
        <div style={{
          marginBottom: '30px',
          padding: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '10px',
          border: '2px solid #00ffff'
        }}>
          <h3 style={{ color: '#00ffff', marginBottom: '20px', textAlign: 'center' }}>
            Control Settings
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Mouse Sensitivity: {tempSensitivity.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={tempSensitivity}
              onChange={(e) => setTempSensitivity(parseFloat(e.target.value))}
              style={{
                width: '100%',
                background: '#003366',
                height: '8px',
                borderRadius: '4px',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={tempInverted}
                onChange={(e) => setTempInverted(e.target.checked)}
                style={{ marginRight: '10px' }}
              />
              Invert Mouse Y-Axis
            </label>
          </div>
        </div>

        {/* UI Reset Section */}
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #444', borderRadius: '5px' }}>
          <h3 style={{ color: '#00ffff', marginBottom: '10px' }}>UI Layout</h3>
          <p style={{ fontSize: '14px', color: '#ccc', marginBottom: '10px' }}>
            Reset all draggable UI elements (debug panels, targeting stats) to their default positions.
          </p>
          <button
            onClick={() => {
              resetUIPositions();
              alert('UI positions have been reset to defaults.');
            }}
            style={{
              padding: '8px 16px',
              background: '#664400',
              color: '#ffaa00',
              border: '1px solid #ffaa00',
              borderRadius: '5px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Reset UI Positions
          </button>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
            Tip: Hold Ctrl+Drag to move UI panels around the screen
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '10px 20px',
              background: '#666666',
              color: '#ffffff',
              border: '1px solid #888888',
              borderRadius: '5px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              background: '#004466',
              color: '#00ffff',
              border: '1px solid #00ffff',
              borderRadius: '5px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default OptionsMenu;