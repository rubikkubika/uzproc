'use client';

import { ON_TIME_DEFINITION, RESPONSIBLE_LEVEL_LABELS } from '../constants/delivery-dashboards.constants';

/** Легенда подсветки строк «По ответственным» и определения колонок. */
export function DeliveryResponsibleLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-600 px-1">
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-300" />
        {RESPONSIBLE_LEVEL_LABELS.critical}
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-300" />
        {RESPONSIBLE_LEVEL_LABELS.warning}
      </span>
      <span>Статусы и «Просрочено» — по всем поставкам на сегодня; «Поставлено» и «% в срок» — за выбранный год.</span>
      <span>{ON_TIME_DEFINITION}</span>
    </div>
  );
}
