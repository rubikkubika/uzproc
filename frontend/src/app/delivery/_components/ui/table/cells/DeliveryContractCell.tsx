'use client';

import Link from 'next/link';
import type { Delivery } from '../../../types/delivery.types';

const LINK = 'text-blue-600 hover:text-blue-800 hover:underline';

interface Props {
  delivery: Delivery;
  /** URL раздела поставок — параметр from, по нему кнопка «Назад» возвращает сюда */
  backUrl: string;
  /** Запоминает позицию в списке перед переходом */
  onNavigate: () => void;
}

/** Номер договора и номер заявки — ссылки в свои разделы (клик не открывает карточку поставки). */
export default function DeliveryContractCell({ delivery: d, backUrl, onNavigate }: Props) {
  const requestNumber = d.contractPurchaseRequestId ?? d.contractPurchaseRequestSystemId;
  const from = `from=${encodeURIComponent(backUrl)}`;
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate();
  };
  return (
    <div className="flex flex-col gap-0.5 min-w-0 tabular-nums">
      {d.contractId != null && d.contractInnerId ? (
        <Link href={`/contract/${d.contractId}?${from}`} onClick={onClick} className={`truncate ${LINK}`} title={d.contractInnerId}>
          {d.contractInnerId}
        </Link>
      ) : (
        <span className="truncate text-slate-900">{d.contractInnerId ?? '—'}</span>
      )}
      <span className="text-[11px] text-slate-500 truncate">
        Заявка{' '}
        {d.contractPurchaseRequestSystemId != null ? (
          <Link href={`/purchase-request/${d.contractPurchaseRequestSystemId}?${from}`} onClick={onClick} className={LINK}>
            {requestNumber}
          </Link>
        ) : (
          <span className="text-slate-900">{d.contractPurchaseRequestId ?? '—'}</span>
        )}
      </span>
    </div>
  );
}
