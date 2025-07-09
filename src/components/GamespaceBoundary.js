import React, { useState, useEffect } from 'react';
import { UnifiedGamespace } from '../config/UnifiedGamespace';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

function GamespaceBoundary() {
  const showGamespaceBounds = useGameStore((state) => state.debug.showGamespaceBounds);
  const gameMode = useGameStore((state) => state.gameMode);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const [collisionSegments, setCollisionSegments] = useState(new Set());
  
  // Add collision detection function to gameStore for Game.js to call
  useEffect(() => {
    const triggerBoundaryCollision = (playerX, playerY, segmentIndices = null) => {
      const distanceFromBoundary = UnifiedGamespace.getDistanceFromBoundary(playerX, playerY);
      
      if (distanceFromBoundary <= 1.0) { // Close to rectangular boundary
        let segments;
        if (segmentIndices) {
          // Use provided segment indices from UnifiedGamespace
          segments = new Set(segmentIndices);
        } else {
          // For rectangular boundary, determine which edge was hit
          const collisionInfo = UnifiedGamespace.getCollisionSegment(playerX, playerY);
          segments = new Set(collisionInfo.adjacentSegments);
        }
        
        setCollisionSegments(segments);
        
        // Clear collision after 1 second
        setTimeout(() => {
          setCollisionSegments(new Set());
        }, 1000);
      }
    };
    
    // Store the function in gameStore for Game.js to access
    useGameStore.setState({ triggerBoundaryCollision });
  }, []);
  
  if (!showGamespaceBounds || gameMode === 'freeflight') {
    return null;
  }
  
  return (
    <group>
      {/* Rectangular boundary using UnifiedGamespace geometry */}
      {(() => {
        const rectGeom = UnifiedGamespace.getRectangleGeometry();
        return (
          <>
            {/* Main wireframe boundary box */}
            <mesh position={rectGeom.position}>
              <boxGeometry args={rectGeom.args} />
              <meshBasicMaterial 
                color={collisionSegments.size > 0 ? "#ff0000" : "#00ff00"}
                transparent 
                opacity={collisionSegments.size > 0 ? 0.4 : 0.1}
                side={THREE.DoubleSide}
                wireframe
              />
            </mesh>
            
            {/* Corner pillars for better visibility */}
            {[
              [-rectGeom.args[0]/2, rectGeom.position[1] - rectGeom.args[1]/2, rectGeom.position[2]],
              [rectGeom.args[0]/2, rectGeom.position[1] - rectGeom.args[1]/2, rectGeom.position[2]],
              [-rectGeom.args[0]/2, rectGeom.position[1] + rectGeom.args[1]/2, rectGeom.position[2]],
              [rectGeom.args[0]/2, rectGeom.position[1] + rectGeom.args[1]/2, rectGeom.position[2]]
            ].map((pos, i) => (
              <mesh key={i} position={pos}>
                <boxGeometry args={[1, 1, rectGeom.args[2]]} />
                <meshBasicMaterial color="#00ff00" transparent opacity={0.6} />
              </mesh>
            ))}
            
            {/* Edge highlights for better visibility */}
            {/* Left edge */}
            <mesh position={[rectGeom.position[0] - rectGeom.args[0]/2, rectGeom.position[1], rectGeom.position[2]]}>
              <boxGeometry args={[0.5, rectGeom.args[1], rectGeom.args[2]]} />
              <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
            </mesh>
            {/* Right edge */}
            <mesh position={[rectGeom.position[0] + rectGeom.args[0]/2, rectGeom.position[1], rectGeom.position[2]]}>
              <boxGeometry args={[0.5, rectGeom.args[1], rectGeom.args[2]]} />
              <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
            </mesh>
            {/* Top edge */}
            <mesh position={[rectGeom.position[0], rectGeom.position[1] + rectGeom.args[1]/2, rectGeom.position[2]]}>
              <boxGeometry args={[rectGeom.args[0], 0.5, rectGeom.args[2]]} />
              <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
            </mesh>
            {/* Bottom edge */}
            <mesh position={[rectGeom.position[0], rectGeom.position[1] - rectGeom.args[1]/2, rectGeom.position[2]]}>
              <boxGeometry args={[rectGeom.args[0], 0.5, rectGeom.args[2]]} />
              <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
            </mesh>
          </>
        );
      })()}
      
      {/* Player zone indicator following the spaceship */}
      <mesh position={[playerPosition.x, playerPosition.y, playerPosition.z || 0]}>
        <ringGeometry args={[1.5, 2.5, 16]} />
        <meshBasicMaterial color="#0088ff" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default GamespaceBoundary;