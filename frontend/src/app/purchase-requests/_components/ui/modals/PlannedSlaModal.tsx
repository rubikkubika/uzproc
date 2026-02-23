'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import type { PurchaseRequest } from '../../types/purchase-request.types';
import { updatePlannedSla } from '../../services/purchaseRequests.api';
import {
  countWorkingDays,
  addWorkingDays,
  toDateInputValue,
  parseDateInputValue,
} from '../../utils/workingDays.utils';

interface PlannedSlaModalProps {
  isOpen: boolean;
  request: PurchaseRequest | null;
  onClose: () => void;
  onSaved?: (updated: PurchaseRequest) => void;
}

export default function PlannedSlaModal({
  isOpen,
  request,
  onClose,
  onSaved,
}: PlannedSlaModalProps) {
  const [plannedSlaDays, setPlannedSlaDays] = useState<number>(0);
  const [targetCompletionDateStr, setTargetCompletionDateStr] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignmentDate = request?.approvalAssignmentDate
    ? new Date(request.approvalAssignmentDate)
    : null;

  const syncFromDays = useCallback(
    (days: number) => {
      if (!assignmentDate || days < 0) return;
      const target = addWorkingDays(assignmentDate, days);
      setTargetCompletionDateStr(toDateInputValue(target));
    },
    [assignmentDate]
  );

  const syncFromDate = useCallback(
    (dateStr: string) => {
      if (!assignmentDate || !dateStr) return;
      const target = parseDateInputValue(dateStr);
      const days = countWorkingDays(assignmentDate, target);
      setPlannedSlaDays(days >= 0 ? days : 0);
    },
    [assignmentDate]
  );

  // Инициализация только при открытии модалки или смене заявки (не завися от assignmentDate — объект Date создаётся заново каждый рендер и сбрасывал ввод даты)
  useEffect(() => {
    if (!isOpen || !request) return;
    setError(null);
    const days = request.plannedSlaDays ?? 30;
    setPlannedSlaDays(days);
    const assignment = request.approvalAssignmentDate ? new Date(request.approvalAssignmentDate) : null;
    if (assignment) {
      const target = addWorkingDays(assignment, days);
      setTargetCompletionDateStr(toDateInputValue(target));
    } else {
      setTargetCompletionDateStr('');
    }
  }, [isOpen, request?.id, request?.plannedSlaDays ?? -1, request?.approvalAssignmentDate ?? '']);

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
    const days = isNaN(v) || v < 0 ? 0 : v;
    setPlannedSlaDays(days);
    syncFromDays(days);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value;
    setTargetCompletionDateStr(s);
    syncFromDate(s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request?.idPurchaseRequest) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updatePlannedSla(request.idPurchaseRequest, plannedSlaDays);
      onSaved?.(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !request) return null;

  const canEdit = request.complexity === '4';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Плановый СЛА — заявка {request.idPurchaseRequest ?? request.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!canEdit && (
          <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded mb-4">
            Изменить плановый СЛА можно только для заявок со сложностью 4.
          </p>
        )}

        {error && (
          <div className="mb-4 p-2 bg-red-50 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата назначения на закупщика
            </label>
            <div className="px-3 py-2 text-sm text-gray-900 bg-gray-100 rounded-lg border border-gray-200">
              {assignmentDate
                ? assignmentDate.toLocaleDateString('ru-RU')
                : '—'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Плановый СЛА (рабочих дней)
            </label>
            <input
              type="number"
              min={0}
              value={plannedSlaDays === 0 ? '' : plannedSlaDays}
              onChange={handleDaysChange}
              disabled={!canEdit}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Плановая дата завершения закупки
            </label>
            <input
              type="date"
              value={targetCompletionDateStr}
              onChange={handleDateChange}
              disabled={!canEdit || !assignmentDate}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
            />
          </div>

          <p className="text-xs text-gray-500">
            Рабочие дни считаются со следующего дня после даты назначения по дату завершения включительно.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Закрыть
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
