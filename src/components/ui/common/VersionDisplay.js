import React from 'react';
import { APP_VERSION } from '../../../version';

const VersionDisplay = () => (
  <div style={{
    position: 'fixed',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#666',
    fontSize: '12px',
    fontFamily: 'monospace',
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: '1.3'
  }}>
    <div>{process.env.PWD || 'Space Invaders R3F'}</div>
    <div>v{APP_VERSION}</div>
  </div>
);

export default VersionDisplay;
