import os from 'os';
import { readFile, rename, writeFile } from 'fs/promises';
import type { EtpSyncStatus } from '@/app/etp/_components/types/etp-sync.types';
import { getEtpStatusPath } from './etp-paths';

/** Содержимое sync-status.json: статус + служебные поля процесса */
export interface EtpSyncStatusFile extends EtpSyncStatus {
  pid?: number;
  host?: string;
}

export const IDLE_STATUS: EtpSyncStatus = {
  state: 'idle',
  phase: null,
  startedAt: null,
  finishedAt: null,
  startedBy: null,
  proceduresTotal: 0,
  proceduresDone: 0,
  downloadedFiles: 0,
  snapshotCount: null,
  message: '',
  error: null,
};

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Идёт ли синхронизация на самом деле: running, тот же хост и процесс жив */
export function isSyncActive(file: EtpSyncStatusFile): boolean {
  if (file.state !== 'running' || !file.pid) return false;
  if (file.host && file.host !== os.hostname()) return false;
  return isProcessAlive(file.pid);
}

/** Сырой файл статуса или null, если его нет / он битый */
export async function readSyncStatusFile(): Promise<EtpSyncStatusFile | null> {
  try {
    return JSON.parse(await readFile(getEtpStatusPath(), 'utf8')) as EtpSyncStatusFile;
  } catch {
    return null;
  }
}

/**
 * Статус для UI. Если в файле running, но процесса уже нет (упал, контейнер пересоздан) —
 * отдаём ошибку, чтобы кнопка не зависла в состоянии «идёт обновление».
 */
export async function readSyncStatus(): Promise<EtpSyncStatus> {
  const file = await readSyncStatusFile();
  if (!file) return IDLE_STATUS;
  const status: EtpSyncStatus = {
    state: file.state,
    phase: file.phase,
    startedAt: file.startedAt,
    finishedAt: file.finishedAt,
    startedBy: file.startedBy,
    proceduresTotal: file.proceduresTotal ?? 0,
    proceduresDone: file.proceduresDone ?? 0,
    downloadedFiles: file.downloadedFiles ?? 0,
    snapshotCount: file.snapshotCount ?? null,
    message: file.message ?? '',
    error: file.error ?? null,
  };
  if (file.state === 'running' && !isSyncActive(file)) {
    return {
      ...status,
      state: 'error',
      error: 'Процесс обновления завершился, не записав результат (подробности в логе синхронизации)',
    };
  }
  return status;
}

/** Атомарная запись статуса (tmp + rename) */
export async function writeSyncStatusFile(file: EtpSyncStatusFile): Promise<void> {
  const target = getEtpStatusPath();
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(file), 'utf8');
  await rename(tmp, target);
}
