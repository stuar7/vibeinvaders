const fs = require('fs');
const path = require('path');

// Read current build number from file, or start at 1
const buildFilePath = path.join(__dirname, '..', '.build-number');
let buildNumber = 1;

try {
  if (fs.existsSync(buildFilePath)) {
    buildNumber = parseInt(fs.readFileSync(buildFilePath, 'utf8')) + 1;
  }
} catch (error) {
  console.log('Starting new build number sequence');
}

// Write new build number
fs.writeFileSync(buildFilePath, buildNumber.toString());

// Get base version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const baseVersion = packageJson.version || '0.1.0';

// Create full version string
const fullVersion = `${baseVersion}.${buildNumber}`;

// Create version.js file for the app to import
const versionContent = `// Auto-generated version file
export const APP_VERSION = '${fullVersion}';
export const BUILD_NUMBER = ${buildNumber};
export const BUILD_TIME = '${new Date().toISOString()}';
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'version.js'), versionContent);

console.log(`Updated to version ${fullVersion}`);