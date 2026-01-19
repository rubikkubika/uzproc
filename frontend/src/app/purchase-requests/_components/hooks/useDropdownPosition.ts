import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  top: number;
  left: number;
}

export function useDropdownPosition(isOpen: boolean, offset = 4) {
  const [position, setPosition] = useState<Position | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const calculatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY + offset,
        left: rect.left + window.scrollX,
      };
    }
    return null;
  }, [offset]);

  const recalc = useCallback(() => {
    if (isOpen) {
      const newPosition = calculatePosition();
      setPosition(newPosition);
    }
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const newPosition = calculatePosition();
      setPosition(newPosition);
    } else if (!isOpen) {
      setPosition(null);
    }
  }, [isOpen, calculatePosition]);

  return {
    position,
    buttonRef,
    recalc,
  };
}
