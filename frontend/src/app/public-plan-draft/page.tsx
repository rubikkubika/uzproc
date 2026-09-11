import AppShell from '../_components/AppShell';
import PublicPurchasePlanTable from '../public-plan/_components/PublicPurchasePlanTable';
import { parsePublicPlanSearchParams } from '@/utils/publicPlanLink';

interface PublicPlanDraftPageProps {
  searchParams: Promise<{ year?: string | string[]; cfo?: string | string[] }>;
}

/**
 * Публичный драфт плана закупок: только просмотр, доступен всем (как публичный план закупок).
 * Ссылка из сводной по ЦФО драфта открывает страницу сразу с фильтром: ?year=2027&cfo=<ЦФО>.
 * Параметры читаются на сервере, чтобы начальное состояние таблицы совпадало при гидрации.
 */
export default async function PublicPlanDraftPage({ searchParams }: PublicPlanDraftPageProps) {
  const { year, cfos } = parsePublicPlanSearchParams(await searchParams);
  return (
    <AppShell activeTab="public-plan-draft">
      <div className="h-full flex flex-col">
        <PublicPurchasePlanTable isDraft initialYear={year} initialCfoFilter={cfos} />
      </div>
    </AppShell>
  );
}
