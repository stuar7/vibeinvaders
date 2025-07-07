import { useGameStore } from '../store/gameStore';

export const useQueueProcessor = ({ 
  missileQueueRef, 
  effectsQueueRef, 
  weaponStateQueueRef, 
  damageQueueRef, 
  chargeQueueRef,
  updateMissiles,
  addEffect,
  damageArmor,
  damageShield,
  loseLife,
  updateChargeLevel
}) => {
  
  const processMissileQueue = () => {
    if (missileQueueRef.current.length > 0) {
      const queuedMissiles = [...missileQueueRef.current];
      missileQueueRef.current = [];
      
      // Add all queued missiles to the store in a single batch update
      if (queuedMissiles.length > 0) {
        const currentMissiles = useGameStore.getState().missiles;
        const newMissiles = queuedMissiles.map(item => {
          // Handle both formats: direct missile objects and wrapped objects
          if (item.type === 'add' && item.missile) {
            return item.missile;
          } else if (item.id && item.position && item.velocity) {
            // Direct missile object (charge weapons)
            return item;
          }
          console.warn('[QUEUE] Unknown missile format:', item);
          return null;
        }).filter(Boolean);
        
        const updatedMissiles = [...currentMissiles, ...newMissiles];
        updateMissiles(updatedMissiles);
      }
    }
  };

  const processEffectsQueue = () => {
    if (effectsQueueRef.current.length > 0) {
      const queuedEffects = [...effectsQueueRef.current];
      effectsQueueRef.current = [];
      
      // Add all queued effects to the store in a single batch update
      if (queuedEffects.length > 0) {
        queuedEffects.forEach(effect => {
          addEffect(effect);
        });
      }
    }
  };

  const processWeaponStateQueue = () => {
    if (weaponStateQueueRef.current.length > 0) {
      const queuedWeaponUpdates = [...weaponStateQueueRef.current];
      weaponStateQueueRef.current = [];
      
      // Process weapon state updates
      const gameStore = useGameStore.getState();
      queuedWeaponUpdates.forEach(update => {
        if (update.delay) {
          // Handle delayed operations (like battery recharge)
          setTimeout(() => {
            switch (update.type) {
              case 'rechargeBattery':
                gameStore.rechargeBattery(update.amount);
                break;
              default:
                break;
            }
          }, update.delay);
        } else {
          // Handle immediate operations
          switch (update.type) {
            case 'useAmmo':
              gameStore.useAmmo(update.weaponType, update.amount);
              break;
            case 'drainBattery':
              gameStore.drainBattery(update.amount);
              break;
            case 'rechargeBattery':
              gameStore.rechargeBattery(update.amount);
              break;
            default:
              break;
          }
        }
      });
    }
  };

  const processDamageQueue = () => {
    if (damageQueueRef.current.length > 0) {
      const queuedDamageUpdates = [...damageQueueRef.current];
      damageQueueRef.current = [];
      
      // Process damage updates
      queuedDamageUpdates.forEach(update => {
        switch (update.type) {
          case 'damageArmor':
            damageArmor(update.amount);
            break;
          case 'damageShield':
            damageShield();
            break;
          case 'loseLife':
            loseLife();
            break;
          default:
            break;
        }
      });
    }
  };

  const processChargeQueue = () => {
    if (chargeQueueRef.current.length > 0) {
      const queuedChargeUpdates = [...chargeQueueRef.current];
      chargeQueueRef.current = [];
      
      // Process charge updates
      queuedChargeUpdates.forEach(update => {
        switch (update.type) {
          case 'updateChargeLevel':
            updateChargeLevel();
            break;
          default:
            break;
        }
      });
    }
  };

  const processAllQueues = () => {
    processMissileQueue();
    processEffectsQueue();
    processWeaponStateQueue();
    processDamageQueue();
    processChargeQueue();
  };

  return {
    processMissileQueue,
    processEffectsQueue,
    processWeaponStateQueue,
    processDamageQueue,
    processChargeQueue,
    processAllQueues
  };
};