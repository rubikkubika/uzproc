'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import type { PurchaseRequest } from '../../types/purchase-request.types';
import {
  fetchPurchaseRequestComments,
  createPurchaseRequestComment,
  type PurchaseRequestCommentDto,
} from '../../services/purchaseRequests.api';

interface CommentsModalProps {
  isOpen: boolean;
  request: PurchaseRequest | null;
  currentUserId: number | null;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function CommentsModal({
  isOpen,
  request,
  currentUserId,
  onClose,
  onCommentAdded,
}: CommentsModalProps) {
  const [comments, setComments] = useState<PurchaseRequestCommentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newText, setNewText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!request?.id) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPurchaseRequestComments(request.id);
      setComments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки комментариев');
    } finally {
      setLoading(false);
    }
  }, [request?.id]);

  useEffect(() => {
    if (isOpen && request?.id) {
      loadComments();
    }
  }, [isOpen, request?.id, loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request?.id || !newText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPurchaseRequestComment(
        request.id,
        'MAIN',
        newText.trim(),
        currentUserId ?? undefined
      );
      setNewText('');
      await loadComments();
      onCommentAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка добавления комментария');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !request) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            Комментарии — заявка {request.idPurchaseRequest ?? request.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-50 text-red-700 text-sm rounded flex-shrink-0">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 mb-4">
          {loading ? (
            <p className="text-gray-500">Загрузка...</p>
          ) : comments.length === 0 ? (
            <p className="text-gray-500">Нет комментариев</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">
                      {c.createdByUserName ?? '—'}
                    </span>
                    <span>•</span>
                    <span>{c.type}</span>
                    <span>•</span>
                    <span>
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleString('ru-RU')
                        : '—'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {c.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-shrink-0 border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Добавить комментарий (основной)
          </label>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Текст комментария..."
            rows={3}
            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={submitting}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Закрыть
            </button>
            <button
              type="submit"
              disabled={submitting || !newText.trim()}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Отправка...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
