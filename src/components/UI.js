import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useKeyboard } from '../hooks/useKeyboard';
import useDraggableUI from '../hooks/useDraggableUI';
import PowerUpTimers from './PowerUpTimers';
import WeaponDisplay from './WeaponDisplay';
import DefensiveDisplay from './DefensiveDisplay';

// Import all UI components
import {
  // Common
  VersionDisplay,
  
  // Game HUD
  ScoreDisplay,
  LivesDisplay,
  UIInteractionIndicator,
  
  // Targeting
  AdvancedTargetingHUD,
  TargetingValidationResults,
  LiveTargetingStatistics,
  
  // Debug
  GamespaceDimensions,
  DebugInfoPanel,
  EntityInfoPanel,
  DebugControls,
  
  // Screens
  StartupScreen,
  GameOverScreen,
  GameWonScreen,
  LevelCompleteScreen,
  PausedScreen,
  HelpScreen
} from './ui/index';

function UI() {
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('blue');
  
  // Minimize states for debug panels (not persistent)
  const [minimizedPanels, setMinimizedPanels] = useState({
    debugPanel: false,
    entityPanel: false,
    gamespacePanel: false,
    liveTargetingStats: false,
    validationResults: false
  });
  
  // Toggle minimize state for a panel
  const toggleMinimize = (panelId) => {
    setMinimizedPanels(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  };
  
  // Draggable UI hooks
  const debugPanel = useDraggableUI('debugPanel');
  const entityPanel = useDraggableUI('entityPanel');
  const gamespacePanel = useDraggableUI('gamespacePanel');
  const liveStatsPanel = useDraggableUI('liveTargetingStats');
  const validationPanel = useDraggableUI('validationResults');
  
  // Game state
  const gameState = useGameStore((state) => state.gameState);
  const score = useGameStore((state) => state.score);
  const highScore = useGameStore((state) => state.highScore);
  const lives = useGameStore((state) => state.lives);
  const level = useGameStore((state) => state.level);
  const showHelp = useGameStore((state) => state.showHelp);
  const isPaused = useGameStore((state) => state.isPaused);
  const elapsedTime = useGameStore((state) => state.elapsedTime);
  const updateGameTimer = useGameStore((state) => state.updateGameTimer);
  
  // Player state
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerVelocity = useGameStore((state) => state.playerVelocity);
  const playerRotation = useGameStore((state) => state.playerRotation);
  const playerRotationalVelocity = useGameStore((state) => state.playerRotationalVelocity);
  
  // Entity state
  const aliens = useGameStore((state) => state.aliens);
  const missiles = useGameStore((state) => state.missiles);
  const asteroids = useGameStore((state) => state.asteroids);
  const performance = useGameStore((state) => state.performance);
  
  // Advanced targeting state
  const targetingEnabled = useGameStore((state) => state.targetingEnabled);
  const targetingMode = useGameStore((state) => state.targetingMode);
  const selectedTarget = useGameStore((state) => state.selectedTarget);
  const targetLock = useGameStore((state) => state.targetLock);
  const targetPrediction = useGameStore((state) => state.targetPrediction);
  const weapons = useGameStore((state) => state.weapons);
  const gameMode = useGameStore((state) => state.gameMode);
  const freeLookMode = useGameStore((state) => state.freeLookMode);
  const validationResults = useGameStore((state) => state.validationResults);
  const clearValidationResults = useGameStore((state) => state.clearValidationResults);
  const liveTargetingStats = useGameStore((state) => state.liveTargetingStats);
  const clearLiveTargetingStats = useGameStore((state) => state.clearLiveTargetingStats);
  const autoFireTargeting = useGameStore((state) => state.autoFireTargeting);
  const firstPersonMode = useGameStore((state) => state.firstPersonMode);
  const uiInteractionMode = useGameStore((state) => state.uiInteractionMode);
  
  // Actions
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
  
  // Keyboard handlers
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
      if (validationResults) {
        clearValidationResults();
      } else if (showHelp) {
        toggleHelp();
      } else if (isPaused) {
        togglePause();
      }
    }
  }, [keys.Escape, showHelp, isPaused, validationResults, toggleHelp, togglePause, clearValidationResults]);

  // Handle ` key for closing validation results
  useEffect(() => {
    if (keys.Backquote && validationResults) { // Backquote is the ` key
      clearValidationResults();
    }
  }, [keys.Backquote, validationResults, clearValidationResults]);
  
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
  
  return (
    <div className="ui-overlay">
      {gameState === 'playing' && (
        <>
          <ScoreDisplay 
            score={score}
            highScore={highScore}
            level={level}
            elapsedTime={elapsedTime}
          />
          <LivesDisplay lives={lives} />
          <PowerUpTimers />
          <WeaponDisplay />
          <DefensiveDisplay />
          
          <UIInteractionIndicator 
            gameMode={gameMode}
            uiInteractionMode={uiInteractionMode}
          />
          
          <AdvancedTargetingHUD
            gameMode={gameMode}
            freeLookMode={freeLookMode}
            targetingEnabled={targetingEnabled}
            targetLock={targetLock}
            selectedTarget={selectedTarget}
            targetingMode={targetingMode}
            weapons={weapons}
            targetPrediction={targetPrediction}
            autoFireTargeting={autoFireTargeting}
            firstPersonMode={firstPersonMode}
          />
          
          <TargetingValidationResults
            validationResults={validationResults}
            draggableProps={validationPanel.draggableProps}
            showDetailedResults={showDetailedResults}
            setShowDetailedResults={setShowDetailedResults}
          />
          
          <LiveTargetingStatistics
            gameMode={gameMode}
            freeLookMode={freeLookMode}
            targetingEnabled={targetingEnabled}
            liveTargetingStats={liveTargetingStats}
            targetingMode={targetingMode}
            clearLiveTargetingStats={clearLiveTargetingStats}
            draggableProps={liveStatsPanel.draggableProps}
            minimized={minimizedPanels.liveTargetingStats}
            toggleMinimize={toggleMinimize}
          />
          
          {/* Debug elements */}
          {debug.showDebugElements && (
            <>
              <GamespaceDimensions
                playerPosition={playerPosition}
                playerVelocity={playerVelocity}
                playerRotation={playerRotation}
                playerRotationalVelocity={playerRotationalVelocity}
                draggableProps={gamespacePanel.draggableProps}
                minimized={minimizedPanels.gamespacePanel}
                toggleMinimize={toggleMinimize}
              />
              
              <DebugInfoPanel
                performance={performance}
                draggableProps={debugPanel.draggableProps}
                minimized={minimizedPanels.debugPanel}
                toggleMinimize={toggleMinimize}
              />
              
              <EntityInfoPanel
                aliens={aliens}
                missiles={missiles}
                asteroids={asteroids}
                performance={performance}
                draggableProps={entityPanel.draggableProps}
                minimized={minimizedPanels.entityPanel}
                toggleMinimize={toggleMinimize}
              />
            </>
          )}
          
          <DebugControls
            debug={debug}
            toggleDebugGamespaceBounds={toggleDebugGamespaceBounds}
            toggleDebugElements={toggleDebugElements}
            toggleDebugCollisionCircles={toggleDebugCollisionCircles}
            toggleDebugBlasterCollisions={toggleDebugBlasterCollisions}
          />
        </>
      )}
      
      {/* Game state screens */}
      {gameState === 'startup' && (
        <StartupScreen 
          setGameState={setGameState}
          startGame={startGame}
          resetGame={resetGame}
        />
      )}
      
      {gameState === 'gameOver' && (
        <GameOverScreen 
          score={score}
          resetGame={resetGame}
          setGameState={setGameState}
        />
      )}
      
      {gameState === 'gameWon' && (
        <GameWonScreen score={score} />
      )}
      
      {gameState === 'levelComplete' && (
        <LevelCompleteScreen level={level} />
      )}
      
      {isPaused && <PausedScreen />}
      
      {showHelp && <HelpScreen />}
      
      <VersionDisplay />
    </div>
  );
}

export default UI;
