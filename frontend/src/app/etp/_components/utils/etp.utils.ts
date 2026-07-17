// Утилиты форматирования для раздела ЭТП

export function formatMoney(value: number | null | undefined, currency = 'UZS'): string {
  if (value == null) return '—';
  const s = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
  return `${s} ${currency}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const EXT_EMOJI: Record<string, string> = {
  '.pdf': '📕',
  '.doc': '📘',
  '.docx': '📘',
  '.xls': '📗',
  '.xlsx': '📗',
  '.png': '🖼️',
  '.jpg': '🖼️',
  '.jpeg': '🖼️',
  '.mp4': '🎬',
};

export function fileIcon(ext: string): string {
  return EXT_EMOJI[(ext || '').toLowerCase()] || '📄';
}
