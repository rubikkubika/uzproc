'use client';

import DeliveryPlanTable from './table/DeliveryPlanTable';

/**
 * Компонент "План поставок" - таблица с плановыми датами поставок спецификаций
 * Отображает спецификации в виде таблицы с фильтрами и диаграммой по дням месяца
 */
export default function DeliveryPlan() {
  return (
    <div className="h-full flex flex-col p-4">
      <DeliveryPlanTable />
    </div>
  );
}
