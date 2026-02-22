export interface Supplier {
  id: number;
  type: string | null;
  kpp: string | null;
  inn: string | null;
  code: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse {
  content: Supplier[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortField = keyof Supplier | null;
export type SortDirection = 'asc' | 'desc' | null;
