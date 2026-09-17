// Типы статуса синхронизации ЭТП (файл sync-status.json, пишет scripts/etp-sync.mjs)

export type EtpSyncState = 'idle' | 'running' | 'success' | 'error';

export type EtpSyncPhase = 'login' | 'list' | 'procedures' | 'saving' | 'done';

export interface EtpSyncStatus {
  state: EtpSyncState;
  phase: EtpSyncPhase | null;
  startedAt: string | null;
  finishedAt: string | null;
  /** Кто запустил: email администратора, deploy или manual */
  startedBy: string | null;
  proceduresTotal: number;
  proceduresDone: number;
  downloadedFiles: number;
  /** Процедур в снапшоте после успешного обновления */
  snapshotCount: number | null;
  message: string;
  error: string | null;
}

/** Ответ POST /api/etp/sync */
export interface EtpSyncStartResponse {
  started: boolean;
  status: EtpSyncStatus;
  error?: string;
}
