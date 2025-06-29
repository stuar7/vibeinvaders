import { useEffect, useState } from 'react';

export function useKeyboard() {
  const [keys, setKeys] = useState({
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false,
    Enter: false,
    Escape: false,
    KeyH: false,
    KeyP: false,
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    KeyC: false,
    KeyF: false,
    KeyG: false,
    KeyQ: false,
    KeyE: false,
    KeyB: false,
    KeyZ: false,
    ShiftLeft: false,
    ShiftRight: false,
    ControlLeft: false,
    ControlRight: false,
    Digit1: false,
    Digit2: false,
    Digit3: false,
    Digit4: false,
    Digit5: false,
    Digit6: false,
    Digit7: false,
    Digit8: false,
    MouseLeft: false, // Left mouse button
    WheelUp: false,
    WheelDown: false,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      setKeys((prev) => {
        if (e.code in prev) {
          e.preventDefault();
          return { ...prev, [e.code]: true };
        }
        return prev;
      });
    };

    const handleKeyUp = (e) => {
      setKeys((prev) => {
        if (e.code in prev) {
          e.preventDefault();
          return { ...prev, [e.code]: false };
        }
        return prev;
      });
    };

    const handleMouseDown = (e) => {
      if (e.button === 0) { // Left mouse button
        setKeys((prev) => ({ ...prev, MouseLeft: true }));
      }
    };

    const handleMouseUp = (e) => {
      if (e.button === 0) { // Left mouse button
        setKeys((prev) => ({ ...prev, MouseLeft: false }));
      }
    };

    const handleWheel = (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        // Wheel up
        setKeys((prev) => ({ ...prev, WheelUp: true }));
        setTimeout(() => setKeys((prev) => ({ ...prev, WheelUp: false })), 100);
      } else if (e.deltaY > 0) {
        // Wheel down
        setKeys((prev) => ({ ...prev, WheelDown: true }));
        setTimeout(() => setKeys((prev) => ({ ...prev, WheelDown: false })), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return keys;
}