'use client';

import type { EtpSyncStatus } from '../types/etp-sync.types';
import { formatEtpSyncProgress, getEtpSyncPercent } from '../utils/etp-sync.utils';

interface Props {
  status: EtpSyncStatus;
}

/** Полоса прогресса обновления ЭТП; до известного объёма работ — бегущая полоса */
export default function EtpSyncProgress({ status }: Props) {
  const percent = getEtpSyncPercent(status);
  return (
    <div className="w-64 max-w-full">
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        {percent === null ? (
          <div className="h-full w-1/3 rounded-full bg-blue-500 animate-pulse" />
        ) : (
          <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${percent}%` }} />
        )}
      </div>
      <p className="mt-1 text-[11px] text-gray-600 truncate" title={formatEtpSyncProgress(status)}>
        {formatEtpSyncProgress(status)}
        {percent !== null && ` · ${percent}%`}
      </p>
    </div>
  );
}
