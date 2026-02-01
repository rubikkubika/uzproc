'use client';

import React from 'react';
import CfoFilterDropdown from '../filters/CfoFilterDropdown';
import CompanyFilterDropdown from '../filters/CompanyFilterDropdown';
import PurchaserCompanyFilterDropdown from '../filters/PurchaserCompanyFilterDropdown';
import CategoryFilterDropdown from '../filters/CategoryFilterDropdown';
import PurchaserFilterDropdown from '../filters/PurchaserFilterDropdown';
import StatusFilterDropdown from '../filters/StatusFilterDropdown';

/**
 * Тип данных для одного фильтра
 */
type FilterData = {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  searchQuery: string;
  options: string[];
  selectedValues: Set<string>;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  onSearchChange: (query: string) => void;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectVisible?: (options: string[]) => void;
  onDeselectVisible?: (options: string[]) => void;
  onClose: () => void;
};

/**
 * Пропсы для компонента PurchasePlanItemsTableFilters
 */
interface PurchasePlanItemsTableFiltersProps {
  filters: {
    cfo?: FilterData;
    company?: FilterData;
    purchaserCompany?: FilterData;
    category?: FilterData;
    purchaser?: FilterData;
    status?: FilterData;
  };
}

/**
 * Компонент для отображения всех фильтров таблицы
 * 
 * Использует конкретные компоненты фильтров вместо универсального FilterDropdown.
 * Каждый фильтр изолирован и отвечает только за свой UI.
 * Вся бизнес-логика находится в usePurchasePlanItemsFilters.
 */
export default function PurchasePlanItemsTableFilters({
  filters,
}: PurchasePlanItemsTableFiltersProps) {
  return (
    <>
      {filters.cfo && (
        <CfoFilterDropdown
          isOpen={filters.cfo.isOpen}
          position={filters.cfo.position}
          searchQuery={filters.cfo.searchQuery}
          options={filters.cfo.options}
          selectedValues={filters.cfo.selectedValues}
          buttonRef={filters.cfo.buttonRef}
          onSearchChange={filters.cfo.onSearchChange}
          onToggle={filters.cfo.onToggle}
          onSelectAll={filters.cfo.onSelectAll}
          onDeselectAll={filters.cfo.onDeselectAll}
          onClose={filters.cfo.onClose}
        />
      )}
      {filters.company && (
        <CompanyFilterDropdown
          isOpen={filters.company.isOpen}
          position={filters.company.position}
          searchQuery={filters.company.searchQuery}
          options={filters.company.options}
          selectedValues={filters.company.selectedValues}
          buttonRef={filters.company.buttonRef}
          onSearchChange={filters.company.onSearchChange}
          onToggle={filters.company.onToggle}
          onSelectAll={filters.company.onSelectAll}
          onDeselectAll={filters.company.onDeselectAll}
          onClose={filters.company.onClose}
        />
      )}
      {filters.purchaserCompany && (
        <PurchaserCompanyFilterDropdown
          isOpen={filters.purchaserCompany.isOpen}
          position={filters.purchaserCompany.position}
          searchQuery={filters.purchaserCompany.searchQuery}
          options={filters.purchaserCompany.options}
          selectedValues={filters.purchaserCompany.selectedValues}
          buttonRef={filters.purchaserCompany.buttonRef}
          onSearchChange={filters.purchaserCompany.onSearchChange}
          onToggle={filters.purchaserCompany.onToggle}
          onSelectAll={filters.purchaserCompany.onSelectAll}
          onDeselectAll={filters.purchaserCompany.onDeselectAll}
          onClose={filters.purchaserCompany.onClose}
        />
      )}
      {filters.category && (
        <CategoryFilterDropdown
          isOpen={filters.category.isOpen}
          position={filters.category.position}
          searchQuery={filters.category.searchQuery}
          options={filters.category.options}
          selectedValues={filters.category.selectedValues}
          buttonRef={filters.category.buttonRef}
          onSearchChange={filters.category.onSearchChange}
          onToggle={filters.category.onToggle}
          onSelectAll={filters.category.onSelectAll}
          onDeselectAll={filters.category.onDeselectAll}
          onClose={filters.category.onClose}
        />
      )}
      {filters.purchaser && (
        <PurchaserFilterDropdown
          isOpen={filters.purchaser.isOpen}
          position={filters.purchaser.position}
          searchQuery={filters.purchaser.searchQuery}
          options={filters.purchaser.options}
          selectedValues={filters.purchaser.selectedValues}
          buttonRef={filters.purchaser.buttonRef}
          onSearchChange={filters.purchaser.onSearchChange}
          onToggle={filters.purchaser.onToggle}
          onSelectAll={filters.purchaser.onSelectAll}
          onDeselectAll={filters.purchaser.onDeselectAll}
          onClose={filters.purchaser.onClose}
        />
      )}
      {filters.status && (
        <StatusFilterDropdown
          isOpen={filters.status.isOpen}
          position={filters.status.position}
          searchQuery={filters.status.searchQuery}
          options={filters.status.options}
          selectedValues={filters.status.selectedValues}
          buttonRef={filters.status.buttonRef}
          onSearchChange={filters.status.onSearchChange}
          onToggle={filters.status.onToggle}
          onSelectAll={filters.status.onSelectAll}
          onDeselectAll={filters.status.onDeselectAll}
          onSelectVisible={filters.status.onSelectVisible}
          onDeselectVisible={filters.status.onDeselectVisible}
          onClose={filters.status.onClose}
        />
      )}
    </>
  );
}
