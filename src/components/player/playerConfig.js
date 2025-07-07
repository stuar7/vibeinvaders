// Player configuration constants
export const PLAYER_CONFIG = {
  // Rotation speeds
  pitchSpeed: 2.5,
  yawSpeed: 2.5,
  rollSpeed: 1.0,
  mouseSensitivity: 0.0018,
  maxRotationRate: 2.0,
  
  // Double-tap settings
  doubleTapWindow: 150,
  rollDuration: 600,
  rollDistance: 30,
  
  // Limits
  maxPitchAngle: Math.PI / 3, // ±60 degrees
  maxYawAngle: Math.PI / 2,   // ±90 degrees
  
  // Virtual joystick
  virtualJoystickMaxRadius: 100,
  deadZoneRadius: 4.5,
  
  // Visual settings
  playerScale: [1.452, 1.452, 1.452],
  collisionRadius: 2.0,
  shieldRadius: 1.8,
  shieldOpacity: 0.45,
  
  // Colors
  defaultColor: '#00ffff',
  shieldColor: '#00ffff',
  stealthOpacity: 0.3,
  
  // Animation
  bankingFactor: 0.05,
  pitchingFactor: 0.03,
  maxBankAngle: 0.4,
  maxPitchAngle: 0.3,
  
  // Roll acceleration
  rollAccelerationMax: 2.0,
  rollAccelerationStart: 0.2,
  
  // Rotation damping
  rotationDampingDuration: 1000,
  minDampingTime: 500,
  maxDampingTime: 2000
};
