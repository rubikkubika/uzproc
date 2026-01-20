export interface Contract {
  id: number;
  innerId: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  contractCreationDate: string | null;
  budgetAmount: number | null;
  currency: string | null;
  purchaseRequestId: number | null;
  parentContractId: number | null;
  documentForm: string | null;
  status: string | null;
  state: string | null;
}

export interface PurchaseRequest {
  id: number;
  idPurchaseRequest: number | null;
  guid: string;
  purchaseRequestPlanYear: number | null;
  company: string | null;
  cfo: string | null;
  mcc: string | null;
  purchaseRequestInitiator: string | null;
  purchaser: string | null;
  name: string | null;
  purchaseRequestCreationDate: string | null;
  budgetAmount: number | null;
  currency: string | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  isPlanned: boolean | null;
  requiresPurchase: boolean | null;
  status: string | null;
  statusGroup: string | null;
  excludeFromInWork: boolean | null;
  daysInStatus: number | null;
  daysSinceCreation: number | null;
  isStrategicProduct: boolean | null;
  hasCompletedPurchase: boolean | null;
  contracts: Contract[] | null;
  createdAt: string;
  updatedAt: string;
  csiLink: string | null;
  csiToken: string | null;
  csiInvitationSent: boolean | null;
  hasFeedback: boolean | null;
  averageRating: number | null;
}

export interface PageResponse {
  content: PurchaseRequest[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortField = keyof PurchaseRequest | null;
export type SortDirection = 'asc' | 'desc' | null;

export type TabType = 'all' | 'in-work' | 'completed' | 'project-rejected' | 'hidden';
