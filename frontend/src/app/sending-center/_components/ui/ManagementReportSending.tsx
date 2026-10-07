'use client';

import { Mail } from 'lucide-react';
import { useManagementReportSending } from '../hooks/useManagementReportSending';
import ManagementReportSendingDetails from './ManagementReportSendingDetails';
import SendingStatusMessage from './SendingStatusMessage';
import {
  MANAGEMENT_REPORT_DESCRIPTION,
  MANAGEMENT_REPORT_TEST_HINT,
} from '../constants/management-report-sending.constants';

/**
 * Раздел «Управленческая отчётность» центра отправки: рассылка презентации управленческой
 * отчётности по расписанию и тестовая отправка на тестовый адрес.
 */
export default function ManagementReportSending() {
  const { info, loading, sending, error, sendMessage, sendTest } = useManagementReportSending();

  return (
    <div className="space-y-4">
      {sendMessage && <SendingStatusMessage type={sendMessage.type} text={sendMessage.text} />}

      {error && <SendingStatusMessage type="error" text={error} />}

      <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Презентация управленческой отчётности</h2>
          <p className="text-sm text-gray-500 mt-1">{MANAGEMENT_REPORT_DESCRIPTION}</p>
        </div>

        {loading && <p className="text-sm text-gray-500">Загрузка сведений о рассылке…</p>}

        {info && <ManagementReportSendingDetails info={info} />}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={sendTest}
            disabled={sending || loading || !info?.testRecipient}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" />
            {sending ? 'Формирование и отправка…' : `Тестовая отправка${info ? ` на ${info.testRecipient}` : ''}`}
          </button>
          <span className="text-xs text-gray-500">{MANAGEMENT_REPORT_TEST_HINT}</span>
        </div>
      </div>
    </div>
  );
}
