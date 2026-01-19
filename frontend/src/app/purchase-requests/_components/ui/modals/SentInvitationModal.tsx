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
}

export default function SentInvitationModal({
  isOpen,
  details,
  onClose,
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
      </div>
    </div>
  );
}
