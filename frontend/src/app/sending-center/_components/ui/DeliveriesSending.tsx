'use client';

import { Mail } from 'lucide-react';
import { useDeliverySending } from '../hooks/useDeliverySending';
import { DAYS_AHEAD_OPTIONS } from '../constants/delivery-sending.constants';

/**
 * Раздел «Поставки» центра отправки: тестовое письмо о предстоящих поставках.
 * В письмо попадают поставки с плановой датой в выбранном горизонте,
 * ещё не отмеченные как «Поставлено».
 */
export default function DeliveriesSending() {
  const {
    days,
    setDays,
    recipient,
    setRecipient,
    count,
    loading,
    sending,
    error,
    sendMessage,
    send,
  } = useDeliverySending();

  return (
    <div className="space-y-4">
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

      <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Предстоящие поставки</h2>
          <p className="text-sm text-gray-500 mt-1">
            Письмо со списком поставок, плановая дата которых наступает в ближайшее время
            и которые ещё не отмечены как «Поставлено».
          </p>
        </div>

        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Горизонт</label>
            <div className="flex gap-1">
              {DAYS_AHEAD_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDays(option)}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    days === option
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {option} дней
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="delivery-recipient">
              Получатель
            </label>
            <input
              id="delivery-recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="a.retsko@uzum.com"
            />
          </div>

          <div className="text-sm text-gray-700">
            Поставок в письме:{' '}
            <strong className="text-gray-900">{loading ? '…' : count ?? 0}</strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={send}
            disabled={sending || !recipient.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" />
            {sending ? 'Отправка…' : 'Отправить тестовое письмо'}
          </button>
          <span className="text-xs text-gray-500">
            Письмо уходит одному получателю — это тестовая отправка.
          </span>
        </div>
      </div>
    </div>
  );
}
