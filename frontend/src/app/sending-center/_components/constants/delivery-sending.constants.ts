import { DeliverySendingSubTab, SendingRecipient } from '../types/delivery-sending.types';

/** Горизонт «предстоящих» поставок по умолчанию, дней */
export const DEFAULT_DAYS_AHEAD = 14;

/** Варианты горизонта для переключателя */
export const DAYS_AHEAD_OPTIONS = [7, 14, 30] as const;

/** Получатель тестового письма по умолчанию (подменяется значением с бэкенда) */
export const DEFAULT_TEST_RECIPIENT = 'a.retsko@uzum.com';

/** Подразделы вкладки «Поставки» */
export const DELIVERY_SENDING_SUB_TABS: DeliverySendingSubTab[] = [
  { id: 'upcoming', label: 'Предстоящие поставки' },
  { id: 'weekly-report', label: 'Недельный отчёт' },
];

/** Получатель недельного отчёта по умолчанию (подменяется значением с бэкенда) */
export const DEFAULT_WEEKLY_REPORT_RECIPIENT: SendingRecipient = {
  fullName: 'Рецко Артем',
  email: 'a.retsko@uzum.com',
};

/** Минимальная длина запроса для поиска получателя по ФИО */
export const RECIPIENT_SEARCH_MIN_LENGTH = 2;

/** Задержка перед поиском получателя, мс */
export const RECIPIENT_SEARCH_DEBOUNCE_MS = 300;
