'use client';

import AppShell from '../_components/AppShell';
import PublicPurchasePlanTable from './_components/PublicPurchasePlanTable';

export default function PublicPlanPage() {
  return (
    <AppShell activeTab="public-plan">
      <div className="h-full flex flex-col">
        <PublicPurchasePlanTable />
      </div>
    </AppShell>
  );
}
