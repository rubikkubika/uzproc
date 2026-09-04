import { MONTH_FULL } from '../constants/mr-presentation.constants';

/** Курс пересчёта сумм в доллары для карточек экономии. */
const USD_TO_UZS_RATE = 12000;

/** Сумма в компактном виде: «5.6 млн $», «308 тыс $». */
export function formatMoney(value: number, currency: 'UZS' | 'USD' = 'USD'): string {
  const v = currency === 'USD' ? value / USD_TO_UZS_RATE : value;
  const suffix = currency === 'USD' ? ' $' : '';
  if (v === 0) return '0' + suffix;
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' млрд' + suffix;
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' млн' + suffix;
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + ' тыс' + suffix;
  return v.toFixed(0) + suffix;
}

/** Оценка с одним знаком после запятой. */
export function formatRating(value: number | null | undefined): string {
  return value != null ? value.toFixed(1) : '—';
}

/** Процент без дробной части. */
export function formatPercent(value: number | null | undefined): string {
  return value != null ? `${Math.round(value)}%` : '—';
}

/** Дата и время оценки: «03.08.2026, 07:09». */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Дата без времени: «03.08.2026». */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Название месяца: «июль». */
export function monthName(month: number): string {
  return MONTH_FULL[month - 1] ?? '';
}

/** Название месяца с большой буквы: «Июль». */
export function monthNameCapitalized(month: number): string {
  const name = monthName(month);
  return name ? name[0].toUpperCase() + name.slice(1) : '';
}

/** Средняя оценка по карточке CSI (учитывает Узпрок, если он проставлен). */
export function csiAverage(f: {
  speedRating: number;
  qualityRating: number;
  satisfactionRating: number;
  uzprocRating?: number;
}): number {
  const ratings = [f.speedRating, f.qualityRating, f.satisfactionRating];
  if (f.uzprocRating) ratings.push(f.uzprocRating);
  return ratings.reduce((a, b) => a + (b || 0), 0) / ratings.length;
}

/**
 * Отчётный месяц данных — месяц перед месяцем выпуска отчёта:
 * презентация «УО сентябрь 2026» содержит отчёт за август 2026.
 */
export function reportedPeriod(year: number, month: number): { year: number; month: number } {
  return month <= 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Имя файла презентации. */
export function presentationFileName(year: number, month: number): string {
  return `УО ${monthName(month)} ${year}.pdf`;
}

/** Обрезка длинного текста: html2canvas не умеет многострочный line-clamp. */
export function truncate(text: string | null | undefined, maxChars: number): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > maxChars ? `${clean.slice(0, maxChars - 1)}…` : clean;
}

/** Подпись периода данных в правом верхнем углу: «2026 · январь — август». */
export function dataPeriodLabel(year: number, fromMonth: number | null, toMonth: number | null): string {
  if (!fromMonth || !toMonth) return String(year);
  if (fromMonth === toMonth) return `${year} · ${monthName(fromMonth)}`;
  return `${year} · ${monthName(fromMonth)} — ${monthName(toMonth)}`;
}

/** Футер контентных слайдов: «Uzum E-com · УО сентябрь 2026». */
export function slideFooterLabel(company: string, month: number, year: number): string {
  return `${company} · УО ${monthName(month)} ${year}`;
}

/**
 * Колонтитул с номером слайда: «Uzum E-com · УО сентябрь 2026 · 5».
 * Нумерация сквозная по всей презентации, но выводится только там, где есть
 * колонтитул — на титульных слайдах номер считается, но не отображается.
 */
export function slideFooterWithNumber(footer: string, slideNumber: number): string {
  return `${footer} · ${slideNumber}`;
}

/**
 * Имя оценившего без должности и подразделения: в CSI приходит
 * «Kupriianova Anastasiia (Администрация, Руководитель…)» — в скобках служебные
 * данные, они не нужны в карточке. Логины-почты оставляем целиком.
 */
export function personDisplayName(value: string | null | undefined): string {
  if (!value || !value.trim()) return '';
  const withoutPosition = value.split('(')[0].trim() || value.trim();
  if (withoutPosition.includes('@')) return withoutPosition;
  const words = withoutPosition.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).join(' ');
}

/** Сумма в сумах компактно: «167.4 млн», «4.3 млрд». */
export function formatAmountShort(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} млрд`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)} тыс`;
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

/** Склонение слова «закупка» для подписей карточек. */
export function purchasesLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} закупка`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} закупки`;
  return `${count} закупок`;
}

/** Склонение слова «оценка». */
export function ratingsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} оценка`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} оценки`;
  return `${count} оценок`;
}

/** Название ЦФО без служебного префикса сегмента: «M - Construction» → «Construction». */
export function cfoDisplayName(cfo: string | null | undefined): string {
  if (!cfo) return '';
  return cfo.replace(/^[A-Za-zА-Яа-я]{1,3}\s*[-–—]\s*/, '').trim() || cfo.trim();
}

/**
 * Оптическая поправка для текста в плашках, доля кегля.
 *
 * У Golos Text content-area шире кегля (ascent 1.0em + descent 0.2em), поэтому
 * при симметричном паддинге строка садится ниже оптического центра плашки:
 * замер растра html2canvas даёт 1.2–2px при кеглях 17–26. Компенсируем сдвигом
 * вверх — центр прописных совпадает с центром плашки.
 */
const BADGE_OPTICAL_SHIFT = 0.09;

function opticalShift(fontSize: number): number {
  return Math.max(1, Math.round(fontSize * BADGE_OPTICAL_SHIFT));
}

/** Паддинг плашки, растущей по содержимому: строка встаёт по оптическому центру. */
export function badgePadding(fontSize: number, padY: number, padX: number) {
  const shift = Math.min(padY, opticalShift(fontSize));
  return {
    paddingTop: padY - shift,
    paddingBottom: padY + shift,
    paddingLeft: padX,
    paddingRight: padX,
  };
}

/**
 * Паддинг плашки фиксированной высоты с flex-центрированием: нижний паддинг
 * сдвигает центр свободной области вверх на половину своей величины.
 */
export function badgeFixedPadding(fontSize: number) {
  return { paddingBottom: opticalShift(fontSize) * 2, boxSizing: 'border-box' as const };
}
