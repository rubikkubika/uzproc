'use client';

import React from 'react';
import { Download, Settings, Plus, X, Search } from 'lucide-react';
import { PurchasePlanItem, SortField, SortDirection, CfoSummaryItem, PurchaserSummaryItem } from '../types/purchase-plan-items.types';
import PurchasePlanItemsCfoSummaryTable from './PurchasePlanItemsCfoSummaryTable';
import PurchasePlanItemsSummaryTable from './PurchasePlanItemsSummaryTable';

interface PurchasePlanItemsTableHeaderProps {
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
  allYears: number[];
  selectedMonths: Set<number>;
  setSelectedMonths: (months: Set<number>) => void;
  selectedMonthYear: number | null;
  setSelectedMonthYear: (year: number | null) => void;
  selectedCurrency: 'UZS' | 'USD';
  setSelectedCurrency: (currency: 'UZS' | 'USD') => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onExportExcelAll: () => void;
  onCreateVersion: () => void;
  onViewVersions: () => void;
  onCreateItem: () => void;
  onColumnsSettings: () => void;
  isViewingArchiveVersion: boolean;
  selectedVersionInfo: any;
  // Новые пропсы для сводной таблицы и фильтров
  purchaserSummary: PurchaserSummaryItem[];
  purchaserFilter: Set<string>;
  setPurchaserFilter: (filter: Set<string>) => void;
  /** Разбивка свода по закупщикам по статусам «В плане» / «Связано с заявкой» / «Исключено» */
  showPurchaserStatusBreakdown?: boolean;
  /** Свод по ЦФО (отображается рядом со сводом по закупщикам) */
  cfoSummary?: CfoSummaryItem[];
  cfoFilter?: Set<string>;
  setCfoFilter?: (filter: Set<string>) => void;
  setCurrentPage: (page: number) => void;
  totalRecords: number;
  allItemsCount: number;
  // Пропсы для сброса фильтров
  onResetFilters: () => void;
  // Пропсы для версий
  selectedVersionId: number | null;
  onCloseVersion: () => void;
  canEdit: boolean;
  // Ref для кнопки колонок
  columnsMenuButtonRef?: React.RefObject<HTMLButtonElement | null>;
  /** Действия справа от сводок (напр. кнопка запуска тура) */
  actions?: React.ReactNode;
}

/**
 * Компонент заголовка таблицы плана закупок
 * Содержит элементы управления: выбор года, месяцев, валюты, экспорт, создание и т.д.
 * Структура соответствует оригинальному файлу PurchasePlanItemsTable.old.tsx
 */
export default function PurchasePlanItemsTableHeader({
  selectedYear,
  setSelectedYear,
  allYears,
  selectedMonths,
  setSelectedMonths,
  selectedMonthYear,
  setSelectedMonthYear,
  selectedCurrency,
  setSelectedCurrency,
  onExportPDF,
  onExportExcel,
  onExportExcelAll,
  onCreateVersion,
  onViewVersions,
  onCreateItem,
  onColumnsSettings,
  isViewingArchiveVersion,
  selectedVersionInfo,
  purchaserSummary,
  purchaserFilter,
  setPurchaserFilter,
  showPurchaserStatusBreakdown = false,
  cfoSummary,
  cfoFilter,
  setCfoFilter,
  setCurrentPage,
  totalRecords,
  allItemsCount,
  onResetFilters,
  selectedVersionId,
  onCloseVersion,
  canEdit,
  columnsMenuButtonRef,
  actions,
}: PurchasePlanItemsTableHeaderProps) {
  return (
    <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0">
      {/* Сводная таблица по закупщикам */}
      <div className="flex items-start w-full">
        <PurchasePlanItemsSummaryTable
          purchaserSummary={purchaserSummary}
          purchaserFilter={purchaserFilter}
          setPurchaserFilter={setPurchaserFilter}
          setCurrentPage={setCurrentPage}
          showStatusBreakdown={showPurchaserStatusBreakdown}
        />

          {/* Свод по ЦФО */}
          {cfoSummary && cfoFilter && setCfoFilter && (
            <div data-tour="cfo-summary" className="ml-3 min-w-0 overflow-x-auto">
              <PurchasePlanItemsCfoSummaryTable
                cfoSummary={cfoSummary}
                cfoFilter={cfoFilter}
                setCfoFilter={setCfoFilter}
                setCurrentPage={setCurrentPage}
                selectedYear={selectedYear}
              />
            </div>
          )}

          {/* Действия справа (кнопка обучения «?») */}
          {actions ? <div className="ml-auto pl-3 flex-shrink-0">{actions}</div> : null}
        </div>
    </div>
  );
}
