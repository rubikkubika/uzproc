'use client';

import { useState } from 'react';
import type { CfoLeaderDto, UserSuggestion } from '@/utils/cfo-leaders.api';
import UserSearchSelect from './UserSearchSelect';

interface CfoLeaderRowProps {
  row: CfoLeaderDto;
  onSave: (cfoName: string, userId: number) => Promise<void>;
  onDelete: (cfoName: string) => Promise<void>;
}

export default function CfoLeaderRow({ row, onSave, onDelete }: CfoLeaderRowProps) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const handlePick = async (user: UserSuggestion) => {
    setBusy(true);
    try {
      await onSave(row.cfoName, user.id);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await onDelete(row.cfoName);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2 text-sm text-gray-900 border-b border-gray-100 align-top">
        {row.cfoName}
      </td>
      <td className="px-4 py-2 text-sm text-gray-900 border-b border-gray-100 align-top">
        {editing ? (
          <UserSearchSelect onPick={handlePick} onCancel={() => setEditing(false)} disabled={busy} />
        ) : row.leaderFullName ? (
          <div className="flex flex-col">
            <span>{row.leaderFullName}</span>
            {row.leaderEmail && (
              <span className="text-xs text-gray-500">{row.leaderEmail}</span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-2 text-sm border-b border-gray-100 whitespace-nowrap text-right align-top">
        {editing ? (
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={busy}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            Отмена
          </button>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
            >
              {row.userId ? 'Изменить' : 'Назначить'}
            </button>
            {row.userId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
              >
                Удалить
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
