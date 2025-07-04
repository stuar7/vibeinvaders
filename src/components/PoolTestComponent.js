import React, { useEffect } from 'react';
import weaponMeshPool from '../systems/WeaponMeshPool2';

// Test component to verify pool functionality
function PoolTestComponent() {
  useEffect(() => {
    console.log('[POOL TEST] Testing weapon pool system...');
    
    // Test rocket acquisition
    console.log('[POOL TEST] Testing rocket pool...');
    const rocket1 = weaponMeshPool.acquire('rocket', 'test-rocket-1');
    const rocket2 = weaponMeshPool.acquire('rocket', 'test-rocket-2');
    
    if (rocket1 && rocket2) {
      console.log('[POOL TEST] ✓ Successfully acquired 2 rockets from pool');
      
      // Test positioning
      rocket1.position.set(10, 0, 0);
      rocket2.position.set(-10, 0, 0);
      console.log('[POOL TEST] ✓ Rocket positioning works');
      
      // Test color update
      if (rocket1.userData.updateColor) {
        rocket1.userData.updateColor('#ff0000');
        console.log('[POOL TEST] ✓ Rocket color update works');
      }
      
      // Return rockets to pool
      setTimeout(() => {
        weaponMeshPool.release('test-rocket-1');
        weaponMeshPool.release('test-rocket-2');
        console.log('[POOL TEST] ✓ Rockets returned to pool');
        
        // Show final stats
        const stats = weaponMeshPool.getStats();
        console.log('[POOL TEST] Final pool stats:', stats);
      }, 2000);
      
    } else {
      console.error('[POOL TEST] ✗ Failed to acquire rockets from pool');
    }
    
    // Test BFG
    console.log('[POOL TEST] Testing BFG pool...');
    const bfg = weaponMeshPool.acquire('bfg', 'test-bfg-1');
    if (bfg) {
      console.log('[POOL TEST] ✓ Successfully acquired BFG from pool');
      setTimeout(() => {
        weaponMeshPool.release('test-bfg-1');
        console.log('[POOL TEST] ✓ BFG returned to pool');
      }, 1000);
    }
    
    // Test bomb
    console.log('[POOL TEST] Testing bomb pool...');
    const bomb = weaponMeshPool.acquire('bomb', 'test-bomb-1');
    if (bomb) {
      console.log('[POOL TEST] ✓ Successfully acquired bomb from pool');
      
      // Test bomb animation
      if (bomb.userData.updateAnimation) {
        bomb.userData.updateAnimation(true);
        console.log('[POOL TEST] ✓ Bomb animation update works');
      }
      
      setTimeout(() => {
        weaponMeshPool.release('test-bomb-1');
        console.log('[POOL TEST] ✓ Bomb returned to pool');
      }, 1500);
    }
    
    // Show initial stats
    const initialStats = weaponMeshPool.getStats();
    console.log('[POOL TEST] Initial pool stats:', initialStats);
    
  }, []);
  
  return null; // This component doesn't render anything
}

export default PoolTestComponent;