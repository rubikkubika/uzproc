'use client';

import { useState } from 'react';
import DeliverySendingSubTabs from './DeliverySendingSubTabs';
import UpcomingDeliveriesSending from './UpcomingDeliveriesSending';
import DeliveryWeeklyReport from './DeliveryWeeklyReport';
import { DeliverySendingSubTabId } from '../types/delivery-sending.types';

/** Раздел «Поставки» центра отправки: подразделы «Предстоящие поставки» и «Недельный отчёт». */
export default function DeliveriesSending() {
  const [activeSubTab, setActiveSubTab] = useState<DeliverySendingSubTabId>('upcoming');

  return (
    <div className="space-y-4">
      <DeliverySendingSubTabs activeSubTab={activeSubTab} onSubTabChange={setActiveSubTab} />
      {activeSubTab === 'upcoming' && <UpcomingDeliveriesSending />}
      {activeSubTab === 'weekly-report' && <DeliveryWeeklyReport />}
    </div>
  );
}
