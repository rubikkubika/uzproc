'use client';

import { useState } from 'react';
import SendingSubTabs from './SendingSubTabs';
import ComplexityErrorsSending from './ComplexityErrorsSending';
import CsiInvitationSending from './CsiInvitationSending';
import { PURCHASE_SENDING_SUB_TABS } from '../constants/purchase-sending.constants';
import { PurchaseSendingSubTabId } from '../types/purchase-sending.types';

/** Раздел «Закупки» центра отправки: подразделы «Ошибка сложности» и «Оценка закупки». */
export default function PurchasesSending() {
  const [activeSubTab, setActiveSubTab] = useState<PurchaseSendingSubTabId>('complexity-errors');

  return (
    <div className="space-y-4">
      <SendingSubTabs
        tabs={PURCHASE_SENDING_SUB_TABS}
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
      />
      {activeSubTab === 'complexity-errors' && <ComplexityErrorsSending />}
      {activeSubTab === 'csi-invitation' && <CsiInvitationSending />}
    </div>
  );
}
