import React from 'react';

const EntityTracker = ({ aliens, missiles, asteroids }) => {
  return (
    <>
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
    </>
  );
};

export default EntityTracker;
