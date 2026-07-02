import type { DetailView } from '../types/purchase-tracker.types';
import KindBadge from './KindBadge';
import PurchaseTrackerBuyerFooter from './PurchaseTrackerBuyerFooter';
import PurchaseTrackerTimeline from './PurchaseTrackerTimeline';
import { CalendarIcon, CheckIcon } from './icons';

interface PurchaseTrackerDetailsProps {
  detail: DetailView;
}

/** Детальная карточка закупки с трек-лентой статуса */
export default function PurchaseTrackerDetails({ detail }: PurchaseTrackerDetailsProps) {
  return (
    <div
      className="w-full overflow-hidden rounded-2xl bg-white"
      style={{ border: '1px solid #E7E9F0', boxShadow: '0 1px 3px rgba(16,24,40,.05)' }}
    >
      {/* Шапка */}
      <div className="flex flex-col gap-1.5 px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #F0F2F7' }}>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-md bg-[#F2F4F7] px-[9px] py-1 text-[12.5px] font-bold text-[#475467]">
            № {detail.id}
          </span>
          <KindBadge kind={detail.kind} />
          <span
            className="rounded-full px-3 py-[5px] text-[12.5px] font-semibold"
            style={{ background: detail.pillBg, color: detail.pillFg }}
          >
            {detail.statusLabel}
          </span>
        </div>
        <div className="text-[17px] font-bold leading-[1.35] text-[#101828]">{detail.title}</div>
        <div className="text-[12.5px] text-[#667085]">
          Бюджет: {detail.budget} · Инициатор: {detail.initiator} · Создана {detail.created}
        </div>
      </div>

      {/* Баннер прогноза (для незавершённых) */}
      {detail.showForecast && (
        <div
          className="flex items-center gap-2.5 px-6 py-3"
          style={{ background: '#F6F2FF', borderBottom: '1px solid #EDE9FA' }}
        >
          <CalendarIcon color="#7C3AED" />
          <span className="text-[13.5px] text-[#5B21B6]">
            <b>Договор ожидается {detail.forecast}</b> — прогноз по срокам похожих закупок
          </span>
        </div>
      )}

      {/* Баннер «подписан» (для завершённых) */}
      {detail.isDone && (
        <div
          className="flex items-center gap-2.5 px-6 py-3"
          style={{ background: '#F0FBF4', borderBottom: '1px solid #DFF3E6' }}
        >
          <CheckIcon size={16} color="#16A34A" width={2.5} />
          <span className="text-[13.5px] font-semibold text-[#15803D]">{detail.signedLine}</span>
        </div>
      )}

      <PurchaseTrackerTimeline stages={detail.stages} />
      <PurchaseTrackerBuyerFooter detail={detail} />
    </div>
  );
}
