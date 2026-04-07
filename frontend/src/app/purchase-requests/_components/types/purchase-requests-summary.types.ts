export interface PurchaserSummaryItem {
  purchaser: string;
  ordersCount: number;
  purchasesCount: number;
  ordersBudget: number;
  purchasesBudget: number;
  ordersComplexity: number;
  purchasesComplexity: number;
  savings: number;
  averageRating: number | null;
  averageSlaDays: number | null;
  atPurchaserCount: number;
  atPurchaserBudget: number;
  contractInWorkCount: number;
  contractInWorkBudget: number;
}

