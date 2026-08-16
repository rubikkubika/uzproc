'use client';

import { MessageSquare } from 'lucide-react';

interface ContractRemarksCellProps {
  contractId: number;
  contractInnerId: string | null;
  remarksCount: number | null;
  isOpen: boolean;
  onOpen: (contractId: number, contractInnerId: string | null, anchor: DOMRect) => void;
}

/** Ячейка колонки «Замечания»: иконка с количеством, по клику открывается список замечаний. */
export default function ContractRemarksCell({
  contractId,
  contractInnerId,
  remarksCount,
  isOpen,
  onOpen,
}: ContractRemarksCellProps) {
  const count = remarksCount ?? 0;
  if (count === 0) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  return (
    <span data-remarks-popup className="inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(contractId, contractInnerId, e.currentTarget.getBoundingClientRect());
        }}
        title={`Замечания (${count})`}
        aria-label="Показать замечания по договору"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
          isOpen
            ? 'bg-amber-100 border-amber-300 text-amber-800'
            : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-[11px] font-semibold leading-none">{count}</span>
      </button>
    </span>
  );
}
