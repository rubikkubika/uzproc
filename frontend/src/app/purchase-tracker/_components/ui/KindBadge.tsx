interface KindBadgeProps {
  kind: string;
}

/** Бейдж типа закупки: «Закупка» (фиолетовый) или «Заказ» (синий). */
export default function KindBadge({ kind }: KindBadgeProps) {
  if (!kind) return null;
  const isPurchase = kind.toLowerCase().startsWith('закуп');
  const bg = isPurchase ? '#DBEAFE' : '#E0F2FE';
  const fg = isPurchase ? '#1D4ED8' : '#0369A1';
  return (
    <span
      className="whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {kind}
    </span>
  );
}
