'use client';

import { useState } from 'react';
import SendingCenterTabs from './ui/SendingCenterTabs';
import PurchasesSending from './ui/PurchasesSending';
import SpecificationsSending from './ui/SpecificationsSending';
import { SendingCenterTabId } from './types/sending-center.types';

export default function SendingCenter() {
  const [activeTab, setActiveTab] = useState<SendingCenterTabId>('purchases');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Центр отправки</h1>
      <SendingCenterTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'purchases' ? <PurchasesSending /> : <SpecificationsSending />}
    </div>
  );
}
