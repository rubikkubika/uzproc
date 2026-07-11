import type { DetailView } from '../types/purchase-tracker.types';
import { UserIcon } from './icons';

interface PurchaseTrackerBuyerFooterProps {
  detail: DetailView;
}

/** Футер детальной карточки — контакт закупщика */
export default function PurchaseTrackerBuyerFooter({ detail }: PurchaseTrackerBuyerFooterProps) {
  return (
    <div
      className="flex items-center gap-3 px-6 py-3.5"
      style={{ background: '#FAFBFC', borderTop: '1px solid #F0F2F7' }}
    >
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#EDE9FE]">
        <UserIcon size={18} color="#6D28D9" />
      </div>
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-[#101828]">{detail.buyer} — ваш закупщик</span>
        <span className="text-xs text-[#667085]">Ответит на вопросы по этой закупке</span>
      </div>
      {detail.phone && (
        <span className="ml-auto rounded-full bg-[#F2F4F7] px-3 py-1.5 text-[12.5px] text-[#475467]">
          {detail.phone}
        </span>
      )}
      <button
        type="button"
        className={`${detail.phone ? '' : 'ml-auto '}cursor-pointer rounded-full border-none bg-[#7C3AED] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#6D28D9]`}
      >
        Задать вопрос
      </button>
    </div>
  );
}
