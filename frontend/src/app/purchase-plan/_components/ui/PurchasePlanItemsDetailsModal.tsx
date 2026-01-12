'use client';

import React from 'react';
import { X } from 'lucide-react';
import { PurchasePlanItem, PurchaseRequest, ModalTab } from '../types/purchase-plan-items.types';

interface PurchasePlanItemsDetailsModalProps {
  isOpen: boolean;
  itemId: number | null;
  item: PurchasePlanItem | null;
  purchaseRequest: PurchaseRequest | null;
  activeTab: ModalTab;
  onTabChange: (tab: ModalTab) => void;
  onClose: () => void;
  // Дополнительные данные для вкладок
  comments?: any[];
  changes?: any[];
  loadingPurchaseRequest?: boolean;
}

/**
 * Компонент модального окна для просмотра деталей элемента плана закупок
 * Содержит вкладки: Комментарии, Данные, Изменения, Заявка на закупку
 */
export default function PurchasePlanItemsDetailsModal({
  isOpen,
  itemId,
  item,
  purchaseRequest,
  activeTab,
  onTabChange,
  onClose,
  comments,
  changes,
  loadingPurchaseRequest,
}: PurchasePlanItemsDetailsModalProps) {
  if (!isOpen || !itemId || !item) return null;

  const tabs: { key: ModalTab; label: string }[] = [
    { key: 'comments', label: 'Комментарии' },
    { key: 'data', label: 'Данные' },
    { key: 'changes', label: 'Изменения' },
    { key: 'purchaseRequest', label: 'Заявка на закупку' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Детали элемента плана закупок #{item.id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Вкладки */}
        <div className="border-b border-gray-200 mb-4">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Содержимое вкладок */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Комментарии</h3>
              {comments && comments.length > 0 ? (
                <div className="space-y-2">
                  {comments.map((comment, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-900">{comment.text || comment}</p>
                      {comment.date && (
                        <p className="text-xs text-gray-500 mt-1">{comment.date}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Комментарии отсутствуют</p>
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Данные элемента</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">ID</label>
                  <p className="text-sm text-gray-900">{item.id}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Год</label>
                  <p className="text-sm text-gray-900">{item.year || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Компания</label>
                  <p className="text-sm text-gray-900">{item.company || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">ЦФО</label>
                  <p className="text-sm text-gray-900">{item.cfo || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Предмет закупки</label>
                  <p className="text-sm text-gray-900">{item.purchaseSubject || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Бюджет</label>
                  <p className="text-sm text-gray-900">{item.budgetAmount ? item.budgetAmount.toLocaleString('ru-RU') : '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Статус</label>
                  <p className="text-sm text-gray-900">{item.status || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Дата создания</label>
                  <p className="text-sm text-gray-900">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('ru-RU') : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Дата обновления</label>
                  <p className="text-sm text-gray-900">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleString('ru-RU') : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'changes' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">История изменений</h3>
              {changes && changes.length > 0 ? (
                <div className="space-y-2">
                  {changes.map((change, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-900">{change.description || change}</p>
                      {change.date && (
                        <p className="text-xs text-gray-500 mt-1">{change.date}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Изменения отсутствуют</p>
              )}
            </div>
          )}

          {activeTab === 'purchaseRequest' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Заявка на закупку</h3>
              {loadingPurchaseRequest ? (
                <p className="text-sm text-gray-500">Загрузка...</p>
              ) : purchaseRequest ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">ID заявки</label>
                    <p className="text-sm text-gray-900">{purchaseRequest.idPurchaseRequest}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Название</label>
                    <p className="text-sm text-gray-900">{purchaseRequest.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Бюджет</label>
                    <p className="text-sm text-gray-900">
                      {purchaseRequest.budgetAmount ? purchaseRequest.budgetAmount.toLocaleString('ru-RU') : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Инициатор</label>
                    <p className="text-sm text-gray-900">{purchaseRequest.purchaseRequestInitiator || '-'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Заявка на закупку не найдена</p>
              )}
            </div>
          )}
        </div>

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
