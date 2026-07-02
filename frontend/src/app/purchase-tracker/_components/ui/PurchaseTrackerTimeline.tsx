import type { StageView } from '../types/purchase-tracker.types';
import PurchaseTrackerStageNode from './PurchaseTrackerStageNode';
import PurchaseTrackerStepList from './PurchaseTrackerStepList';

interface PurchaseTrackerTimelineProps {
  stages: StageView[];
}

/** Вертикальная трек-лента этапов закупки (вариант 1a) */
export default function PurchaseTrackerTimeline({ stages }: PurchaseTrackerTimelineProps) {
  return (
    <div className="px-6 pt-[22px] pb-1">
      {stages.map((stage, i) => (
        <div key={i} className="flex gap-4">
          {/* Левая колонка: узел + соединительная линия */}
          <div className="flex w-[30px] flex-none flex-col items-center">
            <PurchaseTrackerStageNode stage={stage} />
            {stage.notLast && (
              <div className="my-1 w-[2.5px] flex-1 rounded-[2px] min-h-[16px]" style={{ background: stage.lineBg }} />
            )}
          </div>

          {/* Правая колонка: контент этапа */}
          <div className="min-w-0 flex-1 pb-[18px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[14.5px] font-bold" style={{ color: stage.nameFg }}>
                {stage.name}
              </span>
              <span
                className="rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                style={{ background: stage.chipBg, color: stage.chipFg }}
              >
                {stage.stateLabel}
              </span>
              <span className="ml-auto text-[12.5px] text-[#98A2B3]">{stage.date}</span>
            </div>
            <div className="mt-0.5 text-[12.5px] text-[#667085]">{stage.note}</div>
            {stage.hasSteps && <PurchaseTrackerStepList steps={stage.steps} />}
          </div>
        </div>
      ))}
    </div>
  );
}
