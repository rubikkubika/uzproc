/** Подразделы вкладки «Поставки» центра отправки. */
export type DeliverySendingSubTabId = 'upcoming' | 'weekly-report';

export interface DeliverySendingSubTab {
  id: DeliverySendingSubTabId;
  label: string;
}

/** Получатель письма: ФИО для отображения и адрес для отправки. */
export interface SendingRecipient {
  fullName: string;
  email: string;
}
