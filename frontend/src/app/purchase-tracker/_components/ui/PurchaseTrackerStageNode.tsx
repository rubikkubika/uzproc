import type { StageView } from '../types/purchase-tracker.types';
import { CheckIcon } from './icons';

interface PurchaseTrackerStageNodeProps {
  stage: StageView;
}

/** Кружок-узел этапа в левой колонке трек-ленты */
export default function PurchaseTrackerStageNode({ stage }: PurchaseTrackerStageNodeProps) {
  return (
    <div
      className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full box-border ${
        stage.animate ? 'animate-tracker-pulse' : ''
      }`}
      style={{ background: stage.dotBg, border: stage.dotBorder }}
    >
      {stage.isDone && <CheckIcon size={14} width={3} />}
      {stage.isCurrent && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
      {stage.isWait && <span className="text-[12.5px] font-bold text-[#98A2B3]">{stage.num}</span>}
    </div>
  );
}
