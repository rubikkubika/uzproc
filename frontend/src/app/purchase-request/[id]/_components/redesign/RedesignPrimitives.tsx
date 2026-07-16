import { REDESIGN_COLORS } from './utils';

/** Зелёный кружок-галочка (завершённый этап). */
export function CheckDot({ size = 16, color = REDESIGN_COLORS.success }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill={color} />
      <path d="M4.8 8.2L7 10.4L11.2 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Пустой (серый) кружок незавершённого этапа. */
export function EmptyDot({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#AFB6C2" strokeWidth="1.6" />
    </svg>
  );
}

/** Кружок «в работе» (жёлтый, с точкой). Жёлтый мигает, как в старом дизайне. */
export function PendingDot({ size = 16, color = REDESIGN_COLORS.warn }: { size?: number; color?: string }) {
  const isYellow = color === REDESIGN_COLORS.warn;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={isYellow ? 'animate-yellow-circle-pulse-fast' : undefined}
      style={isYellow ? { borderRadius: '50%' } : undefined}
    >
      <circle cx="8" cy="8" r="8" fill={color} />
      <circle cx="8" cy="8" r="2.6" fill="#fff" />
    </svg>
  );
}

/** Красный кружок-крестик («не согласовано»). */
export function CrossDot({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill={REDESIGN_COLORS.danger} />
      <path d="M5.6 5.6L10.4 10.4M10.4 5.6L5.6 10.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Плитка «метка + значение» (как в карточке заявки). */
export function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: REDESIGN_COLORS.tileBg, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: REDESIGN_COLORS.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{children}</div>
    </div>
  );
}

/** Чип «метка: значение» (как «Исполнитель» в блоке договора). */
export function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, background: REDESIGN_COLORS.tileBg, padding: '5px 12px', borderRadius: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: REDESIGN_COLORS.textSecondary }}>{label}:</span>
      <span style={{ fontSize: 13, color: REDESIGN_COLORS.textMain }}>{value}</span>
    </div>
  );
}

/** Строка из 5 звёзд с числовым рейтингом. */
export function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} width={18} height={18} viewBox="0 0 16 16" fill={i <= full ? REDESIGN_COLORS.star : '#DCE0E6'}>
            <path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3l-3.8 2 .7-4.3-3.1-3 4.3-.6L8 1.5z" />
          </svg>
        ))}
      </div>
      <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: '#fff' }}>{rating.toFixed(1)}</span>
    </div>
  );
}
