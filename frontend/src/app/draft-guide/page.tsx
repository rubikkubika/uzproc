import { Suspense } from 'react';
import DraftGuidePage from './_components/DraftGuidePage';

/**
 * Инструкция «Как работать с драфтом плана закупок»: открывается кнопкой с панели драфта
 * (`/draft-guide?year=2027`). Страница без сайдбара — документ занимает всю ширину полосы набора.
 */
export default function DraftGuideRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100" />}>
      <DraftGuidePage />
    </Suspense>
  );
}
