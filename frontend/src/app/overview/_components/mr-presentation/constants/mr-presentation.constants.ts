/**
 * Дизайн-токены и константы презентации управленческой отчётности.
 * Размеры — в px для холста 1920×1080 (16:9).
 */

/** Ширина слайда, px. */
export const SLIDE_WIDTH = 1920;
/** Высота слайда, px. */
export const SLIDE_HEIGHT = 1080;

/* ─── Цвета ────────────────────────────────────────────────────────────── */

/** Фирменный фиолетовый: фон титула/разделителей, акцент-бар, линия графика договоров. */
export const BRAND = '#7000FF';
/** Тёмный фиолетовый: текст чипов и целей. */
export const PURPLE_DARK = '#5400C2';
/** Светлая подложка чипов. */
export const PURPLE_TINT = '#EFE6FF';
/** Столбцы SLA и заливка heat 40–59. */
export const PURPLE_MID = '#C9B3FF';
/** Heat 20–39. */
export const HEAT_MID = '#E6DBFF';
/** Heat 1–19. */
export const HEAT_LOW = '#F3EEFF';
/** Основной текст, тёмные карточки, линия SLA. */
export const INK = '#17122B';
/** Приглушённый текст. */
export const MUTED = '#7A7490';
/** Бледный текст (футер, подписи). */
export const FAINT = '#B5AECB';
/** Разделительная линия. */
export const LINE = '#E4E0EE';
/** Разделитель строк таблицы. */
export const ROW_DIVIDER = '#EEEBF5';
/** Фон контентных слайдов. */
export const SLIDE_BG = '#F5F3FA';
/** Фон карточек. */
export const CARD_BG = '#FFFFFF';
/** Текст чипа «Факт» при достижении цели. */
export const SUCCESS_TEXT = '#0B7A3E';
/** Подложка чипа «Факт» при достижении цели. */
export const SUCCESS_BG = '#DDF5E6';
/** Текст чипа «Факт» при отставании. */
export const DANGER_TEXT = '#B42318';
/** Подложка чипа «Факт» при отставании. */
export const DANGER_BG = '#FEE4E2';
/** Линия графика спецификаций. */
export const GREEN_LINE = '#0B9F5B';
/** Цвет звёзд. */
export const STAR = '#F5B800';

/** Тень карточки. */
export const CARD_SHADOW = '0 1px 2px rgba(23,18,43,.04)';
/** Основной шрифт презентации. */
export const FONT_STACK = "'Golos Text', system-ui, -apple-system, Segoe UI, Arial, sans-serif";
/** Ссылка на шрифт (подключается в offscreen-документе). */
export const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;800&display=swap';

/** Цвет рейтинга карточки: ≥4.5 — тёмный, 3.5–4.4 — янтарный, ниже — красный. */
export function ratingColor(rating: number): string {
  if (rating >= 4.5) return INK;
  if (rating >= 3.5) return '#B7791F';
  return '#C0392B';
}

/* ─── Целевые показатели ───────────────────────────────────────────────── */

export const SLA_TARGET_PERCENT = 80;
export const SAVINGS_TARGET_PERCENT = 10;
export const CSI_TARGET_RATING = 4;

/* ─── Раскладка ────────────────────────────────────────────────────────── */

/** Карточек обратной связи на слайде (сетка 4×2). */
export const FEEDBACK_CARDS_PER_SLIDE = 8;
/** Карточек оценок по спецификациям в одном ряду. */
export const CONTRACT_FEEDBACK_CARDS_PER_ROW = 5;
/**
 * Рядов карточек оценок по спецификациям на слайде.
 * Каждый месяц начинает новый ряд и добавляет заголовок, поэтому ёмкость
 * считается рядами, а не карточками: три ряда с заголовками не помещаются в 1080px.
 */
export const CONTRACT_FEEDBACK_ROWS_PER_SLIDE = 2;

/** Размер страницы выгрузки оценок CSI. */
export const CSI_FETCH_PAGE_SIZE = 200;
/** Максимум страниц выгрузки оценок CSI. */
export const CSI_FETCH_MAX_PAGES = 20;

/* ─── Рендеринг ────────────────────────────────────────────────────────── */

/** Множитель растеризации слайда (1.25 → 2400×1350 на страницу). */
export const SLIDE_RASTER_SCALE = 1.25;
/** Качество JPEG страниц презентации. */
export const SLIDE_JPEG_QUALITY = 0.92;
/** Пауза после монтирования слайда перед съёмкой, мс. */
export const SLIDE_SETTLE_MS = 20;

/* ─── Содержание ───────────────────────────────────────────────────────── */

/** Группы ЦФО для слайдов обратной связи — порядок как в презентации. */
export const FEEDBACK_GROUPS = [
  {
    label: 'Operations',
    sub: 'Warehouse · Logistics · Construction · Maintenance · PVZ',
    keywords: ['Warehouse', 'Logistics', 'Construction', 'Maintenance', 'PVZ'],
  },
  { label: 'Marketing', sub: '', keywords: ['Marketing', 'Маркет'] },
  { label: 'HR', sub: 'Facilities · HR · Labor Safety', keywords: ['Facilities', 'HR', 'Labor Safety', 'Labor'] },
  { label: 'IT', sub: '', keywords: ['IT'] },
] as const;

/** Короткие названия месяцев. */
export const MONTH_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

/** Полные названия месяцев. */
export const MONTH_FULL = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

/** Компания в заголовках и футере. */
export const COMPANY_TITLE = 'Uzum E-com';
/** Подпись отдела на титульном слайде. */
export const DEPARTMENT_TITLE = 'Отдел закупок';
