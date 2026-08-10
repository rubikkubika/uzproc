'use client';

import Link from 'next/link';
import type { ContractSlaRow } from '../types/contract-sla.types';
import {
  deltaBadgeClasses,
  formatDate,
  formatDelta,
  formatDocumentForm,
  formatFactPlan,
} from '../utils/contractSlaDashboard.utils';

export interface ContractSlaTableRowProps {
  row: ContractSlaRow;
}

/** Ячейка этапа: «факт / план» и бейдж отклонения. */
function StageCell({
  factual,
  planned,
  delta,
}: {
  factual: number | null;
  planned: number | null;
  delta: number | null;
}) {
  return (
    <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 text-center whitespace-nowrap">
      <span className="inline-flex items-center gap-1">
        <span className="tabular-nums">{formatFactPlan(factual, planned)}</span>
        <span
          className={`inline-flex items-center justify-center min-w-[1.5rem] h-4 rounded text-[10px] font-bold tabular-nums px-0.5 ${deltaBadgeClasses(delta)}`}
        >
          {formatDelta(delta)}
        </span>
      </span>
    </td>
  );
}

/** Строка таблицы дашборда: документ с этапами «факт / план» и отклонениями. */
export function ContractSlaTableRow({ row }: ContractSlaTableRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 whitespace-nowrap overflow-hidden text-ellipsis">
        <Link href={`/contract/${row.id}`} className="text-blue-600 hover:underline truncate block" title="Перейти к договору">
          {row.innerId ?? row.id}
        </Link>
      </td>
      <td className="px-1.5 py-0.5 text-gray-900 border-r border-gray-200 overflow-hidden text-ellipsis" title={row.name ?? ''}>
        {row.name ?? '—'}
      </td>
      <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 overflow-hidden text-ellipsis whitespace-nowrap">
        {formatDocumentForm(row.documentForm, row.isTypicalForm)}
      </td>
      <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 overflow-hidden text-ellipsis" title={row.cfo ?? ''}>
        {row.cfo ?? '—'}
      </td>
      <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 overflow-hidden text-ellipsis" title={row.preparedBy ?? ''}>
        {row.preparedBy ?? '—'}
      </td>
      <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">
        {formatDate(row.signingDate)}
      </td>
      <StageCell
        factual={row.preparationWorkingDays}
        planned={row.plannedPreparationSlaDays}
        delta={row.preparationSlaDelta}
      />
      <StageCell
        factual={row.approvalWorkingDays}
        planned={row.plannedApprovalSlaDays}
        delta={row.approvalSlaDelta}
      />
      <StageCell
        factual={row.signingWorkingDays}
        planned={row.plannedSigningSlaDays}
        delta={row.signingSlaDelta}
      />
      <td className="px-1.5 py-0.5 text-gray-900 text-center whitespace-nowrap tabular-nums font-medium">
        {formatFactPlan(row.totalWorkingDays, row.totalPlannedSlaDays)}
      </td>
    </tr>
  );
}
