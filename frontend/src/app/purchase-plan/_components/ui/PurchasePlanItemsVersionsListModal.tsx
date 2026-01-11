'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Version } from '../types/purchase-plan-items.types';

interface PurchasePlanItemsVersionsListModalProps {
  isOpen: boolean;
  selectedYear: number | null;
  versions: Version[];
  loadingVersions: boolean;
  selectedVersionId: number | null;
  onVersionSelect: (version: Version) => void;
  onClose: () => void;
}

/**
 * Компонент модального окна для просмотра списка версий плана закупок
 */
export default function PurchasePlanItemsVersionsListModal({
  isOpen,
  selectedYear,
  versions,
  loadingVersions,
  selectedVersionId,
  onVersionSelect,
  onClose,
}: PurchasePlanItemsVersionsListModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Редакции плана закупок</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Год: <span className="font-medium">{selectedYear || 'Не выбран'}</span>
          </p>
        </div>
        {loadingVersions ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Загрузка...</div>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Редакции не найдены</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200">№</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200">Описание</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200">Создано</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200">Строк</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200">Статус</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {versions.map((version) => (
                  <tr 
                    key={version.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${selectedVersionId === version.id ? 'bg-blue-50' : ''}`}
                    onClick={() => onVersionSelect(version)}
                  >
                    <td className="px-4 py-2 text-xs text-gray-900">{version.versionNumber}</td>
                    <td className="px-4 py-2 text-xs text-gray-900">{version.description || '-'}</td>
                    <td className="px-4 py-2 text-xs text-gray-900">
                      {version.createdAt ? new Date(version.createdAt).toLocaleString('ru-RU') : '-'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-900">{version.itemsCount || 0}</td>
                    <td className="px-4 py-2 text-xs text-gray-900">
                      {version.isCurrent ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Текущая</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Архив</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
