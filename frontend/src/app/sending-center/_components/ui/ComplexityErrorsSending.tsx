'use client';

import { Mail, ExternalLink } from 'lucide-react';
import { useComplexityErrors } from '../hooks/useComplexityErrors';
import SendingStatusMessage from './SendingStatusMessage';
import ComplexityErrorsTable from './ComplexityErrorsTable';

/**
 * Подраздел «Ошибка сложности» вкладки «Закупки»: закупки текущего года без сложности по закупщикам
 * и ручная отправка писем с просьбой создать запрос в поддержку 1С.
 */
export default function ComplexityErrorsSending() {
  const {
    preview, loading, error, sendMessage, sendingKey, isSendingAll, sendableCount,
    expanded, toggleExpanded, sendOne, sendAll,
  } = useComplexityErrors();

  return (
    <div className="space-y-4">
      {sendMessage && <SendingStatusMessage type={sendMessage.type} text={sendMessage.text} />}
      {error && <SendingStatusMessage type="error" text={error} />}

      <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ошибка сложности</h2>
            <p className="text-sm text-gray-700 mt-1">
              {preview
                ? `${preview.purchaseCount} закупок без сложности у ${preview.purchaserCount} закупщиков за ${preview.year}`
                : loading ? 'Загрузка…' : '—'}
              {preview && preview.withoutEmailCount > 0 && (
                <span className="text-red-500"> · без адреса: {preview.withoutEmailCount}</span>
              )}
            </p>
            {preview && (
              <p className="text-xs text-gray-500 mt-1">
                Письмо закупщику со ссылкой{' '}
                <a href={preview.supportRequestUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                  на запрос в 1С <ExternalLink className="w-3 h-3" />
                </a>
                {preview.cc.length > 0 && <> · копия: {preview.cc.join(', ')}</>}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={sendAll}
            disabled={sendingKey !== null || loading || sendableCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" />
            {isSendingAll ? 'Отправка…' : 'Отправить всем'}
          </button>
        </div>

        {preview && (
          <ComplexityErrorsTable
            purchasers={preview.purchasers}
            expanded={expanded}
            sendingKey={sendingKey}
            onToggle={toggleExpanded}
            onSend={sendOne}
          />
        )}
      </div>
    </div>
  );
}
