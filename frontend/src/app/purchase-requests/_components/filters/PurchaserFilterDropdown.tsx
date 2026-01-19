'use client';

import React from 'react';
import MultiSelectFilterDropdown from './MultiSelectFilterDropdown';

export interface PurchaserFilterDropdownProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  searchQuery: string;
  options: string[];
  selectedValues: Set<string>;
  onSearchChange: (query: string) => void;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export default function PurchaserFilterDropdown({
  isOpen,
  position,
  searchQuery,
  options,
  selectedValues,
  onSearchChange,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onClose,
  buttonRef,
}: PurchaserFilterDropdownProps) {
  return (
    <MultiSelectFilterDropdown
      isOpen={isOpen}
      position={position}
      searchQuery={searchQuery}
      options={options}
      selectedValues={selectedValues}
      onSearchChange={onSearchChange}
      onToggle={onToggle}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      onClose={onClose}
      buttonRef={buttonRef}
    />
  );
}
