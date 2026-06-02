export interface Delivery {
  id: number;
  innerId: string | null;
  date: string | null;
  contractId: number | null;
  contractInnerId: string | null;
  contractName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  supplierInn: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  comment: string | null;
  responsibleId: number | null;
  responsibleDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse {
  content: Delivery[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortField = keyof Delivery | null;
export type SortDirection = 'asc' | 'desc' | null;
