export interface Arrival {
  id: number;
  date: string | null;
  number: string | null;
  supplierId: number | null;
  supplierName: string | null;
  supplierInn: string | null;
  invoice: string | null;
  warehouse: string | null;
  operationType: string | null;
  department: string | null;
  incomingDate: string | null;
  incomingNumber: string | null;
  amount: number | null;
  currency: string | null;
  comment: string | null;
  responsibleId: number | null;
  responsibleDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse {
  content: Arrival[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortField = keyof Arrival | null;
export type SortDirection = 'asc' | 'desc' | null;
