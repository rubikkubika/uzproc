/** Инлайн-SVG иконки для страницы «Трекер закупок» (stroke 2px, совместимы с Lucide). */

export function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="#98A2B3" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="#98A2B3" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ size = 14, color = '#fff', width = 3 }: { size?: number; color?: string; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon({ color = '#7C3AED' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="3" stroke={color} strokeWidth="2" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
