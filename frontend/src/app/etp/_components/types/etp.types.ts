// Типы снапшота ЭТП (b2biz.uz, заказчик UZUM MARKET)

export interface EtpPosition {
  num: number;
  title: string;
  descr: string;
  quantity: number;
  unitName: string;
}

export interface EtpStage {
  number: string;
  statusRu: string;
  publishedDate: string | null;
  completedDate: string | null;
}

export interface EtpParticipant {
  suplGuid: string;
  company: string;
  shortName: string;
  inn: string;
  address: string;
  email: string;
  phone: string;
  statusRu: string;
  statusDate: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  files: EtpFile[];
}

export interface EtpCompetitionPosition {
  guid: string;
  title: string;
  count: number;
  unit: number;
  bestPrice: number;
  currency: string;
}

export interface EtpCompetitionSupplierPosition {
  posGuid: string;
  price: number;
  count: number;
  rank: number;
  deltaPercent: number;
  isSelected: boolean;
}

export interface EtpCompetitionSupplier {
  guid: string;
  name: string;
  rankSum: number;
  total: number;
  currency: string;
  positions: EtpCompetitionSupplierPosition[];
}

export interface EtpCompetitionCriterion {
  guid: string;
  title: string;
  descr: string;
}

export interface EtpCompetition {
  positions: EtpCompetitionPosition[];
  suppliers: EtpCompetitionSupplier[];
  criteria: EtpCompetitionCriterion[];
  // answers[supplierGuid][criteriaGuid] = label
  answers: Record<string, Record<string, string>>;
}

export interface EtpReports {
  competition: string | null;
  history: string | null;
}

export interface EtpResultPosition {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface EtpResult {
  brand: string;
  legal: string;
  totalPrice: number;
  currency: string;
  vat: boolean;
  sharePct: number | null;
  positions: EtpResultPosition[];
}

export interface EtpFile {
  fileGuid: string;
  name: string;
  ext: string;
  size: number;
  sizeFormatted: string;
  uploadedBy: string;
  uploaded: string;
  path: string;
}

export interface EtpRules {
  currencyId?: number;
  currency: string;
  vat?: boolean;
  renewalTimeMin?: number;
  viewSubmissions?: boolean;
  decreaseStep?: number;
  openDate?: string;
  visibilityId?: number;
  transpType?: number;
}

export interface EtpProcedure {
  code: string;
  guid: string;
  title: string;
  etpTypeName: string;
  procTypeName: string;
  statusKey: string;
  statusRu: string;
  createdDate: string;
  publishedDate: string | null;
  deadline: string | null;
  completedDate: string | null;
  customer: { brandName: string; legalName: string };
  invitationHtml: string;
  contacts: string;
  criterias: string[];
  categories: string[];
  rules: EtpRules;
  positions: EtpPosition[];
  stages: EtpStage[];
  stagesCount: number;
  participants: EtpParticipant[];
  participantsCount: number;
  submittedCount: number;
  participantFilesCount: number;
  results: EtpResult[];
  winner: { brand: string; totalPrice: number; currency: string } | null;
  competition: EtpCompetition | null;
  reports: EtpReports;
  files: EtpFile[];
  filesCount: number;
  stat: { views: number; downloads: number; favorites: number; submitted: number };
}

export interface EtpSnapshot {
  generatedAt: string;
  source: string;
  customer: string;
  count: number;
  byStatus: Record<string, number>;
  filesTotal: number;
  participantFilesTotal?: number;
  competitionCount?: number;
  procedures: EtpProcedure[];
}
