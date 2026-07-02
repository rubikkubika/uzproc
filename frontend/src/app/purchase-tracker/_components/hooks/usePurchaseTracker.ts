import { useCallback, useMemo, useState } from 'react';
import type { DetailView, ResultView } from '../types/purchase-tracker.types';
import { buildDetailView, buildResultView } from '../utils/purchase-tracker.utils';
import { usePurchaseTrackerData } from './usePurchaseTrackerData';

interface UsePurchaseTrackerOptions {
  /** Показывать упрощённые названия ролей вместо официальных */
  simpleLanguage?: boolean;
  /** Показывать баннер прогноза даты договора */
  showForecast?: boolean;
}

interface UsePurchaseTrackerResult {
  query: string;
  onQueryChange: (value: string) => void;
  onChipClick: (value: string) => void;
  onSelect: (id: number) => void;
  results: ResultView[];
  /** Запрос введён, но ничего не найдено */
  empty: boolean;
  /** Запрос ещё не введён — показываем подсказку */
  idle: boolean;
  loading: boolean;
  error: string | null;
  detail: DetailView | null;
}

/**
 * Главный хук страницы «Трекер закупок»: query → загрузка с сервера → выбор карточки →
 * построение view-моделей карточек результата и детальной карточки.
 */
export function usePurchaseTracker(options: UsePurchaseTrackerOptions = {}): UsePurchaseTrackerResult {
  const { simpleLanguage = true, showForecast = true } = options;

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { items, loading, error } = usePurchaseTrackerData(query);

  // Выбранная закупка — только если она есть в текущих результатах
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  const results = useMemo(
    () => items.map((item) => buildResultView(item, selected?.id ?? -1)),
    [items, selected],
  );

  const detail = useMemo(
    () => (selected ? buildDetailView(selected, simpleLanguage, showForecast) : null),
    [selected, simpleLanguage, showForecast],
  );

  const onChipClick = useCallback((value: string) => setQuery(value), []);
  const onSelect = useCallback((id: number) => setSelectedId(id), []);

  const hasQuery = query.trim() !== '';

  return {
    query,
    onQueryChange: setQuery,
    onChipClick,
    onSelect,
    results,
    empty: hasQuery && !loading && items.length === 0 && !error,
    idle: !hasQuery,
    loading,
    error,
    detail,
  };
}
