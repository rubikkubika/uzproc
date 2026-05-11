'use client';

import { Clock, Check, X } from 'lucide-react';
import { Contract } from '../types/contracts.types';

interface Props {
  contract: Contract;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

export default function ContractTrackCell({ contract }: Props) {
  const {
    status,
    preparationWorkingDays,
    firstApprovalAssignmentDate,
    preparationStartDate,
    contractRequiresPurchase,
    purchaseCompletionDate,
    purchaseRequestId,
  } = contract;

  // Определяем стадию согласования
  const isOnApproval = status === 'На согласовании';
  const isOnRegistration = status === 'На регистрации';
  const isSigned = status === 'Подписан';
  const isNotCoordinated = status === 'Не согласован';

  // Подготовка завершена если есть первое согласование
  const isPreparationDone = firstApprovalAssignmentDate != null;
  const isPreparationStarted = preparationStartDate != null;

  // Tooltip для Подготовки
  const preparationTooltip = (() => {
    const parts: string[] = [];
    if (preparationStartDate) {
      let startLabel = 'Дата создания договора';
      if (purchaseRequestId != null) {
        if (contractRequiresPurchase === false) {
          startLabel = 'Дата назначения ЗП на утверждение';
        } else if (contractRequiresPurchase === true) {
          startLabel = 'Дата завершения закупки';
        }
      }
      parts.push(`${startLabel}: ${formatDate(preparationStartDate)}`);
    }
    if (firstApprovalAssignmentDate) {
      parts.push(`Дата первого согласования: ${formatDate(firstApprovalAssignmentDate)}`);
    } else {
      parts.push('Согласование ещё не начато (текущее время)');
    }
    if (preparationWorkingDays != null) {
      parts.push(`Рабочих дней подготовки: ${preparationWorkingDays}`);
    }
    return parts.join('\n');
  })();

  return (
    <div className="inline-flex items-start gap-0.5 overflow-hidden py-0.5">

      {/* Блок: Подготовка */}
      <div
        className="flex flex-col items-center gap-0.5 rounded border border-gray-300 px-1 py-0.5 min-w-[3rem]"
        title={preparationTooltip}
      >
        {!isPreparationStarted ? (
          <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0" />
        ) : isPreparationDone ? (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3 h-3 text-white" />
          </div>
        )}
        {preparationWorkingDays != null && (
          <span className={`inline-flex items-center justify-center min-w-[1.5rem] h-4 rounded text-white text-[10px] font-bold tabular-nums px-0.5 ${isPreparationDone ? 'bg-green-600' : 'bg-yellow-500'}`}>
            {preparationWorkingDays}
          </span>
        )}
        <span className="text-[9px] text-gray-500 whitespace-nowrap leading-none">Подготовка</span>
      </div>

      {/* Блок: Согласование */}
      <div
        className="flex flex-col items-center gap-0.5 rounded border border-gray-300 px-1 py-0.5 min-w-[3rem]"
        title={`Согласование: ${status || '—'}`}
      >
        {isNotCoordinated ? (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <X className="w-3 h-3 text-white" />
          </div>
        ) : isSigned || isOnRegistration ? (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : isOnApproval ? (
          <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3 h-3 text-white" />
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0" />
        )}
        <span className="text-[9px] text-gray-500 whitespace-nowrap leading-none">Согласование</span>
      </div>

      {/* Блок: Подписание */}
      <div
        className="flex flex-col items-center gap-0.5 rounded border border-gray-300 px-1 py-0.5 min-w-[3rem]"
        title={`Подписание: ${isSigned ? 'Подписан' : isOnRegistration ? 'На регистрации' : '—'}`}
      >
        {isSigned ? (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : isOnRegistration ? (
          <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3 h-3 text-white" />
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0" />
        )}
        <span className="text-[9px] text-gray-500 whitespace-nowrap leading-none">Подписание</span>
      </div>

    </div>
  );
}
