'use client';

import { RotateCcw } from 'lucide-react';
import type { Delivery } from '../types/delivery.types';
import DeliveryDateInputRow from './DeliveryDateInputRow';

interface Props {
  delivery: Delivery;
  /** Сохраняет плановую дату вручную; пустая строка возвращает её в автоматический режим */
  onChangePlannedDate: (id: number, isoDate: string) => void;
  /** Сохраняет фактическую дату поставки; пустая строка очищает её */
  onChangeActualDate: (id: number, isoDate: string) => void;
  /** Сохраняет дату ЭСФ; пустая строка очищает её */
  onChangeEsfDate: (id: number, isoDate: string) => void;
}

/** Формат даты для показа: ДД.ММ.ГГГГ, либо «—» для пустого значения. */
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('ru-RU') : '—');

/**
 * Колонка «Даты поставки»: дедлайн (вычисляется автоматически) и редактируемые в таблице
 * плановая дата, факт и ЭСФ.
 * Плановая дата по умолчанию равна дедлайну; после ручного изменения она фиксируется
 * (помечается «вручную») и больше не меняется автоматическими пересчётами.
 * Факт и ЭСФ можно ввести вручную; при загрузке ручного отчёта заполненные в нём даты
 * заменяют введённые (пустые ячейки отчёта введённое не трогают).
 */
export default function DeliveryDatesCell({ delivery, onChangePlannedDate, onChangeActualDate, onChangeEsfDate }: Props) {
  const manual = delivery.plannedDeliveryDateManual;

  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="flex items-baseline gap-1" title="Дедлайн (вычисляется автоматически)">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 w-10 flex-shrink-0">Дедл.</span>
        <span className={delivery.deliveryDeadline ? 'text-gray-900' : 'text-gray-400'}>{formatDate(delivery.deliveryDeadline)}</span>
      </span>

      <DeliveryDateInputRow
        label="План."
        value={delivery.plannedDeliveryDate}
        title={manual
          ? 'Плановая дата поставки — задана вручную, автоматические пересчёты её не меняют'
          : 'Плановая дата поставки — по умолчанию равна дедлайну'}
        highlighted={manual}
        onCommit={(isoDate) => onChangePlannedDate(delivery.id, isoDate)}
        trailing={manual && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangePlannedDate(delivery.id, '');
            }}
            className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
            title="Вернуть автоматическую дату (равна дедлайну)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      />

      <DeliveryDateInputRow
        label="Факт"
        value={delivery.actualDeliveryDate}
        title="Факт — фактическая дата поставки. С датой поставка переходит в «Поставлено», без даты — снова ожидается"
        onCommit={(isoDate) => onChangeActualDate(delivery.id, isoDate)}
      />

      <DeliveryDateInputRow
        label="ЭСФ"
        value={delivery.esfDate}
        title="ЭСФ — дата выставления электронной счёт-фактуры"
        onCommit={(isoDate) => onChangeEsfDate(delivery.id, isoDate)}
      />
    </div>
  );
}
