import { getBackendUrl } from '@/utils/api';

/** Снимок одной спецификации в форме оценки. */
export interface SpecificationFeedbackItem {
  contractId: number | null;
  innerId: string | null;
  title: string | null;
  preparedBy: string | null;
  budgetAmount: number | null;
  currency: string | null;
  synchronizationDate: string | null;
}

/** Данные формы оценки по токену. */
export interface SpecificationFeedbackForm {
  token: string;
  cfoName: string;
  periodYear: number;
  periodMonth: number;
  specificationCount: number;
  totalAmount: number | null;
  submitted: boolean;
  speedRating: number | null;
  businessRating: number | null;
  comment: string | null;
  items: SpecificationFeedbackItem[];
}

/** Тело сохранения оценки. */
export interface SpecificationFeedbackSubmit {
  speedRating: number;
  businessRating: number;
  comment: string;
}

/** Элемент сводки оценок для дашборда: ЦФО и кто оценил. */
export interface SpecificationFeedbackDashboardItem {
  cfoName: string | null;
  periodYear: number | null;
  periodMonth: number | null;
  ratedBy: string | null;
  recipient: string | null;
  speedRating: number | null;
  businessRating: number | null;
  overall: number | null;
  comment: string | null;
  specificationCount: number | null;
  totalAmount: number | null;
  ratedAt: string | null;
}

/** Сводка оценок по спецификациям для управленческой отчётности. */
export interface SpecificationFeedbackDashboard {
  count: number;
  avgSpeed: number | null;
  avgBusiness: number | null;
  avgOverall: number | null;
  items: SpecificationFeedbackDashboardItem[];
}

/** Загрузка сводки оценок для дашборда. */
export async function fetchSpecificationFeedbackDashboard(
  signal?: AbortSignal
): Promise<SpecificationFeedbackDashboard> {
  const url = `${getBackendUrl()}/api/specification-feedback/dashboard`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Не удалось загрузить оценки по спецификациям');
  }
  return response.json();
}

/** Загрузка данных формы по токену приглашения. */
export async function fetchSpecificationFeedbackForm(
  token: string,
  signal?: AbortSignal
): Promise<SpecificationFeedbackForm> {
  const url = `${getBackendUrl()}/api/specification-feedback/${encodeURIComponent(token)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    if (response.status === 404 || response.status === 400 || response.status === 500) {
      throw new Error('Ссылка недействительна или приглашение не найдено');
    }
    throw new Error('Не удалось загрузить форму оценки');
  }
  return response.json();
}

/** Сохранение оценки по токену. */
export async function submitSpecificationFeedback(
  token: string,
  body: SpecificationFeedbackSubmit
): Promise<SpecificationFeedbackForm> {
  const url = `${getBackendUrl()}/api/specification-feedback/${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Не удалось сохранить оценку');
  }
  return response.json();
}
