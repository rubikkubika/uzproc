'use client';

import { RefreshCw } from 'lucide-react';
import type { EtpSyncStatus } from '../types/etp-sync.types';
import { formatEtpSyncResult } from '../utils/etp-sync.utils';
import EtpSyncProgress from './EtpSyncProgress';

interface Props {
  status: EtpSyncStatus | null;
  isRunning: boolean;
  requestError: string | null;
  onStart: () => void;
}

/** Кнопка «Обновить с b2biz» с прогрессом и итогом последнего обновления (только admin) */
export default function EtpSyncPanel({ status, isRunning, requestError, onStart }: Props) {
  const result = status && !isRunning ? formatEtpSyncResult(status) : '';
  const isError = status?.state === 'error';

  return (
    <div data-tour="etp-sync" className="flex items-center gap-3">
      <div className="flex flex-col items-end">
        {isRunning && status && <EtpSyncProgress status={status} />}
        {result && (
          <p
            className={`text-[11px] max-w-xs truncate ${isError ? 'text-red-600' : 'text-gray-500'}`}
            title={result}
          >
            {result}
          </p>
        )}
        {requestError && (
          <p className="text-[11px] text-red-600 max-w-xs truncate" title={requestError}>
            {requestError}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={isRunning}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
        {isRunning ? 'Обновляется…' : 'Обновить с b2biz'}
      </button>
    </div>
  );
}
