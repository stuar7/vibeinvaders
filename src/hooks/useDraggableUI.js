import { useState, useEffect } from 'react';
import uiPositionManager from '../utils/uiPositions';

export const useDraggableUI = (elementId) => {
  const [position, setPosition] = useState(() => uiPositionManager.getPosition(elementId));
  
  useEffect(() => {
    const handlePositionChange = (event) => {
      if (event.detail.elementId === elementId) {
        setPosition(event.detail.position);
      }
    };
    
    const handlePositionsReset = () => {
      setPosition(uiPositionManager.getPosition(elementId));
    };
    
    window.addEventListener('ui-position-changed', handlePositionChange);
    window.addEventListener('ui-positions-reset', handlePositionsReset);
    
    return () => {
      window.removeEventListener('ui-position-changed', handlePositionChange);
      window.removeEventListener('ui-positions-reset', handlePositionsReset);
    };
  }, [elementId]);
  
  return {
    position,
    draggableProps: uiPositionManager.createDraggableProps(elementId)
  };
};

export default useDraggableUI;