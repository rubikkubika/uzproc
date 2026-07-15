import { ApprovalStatusColor } from './types';

/** Токены цветов дизайн-референса. */
export const REDESIGN_COLORS = {
  bgPage: '#F1F2F5',
  headerDark: '#0F1C2E',
  cardGradient: 'linear-gradient(135deg,#0F1C2E,#1B3050)',
  cardBg: '#FFFFFF',
  tileBg: '#F5F6F9',
  divider: '#E8EAEF',
  dividerRow: '#F1F3F7',
  textMain: '#14181F',
  textSecondary: '#667080',
  textMuted: '#8A92A0',
  textWeak: '#AFB6C2',
  accent: '#2563EB',
  accentHover: '#1D4FC4',
  accentBg: '#E7EEFB',
  success: '#3DBE7F',
  successText: '#0E7A4F',
  successBg: '#E7F3EC',
  warn: '#F0A22E',
  danger: '#E5484D',
  star: '#F5B942',
  headerText: '#DCE4EF',
  headerTextMuted: '#9FB8D8',
} as const;

/** Семейство шрифтов дизайна (подгружаются через Google Fonts в компоненте). */
export const REDESIGN_FONT = "'Golos Text', system-ui, -apple-system, 'Segoe UI', sans-serif";
export const REDESIGN_MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace";

/** Цвет кружка согласования по статусу. */
export function dotColor(status: ApprovalStatusColor): string {
  switch (status) {
    case 'green':
      return REDESIGN_COLORS.success;
    case 'orange':
    case 'yellow':
      return REDESIGN_COLORS.warn;
    case 'red':
      return REDESIGN_COLORS.danger;
    default:
      return REDESIGN_COLORS.success;
  }
}
