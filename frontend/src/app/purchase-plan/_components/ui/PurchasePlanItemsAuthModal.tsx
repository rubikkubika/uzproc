'use client';

import React from 'react';

interface PurchasePlanItemsAuthModalProps {
  isOpen: boolean;
  username: string;
  password: string;
  error: string | null;
  loading: boolean;
  onUsernameChange: (username: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Компонент модального окна для повторной аутентификации
 * Используется при изменении дат для подтверждения прав доступа
 */
export default function PurchasePlanItemsAuthModal({
  isOpen,
  username,
  password,
  error,
  loading,
  onUsernameChange,
  onPasswordChange,
  onConfirm,
  onCancel,
}: PurchasePlanItemsAuthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Подтверждение изменения</h2>
        <p className="text-sm text-gray-600 mb-4">
          Для сохранения изменения необходимо повторно ввести логин и пароль, как при входе в систему.
        </p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
            <input
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  onConfirm();
                }
              }}
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !username || !password}
          >
            {loading ? 'Проверка...' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}
