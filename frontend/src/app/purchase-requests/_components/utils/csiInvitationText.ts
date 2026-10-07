import { fetchCsiInvitationText } from '@/utils/sending-center.api';
import type { PurchaseRequest } from '../types/purchase-request.types';

/** Тексты писем по заявкам, уже полученные с бэкенда (ключ — ID заявки). */
const textCache = new Map<number, string>();

/**
 * Запасной текст письма «Оценка закупки» — без списка договоров.
 * Используется, только если бэкенд не отдал текст.
 */
function buildFallbackText(request: PurchaseRequest): string {
  return `Здравствуйте!

Недавно мы завершили работу по вашей заявке № ${request.idPurchaseRequest || ''} на ${request.name || ''}.

Чтобы отдел закупок работал быстрее и удобнее для вас, нам очень важно узнать ваше мнение.

Пожалуйста, уделите минутку и оцените качество нашего сервиса по ссылке:
${request.csiLink}

Ссылка персональная и доступна для заполнения один раз.

Спасибо, что помогаете нам становиться лучше.

С уважением,
Ваша команда закупок`;
}

/**
 * Текст письма «Оценка закупки» по заявке. Формируется на бэкенде (единый источник с центром отправки):
 * включает подписанные договоры по закупке и даты их регистрации.
 */
export async function loadCsiInvitationText(request: PurchaseRequest): Promise<string> {
  const cached = textCache.get(request.id);
  if (cached) return cached;
  try {
    const { text } = await fetchCsiInvitationText(request.id);
    textCache.set(request.id, text);
    return text;
  } catch (error) {
    console.error('Error loading CSI invitation text:', error);
    return buildFallbackText(request);
  }
}
