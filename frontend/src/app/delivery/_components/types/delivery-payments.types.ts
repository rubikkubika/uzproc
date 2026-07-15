/** Оплата договора — используется в карточке поставки и при создании поставки. */
export interface ContractPayment {
  id: number;
  mainId: string | null;
  amount: number | null;
  paymentStatus: string | null;
  requestStatus: string | null;
  plannedExpenseDate: string | null;
  paymentDate: string | null;
  comment: string | null;
  paymentType: string | null;
}

export type PaymentScheme = 'POSTPAYMENT' | 'PREPAYMENT';

export const ADVANCE_LABEL = 'Аванс';
export const FACT_LABEL = 'По факту';

/** Оплата считается оплаченной, если у неё есть дата оплаты. */
export function isPaid(payment: ContractPayment): boolean {
  return Boolean(payment.paymentDate);
}

/** Сумма оплат по списку id. */
export function sumPayments(payments: ContractPayment[], ids: Set<number>): number {
  return payments.reduce((acc, p) => (ids.has(p.id) ? acc + (p.amount ?? 0) : acc), 0);
}
