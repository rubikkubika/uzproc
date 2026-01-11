'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Version } from '../types/purchase-plan-items.types';

interface PurchasePlanItemsVersionsModalProps {
  isOpen: boolean;
  selectedYear: number | null;
  versionDescription: string;
  onDescriptionChange: (description: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

/**
 * Компонент модального окна для создания новой версии плана закупок
 */
export default function PurchasePlanItemsVersionsModal({
  isOpen,
  selectedYear,
  versionDescription,
  onDescriptionChange,
  onCreate,
  onClose,
}: PurchasePlanItemsVersionsModalProps) {
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
          <h2 className="text-lg font-semibold text-gray-900">Создать редакцию</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Год</label>
            <input
              type="number"
              value={selectedYear || ''}
              disabled
              className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание редакции</label>
            <textarea
              value={versionDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Введите описание редакции..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
