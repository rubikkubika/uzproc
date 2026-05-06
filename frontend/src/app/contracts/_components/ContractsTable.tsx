'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Settings, Eye, EyeOff } from 'lucide-react';
import { useContractsTable } from './hooks/useContractsTable';
import { SortField } from './types/contracts.types';
import ContractsTableTabs from './ui/ContractsTableTabs';
import ContractsSummaryTable from './ui/ContractsSummaryTable';
import RemarksPanel from './RemarksPanel';

const ORGANIZATION_OPTIONS = [
  { key: '', label: 'Все' },
  { key: 'UZUM_MARKET', label: 'Uzum Market' },
  { key: 'UZUM_OOO', label: 'Uzum (OOO)' },
  { key: 'UZUM_TEZKOR', label: 'Uzum Tezkor' },
];

const STATUS_OPTIONS = [
  { key: '', label: 'Все' },
  { key: 'Проект', label: 'Проект' },
  { key: 'На согласовании', label: 'На согласовании' },
  { key: 'На регистрации', label: 'На регистрации' },
  { key: 'Подписан', label: 'Подписан' },
  { key: 'Не согласован', label: 'Не согласован' },
];

const formatDocumentForm = (form: string | null) => {
  if (!form) return '-';
  return form === 'Дополнительное соглашение' ? 'ДС' : form;
};

export default function ContractsTable() {
  const router = useRouter();
  const currentPath = usePathname();
  const [showRemarks, setShowRemarks] = useState(false);
  const [selectedDocumentForm, setSelectedDocumentForm] = useState<string>('');

  const {
    data,
    allItems,
    loading,
    loadingMore,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    selectedYear,
    setSelectedYear,
    currentYear,
    allYears,
    sortField,
    sortDirection,
    handleSort,
    handleResetFilters,
    filters,
    loadMoreRef,
    updateExcludeFromStatusCalculation,
    updateExcludeFromInWork,
    tabCounts,
    refreshTabCounts,
    summaryData,
    documentForms,
    signedSummaryData,
    signedDocumentForms,
    summaryCurrentYear,
    summaryLoading,
  } = useContractsTable();

  const isTabWithPreparedBy = filters.activeTab === 'in-work' || filters.activeTab === 'not-coordinated' || filters.activeTab === 'signed';
  const totalColumns = isTabWithPreparedBy ? 15 : 14;

  const handleRowClick = (contractId: number, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('select') || target.closest('button')) return;
    router.push(`/contract/${contractId}?from=${encodeURIComponent(currentPath)}`);
  };

  const handleRowAuxClick = (contractId: number, e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (target.closest('input') || target.closest('select') || target.closest('button')) return;
      window.open(`/contract/${contractId}?from=${encodeURIComponent(currentPath)}`, '_blank');
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-red-500">Ошибка: {error}</p>
      </div>
    );
  }

  const renderSortButton = (field: SortField) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center justify-center hover:text-gray-700 transition-colors flex-shrink-0"
      style={{ width: '16px', height: '16px', minWidth: '16px', padding: 0 }}
    >
      {sortField === field ? (
        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 flex-shrink-0" /> : <ArrowDown className="w-3 h-3 flex-shrink-0" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
      )}
    </button>
  );

  const renderFilterInput = (field: string) => (
    <input
      key={`filter-${field}`}
      type="text"
      data-filter-field={field}
      value={filters.localFilters[field] ?? ''}
      onChange={(e) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart ?? 0;
        filters.handleFilterChange(field, newValue);
        requestAnimationFrame(() => {
          const input = e.target as HTMLInputElement;
          if (input && document.activeElement === input) {
            input.setSelectionRange(Math.min(cursorPos, newValue.length), Math.min(cursorPos, newValue.length));
          }
        });
      }}
      onFocus={(e) => { e.stopPropagation(); filters.setFocusedField(field); }}
      onBlur={() => {
        setTimeout(() => {
          const active = document.activeElement as HTMLElement;
          if (active && !active.closest('input[data-filter-field]') && !active.closest('select')) {
            filters.setFocusedField(null);
          }
        }, 200);
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.stopPropagation(); }}
      className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
      placeholder="Фильтр"
      style={{ height: '22px', minWidth: 0, boxSizing: 'border-box' }}
    />
  );

  /* Структура каждой th: flex-col justify-between, фиксированная высота.
     Верхний блок — фильтр (22px), нижний — иконка + название. */
  const thInner = (filterSlot: React.ReactNode, labelSlot: React.ReactNode) => (
    <div className="flex flex-col justify-between" style={{ height: '52px' }}>
      <div className="flex items-center" style={{ height: '22px' }}>
        {filterSlot}
      </div>
      <div className="flex items-center gap-1 pb-0.5">
        {labelSlot}
      </div>
    </div>
  );

  const handlePreparedByClick = (name: string) => {
    if (filters.preparedByFilter === name && !selectedDocumentForm) {
      filters.setPreparedByFilter('');
      setSelectedDocumentForm('');
    } else {
      filters.setPreparedByFilter(name);
      filters.setLocalFilters(prev => ({ ...prev, documentForm: '' }));
      filters.setFilters(prev => ({ ...prev, documentForm: '' }));
      setSelectedDocumentForm('');
      filters.setActiveTab('in-work');
      setCurrentPage(0);
    }
  };

  const handleCellClick = (name: string, documentForm: string) => {
    filters.setPreparedByFilter(name);
    filters.setLocalFilters(prev => ({ ...prev, documentForm }));
    filters.setFilters(prev => ({ ...prev, documentForm }));
    setSelectedDocumentForm(documentForm);
    filters.setActiveTab('in-work');
    setCurrentPage(0);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Сводная таблица */}
      <div className="px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        <ContractsSummaryTable
          summaryData={summaryData}
          documentForms={documentForms}
          signedSummaryData={signedSummaryData}
          signedDocumentForms={signedDocumentForms}
          currentYear={summaryCurrentYear}
          loading={summaryLoading}
          selectedPreparedBy={filters.preparedByFilter}
          selectedDocumentForm={selectedDocumentForm}
          onPreparedByClick={handlePreparedByClick}
          onCellClick={handleCellClick}
        />
      </div>

      {/* Header */}
      <div className="px-3 py-1 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors whitespace-nowrap"
          >
            Сбросить фильтры
          </button>
          <button
            type="button"
            disabled
            title="Настройка колонок (для этой таблицы пока недоступна)"
            className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-lg border border-gray-300 cursor-not-allowed flex items-center gap-1 opacity-70"
          >
            <Settings className="w-3 h-3" />
            Колонки
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Год:</span>
            <button
              onClick={() => setSelectedYear(null)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${selectedYear === null ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Все
            </button>
            {allYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${selectedYear === year ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-gray-700 flex-shrink-0">
          Показано {allItems.length} из {data?.totalElements ?? 0} записей
        </div>
      </div>

      {/* Фильтр по организации заказчика */}
      <div className="px-3 py-1 border-b border-gray-200 flex items-center gap-2 bg-white flex-shrink-0">
        <span className="text-xs text-gray-500 whitespace-nowrap">Организация:</span>
        {ORGANIZATION_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => { filters.setOrganizationFilter(opt.key); setCurrentPage(0); }}
            className={`px-2 py-0.5 text-xs rounded-full border transition-colors whitespace-nowrap ${
              filters.organizationFilter === opt.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ContractsTableTabs
        activeTab={filters.activeTab}
        onTabChange={(tab) => { filters.setActiveTab(tab); setCurrentPage(0); setShowRemarks(false); }}
        showRemarks={showRemarks}
        onRemarksToggle={() => setShowRemarks(v => !v)}
        tabCounts={tabCounts}
      />

      {showRemarks ? (
        <RemarksPanel />
      ) : (
      <div className="flex-1 min-w-0 overflow-auto relative custom-scrollbar">
        <table className="w-full max-w-full border-collapse table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {/* Глазик */}
              <th className="px-1 text-center text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '32px', minWidth: '32px', maxWidth: '32px' }}>
                {thInner(
                  <div className="w-full" />,
                  <Eye className="w-3 h-3 text-gray-400 mx-auto" />
                )}
              </th>
              {/* Внутренний номер */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: isTabWithPreparedBy ? '7%' : '8%' }}>
                {thInner(
                  renderFilterInput('innerId'),
                  <>{renderSortButton('innerId')}<span>Внутренний номер</span></>
                )}
              </th>
              {/* Организация */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '8%' }}>
                {thInner(
                  <select
                    value={filters.organizationFilter}
                    onChange={(e) => { e.stopPropagation(); filters.setOrganizationFilter(e.target.value); setCurrentPage(0); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ height: '22px', boxSizing: 'border-box' }}
                  >
                    {ORGANIZATION_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>,
                  <span>Организация</span>
                )}
              </th>
              {/* №ЗП */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '5%' }}>
                {thInner(
                  renderFilterInput('purchaseRequestInnerId'),
                  <span>№ЗП</span>
                )}
              </th>
              {/* Дата утверждения ЗП */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '7%' }}>
                {thInner(
                  <div className="w-full" />,
                  <span>Дата утв. ЗП</span>
                )}
              </th>
              {/* Исполнитель */}
              {isTabWithPreparedBy && (
                <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '9%' }}>
                  {thInner(
                    <input
                      type="text"
                      value={filters.preparedByFilter}
                      onChange={(e) => { filters.setPreparedByFilter(e.target.value); setCurrentPage(0); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Фильтр"
                      style={{ height: '22px', boxSizing: 'border-box' }}
                    />,
                    <span>Исполнитель</span>
                  )}
                </th>
              )}
              {/* ЦФО */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '10%' }}>
                {thInner(
                  <div ref={filters.cfoFilterContainerRef} className="relative cfo-filter-container w-full">
                    <button
                      ref={filters.cfoFilterButtonRef}
                      type="button"
                      onClick={() => filters.setIsCfoFilterOpen(!filters.isCfoFilterOpen)}
                      className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 flex items-center gap-1 hover:bg-gray-50"
                      style={{ height: '22px', boxSizing: 'border-box' }}
                    >
                      <span className="text-gray-600 truncate flex-1 min-w-0 text-left">
                        {filters.cfoFilter.size === 0 ? 'Все' : filters.cfoFilter.size === 1 ? (Array.from(filters.cfoFilter)[0] || 'Все') : `${filters.cfoFilter.size} выбрано`}
                      </span>
                      <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${filters.isCfoFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {filters.isCfoFilterOpen && filters.cfoFilterPosition && (
                      <div
                        className="fixed z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                        style={{ top: `${filters.cfoFilterPosition.top}px`, left: `${filters.cfoFilterPosition.left}px` }}
                      >
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input
                              type="text"
                              value={filters.cfoSearchQuery}
                              onChange={(e) => { e.stopPropagation(); filters.setCfoSearchQuery(e.target.value); }}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Поиск..."
                            />
                          </div>
                        </div>
                        <div className="p-2 border-b border-gray-200 flex gap-2">
                          <button onClick={() => filters.handleCfoSelectAll()} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Все</button>
                          <button onClick={() => filters.handleCfoDeselectAll()} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">Снять</button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filters.getFilteredCfoOptions.length === 0 ? (
                            <div className="text-xs text-gray-500 p-2 text-center">Нет данных</div>
                          ) : (
                            filters.getFilteredCfoOptions.map((cfo) => (
                              <label key={cfo} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                                <input type="checkbox" checked={filters.cfoFilter.has(cfo)} onChange={() => filters.handleCfoToggle(cfo)} onClick={(e) => e.stopPropagation()} className="mr-2" />
                                <span className="text-xs text-gray-700">{cfo}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>,
                  <>{renderSortButton('cfo')}<span className="uppercase">ЦФО</span></>
                )}
              </th>
              {/* Наименование */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: isTabWithPreparedBy ? '18%' : '20%' }}>
                {thInner(
                  renderFilterInput('name'),
                  <>{renderSortButton('name')}<span>Наименование</span></>
                )}
              </th>
              {/* Контрагент */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: isTabWithPreparedBy ? '8%' : '9%' }}>
                {thInner(
                  renderFilterInput('supplier'),
                  <span>Контрагент</span>
                )}
              </th>
              {/* Форма документа */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '9%' }}>
                {thInner(
                  renderFilterInput('documentForm'),
                  <>{renderSortButton('documentForm')}<span>Форма документа</span></>
                )}
              </th>
              {/* Дата создания */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '7%' }}>
                {thInner(
                  <div className="w-full" />,
                  <>{renderSortButton('contractCreationDate')}<span>Дата создания</span></>
                )}
              </th>
              {/* Срок действия (план) */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '7%' }}>
                {thInner(
                  <div className="w-full" />,
                  <>{renderSortButton('plannedDeliveryStartDate')}<span>Срок действия (план)</span></>
                )}
              </th>
              {/* Статус */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '9%' }}>
                {thInner(
                  <select
                    value={filters.statusFilter}
                    onChange={(e) => { e.stopPropagation(); filters.setStatusFilter(e.target.value); setCurrentPage(0); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ height: '22px', boxSizing: 'border-box' }}
                  >
                    {STATUS_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>,
                  <>{renderSortButton('status')}<span>Статус</span></>
                )}
              </th>
              {/* Условия оплаты */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '9%' }}>
                {thInner(
                  renderFilterInput('paymentTerms'),
                  <span>Условия оплаты</span>
                )}
              </th>
              {/* Типовая форма */}
              <th className="px-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300" style={{ width: '6%' }}>
                {thInner(
                  <select
                    value={filters.isTypicalFormFilter}
                    onChange={(e) => { e.stopPropagation(); filters.setIsTypicalFormFilter(e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ height: '22px', boxSizing: 'border-box' }}
                  >
                    <option value="">Все</option>
                    <option value="true">Да</option>
                    <option value="false">Нет</option>
                  </select>,
                  <span>Типовая форма</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={totalColumns} className="px-6 py-8 text-center text-gray-500">Загрузка...</td>
              </tr>
            ) : allItems.length > 0 ? (
              allItems.map((contract) => {
                const isHidden = contract.excludeFromInWork === true;
                return (
                  <tr
                    key={contract.id}
                    className={`cursor-pointer leading-tight ${isHidden ? 'bg-gray-100 opacity-60 hover:opacity-80' : 'hover:bg-gray-50'}`}
                    onClick={(e) => handleRowClick(contract.id, e)}
                    onAuxClick={(e) => handleRowAuxClick(contract.id, e)}
                  >
                    <td className="px-1 py-2 text-center border-r border-gray-300" style={{ width: '32px', minWidth: '32px', maxWidth: '32px' }}>
                      <button
                        title={isHidden ? 'Показать во вкладке «В работе»' : 'Скрыть из вкладки «В работе»'}
                        onClick={(e) => { e.stopPropagation(); updateExcludeFromInWork(contract.id, !isHidden); }}
                        className={`flex items-center justify-center w-full h-full transition-colors ${isHidden ? 'text-gray-400 hover:text-gray-600' : 'text-gray-300 hover:text-gray-500'}`}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 break-words">{contract.innerId || '-'}</td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 break-words">{contract.customerOrganization || '-'}</td>
                    <td className="px-2 py-2 text-xs border-r border-gray-300 break-words">
                      {contract.purchaseRequestSystemId != null ? (
                        <Link
                          href={`/purchase-request/${contract.purchaseRequestSystemId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {contract.purchaseRequestInnerId ?? contract.purchaseRequestSystemId}
                        </Link>
                      ) : contract.purchaseRequestInnerId != null ? (
                        <span className="text-gray-900">{contract.purchaseRequestInnerId}</span>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                      {contract.purchaseCompletionDate ? new Date(contract.purchaseCompletionDate).toLocaleDateString('ru-RU') : '-'}
                    </td>
                    {isTabWithPreparedBy && (
                      <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 break-words">{contract.preparedBy || '-'}</td>
                    )}
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 break-words">{contract.cfo || '-'}</td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 break-words">{contract.name || contract.title || '-'}</td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 break-words">
                      {contract.suppliers && contract.suppliers.length > 0
                        ? contract.suppliers.map(s => s.name && s.inn ? `${s.name} (${s.inn})` : s.name || s.inn || '').join(', ')
                        : '-'}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 break-words">{formatDocumentForm(contract.documentForm)}</td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                      {contract.contractCreationDate ? new Date(contract.contractCreationDate).toLocaleDateString('ru-RU') : '-'}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                      {contract.plannedDeliveryStartDate ? new Date(contract.plannedDeliveryStartDate).toLocaleDateString('ru-RU') : '-'}
                    </td>
                    <td className="px-2 py-2 text-xs border-r border-gray-300">
                      {contract.status ? (
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                          contract.status === 'Подписан' ? 'bg-green-100 text-green-800' :
                          contract.status === 'На согласовании' ? 'bg-yellow-100 text-yellow-800' :
                          contract.status === 'На регистрации' ? 'bg-blue-100 text-blue-800' :
                          contract.status === 'Не согласован' ? 'bg-red-100 text-red-800' :
                          contract.status === 'Проект' ? 'bg-gray-200 text-gray-700' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {contract.status}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 break-words">{contract.paymentTerms || '-'}</td>
                    <td className="px-2 py-2 text-xs border-r border-gray-300 text-center">
                      {contract.isTypicalForm === true ? (
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">Да</span>
                      ) : contract.isTypicalForm === false ? (
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">Нет</span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={totalColumns} className="px-6 py-8 text-center text-gray-500">Нет данных для отображения</td>
              </tr>
            )}
          </tbody>
        </table>
        {loadingMore && (
          <div className="px-4 py-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
            Загрузка следующих...
          </div>
        )}
        <div ref={loadMoreRef} className="h-4 flex items-center justify-center py-1" />
      </div>
      )}
    </div>
  );
}
