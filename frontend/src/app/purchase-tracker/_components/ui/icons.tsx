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

export function UserIcon({ size = 18, color = '#667085' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
      <path d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ size = 18, color = '#667085', fill = 'none' }: { size?: number; color?: string; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <path
        d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.77l-5.2 2.75.99-5.8-4.21-4.1 5.82-.85L12 3.5z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
