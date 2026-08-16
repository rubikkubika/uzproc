/** Одно замечание по договору (согласование с непустым комментарием). */
export interface ContractRemarkItem {
  id: number;
  stage: string | null;
  role: string | null;
  executorName: string | null;
  completionDate: string | null;
  commentText: string | null;
}

/** Позиция и контекст открытого попапа замечаний. */
export interface ContractRemarksPopupState {
  contractId: number;
  contractInnerId: string | null;
  left: number;
  top: number;
  /** Раскрывать вниз от иконки или вверх (если снизу мало места). */
  placement: 'below' | 'above';
}
