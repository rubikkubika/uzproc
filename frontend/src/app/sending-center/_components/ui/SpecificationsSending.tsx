'use client';

import { useSpecificationSending } from '../hooks/useSpecificationSending';
import MonthSwitcher from './MonthSwitcher';
import SpecificationSendingTable from './SpecificationSendingTable';

export default function SpecificationsSending() {
  const {
    year,
    month,
    rows,
    loading,
    error,
    sendingCfo,
    sendMessage,
    prevMonth,
    nextMonth,
    send,
    reload,
  } = useSpecificationSending();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <MonthSwitcher year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />
        <div className="text-sm text-gray-500">
          Подписанные спецификации по дате синхронизации
        </div>
      </div>

      {sendMessage && (
        <div
          className={`p-3 rounded-lg text-sm ${
            sendMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {sendMessage.text}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <SpecificationSendingTable rows={rows} sendingCfo={sendingCfo} onSend={send} onReload={reload} />
      )}
    </div>
  );
}
