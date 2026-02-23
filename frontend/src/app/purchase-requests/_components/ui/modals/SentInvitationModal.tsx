'use client';

import { X } from 'lucide-react';

interface SentInvitationDetails {
  recipient: string;
  emailText: string;
}

interface SentInvitationModalProps {
  isOpen: boolean;
  details: SentInvitationDetails | null;
  onClose: () => void;
  onCopy?: () => Promise<void>;
  /** Открыть окно отправки письма с возможностью скорректировать получателя */
  onEditSend?: () => void;
}

export default function SentInvitationModal({
  isOpen,
  details,
  onClose,
  onCopy,
  onEditSend,
}: SentInvitationModalProps) {
  if (!isOpen || !details) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Отправленное приглашение на оценку</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Получатель
            </label>
            <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
              {details.recipient}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текст письма
            </label>
            <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg whitespace-pre-wrap">
              {details.emailText}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          {onEditSend && (
            <button
              onClick={onEditSend}
              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Редактировать отправку
            </button>
          )}
          {onCopy && (
            <button
              onClick={async () => {
                try {
                  await onCopy();
                } catch (error) {
                  console.error('Error copying sent invitation email:', error);
                  alert(error instanceof Error ? error.message : 'Не удалось скопировать письмо');
                }
              }}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Скопировать в буфер
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
