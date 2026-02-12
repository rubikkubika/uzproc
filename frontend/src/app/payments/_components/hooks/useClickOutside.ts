import { useEffect, RefObject } from 'react';

interface UseClickOutsideProps {
  isOpen: boolean;
  ref: RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function useClickOutside({ isOpen, ref, onClose }: UseClickOutsideProps) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, ref, onClose]);
}
