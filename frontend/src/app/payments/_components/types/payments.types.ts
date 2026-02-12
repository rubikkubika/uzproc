export interface Payment {
  id: number;
  amount: number | null;
  cfo: string | null;
  cfoId: number | null;
  comment: string | null;
  purchaseRequestId: number | null;
  purchaseRequestInnerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse {
  content: Payment[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortField = keyof Payment | null;
export type SortDirection = 'asc' | 'desc' | null;
