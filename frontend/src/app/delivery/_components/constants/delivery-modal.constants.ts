/**
 * Стили карточки поставки (редизайн «Окно поставки»).
 * Палитра и радиусы соответствуют дизайн-макету, вынесены в константы,
 * чтобы не тащить длинные className-строки в разметку.
 */

/** Подпись-«надзаголовок» поля (11px, uppercase). */
export const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[.05em] text-[#98a2b3]';

/** Заголовок секции-колонки (12px, uppercase). */
export const SECTION_LABEL = 'text-xs font-bold uppercase tracking-[.06em] text-[#667085]';

/** Значение поля. */
export const FIELD_VALUE = 'text-sm font-medium text-[#101828]';

/** Поле ввода / селект. */
export const FIELD_BOX =
  'w-full rounded-[10px] border border-[#e3e5e9] bg-white px-[13px] py-[11px] text-sm font-medium text-[#101828] outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] disabled:opacity-60';

/** Селект: как FIELD_BOX, но со своей стрелкой (appearance-none). */
export const SELECT_BOX = `${FIELD_BOX} appearance-none cursor-pointer pr-9`;

/** Плейсхолдер / пустое значение. */
export const PLACEHOLDER = 'text-[#b0b6c0]';

/** Карточка (прогресс, оплата). */
export const CARD = 'rounded-[14px] border border-[#eceef1] bg-white p-[18px] shadow-[0_1px_2px_rgba(16,24,40,.03)]';

/** Строка оплаты. */
export const PAYMENT_ROW =
  'flex w-full items-center gap-[13px] rounded-[14px] border border-[#e3e5e9] bg-white px-4 py-[15px] text-left shadow-[0_1px_2px_rgba(16,24,40,.03)] transition-[box-shadow,border-color] duration-150 hover:border-[#c9ccd4] hover:shadow-[0_4px_14px_-6px_rgba(16,24,40,.18)]';

/** Чип (тип оплаты, статус). */
export const CHIP_NEUTRAL = 'rounded-md bg-[#f2f3f5] px-2 py-0.5 text-[11px] font-semibold text-[#667085]';
export const CHIP_SUCCESS = 'rounded-md bg-[#eaf7ef] px-2 py-[3px] text-[11px] font-semibold text-[#137a43]';
export const CHIP_MUTED = 'rounded-md bg-[#f2f3f5] px-2 py-[3px] text-[11px] font-semibold text-[#98a2b3]';

/** Кнопки футера. */
export const BTN_PRIMARY =
  'rounded-[10px] bg-[#4f46e5] px-[26px] py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_-3px_rgba(79,70,229,.5)] transition-colors hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:bg-[#c7c9d1] disabled:shadow-none';
export const BTN_SECONDARY =
  'rounded-[10px] border border-[#dcdfe4] bg-white px-[22px] py-2.5 text-sm font-semibold text-[#344054] transition-colors hover:bg-[#f7f8fa]';
export const BTN_DANGER =
  'rounded-[10px] border border-[#f3c6c7] bg-white px-[17px] py-2.5 text-sm font-semibold text-[#d64148] transition-colors hover:bg-[#fef4f4] disabled:cursor-not-allowed disabled:opacity-60';
