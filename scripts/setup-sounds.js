// Setup script for creating the sounds directory
// Run this with: node scripts/setup-sounds.js

const fs = require('fs');
const path = require('path');

const soundsDir = path.join(__dirname, '..', 'public', 'sounds');

// Create sounds directory if it doesn't exist
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
  console.log('✓ Created public/sounds directory');
} else {
  console.log('✓ public/sounds directory already exists');
}

// List of expected sound files
const expectedSounds = [
  // Weapons
  'laser_basic.mp3',
  'laser_beam.mp3',
  'chaingun.mp3',
  'bfg_charge.mp3',
  'rocket_launch.mp3',
  'charge_shot.mp3',
  'bomb_drop.mp3',
  'railgun.mp3',
  
  // Impacts
  'impact_small.mp3',
  'impact_medium.mp3',
  'shield_hit.mp3',
  'armor_hit.mp3',
  
  // Explosions
  'explosion_small.mp3',
  'explosion_medium.mp3',
  'explosion_large.mp3',
  'explosion_alien.mp3',
  
  // Power-ups
  'powerup_collect.mp3',
  'shield_activate.mp3',
  'weapon_upgrade.mp3',
  'health_restore.mp3',
  
  // UI
  'menu_select.mp3',
  'menu_hover.mp3',
  'game_start.mp3',
  'game_over.mp3',
  'level_complete.mp3',
  'warning.mp3',
  
  // Enemy
  'alien_hurt.mp3',
  'alien_death.mp3',
  'alien_shoot.mp3',
  'boss_appear.mp3',
  
  // Ambient
  'space_ambient.mp3',
  'engine_hum.mp3'
];

// Check which sounds exist
console.log('\nSound File Status:');
console.log('==================');

let foundCount = 0;
let missingCount = 0;

expectedSounds.forEach(soundFile => {
  const soundPath = path.join(soundsDir, soundFile);
  if (fs.existsSync(soundPath)) {
    console.log(`✓ ${soundFile}`);
    foundCount++;
  } else {
    console.log(`✗ ${soundFile} (missing)`);
    missingCount++;
  }
});

console.log('\n==================');
console.log(`Found: ${foundCount} sounds`);
console.log(`Missing: ${missingCount} sounds`);

if (missingCount > 0) {
  console.log('\nThe game will work fine with missing sounds!');
  console.log('Download free sounds from:');
  console.log('- https://mixkit.co/free-sound-effects/');
  console.log('- https://pixabay.com/sound-effects/');
  console.log('- https://opengameart.org/');
  console.log('\nSee docs/QUICK_SOUND_GUIDE.md for specific recommendations');
} else {
  console.log('\nAll sound files found! 🎉');
}

// Create a placeholder README in the sounds directory
const readmePath = path.join(soundsDir, 'README.txt');
if (!fs.existsSync(readmePath)) {
  const readmeContent = `Space Invader Sound Files
========================

Place your sound effect files in this directory.
The game will automatically load any sounds it finds.

Expected files are listed when you run:
node scripts/setup-sounds.js

For free sound resources and download instructions, see:
docs/SOUND_SYSTEM_GUIDE.md
docs/QUICK_SOUND_GUIDE.md

The game works perfectly without sounds, so add them at your own pace!
`;
  
  fs.writeFileSync(readmePath, readmeContent);
  console.log('\n✓ Created sounds/README.txt');
}