import { CfoSpecificationSending } from '@/utils/sending-center.api';

export type { CfoSpecificationSending };

/** Статус отправки строки для отображения. */
export type SendStatus = 'idle' | 'sending' | 'sent' | 'error';
