import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useKeyboard } from '../hooks/useKeyboard';
import { UnifiedGamespace, GAMESPACE_MASTER_CONFIG } from '../config/UnifiedGamespace';
import PowerUpTimers from './PowerUpTimers';
import WeaponDisplay from './WeaponDisplay';
import DefensiveDisplay from './DefensiveDisplay';
import { APP_VERSION } from '../version';

function UI() {
  const gameState = useGameStore((state) => state.gameState);
  const score = useGameStore((state) => state.score);
  const highScore = useGameStore((state) => state.highScore);
  const lives = useGameStore((state) => state.lives);
  const level = useGameStore((state) => state.level);
  const showHelp = useGameStore((state) => state.showHelp);
  const isPaused = useGameStore((state) => state.isPaused);
  const elapsedTime = useGameStore((state) => state.elapsedTime);
  const updateGameTimer = useGameStore((state) => state.updateGameTimer);
  // Removed unused playerPowerUps
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerVelocity = useGameStore((state) => state.playerVelocity);
  const playerRotation = useGameStore((state) => state.playerRotation);
  const playerRotationalVelocity = useGameStore((state) => state.playerRotationalVelocity);
  const aliens = useGameStore((state) => state.aliens);
  const missiles = useGameStore((state) => state.missiles);
  const asteroids = useGameStore((state) => state.asteroids);
  const performance = useGameStore((state) => state.performance);
  
  const setGameState = useGameStore((state) => state.setGameState);
  const startGame = useGameStore((state) => state.startGame);
  const toggleHelp = useGameStore((state) => state.toggleHelp);
  const togglePause = useGameStore((state) => state.togglePause);
  const resetGame = useGameStore((state) => state.resetGame);
  const debug = useGameStore((state) => state.debug);
  const toggleDebugGamespaceBounds = useGameStore((state) => state.toggleDebugGamespaceBounds);
  const toggleDebugElements = useGameStore((state) => state.toggleDebugElements);
  const toggleDebugCollisionCircles = useGameStore((state) => state.toggleDebugCollisionCircles);
  const toggleDebugBlasterCollisions = useGameStore((state) => state.toggleDebugBlasterCollisions);
  
  const keys = useKeyboard();
  
  useEffect(() => {
    if (keys.Enter) {
      if (gameState === 'startup') {
        startGame('normal');
      } else if (gameState === 'gameOver' || gameState === 'gameWon') {
        resetGame();
        setGameState('startup');
      } else if (gameState === 'levelComplete') {
        setGameState('playing');
      }
    }
  }, [keys.Enter, gameState, startGame, resetGame, setGameState]);

  useEffect(() => {
    if (keys.KeyH) {
      toggleHelp();
    }
  }, [keys.KeyH, toggleHelp]);

  useEffect(() => {
    if (keys.KeyP && gameState === 'playing') {
      togglePause();
    }
  }, [keys.KeyP, gameState, togglePause]);

  useEffect(() => {
    if (keys.Escape) {
      if (showHelp) {
        toggleHelp();
      } else if (isPaused) {
        togglePause();
      }
    }
  }, [keys.Escape, showHelp, isPaused, toggleHelp, togglePause]);
  
  // Update timer when playing
  useEffect(() => {
    let timerInterval;
    if (gameState === 'playing' && !isPaused) {
      timerInterval = setInterval(() => {
        updateGameTimer();
      }, 1000); // Update every second
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [gameState, isPaused, updateGameTimer]);
  
  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="ui-overlay">
      {gameState === 'playing' && (
        <>
          <div className="score">
            Score: {score} | High Score: {highScore} | Level: {level} | Time: {formatTime(elapsedTime)}
          </div>
          <div className="lives">
            Ship: {(() => {
              try {
                const currentLives = typeof lives === 'number' ? lives : 0;
                const safeLives = Math.max(0, Math.min(3, Math.floor(currentLives)));
                const ships = [];
                const destroyed = [];
                
                for (let i = 0; i < safeLives; i++) {
                  ships.push('🚀');
                }
                for (let i = 0; i < (3 - safeLives); i++) {
                  destroyed.push('💥');
                }
                
                return [...ships, ...destroyed].join(' ');
              } catch (error) {
                console.error('Error rendering lives:', error, { lives });
                return '🚀 🚀 🚀'; // Default display
              }
            })()}
          </div>
          <PowerUpTimers />
          <WeaponDisplay />
          <DefensiveDisplay />
          
          {/* Gamespace Dimensions - moved above debug controls and made taller */}
          {debug.showDebugElements && (
            <div className="gamespace-info" style={{
              position: 'fixed',
              top: '120px',
              left: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '15px',
              color: '#fff',
              fontSize: '12px',
              minHeight: '150px',
              zIndex: 999,
            }}>
              <h4 style={{ color: '#00ff00', marginTop: 0, marginBottom: '10px' }}>Gamespace Dimensions</h4>
              <div>Center: ({GAMESPACE_MASTER_CONFIG.center.x}, {GAMESPACE_MASTER_CONFIG.center.y}, {GAMESPACE_MASTER_CONFIG.center.z})</div>
              <div>Width: {GAMESPACE_MASTER_CONFIG.bounds.width} (E/W)</div>
              <div>Height: {GAMESPACE_MASTER_CONFIG.bounds.height} (N/S)</div>
              <div>Length: {GAMESPACE_MASTER_CONFIG.length}</div>
              <div>Segments: {GAMESPACE_MASTER_CONFIG.segments}</div>
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444' }}>
                <strong>Player Position:</strong><br/>
                X: {playerPosition.x.toFixed(2)}<br/>
                Y: {playerPosition.y.toFixed(2)}<br/>
                Z: {playerPosition.z || 0}<br/>
                Distance from center: {UnifiedGamespace.getDistanceFromCenter(playerPosition.x, playerPosition.y).toFixed(2)}
                
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
                  <strong>Player Velocity:</strong><br/>
                  X: {playerVelocity.x.toFixed(3)}<br/>
                  Y: {playerVelocity.y.toFixed(3)}<br/>
                  Z: {playerVelocity.z.toFixed(3)}<br/>
                  Speed: {Math.sqrt(playerVelocity.x ** 2 + playerVelocity.y ** 2 + playerVelocity.z ** 2).toFixed(3)}
                </div>
                
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
                  <strong>Player Rotation:</strong><br/>
                  X: {(playerRotation.x * 180 / Math.PI).toFixed(1)}°<br/>
                  Y: {(playerRotation.y * 180 / Math.PI).toFixed(1)}°<br/>
                  Z: {(playerRotation.z * 180 / Math.PI).toFixed(1)}°
                </div>
                
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
                  <strong>Rotational Velocity:</strong><br/>
                  X: {(playerRotationalVelocity.x * 180 / Math.PI).toFixed(1)}°/s<br/>
                  Y: {(playerRotationalVelocity.y * 180 / Math.PI).toFixed(1)}°/s<br/>
                  Z: {(playerRotationalVelocity.z * 180 / Math.PI).toFixed(1)}°/s (Q/E)
                </div>
              </div>
            </div>
          )}
          
          {/* Debug Info Panel - moved to right side */}
          {debug.showDebugElements && (
            <div className="debug-info" style={{
              position: 'fixed',
              top: '120px',
              right: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '15px',
              color: '#fff',
              fontSize: '12px',
              zIndex: 999,
              minHeight: '500px',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}>
              {aliens.length > 0 && (
                <div className="debug-section">
                  <h4>Aliens ({aliens.length})</h4>
                  {aliens.slice(0, 5).map((alien, i) => (
                    <div key={i} className="entity-pos">
                      <div>A{i+1} T{alien.type}: ({alien.position.x.toFixed(1)}, {alien.position.y.toFixed(1)}, {alien.position.z.toFixed(1)})</div>
                      <div style={{fontSize: '10px', color: '#aaa', marginLeft: '10px'}}>
                        HP: {alien.health}/{alien.maxHealth} | 
                        {alien.isFlying ? ' Flying' : ' Combat'} | 
                        Pts: {alien.points}
                      </div>
                    </div>
                  ))}
                  {aliens.length > 5 && <div>... +{aliens.length - 5} more</div>}
                </div>
              )}
              
              {missiles.length > 0 && (
                <div className="debug-section">
                  <h4>Missiles ({missiles.length})</h4>
                  {missiles.slice(0, 3).map((missile, i) => (
                    <div key={i} className="entity-pos">
                      M{i+1}: ({missile.position.x.toFixed(1)}, {missile.position.y.toFixed(1)}, {missile.position.z.toFixed(1)})
                    </div>
                  ))}
                  {missiles.length > 3 && <div>... +{missiles.length - 3} more</div>}
                </div>
              )}
              
              {asteroids.length > 0 && (
                <div className="debug-section">
                  <h4>Asteroids ({asteroids.length})</h4>
                  {asteroids.slice(0, 3).map((asteroid, i) => (
                    <div key={i} className="entity-pos">
                      <div>As{i+1} {asteroid.type}: ({asteroid.position.x.toFixed(1)}, {asteroid.position.y.toFixed(1)}, {asteroid.position.z.toFixed(1)})</div>
                      <div style={{fontSize: '10px', color: '#aaa', marginLeft: '10px'}}>
                        HP: {asteroid.health || 'N/A'}/{asteroid.maxHealth || 'N/A'} | 
                        Size: {asteroid.size?.toFixed(1) || 'N/A'} | 
                        {asteroid.isDoodad ? ' Doodad' : ' Active'}
                      </div>
                    </div>
                  ))}
                  {asteroids.length > 3 && <div>... +{asteroids.length - 3} more</div>}
                </div>
              )}

              {/* Performance Monitor - Under Entity Tracker */}
              <div className="debug-section" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #ff6600' }}>
                <h4 style={{ color: '#ff6600', marginTop: 0, marginBottom: '10px' }}>Performance Monitor</h4>
                
                <div style={{ marginBottom: '8px' }}>
                  <strong>Frame Performance:</strong><br/>
                  FPS: <span style={{ color: performance.frameRate < 30 ? '#ff0000' : performance.frameRate < 50 ? '#ffaa00' : '#00ff00' }}>
                    {performance.frameRate}
                  </span> | Target: 60<br/>
                  Current: {performance.frameTime.toFixed(1)}ms | Avg: {(performance.avgFrameTime || 0).toFixed(1)}ms | Max: {(performance.maxFrameTime || 0).toFixed(1)}ms<br/>
                  Render Time: {performance.renderTime.toFixed(1)}ms<br/>
                  Frame Budget: <span style={{ color: performance.frameTime > (1000/60) ? '#ff0000' : '#00ff00' }}>
                    {((performance.frameTime / (1000/60)) * 100).toFixed(1)}%
                  </span> | GC Events: {performance.gcEvents || 0}
                </div>
                
                <div style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
                  <strong>System Resources:</strong><br/>
                  JS Memory: {performance.memoryUsage.toFixed(1)} MB<br/>
                  Triangles: {performance.triangleCount.toLocaleString()}<br/>
                  Draw Calls: {performance.drawCalls || 'N/A'}<br/>
                  Geometries: {performance.geometries || 'N/A'}<br/>
                  Textures: {performance.textures || 'N/A'}<br/>
                  Objects: {aliens.length + missiles.length + asteroids.length}<br/>
                  Entities: A:{aliens.length} M:<span style={{ color: missiles.length > 20 ? '#ff6600' : missiles.length > 10 ? '#ffaa00' : '#00ff00' }}>{missiles.length}</span> As:{asteroids.length}
                </div>

                <div style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
                  <strong>Performance Bottlenecks:</strong><br/>
                  {performance.frameRate < 30 && <div style={{ color: '#ff0000' }}>⚠ Low FPS detected</div>}
                  {performance.frameTime > (1000/60) && <div style={{ color: '#ff6600' }}>⚠ Frame budget exceeded</div>}
                  {performance.memoryUsage > 100 && <div style={{ color: '#ffaa00' }}>⚠ High memory usage</div>}
                  {performance.triangleCount > 50000 && <div style={{ color: '#ffaa00' }}>⚠ High triangle count</div>}
                  {(aliens.length + missiles.length + asteroids.length) > 100 && <div style={{ color: '#ffaa00' }}>⚠ Many objects</div>}
                </div>

                {performance.spikes && performance.spikes.length > 0 && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
                    <strong>Recent Performance Spikes:</strong><br/>
                    {performance.spikes.slice(-5).map((spike, i) => (
                      <div key={i} style={{ fontSize: '10px', marginBottom: '4px', padding: '2px', backgroundColor: 'rgba(255, 0, 0, 0.1)', borderRadius: '2px' }}>
                        <div style={{ color: '#ff6600' }}>
                          {spike.frameTime.toFixed(1)}ms spike ({((Date.now() - spike.time) / 1000).toFixed(1)}s ago)
                        </div>
                        <div style={{ color: '#aaa', fontSize: '9px' }}>
                          Missiles: <span style={{ color: spike.missileCount > 20 ? '#ff0000' : '#aaa' }}>{spike.missileCount}</span> | 
                          Aliens: {spike.alienCount} | 
                          Triangles: {spike.triangleCount.toLocaleString()} | 
                          Calls: {spike.drawCalls}
                        </div>
                        <div style={{ color: '#ccc', fontSize: '9px' }}>
                          {spike.cause}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {Object.keys(performance.componentTimes).length > 0 && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333' }}>
                    <strong>Component Render Times:</strong><br/>
                    {Object.entries(performance.componentTimes)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 8)
                      .map(([name, time]) => (
                        <div key={name} style={{ fontSize: '10px' }}>
                          {name}: <span style={{ color: time > 5 ? '#ff0000' : time > 2 ? '#ff6600' : '#00ff00' }}>
                            {time.toFixed(2)}ms
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Debug Controls */}
          <div className="debug-controls">
            <button 
              className="debug-button"
              onClick={toggleDebugGamespaceBounds}
              style={{
                background: debug.showGamespaceBounds ? '#00ff00' : '#333',
                color: debug.showGamespaceBounds ? '#000' : '#fff'
              }}
            >
              {debug.showGamespaceBounds ? 'Hide' : 'Show'} Bounds
            </button>
            <button 
              className="debug-button"
              onClick={toggleDebugElements}
              style={{
                background: debug.showDebugElements ? '#00ff00' : '#333',
                color: debug.showDebugElements ? '#000' : '#fff'
              }}
            >
              {debug.showDebugElements ? 'Hide' : 'Show'} Debug
            </button>
            <button 
              className="debug-button"
              onClick={toggleDebugCollisionCircles}
              style={{
                background: debug.showCollisionCircles ? '#00ff00' : '#333',
                color: debug.showCollisionCircles ? '#000' : '#fff'
              }}
            >
              {debug.showCollisionCircles ? 'Hide' : 'Show'} Collisions
            </button>
            <button 
              className="debug-button"
              onClick={toggleDebugBlasterCollisions}
              style={{
                background: debug.showBlasterCollisions ? '#00ff00' : '#333',
                color: debug.showBlasterCollisions ? '#000' : '#fff'
              }}
            >
              {debug.showBlasterCollisions ? 'Hide' : 'Show'} Blaster
            </button>
          </div>
        </>
      )}
      
      {gameState === 'startup' && (
        <div className="game-over">
          <h1>SPACE INVADERS 3D</h1>
          <p>Press ENTER to Start</p>
          <p style={{ fontSize: '16px' }}>Press H for Help</p>
        </div>
      )}
      
      {gameState === 'gameOver' && (
        <div className="game-over">
          <h1>GAME OVER</h1>
          <p>Final Score: {score}</p>
          <div className="game-over-buttons">
            <button 
              className="game-over-button default-selected"
              onClick={() => {
                resetGame();
                setGameState('startup');
              }}
            >
              Try Again
            </button>
            <button 
              className="game-over-button"
              onClick={() => setGameState('startup')}
            >
              Return to Menu
            </button>
          </div>
          <p style={{ fontSize: '14px', marginTop: '20px', opacity: 0.8 }}>
            Press ENTER for Try Again or click any button
          </p>
        </div>
      )}
      
      {gameState === 'gameWon' && (
        <div className="game-over">
          <h1>YOU WIN!</h1>
          <p>Final Score: {score}</p>
          <p>Press ENTER to Play Again</p>
        </div>
      )}
      
      {gameState === 'levelComplete' && (
        <div className="level-complete">
          <h1>LEVEL {level - 1} COMPLETE!</h1>
          <p>Press ENTER to Continue</p>
        </div>
      )}
      
      {isPaused && (
        <div className="game-over">
          <h1>PAUSED</h1>
          <p>Press P to Resume</p>
        </div>
      )}
      
      {showHelp && (
        <div className="help-screen">
          <h2>How to Play</h2>
          <div style={{ marginBottom: '20px' }}>
            <h3>Controls:</h3>
            <p><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> Move ship</p>
            <p><kbd>Space</kbd> Fire missiles (hold for continuous fire)</p>
            <p><kbd>P</kbd> Pause game</p>
            <p><kbd>H</kbd> Toggle this help</p>
            <p><kbd>ESC</kbd> Close help/unpause</p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h3>Power-ups:</h3>
            <p>🔵 Shield - Protects from one hit</p>
            <p>⚡ Rapid Fire - Faster shooting</p>
            <p>🟢 Multi-Shot - Triple missiles</p>
            <p>❤️ Extra Life - Gain one life</p>
            <p>⏰ Slow Time - Slows enemies</p>
          </div>
          
          <div>
            <h3>Enemies:</h3>
            <p>🔴 Scout - 1 hit, 10 points</p>
            <p>🔵 Armored - 2 hits, 15 points</p>
            <p>🟢 Elite - 3 hits, 20 points</p>
          </div>
          
          <p style={{ marginTop: '20px' }}>
            Press <kbd>H</kbd> or <kbd>ESC</kbd> to close
          </p>
        </div>
      )}
      
      {/* Working directory and version - always visible */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        color: '#666',
        fontSize: '12px',
        fontFamily: 'monospace',
        opacity: 0.7,
        textAlign: 'right',
        lineHeight: '1.3'
      }}>
        <div>{process.env.PWD || 'Space Invaders R3F'}</div>
        <div>v{APP_VERSION}</div>
      </div>
    </div>
  );
}

export default UI;