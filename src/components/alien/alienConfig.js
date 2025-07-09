// Alien configuration constants
export const ALIEN_CONFIG = {
  // Alien types and their properties
  alienTypes: {
    1: { // Scout
      name: 'Scout',
      color: '#ff0000',
      maxHealth: 1
    },
    2: { // Armored
      name: 'Armored',
      color: '#0080ff',
      maxHealth: 3
    },
    3: { // Elite
      name: 'Elite',
      color: '#00ff00',
      maxHealth: 2
    },
    4: { // Boss
      name: 'Boss',
      color: '#ff00ff',
      maxHealth: 20,
      scale: 5.0
    },
    5: { // Flying saucer
      name: 'Flying Saucer',
      color: '#888888',
      maxHealth: 5
    }
  },
  
  // Visual settings
  defaultColor: '#ffffff',
  highlightMixRatio: 0.6,
  damageMinBrightness: 0.3,
  
  // Animation settings
  hitRecoilDecay: 0.9,
  
  // Charge effects
  chargeColors: {
    1: '#ffff00',
    2: '#ff8800',
    3: '#ff4400',
    4: '#ff0088',
    5: '#ff00ff'
  },
  chargeOpacity: 0.2,
  chargeLightIntensity: 20,
  chargeLightDistance: 15,
  
  // Geometry settings
  shipScale: [1.6698, 1.6698, 1.6698],
  
  // Flying saucer geometry
  saucer: {
    discRadius: [1.5, 1.8],
    discHeight: 0.3,
    discSegments: 16,
    
    domeRadius: 0.8,
    domeSegments: [12, 8],
    domePosition: [0, 0.25, 0],
    
    hullRadius: 1.2,
    hullSegments: [12, 6],
    hullPosition: [0, -0.25, 0]
  },
  
  // Ship geometry
  ship: {
    body: {
      size: [0.6, 0.4, 2.0],
      position: [0, 0, 0]
    },
    nose: {
      radius: 0.4,
      height: 0.8,
      segments: 4,
      position: [0, 0, -1.4],
      rotation: [-Math.PI / 2, 0, 0]
    },
    leftWing: {
      position: [-0.3, 0, 0],
      vertices: [
        0, 0, -0.8,
        -1.5, 0, 0.5,
        0, 0, 0.8
      ]
    },
    rightWing: {
      position: [0.3, 0, 0],
      vertices: [
        0, 0, -0.8,
        1.5, 0, 0.5,
        0, 0, 0.8
      ]
    }
  }
};