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
    approvalWorkingDays,
    signingWorkingDays,
    firstApprovalAssignmentDate,
    preparationStartDate,
    contractRequiresPurchase,
    purchaseCompletionDate,
    purchaseRequestId,
    registrationDate,
    synchronizationDate,
    documentForm,
  } = contract;

  // Определяем стадию согласования
  const isOnApproval = status === 'На согласовании';
  const isOnSynchronization = status === 'На синхронизации';
  const isOnRegistration = status === 'На регистрации';
  const isSigned = status === 'Подписан';
  const isNotCoordinated = status === 'Не согласован';

  // Подготовка завершена если есть первое согласование ИЛИ статус уже прошёл этап согласования
  const isPreparationDone = firstApprovalAssignmentDate != null || isOnSynchronization || isOnRegistration || isSigned || isNotCoordinated;
  const isPreparationStarted = preparationStartDate != null;

  // Tooltip для Согласования
  const approvalTooltip = (() => {
    const parts: string[] = [`Согласование: ${status || '—'}`];
    if (firstApprovalAssignmentDate) {
      parts.push(`Дата первого согласования: ${formatDate(firstApprovalAssignmentDate)}`);
    }
    if (isOnApproval) {
      parts.push('Согласование идёт (по текущее время)');
    }
    if (approvalWorkingDays != null) {
      parts.push(`Рабочих дней согласования: ${approvalWorkingDays}`);
    }
    return parts.join('\n');
  })();

  // Tooltip для Подписания
  const isSpecification = documentForm === 'Спецификация';
  const signingEndDate = isSpecification ? synchronizationDate : registrationDate;
  const signingTooltip = (() => {
    const parts: string[] = [`Подписание: ${isSigned ? 'Подписан' : isOnRegistration ? 'На регистрации' : isOnSynchronization ? 'На синхронизации' : '—'}`];
    if (signingEndDate) {
      parts.push(`Дата ${isSpecification ? 'синхронизации' : 'регистрации'}: ${formatDate(signingEndDate)}`);
    } else if (isOnRegistration || isOnSynchronization) {
      parts.push('Подписание идёт (по текущее время)');
    }
    if (signingWorkingDays != null) {
      parts.push(`Рабочих дней подписания: ${signingWorkingDays}`);
    }
    return parts.join('\n');
  })();

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
    <div className="inline-flex items-start gap-0.5 overflow-hidden py-0.5 max-w-full">

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
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-4 rounded bg-gray-200 text-gray-700 text-[10px] font-bold tabular-nums px-0.5">
            {preparationWorkingDays}
          </span>
        )}
        <span className="text-[9px] text-gray-500 whitespace-nowrap leading-none">Подготовка</span>
      </div>

      {/* Блок: Согласование */}
      <div
        className="flex flex-col items-center gap-0.5 rounded border border-gray-300 px-1 py-0.5 min-w-[3rem]"
        title={approvalTooltip}
      >
        {isNotCoordinated ? (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <X className="w-3 h-3 text-white" />
          </div>
        ) : isSigned || isOnRegistration || isOnSynchronization ? (
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
        {approvalWorkingDays != null && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-4 rounded bg-gray-200 text-gray-700 text-[10px] font-bold tabular-nums px-0.5">
            {approvalWorkingDays}
          </span>
        )}
        <span className="text-[9px] text-gray-500 whitespace-nowrap leading-none">Согласование</span>
      </div>

      {/* Блок: Подписание */}
      <div
        className="flex flex-col items-center gap-0.5 rounded border border-gray-300 px-1 py-0.5 min-w-[3rem]"
        title={signingTooltip}
      >
        {isSigned ? (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : isOnRegistration || isOnSynchronization ? (
          <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3 h-3 text-white" />
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0" />
        )}
        {signingWorkingDays != null && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-4 rounded bg-gray-200 text-gray-700 text-[10px] font-bold tabular-nums px-0.5">
            {signingWorkingDays}
          </span>
        )}
        <span className="text-[9px] text-gray-500 whitespace-nowrap leading-none">Подписание</span>
      </div>

      {/* Блок: Срок (общий) */}
      {(() => {
        const prep = preparationWorkingDays ?? 0;
        const appr = approvalWorkingDays ?? 0;
        const sign = signingWorkingDays ?? 0;
        const total = prep + appr + sign;
        if (total === 0) return null;
        const parts: string[] = [];
        if (prep > 0) parts.push(`подготовка ${prep} дн.`);
        if (appr > 0) parts.push(`согласование ${appr} дн.`);
        if (sign > 0) parts.push(`подписание ${sign} дн.`);
        return (
          <div
            className="inline-flex flex-col items-center gap-0.5 rounded border border-gray-400 px-1 py-0.5 min-w-0"
            title={`Общий срок: ${parts.join(' + ')} = ${total} дн.`}
          >
            <span className="inline-flex items-center justify-center min-w-[1.75rem] w-[1.75rem] h-5 rounded bg-black text-white text-xs font-bold tabular-nums">
              {total}
            </span>
            <span className="text-[10px] text-gray-500 whitespace-nowrap leading-none">Срок</span>
          </div>
        );
      })()}

    </div>
  );
}
