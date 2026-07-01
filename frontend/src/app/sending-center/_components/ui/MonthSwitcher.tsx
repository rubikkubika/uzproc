import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthYear } from '../constants/month.constants';

interface MonthSwitcherProps {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function MonthSwitcher({ year, month, onPrev, onNext }: MonthSwitcherProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onPrev}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
        title="Предыдущий месяц"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="min-w-[160px] text-center text-base font-semibold text-gray-900">
        {formatMonthYear(year, month)}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
        title="Следующий месяц"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
