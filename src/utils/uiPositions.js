// UI Position Management System
// Stores and manages positions for draggable UI elements

class UIPositionManager {
  constructor() {
    this.positions = this.loadPositions();
    this.isDragging = false;
    this.dragElement = null;
    this.dragOffset = { x: 0, y: 0 };
    this.initialMousePos = { x: 0, y: 0 };
    this.initialElementPos = { x: 0, y: 0 };
    
    // Bind event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    
    // Add global event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.handleMouseMove);
      window.addEventListener('mouseup', this.handleMouseUp);
    }
  }
  
  // Default positions for UI elements
  getDefaultPositions() {
    return {
      debugPanel: { x: 280, y: 20 },
      entityPanel: { x: 700, y: 20 },
      gamespacePanel: { x: 20, y: 20 },
      liveTargetingStats: { x: 560, y: 20 },
      validationResults: { x: 840, y: 20 },
      autoFireStats: { x: 300, y: 20 },
      // Add more UI elements as needed
    };
  }
  
  // Load positions from localStorage
  loadPositions() {
    try {
      const saved = localStorage.getItem('spaceinvader-ui-positions');
      if (saved) {
        const positions = JSON.parse(saved);
        // Merge with defaults to handle new UI elements
        return { ...this.getDefaultPositions(), ...positions };
      }
    } catch (error) {
      console.warn('Failed to load UI positions:', error);
    }
    return this.getDefaultPositions();
  }
  
  // Save positions to localStorage
  savePositions() {
    try {
      localStorage.setItem('spaceinvader-ui-positions', JSON.stringify(this.positions));
    } catch (error) {
      console.warn('Failed to save UI positions:', error);
    }
  }
  
  // Get position for a UI element
  getPosition(elementId) {
    return this.positions[elementId] || this.getDefaultPositions()[elementId] || { x: 20, y: 20 };
  }
  
  // Set position for a UI element
  setPosition(elementId, position) {
    this.positions[elementId] = { ...position };
    this.savePositions();
  }
  
  // Reset all positions to defaults
  resetPositions() {
    this.positions = this.getDefaultPositions();
    this.savePositions();
  }
  
  // Check if Ctrl key is pressed
  isCtrlPressed(event) {
    return event.ctrlKey || event.metaKey; // Support both Ctrl and Cmd (Mac)
  }
  
  // Get the scale factor of the UI overlay
  getUIScale() {
    // Try to find the UI overlay element
    const uiOverlay = document.querySelector('.ui-overlay');
    if (!uiOverlay) return { scaleX: 1, scaleY: 1 };
    
    // Get the computed transform matrix
    const style = window.getComputedStyle(uiOverlay);
    const transform = style.transform;
    
    if (transform === 'none') return { scaleX: 1, scaleY: 1 };
    
    // Parse the transform matrix
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
      // matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)
      return {
        scaleX: values[0] || 1,
        scaleY: values[3] || 1
      };
    }
    
    return { scaleX: 1, scaleY: 1 };
  }
  
  // Handle mouse down for dragging
  handleMouseDown(event, elementId) {
    if (!this.isCtrlPressed(event)) return false;
    
    event.preventDefault();
    event.stopPropagation();
    
    this.isDragging = true;
    this.dragElement = elementId;
    
    // Store initial mouse position and element position
    this.initialMousePos = {
      x: event.clientX,
      y: event.clientY
    };
    
    const currentPos = this.getPosition(elementId);
    this.initialElementPos = {
      x: currentPos.x,
      y: currentPos.y
    };
    
    // Add visual feedback
    event.currentTarget.style.cursor = 'grabbing';
    event.currentTarget.style.opacity = '0.8';
    event.currentTarget.style.zIndex = '10000';
    
    return true;
  }
  
  // Handle mouse move for dragging
  handleMouseMove(event) {
    if (!this.isDragging || !this.dragElement) return;
    
    event.preventDefault();
    
    // Get the scale factor
    const scale = this.getUIScale();
    
    // Calculate the mouse delta
    const mouseDelta = {
      x: event.clientX - this.initialMousePos.x,
      y: event.clientY - this.initialMousePos.y
    };
    
    // Apply the inverse scale to the mouse delta to account for any transforms
    const scaledDelta = {
      x: mouseDelta.x / scale.scaleX,
      y: mouseDelta.y / scale.scaleY
    };
    
    // Calculate new position
    const newPosition = {
      x: this.initialElementPos.x + scaledDelta.x,
      y: this.initialElementPos.y + scaledDelta.y
    };
    
    // Clamp to screen bounds (accounting for scale)
    const maxX = (window.innerWidth / scale.scaleX) - 200; // Leave margin for element width
    const maxY = (window.innerHeight / scale.scaleY) - 100; // Leave margin for element height at bottom
    
    // Allow elements to go all the way to the top (Y=0) and constrain the bottom
    newPosition.x = Math.max(0, Math.min(maxX, newPosition.x));
    newPosition.y = Math.max(0, Math.min(maxY, newPosition.y));
    
    this.setPosition(this.dragElement, newPosition);
    
    // Trigger re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('ui-position-changed', {
      detail: { elementId: this.dragElement, position: newPosition }
    }));
  }
  
  // Handle mouse up for dragging
  handleMouseUp(event) {
    if (this.isDragging) {
      // Remove visual feedback
      const elements = document.querySelectorAll('[data-draggable]');
      elements.forEach(el => {
        el.style.cursor = '';
        el.style.opacity = '';
        el.style.zIndex = '';
      });
    }
    
    this.isDragging = false;
    this.dragElement = null;
    this.dragOffset = { x: 0, y: 0 };
    this.initialMousePos = { x: 0, y: 0 };
    this.initialElementPos = { x: 0, y: 0 };
  }
  
  // Create draggable props for a UI element
  createDraggableProps(elementId) {
    const position = this.getPosition(elementId);
    
    return {
      'data-draggable': elementId,
      style: {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        touchAction: 'none',
        zIndex: this.isDragging && this.dragElement === elementId ? 10000 : undefined
      },
      onMouseDown: (event) => this.handleMouseDown(event, elementId),
      title: 'Hold Ctrl+Drag to move'
    };
  }
}

// Create singleton instance
const uiPositionManager = new UIPositionManager();

// Add a helper method to reset UI positions via console
if (typeof window !== 'undefined') {
  window.resetUIPositions = () => {
    uiPositionManager.resetPositions();
    window.dispatchEvent(new CustomEvent('ui-positions-reset'));
    console.log('UI positions reset to defaults');
  };
}

export default uiPositionManager;
