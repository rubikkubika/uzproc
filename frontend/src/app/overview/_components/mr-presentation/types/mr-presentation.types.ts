import type { SavingsData } from '../../hooks/useOverviewSavingsData';
import type { ContractDocumentsByPersonMonthResponse } from '../../hooks/useContractDocumentsByPersonMonth';
import type { ContractApprovalDurationMarketMonthRow } from '../../hooks/useContractApprovalDurationByMonthMarket';
import type { SpecificationFeedbackDashboard } from '@/utils/specification-feedback.api';
import type { OverviewSlaPercentageByMonth } from '../../hooks/useOverviewSlaData';

/** Агрегированная статистика CSI за год. */
export interface MrCsiStats {
  year: number;
  count: number;
  avgSpeed: number | null;
  avgQuality: number | null;
  avgSatisfaction: number | null;
  avgUzproc: number | null;
  avgOverall: number | null;
}

/** Одна оценка инициатора (карточка обратной связи). */
export interface MrCsiFeedback {
  id: number;
  purchaseRequestInnerId: string;
  idPurchaseRequest: number | null;
  purchaseRequestSubject?: string;
  purchaser?: string;
  cfo?: string;
  uzprocRating?: number;
  speedRating: number;
  qualityRating: number;
  satisfactionRating: number;
  comment?: string;
  recipient?: string;
  recipientName?: string;
  createdAt: string;
}

/** Показатели SLA, приходящие со страницы управленческой отчётности. */
export interface MrSlaInput {
  year: number;
  averagePercentage: number | null;
  completedByMonth: number[];
  percentageByMonth: OverviewSlaPercentageByMonth[];
}

/** Карточка оценки по спецификации. */
export interface SpecificationFeedbackDashboardCard {
  cfoName: string | null;
  ratedBy: string | null;
  overall: number | null;
  speedRating: number | null;
  businessRating: number | null;
  comment: string | null;
  specificationCount: number | null;
  totalAmount: number | null;
  ratedAt: string | null;
}

/** Группа карточек оценок по спецификациям за один месяц. */
export interface MrContractFeedbackMonth {
  month: number;
  year: number;
  /** Всего оценок в месяце (может быть больше, чем на текущем слайде). */
  totalInMonth: number;
  cards: SpecificationFeedbackDashboardCard[];
}

/** Полный набор данных презентации. */
export interface MrPresentationData {
  /** Отчётный период (титульный лист и футер). */
  periodYear: number;
  periodMonth: number;
  /** Год, за который считаются годовые показатели. */
  dataYear: number;
  /** Подпись периода данных в правом верхнем углу («2026 · январь — август»). */
  periodLabel: string;
  /** Подпись футера контентных слайдов. */
  footerLabel: string;
  savings: SavingsData | null;
  csiStats: MrCsiStats | null;
  csiFeedbacks: MrCsiFeedback[];
  sla: MrSlaInput;
  contractDocuments: ContractDocumentsByPersonMonthResponse | null;
  contractDurations: ContractApprovalDurationMarketMonthRow[];
  specificationFeedback: SpecificationFeedbackDashboard | null;
}

/** Слайды презентации. */
export type MrSlide =
  | { kind: 'cover' }
  | { kind: 'section'; index: string; title: string; subtitle: string }
  | { kind: 'kpi' }
  | { kind: 'feedback'; group: string; sub: string; cards: MrCsiFeedback[]; pageIndex: number; pageCount: number }
  | { kind: 'contracts-kpi' }
  | { kind: 'contracts-feedback'; pageIndex: number; pageCount: number; months: MrContractFeedbackMonth[] }
  | { kind: 'thanks' };

/** Стадия экспорта презентации. */
export type MrExportPhase = 'idle' | 'loading' | 'building' | 'error';
