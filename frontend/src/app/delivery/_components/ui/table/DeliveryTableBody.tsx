'use client';

import type { RefObject } from 'react';
import type { DeliveryRowView } from '../../types/delivery-view.types';
import DeliveryTableRow, { type DeliveryRowHandlers } from './DeliveryTableRow';
import DeliveryTableSkeleton from './DeliveryTableSkeleton';
import DeliveryTableEmpty from './DeliveryTableEmpty';

interface Props extends DeliveryRowHandlers {
  rows: DeliveryRowView[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  onReset: () => void;
}

/** Тело таблицы: скелетон, пустой результат или строки с бесконечной подгрузкой. */
export default function DeliveryTableBody({ rows, loading, loadingMore, hasMore, loadMoreRef, onReset, ...handlers }: Props) {
  if (loading) return <DeliveryTableSkeleton />;
  if (rows.length === 0) return <DeliveryTableEmpty onReset={onReset} />;

  return (
    <>
      {rows.map((row, index) => (
        <DeliveryTableRow key={`${row.delivery.id}-${index}`} row={row} isFirst={index === 0} {...handlers} />
      ))}
      <div className="py-2.5 text-center text-[11px] text-slate-400">
        {loadingMore ? 'Загрузка следующих...' : hasMore ? 'Прокрутите вниз, чтобы загрузить ещё' : 'Все записи загружены'}
      </div>
      <div ref={loadMoreRef} className="h-4" />
    </>
  );
}
