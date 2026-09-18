'use client';

import { Mail } from 'lucide-react';
import { useDeliveryWeeklyReport } from '../hooks/useDeliveryWeeklyReport';
import DeliveryWeeklyReportPeriodCard from './DeliveryWeeklyReportPeriodCard';
import RecipientPicker from './RecipientPicker';
import SendingStatusMessage from './SendingStatusMessage';

/**
 * Подраздел «Недельный отчёт» вкладки «Поставки»: письмо с итогами поставок
 * за неделю (с прошлой пятницы по четверг) и за текущий месяц.
 */
export default function DeliveryWeeklyReport() {
  const { preview, recipient, pickRecipient, loading, sending, error, sendMessage, send } =
    useDeliveryWeeklyReport();

  return (
    <div className="space-y-4">
      {sendMessage && <SendingStatusMessage type={sendMessage.type} text={sendMessage.text} />}

      {error && <SendingStatusMessage type="error" text={error} />}

      <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Недельный отчёт по поставкам</h2>
          <p className="text-sm text-gray-500 mt-1">
            Письмо с итогами за неделю (с прошлой пятницы по четверг) и за текущий месяц:
            что поставлено, что просрочено без фактической даты и по каким поставкам не заполнена дата ЭСФ.
          </p>
        </div>

        {preview && (
          <div className="grid gap-3 md:grid-cols-2">
            <DeliveryWeeklyReportPeriodCard title="За неделю" period={preview.week} />
            <DeliveryWeeklyReportPeriodCard title="За текущий месяц" period={preview.month} />
          </div>
        )}

        {loading && <p className="text-sm text-gray-500">Загрузка данных отчёта…</p>}

        <div className="flex items-end gap-6 flex-wrap">
          <div className="min-w-[260px]">
            <RecipientPicker recipient={recipient} onPick={pickRecipient} disabled={sending} />
          </div>

          <div className="text-xs text-gray-500">
            Тема письма:{' '}
            <span className="text-gray-700">{preview?.subject ?? 'Отчёт по поставкам'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={send}
            disabled={sending || loading || !recipient.email.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" />
            {sending ? 'Отправка…' : 'Отправить'}
          </button>
          <span className="text-xs text-gray-500">
            Письмо уходит одному получателю.
          </span>
        </div>
      </div>
    </div>
  );
}
