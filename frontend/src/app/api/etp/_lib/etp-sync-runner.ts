import os from 'os';
import { spawn } from 'child_process';
import { access, mkdir } from 'fs/promises';
import type { EtpSyncStatus } from '@/app/etp/_components/types/etp-sync.types';
import { getEtpDataDir, getEtpSyncScriptPath } from './etp-paths';
import {
  IDLE_STATUS,
  isSyncActive,
  readSyncStatus,
  readSyncStatusFile,
  writeSyncStatusFile,
} from './etp-sync-status';

export type StartEtpSyncResult =
  | { started: true; status: EtpSyncStatus }
  | { started: false; reason: 'running' | 'failed'; status: EtpSyncStatus; error?: string };

/** Защита от двойного клика: два POST подряд не должны запустить два процесса */
let starting = false;

/**
 * Запускает scripts/etp-sync.mjs отдельным процессом (не ждёт завершения).
 * Процесс сам ведёт sync-status.json; здесь сразу пишем начальный running,
 * чтобы опрос статуса не увидел результат прошлого запуска.
 */
export async function startEtpSync(startedBy: string): Promise<StartEtpSyncResult> {
  if (starting) {
    return { started: false, reason: 'running', status: await readSyncStatus() };
  }
  starting = true;
  try {
    const current = await readSyncStatusFile();
    if (current && isSyncActive(current)) {
      return { started: false, reason: 'running', status: await readSyncStatus() };
    }

    const scriptPath = getEtpSyncScriptPath();
    try {
      await access(scriptPath);
    } catch {
      return {
        started: false,
        reason: 'failed',
        status: await readSyncStatus(),
        error: `Не найден скрипт синхронизации: ${scriptPath}`,
      };
    }

    const dataDir = getEtpDataDir();
    await mkdir(dataDir, { recursive: true });

    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env, ETP_DATA_DIR: dataDir, ETP_SYNC_STARTED_BY: startedBy },
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    if (!child.pid) {
      return {
        started: false,
        reason: 'failed',
        status: await readSyncStatus(),
        error: 'Не удалось запустить процесс синхронизации',
      };
    }

    const status: EtpSyncStatus = {
      ...IDLE_STATUS,
      state: 'running',
      phase: 'login',
      startedAt: new Date().toISOString(),
      startedBy,
      message: 'Запуск обновления',
    };
    await writeSyncStatusFile({ ...status, pid: child.pid, host: os.hostname() });
    return { started: true, status };
  } finally {
    starting = false;
  }
}
