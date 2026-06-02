export interface Delivery {
  id: number;
  innerId: string | null;
  date: string | null;
  deliveryDeadline: string | null;
  contractId: number | null;
  contractInnerId: string | null;
  contractName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  supplierInn: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  statusColor: 'gray' | 'blue' | 'green' | string | null;
  paymentScheme: 'POSTPAYMENT' | 'PREPAYMENT' | null;
  comment: string | null;
  responsibleId: number | null;
  responsibleDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PAYMENT_SCHEME_LABELS: Record<'POSTPAYMENT' | 'PREPAYMENT', string> = {
  POSTPAYMENT: 'По факту',
  PREPAYMENT: 'Аванс',
};

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
};

export interface PageResponse {
  content: Delivery[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortField = keyof Delivery | null;
export type SortDirection = 'asc' | 'desc' | null;
