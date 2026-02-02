export interface Contract {
  id: number;
  innerId: string | null;
  guid: string;
  contractCreationDate: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  mcc: string | null;
  documentForm: string | null;
  budgetAmount: number | null;
  currency: string | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  status: string | null;
  state: string | null;
  preparedBy: string | null;  // ФИО пользователя (договорника), который подготовил договор
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
export type TabType = 'in-work' | 'signed' | 'all';
