export interface Purchase {
  id: number;
  purchaseNumber: number | null;
  innerId: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  purchaseInitiator: string | null;
  purchaseCreationDate: string | null;
  budgetAmount: number | null;
  currency: string | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  purchaseRequestId: number | null;
  purchaser: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
  // Новые поля
  purchaseMethod: string | null; // Способ закупки (mcc)
  purchaseRequestCreatedAt: string | null; // Дата создания заявки на закупку (связанной)
  approvalDate: string | null; // Дата утверждения (из блока согласования)
  purchaseRequestSubject: string | null; // Предмет заявки на закупку (наименование)
}

export interface PageResponse {
  content: Purchase[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortField = string | null;
export type SortDirection = 'asc' | 'desc' | null;

// Дополнительные типы для хуков
export type FilterState = Record<string, string>;
export type MultiFilterState = Set<string>;
