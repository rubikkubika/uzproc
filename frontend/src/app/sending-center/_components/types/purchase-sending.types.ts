/** Подразделы вкладки «Закупки» центра отправки. */
export type PurchaseSendingSubTabId = 'complexity-errors' | 'csi-invitation';

export interface PurchaseSendingSubTab {
  id: PurchaseSendingSubTabId;
  label: string;
}

/** Сообщение о результате отправки. */
export interface SendingMessage {
  type: 'success' | 'error';
  text: string;
}
