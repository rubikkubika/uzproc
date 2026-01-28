'use client';

interface PurchasePlanMonthBlockProps {
  title: string;
  isCurrentMonth?: boolean;
}

/**
 * UI компонент для блока месяца в плане закупок
 */
export function PurchasePlanMonthBlock({
  title,
  isCurrentMonth = false,
}: PurchasePlanMonthBlockProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Заголовок */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Контент блока (пока заглушка) */}
      <div className="min-h-[200px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
        <p className="text-gray-400 text-sm">
          {isCurrentMonth ? 'Контент текущего месяца' : 'Контент следующего месяца'}
        </p>
      </div>
    </div>
  );
}
