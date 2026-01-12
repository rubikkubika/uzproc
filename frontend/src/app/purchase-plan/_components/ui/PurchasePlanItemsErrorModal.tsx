'use client';

import React from 'react';

interface PurchasePlanItemsErrorModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

/**
 * Компонент модального окна для отображения ошибок
 * Простое модальное окно с сообщением об ошибке и кнопкой закрытия
 */
export default function PurchasePlanItemsErrorModal({
  isOpen,
  message,
  onClose,
}: PurchasePlanItemsErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Ошибка</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
