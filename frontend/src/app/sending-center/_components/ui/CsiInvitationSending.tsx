'use client';

import { FlaskConical } from 'lucide-react';
import { useCsiInvitationSending } from '../hooks/useCsiInvitationSending';
import CsiInvitationPreviewCard from './CsiInvitationPreviewCard';
import SendingStatusMessage from './SendingStatusMessage';
import {
  CSI_INVITATION_DESCRIPTION,
  CSI_INVITATION_TEST_HINT,
} from '../constants/purchase-sending.constants';

/**
 * Подраздел «Оценка закупки» вкладки «Закупки»: письмо инициатору с просьбой оценить работу закупок
 * (с подписанными договорами по закупке и датами регистрации) и его тестовая отправка.
 */
export default function CsiInvitationSending() {
  const { preview, loading, sending, error, sendMessage, sendTest } = useCsiInvitationSending();

  return (
    <div className="space-y-4">
      {sendMessage && <SendingStatusMessage type={sendMessage.type} text={sendMessage.text} />}
      {error && <SendingStatusMessage type="error" text={error} />}

      <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Оценка закупки</h2>
          <p className="text-sm text-gray-500 mt-1">{CSI_INVITATION_DESCRIPTION}</p>
        </div>

        {loading && <p className="text-sm text-gray-500">Загрузка примера письма…</p>}

        {preview && <CsiInvitationPreviewCard preview={preview} />}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={sendTest}
            disabled={sending || loading || !preview?.text || !preview.testRecipient}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FlaskConical className="w-4 h-4" />
            {sending ? 'Отправка…' : `Тестовая отправка${preview ? ` на ${preview.testRecipient}` : ''}`}
          </button>
          <span className="text-xs text-gray-500">{CSI_INVITATION_TEST_HINT}</span>
        </div>
      </div>
    </div>
  );
}
