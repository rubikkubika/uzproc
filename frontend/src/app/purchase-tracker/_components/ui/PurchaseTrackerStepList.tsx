import type { StepView } from '../types/purchase-tracker.types';

interface PurchaseTrackerStepListProps {
  steps: StepView[];
}

/** Список шагов внутри этапа (согласующие, подэтапы) */
export default function PurchaseTrackerStepList({ steps }: PurchaseTrackerStepListProps) {
  return (
    <div
      className="mt-2.5 flex flex-col overflow-hidden rounded-xl py-[5px]"
      style={{ background: '#FAFBFD', border: '1px solid #F0F2F7' }}
    >
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2.5 px-3.5 py-[7px]" style={{ background: step.rowBg }}>
          <div className="h-2 w-2 flex-none rounded-full" style={{ background: step.dot }} />
          <span className="flex-1 text-[13px]" style={{ color: step.fg }}>
            {step.who}
          </span>
          {step.isCurrent && (
            <span className="rounded-full bg-[#FDE9C0] px-2 py-0.5 text-[10.5px] font-bold text-[#B45309]">
              сейчас
            </span>
          )}
          <span className="w-[60px] text-right text-xs text-[#98A2B3]">{step.date}</span>
          <span className="w-[44px] text-right text-xs text-[#98A2B3]">{step.days}</span>
        </div>
      ))}
    </div>
  );
}
