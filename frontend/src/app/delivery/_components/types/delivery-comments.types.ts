/** Комментарий к поставке */
export interface DeliveryComment {
  id: number;
  deliveryId: number;
  text: string;
  /** ФИО автора; null — комментарий из ручного отчёта */
  createdByUserName: string | null;
  createdAt: string;
  updatedAt: string;
  /** Текущий пользователь может редактировать комментарий */
  editable: boolean;
}

/** Позиция и контекст открытого попапа комментариев */
export interface DeliveryCommentsPopupState {
  deliveryId: number;
  deliveryInnerId: string | null;
  left: number;
  top: number;
  /** Раскрывать вниз от иконки или вверх (если снизу мало места) */
  placement: 'below' | 'above';
}
