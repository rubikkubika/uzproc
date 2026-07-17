// Константы раздела ЭТП

export const ETP_DATA_URL = '/etp/data.json';

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
