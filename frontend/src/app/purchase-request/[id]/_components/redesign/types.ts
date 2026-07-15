import { ReactElement, ReactNode } from 'react';

// Структурно совместимые типы (совпадают с интерфейсами в page.tsx).
export interface PurchaseRequest {
  id: number;
  idPurchaseRequest: number | null;
  name: string | null;
  cfo: string | null;
  purchaseRequestInitiator: string | null;
  purchaser: string | null;
  purchaseRequestCreationDate: string | null;
  budgetAmount: number | null;
  currency: string | null;
  expenseItem: string | null;
  isPlanned: boolean | null;
  requiresPurchase: boolean | null;
  status: string | null;
  statusGroup: string | null;
  excludeFromInWork: boolean | null;
  csiLink: string | null;
  contracts: Contract[] | null;
}

export interface Purchase {
  id: number;
  innerId: string | null;
  cfo: string | null;
  status: string | null;
  purchaseMethod: string | null;
  purchaseCreationDate: string | null;
  savings: number | null;
  savingsType: string | null;
  competitiveSheet: string | null;
  competitiveSheetUploadedAt: string | null;
}

export interface ContractSupplier {
  id: number;
  name: string | null;
  inn: string | null;
  code: string | null;
}

export interface Contract {
  id: number;
  innerId: string | null;
  name: string | null;
  cfo: string | null;
  contractCreationDate: string | null;
  budgetAmount: number | null;
  currency: string | null;
  status: string | null;
  registrationDate?: string | null;
  preparedBy: string | null;
  excludedFromStatusCalculation?: boolean | null;
  isTypicalForm?: boolean | null;
  suppliers?: ContractSupplier[] | null;
  parentContract?: Contract | null;
}

export interface Approval {
  id: number;
  stage: string;
  role: string;
  assignmentDate: string | null;
  completionDate: string | null;
  daysInWork: number | null;
  completionResult: string | null;
  round: number;
  countedInSla: boolean;
}

export interface ContractApprovalItem {
  id: number;
  contractId: number;
  stage: string;
  role: string;
  executorName?: string | null;
  assignmentDate: string | null;
  completionDate: string | null;
  completionResult: string | null;
  commentText?: string | null;
}

export interface CsiFeedback {
  id: number;
  purchaseRequestId: number;
  idPurchaseRequest: number | null;
  purchaseRequestInnerId: string;
  usedUzproc?: boolean;
  uzprocRating?: number;
  speedRating: number;
  qualityRating: number;
  satisfactionRating: number;
  comment?: string;
  recipient?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApprovalStatusColor = 'green' | 'yellow' | 'red' | 'orange';

/** Пропсы редизайн-версии страницы заявки на закупку. */
export interface PurchaseRequestRedesignProps {
  purchaseRequest: PurchaseRequest;
  purchase: Purchase | null;
  csiFeedback: CsiFeedback | null;
  csiFeedbackLoading: boolean;
  contracts: Contract[];
  specifications: Contract[];
  contractApprovalsByContractId: Record<number, ContractApprovalItem[]>;

  // Сгруппированные согласования
  approvalStageApprovals: Approval[];
  managerStageApprovals: Approval[];
  finalApprovalStageApprovals: Approval[];
  finalApprovalNoZpStageApprovals: Approval[];
  purchaseResultsApprovalApprovals: Approval[];
  purchaseCommissionApprovals: Approval[];
  purchaseCommissionResultCheckApprovals: Approval[];

  // Флаги статусов трекера
  isRequestStepGreen: boolean;
  isOnCoordination: boolean;
  isPurchaseStepGreen: boolean;
  isPurchaseStepYellow: boolean;
  isPurchaseStepRed: boolean;

  // Хелперы форматирования
  formatDate: (d: string | null) => string;
  formatDateTime: (d: string | null) => string;
  formatCurrency: (amount: number | null, currency?: string | null) => string | ReactElement;
  getCurrencyIcon: (currency: string | null) => ReactNode;
  calculateDays: (assigned: string | null, completed: string | null, daysInWork: number | null) => string;
  calculateContractApprovalWorkingDays: (assigned: string | null, completed: string | null) => string;
  getApprovalStatusColor: (a: { completionResult: string | null; completionDate: string | null; assignmentDate: string | null }) => ApprovalStatusColor;
  getContractSpecStageOrder: (stages: string[]) => string[];
  getAverageRating: (f: CsiFeedback) => number;
  purchaserDisplayName: (v: string | null) => string;
  initiatorDisplayName: (v: string | null) => string;

  // Действия / UI
  goBack: () => void;
  onSavingsTypeChange: (v: string) => void;
  onCopyCsi: () => void;
  onToggleDesign: () => void;

  // Слот для блока конкурентного листа (переиспользуем существующий компонент)
  competitiveSheetSlot?: ReactNode;
}
