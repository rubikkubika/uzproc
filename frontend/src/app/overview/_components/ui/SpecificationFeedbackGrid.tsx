'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import {
  fetchSpecificationFeedbackDashboard,
  SpecificationFeedbackDashboardItem,
} from '@/utils/specification-feedback.api';

const MONTHS_RU = [
  '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatAmount(value: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f-${i}`} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalf && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 opacity-50" />}
      {Array.from({ length: Math.max(0, empty) }).map((_, i) => (
        <Star key={`e-${i}`} className="w-3 h-3 text-gray-300" />
      ))}
      <span className="ml-1 text-xs text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
}

/** Карточка оценки одного ЦФО за месяц. */
function FeedbackCard({ item }: { item: SpecificationFeedbackDashboardItem }) {
  return (
    <div className="border border-gray-200 rounded p-1.5 bg-gray-50 min-w-0">
      <div className="flex items-start justify-between gap-1 mb-0.5">
        <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 truncate">
          {item.cfoName ?? '—'}
        </span>
        <div className="flex-shrink-0">{renderStars(item.overall ?? 0)}</div>
      </div>

      {item.ratedBy && (
        <div className="text-xs text-gray-500">Оценил: {item.ratedBy}</div>
      )}

      {item.comment ? (
        <div className="mt-0.5 rounded p-1 border border-gray-200 bg-white text-xs text-gray-700 line-clamp-3">
          {item.comment}
        </div>
      ) : (
        <div className="mt-0.5 text-xs text-gray-400">Комментария нет</div>
      )}

      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-xs text-gray-500">
        <span>Скорость: {item.speedRating != null ? item.speedRating.toFixed(1) : '—'}</span>
        <span>Исполнитель: {item.businessRating != null ? item.businessRating.toFixed(1) : '—'}</span>
        <span>Спец.: {item.specificationCount ?? '—'}</span>
        <span>Сумма: {formatAmount(item.totalAmount)}</span>
      </div>
      {item.ratedAt && (
        <div className="mt-0.5 text-[11px] text-gray-400">Оценено: {formatDate(item.ratedAt)}</div>
      )}
    </div>
  );
}

interface SpecificationFeedbackGridProps {
  year: number;
}

/**
 * Оценки работы закупок по спецификациям в виде карточек под графиками
 * (по аналогии с оценками закупок). Группировка по месяцам (свежий сверху),
 * внутри — карточки по ЦФО.
 */
export function SpecificationFeedbackGrid({ year }: SpecificationFeedbackGridProps) {
  const [items, setItems] = useState<SpecificationFeedbackDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchSpecificationFeedbackDashboard(controller.signal)
      .then((d) => setItems(d.items ?? []))
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError('Не удалось загрузить оценки');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  // Группировка по месяцу (год фильтруем по выбранному), свежий месяц сверху.
  const groups = useMemo(() => {
    const filtered = items.filter((i) => i.periodYear === year);
    const map = new Map<number, SpecificationFeedbackDashboardItem[]>();
    for (const it of filtered) {
      const key = it.periodMonth ?? 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([month, cards]) => ({
        month,
        cards: cards.sort((a, b) => (a.cfoName ?? '').localeCompare(b.cfoName ?? '', 'ru')),
      }));
  }, [items, year]);

  if (loading) {
    return <div className="text-center text-xs text-gray-500 py-4">Загрузка оценок…</div>;
  }
  if (error) {
    return <div className="text-center text-xs text-red-500 py-4">{error}</div>;
  }
  if (groups.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
        <div className="text-xs text-gray-500">Оценок по спецификациям за {year} год пока нет</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.month}>
          <div className="flex items-baseline gap-2 mb-1.5 px-0.5">
            <span className="text-xs font-semibold text-gray-700">
              {MONTHS_RU[g.month] ?? ''} {year}
            </span>
            <span className="ml-auto text-xs text-gray-400">{g.cards.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
            {g.cards.map((item, idx) => (
              <FeedbackCard key={`${item.cfoName}-${item.periodMonth}-${idx}`} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
