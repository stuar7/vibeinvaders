# Sound System Architecture

## Overview

The sound system is designed to be non-intrusive and fault-tolerant. The game works perfectly without any sound files.

## Components

### 1. SoundManager (`src/systems/SoundManager.js`)
- Singleton class that handles all audio
- Auto-initializes on first user interaction
- Gracefully handles missing files
- Manages volume and audio context

### 2. useGameSounds Hook (`src/hooks/useGameSounds.js`)
- React hook that connects game events to sounds
- Monitors state changes (missiles, explosions, etc.)
- Triggers appropriate sounds automatically

### 3. useUISounds Hook (`src/hooks/useGameSounds.js`)
- Provides simple functions for UI sounds
- Used in menus and interface components

### 4. SoundSettings Component (`src/components/SoundSettings.js`)
- UI for volume control and sound toggle
- Integrated into Options menu

## Integration Flow

```
Game Event → Store Update → useGameSounds Hook → SoundManager → Audio Output
     ↓                                                  ↓
User Action                                   (Missing file = Silent fail)
```

## Sound Categories

1. **Weapons** - Different sounds for each weapon type
2. **Impacts** - Hit feedback and collision sounds  
3. **Explosions** - Various explosion effects
4. **Power-ups** - Collection and activation sounds
5. **UI** - Menu navigation and game state sounds
6. **Enemy** - Alien-related sounds
7. **Ambient** - Background atmosphere

## File Structure

```
spaceinvader/
├── public/
│   ├── sounds/              # Sound files go here
│   │   ├── laser_basic.mp3
│   │   ├── explosion_medium.mp3
│   │   └── ... (other sounds)
│   └── test-sounds.html     # Test page
├── src/
│   ├── systems/
│   │   └── SoundManager.js  # Core sound system
│   ├── hooks/
│   │   └── useGameSounds.js # React integration
│   └── components/
│       └── SoundSettings.js # UI controls
└── docs/
    ├── SOUND_SYSTEM_GUIDE.md
    └── QUICK_SOUND_GUIDE.md
```

## Testing

1. Run `node scripts/setup-sounds.js` to check status
2. Open `/test-sounds.html` in browser to test individual sounds
3. Use Options menu in game to adjust volume

## Adding New Sounds

1. Add sound file to `public/sounds/`
2. Update configuration in `SoundManager.js`
3. Call `soundManager.play('sound_id')` or use appropriate hook

## Performance

- Sounds are loaded once and cached
- Missing sounds fail silently with single console log
- No impact on game performance if sounds are missing
- Audio context only initialized on user interaction

The system is designed to enhance the game experience while never interfering with gameplay!