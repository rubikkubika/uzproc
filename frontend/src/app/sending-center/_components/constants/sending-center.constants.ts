import { SendingCenterTab } from '../types/sending-center.types';

export const SENDING_CENTER_TABS: SendingCenterTab[] = [
  { id: 'purchases', label: 'Закупки' },
  { id: 'management-report', label: 'Управленческая отчётность' },
  { id: 'specifications', label: 'Спецификации' },
  { id: 'deliveries', label: 'Поставки' },
];

/** Подпись об автоотправке писем по спецификациям (см. SpecificationSendingScheduler на бэкенде). */
export const SPECIFICATION_AUTO_SEND_NOTE =
  'Автоотправка: первый рабочий день месяца, 10:00 (Ташкент) — за прошлый месяц, всем ЦФО без отметки «Отправлено»';
