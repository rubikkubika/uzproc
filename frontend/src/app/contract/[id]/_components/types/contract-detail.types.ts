export interface ContractApprovalItem {
  id: number;
  contractId: number;
  documentForm?: string | null;
  stage: string;
  role: string;
  executorName?: string | null;
  assignmentDate: string | null;
  completionDate: string | null;
  completionResult: string | null;
  commentText?: string | null;
}

export interface ContractSupplier {
  id: number;
  name: string | null;
  inn: string | null;
  code: string | null;
}

export interface ContractDetail {
  id: number;
  innerId: string | null;
  guid: string;
  contractCreationDate: string | null;
  name: string | null;
  title: string | null;
  cfo: string | null;
  purchaseMethod: string | null;
  documentForm: string | null;
  budgetAmount: number | null;
  currency: string | null;
  costType: string | null;
  contractType: string | null;
  contractDurationMonths: number | null;
  status: string | null;
  state: string | null;
  /** Дата регистрации договора (дата выполнения согласования «Регистрация»). */
  registrationDate: string | null;
  /** Дата синхронизации договора (дата выполнения согласования «Синхронизация»). */
  synchronizationDate: string | null;
  paymentTerms: string | null;
  paymentScheme: string | null;
  deliveryTerm: string | null;
  suppliers: ContractSupplier[] | null;
  preparedBy: string | null;
  purchaseRequestId: number | null;
  purchaseRequestInnerId: number | null;
  parentContractId: number | null;
  parentContract: ContractDetail | null;
  plannedDeliveryStartDate: string | null;
  plannedDeliveryEndDate: string | null;
  excludedFromStatusCalculation: boolean | null;
  exclusionComment: string | null;
  customerOrganization: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChildContract {
  id: number;
  innerId: string | null;
  name: string | null;
  title: string | null;
  status: string | null;
  budgetAmount: number | null;
  currency: string | null;
}

export interface PaymentItem {
  id: number;
  mainId: string | null;
  amount: number | null;
  cfo: string | null;
  comment: string | null;
  paymentStatus: string | null;
  requestStatus: string | null;
  plannedExpenseDate: string | null;
  paymentDate: string | null;
  executorDisplayName: string | null;
  responsibleDisplayName: string | null;
}
