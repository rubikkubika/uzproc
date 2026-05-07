'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import MultiSelectFilterDropdown from '@/app/purchase-plan/_components/filters/MultiSelectFilterDropdown';
import { useOverviewPurchasesByCfoData, buildPurchasesByCfoExportUrl, PurchasesByCfoItem } from '../hooks/useOverviewPurchasesByCfoData';
import { getBackendUrl } from '@/utils/api';

function useMultiSelect(options: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback((value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelected(new Set(options)), [options]);
  const deselectAll = useCallback(() => setSelected(new Set()), []);

  const open = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return { selected, isOpen, position, searchQuery, setSearchQuery, buttonRef, toggle, selectAll, deselectAll, open, close };
}

function formatAmount(value: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

interface PurchasesByCfoTabContentProps {
  enabled: boolean;
}

export function PurchasesByCfoTabContent({ enabled }: PurchasesByCfoTabContentProps) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const yearOptions = useMemo(() => {
    const years: string[] = [];
    for (let y = currentYear - 3; y <= currentYear + 1; y++) years.push(String(y));
    return years;
  }, [currentYear]);

  const [cfoOptions, setCfoOptions] = useState<string[]>([]);
  useEffect(() => {
    globalThis.fetch(`${getBackendUrl()}/api/cfos/names?for=purchase-requests`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: string[]) => setCfoOptions(data))
      .catch(() => setCfoOptions([]));
  }, []);

  const cfo = useMultiSelect(cfoOptions);
  const year = useMultiSelect(yearOptions);

  const { items, loading, error } = useOverviewPurchasesByCfoData({
    cfos: cfo.selected,
    years: year.selected,
    enabled,
  });

  const exportUrl = buildPurchasesByCfoExportUrl(cfo.selected, year.selected);

  const handleExport = useCallback(() => {
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = 'purchases-by-cfo.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [exportUrl]);

  return (
    <div className="space-y-2">
      {/* Фильтры */}
      <div className="bg-white rounded shadow px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-700">Фильтры:</span>

          {/* ЦФО */}
          <div className="relative">
            <button
              ref={cfo.buttonRef}
              type="button"
              onClick={() => (cfo.isOpen ? cfo.close() : cfo.open())}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ЦФО{cfo.selected.size > 0 && <span className="ml-1 bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px]">{cfo.selected.size}</span>}
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            <MultiSelectFilterDropdown
              isOpen={cfo.isOpen}
              position={cfo.position}
              searchQuery={cfo.searchQuery}
              options={cfoOptions}
              selectedValues={cfo.selected}
              onSearchChange={cfo.setSearchQuery}
              onToggle={cfo.toggle}
              onSelectAll={cfo.selectAll}
              onDeselectAll={cfo.deselectAll}
              onClose={cfo.close}
              buttonRef={cfo.buttonRef}
            />
          </div>

          {/* Год завершения */}
          <div className="relative">
            <button
              ref={year.buttonRef}
              type="button"
              onClick={() => (year.isOpen ? year.close() : year.open())}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Год{year.selected.size > 0 && <span className="ml-1 bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px]">{year.selected.size}</span>}
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            <MultiSelectFilterDropdown
              isOpen={year.isOpen}
              position={year.position}
              searchQuery={year.searchQuery}
              options={yearOptions}
              selectedValues={year.selected}
              onSearchChange={year.setSearchQuery}
              onToggle={year.toggle}
              onSelectAll={year.selectAll}
              onDeselectAll={year.deselectAll}
              onClose={year.close}
              buttonRef={year.buttonRef}
            />
          </div>

          {(cfo.selected.size > 0 || year.selected.size > 0) && (
            <button
              type="button"
              onClick={() => { cfo.deselectAll(); year.deselectAll(); }}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-700 border border-red-300 rounded hover:bg-red-50 transition-colors"
            >
              Сбросить
            </button>
          )}

          <div className="ml-auto">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Выгрузить Excel
            </button>
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded shadow">
        {loading && (
          <div className="px-4 py-6 text-center text-xs text-gray-500">Загрузка данных...</div>
        )}
        {!loading && error && (
          <div className="px-4 py-6 text-center text-xs text-red-600">Ошибка: {error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-gray-500">Нет данных по выбранным фильтрам</div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 border-b border-r border-gray-300 whitespace-nowrap">ЦФО</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 border-b border-r border-gray-300">Наименование</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 border-b border-r border-gray-300 whitespace-nowrap">Статус заявки</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-500 border-b border-r border-gray-300 whitespace-nowrap">Сумма заявки</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-500 border-b border-r border-gray-300 whitespace-nowrap">Сумма договора</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500 border-b border-r border-gray-300 whitespace-nowrap">Дата завершения</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 border-b border-gray-300 whitespace-nowrap">Контрагент</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id ?? idx} className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-2 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{item.cfo || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 max-w-xs truncate" title={item.name}>{item.name || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">{item.status || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 text-right whitespace-nowrap">{formatAmount(item.budgetAmount)}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 text-right whitespace-nowrap">{formatAmount(item.linkedContractAmount)}</td>
                    <td className="px-2 py-1.5 text-gray-700 border-r border-gray-200 text-center whitespace-nowrap">{formatDate(item.purchaseCompletionDate)}</td>
                    <td className="px-2 py-1.5 text-gray-700 max-w-xs truncate" title={item.linkedContractCounterparty || undefined}>{item.linkedContractCounterparty || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">
              Всего: {items.length} записей
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
