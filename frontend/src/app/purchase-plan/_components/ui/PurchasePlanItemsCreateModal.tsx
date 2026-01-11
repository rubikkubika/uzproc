'use client';

import React from 'react';
import { X } from 'lucide-react';
import { PurchasePlanItem } from '../types/purchase-plan-items.types';
import { ALL_STATUSES } from '../constants/purchase-plan-items.constants';
import { calculateNewContractDate, getWorkingDaysByComplexity } from '../utils/date.utils';

interface PurchasePlanItemsCreateModalProps {
  isOpen: boolean;
  newItemData: Partial<PurchasePlanItem>;
  availableCompanies: string[];
  uniqueCfoValues: string[];
  onDataChange: (data: Partial<PurchasePlanItem>) => void;
  onCreate: () => void;
  onClose: () => void;
}

/**
 * Компонент модального окна для создания новой строки плана закупок
 */
export default function PurchasePlanItemsCreateModal({
  isOpen,
  newItemData,
  availableCompanies,
  uniqueCfoValues,
  onDataChange,
  onCreate,
  onClose,
}: PurchasePlanItemsCreateModalProps) {
  if (!isOpen) return null;

  const handleFieldChange = (field: keyof PurchasePlanItem, value: any) => {
    const updated = { ...newItemData, [field]: value };
    
    // Автоматически пересчитываем дату нового договора при изменении сложности или даты заявки
    if (field === 'complexity' || field === 'requestDate') {
      const requestDate = field === 'requestDate' ? value : newItemData.requestDate;
      const complexity = field === 'complexity' ? value : newItemData.complexity;
      const calculatedDate = calculateNewContractDate(requestDate || null, complexity || null);
      updated.newContractDate = calculatedDate || null;
    }
    
    onDataChange(updated);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Создать новую строку плана закупок</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Год планирования</label>
              <input
                type="number"
                value={newItemData.year || ''}
                onChange={(e) => handleFieldChange('year', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Год"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Компания</label>
              <select
                value={newItemData.company || ''}
                onChange={(e) => handleFieldChange('company', e.target.value || null)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-</option>
                {availableCompanies.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ЦФО</label>
              <input
                type="text"
                list="cfo-list-create"
                value={newItemData.cfo || ''}
                onChange={(e) => handleFieldChange('cfo', e.target.value || null)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Введите или выберите ЦФО"
              />
              <datalist id="cfo-list-create">
                {uniqueCfoValues
                  .slice()
                  .sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }))
                  .map((cfo) => (
                    <option key={cfo} value={cfo} />
                  ))}
              </datalist>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select
                value={newItemData.status || 'Проект'}
                onChange={(e) => handleFieldChange('status', e.target.value || null)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_STATUSES.filter(s => s !== 'Заявка').map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Предмет закупки</label>
            <textarea
              value={newItemData.purchaseSubject || ''}
              onChange={(e) => handleFieldChange('purchaseSubject', e.target.value || null)}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Введите предмет закупки"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Бюджет (UZS)</label>
              <input
                type="number"
                step="0.01"
                value={newItemData.budgetAmount || ''}
                onChange={(e) => handleFieldChange('budgetAmount', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Закупщик</label>
              <input
                type="text"
                value={newItemData.purchaser || ''}
                onChange={(e) => handleFieldChange('purchaser', e.target.value || null)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Введите закупщика"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сложность</label>
              <select
                value={newItemData.complexity || ''}
                onChange={(e) => {
                  const complexity = e.target.value || null;
                  handleFieldChange('complexity', complexity);
                }}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                1 = +7 рабочих дней, 2 = +14, 3 = +22, 4 = +50
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата заявки</label>
              <input
                type="date"
                value={newItemData.requestDate ? newItemData.requestDate.split('T')[0] : ''}
                onChange={(e) => {
                  const requestDate = e.target.value || null;
                  handleFieldChange('requestDate', requestDate);
                }}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата завершения закупки</label>
              <input
                type="date"
                value={newItemData.newContractDate ? newItemData.newContractDate.split('T')[0] : ''}
                readOnly
                disabled
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                title={newItemData.complexity && newItemData.requestDate ? `Автоматически рассчитано: дата заявки + ${getWorkingDaysByComplexity(newItemData.complexity)} рабочих дней (сложность ${newItemData.complexity})` : 'Укажите сложность и дату заявки для автоматического расчета'}
              />
              {newItemData.complexity && newItemData.requestDate ? (
                <p className="text-xs text-gray-500 mt-1">
                  Рассчитано автоматически: сложность {newItemData.complexity} = +{getWorkingDaysByComplexity(newItemData.complexity)} рабочих дней
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Укажите сложность и дату заявки для расчета
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
