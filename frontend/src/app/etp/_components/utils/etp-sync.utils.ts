import type { EtpSyncStatus } from '../types/etp-sync.types';
import { ETP_SYNC_PHASE_LABELS } from '../constants/etp.constants';

/** Процент выполнения; null — прогресс пока неизвестен (авторизация, список процедур) */
export function getEtpSyncPercent(status: EtpSyncStatus): number | null {
  if (status.phase === 'saving' || status.phase === 'done') return 100;
  if (status.phase !== 'procedures') return null;
  if (status.proceduresTotal === 0) return 100;
  return Math.min(100, Math.round((status.proceduresDone / status.proceduresTotal) * 100));
}

/** Строка прогресса: «Обновление процедур и документов · 12 из 40 · скачано файлов: 57» */
export function formatEtpSyncProgress(status: EtpSyncStatus): string {
  const parts = [ETP_SYNC_PHASE_LABELS[status.phase ?? ''] ?? 'Обновление'];
  if (status.phase === 'procedures') {
    parts.push(`${status.proceduresDone} из ${status.proceduresTotal}`);
  }
  if (status.downloadedFiles > 0) {
    parts.push(`скачано файлов: ${status.downloadedFiles}`);
  }
  return parts.join(' · ');
}

/** «17.09.2026, 14:05» */
export function formatEtpSyncTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Итог последнего обновления для подписи под кнопкой */
export function formatEtpSyncResult(status: EtpSyncStatus): string {
  const time = formatEtpSyncTime(status.finishedAt);
  if (status.state === 'success') {
    return `Обновлено ${time}: процедур ${status.proceduresTotal}, файлов ${status.downloadedFiles}`;
  }
  if (status.state === 'error') {
    return `Ошибка обновления${time ? ` ${time}` : ''}: ${status.error ?? 'неизвестная ошибка'}`;
  }
  return '';
}
