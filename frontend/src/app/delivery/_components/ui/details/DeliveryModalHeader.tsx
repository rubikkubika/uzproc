import { Truck, X } from 'lucide-react';
import type { Delivery } from '../../types/delivery.types';

interface Props {
  delivery: Delivery;
  onClose: () => void;
}

/** Тёмная шапка карточки: номер поставки, договор, ответственный, сводный статус. */
export function DeliveryModalHeader({ delivery, onClose }: Props) {
  const subtitleParts = [
    delivery.contractInnerId ? `Договор ${delivery.contractInnerId}` : null,
    delivery.responsibleDisplayName,
  ].filter(Boolean);

  const statusParts = [delivery.status, delivery.shipmentStatus].filter(Boolean);
  const delivered = delivery.shipmentStatus === 'Поставлено';

  return (
    <div className="flex items-center justify-between bg-[#101828] px-[30px] py-[22px]">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-white/[.08]">
          <Truck className="h-5 w-5 text-[#a9b0c0]" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-bold tracking-[-.01em] text-white">
            Поставка № {delivery.innerId ?? delivery.id}
          </div>
          {subtitleParts.length > 0 && (
            <div className="mt-0.5 truncate text-[13px] text-[#8a92a6]">{subtitleParts.join(' · ')}</div>
          )}
        </div>
        {statusParts.length > 0 && (
          <span
            className={`ml-1.5 inline-flex flex-shrink-0 items-center gap-[7px] rounded-full px-[13px] py-1.5 text-[13px] font-bold ${
              delivered ? 'bg-[#22a15b]/[.16] text-[#63d996]' : 'bg-white/10 text-[#c3c9d6]'
            }`}
          >
            <span
              className={`h-[7px] w-[7px] rounded-full ${delivered ? 'bg-[#22a15b]' : 'bg-[#8a92a6]'}`}
            />
            {statusParts.join(' · ')}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] bg-white/[.05] text-[#8a92a6] transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
    </div>
  );
}
