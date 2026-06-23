'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { SupplierContactDraft } from '../types/purchase-plan-items.types';

interface SupplierContactCardFieldsProps {
  value: SupplierContactDraft;
  index: number;
  onChange: (patch: Partial<SupplierContactDraft>) => void;
  onRemove?: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

/**
 * Поля одной карточки контакта контрагента:
 * ФИО, Должность, Telegram, Email, Телефон, Комментарий.
 */
export default function SupplierContactCardFields({
  value,
  index,
  onChange,
  onRemove,
}: SupplierContactCardFieldsProps) {
  return (
    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">Карточка контакта #{index + 1}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Удалить карточку"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <input
        type="text"
        value={value.fullName}
        onChange={(e) => onChange({ fullName: e.target.value })}
        placeholder="ФИО"
        className={inputClass}
      />
      <input
        type="text"
        value={value.position}
        onChange={(e) => onChange({ position: e.target.value })}
        placeholder="Должность"
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={value.telegram}
          onChange={(e) => onChange({ telegram: e.target.value })}
          placeholder="Telegram"
          className={inputClass}
        />
        <input
          type="text"
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="Телефон"
          className={inputClass}
        />
      </div>
      <input
        type="email"
        value={value.email}
        onChange={(e) => onChange({ email: e.target.value })}
        placeholder="Email"
        className={inputClass}
      />
      <textarea
        value={value.comment}
        onChange={(e) => onChange({ comment: e.target.value })}
        placeholder="Комментарий"
        rows={2}
        className={`${inputClass} resize-none`}
      />
    </div>
  );
}
