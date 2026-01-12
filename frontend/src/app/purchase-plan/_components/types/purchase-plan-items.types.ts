export interface PurchasePlanItem {
  id: number;
  guid: string;
  year: number | null;
  company: string | null; // Компания заказчик
  purchaserCompany: string | null; // Компания закупщик
  cfo: string | null;
  purchaseSubject: string | null;
  budgetAmount: number | null;
  contractEndDate: string | null;
  requestDate: string | null;
  newContractDate: string | null;
  purchaser: string | null;
  product: string | null;
  hasContract: boolean | null;
  currentKa: string | null;
  currentAmount: number | null;
  currentContractAmount: number | null;
  currentContractBalance: number | null;
  currentContractEndDate: string | null;
  autoRenewal: boolean | null;
  complexity: string | null;
  holding: string | null;
  category: string | null;
  status: string | null;
  purchaseRequestId: number | null;
  purchaseRequestStatus: string | null; // Статус заявки на закупку
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequest {
  idPurchaseRequest: number;
  name: string | null;
  budgetAmount: number | null;
  contractDurationMonths: number | null;
  cfo: string | null;
  purchaseRequestInitiator: string | null;
  costType: string | null;
  contractType: string | null;
  requiresPurchase: boolean | null;
  isPlanned: boolean | null;
  innerId: string | null;
  title: string | null;
  [key: string]: any;
}

export interface PageResponse {
  content: PurchasePlanItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  empty?: boolean;
  pageable?: {
    pageNumber: number;
    pageSize: number;
    sort: { sorted: boolean; unsorted: boolean; empty: boolean };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  sort?: { sorted: boolean; unsorted: boolean; empty: boolean };
}

export type SortField = keyof PurchasePlanItem | null;
export type SortDirection = 'asc' | 'desc' | null;

// Дополнительные типы для хуков
export type FilterState = Record<string, string>;
export type MultiFilterState = Set<string>;

export type ModalTab = 'comments' | 'data' | 'changes' | 'purchaseRequest';

export type EditingDate = { itemId: number; field: 'requestDate' } | null;
export type EditingField = number | null;

export interface Version {
  id: number;
  versionNumber: number;
  description: string;
  createdAt: string;
  itemsCount: number;
  isCurrent: boolean;
}
