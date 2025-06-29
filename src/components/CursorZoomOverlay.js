import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

// Component to show the far crosshair impact zone
function FarCrosshairIndicator({ playerPosition, playerRotation, weapons }) {
  const meshRef = useRef();
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Calculate far crosshair position (same logic as ZoomContent)
    const missileSpawnPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z - 3);
    const shipDirection = new THREE.Vector3(0, 0, -1);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
    );
    shipDirection.applyMatrix4(rotationMatrix);
    const trajectoryDirection = shipDirection.clone().normalize();
    
    const currentWeapon = weapons.current;
    const engagementDistance = currentWeapon === 'bfg' ? -150 : -100;
    const targetZ = engagementDistance;
    const deltaZ = targetZ - missileSpawnPos.z;
    const t = deltaZ / trajectoryDirection.z;
    
    const farCrosshairPos = missileSpawnPos.clone().add(
      trajectoryDirection.clone().multiplyScalar(t)
    );
    
    // Position the crosshair indicator at the impact point
    meshRef.current.position.copy(farCrosshairPos);
  });
  
  return (
    <group ref={meshRef}>
      {/* Main impact crosshair */}
      <mesh>
        <ringGeometry args={[2, 2.5, 16]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.9} />
      </mesh>
      
      {/* Impact zone radius */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7, 8, 32]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
      </mesh>
      
      {/* Center dot */}
      <mesh>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// Component that renders the zoomed view content
function ZoomContent() {
  const { camera, scene } = useThree();
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerRotation = useGameStore((state) => state.playerRotation);
  const cursorAiming = useGameStore((state) => state.cursorAiming);
  const aliens = useGameStore((state) => state.aliens);
  const weapons = useGameStore((state) => state.weapons);
  
  useFrame(() => {
    if (!cursorAiming) return;
    
    // Calculate far crosshair position (same logic as TargetingCursor)
    const missileSpawnPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z - 3);
    
    // Use player's actual rotation to calculate trajectory
    const shipDirection = new THREE.Vector3(0, 0, -1);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
    );
    shipDirection.applyMatrix4(rotationMatrix);
    const trajectoryDirection = shipDirection.clone().normalize();
    
    // Calculate far crosshair position at engagement distance
    const currentWeapon = weapons.current;
    const engagementDistance = currentWeapon === 'bfg' ? -150 : -100;
    const targetZ = engagementDistance;
    const deltaZ = targetZ - missileSpawnPos.z;
    const t = deltaZ / trajectoryDirection.z;
    
    const farCrosshairPos = missileSpawnPos.clone().add(
      trajectoryDirection.clone().multiplyScalar(t)
    );
    
    // Position zoom camera at far crosshair location
    camera.position.set(
      farCrosshairPos.x + 8,  // Offset to side for better view angle
      farCrosshairPos.y + 6,  // Above the target area
      farCrosshairPos.z + 12  // Behind for tactical overview
    );
    
    // Look at the far crosshair impact zone
    camera.lookAt(farCrosshairPos.x, farCrosshairPos.y, farCrosshairPos.z);
    
    // Adjust FOV for tactical zoom level
    camera.fov = 35; // Moderate zoom for tactical awareness
    camera.updateProjectionMatrix();
  });

  return (
    <>
      {/* Render aliens in zoom view with enhanced visibility */}
      {aliens.map((alien) => {
        // Calculate distance from alien to far crosshair impact zone
        const missileSpawnPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z - 3);
        const shipDirection = new THREE.Vector3(0, 0, -1);
        const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(playerRotation.x, playerRotation.y, playerRotation.z)
        );
        shipDirection.applyMatrix4(rotationMatrix);
        const trajectoryDirection = shipDirection.clone().normalize();
        
        const currentWeapon = weapons.current;
        const engagementDistance = currentWeapon === 'bfg' ? -150 : -100;
        const targetZ = engagementDistance;
        const deltaZ = targetZ - missileSpawnPos.z;
        const t = deltaZ / trajectoryDirection.z;
        
        const farCrosshairPos = missileSpawnPos.clone().add(
          trajectoryDirection.clone().multiplyScalar(t)
        );
        
        const alienPos = new THREE.Vector3(alien.position.x, alien.position.y, alien.position.z);
        const distanceToImpact = alienPos.distanceTo(farCrosshairPos);
        const isInImpactZone = distanceToImpact < 8; // 8 unit impact radius
        
        return (
          <group key={`zoom-${alien.id}`} position={[alien.position.x, alien.position.y, alien.position.z]}>
            {/* Alien ship */}
            <mesh>
              <boxGeometry args={[2, 1, 2]} />
              <meshStandardMaterial 
                color={isInImpactZone ? "#ff0000" : "#ff8844"} 
                emissive={isInImpactZone ? "#440000" : "#000000"}
              />
            </mesh>
            
            {/* Threat indicator for aliens in impact zone */}
            {isInImpactZone && (
              <mesh position={[0, 2, 0]}>
                <sphereGeometry args={[0.3, 8, 6]} />
                <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      })}
      
      {/* Add some lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 5]} intensity={1.0} />
      
      {/* Far crosshair impact zone indicator - positioned at calculated impact point */}
      <FarCrosshairIndicator 
        playerPosition={playerPosition}
        playerRotation={playerRotation}
        weapons={weapons}
      />
    </>
  );
}

function CursorZoomOverlay() {
  const cursorAiming = useGameStore((state) => state.cursorAiming);
  
  if (!cursorAiming) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '300px',
      height: '200px',
      border: '2px solid #00ffff',
      borderRadius: '8px',
      overflow: 'hidden',
      background: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1000,
    }}>
      {/* Title bar */}
      <div style={{
        background: 'rgba(0, 255, 255, 0.2)',
        color: '#00ffff',
        padding: '4px 8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        borderBottom: '1px solid #00ffff'
      }}>
IMPACT ZONE
      </div>
      
      {/* Canvas for zoomed view */}
      <Canvas
        style={{ width: '100%', height: 'calc(100% - 25px)' }}
        gl={{ antialias: true, alpha: true }}
      >
        <ZoomContent />
      </Canvas>
    </div>
  );
}

export default CursorZoomOverlay;