'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';
import { purchaserDisplayName } from '@/utils/purchaser';
import { PurchasePlanItem, PurchaseRequest, ModalTab, PurchasePlanItemComment } from '../types/purchase-plan-items.types';
import { useAuth } from '../hooks/useAuth';

interface PurchasePlanItemsDetailsModalProps {
  isOpen: boolean;
  itemId: number | null;
  item: PurchasePlanItem | null;
  purchaseRequest: PurchaseRequest | null;
  activeTab: ModalTab;
  onTabChange: (tab: ModalTab) => void;
  onClose: () => void;
  // Дополнительные данные для вкладок
  comments?: PurchasePlanItemComment[];
  commentsLoading?: boolean;
  onCommentsRefresh?: (itemId: number) => void;
  isPublicPlan?: boolean; // Флаг для публичного плана
  changes?: any[];
  changesLoading?: boolean;
  changesTotalElements?: number;
  changesTotalPages?: number;
  changesCurrentPage?: number;
  onChangesPageChange?: (page: number) => void;
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
  comments = [],
  commentsLoading = false,
  onCommentsRefresh,
  isPublicPlan = false,
  changes,
  changesLoading,
  changesTotalElements,
  changesTotalPages,
  changesCurrentPage,
  onChangesPageChange,
  loadingPurchaseRequest,
}: PurchasePlanItemsDetailsModalProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentIsPublic, setNewCommentIsPublic] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Используем общий хук для получения email пользователя
  const { userEmail } = useAuth();

  const handleSubmitComment = async () => {
    if (!itemId || !newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/purchase-plan-items/${itemId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newCommentText.trim(),
          isPublic: isPublicPlan ? true : newCommentIsPublic, // Для публичного плана всегда публичный
          authorEmail: userEmail,
        }),
      });

      if (response.ok) {
        try {
          const responseData = await response.json();
          setNewCommentText('');
          setNewCommentIsPublic(false);
          // Обновляем комментарии после успешного добавления
          if (onCommentsRefresh && itemId) {
            onCommentsRefresh(itemId);
          }
        } catch (jsonError) {
          // Если не удалось распарсить JSON, но статус OK, все равно обновляем комментарии
          setNewCommentText('');
          setNewCommentIsPublic(false);
          if (onCommentsRefresh && itemId) {
            onCommentsRefresh(itemId);
          }
        }
      } else {
        // Получаем текст ошибки
        let errorText = 'Неизвестная ошибка';
        try {
          const errorData = await response.text();
          errorText = errorData || `HTTP ${response.status}`;
        } catch (e) {
          errorText = `HTTP ${response.status}`;
        }
        alert(`Ошибка при добавлении комментария: ${errorText}`);
      }
    } catch (error) {
      alert('Ошибка сети при добавлении комментария. Проверьте подключение к интернету.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!isOpen || !itemId || !item) return null;

  const tabs: { key: ModalTab; label: string }[] = isPublicPlan
    ? [{ key: 'comments', label: 'Комментарии' }]
    : [
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
              {/* Форма добавления комментария */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Добавить комментарий</h3>
                <div className="space-y-3">
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Введите комментарий..."
                    className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={4}
                  />
                  {!isPublicPlan && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={newCommentIsPublic}
                        onChange={(e) => setNewCommentIsPublic(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="isPublic" className="text-sm text-gray-700">
                        Публичный комментарий
                      </label>
                    </div>
                  )}
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newCommentText.trim() || submittingComment}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingComment ? 'Отправка...' : 'Отправить'}
                  </button>
                </div>
              </div>

              {/* Список комментариев */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Комментарии</h3>
                {commentsLoading ? (
                  <div className="text-center py-4 text-gray-500">Загрузка...</div>
                ) : comments && comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={String(comment.id)} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{comment.text}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {comment.source === 'request' ? (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800">
                                Заявка
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                comment.isPublic 
                                  ? 'text-blue-700 bg-blue-100' 
                                  : 'text-gray-700 bg-gray-200'
                              }`}>
                                {comment.isPublic ? 'Публичный' : 'Приватный'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs text-gray-500">
                            {comment.authorName && (
                              <span className="font-medium">{comment.authorName}</span>
                            )}
                            {comment.authorName && ' • '}
                            <span>{new Date(comment.createdAt).toLocaleString('ru-RU')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Комментарии отсутствуют</p>
                )}
              </div>
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
              {changesLoading ? (
                <div className="text-center py-4 text-gray-500">Загрузка...</div>
              ) : changes && changes.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700 border-r border-gray-200">Поле</th>
                          <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700 border-r border-gray-200">Было</th>
                          <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700 border-r border-gray-200">Стало</th>
                          <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700">Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changes.map((change: any) => (
                          <tr key={change.id || change.fieldName} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">{change.fieldName || '-'}</td>
                            <td className="px-3 py-2 text-sm text-red-600 border-r border-gray-100">{change.valueBefore || '-'}</td>
                            <td className="px-3 py-2 text-sm text-green-600 border-r border-gray-100">{change.valueAfter || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {change.changeDate ? new Date(change.changeDate).toLocaleString('ru-RU') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Пагинация */}
                  {changesTotalPages !== undefined && changesTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
                      <div className="text-sm text-gray-500">
                        Показано {changes?.length || 0} из {changesTotalElements || 0}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onChangesPageChange && changesCurrentPage !== undefined && onChangesPageChange(changesCurrentPage - 1)}
                          disabled={changesCurrentPage === undefined || changesCurrentPage === 0}
                          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Назад
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-600">
                          {changesCurrentPage !== undefined ? changesCurrentPage + 1 : 1} / {changesTotalPages || 1}
                        </span>
                        <button
                          onClick={() => onChangesPageChange && changesCurrentPage !== undefined && onChangesPageChange(changesCurrentPage + 1)}
                          disabled={changesCurrentPage === undefined || changesTotalPages === undefined || changesCurrentPage >= changesTotalPages - 1}
                          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Вперед
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Изменения отсутствуют</p>
              )}
            </div>
          )}

          {activeTab === 'purchaseRequest' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Заявка на закупку</h3>
                {!isPublicPlan && purchaseRequest && (
                  <button
                    onClick={() => {
                      // Переход на страницу заявок с фильтром по номеру заявки
                      // Сохраняем фильтр в localStorage для восстановления на странице заявок
                      const existingFilters = localStorage.getItem('purchaseRequestsTableFilters');
                      const filters = existingFilters ? JSON.parse(existingFilters) : {};
                      filters.idPurchaseRequest = String(purchaseRequest.idPurchaseRequest);
                      localStorage.setItem('purchaseRequestsTableFilters', JSON.stringify(filters));
                      
                      const url = new URL(window.location.origin);
                      url.searchParams.set('tab', 'purchase-requests');
                      window.open(url.toString(), '_blank');
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Редактировать заявку
                  </button>
                )}
              </div>
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
                  <div>
                    <label className="text-xs font-medium text-gray-500">Закупщик</label>
                    <p className="text-sm text-gray-900">{purchaseRequest.purchaser ? purchaserDisplayName(purchaseRequest.purchaser) : '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Статус</label>
                    <p className="text-sm text-gray-900">{purchaseRequest.statusGroup || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">ЦФО</label>
                    <p className="text-sm text-gray-900">{purchaseRequest.cfo || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Дата создания</label>
                    <p className="text-sm text-gray-900">
                      {purchaseRequest.purchaseRequestCreationDate 
                        ? new Date(purchaseRequest.purchaseRequestCreationDate).toLocaleDateString('ru-RU')
                        : '-'}
                    </p>
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
