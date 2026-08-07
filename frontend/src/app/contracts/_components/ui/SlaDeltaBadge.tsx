'use client';

import { formatSlaDelta, getRemainderPercent, getSlaDeltaVariant } from '../utils/contractSla.utils';

interface Props {
  /** Отклонение от дедлайна: план − факт. */
  delta: number;
  /** Плановый срок (для расчёта доли остатка). */
  planned: number | null;
}

const VARIANT_CLASSES: Record<string, string> = {
  ok: 'bg-green-600 text-white',
  low: 'bg-yellow-400 text-black',
  overdue: 'bg-red-600 text-white',
  zero: 'bg-gray-200 text-gray-700',
};

/** Бейдж отклонения от дедлайна подготовки (как в трэке заявок). */
export default function SlaDeltaBadge({ delta, planned }: Props) {
  const variant = getSlaDeltaVariant(delta, planned);
  const remainderPct = getRemainderPercent(delta, planned);
  const title =
    variant === 'low' && remainderPct != null
      ? `Остаток ≤30% от планового (${remainderPct.toFixed(0)}%)`
      : undefined;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.5rem] h-4 rounded text-[10px] font-bold tabular-nums px-0.5 ${VARIANT_CLASSES[variant]}`}
      title={title}
    >
      {formatSlaDelta(delta)}
    </span>
  );
}
