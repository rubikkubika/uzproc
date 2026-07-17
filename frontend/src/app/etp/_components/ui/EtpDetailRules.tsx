'use client';

import { EtpProcedure } from '../types/etp.types';
import { formatDateTime } from '../utils/etp.utils';

interface Props {
  procedure: EtpProcedure;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-100 last:border-b-0">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  );
}

export default function EtpDetailRules({ procedure: p }: Props) {
  const r = p.rules;
  return (
    <div>
      <Row label="Тип" value={`${p.etpTypeName} · ${p.procTypeName}`} />
      <Row label="Валюта запроса" value={r.currency || 'UZS'} />
      <Row label="Учёт НДС" value={r.vat ? 'С учётом НДС' : 'Без учёта НДС'} />
      {r.renewalTimeMin != null && <Row label="Автопродление" value={`${r.renewalTimeMin} мин`} />}
      {r.decreaseStep != null && (
        <Row label="Мин. шаг снижения" value={r.decreaseStep ? String(r.decreaseStep) : 'Без минимального шага'} />
      )}
      {r.viewSubmissions != null && (
        <Row label="Организатор видит предложения" value={r.viewSubmissions ? 'Да' : 'Нет'} />
      )}
      {r.openDate && <Row label="Дата открытия" value={formatDateTime(r.openDate)} />}
      <Row label="Этапов" value={p.stagesCount} />
    </div>
  );
}
