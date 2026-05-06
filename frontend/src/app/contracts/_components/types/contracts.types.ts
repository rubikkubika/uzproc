/** Поставщик (контрагент) по договору. */
export interface ContractSupplier {
  id: number;
  name: string | null;
  inn: string | null;
  code: string | null;
}

export interface Contract {
  id: number;
  innerId: string | null;
  guid: string;
  contractCreationDate: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  purchaseMethod: string | null;
  documentForm: string | null;
  budgetAmount: number | null;
  currency: string | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  status: string | null;
  state: string | null;
  /** Условия оплаты (из колонки «График оплаты (Договор)»). */
  paymentTerms: string | null;
  /** Типовая форма (из колонки «Типовая форма (Договор)»). */
  isTypicalForm: boolean | null;
  /** Поставщики (контрагенты). */
  suppliers: ContractSupplier[] | null;
  /** Дата утверждения ЗП (дата завершения закупки). */
  purchaseCompletionDate: string | null;
  preparedBy: string | null;  // ФИО пользователя (договорника), который подготовил договор
  purchaseRequestId: number | null;
  purchaseRequestSystemId: number | null;
  purchaseRequestInnerId: number | null;  // Внутренний номер связанной заявки
  excludedFromStatusCalculation: boolean | null;
  exclusionComment: string | null;
  excludeFromInWork: boolean | null;
  customerOrganization: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse {
  content: Contract[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortField = keyof Contract | null;
export type SortDirection = 'asc' | 'desc' | null;

// Типы вкладок для таблицы договоров
export type TabType = 'in-work' | 'not-coordinated' | 'signed' | 'all' | 'hidden';
