import React, { useState } from 'react';

const TargetingValidationResults = ({ 
  validationResults, 
  draggableProps,
  setShowDetailedResults: parentSetShowDetailedResults,
  showDetailedResults: parentShowDetailedResults 
}) => {
  const [showDetailedResults, setShowDetailedResults] = useState(parentShowDetailedResults || false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('blue');

  if (!validationResults) {
    return null;
  }

  return (
    <div 
      {...draggableProps}
      style={{
        ...draggableProps.style,
        backgroundColor: 'rgba(0,0,0,0.95)',
        border: '2px solid #00ff00',
        borderRadius: '8px',
        padding: '20px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 1000,
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 0 20px rgba(0,255,0,0.3)',
        width: '600px'
      }}>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h3 style={{ color: '#00ff00', margin: '0 0 10px 0', fontSize: '18px' }}>TARGETING VALIDATION RESULTS</h3>
        <div style={{ fontSize: '12px', color: '#aaa' }}>Automated accuracy testing completed - {validationResults.blue.totalTests} scenarios per algorithm</div>
        
        {/* View Toggle Buttons */}
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button 
            onClick={() => setShowDetailedResults(false)}
            style={{
              background: !showDetailedResults ? '#00ff00' : '#333',
              color: !showDetailedResults ? '#000' : '#fff',
              border: '1px solid #00ff00',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Summary
          </button>
          <button 
            onClick={() => setShowDetailedResults(true)}
            style={{
              background: showDetailedResults ? '#00ff00' : '#333',
              color: showDetailedResults ? '#000' : '#fff',
              border: '1px solid #00ff00',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Detailed Results
          </button>
        </div>
      </div>
      
      {!showDetailedResults ? (
        /* Summary View */
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            {['blue', 'yellow', 'cyan'].map(algorithm => (
              <div key={algorithm} style={{
                border: '1px solid #444',
                borderRadius: '4px',
                padding: '12px',
                backgroundColor: algorithm === validationResults.conclusion.bestOverall ? 'rgba(0,255,0,0.15)' : 'rgba(255,255,255,0.05)',
                borderColor: algorithm === validationResults.conclusion.bestOverall ? '#00ff00' : '#444',
                cursor: 'pointer'
              }}
              onClick={() => {
                setSelectedAlgorithm(algorithm);
                setShowDetailedResults(true);
              }}
              >
                <div style={{ 
                  color: algorithm === 'blue' ? '#0088ff' : algorithm === 'yellow' ? '#ffff00' : '#00ffff', 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  {algorithm.toUpperCase()} DIAMOND
                  {algorithm === validationResults.conclusion.bestOverall && (
                    <div style={{ color: '#00ff00', fontSize: '11px', marginTop: '2px' }}>★ BEST ★</div>
                  )}
                </div>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ marginBottom: '3px' }}>
                    Hit Rate: <span style={{ color: '#00ff00', fontWeight: 'bold' }}>{validationResults[algorithm].hitRate}</span>
                  </div>
                  <div style={{ marginBottom: '3px' }}>
                    Avg Error: <span style={{ color: '#ffaa00' }}>{validationResults[algorithm].averageError}m</span>
                  </div>
                  <div style={{ marginBottom: '3px' }}>
                    Tests: <span style={{ color: '#fff' }}>{validationResults[algorithm].hits}/{validationResults[algorithm].totalTests}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#888' }}>
                    Misses: {validationResults[algorithm].misses}
                  </div>
                  <div style={{ fontSize: '10px', color: '#aaa', marginTop: '5px', fontStyle: 'italic' }}>
                    Click for details
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ borderTop: '1px solid #444', paddingTop: '12px', textAlign: 'center' }}>
            <div style={{ color: '#00ff00', fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>RECOMMENDATION</div>
            <div style={{ fontSize: '13px', marginBottom: '10px', color: '#fff' }}>{validationResults.conclusion.recommendation}</div>
          </div>
        </>
      ) : (
        /* Detailed View */
        <>
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
              {['blue', 'yellow', 'cyan'].map(algorithm => (
                <button 
                  key={algorithm}
                  onClick={() => setSelectedAlgorithm(algorithm)}
                  style={{
                    background: selectedAlgorithm === algorithm ? (algorithm === 'blue' ? '#0088ff' : algorithm === 'yellow' ? '#ffff00' : '#00ffff') : '#333',
                    color: selectedAlgorithm === algorithm ? '#fff' : '#aaa',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {algorithm.toUpperCase()} DIAMOND
                </button>
              ))}
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <h4 style={{ color: selectedAlgorithm === 'blue' ? '#0088ff' : selectedAlgorithm === 'yellow' ? '#ffff00' : '#00ffff', margin: '0 0 5px 0' }}>
                {selectedAlgorithm.toUpperCase()} DIAMOND - DETAILED RESULTS
              </h4>
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                Hit Rate: {validationResults[selectedAlgorithm].hitRate} | 
                Avg Error: {validationResults[selectedAlgorithm].averageError}m | 
                Tests: {validationResults[selectedAlgorithm].hits}/{validationResults[selectedAlgorithm].totalTests}
              </div>
            </div>
            
            <div style={{ maxHeight: '40vh', overflowY: 'auto', border: '1px solid #444', borderRadius: '4px', padding: '10px' }}>
              {validationResults[selectedAlgorithm].detailedResults.map((result, index) => (
                <div key={index} style={{
                  padding: '8px',
                  marginBottom: '5px',
                  backgroundColor: result.hit ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)',
                  border: `1px solid ${result.hit ? '#00ff0040' : '#ff000040'}`,
                  borderRadius: '3px',
                  fontSize: '11px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      {result.scenarioName}
                    </span>
                    <span style={{ color: result.hit ? '#00ff00' : '#ff6666' }}>
                      {result.hit ? '✓ HIT' : '✗ MISS'} ({result.error.toFixed(2)}m)
                    </span>
                  </div>
                  <div style={{ color: '#aaa', fontSize: '10px' }}>
                    Target: ({result.scenario.targetPos.x.toFixed(1)}, {result.scenario.targetPos.y.toFixed(1)}, {result.scenario.targetPos.z.toFixed(1)}) | 
                    Vel: ({result.scenario.targetVel.x.toFixed(1)}, {result.scenario.targetVel.y.toFixed(1)}, {result.scenario.targetVel.z.toFixed(1)}) | 
                    Time: {result.interceptTime?.toFixed(2) || 'N/A'}s
                  </div>
                  {!result.hit && (
                    <div style={{ color: '#ff9999', fontSize: '10px', marginTop: '2px' }}>
                      Closest approach: {result.error.toFixed(2)}m (threshold: 3.0m)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      <div style={{ borderTop: '1px solid #444', paddingTop: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.4' }}>
          <div>Press <kbd style={{ background: '#333', padding: '2px 4px', borderRadius: '2px' }}>V</kbd> again to run new tests</div>
          <div>Press <kbd style={{ background: '#333', padding: '2px 4px', borderRadius: '2px' }}>`</kbd> or <kbd style={{ background: '#333', padding: '2px 4px', borderRadius: '2px' }}>Esc</kbd> to close</div>
        </div>
      </div>
    </div>
  );
};

export default TargetingValidationResults;
