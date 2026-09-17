// Константы раздела ЭТП

export const ETP_DATA_URL = '/etp/data.json';

// Обновление данных с b2biz.uz (кнопка «Обновить», только admin)
export const ETP_SYNC_URL = '/api/etp/sync';
/** Интервал опроса статуса, пока идёт обновление */
export const ETP_SYNC_POLL_INTERVAL_MS = 2000;

export const ETP_SYNC_PHASE_LABELS: Record<string, string> = {
  login: 'Авторизация на b2biz.uz',
  list: 'Получение списка процедур',
  procedures: 'Обновление процедур и документов',
  saving: 'Сохранение снапшота',
  done: 'Готово',
};

// Порядок и подписи статусов процедур
export const ETP_STATUS_ORDER = [
  'Приём предложений',
  'Рассмотрение предложений',
  'Завершена',
  'Отменена',
] as const;

// Цвета бейджей статусов
export const ETP_STATUS_STYLES: Record<string, string> = {
  'Приём предложений': 'bg-green-100 text-green-700 border-green-200',
  'Рассмотрение предложений': 'bg-amber-100 text-amber-700 border-amber-200',
  Завершена: 'bg-gray-100 text-gray-600 border-gray-200',
  Отменена: 'bg-red-100 text-red-700 border-red-200',
};

// Цвета статусов участников
export const ETP_PARTICIPANT_STATUS_STYLES: Record<string, string> = {
  'Предложение направлено': 'bg-green-100 text-green-700',
  'Подтвердил участие': 'bg-blue-100 text-blue-700',
  Приглашен: 'bg-gray-100 text-gray-600',
};
