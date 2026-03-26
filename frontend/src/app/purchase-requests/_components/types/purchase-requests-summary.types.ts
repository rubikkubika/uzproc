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
}

