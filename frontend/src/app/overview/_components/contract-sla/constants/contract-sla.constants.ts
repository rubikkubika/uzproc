/** Константы дашборда «SLA договоров». */

/** Организация заказчика: значение — имя enum CustomerOrganization на бэкенде. */
export interface ContractSlaOrganizationOption {
  value: string;
  label: string;
}

/** Организации заказчика, доступные в фильтре дашборда. */
export const CONTRACT_SLA_ORGANIZATIONS: ContractSlaOrganizationOption[] = [
  { value: 'UZUM_MARKET', label: 'Uzum Market' },
  { value: 'UZUM_OOO', label: 'Uzum (OOO)' },
  { value: 'UZUM_TEZKOR', label: 'Uzum Tezkor' },
];

/** Организация, выбранная по умолчанию: только «Маркет». */
export const DEFAULT_CONTRACT_SLA_ORGANIZATIONS: string[] = ['UZUM_MARKET'];
