import { useEffect } from 'react';

interface ClickOutsideRule {
  isOpen: boolean;
  close: () => void;
  selector: string;
}

export function useClickOutsideMany(rules: ClickOutsideRule[]) {
  useEffect(() => {
    // Проверяем, открыт ли хотя бы один dropdown
    const hasOpenDropdown = rules.some(rule => rule.isOpen);

    if (!hasOpenDropdown) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Проверяем каждый dropdown
      rules.forEach(rule => {
        if (rule.isOpen && !target.closest(rule.selector)) {
          rule.close();
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [rules]);
}
