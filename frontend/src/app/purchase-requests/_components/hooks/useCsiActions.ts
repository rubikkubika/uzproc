import { useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { PurchaseRequest } from '../types/purchase-request.types';

interface FeedbackDetails {
  recipient: string | null;
  speedRating: number | null;
  qualityRating: number | null;
  satisfactionRating: number | null;
  uzprocRating: number | null;
  usedUzproc: boolean | null;
  comment: string | null;
}

interface SentInvitationDetails {
  recipient: string;
  emailText: string;
}

interface UseCsiActionsOptions {
  setAllItems: React.Dispatch<React.SetStateAction<PurchaseRequest[]>>;
  setFeedbackDetails: React.Dispatch<React.SetStateAction<FeedbackDetails | null>>;
  setLoadingFeedbackDetails: React.Dispatch<React.SetStateAction<boolean>>;
  setSentInvitationDetails: React.Dispatch<React.SetStateAction<SentInvitationDetails | null>>;
}

export function useCsiActions({
  setAllItems,
  setFeedbackDetails,
  setLoadingFeedbackDetails,
  setSentInvitationDetails,
}: UseCsiActionsOptions) {
  // Отправка приглашения для оценки (сохранение получателя на бэкенде)
  const sendInvitation = useCallback(async (request: PurchaseRequest, recipientEmail: string): Promise<void> => {
    const token = request.csiLink?.split('/csi/feedback/')[1]?.split('?')[0]?.split('#')[0];
    if (!token) {
      throw new Error('Токен не найден');
    }

    const response = await fetch(`${getBackendUrl()}/api/csi-feedback/invitation?csiToken=${encodeURIComponent(token)}&recipient=${encodeURIComponent(recipientEmail)}`, {
      method: 'POST',
    });

    if (!response.ok) {
      let message = 'Ошибка при сохранении приглашения (получатель не сохранён)';
      try {
        const data = (await response.json()) as { message?: string };
        if (data?.message && typeof data.message === 'string') {
          message = data.message;
        }
      } catch {
        // тело ответа не JSON или не удалось прочитать — оставляем message по умолчанию
      }
      throw new Error(message);
    }

    // Обновляем allItems: csiInvitationSent=true
    setAllItems(prev => prev.map(req =>
      req.id === request.id
        ? { ...req, csiInvitationSent: true }
        : req
    ));
  }, [setAllItems]);

  // Загрузка деталей оценки
  const loadFeedbackDetails = useCallback(async (request: PurchaseRequest): Promise<void> => {
    setLoadingFeedbackDetails(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/csi-feedback/by-purchase-request/${request.id}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const feedback = data[0];
          setFeedbackDetails({
            recipient: feedback.recipient || null,
            speedRating: feedback.speedRating || null,
            qualityRating: feedback.qualityRating || null,
            satisfactionRating: feedback.satisfactionRating || null,
            uzprocRating: feedback.uzprocRating || null,
            usedUzproc: feedback.usedUzproc || null,
            comment: feedback.comment || null,
          });
        }
      }
    } catch (error) {
      console.error('Error loading feedback details:', error);
      throw error;
    } finally {
      setLoadingFeedbackDetails(false);
    }
  }, [setFeedbackDetails, setLoadingFeedbackDetails]);

  // Загрузка деталей приглашения
  const loadInvitationDetails = useCallback(async (request: PurchaseRequest): Promise<void> => {
    try {
      const token = request.csiLink?.split('/csi/feedback/')[1]?.split('?')[0]?.split('#')[0];
      if (!token) {
        throw new Error('Токен не найден');
      }

      const response = await fetch(`${getBackendUrl()}/api/csi-feedback/invitation/details?csiToken=${encodeURIComponent(token)}`);
      if (!response.ok) {
        throw new Error('Ошибка при загрузке деталей приглашения');
      }

      const data = await response.json();
      const fullUrl = request.csiLink;
      const recipientName = data.recipientName || '';
      const generatedText = `Здравствуйте!

Недавно мы завершили работу по вашей заявке № ${request.idPurchaseRequest || ''} на ${request.name || ''}.

Чтобы отдел закупок работал быстрее и удобнее для вас, нам очень важно узнать ваше мнение.

Пожалуйста, уделите минутку и оцените качество нашего сервиса по ссылке:
${fullUrl}

Ссылка персональная и доступна для заполнения один раз.

Спасибо, что помогаете нам становиться лучше.

С уважением,
Ваша команда закупок`;

      setSentInvitationDetails({
        recipient: data.recipient || 'Не указан',
        emailText: generatedText
      });
    } catch (error) {
      console.error('Error loading invitation details:', error);
      throw error;
    }
  }, [setSentInvitationDetails]);

  return {
    sendInvitation,
    loadFeedbackDetails,
    loadInvitationDetails,
  };
}
